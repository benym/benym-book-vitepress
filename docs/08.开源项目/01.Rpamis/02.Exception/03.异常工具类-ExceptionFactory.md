---
title: 异常工具类-ExceptionFactory
date: 2023-02-09 11:21:55
permalink: /pages/4c5812/
categories:
  - 开源项目
  - Rpamis
  - Exception
tags:
  - 开源项目
  - Rpamis
  - Exception
author: 
  name: benym
  link: https://github.com/benym
---

## ExceptionFactory

异常工厂是一个自定义异常的入口，系统内基本的自定义异常很多，长期下去难以让人记住

ExceptionFactory的作用就是提供所有自定义异常的方法入口

## 基本使用

在项目中采用ExceptionFactory抛出异常
```java
try {
   // do something
} catch (Exception e) {
    throw ExceptionFactory.bizException("业务异常", e);
}
```