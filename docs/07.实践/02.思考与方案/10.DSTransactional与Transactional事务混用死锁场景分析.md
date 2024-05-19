---
title: DSTransactional与Transactional事务混用死锁场景分析
categories: 
  - Java
  - 思考与方案
tags: 
  - 死锁
  - DSTransactional
  - Transactional
  - 事务
author: 
  name: benym
  link: https://github.com/benym
date: 2024-03-04 17:10:50
permalink: /pages/aef382/
---

## 问题背景
最近在生产环境发现了死锁问题，经过排查发现是由于在使用`@DSTransactional`跨数据源注解时，混合使用了`@Transactional`注解，造成了同时对某个表中数据行的更新，导致了死锁。以此记录下排查的过程

## 问题流程图

问题流程图如下

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/deadlock-seq.png)

## 问题现象
生产环境偶现死锁异常日志

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/deadlock-exception.png)

部分业务执行成功一半，事务没有正常回滚

## 问题原因

如流程图所示
如果你的代码包含如下内容，那么就会造成死锁

```java
@Autowired
private OtherDao otherDao;

@DSTransactional
public String testTransactional(Test test){
    // do business
    testMapper.updateStatus(test);
    otherDao.revoke(test);
    return "";
}

@Mapper
public class OtherDao implements IOtherDao{
    
    @Transactional
    public void revoke(Test test) {
        testMapper.update(test);
    }
}
```
这段代码描述了流程图中的事务顺序，先开启`@DSTransactional`，然后操作某一数据行，之后再开启`@Transactional`，操作同一数据行，由于`@DSTransactional`事务没有提交，等价于存在两个事务同时操作同一张表的同一行，产生了竞态，导致死锁发生

## 排查思路

1、找`DBA`要死锁日志找到死锁原因，或者有权限的情况下`show engine innodb status\G`，找到`LATEST DETECTED DEADLOCK`，再分析日志

2、根据日志排查代码，通常是因为事务的错误使用引起的

3、`show processlist`，查看当前执行情况，再来看代码

4、分析代码中是否有`select`读写锁，比如`share mode`或`for update`，`update`更新同一行等可疑情况

## 解决方案

避免混合使用`@DSTransactional`和`@Transactional`，因为`@DSTransactional`不支持事务传播机制，同时需要避免长事务