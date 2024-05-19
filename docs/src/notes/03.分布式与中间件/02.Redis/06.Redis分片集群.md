---
title: Redis分片集群
date: 2022-01-26 21:02:48
tags: 
  - Java
  - Redis
permalink: /pages/20361f/
categories: 
  - 分布式与中间件
  - Redis
author: 
  name: benym
  link: https://github.com/benym
---

### Redis分片集群
分片集群是将多个`Redis`主从结构联合起来，每个主从结构具有一个主实例和多个从实例。Redis的分片集群可以在数据量不断增大的情况下进行水平扩容，将键值放在指定的实例中，以此来降低系统对单主节点的依赖，从而提高`Redis`服务的读写性能。分片集群的结构图如下。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/rediscluster.png/zipstyle" alt="Redis集群" style="zoom:60%;" />
:::
#### 分片集群的作用
主从和哨兵可以解决高可用、高并发读的问题。但是依然有两个问题没有解决：
 - 海量数据存储问题
 - 高并发写的问题
    哨兵模式本质是依旧是主从模式，在主从模式下我们可以增加slave节点来拓展**读**并发能力，但是没办法扩展**写**能力和**存储**能力。
    使用分片集群可以解决上述问题，分片集群特征：
 - 集群中有多个master，每个master保存不同数据
 - 每个master都可以有多个slave节点
 - master之间通过ping监测彼此健康状态
 - 客户端请求可以访问集群任意节点，最终都会被转发到正确节点
#### 散列插槽
Redis会把每一个master节点映射到0~16383共16384个插槽(hash slot)上。哈希槽类似于数据分区，每个键值对都会根据它的 key，被映射到一个哈希槽中，具体执行过程分为两大步：
 - 根据键值对的key，按照CRC16算法计算一个16bit的值
 - 再用16bit值对16384取模，得到0~16383范围内的模数，每个模数代表一个相应编号的哈希槽
    每个Redis节点负责处理一部分槽位，假如集群中有`master`节点ABC，每个节点负责的槽位范围如下：
::: center
| master节点 |  处理槽位   |
| :--------: | :---------: |
|     A      |   0-5460    |
|     B      | 5461-10922  |
|     C      | 10923-16383 |
:::
查看集群信息时就能看到：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisslot.png/zipstyle" alt="Redis集群插槽情况" style="zoom:60%;" />
:::
注意，**数据key不是与节点绑定，而是与插槽绑定**。这样绑定的好处是，当集群发生扩容增加节点或者宕机减少了master节点，Redis能够更加方便的将插槽转移到仍然存活的节点上，数据跟随插槽转移，使得我们能够找到原本数据所在的位置。Redis会根据key的有效部分计算插槽值，分两种情况：
 - key中包含"{}"，且"{}"中至少包含1个字符，"{}"中的部分是有效部分

 - key中不包含"{}"，整个key都是有效部分

第一种情况可以应对如下问题

如何将同一类数据固定的保存在同一个Redis实例？

这一类数据使用相同的有效部分，例如key都以{typeId}为前缀[/card]
  例如：key是num，那么就根据num计算，如果是{test}num，则根据test计算。计算方式是利用CRC16算法得到一个hash值，然后对16384取余，得到的结果就是slot值。
::: center  
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redislesson.png/zipstyle" alt="Redis集群插槽setget" style="zoom:60%;" />
:::
  如上图所示，当连接7001节点时，存入num为key的数据正好散列在7001，看起来操作没有变化。当存入a为key的数据时，它散列在了7003节点上，可以看到重定向的消息。此时已经定向到了7003节点，在该节点获取7001节点存入的num时，又会重定向到7001节点。
  需要注意的是：集群操作时，需要给redis-cli加上-c参数才可以，如`redis-cli -c -p 7001`，否则set方法会报如下错误
::: center  
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/rediserrorset.png/zipstyle" alt="Redis集群set错误" style="zoom:60%;" />
:::