---
title: 事务的特性、CAP定理、BASE理论
date: 2022-02-20 21:25:48
categories: 
  - Java
tags: 
  - Java
  - 事务
permalink: /pages/aaed8c/
author: 
  name: benym
  link: https://github.com/benym
---

# 事务的特性、CAP定理、BASE理论

## 事务的四大特性(ACID)
 - 原子性(Atomicity):事务中的所有操作，要么全部成功，要么全部失败
 - 一致性(Consistency):事务前后数据的完整性必须保持一致
 - 隔离性(Isolation):事务的隔离性是多个用户并发访问数据库时，数据库为每一个用户开启的事务，不能被其他事务的操作数据所干扰，多个并发事务之间要相互隔离。
 - 持久性(Durability):持久性是指一个事务一旦被提交，它对数据库中数据的改变就是永久性的，接下来即使数据库发生故障也不应该对其有任何影响
## CAP定理
分布式系统有三个指标
 - Consistency(一致性)：用户访问分布式系统中的任意节点，得到的数据必须一致
 - Availability(可用性)：用户访问集群中的任意健康节点，必须能得到响应，而不是超时或拒绝
 - Partition tolerance(分区容错性)：因为网络故障或其它原因导致分布式系统中的部分节点与其它节点失去连接，形成独立分区。在集群出现分区时，整个系统也要持续对外提供服务
分布式系统无法同时满足这三个指标。分布式系统节点通过网络连接，一定会出现分区问题(P)，当分区出现时，系统的一致性(C)和可用性(A)就无法同时满足，这个结论就叫做 CAP 定理。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/CAP.png" alt="CAP" style="zoom:60%;" />
:::
## BASE理论
BASE理论是对CAP的一种解决思路，包含三个思想：
 - Basically Available(基本可用)：分布式系统在出现故障时，允许损失部分可用性，即保证核心可用。
 - Soft State(软状态)：在一定时间内，允许出现中间状态，比如临时的不一致状态。
 - Eventually Consistent(最终一致性)：虽然无法保证强一致性，但是在软状态结束后，最终达到数据一致。

而**分布式事务最大的问题是各个子事务的一致性问题**，因此可以借鉴CAP定理和BASE理论：
AP模式：各子事务分别执行和提交，允许出现结果不一致，然后采用弥补措施恢复数据即可，实现**最终一致**。
CP模式：各个子事务执行后互相等待，同时提交，同时回滚，达成**强一致**。但事务等待过程中，处于弱可用状态。