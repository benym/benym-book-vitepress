---
title: RestTemplate基本配置类
date: 2023-05-17 17:39:23
permalink: /pages/fdab7c/
tags:
  - RestTemplate
  - 超时时间
author: 
  name: benym
  link: https://github.com/benym
---
## RestTemplateConfig
```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate注入，配置超时时间
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate getRestTemplate() {
        // 配置HTTP超时时间为5s
        HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
        httpRequestFactory.setConnectTimeout(5000);
        httpRequestFactory.setReadTimeout(5000);
        return new RestTemplate(httpRequestFactory);
    }
}
```