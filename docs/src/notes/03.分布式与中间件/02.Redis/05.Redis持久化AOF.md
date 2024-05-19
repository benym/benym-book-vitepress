---
title: Redis持久化AOF
date: 2022-01-09 15:47:38
tags: 
  - Java
  - Redis
permalink: /pages/c48db1/
categories: 
  - 分布式与中间件
  - Redis
author: 
  name: benym
  link: https://github.com/benym
---

### Redis持久化AOF
Redis主要包含2中持久化方式，即RDB和AOF，本文主要介绍AOF，RDB见本站的另一篇博客[Redis持久化RDB][1]
#### 什么是AOF
AOF全称为Append Only File（追加文件）。Redis处理的每一个**写命令**都会记录在AOF文件，可以看做是命令日志文件。
AOF默认是关闭的，需要修改`redis.conf`配置文件来开启AOF：
```java
# 是否开启AOF功能，默认是no
appendonly yes
# AOF文件的名称
appendfilename "appendonly.aof"
```
AOF的命令记录的频率也可以通过redis.conf文件来配：
```java
# 表示每执行一次写命令，立即记录到AOF文件
appendfsync always 
# 写命令执行完先放入AOF缓冲区，然后表示每隔1秒将缓冲区数据写到AOF文件，是默认方案
appendfsync everysec 
# 写命令执行完先放入AOF缓冲区，由操作系统决定何时将缓冲区内容写回磁盘
appendfsync no
```
::: center
配置项对比
|  配置项  |   刷盘时机   |          优点          |             缺点             |
| :------: | :----------: | :--------------------: | :--------------------------: |
|  Always  |   同步刷盘   | 可靠性高，几乎不丢数据 |          性能影响大          |
| everysec |   每秒刷盘   |        性能适中        |       最多丢失1秒数据        |
|    no    | 操作系统控制 |        性能最好        | 可靠性较差，可能丢失大量数据 |
:::
因为是记录命令，AOF文件会比RDB文件大的多。而且AOF会记录对同一个key的多次写操作，但只有最后一次写操作才有意义。通过执行`bgrewriteaof`命令，可以让AOF文件执行重写功能，用最少的命令达到相同效果。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisAOF.png/zipstyle" alt="AOF重写" style="zoom:60%;" />
:::
Redis也会在触发阈值时自动去重写AOF文件。阈值也可以在redis.conf中配置：
```java
# AOF文件比上次文件 增长超过多少百分比则触发重写
auto-aof-rewrite-percentage 100
# AOF文件体积最小多大以上才触发重写
auto-aof-rewrite-min-size 64mb 
```
#### 重写原理，如何实现重写
AOF文件持续增长而过大时，会fork出一条新进程来将文件重写(也是先写临时文件最后再rename)，redis4.0版本后的重写，是指上就是把rdb 的快照，以二级制的形式附在新的aof头部，作为已有的历史数据，替换掉原来的流水账操作。
关键命令`no-appendfsync-on-rewrite`

 - 如果`no-appendfsync-on-rewrite=yes`,不写入aof文件只写入缓存，用户请求不会阻塞，但是在这段时间如果宕机会丢失这段时间的缓存数据。（降低数据安全性，提高性能）
 - 如果`no-appendfsync-on-rewrite=no`,  还是会把数据往磁盘里刷，但是遇到重写操作，可能会发生阻塞。（数据安全，但是性能降低）
##### 重写流程
  1. `bgrewriteaof`触发重写，判断是否当前有`bgsave`或`bgrewriteaof`在运行，如果有，则等待该命令结束后再继续执行。
  2. 主进程`fork`出子进程执行重写操作，保证主进程不会阻塞。
  3. 子进程遍历redis内存中数据到临时文件，客户端的写请求同时写入`aof_buf`缓冲区和`aof_rewrite_buf`重写缓冲区保证原AOF文件完整以及新AOF文件生成期间的新的数据修改动作不会丢失。
  4. (1).子进程写完新的AOF文件后，向主进程发信号，父进程更新统计信息。(2).主进程把aof_rewrite_buf中的数据写入到新的AOF文件。
  5. 使用新的AOF文件覆盖旧的AOF文件，完成AOF重写。
  如图所示
  ::: center
  <img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisAOFrewrite.png/zipstyle" alt="AOF重写流程" style="zoom:60%;" />
  :::
#### AOF持久化流程

  1. 客户端的请求写命令会被append追加到AOF缓冲区内；
  2. AOF缓冲区根据AOF持久化策略[always,everysec,no]将操作sync同步到磁盘的AOF文件中；
  3. AOF文件大小超过重写策略或手动重写时，会对AOF文件rewrite重写，压缩AOF文件容量；
  4. Redis服务重启时，会重新load加载AOF文件中的写操作达到数据恢复的目的；
#### 总结-与RDB对比
::: center
RDB和AOF各有自己的优缺点，如果对数据安全性要求较高，在实际开发中往往会结合两者来使用。
|                |                     RDB                      |                           AOF                            |
| :------------: | :------------------------------------------: | :------------------------------------------------------: |
|   持久化方式   |             定时对整个内存做快照             |                   记录每一次执行的命令                   |
|   数据完整性   |          不完整，两次备份之间会丢失          |                 相对完整，取决于刷盘策略                 |
|    文件大小    |             会有压缩，文件体积小             |                  记录命令，文件体积很大                  |
|  宕机恢复速度  |                     很快                     |                            慢                            |
| 数据恢复优先级 |          低，因为数据完整性不如AOF           |                  高，因为数据完整性更高                  |
|  系统资源占用  |            高，大量CPU和内存消耗             | 低，主要是磁盘IO资源  但AOF重写时会占用大量CPU和内存资源 |
|    使用场景    | 可以容忍数分钟的数据丢失，追求更快的启动速度 |                 对数据安全性要求较高常见                 |
:::

[1]: https://cloud.benym.cn/benym-book/pages/2f1bf8/