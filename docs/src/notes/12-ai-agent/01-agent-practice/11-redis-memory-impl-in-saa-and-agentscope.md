---
title: Redis Memory在AgentScope和Spring AI Alibaba中的实现
description: Redis Memory在AgentScope和Spring AI Alibaba中的实现
categories:
  - AI人工智能
tags:
  - AI
  - Agent
  - Memory
  - Redis
keywords: AI,Agent,Memory,Redis
date: 2026-5-20 17:32:15
author: benym
---

# Redis Memory在AgentScope和Spring AI Alibaba中的实现

AgentScope和Spring AI Alibaba都是Java生态中流行的AI Agent框架，一个主打Agentic，另一个主打Graph，两者在Memory模块实现上都提供了基于Redis的实现。

## AgentScope中的实现

在AgentScope中，Memory分类了直接的Memory框架包括`InMemoryMemory`和`LongTermMemory`，其中`InMemoryMemory`需要绑定`Session`实现才能够存储，而`RedisSession`则是基于Redis实现的Session，可以将Memory存储在Redis中，支持分布式环境下的Memory共享和持久化。

作为阿里的自研产品，AgentScope的Redis Memory没有依赖第三方的AI框架，其实现主要采用统一Session Client+Adapter的设计，隐藏底层Redis客户端的区别，同时兼容主流的Redis客户端如Lettuce、Jedis、Redisson，兼容不同种的Redis部署方式，比如Standalone、Sentinel、Cluster，提供了统一的接口供用户使用。

### RedisSession

RedisSession是提供给用户使用Redis Memory的统一入口，其实现了Core中的Session接口

用户可以通过如下几种方式切换不同的底层Redis客户端

```java
//  Jedis
RedisClient redisClient = RedisClient.create("redis://localhost:6379");
Session session = RedisSession.builder()
     .jedisClient(redisClient)
     .build();

// Lettuce
RedisClient redisClient = RedisClient.create("redis://localhost:6379");
Session session = RedisSession.builder()
   .lettuceClient(redisClient)
   .build();

// Redisson
Config config = new Config();
config.useSingleServer().setAddress("redis://localhost:6379");
RedissonClient redissonClient = Redisson.create(config);
Session session = RedisSession.builder()
  .redissonClient(redissonClient)
  .build();
```

#### save接口

其中save接口有2个实现，一个是直接存储单条，一个是批量存储。先看直接存储单条
```java
@Override
public void save(SessionKey sessionKey, String key, State value) {
    String sessionId = sessionKey.toIdentifier();
    String redisKey = getStateKey(sessionId, key);
    String keysKey = getKeysKey(sessionId);
    try {
        String json = JsonUtils.getJsonCodec().toJson(value);
        client.set(redisKey, json);
        // Track this key in the session's key set
        client.addToSet(keysKey, key);
    } catch (Exception e) {
        throw new RuntimeException("Failed to save state: " + key, e);
    }
}
```
核心逻辑很简单，组装key之后直接存储序列化之后的State对象，这个`State`是AgentScope中定义的接口，在AgentScope中有如下这些实现类。

![](https://img.benym.cn/img/redis-memory-1.png)

可以看出，存储的内容不仅仅只有普通的Msg、还可以是Image、Audio、Plan、Compression等多种类型的State对象，State对象的分层设计也对应着Memory不仅仅是存储会话记忆，还要存储会话中的工作记忆，多模态消息，Plan执行计划等

另外个save接口是批量存储

```java
@Override
public void save(SessionKey sessionKey, String key, List<? extends State> values) {
    String sessionId = sessionKey.toIdentifier();
    String listKey = getListKey(sessionId, key);
    String hashKey = listKey + HASH_SUFFIX;
    String keysKey = getKeysKey(sessionId);
    try {
        // Compute current hash
        String currentHash = ListHashUtil.computeHash(values);
        // Get stored hash
        String storedHash = client.get(hashKey);
        // Get current list length
        long existingCount = client.getListLength(listKey);
        // Determine if full rewrite is needed
        boolean needsFullRewrite =
                ListHashUtil.needsFullRewrite(values, storedHash, (int) existingCount);
        if (needsFullRewrite) {
            // Delete and recreate the list
            client.deleteKeys(listKey);
            for (State item : values) {
                String json = JsonUtils.getJsonCodec().toJson(item);
                client.rightPushList(listKey, json);
            }
        } else if (values.size() > existingCount) {
            // Incremental append
            List<? extends State> newItems = values.subList((int) existingCount, values.size());
            for (State item : newItems) {
                String json = JsonUtils.getJsonCodec().toJson(item);
                client.rightPushList(listKey, json);
            }
        }
        // else: no change, skip
        // Update hash
        client.set(hashKey, currentHash);
        // Track this key in the session's key set
        client.addToSet(keysKey, key + LIST_SUFFIX);
    } catch (Exception e) {
        throw new RuntimeException("Failed to save list: " + key, e);
    }
}
```
核心逻辑为，首先计算当前列表的hash值，然后和Redis中存储的hash值进行对比，如果不一致或者列表长度变短了，则说明列表发生了变化，需要删除原有列表重新存储；

如果新列表比原有列表长了，则说明是增量追加，可以直接从原有列表长度的位置开始追加；

如果新列表和原有列表长度一样且hash值一致，则说明没有变化，可以跳过不做任何操作。最后更新hash值并且将这个key添加到session的key set中。

### get接口

get接口同样有单条获取和批量获取两种实现，单条获取的核心逻辑如下：

```java
@Override
public <T extends State> Optional<T> get(SessionKey sessionKey, String key, Class<T> type) {
    String sessionId = sessionKey.toIdentifier();
    String redisKey = getStateKey(sessionId, key);
    try {
        String json = client.get(redisKey);
        if (json == null) {
            return Optional.empty();
        }
        return Optional.of(JsonUtils.getJsonCodec().fromJson(json, type));
    } catch (Exception e) {
        throw new RuntimeException("Failed to get state: " + key, e);
    }
}
```
核心逻辑是根据sessionKey和key组装出Redis中的key，然后从Redis中获取对应的json字符串，反序列化成State对象返回。

批量获取的核心逻辑如下：

```java
@Override
public <T extends State> List<T> getList(SessionKey sessionKey, String key, Class<T> itemType) {
    String sessionId = sessionKey.toIdentifier();
    String redisKey = getListKey(sessionId, key);
    try {
        List<String> jsonList = client.rangeList(redisKey, 0, -1);
        if (jsonList == null || jsonList.isEmpty()) {
            return List.of();
        }
        List<T> result = new ArrayList<>();
        for (String json : jsonList) {
            T item = JsonUtils.getJsonCodec().fromJson(json, itemType);
            result.add(item);
        }
        return result;
    } catch (Exception e) {
        throw new RuntimeException("Failed to get list: " + key, e);
    }
}
```
核心逻辑是根据sessionKey和key组装出Redis中的key，然后从Redis采用range命令获取列表中的所有json字符串，反序列化成State对象列表返回。

#### exists接口

exists接口很简单，判断一下key是否存在且是否长度>0即可，这里不再赘述

#### delete接口

```java
@Override
public void delete(SessionKey sessionKey) {
    String sessionId = sessionKey.toIdentifier();
    String keysKey = getKeysKey(sessionId);

    try {
        // Get all tracked keys for this session
        Set<String> trackedKeys = client.getSetMembers(keysKey);

        if (trackedKeys != null && !trackedKeys.isEmpty()) {
            // Build list of actual Redis keys to delete
            Set<String> keysToDelete = new HashSet<>();
            keysToDelete.add(keysKey);

            for (String trackedKey : trackedKeys) {
                if (trackedKey.endsWith(LIST_SUFFIX)) {
                    // It's a list key
                    String baseKey =
                            trackedKey.substring(0, trackedKey.length() - LIST_SUFFIX.length());
                    keysToDelete.add(getListKey(sessionId, baseKey));
                    keysToDelete.add(getListKey(sessionId, baseKey) + HASH_SUFFIX);
                } else {
                    // It's a single state key
                    keysToDelete.add(getStateKey(sessionId, trackedKey));
                }
            }

            client.deleteKeys(keysToDelete.toArray(new String[0]));
        }
    } catch (Exception e) {
        throw new RuntimeException("Failed to delete session: " + sessionId, e);
    }
}
```

核心逻辑是根据sessionKey获取到这个session中所有的key，然后根据这些Key删除对应的Redis Key，包括单条存储的Key、列表存储的Key以及列表存储的Hash Key，最后删除这个session的key set。

#### list key接口

```java
@Override
public Set<SessionKey> listSessionKeys() {
    try {
        Set<String> keysKeys = client.findKeysByPattern(keyPrefix + "*" + KEYS_SUFFIX);
        // Find all session key sets
        Set<SessionKey> sessionKeys = new HashSet<>();
        for (String keysKey : keysKeys) {
            // Extract session ID from the keys key
            // Pattern: {prefix}{sessionId}:_keys
            String withoutPrefix = keysKey.substring(keyPrefix.length());
            String sessionId =
                    withoutPrefix.substring(0, withoutPrefix.length() - KEYS_SUFFIX.length());
            sessionKeys.add(SimpleSessionKey.of(sessionId));
        }
        return sessionKeys;
    } catch (Exception e) {
        throw new RuntimeException("Failed to list sessions", e);
    }
}
```

核心逻辑是通过Redis的key pattern匹配功能找到所有的session key set，然后从这些key set的key中提取出sessionId，组装成SessionKey对象返回。

### RedisClientAdapter

RedisClientAdapter是对底层Redis客户端的适配，提供了统一的接口供RedisSession调用，隐藏了底层Redis客户端的差异，同时也提供了一些额外的功能比如批量删除、基于scan的key查找等。

几个客户端的适配器实现比较类似，都是采用对应SDK的包进行操作，由于外部Session要求传递Client，所以其实不管是用什么序列化方式，Redis实际部署方式，这些东西都是交给用户自行在创建Client时进行自主初始化的，这样做的好处就是底层的代码变得非常简单，能够兼容更多的使用场景，用户也可以根据自己的需求进行定制化的Client实现。

## Spring AI Alibaba中的实现

Spring AI Alibaba中的Redis Memory的实现核心功能也与AgentScope类似，都是支持多种类型Redis客户端的适配，多种部署场景的兼容

在这**基础上增加了和SpringBoot、Spring AI的兼容，支持更多的生产级Redis配置项配置，比如SSL、database、连接池**等，另外**提供了SpringBoot环境下的组件自动注入，Starter**功能

用户可以很方便的在Spring AI环境下使用Redis Memory，并通过yaml配置文件切换不同的客户端

核心主要查看`RedisChatMemoryConnectionAutoConfiguration`和`BaseRedisChatMemoryRepository`，前者是SpringBoot环境下的自动配置类，后者是Redis Memory的核心实现类。

![](https://img.benym.cn/img/redis-memory-2.png)

![](https://img.benym.cn/img/redis-memory-3.png)

主要能看到代码中是如何处理多种不同的客户端，以及多种不同的Redis部署方式的，和AgentScope有区别，Spring AI Alibaba的实现中需要兼容的Spring的地方更多

核心的逻辑是公共的部分都尽量抽象出来，包括公共的参数设置采用`RedisChatMemoryBuilder`，另外就是基于接口去实现框架，这样才能够让用户使用时的外部场景统一，而内部实现细节又能够灵活切换，兼容更多的使用场景。

这里代码建议直接阅读源码，相关内容不再展开。

对于Jedis、Lettuce而言，采用的`RedisTemplate`进行操作，对于Redisson而言，直接使用RedissonClient进行操作

同时对于Spring AI的Message统一采用`MessageFactory`结合`MessageDeserializer`进行转化

### save接口

save接口的实现是SAA和AgentScope的区别点之一，SAA的save采用的是删除旧的，然后保存新的形式，比如

```java
@Override
public void saveAll(String conversationId, List<Message> messages) {
    Assert.hasText(conversationId, "conversationId cannot be null or empty");
    Assert.notNull(messages, "messages cannot be null");
    Assert.noNullElements(messages, "messages cannot contain null elements");
    String key = getKeyPrefix() + conversationId;
    List<String> messageJsons = messages.stream().map(this::serializeMessage).toList();
    try (RedisConnection connection = redisTemplate.getConnectionFactory().getConnection()) {
        connection.keyCommands().del(key.getBytes());
        if (!messageJsons.isEmpty()) {
            byte[][] values = new byte[messageJsons.size()][];
            for (int i = 0; i < messageJsons.size(); i++) {
                values[i] = messageJsons.get(i).getBytes();
            }
            connection.listCommands().rPush(key.getBytes(), values);
        }
    }
}
```

如果单独看这个方法会觉得Memory有问题，因为旧的记录被删除了，但实际上在Spring AI中，Memory需要搭配一个上层框架使用，比如`MessageWindowChatMemory`，基于滑动窗口的Memory

常见使用方法为

```java
MessageWindowChatMemory.builder().chatMemoryRepository(chatMemoryRepository)
				.maxMessages(properties.getMaxMessages())
				.build();
```

其中add方法，会先获取到当前conversationId对应的Memory中的消息，然后和新传入的消息进行合并，最后再调用saveAll方法进行存储，所以虽然saveAll方法是删除旧的记录，但在上层框架的设计下，并不会导致消息丢失，反而能够更好地支持基于窗口的Memory设计。

```java
@Override
public void add(String conversationId, List<Message> messages) {
  Assert.hasText(conversationId, "conversationId cannot be null or empty");
  Assert.notNull(messages, "messages cannot be null");
  Assert.noNullElements(messages, "messages cannot contain null elements");

  List<Message> memoryMessages = this.chatMemoryRepository.findByConversationId(conversationId);
  List<Message> processedMessages = process(memoryMessages, messages);
  this.chatMemoryRepository.saveAll(conversationId, processedMessages);
}
```

这点上也可以看出和AgentScope的区别，AgentScope把这种上层的框架叫做Memory，因为他决定了记忆更新的机制，把底层的存储较为Session，而在SAA中这两者都叫Memory，只是一个实现的是ChatMemory，一个实现的是ChatMemoryRepository，前者负责记忆更新的机制，后者负责记忆的存储，两者分离开来，用户可以根据自己的需求进行组合使用。
