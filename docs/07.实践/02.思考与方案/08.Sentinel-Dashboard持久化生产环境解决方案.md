---
title: Sentinel-Dashboard持久化生产环境解决方案
categories: 
  - Java
  - 思考与方案
  - 平台
tags: 
  - Sentinel
  - Dashboard
  - 规则持久化
  - 降级
  - 限流
  - 熔断
author: 
  name: benym
  link: https://github.com/benym
date: 2023-07-05 16:30:06
permalink: /pages/12a5d6/
---

## 背景

`Sentinel`作为目前市面上常用的限流/降级/熔断平台，已经在诸多高并发项目上进行应用。通常来说一个微服务架构下的项目，流量控制、熔断降级等系统保护功能是必备的。由于现在公司都流行采用开源和商业化双线进行，`Sentinel-DashBoard`开源版本并不是一个生产环境拿来就能用的产品。

其主要的问题在于

- 开源版本`Sentinel-Dashboard`上面的一切操作都是基于内存的，开发者配置的所有策略在客户端应用重启后都将丢失。
- 同时由于内存版本是针对某个`ip+app`进行的参数设置，在`k8s`环境下，应用重启后`ip`会产生变化，导致策略失效，这些情况是完全无法接受的

`Sentinel`开源版本给出了`Sentinel-datasource`、流控规则持久化`demo`代码等等，他的完全体[MSE Sentinel 控制台](https://github.com/alibaba/Sentinel/wiki/AHAS-Sentinel-%E6%8E%A7%E5%88%B6%E5%8F%B0)拿来在云上作为企业版面向客户了

所以想要在生产环境使用`Sentinel-Dashboard`，规则持久化是必备的一步。**现有的网络教程绝大多数只会教你改后端代码，在本文中你能够找到完整的Sentinel-Dashboard前后端是如何进行改造的，流控和熔断降级规则是怎么持久化的，簇点链路应该怎么和持久化操作一致**。

## 规则持久化

根据[官方推荐的改造步骤](https://github.com/alibaba/Sentinel/wiki/%E5%9C%A8%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E4%B8%AD%E4%BD%BF%E7%94%A8-Sentinel)，我们能够大概有个初步了解，选用推荐的`Push`模式，而不是`Pull`和基于内存的原始模式

本文的教程基于`Zookeeper`进行持久化

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-1.png/zipstyle)

:::

从图中可以看出来`Sentinel Dashboard`推送配置到配置中心，之后配置中心通知各个接入`Sentinel`的客户端(由`sentinel-datasource`实现监听)，完成动态配置的功能

由于`Sentinel Dashboard`和接入`Sentinel`客户端的应用没有直接关系，所以无论`Sentinel Dashboard`应用是否存活，你的流控熔断降级规则都能够生效(只要客户端和配置中心的通信正常)

因为当一个请求到达客户端应用时，客户端只与内存中持久化的规则进行交互，而持久化的规则是在应用初始化时从配置中心获取的

### 步骤1: 从github拉取Sentinel源码

从`github`对应的[release](https://github.com/alibaba/Sentinel/releases)页面下载

本文使用的是`Sentinel1.8.5`，从页面中下载对应的源码

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-2.png/zipstyle)

:::

解压源码并用`idea`打开

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-3.png/zipstyle)

:::

由于源码每个都是一个`jar`包，为了适配`DockerFile`的打包方式(根据公司内不同`CICD`规则进行选择)，我们单独将`sentinel-dashboard`模块抽离出来，他本身是一个`SpringBoot`项目

### 步骤2: 接入必备依赖

在`sentinel-dashboard`的`pom`文件中增加必备的依赖

```java
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    <version>${spring.cloud.alibaba.version}</version>
</dependency>
```

其中`spring.cloud.alibaba.version`和`sentinel1.8.5`适配，为`2021.0.4.0`

将官方提供的`zk`依赖`scope test`移除，使得`zk`客户端生效

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-4.png/zipstyle)

:::

同时需要移除`curator`自带的`zk`版本与公司内的`zk`客户端版本适配(本文选用的是`3.4.6`，是目前`zk`硬件条件所适配的软件版本)

完整依赖如下

```xml
<!--for Zookeeper rule publisher sample-->
<dependency>
    <groupId>org.apache.curator</groupId>
    <artifactId>curator-recipes</artifactId>
    <version>${curator.version}</version>
    <exclusions>
        <exclusion>
            <groupId>org.apache.zookeeper</groupId>
            <artifactId>zookeeper</artifactId>
        </exclusion>
    </exclusions>
</dependency>
 
<dependency>
    <groupId>org.apache.zookeeper</groupId>
    <artifactId>zookeeper</artifactId>
    <version>3.4.6</version>
    <exclusions>
        <exclusion>
            <groupId>log4j</groupId>
            <artifactId>log4j</artifactId>
        </exclusion>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-log4j12</artifactId>
        </exclusion>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

同时你需要升级`sentinel-dashboard`本身的`SpringBoot`版本与`SpringCloud`兼容

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-5.png/zipstyle)

:::

然后在`application.properties`中关闭版本兼容性检查

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-6.png/zipstyle)

:::

### 步骤3: 整合注册中心代码

在`sentinel-dashboard`的`test`目录中，官方提供了`apollo/nacos/zookeeper`3种注册中心的**对于流控规则的必备改造代码**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-7.png/zipstyle)

:::

我们的注册中心是`zk`，所以我们将`zk`相关的代码拷贝到项目中`main`目录下`rule`的位置

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-8.png/zipstyle)

:::

这里的`DegradeRuleZookeeperProvider`和`DegradeRuleZookeeperPublisher`是熔断规则持久化的必备代码，官方没有提供，后续本文将会提到

### 步骤4: 更改FlowControllerV2

`com.alibaba.csp.sentinel.dashboard.controller.v2.FlowControllerV2`是官方预留的流控规则持久化`Controller`入口

我们需要将默认的基于内存的`provider`和`publisher`注入进行更改

从`Default`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-9.png/zipstyle)

:::

改为`zk`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-10.png/zipstyle)

:::

这两个`Bean`即是步骤3中我们拷贝的代码

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-11.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-12.png/zipstyle)

:::

### 步骤5: 修改默认的zk地址

踩坑，[官方的改造教程](https://github.com/alibaba/Sentinel/wiki/Sentinel-%E6%8E%A7%E5%88%B6%E5%8F%B0%EF%BC%88%E9%9B%86%E7%BE%A4%E6%B5%81%E6%8E%A7%E7%AE%A1%E7%90%86%EF%BC%89#%E8%A7%84%E5%88%99%E9%85%8D%E7%BD%AE)以及网上的许多文章(大多数是本地启动一个`zk`)并没有告诉你要改这一步，我是启动后报错了才反应过来

需要从

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-13.png/zipstyle)

:::

改为配置注入

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-14.png/zipstyle)

:::

### 步骤6: 修改sidebar.html

路径为`src/main/webapp/resources/app/scripts/directives/sidebar/sidebar.html`

将原本的流控规则`dashboard.flowV1`调用改为`dashboard.flow`调用

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-15.png/zipstyle)

:::

### 步骤7: 查看改造效果

此时点击新增流控规则，规则就会持久化到zk中了，即使客户端应用重启，规则也不会丢失

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-16.png/zipstyle)

:::

同时，页面多了一个回到单机页面的按钮

而单机页面仍然是针对某个ip的机器，基于内存的，内存规则和持久化规则能够混合使用，但不推荐

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-17.png/zipstyle)

:::

### 客户端接入Sentinel

对于应用客户端，接入sentinel必备的pom如下

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
        <exclusions>
            <exclusion>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-logging</artifactId>
            </exclusion>
        </exclusions>
    </dependency>
    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-bootstrap</artifactId>
        <exclusions>
            <exclusion>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-commons</artifactId>
            </exclusion>
        </exclusions>
    </dependency>
    <dependency>
        <groupId>com.alibaba.csp</groupId>
        <artifactId>sentinel-datasource-zookeeper</artifactId>
        <exclusions>
            <exclusion>
                <artifactId>zookeeper</artifactId>
                <groupId>org.apache.zookeeper</groupId>
            </exclusion>
        </exclusions>
    </dependency>
    <dependency>
        <groupId>com.alibaba.csp</groupId>
        <artifactId>sentinel-apache-dubbo3-adapter</artifactId>
    </dependency>
</dependencies>
```

接入`Sentinel`的应用各个版本为

- `SpringBoot`：`2.7.10`
- `spring-boot-starter-actuator`：由`SpringBoot`版本控制
- `spring-cloud-starter-alibaba-sentinel`：`2021.0.4.0`
- `spring-cloud-starter-bootstrap`：`3.1.5`
- `sentinel-datasource-zookeeper`：`1.8.5`
- `sentinel-apache-dubbo3-adapter`：`1.8.6`（因为1.8.5有bug，官方在1.8.6修复）

配置中心接入

```xml
# 服务连接时则出现在控制台
spring.cloud.sentinel.eager=true
# dashboard地址
spring.cloud.sentinel.transport.port=8719
spring.cloud.sentinel.transport.dashboard=你的dashboard地址

# 持久化配置,数据源1 选用zookeeper,可配置多数据源,参考https://github.com/alibaba/spring-cloud-alibaba/wiki/Sentinel
# 数据类型
spring.cloud.sentinel.datasource.ds1.zk.data-type=json

# 存储path,在有dataId和groupId时可不使用,dataId和groupId方便后期平滑迁移nacos
# spring.cloud.sentinel.datasource.ds1.zk.path=/sentinel_rule_config/你的应用名

# 流控规则
# groupId固定sentinel_rule_config,因为dashboard固定值
spring.cloud.sentinel.datasource.ds1.zk.groupId=sentinel_rule_config
# dataId和spring.application.name保持一致
spring.cloud.sentinel.datasource.ds1.zk.dataId=你的应用名
# zk地址
spring.cloud.sentinel.datasource.ds1.zk.server-addr=你的zk地址
# 规则类型,参考com.alibaba.cloud.sentinel.datasource.RuleType
spring.cloud.sentinel.datasource.ds1.zk.rule-type=flow

# 熔断规则
# groupId固定sentinel_rule_config,因为dashboard固定值
spring.cloud.sentinel.datasource.ds2.zk.data-type=json
spring.cloud.sentinel.datasource.ds2.zk.groupId=sentinel_rule_config
# dataId和spring.application.name保持一致
spring.cloud.sentinel.datasource.ds2.zk.dataId=你的应用名
# zk地址
spring.cloud.sentinel.datasource.ds2.zk.server-addr=你的zk地址
# 规则类型,参考com.alibaba.cloud.sentinel.datasource.RuleType
spring.cloud.sentinel.datasource.ds2.zk.rule-type=degrade
```

**一个基本上的接入配置如上，这种配置直接去结合持久化改造有一定的问题，本文后文将会给出改造后的接入配置**

### 跟着官网教程改造后仍然存在的问题

1. 新增流控规则的确持久化了，但从簇点链路直接对资源进行流控，仍然是走的内存
2. 由于簇点链路中的接口新增规则后是内存处理，所以在簇点链路新增的规则要点击回到单机页面后才能看得到，而持久化的规则需要在流控规则页面点击才行

2个页面各管各的，使用起来不流畅，但其实有了持久化规则后，我们就不再需要内存页面了

## 完全Sentinel-Dashboard高阶改造

我们先暂时不管以上2个问题，因为他还关系到另外的坑点，我们先从熔断降级规则持久化开始继续改造

### 步骤8: 熔断降级规则持久化-后端改造

**官网的教程只交了如何让流控规则持久化，网上只有极少部分教程做了CV式的熔断降级规则的持久化**

依赖少部分教程+观察流控规则持久化代码，我们可以整理出必备改造方式

1. 在`src/main/java/com/alibaba/csp/sentinel/dashboard/rule/zookeeper`路径复制`FlowRuleZookeeperPublisher`和`FlowRuleZookeeperProvider`类，复制之后改名为`DegradeRuleZookeeperProvider`和`DegradeRuleZookeeperPublisher`
2. 修改对应的`Component`名称为`degradeRuleZookeeperProvider`和`degradeRuleZookeeperPublisher`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-18.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-19.png/zipstyle)

:::

3. 修改实现接口、`Converter`、`Provider`和`Publisher`中方法的泛型为熔断降级实体`DegradeRuleEntity`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-20.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-21.png/zipstyle)

:::

4. 在`ZookeeperConfig`中增加熔断降级`Converter`实现

`Converter`实现参考`flow`规则

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-22.png/zipstyle)

:::

5. 拷贝`DegradeController`并改名为`DegradeControllerV2`进行基础修改

更改`requestMapping`路径为`/v2/degrade`，更改`ruleProvider`和`rulePublisher`的`Bean`为`Degrade`对应的`Bean`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-23.png/zipstyle)

:::

6. 拷贝`FlowControllerV2`的`/rules`路由实现到`DegradeControllerV2`，并进行改造

拷贝`FlowControllerV2`中的

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-24.png/zipstyle)

:::

改造后的`DegradeControllerV2`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-25.png/zipstyle)

:::

这里的区别点在于`filter`规则，过滤掉那些不属于熔断降级规则的规则，通过`TimeWindow`判断

7. 参考`FlowControllerV2`改造`DegradeControllerV2`持久化方法

找到`DegradeControllerV2`中原始的`publishRules`方法

从内存操作

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-26.png/zipstyle)

:::

改造到`zk`操作

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-27.png/zipstyle)

:::

8. 参考`FlowControllerV2`改造`DegradeControllerV2`剩余路由方法，调用`publishRules`进行持久化

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-28.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-29.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-30.png/zipstyle)

:::

9. 删除无用的`rules.json`路由

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-31.png/zipstyle)

:::

到这里，熔断降级规则持久化-后端代码基础部分就改造完成了

### 步骤9: 熔断降级规则持久化-前端代码改造

**大家只是说熔断降级规则持久化和流控规则持久化类似**

**但完全没有提及官网的教程是直接把流控规则持久化的前端代码写好了的，而熔断降级规则的持久化前端代码是完全没有的**

**同时在直接CV式完成熔断规则持久化后，又出现了非常多的踩坑点，接下来的踩坑直接进入了无网络教程的区域，需要依靠前端知识+阅读sentinel-dashboard源码来完成**

首先我们回到`src/main/webapp/resources/app/scripts/directives/sidebar/sidebar.html`

找到熔断规则的`html`，他是调用的`dashboard.degrade`的`js`方法

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-32.png/zipstyle)

:::

中键跟踪`degrade`方法，发现有`2`个，一个在`scripts`一个在`dist`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-33.png/zipstyle)

:::

根据`nodejs`的知识，我们可以确定原始方法在`scripts`中，而`dist`是`nodejs`打包的无缩进全量`js`产物

进入`scripts/app.js`中查看对应方法

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-34.png/zipstyle)

:::

由于熔断降级规则前端代码没有`V2`的版本，所以我们需要新增`degrade_v2.html`，`degrade_v2.js`

**注意下文修改的文件均在`/scripts`目录下，非`dist`目录下同名方法**

按如下步骤

1. 拷贝`src/main/webapp/resources/app/views/degrade.html`到同级目录，改名为`degrade_v2.html`

`html`文件暂不需要修改

2. 拷贝`src/main/webapp/resources/app/scripts/controllers/degrade.js`到同级目录，改名为`degrade_v2.js`

浏览该`js`文件我们可以大概知道`degrade.js`用于动态生成弹框

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-35.png/zipstyle)

:::

在`degrade.js`中有一个入参叫`DegradeService`，跟踪进去发现，`DegradeService`内部写有`CRUD`操作真正调用的后端`Controller`路由路径

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-36.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-37.png/zipstyle)

:::

3. 修改`app.js`中原始`degrade`调用方法到`v2`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-38.png/zipstyle)

:::

这里给前端`controller`改了个名字叫`DegradeControllerV2`，并不是后端的`Controller`

4. 修改`degrade_v2.js`中`controller`名称

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-39.png/zipstyle)

:::

5. 进入`degrade_service.js`，全量修改`DegradeService`调用路由路径为`v2`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-40.png/zipstyle)

:::

这里调用`rules`而不是走内存的`rules.json`

6. `build`前端项目，生成构建产物，重新生成`dist`下的`app.js`

在上文中修改了前端代码并不能直接生效，因为前端调用的始终是`dist`目录下的`app.js`代码

此时有2种选择

- 重新打包前端项目


- 手动在没有缩进符的`dist/app.js`下进行上述的同样操作(不推荐)

从文件中我们可以看出，前端项目是`nodejs`项目，且基于`gulp`进行自动化打包

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-41.png/zipstyle)

:::

你的环境需要安装`gulp(3.9.1)`和`nodejs(v10.24.0)`版本，高版本将无法编译

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-42.png/zipstyle)

:::

`nvm`是`nodejs`的管理软件，需要通过安装包安装，对应[NVM链接](https://nvm.uihtm.com/)

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-43.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-44.png/zipstyle)

:::

在`package.json`同级目录输入

```xml
npm install --registry=https://registry.npm.taobao.org
```

安装必备依赖

安装完成之后点击`package.json`内的`build`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-45.png/zipstyle)

:::

`build`将执行总任务，生成必备的`dist`产物

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-46.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-47.png/zipstyle)

:::

到这里，熔断降级规则持久化-前端改造就已完成

### 步骤10: 流控和熔断降级规则在默认sentinel-dashboard配置下的覆盖冲突、多出列表数据

前面几个步骤完成了熔断降级规则持久化+流控规则持久化，但正当你觉得大功告成的时候

**在控制台新增`N`条流控规则后，再新增1条熔断规则，会发现流控规则全部没有了，只剩你新增的熔断规则**

**此时熔断规则覆盖了流控规则，这时候你可能怀疑是之前修改出的`bug`，但其实不是，配置隔离也是改造的必备点，只是官网没有提及**

**如果你改造`DegradeController`时漏掉了步骤8的第6步，那么还将会出现流控/熔断规则列表中同时出现流控和熔断规则**

根据`F12`查看`dashboard`调用的`api`，我们可以知道前端新增流控或熔断降级规则调用的路由路径均为`/v2/xxx/rule`

获取流控或熔断降级规则调用的路由路径均为`/v2/xxx/rules`

我们阅读`FlowControllerV2`和`DegradeControllerV2`的代码可以知道，最终存储`zk`的步骤由`FlowRuleZookeeperPublisher`和`DegradeRuleZookerPublisher`的`publish`方法提供

从`zk`获取规则的步骤由`FlowRuleZookeeperPublisher`和`DegradeRuleZookerPublisher`的`getRules`方法提供

其中`DegradeRuleZookerPublisher`代码是从`FlowRuleZookeeperPublisher`拷贝过来的，所以我们直接看`FlowRuleZookeeperPublisher`的代码即可

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-48.png/zipstyle)

:::

这段代码逻辑很简单，根据`app`名称获取`zk`的存储路径，如果没有就新建这个路径，之后把新增的`rule`转化为对应规则实体，存储到`zk`中

看到这里你应该能够反应过来，**`Flow`和`Degrade`存储的是同一个路径，而且`setData`是直接覆盖的，没有增量写的操作，这就是为什么会发生覆盖的原因**

**同时需要注意，上文代码中的`ZookeeperConfigUtil`中默认存储根路径为`/sentinel_rule_config`**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-49.png/zipstyle)

:::

我们的改造只需要隔离2个配置的存储路径即可

### 步骤11: 隔离流控和熔断降级规则持久化路径

1. 在`FlowRuleZookeeperPublisher`增加流控规则固定存储路径key，规则为：**默认根路径/app名称/flow_rule**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-50.png/zipstyle)

:::

2. 在`DegradeRuleZookerPublisher`增加熔断降级规则固定存储路径key，规则为：**默认根路径/app名称/degrade_rule**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-51.png/zipstyle)

:::

同理获取`zk`规则的路径也需要进行变更

3. 在`FlowRuleZookeeperProvider`增加流控规则固定存储路径`key`，保证列表查询接口和持久化接口获取数据路径一致

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-52.png/zipstyle)

:::

4. 在`DegradeRuleZookeeperProvider`增加熔断降级规则固定存储路径`key`，保证列表查询接口和持久化接口获取数据路径一致

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-53.png/zipstyle)

:::

5. 客户端应用配置修改

由于`Dashboard`推送持久化规则的位置发生变更，你的客户端配置也需要进行变更

因为接入`Sentinel`的应用，默认拉取`zk`的路径是是`groupId`+`dataId`，完整配置如下

```yaml
# 服务连接时则出现在控制台
spring.cloud.sentinel.eager=true
# dashboard地址
spring.cloud.sentinel.transport.port=8719
spring.cloud.sentinel.transport.dashboard=你的dashboard地址

# 持久化配置,数据源1 选用zookeeper,可配置多数据源,参考https://github.com/alibaba/spring-cloud-alibaba/wiki/Sentinel
# 数据类型
spring.cloud.sentinel.datasource.ds1.zk.data-type=json

# 存储path,在有dataId和groupId时可不使用,dataId和groupId方便后期平滑迁移nacos
# spring.cloud.sentinel.datasource.ds1.zk.path=/sentinel_rule_config/你的应用名

# 流控规则
# groupId固定sentinel_rule_config,因为dashboard固定值
spring.cloud.sentinel.datasource.ds1.zk.groupId=sentinel_rule_config
# dataId和spring.application.name保持一致
spring.cloud.sentinel.datasource.ds1.zk.dataId=你的应用名/flow_rule
# zk地址
spring.cloud.sentinel.datasource.ds1.zk.server-addr=你的zk地址
# 规则类型,参考com.alibaba.cloud.sentinel.datasource.RuleType
spring.cloud.sentinel.datasource.ds1.zk.rule-type=flow

# 熔断规则
# groupId固定sentinel_rule_config,因为dashboard固定值
spring.cloud.sentinel.datasource.ds2.zk.data-type=json
spring.cloud.sentinel.datasource.ds2.zk.groupId=sentinel_rule_config
# dataId和spring.application.name保持一致
spring.cloud.sentinel.datasource.ds2.zk.dataId=你的应用名/degrade_rule
# zk地址
spring.cloud.sentinel.datasource.ds2.zk.server-addr=你的zk地址
# 规则类型,参考com.alibaba.cloud.sentinel.datasource.RuleType
spring.cloud.sentinel.datasource.ds2.zk.rule-type=degrade
```

注意替换配置，同时注意`rule-type`，不同规则需要配置不同的`rule-type`，以后如果新增其他规则，配置中心也需要新增对应配置，其中groupId为dashboard固定值，**dataId需要增加/flow_rule或/degrade_rule，因为上文改造的配置隔离**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-54.png/zipstyle)

:::

**如果`zk`中有熔断配置，但配置中心只配置了流控规则，那么熔断规则将对应用不起作用(因为没配置，所以找不到从哪里获取熔断规则)**

### 步骤12: 改造簇点链路新增规则-由内存变为持久化到zk

上述步骤已经解决了大部分问题，流控规则和熔断规则在各自的列表上体验正常了

**但从簇点链路上点击流控或熔断仍然是走的内存的，点击这里添加后跳转的页面也是内存列表的页面，不是持久化的页面**

**所以我们需要改造簇点链路的前端代码，让他新增时走持久化方法，跳转也改到持久化页面**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-55.png/zipstyle)

:::

1. 找到src/main/webapp/resources/app/scripts/directives/sidebar/sidebar.html的簇点链路代码块

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-56.png/zipstyle)

:::

跟踪进`identity`方法

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-57.png/zipstyle)

:::

进入`Controller`的实现`identity.js`

2. 改变`identity.js`所有关于流控和降级规则的路由到V2，使得新增规则后跳转持久化页面

从左至右

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-58.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-59.png/zipstyle)

:::

3. 改变`identity.js`中原始`Service`到`V2`

使得新增方法采用持久化`Service`而不是单机

从

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-60.png/zipstyle)

:::

改变为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-61.png/zipstyle)

:::

**之所以这里`DegradeService`没有变动，是因为我们直接在`DegradeService`进行的修改，且没有改动名称，如果你改动了名称那么也需要同步修改**

4. 替换`identity.js`中所有`FlowService`和`DegradeService`

替换`service`引用使他们调用时采用持久化方案

在`idea`中`ctrl`+`F`，之后`ctrl`+`R`，开启严格大小写和`word`匹配，替换的地方有`4`处

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-62.png/zipstyle)

:::

本文的`DegradeService`无需替换

这样就完成了簇点链路的新增规则持久化改造

### 步骤13: 隐藏流控和熔断降级规则单机页面

由于有了持久化之后，内存的规则没有必要保留了，我们需要移除流控规则列表和熔断规则列表的回到单机页面的按钮

对于`flow_v2.html`，改造如下，从左至右

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-63.png/zipstyle)

:::

对于`degrade_v2.html`，改造如下，从左至右

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-64.png/zipstyle)

:::

对于`identity.html`，改造如下，从左至右

簇点链路列表移除了机器维度的显示，因为持久化的规则不再通过`ip`进行区分，是通过`app`名称进行控制，所以机器维度的显示没有必要

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-65.png/zipstyle)

:::

### 最终效果

经过上述诸多步骤的改造，一个可以基本在生产环境使用的`Sentinel-Dashboard`就完成了，同时依靠本文教程，对于剩余部分规则的改造相信也能够变得更加容易

最终效果如下

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-66.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-67.png/zipstyle)

:::

## 部分源码解析

### 客户端监听zk变更

通过改造过程我们可以知道，`dashboard`会`push`流控和熔断规则到`zk`，但客户端怎么知道`zk`数据变更了呢？

我们在项目默认引入了`sentinel-datasource-zookeeper`，这个包中只有一个类

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-68.png/zipstyle)

:::

该`DataSource`初始化时会调用`init`方法，`init`方法中有`initZookeeperListener`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-69.png/zipstyle)

:::

在`Listener`中有一个`curator`提供的监听方法，他订阅了持久化的`zk`地址，当地址中`path`路径数据发生变更时，就会进行规则刷新

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-70.png/zipstyle)

:::

### Sentinel如何适配的Dubbo3

在项目中默认引入了`sentinel-apache-dubbo3-adapter1.8.6`的版本

里面内置了`2`个`Filter`文件，包含`3`个`Filter`定义

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-71.png/zipstyle)

:::

分别是

```xml
sentinel.dubbo.provider.filter=com.alibaba.csp.sentinel.adapter.dubbo3.SentinelDubboProviderFilter
sentinel.dubbo.consumer.filter=com.alibaba.csp.sentinel.adapter.dubbo3.SentinelDubboConsumerFilter
dubbo.application.context.name.filter=com.alibaba.csp.sentinel.adapter.dubbo3.DubboAppContextFilter
```

大概看一下`SentinelDubboProviderFilter`，也是实现的`Dubbo`的`Filter`实现的`SPI`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-72.png/zipstyle)

:::

对应的实现和编码形式写`Sentinel`资源类似，利用了`Sentinel`提供的`api`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-73.png/zipstyle)

:::

**需要注意的是，这里使用的`sentinel-apache-dubbo3-adapter1.8.6`的版本，而不是`1.8.5`**，官方在`1.8.5`才支持`dubbo3`的`adapter`，在`1.8.5`中居然是这么写的

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-74.png/zipstyle)

:::

而该实现类对应的包名却是

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-75.png/zipstyle)

:::

这直接导致了引入了`dubbo3`适配包，但这三个`Filter`却不生效

这种低级错误，官方在发布了`1.8.5`版本`2`个月后，在`1.8.6`版本才修复

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/sentinel-dashboard/sentinel-dashboard-76.png/zipstyle)

:::