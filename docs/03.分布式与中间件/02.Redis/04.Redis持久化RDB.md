---
title: Redis持久化RDB
date: 2022-01-09 14:20:38
tags: 
  - Java
  - Redis
permalink: /pages/2f1bf8/
categories: 
  - 分布式与中间件
  - Redis
author: 
  name: benym
  link: https://github.com/benym
---

### Redis持久化RDB
Redis主要包含2中持久化方式，即RDB和AOF，本文主要介绍RDB，AOF详见[Redis持久化AOF][1]
#### 什么是RDB
RDB全称Redis Database Backup file（Redis数据备份文件），也被叫做Redis数据快照。简单来说就是把内存中的所有数据都记录到磁盘中。当Redis实例故障重启后，从磁盘读取快照文件，恢复数据。
快照文件称为RDB文件，默认是保存在当前运行目录。在redis中执行`save`命令即可(由redis主进程执行命令，会阻塞其他所有命令)，也可以采用`bgsave`命令进行后台运行(使用子进程执行RDB，主进程不受影响)。
**同时，服务在停机时会自动执行RDB，存储一份redis文件到本地磁盘中**，当再次启动redis时，数据将从RDB自动恢复。
通常来说，RDB应该隔一段时间便执行一次，在redis.conf中可以配置相应的参数。比如
```java
# 表示900秒内，如果至少有1个key被修改，则执行bgsave
save 900 1  
# 表示300秒内，如果至少有10个key被修改，则执行bgsave
save 300 10  
# 是否压缩 ,建议不开启，压缩也会消耗cpu，磁盘的话不值钱
rdbcompression yes
# RDB文件名称
dbfilename dump.rdb  
# 文件保存的路径目录
dir ./ 
```
#### RDB原理
bgsave开始时会fork主进程得到子进程，子进程**共享**主进程的内存数据。完成fork后读取内存数据并写入 RDB 文件。
虽然子进程执行过程是异步的，但fork的过程是阻塞的，流程如下图所示。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisRDB2.png/zipstyle" alt="RDB流程" style="zoom:60%;" />
:::
由于在linux系统中，进程无法直接操作物理内存，操作系统将分配虚拟内存给每个进程，并维护虚拟内存到物理内存的映射表。进程通过操作虚拟内存，虚拟内存通过页表到物理内存进行真正的读写。在子进程进行fork时，不是将物理内存的数据进行拷贝，而是**复制**主进程的页表，所以当子进程操作复制的页表时，其能够映射到和主进程相同的物理内存区域，从而实现子进程和主进程内存空间的共享。子进程读取内存数据，写入RDB文件，当子进程完成新RDB文件的写入时，会将旧的备份文件替换掉。
#### 写时复制技术
思考一下，子进程是异步执行的，如果在子进程读取内存数据并写RDB的时候，主进程接受到了新的命令修改了内存中的数据，而此时子进程执行的读数据，两者是冲突的容易产生脏数据，且子进程需要同步主进程修改后的数据。为了解决这个问题的方法，redis的fork采用了写时复制技术:

 - 当主进程执行读操作时，访问共享内存；
 - 当主进程执行写操作时，则会拷贝一份数据，执行写操作。
  具体来说fork会将共享内存标记为read-only，任何进程仅能够读数据，不能够写数据。如下图所示，
::: center  
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/redisImg/redisRDB.png/zipstyle" alt="RDB流程fork" style="zoom:60%;" />
:::
  假设要修改的数据是数据B，redis首先会拷贝一份数据B副本，写入时操作数据副本B，同时将页表关系读操作从读取数据B改为读取数据B的副本。在极端情况下，如果内存中的数据在RDB时都被修改过，那么此时**RDB所需要的内存就会膨胀翻倍**
#### 总结-RDB的优势和劣势
优势：
 - 适合大规模的数据恢复
 - 对数据完整性和一致性要求不高更适合使用
 - 节省磁盘空间
 - 恢复速度快

劣势：
 - Fork的时候，内存中的数据被克隆了一份，大致2倍的膨胀性需要考虑
 - 虽然Redis在fork时使用了写时拷贝技术,但是如果数据庞大时还是比较消耗性能。
 - 在备份周期在一定间隔时间做一次备份，所以如果Redis意外down掉的话，就会丢失最后一次快照后的所有修改。


[1]: https://cloud.benym.cn/benym-book/pages/c48db1/