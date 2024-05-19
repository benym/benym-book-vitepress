---
title: COLA-statemachine事务失效踩坑
categories: 
  - Java
  - 设计模式
  - 状态模式
  - 状态机
tags: 
  - COLA
  - 状态机
  - StateMachine
  - 事务
  - Spring
  - Transactional
  - AOP
  - 自调用
  - 设计模式
author: 
  name: benym
  link: https://github.com/benym
date: 2023-05-15 22:27:26
permalink: /pages/ac5f01/
---

## 背景

`cola-statemachine`是阿里开源项目[`COLA`](https://github.com/alibaba/COLA)中的轻量级状态机组件。最大的特点是无状态、采用纯`Java`实现，用`Fluent Interface`(连贯接口)定义状态和事件，可用于管理状态转换场景。比如：订单状态、支付状态等简单有限状态场景。在实际使用的过程中我曾发现状态机内事务不生效的问题，经过排查得到解决，以此记录一下。

## 问题场景

一个简单的基于`cola`的状态机可能如下

- 创建状态机

```java
public StateMachine<State, Event, Context> stateMachine() {
    StateMachineBuilder<State, Event, Context> builder = StateMachineBuilderFactory.create();
    builder.externalTransition().from(State.TEST).to(State.DEPLOY)
            .on(Event.PASS)
            .when(passCondition())
            .perform(passAction());
    return builder.build("testMachine");
}
```

上述代码翻译过来是

从`State.TEST`状态转化到`State.DEPLOY`状态，在`Event.PASS`事件下，当满足`passCondition()`条件时，执行`passAction()`内的逻辑

- 执行状态机

```java
/**
 * 根据当前状态、事件、上下文，进行状态流转
 *
 * @param State 当前状态
 * @param Event 当前事件
 * @param Context 当前上下文
 */
public void fire(State state, Event event, Context context) {
    StateMachine<State, Event, Context> stateMachine = StateMachineFactory.get("testMachine");
    stateMachine.fireEvent(state, event, context);
}
```

上述代码在纯`Java`环境可以很好的运行，一般来说，开发者会进一步结合`Spring`来完善多个状态机的获取

过程中通常会将状态机进行`@Bean`注入，将`passCondition()`和`passAction()`独立出`Service`以期望在后续操作中更好的利用`Spring`的特性

简单改造后的状态机代码可能如下

```java {1,4-5,7-8,10,15-16}
@Component
public class StateMachine {

    @Autowired
    private ConditionService conditionService;

    @Autowired
    private ActionService actionService;

    @Bean
    public StateMachine<State, Event, Context> stateMachine() {
        StateMachineBuilder<State, Event, Context> builder = StateMachineBuilderFactory.create();
        builder.externalTransition().from(State.TEST).to(State.DEPLOY)
                .on(Event.PASS)
                .when(conditionService.passCondition())
                .perform(actionService.passAction());
        return builder.build("testMachine");
    }
}
```

假设`ConditionService`的实现为

当上下文不为空就满足条件，为空则不满足条件

```java
@Service
public class ConditionServiceImpl implements ConditionService {

    /**
     * 通过条件
     *
     * @return Condition
     */
    @Override
    public Condition<Context> passCondition() {
        return context -> {
            if (context!=null) {
                return true;
            }
            return false;
        };
    }
```

假设`ActionService`的实现为

更新金额，同时更新状态，之后推送通知事件进行后续异步操作

```java
@Service
public class ActionServiceImpl implements ActionService {
    
    @Autowired
    private PriceManager priceManager;
    
    @Autowired
    private StatusManager statusManager;
    
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    /**
     * 通过执行动作
     *
     * @return Action
     */
    @Override
    public Action<State, Event, Context> passAction() {
        return (from, to, event, context) -> {
            priceManager.updatePrice(context.getPrice());
            statusManager.updateStatus(to.getCode());
            NoticeEvent noticeEvent = context.toNoticeEvent();
            applicationEventPublisher.publishEvent(noticeEvent);
        };
    }
}
```

`NoticeListener`监听者

假设这里只是记录操作日志

```java
@Component
public class NoticeListener {

    @Autowired
    private LogManager logManager;

    @Async(value = "EventExecutor")
    @EventListener(classes = NoticeEvent.class)
    @Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRES_NEW)
    public void noticeEventAction(NoticeEvent noticeEvent) {
        logManager.log(noticeEvent);
    }
}
```

上述代码正常运行时没有问题，但这时候有的同学就会想到，想要金额和状态的更新具有一致性，不能更新了金额之后更新状态失败了。

想要保证两个操作的一致性，最简单的方式就是加上`@Transactional`注解，使得两个操作要么一起成功，要么一起失败

于是`ActionService`的代码在改动后可能是这样的

```java {16}
@Service
public class ActionServiceImpl implements ActionService {
    
    @Autowired
    private PriceManager priceManager;
    
    @Autowired
    private StatusManager statusManager;

    /**
     * 通过执行动作
     *
     * @return Action
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Action<State, Event, Context> passAction() {
        return (from, to, event, context) -> {
            priceManager.updatePrice(context.getPrice());
            statusManager.updateStatus(to.getCode());
            NoticeEvent noticeEvent = context.toNoticeEvent();
            applicationEventPublisher.publishEvent(noticeEvent);
        };
    }
}
```

对应的`NoticeListener`改为`@TransactionalEventListener`，以适应在上文事务提交后再执行

```java {8}
@Component
public class NoticeListener {

    @Autowired
    private LogManager logManager;

    @Async(value = "EventExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, classes = NoticeEvent.class)
    @Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRES_NEW)
    public void noticeEventAction(NoticeEvent noticeEvent) {
        logManager.log(noticeEvent);
    }
}
```

**修改完成后在单测中发现了2个现象**

1. **如果其中一个更新失败了，另外一个并没有回滚**
2. **如果两个都没有更新失败，`NoticeListener`并没有成功监听到事件**

在确认`ActionService`和`NoticeListener`无配置遗漏的地方，无典型事务失效场景，搜索半天`@TransactionalEventListener`监听不起作用的原因无果后，我又仔细检查了`StateMachine`类中`when`和`perform`的调用，也都是通过`@Autowired`的类进行调用的，没有产生`AOP`的自调用问题。代码改造后看起来很正常，按理来说不应该出现这个问题。

在百思不得其解的时候，我发现本地的日志输出稍微和平时有些不一样，在执行上述`Action`逻辑时，没有`mybatis-plus`的事务相关日志。于是想到可能`@Transactional`根本没有切到`Action`方法。

再仔细扫了眼`Action`逻辑可以看出写法是采用的匿名方法形式

```java {4-7}
@Override
@Transactional(rollbackFor = Exception.class)
public Action<State, Event, Context> passAction() {
    return (from, to, event, context) -> {
        priceManager.updatePrice(context.getPrice());
        statusManager.updateStatus(to.getCode());
    };
}
```

实际上非匿名方法写法等价于

```java
@Override
@Transactional(rollbackFor = Exception.class)
public Action<State, Event, Context> passAction() {
    Action<State, Event, Context> action = new Action<>() {
        @Override
        public void execute(State from, State to, Event event, Context context) {
			priceManager.updatePrice(context.getPrice());
        	statusManager.updateStatus(to.getCode());
        }
    }
    return action;
}
```

可以看到匿名方法实际为`execute`

我在状态机的使用过程中并没有直接调用该方法，所以只能是由框架内部调用的。

## 问题剖析

重新回到状态机开始执行的地方

```java {3}
public void fire(State state, Event event, Context context) {
    StateMachine<State, Event, Context> stateMachine = StateMachineFactory.get("testMachine");
    stateMachine.fireEvent(state, event, context);
}
```

跟进去`fireEvent`方法，可以看到第`36`行判断当前的状态、时间、上下文是否能够转移，如果能够进行转移则进入到第`43`行

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-1.png)

:::

之后便是校验的逻辑，当我们的action不为空的时候，便执行`91`行的`action.execute()`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-2.png)

:::

这时候我们可以看到此时的`action`实际上就是`ActionSeriveImpl`，而真正的`execute`实现也在`ActionSeriveImpl`中，于是**产生了`AOP`自调用问题，由于无法获取到代理对象事务切面自然就不会生效了**

这里的`action`变量则是由状态机定义时所赋值的，点击`setAction`方法，全局只有`2`个地方使用到了，一个在批量的状态流转的实现类中，一个在单个的状态流转的实现类中

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-3.png)

:::

批量流转

```java
@Override
public void perform(Action<S, E, C> action) {
    for(Transition transition : transitions){
        transition.setAction(action);
    }
}
```

单个流转

```java
@Override
public void perform(Action<S, E, C> action) {
    transition.setAction(action);
}
```

代码很简单，注意函数签名都为`perform`，这就是状态机定义时的连贯接口

```java {7}
@Bean
public StateMachine<State, Event, Context> stateMachine() {
    StateMachineBuilder<State, Event, Context> builder = StateMachineBuilderFactory.create();
    builder.externalTransition().from(State.TEST).to(State.DEPLOY)
        .on(Event.PASS)
        .when(conditionService.passCondition())
        .perform(actionService.passAction());
    return builder.build("testMachine");
}
```

在这里`actionService.passAction()`看上去是一次`service`调用，实际上并没有实际调用`execute`方法

`passAction`的接口定义为`Action<State, Event, Context>`，这里仅仅是将定义好的`action`函数通过`perform`接口赋值到状态机内部而已。真正的执行，需要在`fireEvent`之后。

## 解决方法

在了解了问题所在之后，便是想办法进行解决。

通常来说一个`AOP`自调用的解决方法可以为如下2点

1. 在自调用类中注入自己(仅限低版本`Springboot`，在高版本中会有循环依赖检测)
2. 采用`AopContext.currentProxy()`获取当前类的代理对象，用代理对象进行自身方法的调用

很可惜，两种方法在当前场景都不适用，因为自调用在`COLA`框架内部，如果为了解决这个问题去再包装框架就有点大动干戈了。

既然没有声明式事务，直接采用编程式事务就好了

改进后的`Action`代码如下

```java {10-11,21-22,27-30}
@Service
public class ActionServiceImpl implements ActionService {
    
    @Autowired
    private PriceManager priceManager;
    
    @Autowired
    private StatusManager statusManager;
    
    @Autowired
    private DataSourceTransactionManager dataSourceManager;

    /**
     * 通过执行动作
     *
     * @return Action
     */
    @Override
    public Action<State, Event, Context> passAction() {
        return (from, to, event, context) -> {
            TransactionStatus begin = dataSourceManager.getTransaction(new DefaultTransactionAttribute());
            try {
                priceManager.updatePrice(context.getPrice());
                statusManager.updateStatus(to.getCode());
                NoticeEvent noticeEvent = context.toNoticeEvent();
                applicationEventPublisher.publishEvent(noticeEvent);
                dataSourceManager.commit(begin);
            } catch (Exception e) {
                dataSourceManager.rollback(begin);
            }
        };
    }
}
```

需要注意的是，`applicationEventPublisher.publishEvent(noticeEvent);`需要放在`dataSourceManager.commit(begin);`前，这样`@TransactionalEventListener`才能正确监听到，如果放在`commit`之后，上文事务会做完提交和释放`SqlSession`的动作，后续的监听者无法监听一个已释放的事务。

对应的控制台日志为

```bash
Releasing transactional SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@295854a]
Transaction synchronization committing SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@295854a]
Transaction synchronization deregistering SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@295854a]
Transaction synchronization closing SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@295854a]
```

## 总结

有的时候`Spring`代码写多了，看起来代码和平时没区别，实际上在特殊场景还是会踩坑，当事务和其他框架结合时一定要注意潜在的事务问题，做好单元测试。



