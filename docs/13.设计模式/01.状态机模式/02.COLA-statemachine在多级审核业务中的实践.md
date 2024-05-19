---
title: COLA-statemachine在多级审核业务中的实践
categories: 
  - Java
  - 设计模式
  - 状态模式
  - 状态机
tags: 
  - COLA
  - 状态机
  - StateMachine
  - 设计模式
author: 
  name: benym
  link: https://github.com/benym
date: 2023-08-25 13:39:59
permalink: /pages/2ae430/
---

## 背景

在实际的项目开发中，开发者经常会遇见类似多级审核之类的开发需求，比如某个文件审核，需要经过`申请->直系领导审核->总经理审核`等多个步骤。如果是一次动作触发整个审核过程，开发者可能会想到使用`责任链模式`来进行开发。但如果多级审核的间隔时间长，审核触发的条件不一样，责任链模式会不太能够解耦这项需求。如果采用平铺直叙式开发，无疑会将审核状态转移过程散落在系统间各个位置，前后两个状态之间的关系没有直观进行维护，同时状态转移时的条件、执行的方式和状态之间的逻辑关系很容易让开发者写出“面条代码”。在项目开发初期可能还好，随着需求的增量变化，**平铺直叙式开发将使得状态转移逻辑和业务逻辑高度混合，且每增加一级节点审核，就要新增对应的审核状态及状态转移的逻辑**，长此以往变得难以阅读和维护。所以，在这种情况下使用`状态机`这样建模方式就显得尤为必要。

## 状态机概述

在计算机领域谈及状态机一般有`有限状态机(FSM finite state machine)`和`无限状态机(ISM Infinite state machine)`，由于无限状态机只是理论存在，所以应用中均使用有限状态机。

有限状态机是一种抽象的计算模型，其核心思想在于系统在不同状态下对于输入会产生不同的响应，并且可以根据输入和当前状态转移到新的状态。

状态机通常由`状态(State)`、`事件(Event)`、`动作(Action)`三个基本元素构成。其中动作不是必须的，可以只根据事件进行状态转移。

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-base.png)
:::

对于开发者视角的状态机通常还会增加`转移条件(Condtion)`的概念，此时状态机模型变更为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-base-condition.png)

:::

其中转移条件也是可选的。

## 状态机选型

对于开源状态机框架的选型和多种实现方式不是本文讨论的重点，详情可查看[状态机引擎在vivo营销自动化中的深度实践](https://mp.weixin.qq.com/s/CHFyXQoYBaTJlfonTyhxhw)。

引用文章中的一张图概况开源状态机框架现状

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-compare.png)

:::

本文选用的为`COLA-Statemachine`

## 基本实现

本文涉及的`MVP`代码地址[github](https://github.com/benym/statemachine-usage)

以小朋友要出去玩需要经过爸爸同意、妈妈同意这样的场景为例。

### 实体建模

`状态(State)`可以建模为

- 已申请、爸爸同意、妈妈同意、爸爸不同意、妈妈不同意、已完成

`事件(Event)`可以建模为

- 同意、不同意、已完成

状态转译成代码可以用枚举类表示

```java
public enum AuditState {

    /**
     * 已申请
     */
    APPLY("APPLY", "已申请"),
    /**
     * 爸爸同意
     */
    DAD_PASS("DAD_PASS", "爸爸同意"),
    /**
     * 妈妈同意
     */
    MOM_PASS("MOM_PASS", "妈妈同意"),
    /**
     * 爸爸不同意
     */
    DAD_REJ("DAD_REJ", "爸爸不同意"),
    /**
     * 妈妈不同意
     */
    MOM_REJ("MOM_REJ", "妈妈不同意"),
    /**
     * 已完成
     */
    DONE("DONE", "已完成");

    private static final Map<String, AuditState> CODE_MAP = new ConcurrentHashMap<>();

    static {
        for (AuditState auditState : EnumSet.allOf(AuditState.class)) {
            CODE_MAP.put(auditState.getCode(), auditState);
        }
    }

    public static AuditState getEnumsByCode(String code) {
        return CODE_MAP.get(code);
    }

    /**
     * code
     */
    private String code;

    /**
     * desc
     */
    private String desc;

    AuditState(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
    // 省略get/set
}
```

事件转译成代码为

```java
public enum AuditEvent {

    /**
     * 同意
     */
    PASS(0,"同意"),

    /**
     * 不同意
     */
    REJECT(1,"不同意"),

    /**
     * 已完成
     */
    DONE(2,"已完成");

    /**
     * code
     */
    private Integer code;

    /**
     * desc
     */
    private String desc;

    private static final Map<Integer, AuditEvent> CODE_MAP = new ConcurrentHashMap<>();

    static {
        for (AuditEvent auditEvent : EnumSet.allOf(AuditEvent.class)) {
            CODE_MAP.put(auditEvent.getCode(), auditEvent);
        }
    }

    public static AuditEvent getEnumsByCode(Integer code) {
        return CODE_MAP.get(code);
    }

    AuditEvent(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }
    // 省略get/set
}
```

在使用`COLA`状态机时，还要求开发者传递`Context`参数，可用于后续的`Condition`和`Action`等，根据我们的场景，只需要知道该`审核单的id`和当前接口`审核的事件AuditEvent`即可，所以`Context`可以建模为

```java
@Data
public class AuditContext {

    /**
     * id
     */
    private Long id;

    /**
     * 事件
     */
    private Integer auditEvent;
}
```

### Spring体系下的可扩展状态机

完成实体建模后就是状态机的构建了，通常来说我们应该结合`SpringBoot`体系达成系统内多个状态机的自动识别和自动获取。

#### 构建状态机

建立一个基本的策略接口

```java
public interface StateMachineStrategy {

    String getMachineType();
}
```

状态机枚举

```java
public enum StateMachineEnum {

    /**
     * 测试状态机
     */
    TEST_MACHINE("testMachine","测试状态机");

    /**
     * code
     */
    private String code;

    /**
     * desc
     */
    private String desc;

    StateMachineEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }
}

```

状态机实现

```java
@Component
public class AuditMachine implements StateMachineStrategy {

    @Autowired
    private ConditionService conditionService;

    @Autowired
    private ActionService actionService;

    @Override
    public String getMachineType() {
        return StateMachineEnum.TEST_MACHINE.getCode();
    }

    /**
     * | From(开始状态) | To(抵达状态) | Event(事件) | When(条件)            | Perform(执行动作)  |
     * | -------------- | ------------ | ----------- | --------------------- | ------------------ |
     * | 已申请      | 爸爸同意 | 审核通过    | passOrRejectCondition | passOrRejectAction |
     * | 爸爸同意    | 妈妈同意 | 审核通过    | passOrRejectCondition | passOrRejectAction |
     * | 已申请     | 爸爸不同意 | 审核驳回    | passOrRejectCondition | passOrRejectAction |
     * | 爸爸同意   | 妈妈不同意 | 审核驳回    | passOrRejectCondition | passOrRejectAction |
     * | 已申请    | 已完成状态    | 已完成        | doneCondition        | doneAction        |
     * | 爸爸同意  | 已完成状态    | 已完成        | doneCondition        | doneAction        |
     * | 妈妈同意  | 已完成状态    | 已完成        | doneCondition        | doneAction        |
     *
     * @return StateMachine stateMachine
     */
    @Bean
    public StateMachine<AuditState, AuditEvent, AuditContext> stateMachine() {
        StateMachineBuilder<AuditState, AuditEvent, AuditContext> builder = StateMachineBuilderFactory.create();
        // 已申请->爸爸同意
        builder.externalTransition().from(AuditState.APPLY).to(AuditState.DAD_PASS)
                .on(AuditEvent.PASS)
                .when(conditionService.passOrRejectCondition())
                .perform(actionService.passOrRejectAction());
        // 已申请->爸爸不同意
        builder.externalTransition().from(AuditState.APPLY).to(AuditState.DAD_REJ)
                .on(AuditEvent.REJECT)
                .when(conditionService.passOrRejectCondition())
                .perform(actionService.passOrRejectAction());
        // 爸爸同意->妈妈同意
        builder.externalTransition().from(AuditState.DAD_PASS).to(AuditState.MOM_PASS)
                .on(AuditEvent.PASS)
                .when(conditionService.passOrRejectCondition())
                .perform(actionService.passOrRejectAction());
        // 爸爸同意->妈妈不同意
        builder.externalTransition().from(AuditState.DAD_PASS).to(AuditState.MOM_REJ)
                .on(AuditEvent.REJECT)
                .when(conditionService.passOrRejectCondition())
                .perform(actionService.passOrRejectAction());
        // 已申请->已完成
        // 爸爸同意->已完成
        // 妈妈同意->已完成
        builder.externalTransitions().fromAmong(AuditState.APPLY, AuditState.DAD_PASS, AuditState.MOM_PASS)
                .to(AuditState.DONE)
                .on(AuditEvent.DONE)
                .when(conditionService.doneCondition())
                .perform(actionService.doneAction());
        return builder.build(getMachineType());
    }
}
```

从实现类可见`状态、事件、条件、动作`，在代码中是非常清晰的，且维护在一个类中。

此时的状态机`DSL`图如下(通过接口获取)

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-uml.png)

:::

状态机引擎类

```java
@Component
public class StateMachineEngine implements InitializingBean {
    
    private Map<String, StateMachineStrategy> stateMachineMap;
    
    @Autowired
    private ApplicationContext applicationContext;

    /**
     * 根据枚举获取状态机实例key
     * 
     * @param stateMachineEnum stateMachineEnum
     * @return String
     */
    private String getMachine(StateMachineEnum stateMachineEnum) {
        return stateMachineMap.get(stateMachineEnum.getCode()).getMachineType();
    }

    /**
     * 根据枚举获取状态机示例，并根据当前状态、事件、上下文，进行状态流转
     *
     * @param stateMachineEnum stateMachineEnum
     * @param auditState auditState
     * @param auditEvent auditEvent
     * @param auditContext auditContext
     * @return AuditState
     */
    public AuditState fire(StateMachineEnum stateMachineEnum, AuditState auditState,
                           AuditEvent auditEvent, AuditContext auditContext) {
        StateMachine<AuditState, AuditEvent, AuditContext> stateMachine = StateMachineFactory.get(getMachine(stateMachineEnum));
        return stateMachine.fireEvent(auditState, auditEvent, auditContext);
    }

    /**
     * 根据枚举获取状态机示例的状态DSL UML图
     *
     * @param stateMachineEnum stateMachineEnum
     * @return String
     */
    public String generateUml(StateMachineEnum stateMachineEnum){
        StateMachine<AuditState, AuditEvent, AuditContext> stateMachine = StateMachineFactory.get(getMachine(stateMachineEnum));
        return stateMachine.generatePlantUML();
    }

    /**
     * 获取所有实现了接口的状态机
     */
    @Override
    public void afterPropertiesSet() {
        Map<String, StateMachineStrategy> beansOfType = applicationContext.getBeansOfType(StateMachineStrategy.class);
        stateMachineMap = Optional.of(beansOfType)
                .map(beansOfTypeMap -> beansOfTypeMap.values().stream()
                        .filter(stateMachineHandler -> StringUtils.hasLength(stateMachineHandler.getMachineType()))
                        .collect(Collectors.toMap(StateMachineStrategy::getMachineType, Function.identity())))
                .orElse(new HashMap<>(8));
    }
}
```

其中上文内的`ConditionService`和`ActionService`分别表示转移条件的`Service`服务和动作的`Service`服务

在`COLA`中定义了`Condtion`和`Action`接口

本文的`Condition`实现为

```java
public interface ConditionService {

    /**
     * 通用通过/驳回条件
     * 覆盖审核正向流程，以及驳回流程
     * 已申请->爸爸同意->妈妈统一
     * 已申请->爸爸不同意
     * 爸爸同意->妈妈不同意
     *
     * @return Condition
     */
    Condition<AuditContext> passOrRejectCondition();

    /**
     * 已完成条件
     *
     * @return Condition
     */
    Condition<AuditContext> doneCondition();
}
```

```java
@Component
public class ConditionServiceImpl implements ConditionService {
    @Override
    public Condition<AuditContext> passOrRejectCondition() {
        return context -> {
            System.out.println(1);
            return true;
        };
    }

    @Override
    public Condition<AuditContext> doneCondition() {
        return context -> {
            System.out.println(1);
            return true;
        };
    }
}
```

这里简单起见并没有在`Condition`上做特殊条件判断，如果需要拦截返回`false`便不会执行后续`Action`

本文的`Action`实现为

```java
public interface ActionService {

    /**
     * 通用审核通过/驳回执行动作
     * 覆盖审核正向流程，以及驳回流程
     * 已申请->爸爸同意->妈妈同意
     * 已申请->爸爸不同意
     * 爸爸同意->妈妈不同意
     *
     * @return Action
     */
    Action<AuditState, AuditEvent, AuditContext> passOrRejectAction();

    /**
     * 已完成执行动作
     *
     * @return Action
     */
    Action<AuditState, AuditEvent, AuditContext> doneAction();
}
```

```java
@Component
public class ActionServiceImpl implements ActionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ActionServiceImpl.class);

    @Autowired
    private AuditDao auditDao;

    @Override
    public Action<AuditState, AuditEvent, AuditContext> passOrRejectAction() {
        return (from, to, event, context) -> {
            LOGGER.info("passOrRejectAction from {}, to {}, on event {}, id:{}", from, to, event, context.getId());
            auditDao.updateAuditStatus(to.getCode(), context.getId());
        };
    }

    @Override
    public Action<AuditState, AuditEvent, AuditContext> doneAction() {
        return (from, to, event, context) -> {
            LOGGER.info("doneAction from {}, to {}, on event {}, id:{}", from, to, event, context.getId());
            auditDao.updateAuditStatus(to.getCode(), context.getId());
        };
    }
}
```

上述代码均采用匿名函数的写法，其实等价于

```java
@Override
public Action<AuditState, AuditEvent, AuditContext> passOrRejectAction() {
    Action<AuditState, AuditEvent, AuditContext> action = new Action<AuditState, AuditEvent, AuditContext>() {
        @Override
        public void execute(AuditState from, AuditState to, AuditEvent event, AuditContext context) {

        }
    };
    return action;
}
```

在`Action`中只是进行根据`id`更新状态，这一操作

#### Controller层

```java
@RestController
@RequestMapping("/test")
@Slf4j
public class TestController {

    @Autowired
    private AuditService auditService;

    @PostMapping("/audit")
    public void audit(@RequestBody @Validated AuditParam auditParam){
        AuditContext auditContext = new AuditContext();
        BeanUtils.copyProperties(auditParam, auditContext);
        auditService.audit(auditContext);
    }

    @GetMapping("/uml")
    public String uml(){
        return auditService.uml();
    }
}
```

提供2个接口，一个接口用于触发多级审核状态机，一个接口用于获取状态机内置的UML图

其中`AuditParam`为

```java
@Data
public class AuditParam {

    /**
     * id
     */
    private Long id;

    /**
     * 事件
     */
    private Integer auditEvent;
}
```

#### Service层

```java
@Service
@Slf4j
public class AuditServiceImpl implements AuditService {

    @Autowired
    private AuditDao auditDao;

    @Autowired
    private StateMachineEngine stateMachineEngine;

    @Override
    public void audit(AuditContext auditContext) {
        Long id = auditContext.getId();
        AuditDTO auditDTO = auditDao.selectById(id);
        String auditState = auditDTO.getAuditState();
        Integer auditEvent = auditContext.getAuditEvent();
        // 获取当前状态和事件
        AuditState nowState = AuditState.getEnumsByCode(auditState);
        AuditEvent nowEvent = AuditEvent.getEnumsByCode(auditEvent);
        // 执行状态机
        stateMachineEngine.fire(StateMachineEnum.TEST_MACHINE, nowState, nowEvent, auditContext);
    }

    @Override
    public String uml() {
        return stateMachineEngine.generateUml(StateMachineEnum.TEST_MACHINE);
    }
}
```

`Service`层首先根据`id`查询该审核单在数据库中的状态，通过当前状态和事件获取状态机需要的`State`和`Event`，同时构建`Context`，通过前面构造的状态机引擎执行`fire`方法进行状态转化。

### 请求模拟

数据库中初始有一条已申请数据，`id`为`1`，`状态`为`APPLY`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-database.png)

:::

当`Postman`发如下请求时，代表对于`id`为`1`的数据，进行一次审核，且审核事件为`0(同意)`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-postman.png)

:::

此时控制台打印为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-log.png)

:::

表示正常执行`Action`

数据库状态变更为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/design-pattern/statemachine-database-2.png)

:::

### Q/A

::: tip

Q: 当状态机内没有定义某个状态转移时，比如此时数据库状态为DONE，请求带上审核事件为同意的参数进来，状态机会发生什么?

:::

::: note

A: 由状态机框架内部处理，此时状态机什么都不会发生，也不会抛出异常

:::

::: tip

Q: 在状态机的Action和Condition方法上加AOP注解有效吗

:::

::: note

A: 无效，Action和Condition由框架内部直接调用，框架并未交给Spring管理，所以无法产生代理对象执行增强。具体经验可查看[COLA-statemachine事务失效踩坑](https://cloud.benym.cn/pages/ac5f01/)

:::

