---
title: 简单高效的代码优化-事务后异步处理
categories: 
  - Java
  - 思考与方案
tags: 
  - Java
  - Spring
  - TransactionalEvent
  - 事务传播机制
  - 一致性
  - 隔离级别
  - 异步
  - Skywalking
author: 
  name: benym
  link: https://github.com/benym
date: 2023-04-15 19:28:02
permalink: /pages/4f8faf/
---

## 背景

以电商平台为例，对于用户而言订单签收是订单正向流程的最后一环，也是用户高频使用的场景之一。

最近接触的一个项目已存在多年，现阶段已有的订单签收逻辑存在较为严重的性能问题，线上监控显示订单的签收接口耗时达到了`1s-5s`甚至以上，对于用户而言签收会产生明显的页面卡顿。并且**随着需要签收的一单内含有的商品越多，签收耗时越长**，这显然是无法接受的。基于此，签收的重构便提上了日程。

## 现状

如下是`Skywalking`中，对旧签收接口的监控

订单含单个商品时，签收耗时`1-1.8s`左右：

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-1.png)

:::

订单含赠品/或为预售订单时，签收耗时超`3s`：

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-2.png)

:::

订单为套装组合时，签收耗时超`5s`：

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-3.png)

:::

由于签收服务中包含签收核心逻辑，其余多种签收方式均会走到服务提供的接口

涉及多个服务调用，包含后台签收、用户自己签收、定时任务签收、基于轨迹的签收

核心接口慢，导致该服务在诸多调用情况下`TP99`居高不下，同时使得常用的批量签收有着惊人的超`50s`的阻塞式耗时，签收相关接口长期处在监控耗时`Top5`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-4.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-5.png)

:::

可以显而易见地观察到批量任务中`50s`中有`30s`都在跑签收

其次，代码上还存在如下典型问题

- 签收代码逻辑混乱，主流程和次要流程交替出现在代码中，校验混合在各种方法内，次要流程异步化不完善
- 没有事务控制，无法保证核心流程的幂等性，如果发生意外还需要手动修复数据
- 潜在的永不过期锁
- 大`try catch`，异常控制粒度过粗
- 泛型的折叠使用，存在潜在的泛型擦涂问题
- 单一方法职责不清晰，代码过长导致阅读困难

### Service层

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-6.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-7.png)

:::

### Manager层

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-8.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-9.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-10.png)

:::

## 优化方案

有了问题分析，优化方案就是逐个解决上述问题即可

### 对于Service层

1. 将业务校验统一在`Service`层，结合全局异常，很容易写出整洁的代码
2. 所有的`RemoteResult`都必须加上泛型推断，一是需要通过代码检测插件，二是避免泛型擦涂问题，在编译期提前发现问题。关于泛型擦涂问题，这里不做展开涉及。
3. 新增`Redission`组件，替换原本的基于lettuce手动编写的加解锁，将加锁代码写入`try catch`中，避免指令已发送到机器加上了锁，但加锁返回结果超时未被异常捕获，无法解锁，造成永不过期的锁。`Redission`作为`Redis`官方指定的分布式`Redis`组件，无需担心许多分布式场景下的加解锁、续期、释放了非加锁线程的锁等问题，方案拉满，已经非常成熟。这里不做展开涉及。
4. 细粒度的异常分类，不同异常做出不同处理

优化后的代码为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-11.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-12.png)

:::

需要注意的是，这里`Service`层不需要加入`@Transactional`事务控制，这样会造成大事务，校验过程有的时候是复杂且耗时的，数据库连接是宝贵的，当事务开启时数据库的连接就会被占用，避免其余线程拿不到连接的情况。

### 对于Manager层

需要做的是复用签收这个动作会产生的所有数据库/中间件影响，不应该在`Manager`层存在业务校验

1. 理清核心流程与分支流程，分支流程全异步化，只在核心流程落库成功后执行
2. 开启事务控制，所有方法在同一个事务中，**要么一起成功，要么一起失败**，保证异常情况下的数据幂等性
3. 分支流程只在事务提交成功后，才开始处理，避免明明数据落库失败了，但下游却收到签收成功了的消息

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-13.png)

:::

上图中的事务1、2、3、4的代码结构基本上和下图相同

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-14.png)

:::

每一个需要受到事务控制的`Manager`中的方法都需要加上`@Transactionnal`的注解，并指定`rollbackFor`和`transactionManager`，同时在捕获异常后将异常直接抛出，以使得外围事务感知到内部事务异常，使事务回滚

根据`@Transactional`的默认传播级别`Propagation.REQUIRED`，事务1、2、3、4都将加入到外层事务中，其中任意一个事务异常，均会使得1、2、3、4回滚，同时后续的分支流程不会执行

**需要注意的是，如果你使用@Transactional注解，你应该熟悉该注解的各种失效场景及多种传播机制，避免发生以为有回滚，其实不会回滚的情况。**

事务4是操作`mongoDb`的事务，同样可以用`@Transactional`注解控制

### 分支流程

分支流程需要在核心流程数据落库之后才开始处理

如果你熟悉`Google`的`EventBus`或者`Spring `的`@EventListener`，你可以很快速的迁移知识到`Spring @TransactionalEventListener`

帮助解耦代码，实现事务提交后异步执行分支流程，`@TransactionalEventListener`为`@EventListener`的子类，用于支持事务上的`Event`总线。

在`Spring`中我们可以很方便的使用`TransactionSynchronizationManager.registerSynchronization`执行事务方法的回调，并实现`TransactionSynchronizationAdapter`其中的接口即可

如果你研究过`@Transactional`的原理，那么对事务管理器的处理就并不陌生

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-15.png)

:::

在本文中，我们只需要实现`afterCommit`方法即可，如果在`@Transactional`的代码中存在事务同步器扩展点，则上文事务执行后，依次会执行扩展点后的方法

::: tip

**Q：TransactionSynchronizationManager.registerSynchronization是必须的吗**

**A**：不是，只有你的`Event`事件实体(本文的`OrderSignEvent`)构建依赖于上文事务的结果时，你才需要使用该方法，否则直接采用`applicationEventPublisher.pushEvent`即可，`register`只是提供了除注解外手动事务的实现，用于更细微的代码控制

:::

在`pushEvent`之后，我们可以编写对应的监听者

以如下分支流程为例，`InsertItemOpen`用于签收成功后，通过计算往反向表中插入数据，用于后续的撤单、退货等

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-18.png)

:::

直接采用`@TransactionalEventListener`将**默认采用单一线程的线程池，同时也不是异步线程**，因此需要手动创建出线程池，并加以`@Async`指定

我们可以指定该方法的执行阶段，这里为`TransactionPhase.AFTER_COMMIT`，即事务提交之后，监听的`class`为`OrderSignEvent.class`

与`TransactionSynchronizationAdapter`类似，`TransactionPhase`枚举分为如下4个阶段，用于`@TransactionalEventListener`注解上

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-19.png)

:::

**同时需要注意，如果事务提交后/完成后的event内有执行数据库新增操作，那么他的传播级别就不能是@Transactional的默认传播级别，需要至少修改为Propagation.REQUIRES_NEW，新开一个事务** 

**这样做的原因是因为，此时如果为默认的传播机制，则会加入到上文事务中，但上文事务已经提交了，这时候insert插入数据库实际上是空执行了一次，因为本次执行不会再提交。**



线程池配置

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-20.png)

:::

**线程池避免全局使用同一个线程池，避免某一任务激增导致其余使用该线程池的任务，无法获取线程的问题，同时执行不同种任务的线程池，应该设定线程前缀名，方便链路跟踪**

在社区中，阿里开发手册具有类似建议

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-21.png)

:::

签收的分支流程分为如下几个大类，重构时可按照不同类型分类监听

tip: 由于监听者是异步线程，所以监听者内部抛出的异常是不能够被全局异常捕获的，我们可以像上文`insertItemOpen`方法一样，`catch`住异常再选择是抛出还是打印日志

不同于`EventBus`，在`idea`中，天然的支持了`Spring Event`的跟踪，点击事件发布者左侧绿标，便可以找到对应的事件监听者

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-22.png)

:::

点击监听者旁的绿标同样可以回到事件发布者，非常的便捷

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-23.png)

:::

## 优化效果

本文的性能问题不体现在`慢SQL`上，所以优化方案中并不包含`SQL`优化处理

同时由于分支流程下游方法的幂等未知性，重构时没有加入分支流程的重试机制，这些方法在重构时都是可以考虑的点。

改造后`TP99`监控，曲线更加平稳，除异步导出外多数接口在`600ms`内返回

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-24.png)

:::

用户自行签收，从`1.8s`到`0.037s`，**效率提升97.94%**

`Top30`内不再看到签收接口的上榜

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-25.png)

:::

批量签收返回耗时缩小一个量级，从`5w`到`5k`，**效率提升90%**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/order-sk-26.png)

:::
