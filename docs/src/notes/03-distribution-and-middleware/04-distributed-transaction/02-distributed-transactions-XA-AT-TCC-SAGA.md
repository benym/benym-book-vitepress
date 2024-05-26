---
title: 分布式事务XA、AT、TCC、SAGA
date: 2022-02-20 21:40:48
categories: 
  - Java
tags: 
  - Java
  - 事务
  - 分布式事务
  - Seata
  - XA
  - TCC
  - AT
  - SAGA
permalink: /pages/e8a7fb/
author: 
  name: benym
  link: https://github.com/benym
---

# 分布式事务XA、AT、TCC、SAGA

## 问题背景
假设系统中有3个服务，分别是订单服务、账户服务、库存服务，用户在下一个订单之后会扣除用户的余额，同时扣减库存容量。在这样的场景下扣款和扣库存需要强一致性保证。就可能会使用到分布式事务解决方案。
### 分布式事务模型
解决分布式事务，各个子系统之间必须能感知到彼此的事务状态，才能保证状态一致，因此需要一个事务协调者来协调每一个事务的参与者（子系统事务）。这里的子系统事务，称为**分支事务**；有关联的各个分支事务在一起称为**全局事务**
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/%E5%88%86%E5%B8%83%E5%BC%8F%E4%BA%8B%E5%8A%A1%E6%A8%A1%E5%9E%8B.png" alt="分布式事务模型" style="zoom:80%;" />
:::
名词解析：
 - 全局事务：整个分布式事务
 - 分支事务：分布式事务中包含的每个子系统的事务
 - 最终一致性：各分支事务分别执行并提交，如果有不一致的情况，想办法补偿恢复，达到数据的最终一致性
 - 强一致性：各事务执行完业务不要提交，等待彼此结束，之后统一提交或回滚
### Seata分布式事务架构
Seata事务管理中有三个重要的角色：
 - **TC(Transaction Coordinator)-事务协调者**：维护全局和分支事务的状态，协调全局事务提交或回滚。
 - **TM(Transaction Manager)-事务管理器**：定义全局事务的范围、开始全局事务、提交或回滚全局事务。
 - **RM(Resource Manager)-资源管理器**：管理分支事务处理的资源，与TC交谈以注册分支事务和报告分支事务的状态，并驱动分支事务提交或回滚。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/seata%E6%9E%B6%E6%9E%84.png" alt="seata架构" style="zoom:80%;" />
:::
TM会首先注册全局事务，之后业务调用各个微服务，由各自的RM向TC发起分支事务的注册，之后执行各个分支事务的sql，执行完毕之后RM会向TC报告分支事务的状态，所有分支事务执行完毕之后，TM向TC发起提交或回滚全局事务，此时TC会检查分支事务的状态来决定是提交还是回滚发送给RM。
以上只是Seata分布式事务的基本模型。
Seata提供了4中不同的分布式事务解决方案：
 - XA模式：强一致性分阶段事务模式，牺牲了一定的可用性，无业务侵入
 - TCC模式：最终一致的分阶段事务模式，有业务侵入
 - AT模式：最终一致的分阶段事务模式，无业务侵入，也是Seata的默认模式
 - SAGA模式：长事务模式，有业务侵入
### XA模式原理
XA规范是X/Open组织定义的分布式事务处理(DTP，Distributed Transaction Processing)标准，XA规范描述了全局的TM与局部的RM之间的接口，几乎所有主流的数据库都对XA规范提供了支持。
标准的XA模式为两阶段提交：
 - 第一阶段由事务协调者向RM(XA模式下一般由数据库实现)发起事务准备请求，RM执行完毕之后，并不直接提交事务，而是将执行的结果告知事务协调者。
 - 第二阶段由事务协调者判断RM的返回结果，如果分支事务都成功了，向RM发起提交请求，RM执行事务提交并返回已提交请求
具体过程如下图所示
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/XAsuccess.png" alt="XA成功" style="zoom:80%;" />
:::
但是，如果在事务执行过程中有一个失败了，事务协调者则会回滚所有已执行事务
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/XAfailed.png" alt="XA失败" style="zoom:80%;" />
:::
Seata在实现XA模式时进行了一定的调整，但大体上相似：
RM一阶段工作：
 1. 注册分支事务到TC
 2. 执行分支业务SQL但不提交
 3. 报告执行状态到TC

TC二阶段工作：
 - TC检测各分支事务执行状态
 1. 如果都成功，通知所有RM提交事务
 2. 如果有失败，通知所有RM回滚事务

RM二阶段工作：
 - 接受TC指令，提交或回滚事务
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/XAseata.png" alt="XAseata" style="zoom:80%;" />
:::
#### XA模式总结
优点：
 - 事务强一致性，满足ACID原则
 - 常用数据库都支持，实现简单，没有代码侵入
缺点：
 - 因为一阶段需要锁定数据库资源，等待二阶段结束才释放，所以性能较差
 - 依赖关系型数据库实现事务
### AT模式原理
AT模式同样是分阶段提交的事务模型，不过缺弥补了XA模型中资源锁定周期过长的缺陷。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/AT.png" alt="AT" style="zoom:80%;" />
:::
AT模式在执行完sql之后会**直接提交事务，而不是进行等待**，在执行的同时RM拦截本次执行，记录更新前后的快照到数据库的`undo_log`中。与XA的不同之处在于
阶段一RM的工作：
 - 注册分支事务
 - **记录undo-log(数据快照)**
 - 执行业务sql并**提交**
 - 报告事务状态

阶段二提交时RM的工作：
 - 删除undo-log即可

阶段二回滚时RM的工作：
 - 根据undo-log回复数据到更新前

具体案例：例如，一个分支业务的SQL是这样的：`update tb_account set money = money - 10 where id = 1`
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/ATexample.png" alt="ATexample" style="zoom:80%;" />
:::
如果这条sql执行成功，那么`money`字段自然是90，如果执行失败，则根据数据快照恢复数据。
#### AT模式总结
与XA模式最大的区别是：
 - XA模式一阶段不提交事务，锁定资源；AT模式一阶段直接提交，不锁定资源。
 - XA模式依赖数据库机制实现回滚；AT模式利用数据快照实现数据回滚。
 - XA模式强一致；AT模式最终一致

优点：
 - 一阶段完成直接提交事务，释放数据库资源，性能比较好
 - 利用全局锁实现读写隔离
 - 没有代码侵入，框架自动完成回滚和提交

缺点：
 - 两阶段之间属于软状态，属于最终一致
 - 框架的快照功能会影响性能，但比XA模式要好很多
### TCC模式原理
TCC模式与AT模式非常相似，每阶段都是独立事务，不同的是TCC通过人工编码来实现数据恢复。需要实现三个方法：
 - Try：资源的检测和预留； 
 - Confirm：完成资源操作业务；要求Try成功Confirm一定要能成功。
 - Cancel：预留资源释放，可以理解为Try的反向操作。
举例，一个扣减用户余额的业务。假设账户A原来余额是100，需要余额扣减30元。
 - 阶段一(Try): 检查余额是否充足，如果充足则冻结金额增加30元，可用余额扣除30
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCC1.gif" alt="TCC1" style="zoom:80%;" />
:::
 - 阶段二：假如要提交（Confirm），则冻结金额扣减30
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCC2.gif" alt="TCC2" style="zoom:80%;" />
:::
 - 阶段三：如果要回滚（Cancel），则冻结金额扣减30，可用余额增加30
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCC3.gif" alt="TCC3" style="zoom:80%;" />
:::
**TCC工作模型图：**
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCCALL.png" alt="TCCALL" style="zoom:80%;" />
:::
#### TCC模式总结
TCC模式的每个阶段是做什么的？
 - Try：资源检查和预留
 - Confirm：业务执行和提交
 - Cancel：预留资源的释放

TCC的优点是什么？
 - 一阶段完成直接提交事务，释放数据库资源，性能好
 - 相比AT模型，无需生成快照，无需使用全局锁，性能最强
 - 不依赖数据库事务，而是依赖补偿操作，可以用于非事务型数据库

TCC的缺点是什么？
 - 有代码侵入，需要人为编写try、Confirm和Cancel接口
 - 软状态，事务是最终一致
 - 需要考虑Confirm和Cancel的失败情况，做好幂等处理
### SAGA模式
Saga模式是SEATA提供的长事务解决方案。也分为两个阶段：
 - 一阶段：直接提交本地事务(TCC是预留)
 - 二阶段：成功则什么都不做；失败则通过编写补偿业务来回滚

Saga模式优点：
 - 事务参与者可以基于事件驱动实现异步调用，吞吐高
 - 一阶段直接提交事务，无锁，性能好
 - 不用编写TCC中的三个阶段，实现简单

缺点：
 - 软状态持续时间不确定，时效性差
 - 没有锁，没有事务隔离，会有脏写
如图所示，SAGA模式下，事务一旦有一个出现问题，则反向按照事务调用顺序进行补偿，从而保证一致性
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/SAGA.png" alt="SAGA" style="zoom:80%;" />
:::
### 四种模式对比
::: center
|    -     |               XA               |                      AT                      |                        TCC                         |                             SAGA                             |
| :------: | :----------------------------: | :------------------------------------------: | :------------------------------------------------: | :----------------------------------------------------------: |
|  一致性  |             强一致             |                    弱一致                    |                       弱一致                       |                           最终一致                           |
|  隔离性  |            完全隔离            |                基于全局锁隔离                |                  基于资源预留隔离                  |                            无隔离                            |
| 代码侵入 |               无               |                      无                      |                有，需要编写3个接口                 |                 有，需要编写状态机和补偿业务                 |
|   性能   |               差               |                      好                      |                       非常好                       |                            非常好                            |
|   场景   | 对一致性、隔离性有高要求的业务 | 基于关系型数据库的大多数分布式事务场景都可以 | 对性能要求较高的事务；有非关系型数据库要参与的事务 | 业务流程长、业务流程多；参与者包含其它公司或遗留系统服务，无法提供TCC模式要求的三个接口 |
:::
