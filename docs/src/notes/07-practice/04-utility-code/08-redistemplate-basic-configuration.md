---
title: RedisTemplate基本配置类
date: 2023-05-17 17:40:06
permalink: /pages/c9a954/
tags:
  - Redis
  - RedisTemplate
  - 序列化
  - JackSon
author: 
  name: benym
  link: https://github.com/benym
---

# RedisTemplate基本配置类

## RedisConfig
```java
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;


@Configuration
public class RedissionConfig {

    @Value("${spring.redis.cluster.nodes}")
    private String redisCluster;

    @Value("${spring.redis.password}")
    private String passWord;

    @Bean
    public RedissonClient getRedissonClient() {
        Config config = new Config();
        if (StringUtils.hasLength(redisCluster)) {
            //集群模式配置
            String[] nodes = redisCluster.split(",");
            List<String> clusterNodes = new ArrayList<>();
            for (String node : nodes) {
                clusterNodes.add("redis://" + node);
            }
            config.useClusterServers()
                    .addNodeAddress(clusterNodes.toArray(new String[0]))
                    .setCheckSlotsCoverage(false);
            if (StringUtils.hasLength(passWord)) {
                config.useClusterServers().setPassword(passWord);
            }
        }
        return Redisson.create(config);
    }

    /**
     * 将value存储为json
     *
     * @param redisConnectionFactory redisConnectionFactory，spring data redis自动注入
     * @return RedisTemplate<String, Object>
     */
    @Bean(name = "redisTemplate")
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        // 注入数据源
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        // 使用Jackson2JsonRedisSerialize 替换默认序列化
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        // 指定objectMapper带输入类型的序列化，如果不指定redis中则存储纯json，序列化返回后解析默认为LinkedHashMap
        // 需要自己转换类型，指定序列化类型后无需再进行转化
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.enableDefaultTyping(LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.WRAPPER_ARRAY);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);
        // key-value结构序列化数据结构
        redisTemplate.setKeySerializer(stringRedisSerializer);
        redisTemplate.setValueSerializer(jackson2JsonRedisSerializer);
        // hash数据结构序列化方式
        redisTemplate.setHashKeySerializer(stringRedisSerializer);
        redisTemplate.setHashValueSerializer(jackson2JsonRedisSerializer);
        // 启用默认序列化方式
        redisTemplate.setEnableDefaultSerializer(true);
        redisTemplate.setDefaultSerializer(jackson2JsonRedisSerializer);
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }

    /**
     * 将value存储为string
     *
     * @param redisConnectionFactory redisConnectionFactory，spring data redis自动注入
     * @return RedisTemplate<String, Object>
     */
    @Bean(name = "redisTemplateString")
    public RedisTemplate<String, String> redisTemplateString(RedisConnectionFactory redisConnectionFactory) {
        StringRedisTemplate redisTemplate = new StringRedisTemplate(redisConnectionFactory);
        // 使用Jackson2JsonRedisSerialize 替换默认序列化
        Jackson2JsonRedisSerializer<String> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(String.class);
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();
        // 指定objectMapper带输入类型的序列化，如果不指定redis中则存储纯json，序列化返回后解析默认为LinkedHashMap
        // 需要自己转换类型，指定序列化类型后无需再进行转化
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.enableDefaultTyping(LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.WRAPPER_ARRAY);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);
        // key-value结构序列化数据结构
        redisTemplate.setKeySerializer(stringRedisSerializer);
        redisTemplate.setValueSerializer(stringRedisSerializer);
        // hash数据结构序列化方式
        redisTemplate.setHashKeySerializer(stringRedisSerializer);
        redisTemplate.setHashValueSerializer(stringRedisSerializer);
        // 启用默认序列化方式
        redisTemplate.setEnableDefaultSerializer(true);
        redisTemplate.setDefaultSerializer(jackson2JsonRedisSerializer);
        redisTemplate.afterPropertiesSet();
        return redisTemplate;
    }
}
```
