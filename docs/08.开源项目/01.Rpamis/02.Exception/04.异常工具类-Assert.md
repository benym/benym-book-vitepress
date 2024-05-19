---
title: 异常工具类-Assert
date: 2023-02-09 11:22:12
permalink: /pages/cb1099/
categories:
  - 开源项目
  - Rpamis
  - Exception
  - Dubbo
  - Spring
tags:
  - 开源项目
  - Rpamis
  - Exception
author: 
  name: benym
  link: https://github.com/benym
---

## Assert
Assert断言工具类是直接从`org.springframework.util.Assert`中拷贝出来的，`api`的用法和定义和`Spring Assert`一模一样，在`Spring Assert`的使用经验可无缝迁移到该`Assert`中

区别点在于对于断言的异常，不再像`Spring`一样抛出`IllegalArgumentException`，默认转为抛出自定义的`ValidException`，与全局异常紧密结合

同时提供了所有重载的接口，支持通过`AbstractException`子类`class`，构造异常实例，根据`class`抛出对应异常，目前支持推断所有自定义异常中，具有单字符串构造方法的异常实例

`Assert`解决的问题是经过前置参数过滤后，业务层面的校验，不得不包装统一返回体，和经过`if else`判断后进行返回的场景

或是结合全局异常后，每次抛出异常必须得写`try catch`代码的场景

**目的在于进一步精简代码**

## 基本使用

以`isTrue`为例，判断条件是否成立，如果不成立则抛出异常，同时带有异常`message`
```java
Assert.isTrue(0==1, "条件不满足");
```

支持推断`AbstractException`子类

```java
Assert.isTrue(0==1, "条件不满足", BizNoStackException.class);
```