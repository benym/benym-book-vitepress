---
title: Redis哨兵
date: 2022-01-07 20:15:23
tags: 
  - Java
  - Redis
permalink: /pages/3aa0a8/
categories: 
  - 分布式与中间件
  - Redis
author: 
  name: benym
  link: https://github.com/benym
---

### Redis哨兵的作用
Redis提供了哨兵(Sentinel)机制来实现主从集群的自动故障恢复。
**主从切换技术的方法是：当主服务器宕机后，需要手动把一台从服务器切换为主服务器，这就需要人工干预，费事费力，还会造成一段时间内服务不可用**。这不是一种推荐的方式，更多时候，我们优先考虑**哨兵模式**。
#### 哨兵的结构如图所示
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisSentinel1.png/zipstyle" alt="哨兵结构图" style="zoom:50%;" />
:::
通常而言，哨兵需要部署至少3个节点，保证哨兵集群的高可用。
其作用可概述为：

 - **监控**：哨兵会不断检查master和slave是否按期工作
 - **自动故障恢复**：如果master故障，Sentinel会将一个slave提升为master。当故障实例恢复后也以新的master为主
 - **通知**：Sentinel充当Redis客户端的服务发现来源，当集群发生故障转移时，会将最新信息推送给Redis的客户端

#### 服务状态监控
Sentinel基于心跳机制监测服务状态，每隔1秒向集群的每个实例发送ping命令：

 - **主观下线**：如果某sentinel节点发现某实例未在规定时间响应，则认为该实例主观下线。(主观下线不一定是真正的下线了，可能由于网络阻塞等原因，导致实例访问超时)
 - **客观下线**：若超过指定数量（quorum）的sentinel都认为该实例主观下线，则该实例客观下线。quorum值最好超过Sentinel实例数量的一半。即多数sentinel认为主观下线。

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisSentinel2.png/zipstyle" alt="服务状态监控" style="zoom:50%;" />
:::
当sentinel认为实例客观下线时，就需要重新选举master节点。

#### 选举新的master
一旦发现master故障，sentinel需要在slave中选择一个作为新的master，选择依据如下：

 - 首先会判断slave节点与master节点断开时间长短，如果超过指定值（down-after-milliseconds * 10）则会排除该slave节点
 - 然后判断slave节点的slave-priority值，越小优先级越高，如果是0则永不参与选举，默认为100(replica-priority)
 - 如果slave-prority一样，则判断slave节点的offset值，越大说明数据越新，优先级越高
 - 最后是判断slave节点的运行id大小，越小优先级越高。
  选择好新的slave作为master后，就需要对redis集群进行故障转移

#### 故障转移步骤
例如选中了slave1为新的master后，故障的转移的步骤如下：

 - sentinel给备选的slave1节点发送slaveof no one命令，让该节点成为master
 - sentinel给所有其它slave发送slaveof 192.168.150.101 7002 命令，让这些slave成为新master的从节点，开始从新的master上同步数据。
 - 最后，针对故障的节点sentinel会强制修改其对应的配置文件标记为slave，当故障节点恢复后会自动成为新的master的slave节点。

如图所示，master从中间的节点变为了最左的节点，原本的master重启后变成了slave
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisSentinel3.png/zipstyle" alt="故障转移" style="zoom:50%;" />
:::

### 总结
Sentinel的作用：

 - 监控
 - 故障转移
 - 通知

Sentinel如何判断一个redis实例是否健康？

 - 每隔1秒发送一次ping命令，如果超过一定时间没有相向则认为是主观下线
 - 如果大多数sentinel都认为实例主观下线，则判定服务下线

故障转移步骤有哪些？

 - 首先选定一个slave作为新的master，执行slaveof no one
 - 然后让所有节点都执行slaveof 新master
 - 修改故障节点配置，添加slaveof 新master
