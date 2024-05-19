---
title: 线程池基本配置类
date: 2023-05-17 17:39:44
permalink: /pages/83fa81/
tags:
  - ThreadPoolTaskExecutor
  - ThreadPoolExecutor
  - Spring
author: 
  name: benym
  link: https://github.com/benym
---
## ThreadPoolExecutorConfig
```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 线程池设置
 */
@Configuration
public class ThreadPoolExecutorConfig {

    @Bean("LogExecutor")
    public ThreadPoolTaskExecutor asyncTaskExecutor() {
        int cpu = Runtime.getRuntime().availableProcessors();
        ThreadPoolTaskExecutor threadPoolTaskExecutor = new ThreadPoolTaskExecutor();
        threadPoolTaskExecutor.setThreadNamePrefix("LogExecutor-");
        threadPoolTaskExecutor.setCorePoolSize(cpu/2);
        threadPoolTaskExecutor.setMaxPoolSize(cpu);
        threadPoolTaskExecutor.setQueueCapacity(1000);
        threadPoolTaskExecutor.setKeepAliveSeconds(30);
        threadPoolTaskExecutor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        threadPoolTaskExecutor.initialize();
        return threadPoolTaskExecutor;
    }
}
```