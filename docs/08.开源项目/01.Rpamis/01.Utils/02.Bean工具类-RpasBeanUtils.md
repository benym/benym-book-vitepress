---
title: Bean工具类-RpamisBeanUtils
date: 2022-11-25 14:58:41
categories: 
  - 开源项目
  - Rpamis
tags:
  - 开源项目
  - Rpamis
  - 工具类
  - BeanUtil
  - RpamisBeanUtils
author: 
  name: benym
  link: https://github.com/benym
permalink: /pages/cedee6/
---

## 背景

当项目中有需要使用拷贝类时，开发者可能会需要将目前的拷贝工具进行二次封装用于适配项目，减少动态创建拷贝工具的性能损耗，这里给出一个简单的封装Bean工具类。

采用并发安全、且弱引用的`ConcurrentReferenceHashMap`+`BeanCopier`的形式快速开发出自己的拷贝工具。


## 为什么需要弱引用？

当考虑为`BeanCopier`做实例缓存时，通常会用到`ConcurrentHashMap`等并发安全的Map工具，在第一次进行拷贝时会将`source`和`target`创建的拷贝实例放入map中。

在系统长期运行的情况下，内存是非常宝贵的资源，拷贝场景涉及多、使用高频，如果只是强引用的Map，则GC无法进行回收，有些低频使用的拷贝实例将得不到释放。在Java中有`WeakHashMap`提供弱引用的帮助，但却没有弱引用+并发安全的Map。

Spring基于这一缺口开发出了`ConcurrentReferenceHashMap`，提供了GC友好、且并发安全的Map工具，这也是本工具类选择它的原因。

## 基本使用

- **RpamisBeanUtils.copy(Object source, Object target)**

  拷贝source对象属性到target中，名字和类型不严格匹配时将不拷贝，无返回值
```java
EntitySource entitySource = init();
EntityTarget entityTarget = new EntityTarget();
RpamisBeanUtils.copy(entitySource, entityTarget);
```

- **RpamisBeanUtils.copy(Object source, Class&lt;T> clazz)**

  拷贝source对象属性到target class中，返回target
```java
EntitySource entitySource = init();
EntityTarget entityTarget = RpamisBeanUtils.copy(entitySource, EntityTarget.class);
```

- **RpamisBeanUtils.copy(Object source, Object target, Converter converter)**

拷贝source对象属性到target中，使用自定义converter，拷贝规则严格符合converter规则，无返回值
```java
EntitySource entitySource = init();
EntityTargetDiff entityTargetDiff = new EntityTargetDiff();
RpamisBeanUtils.copy(entitySource, entityTargetDiff, new DiffConverter());
```

- **RpamisBeanUtils.copy(Object source, Class&lt;T> clazz, Converter converter)**

拷贝source对象属性到target class中，使用自定义converter，拷贝规则严格符合converter规则，返回target
```java
EntitySource entitySource = init();
EntityTargetDiff entityTargetDiff = RpamisBeanUtils.copy(entitySource, EntityTargetDiff.class, new DiffConverter());
```

- **RpamisBeanUtils.copyToList(List&lt;?> sources, Class&lt;T> clazz)**

拷贝源list对象到新class list，返回List&lt;Target>
```java
List<EntitySource> list = initList();
List<EntityTarget> entityTargets = RpamisBeanUtils.copyToList(list, EntityTarget.class);
```

- **RpamisBeanUtils.copyToList(List&lt;?> sources, Class&lt;T> clazz, Converter converter)**

拷贝源list对象到新class list，使用自定义converter，返回List&lt;Target>
```java
List<EntitySource> list = initList();
List<EntityTargetDiff> entityTargetDiffs = RpamisBeanUtils.copyToList(list, EntityTargetDiff.class, new DiffConverter());
```

- **RpamisBeanUtils.toPageResponse(Page&lt;T> page)**

将Mybatis-plus Page对象转化为PageResponse，返回PageResponse&lt;Source>
```java
Page<EntitySource> page = initPage();
PageResponse<EntitySource> entitySourcePageResponse = RpamisBeanUtils.toPageResponse(page);
```

- **RpamisBeanUtils.toPageResponse(PageResponse&lt;S> sourcePageResponse, Class&lt;T> clazz)**

将PageResponse对象，转化内部class，返回PageResponse&lt;Target>
```java
Page<EntitySource> page = initPage();
PageResponse<EntitySource> entitySourcePageResponse = RpamisBeanUtils.toPageResponse(page);
PageResponse<EntityTarget> entityTargetPageResponse = RpamisBeanUtils.toPageResponse(entitySourcePageResponse, EntityTarget.class);
```

- **RpamisBeanUtils.toPageResponse(Page&lt;S> page, Function&lt;S, T> functionConverter)**

将Mybatis-plus Page对象转化为PageResponse, Function converter形式，返回PageResponse&lt;Target>
```java
Page<EntitySource> page = initPage();
PageResponse<EntityTarget> entityTargetPageResponse = RpamisBeanUtils.toPageResponse(page, source -> RpamisBeanUtils.copy(source, EntityTarget.class));
```

- **RpamisBeanUtils.toPageResponse(PageResponse&lt;S> sourcePageResponse, Function&lt;S, T> functionConverter)**

将PageResponse对象 转换不同内部class, Function converter形式，返回PageResponse&lt;Target>
```java
Page<EntitySource> page = initPage();
PageResponse<EntitySource> entitySourcePageResponse = RpamisBeanUtils.toPageResponse(page);
PageResponse<EntityTargetDiff> pageResponse = RpamisBeanUtils.toPageResponse(entitySourcePageResponse,
        source -> RpamisBeanUtils.copy(source, EntityTargetDiff.class, new DiffConverter()));
```
