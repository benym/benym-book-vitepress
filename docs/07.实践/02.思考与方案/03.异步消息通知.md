---
title: 异步消息通知—异步改造
date: 2021/11/02 17:00:15
description: 总结
categories:
  - Java
  - 思考与方案
tags: 
  - 异步
  - 消息队列
  - 线程池
  - 事务
  - Java
  - Spring
keywords: Java,异步,消息队列,事务,Spring,线程池
permalink: /pages/3572ad/
author: 
  name: benym
  link: https://github.com/benym
---

## 异步消息通知—异步改造

异步消息通知，解耦业务中需要发送消息的场景，非中间件框架方式使用方法

 <!--more-->

### 背景

消息通知是项目中遇到的常见场景，通常而言消息通知会涉及到数据库操作，且面临着通知用户多，消息处理需要时间的问题。假设一个接口本身的业务逻辑执行只需要`50ms`，而消息通知需要`500ms`，如果串行进行调用，就难免遇到接口长时间阻塞等待结果的情况。所以异步化操作解耦消息通知，在这种场景显得十分必要。

### 主要目的及场景

**主要目的**：市面上有非常多完善的消息中间件如Kafka、RocketMQ、RabbitMQ等已经能够很好的应对这种场景。这篇文章的主要目的是提供一种异步改造的可用思路。为了简单起见，本文采用`LinkedBlockingQueue`模拟消息队列。

**场景**：假设有一个用户注册接口，我们希望该用户注册后同时通知他在应用内的所有已注册朋友

采用`SpringBoot`+`Mybatis-plus`进行演示

### Domain对象

为了规范起见，过程中使用了DTO、DO、QueryParam等对象

#### QueryParam

```java
package com.test.message.domain.query;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import javax.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserQueryParam implements Serializable {

    private static final long serialVersionUID = 7076273323311739844L;
    /**
     * 用户名
     */
    @NotNull
    @JsonProperty("UserName")
    private String userName;

    /**
     * 用户手机号
     */
    @NotNull
    @JsonProperty("UserPhone")
    private String userPhone;

    /**
     * 用户邮箱
     */
    @NotNull
    @JsonProperty("UserEmail")
    private String userEmail;
}
```

#### DTO

```java
package com.test.message.domain.dto;

import java.io.Serializable;
import lombok.Data;

/**
 * userDTO
 */
@Data
public class UserDTO implements Serializable {

    private static final long serialVersionUID = -7055429600592391854L;
    /**
     * 用户名
     */
    private String userName;

    /**
     * 用户手机号
     */
    private String userPhone;

    /**
     * 用户邮箱
     */
    private String userEmail;
}
```

#### DO

```java
package com.test.message.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import lombok.Data;

/**
 * User表实体类
 */
@TableName("user")
@Data
public class UserDO implements Serializable {

    private static final long serialVersionUID = -5268838066640437272L;
    /**
     * 用户id
     */
    @TableId(type = IdType.AUTO)
    private Integer id;

    /**
     * 用户名
     */
    @TableField("user_name")
    private String userName;

    /**
     * 用户手机号
     */
    @TableField("user_phone")
    private String userPhone;

    /**
     * 用户邮箱
     */
    @TableField("user_email")
    private String userEmail;
}
```

#### 消息实体

```java
package com.test.message.domain.query;

import java.util.List;
import lombok.Data;

/**
 * 消息实体类
 */
@Data
public class MessageEntity {

    /**
     * 消息发送者
     */
    private String sender;

    /**
     * 消息接受者
     */
    private List<String> receiver;

    /**
     * 消息内容
     */
    private String content;

}
```

### Controller层

#### UserController

```java
package com.test.message.controller;


import com.test.message.domain.dto.UserDTO;
import com.test.message.domain.query.UserQueryParam;
import com.test.message.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cglib.beans.BeanCopier;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/testuser")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * 保存用户，并发送消息通知
     *
     * @param userQueryParam 用户信息
     * @return Integer
     */
    @PostMapping("/save")
    public Integer saveUser(@Validated @RequestBody UserQueryParam userQueryParam) {
        UserDTO userDTO = new UserDTO();
        BeanCopier beanCopier = BeanCopier.create(UserQueryParam.class, UserDTO.class, false);
        beanCopier.copy(userQueryParam, userDTO, null);
        return userService.save(userDTO);
    }

    /**
     * 保存用户，并发送消息通知，异步，不使用消息队列
     *
     * @param userQueryParam 用户信息
     * @return Integer
     */
    @PostMapping("/saveAsyncNoQueue")
    public Integer saveUserAsyncWithNoQueue(@Validated @RequestBody UserQueryParam userQueryParam) {
        UserDTO userDTO = new UserDTO();
        BeanCopier beanCopier = BeanCopier.create(UserQueryParam.class, UserDTO.class, false);
        beanCopier.copy(userQueryParam, userDTO, null);
        return userService.saveAsyncWithNoQueue(userDTO);
    }

    /**
     * 保存用户，并发送消息通知，异步，使用消息队列
     *
     * @param userQueryParam 用户信息
     * @return Integer
     */
    @PostMapping("/saveWithQueue")
    public Integer saveUserWithQueue(@Validated @RequestBody UserQueryParam userQueryParam) {
        UserDTO userDTO = new UserDTO();
        BeanCopier beanCopier = BeanCopier.create(UserQueryParam.class, UserDTO.class, false);
        beanCopier.copy(userQueryParam, userDTO, null);
        return userService.saveWithQueue(userDTO);
    }
}
```

### Service层

#### UserService

在UserService层，我们简单定义三个接口：

- 保存用户和通知串行执行
- 保存用户后异步发送通知，未使用消息队列
- 保存用户后异步发送通知，使用消息队列

```java
package com.test.message.service;


import com.test.message.domain.dto.UserDTO;

public interface UserService {

    /**
     * 保存用户并发送通知，串行
     *
     * @param userDTO 用户实体
     * @return Integer
     */
    Integer save(UserDTO userDTO);

    /**
     * 保存用户并发送异步通知，未使用消息队列
     *
     * @param userDTO 用户实体
     * @return Integer
     */
    Integer saveAsyncWithNoQueue(UserDTO userDTO);

    /**
     * 保存用户并发送异步通知，使用消息队列
     *
     * @param userDTO 用户实体
     * @return Integer
     */
    Integer saveWithQueue(UserDTO userDTO);
}
```

#### UserServiceImpl

在实现类里面，提供一个简单的生成消息发送对象数组的方法`generalData`

```java
package com.test.message.service.impl;


import com.test.message.domain.dto.UserDTO;
import com.test.message.domain.model.UserDO;
import com.test.message.domain.query.MessageEntity;
import com.test.message.mapper.UserMapper;
import com.test.message.service.MessageService;
import com.test.message.service.UserService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Resource;
import org.springframework.cglib.beans.BeanCopier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationAdapter;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class UserServiceImpl implements UserService {

    @Resource
    private UserMapper userMapper;

    @Resource
    private MessageService messageService;

    @Transactional
    @Override
    public Integer save(UserDTO userDTO) {
        UserDO userDO = new UserDO();
        BeanCopier beanCopier = BeanCopier.create(UserDTO.class, UserDO.class, false);
        beanCopier.copy(userDTO, userDO, null);
        Integer result = userMapper.insert(userDO);
        MessageEntity messageEntity = new MessageEntity();
        messageEntity.setSender(userDO.getUserName());
        messageEntity.setContent("成功创建用户");
        List<String> recevier = generalData(10000);
        messageEntity.setReceiver(recevier);
        // 直接调用消息发送模块
        messageService.sendMessage(messageEntity);
        return result;
    }

    @Override
    public Integer saveAsyncWithNoQueue(UserDTO userDTO) {
        UserDO userDO = new UserDO();
        BeanCopier beanCopier = BeanCopier.create(UserDTO.class, UserDO.class, false);
        beanCopier.copy(userDTO, userDO, null);
        Integer result = userMapper.insert(userDO);
        MessageEntity messageEntity = new MessageEntity();
        messageEntity.setSender(userDO.getUserName());
        messageEntity.setContent("成功创建用户");
        List<String> recevier = generalData(10000);
        messageEntity.setReceiver(recevier);
        // 直接异步发送消息
        messageService.sendMessageAsyncWithNoQueue(messageEntity);
        return result;
    }

    @Transactional
    @Override
    public Integer saveWithQueue(UserDTO userDTO) {
        UserDO userDO = new UserDO();
        BeanCopier beanCopier = BeanCopier.create(UserDTO.class, UserDO.class, false);
        beanCopier.copy(userDTO, userDO, null);
        Integer result = userMapper.insert(userDO);
        MessageEntity messageEntity = new MessageEntity();
        messageEntity.setSender(userDO.getUserName());
        messageEntity.setContent("成功创建用户");
        List<String> recevier = generalData(10000);
        messageEntity.setReceiver(recevier);
        // 将消息发送给队列
        messageService.sendMessageToQueue(messageEntity);
        return result;
    }

    public List<String> generalData(Integer num) {
        List<String> data = new ArrayList<>();
        for (int i = 0; i < num; i++) {
            data.add("朋友" + i);
        }
        return data;
    }
}
```

先看传统串行方法`save`，具体发送消息的逻辑是简单的打印，如下

```java
/**
 * 发送消息具体业务逻辑
 */
@Override
public void sendMessage(MessageEntity messageEntity) {
    messageEntity.getReceiver().forEach(receiver -> {
        logger.info("发送消息，消息发送者:{}，消息接受者:{}", messageEntity.getSender(), receiver);
    });
}
```

我们用POSTMAN简单测试一下，保存用户数据后发送10000条消息，需要的时间大概为`169ms`
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/messageNoqueue.png)
:::
这是简单的打印所需要的时间，如果内部消息处理逻辑复杂，这个时间将会变得很长，以至于接口长时间等待

**那么我们如何将整个消息通知异步化呢？**

- 采用线程异步执行消息任务与主线程分离开

同时一般来说，我们需要在接口内部业务执行完毕之后进行消息的处理

- 如果内部业务不涉及到数据库操作，那么直接在最后开启异步线程去执行消息业务即可
- 如果内部业务涉及到数据库操作，我们则应该在数据库操作之后在进行异步提交

### 异步化

我们可以**通过事务的提交状态**来判断数据库操作是否完毕

在Spring中提供了事务管理器`TransactionSynchronizationManager`，其内部的`registerSynchronization`方法接受一个`TransactionSynchronizationAdapter`对象，而`TransactionSynchronizationAdapter`是一个抽象类，其源码如下

```java
@Deprecated
public abstract class TransactionSynchronizationAdapter implements TransactionSynchronization, Ordered {

	@Override
	public int getOrder() {
		return Ordered.LOWEST_PRECEDENCE;
	}

	@Override
	public void suspend() {
	}

	@Override
	public void resume() {
	}

	@Override
	public void flush() {
	}

	@Override
	public void beforeCommit(boolean readOnly) {
	}

	@Override
	public void beforeCompletion() {
	}

	@Override
	public void afterCommit() {
	}

	@Override
	public void afterCompletion(int status) {
	}

}
```

实现该方法其中的`beforeCommit`、`beforeCompletion`、`afterCommit`、`afterCompletion`方法可以方便的在事务提交前，事务提交完成前、事务提交后、事务提交完成后，进行事务方法的自定义

由于该方法是抽象类，所以想要自定义事务方法必须采用继承的形式，由于单继承的缺点，这个方法已经打上了`@Deprecated`废弃，取而代之的是接口形式的`TransactionSynchronization`

#### 基本异步方案

一个简单点的基于`TransactionSynchronizationAdapter`的事务提交后发送消息方法如下

```java
@Transactional
@Override
public Integer save(UserDTO userDTO) {
    // 省略...
    Integer result = userMapper.insert(userDO);
    // 省略...
    
    // 事务提交后调用
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronizationAdapter() {
        @Override
        public void afterCommit() {
            messageService.sendMessage(messageEntity);
        }
    });
    return result;
}
```

异步化的方法也很简单，新开启一个线程，将事务提交后的调用的这段代码包裹进去即可

```java
Thread thread = new Thread(new Runnable() {
    @Override
    public void run() {
        // 事务提交后调用
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronizationAdapter() {
            @Override
            public void afterCommit() {
                messageService.sendMessage(messageEntity);
            }
        });
    }
});
thread.start();
```

#### 线程池+事务管理复用

上述方法能够快速的实现消息通知的异步化，且满足事务提交后进行操作，但是这样的代码不具有复用性，如果需要发送消息的地方很多，那么就会重复写很多这样的方法，而且线程的创建与销毁也将很消耗系统资源。

为了避免这些情况，可以进行如下操作：

1. 创建全局线程池配置，并注册Bean到Spring中
2. 将ServiceImpl实现事务管理器接口，并交给Spring管理，同时为了方便线程执行，将对应的Service接口继承`Executor`接口

##### 全局线程池配置

这里采用`guava`提供的方法来进行线程池的装饰，以便需要线程执行的返回值时得到对应的`Future`对象

```java
package com.test.message.config;

import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor.AbortPolicy;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 将线程池交给spring管理
 */
@Configuration
public class ExecutorsConfig {

    private static final Logger logger = LoggerFactory.getLogger(ExecutorsConfig.class);

    public static final int MAX_POOL_SIZE = 100;

    @Bean
    public ListeningExecutorService injectExecutorService() {
        int coreThreadNum = Runtime.getRuntime().availableProcessors();
        int maxThreadNum = coreThreadNum * 2;
        logger.info("初始化线程池，核心线程数:{},最大线程数:{}", coreThreadNum, maxThreadNum);
        ThreadFactory threadFactory = new ThreadFactoryBuilder().setNameFormat("自定义线程名称-%d").build();
        ExecutorService executorService = new ThreadPoolExecutor(coreThreadNum, maxThreadNum,0L,
                TimeUnit.MILLISECONDS, new LinkedBlockingQueue<>(MAX_POOL_SIZE), threadFactory, new AbortPolicy());
        return MoreExecutors.listeningDecorator(executorService);
    }

}
```

##### 事务管理执行器

`MessageAfterCommitExecutor`接口：

```java
package com.test.message.transaction;

import java.util.concurrent.Executor;

/**
 * 继承Exector方法，用于事务提交后execute异步执行任务
 */
public interface MessageAfterCommitExecutor extends Executor {

}
```

`MessageAfterCommitExecutorImpl`实现类：

实现`MessageAfterCommitExecutor`接口的同时，实现`TransactionSynchronization`接口，支持事务管理的自定义，同时采用一个`ThreadLocal`变量隔离各线程提交的任务，并存储外部提交线程到list中。针对外围无事务方法，则只需要直接执行提交线程，针对有事务的方法，则需要注册当前事务。事务提交之后利用线程池异步执行存储在`RUNNABLES`中的线程。

```java
package com.test.message.transaction.impl;


import com.google.common.util.concurrent.ListeningExecutorService;
import com.test.message.transaction.MessageAfterCommitExecutor;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class MessageAfterCommitExecutorImpl implements TransactionSynchronization,
        MessageAfterCommitExecutor {

    private static final Logger logger = LoggerFactory.getLogger(MessageAfterCommitExecutorImpl.class);

    private static final ThreadLocal<List<Runnable>> RUNNABLES = new ThreadLocal<>();

    @Autowired
    private ListeningExecutorService listeningExecutorService;

    /**
     * 当该方法被调用时，会检查当前线程的同步器是否处于激活状态，即上下文是否存在事务
     * <p/>
     * 如果没有，则立即执行runnable
     * <p/>
     * 否则，将提交的runnable存储在一个ThreadLocal变量中
     * <p/>
     * 如果这是当前线程第一次提交runnable
     * <p/>
     * 那么我们会将自身注册为当前进程的事务同步器(如果同步没有激活，则无法注册)
     * <p/>
     *
     * @param runnable 由外部提交的线程
     */
    @Override
    public void execute(Runnable runnable) {
        logger.info("【事务已提交】新线程开始运行:{}", runnable);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            logger.info("【当前方法无事务】立即执行消息入库操作:{}", runnable);
            runnable.run();
            return;
        }
        List<Runnable> threadRunnables = RUNNABLES.get();
        if (threadRunnables == null) {
            threadRunnables = new ArrayList<>();
            RUNNABLES.set(threadRunnables);
            TransactionSynchronizationManager.registerSynchronization(this);
        }
        threadRunnables.add(runnable);
    }

    /**
     * 因为注册了事务同步器，所以只要事务成功提交，就会调用afterCommit()方法
     * <p/>
     * 此时，我们为成功完成事务的线程获取所有提交的runnable对象，并采用异步线程池执行他们
     * <p/>
     */
    @Override
    public void afterCommit() {
        List<Runnable> threadRunnables = RUNNABLES.get();
        logger.info("【事务提交成功】开始执行线程:{}", threadRunnables);
        threadRunnables.forEach(nowRunnable -> {
            logger.info("【执行线程】:{}", nowRunnable);
            try {
                listeningExecutorService.submit(nowRunnable);
            } catch (Exception e) {
                logger.error("【事务线程】执行失败", e);
            }
        });
    }

    /**
     * 为刚刚完成事务的线程清理ThreadLocal变量
     *
     * @param status 当前事务状态
     */
    @Override
    public void afterCompletion(int status) {
        logger.info("【事务已完成】状态为:{}", status == STATUS_COMMITTED ? "已完成" : "已回滚");
        RUNNABLES.remove();
    }
}
```

创建一个消息相关的服务接口`MessageService`：

```java
package com.test.message.service;

import com.test.message.domain.query.MessageEntity;

/**
 * 消息通知Service
 */
public interface MessageService {

    /**
     * 异步发送消息，无消息队列
     */
    void sendMessageAsyncWithNoQueue(MessageEntity messageEntity);

    /**
     * 发送消息
     */
    void sendMessage(MessageEntity messageEntity);
}
```

`MessageServiceImpl`实现类:

将前文的事务执行器注入进实现类，在异步线程池内调用发送消息的具体业务，就可以实现事务完成后异步多线程的执行消息发送逻辑

```java
package com.test.message.service.impl;

import static com.test.message.listener.MessageQueueListener.messageQueue;

import com.test.message.domain.query.MessageEntity;
import com.test.message.service.MessageService;
import com.test.message.transaction.MessageAfterCommitExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MessageServiceImpl implements MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageServiceImpl.class);

    @Autowired
    private MessageAfterCommitExecutor messageAfterCommitExecutor;

    /**
     * 异步发送消息，未使用消息队列
     */
    @Override
    public void sendMessageAsyncWithNoQueue(MessageEntity messageEntity) {
        messageAfterCommitExecutor.execute(() -> {
            sendMessage(messageEntity);
        });
    }

    /**
     * 发送消息具体业务逻辑
     */
    @Override
    public void sendMessage(MessageEntity messageEntity) {
        messageEntity.getReceiver().forEach(receiver -> {
            logger.info("发送消息，消息发送者:{}，消息接受者:{}", messageEntity.getSender(), receiver);
        });
    }
}
```

同样用POSTMAN简单测试一下，保存用户数据后发送10000条消息，需要的时间大概为`119ms`，由于消息发送的业务简单，所以只相对于前文串行执行快了一点
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/messageAsyncWithnoqueue.png)
:::
#### 引入消息队列

##### **前文缺陷**

- 线程池+事务管理复用的方案已经实现了普通的异步消息发送，但如果接口请求频繁，海量的请求势必会对数据库造成很大的压力，甚至可能让数据库宕机。
- 同时如果业务中需要做异步消息发送的时候很多，那么每个接口都要去弄一遍异步多线程发送，不仅仅耦合程度很高，如果某一个接口出问题了，这种异步多线程的方法也很难去排查问题，编码的同时也需要不停的try catch异常。

此时引入消息队列就显得十分有必要，其异步、解耦、削峰的特性广为人知，这里不再阐述消息队列中可能遇到的问题和优点。

在本节中，我们引入JDK中自带的`LinkedBlockingQueue`内存队列作为消息中间件，由于该队列内部实现有加锁机制，是一个并发安全队列，所以我们也暂时不需要考虑并发传入数据和取出数据时可能产生的问题。

##### 消息消费者

先思考如何构建**消费者**，由于不像成熟的中间件那样需要部署。在单体应用里面，内存队列应该在`Spring`启动前或启动后加载。`Spring`的提供了许多方法在生命周期范围内进行自定义，可以选择在`Spring`启动类中实现`CommandLineRunner`，也可以选择使用对象实现`ApplicationListener`

本节采用后者，实现一个`MessageQueueListener`，在`Spring`上下文准备就绪时，开启消息消费者对内存队列的监听(采用循环监听即可)，异步多线程的取出队列内的数据，并发送消息。规定内存队列为`static`保证在单体应用内的可见性，这里也可以单独写一个单例模式将这个队列注入到`Spring`容器中，效果一样。
::: tip
注意，异步多线程消费数据会造成消费顺序不一致的情况，本文暂不需要考虑顺序消费场景，同时内存消息队列具有不可靠性，实际使用时请采用成熟的消息中间件
:::

```java
package com.test.message.listener;

import com.google.common.util.concurrent.ListeningExecutorService;
import com.test.message.domain.query.MessageEntity;
import com.test.message.service.MessageService;
import java.util.concurrent.LinkedBlockingQueue;
import javax.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

/**
 * 消息队列监听器-消费者, spring上下文准备就绪时，监听队列内消息进行消费
 */
@Component
public class MessageQueueListener implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(MessageQueueListener.class);

    // 限制队列长度
    private static final Integer MAX_MESSAGEQUEUE_SIZE = 1000;

    // 阻塞队列，并发安全
    public static final LinkedBlockingQueue<MessageEntity> messageQueue = new LinkedBlockingQueue<>(
            MAX_MESSAGEQUEUE_SIZE);

    @Autowired
    private ListeningExecutorService listeningExecutorService;

    @Resource
    private MessageService messageService;

    /**
     * 消息消费者
     * <p/>
     * 如果循环在异步提交外围
     * <p/>
     * 可能出现消息还没发送完，while循环又判断了
     * <p/>
     * 多次提交了任务，但此时队列已经为空
     * <p/>
     * 所以这里while循环在线程池提交的任务内部
     */
    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        listeningExecutorService.submit(() -> {
            try {
                while (true) {
                    if (messageQueue.size() != 0) {
                        // take 队列为空的时候线程阻塞不会执行后续方法
                        MessageEntity message = messageQueue.take();
                        messageService.sendMessage(message);
                    }
                }
            } catch (Exception e) {
                logger.error("队列: 消息发送失败", e);
            }
        });
    }
}
```

##### **消息生产者**

生产者主要是将消息实体传入消息队列，不过由于是事务后进行的消息生产，需要有些注意的地方，详见注释

在`MessageService`中添加`sendMessageToQueue`方法

```java
/**
 * 消息通知Service
 */
public interface MessageService {

    /**
     * 发送消息到消息队列
     */
    void sendMessageToQueue(MessageEntity messageEntity);
    // 省略...
}

```

在`MessageServiceImpl`中添加`sendMessageToQueue`的实现

```java
@Service
public class MessageServiceImpl implements MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageServiceImpl.class);

    @Autowired
    private MessageAfterCommitExecutor messageAfterCommitExecutor;

    /**
     * 消息生产者
     * <p/>
     * 注意由事务管理器提交的runnable进程，如果涉及到写入操作
     * <p/>
     * 则必须采用Propagation.REQUIRES_NEW的事务传播类型
     * <p/>
     * 现有管理器是上文事务提交之后执行新线程
     * <p/>
     * 如果新线程内未开启事务，则会因传播机制加入到上文事务中
     * <p/>
     * 由于上文事务已提交，所以新线程的执行在事务完成之后
     * <p/>
     * 将会出现线程虽然执行了，但事务未提交的情况，导致写操作失败
     * <p/>
     * 本次生产者仅将消息实体加入到消息队列，无需额外声明事务传播类型
     */
    @Override
    public void sendMessageToQueue(MessageEntity messageEntity) {
        messageAfterCommitExecutor.execute(() -> {
            messageQueue.offer(messageEntity);
        });
    }
}

```

至此，整个异步化的消息改造完成，消息在送入队列之后接口就可以返回了，后续的消息消费将在后台执行

同样用POSTMAN简单测试一下，保存用户数据后发送10000条消息，需要的时间大概为`10ms`
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/messageWithqueue.png)
:::
消耗的时间大概为：保存用户需要的时间+发送消息实体到内存队列的时间

### 总结

异步化改造是应用中场景的方法，本文从简单的异步方法出发，提供了线程池+事务管理+消息队列联合运用的整体方法，测试结果发现相对比串行和单纯使用异步调用的方法，加入消息队列的方案具有更快的调用速度

## 参考资料

> 1. https://segmentfault.com/a/1190000004235193?utm_source=tag-newest
> 2. http://azagorneanu.blogspot.com/2013/06/transaction-synchronization-callbacks.html
> 3. https://www.jyoryo.com/archives/155.html
> 4. https://www.ithere.net/article/550
> 5. https://juejin.cn/post/6984574787511123999

