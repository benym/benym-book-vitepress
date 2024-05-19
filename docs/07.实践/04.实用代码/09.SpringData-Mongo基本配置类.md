---
title: SpringData-Mongo基本配置类
tags: 
  - SpringData
  - MongoDB
  - 自定义Converter
author: 
  name: benym
  link: https://github.com/benym
date: 2023-06-03 15:37:33
permalink: /pages/304eaa/
---
## 起步依赖
```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```
## MongoConfig
```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.mongo.MongoProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * MongoDb配置
 */
@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Autowired
    private MongoProperties mongoProperties;

    @NotNull
    @Override
    protected String getDatabaseName() {
        return mongoProperties.getDatabase();
    }

    /**
     * 配置MongoClient带有mongo工厂设置
     * 用于mongoTemplate配置
     *
     * @return MongoClient
     */
    @NotNull
    @Override
    public MongoClient mongoClient() {
        ConnectionString connectionString = new ConnectionString("mongodb://" + mongoProperties.getHost());
        MongoClientSettings mongoClientSettings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                // 设置Factory参数，默认keepAlive true
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(5000, TimeUnit.MILLISECONDS);
                    builder.readTimeout(1500, TimeUnit.MILLISECONDS);
                })
                .applyToConnectionPoolSettings(builder -> {
                    // 最小连接数
                    builder.minSize(10);
                    // 最大连接数
                    builder.maxSize(500);
                    // 最长等待时间
                    builder.maxWaitTime(1500, TimeUnit.MILLISECONDS);
                })
                .build();
        return MongoClients.create(mongoClientSettings);
    }

    /**
     * 创建自定义ConverterList
     *
     * @return CustomConversions
     */
    @Bean
    public MongoCustomConversions addConverter() {
        List<Converter<?, ?>> converterList = new ArrayList<>();
        converterList.add(new YourConverter());
        return new MongoCustomConversions(converterList);
    }

    /**
     * 创建MongoTemplate
     *
     * @return MongoTemplate
     */
    @Bean
    public MongoTemplate mongoTemplate() {
        MongoTemplate mongoTemplate = new MongoTemplate(mongoClient(), getDatabaseName());
        MappingMongoConverter mongoMapping = (MappingMongoConverter) mongoTemplate.getConverter();
        mongoMapping.setCustomConversions(addConverter());
        mongoMapping.afterPropertiesSet();
        return mongoTemplate;
    }
}
```
