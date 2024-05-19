---
title: 分布式事务TCC模式的空回滚和业务悬挂问题
date: 2022-02-26 12:43:48
categories: 
  - Java
tags: 
  - Java
  - 事务
  - 分布式事务
  - TCC
permalink: /pages/f256e0/
author: 
  name: benym
  link: https://github.com/benym
---

### TCC模式的空回滚和业务悬挂问题
首先回顾一下TCC模式
#### TCC模式原理
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
#### 空回滚和业务悬挂问题
以代码中的`account—service`服务为例，利用TCC实现分布式事务需要完成以下逻辑：
 - 修改account-service，编写try、confirm、cancel逻辑
 - try业务：添加冻结金额，扣减可用金额
 - confirm业务：删除冻结金额
 - cancel业务：删除冻结金额，恢复可用金额
 - 保证confirm、cancel接口的**幂等性**
 - 允许**空回滚**
 - 拒绝**业务悬挂**

幂等性就是无论接口调用多少次，返回的结果应该具有一致性。那么什么是控回滚和业务悬挂呢？
空回滚：当某分支事务的try阶段阻塞时，可能导致全局事务超时而触发二阶段的cancel操作。在未执行try操作时先执行了cancel操作，这时cancel不能做回滚，就是**空回滚**。
业务悬挂：对于已经空回滚的业务，如果以后继续执行try，就永远不可能confirm或cancel，这就是**业务悬挂**。应当阻止执行空回滚后的try操作，避免悬挂。
如下图所示
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCC111.gif" alt="TCC111" style="zoom:80%;" />
:::
**空回滚情况：**
上方调用分支按照TCC流程正常执行，此时下方调用分支因为某种原因而阻塞了，由于长时间没有执行，这个分支发生了超时错误，由TM经过2.1步骤发送超时错误，回滚全局事务的指令给TC，TC检查分支状态2.2，发现确实有一只分支超时，发送2.3回滚指令到各分支的RM，由RM执行2.4cancel操作。
此时对于第一个分支而言，执行cancel没有问题，因为流程正常。但对于第二个分支而言，他并没有执行第一步的try，所以此时第二个分支不能真正的执行cancel，需要执行空回滚，也就是说返回一个正常状态，且不报错。需要在cancel之前查看是否有前置的try，如果没有执行try则需要空回滚。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/TCC222.png" alt="TCC222" style="zoom:80%;" />
:::
**业务悬挂情况：**
假设在上方的基础上，下方分支的阻塞畅通了，此时他执行1.4去锁定资源(try)，但整个事务都已经回滚结束了，所以他不会执行第二阶段，但冻结了资源，这种情况应该进行避免。需要在try操作之前查看当前分支是否已经回滚过，如果已经回滚过则不能在执行try命令。
#### 实现方法
为了实现空回滚、防止业务悬挂，以及幂等性要求。我们必须在数据库记录冻结金额的同时，记录当前事务id和执行状态，为此我们设计了一张表：
```sql
CREATE TABLE `account_freeze_tbl` (
  `xid` varchar(128) NOT NULL COMMENT '事务id',
  `user_id` varchar(255) DEFAULT NULL COMMENT '用户id',
  `freeze_money` int(11) unsigned DEFAULT '0' COMMENT '冻结金额',
  `state` int(1) DEFAULT NULL COMMENT '事务状态，0:try，1:confirm，2:cancel',
  PRIMARY KEY (`xid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
```

1. Try业务
 - 记录冻结金额和事务状态0到account_freeze表
 - 扣减account表可用金额
2. Confirm业务
 - 根据xid删除account_freeze表的冻结记录(因为如果一个事务confirm那么记录就没有意义了)
3. Cancel业务
 - 修改account_freeze表，冻结金额为0，state为2
 - 修改account表，恢复可用金额
4. 如何判断是否空回滚
 - cancel业务中，根据xid查询account_freeze，如果为null则说明try还没做，需要空回滚
5. 如何避免业务悬挂
 - try业务中，根据xid查询account_freeze ，如果已经存在则证明Cancel已经执行，拒绝执行try业务
#### TCC标准接口声明
TCC的Try、Confirm、Cancel方法都需要在接口中基于注解来声明，语法如下：
```java
@LocalTCC
public interface TCCService {
    /**
     * Try逻辑，@TwoPhaseBusinessAction中的name属性要与当前方法名一致，用于指定Try逻辑对应的方法
     */
    @TwoPhaseBusinessAction(name = "prepare", commitMethod = "confirm", rollbackMethod = "cancel")
    /**
     * 二阶段confirm确认方法、可以另命名，但要保证与commitMethod一致
     *
     * @param context 上下文,可以传递try方法的参数
     * @return boolean 执行是否成功 
     */
    void prepare(@BusinessActionContextParameter(paramName = "param") String param);
    /**
     * 二阶段回滚方法，要保证与rollbackMethod一致
     */
    boolean confirm(BusinessActionContext context);

    boolean cancel(BusinessActionContext context);
}
```
#### 在account-service中的具体实现
**AccountTCCService.java**
```java
@LocalTCC
public interface AccountTCCService {

    // try阶段
    @TwoPhaseBusinessAction(name = "deduct", commitMethod = "confirm", rollbackMethod = "cancel")
    void deduct(@BusinessActionContextParameter(paramName = "userId") String userId,
                @BusinessActionContextParameter(paramName = "money") int money);
    // confirm阶段
    boolean confirm(BusinessActionContext context);
    // cancel阶段
    boolean cancel(BusinessActionContext context);
    
}
```
**AccountTCCServiceImpl.java**
```java
@Slf4j
@Service
public class AccountTCCServiceImpl implements AccountTCCService {

    @Resource
    private AccountMapper accountMapper;

    @Resource
    private AccountFreezeMapper freezeMapper;

    @Override
    @Transactional
    public void deduct(String userId, int money) {
        // 数据库的money是unsigned字段，不可能为负数，所以这里不用检测余额
        // 直接扣减为负数会抛出异常，这里的事务注解回滚
        // 0. 获取事务id
        String xid = RootContext.getXID();
        // 业务悬挂处理，防止已经发起回滚操作后，阻塞的try恢复，进行扣减
        // 导致无法confirm也无法cancel
        // 1. 判断freeze中是否有冻结记录，如果有，一定是CANCEL执行过，需要拒绝业务
        AccountFreeze oldFreeze = freezeMapper.selectById(xid);
        if (oldFreeze != null) {
            // 拒绝
            return;
        }
        // 1. 扣减可用余额
        accountMapper.deduct(userId, money);
        // 2. 记录冻结金额，事务状态
        AccountFreeze freeze = new AccountFreeze();
        freeze.setUserId(userId);
        freeze.setFreezeMoney(money);
        freeze.setState(AccountFreeze.State.TRY);
        freeze.setXid(xid);
        freezeMapper.insert(freeze);
    }

    @Override
    public boolean confirm(BusinessActionContext context) {
        // 因为try获取成功后进入confirm，意味着分支状态检查通过
        // 发起了事务提交指令，free表的数据就没有意义了，直接删除即可
        // 1. 获取事务id
        String xid = context.getXid();
        // 2. 根据id删除冻结记录
        int count = freezeMapper.deleteById(xid);
        return count == 1;
    }

    @Override
    public boolean cancel(BusinessActionContext context) {
        String xid = context.getXid();
        // 0. 查询冻结记录，可以走数据库，也可以走上下文
        AccountFreeze freeze = freezeMapper.selectById(xid);
        String userId = context.getActionContext("userId").toString();
        // 1. 空回滚判断，判断freeze是否为null，为null证明try没执行，需要空回滚
        if (freeze == null) {
            // 证明try没执行，需要空回滚，记录一下这个回滚的信息
            freeze = new AccountFreeze();
            freeze.setUserId(userId);
            freeze.setFreezeMoney(0);
            freeze.setState(AccountFreeze.State.CANCEL);
            freeze.setXid(xid);
            freezeMapper.insert(freeze);
            return true;
        }
        // 2. 幂等判断，只要cancel执行了，这个状态一定是CANCEL
        // 所以判断这个值就可以知道是否幂等，防止上一轮cancel超时后重复执行cancel
        if (freeze.getState() == AccountFreeze.State.CANCEL) {
            // 已经处理过一次CANCEL了，无需重复处理
            return true;
        }
        // 1. 恢复可用余额
        accountMapper.refund(freeze.getUserId(), freeze.getFreezeMoney());
        // 2. 将冻结金额清零，状态改为CANCEL
        freeze.setFreezeMoney(0);
        freeze.setState(AccountFreeze.State.CANCEL);
        int count = freezeMapper.updateById(freeze);
        return count == 1;
    }
}
```
