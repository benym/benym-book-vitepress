---
title: 单测覆盖率工具在多模块项目中的集成
categories: 
  - Java
  - 思考与方案
tags: 
  - 单测覆盖率
  - jacoco
  - codecov
  - maven
author: 
  name: benym
  link: https://github.com/benym
date: 2023-07-11 11:34:55
permalink: /pages/da3c26/
---

## 背景

单元测试是验证函数是否按预期执行的利器，是保障代码质量的有效手段之一。项目能够通过单元测试找到代码中潜在的问题，充足的单元测试用例也是代码使用方法的最好诠释。通常项目的单测质量采用单测覆盖率进行指标衡量，本文结合在项目中的实践，给出`maven`多模块项目该如何集成`jacoco`及`codecov`单测工具。

## 项目结构

本文的maven项目结构如下

```shell
│  .gitignore
│  LICENSE
│  pom.xml
│  README-CN.md
│  README.md
│
├─.github
│  └─workflows
│          codecov.yml
│
├─rpamis-chain
│  │  pom.xml
│  │
│  └─src
│      └─main
│          └─java
│              └─com
│                  └─rpamis
│                      └─pattern
│                          └─chain
│                              │  AbstractChainHandler.java
│                              │  AbstractChainPipeline.java
│                              │
│                              ├─entity
│                              │      ChainException.java
│                              │      ChainResult.java
│                              │      CompleteChainResult.java
│                              │      UniqueList.java
│                              │
│                              ├─interfaces
│                              │      ChainHandler.java
│                              │      ChainPipeline.java
│                              │      ChainStrategy.java
│                              │
│                              └─strategy
│                                      FastFailedStrategy.java
│                                      FastReturnStrategy.java
│                                      FullExecutionStrategy.java
│
└─rpamis-chain-test
    │  pom.xml
    │
    └─src
        └─test
            └─java
                └─com
                    └─rpamis
                        └─pattern
                            └─chain
                                │  DemoChainPipelineTest.java
                                │  DemoUser.java
                                │
                                ├─handler
                                │      AuthHandler.java
                                │      LoginHandler.java
                                │      ValidateHandler.java
                                │
                                └─pipeline
                                        DemoChainPipeline.java
```

其中`rpamis-chain`是[rpamis-chain](https://github.com/rpamis/rpamis-chain)中关于责任链框架的实现模块，而`rpamis-chain-test`是专门用于测试的模块。

在集成单侧覆盖率工具的时候我们经常希望测试模块和被测试模块两个是彼此分离的，因为在测试模块中我们可能还会引入必要的pom进行测试。在网上的教程中大多数都会教你怎么在单个项目中集成`jacoco`，然而教程只适用于单模块项目，**在多模块项目中采用单模块项目教程，得到的单侧覆盖率结果要么生成了文件，但文件内容没有正确跑单测，导致覆盖率为0，要么甚至文件都没生成**。基于上述的踩坑内容，本文给出在多模块项目中集成单测覆盖率的步骤。

## 集成jacoco步骤

本文的`jacoco.version`=`0.8.10`

`rpamis-chain-test`中引入的`rpamis-chain`项目

### 步骤1: 在parent pom中添加依赖

首先在`parent pom`中添加`jacoco`的`maven`打包插件

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>${jacoco.version}</version>
    <configuration>
        <append>true</append>
    </configuration>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

注意此处的打包目标为`prepare-agent`

### 步骤2: 在测试模块pom中添加依赖 

之后在测试模块中(本文的`rpamis-chain-test`)的`pom`文件中增加`jacoco`的`maven`打包插件，目标为`report-aggregate`

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.jacoco</groupId>
            <artifactId>jacoco-maven-plugin</artifactId>
            <version>${jacoco.version}</version>
            <executions>
                <execution>
                    <id>jacoco-report-aggregate</id>
                    <phase>test</phase>
                    <goals>
                        <goal>report-aggregate</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

这个目标是形成`jacoco`聚合报告

::: tip

两个`pom`都是引入的同一个插件，但打包行为不一样，这个时候不能够精简掉`parent`中的打包插件，这样会造成聚合报告无法生成的问题

:::

### 步骤3: 打包项目

要想打包项目后生成正确的单测覆盖率文件，你的`test`模块至少要有可运行的`Test`程序，同时必须按照如下步骤**在父类(这里的`rpamis-chain-parent`)进行打包**

```powershell
maven clean install
```

::: tip

一定要在父类进行打包，因为`test`模块依赖于待测试模块，需要加载待测试模块的`class`

::: 

如果你习惯使用`idea`进行打包，记住放开测试，以保证单测程序在打包时执行

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-1.png)

:::

如果你的单测程序正确运行，且被`jacoco`收集，你将会在打包过程中看到类似的信息

```powershell
-------------------------------------------------------
 T E S T S
-------------------------------------------------------
Running com.rpamis.pattern.chain.DemoChainPipelineTest
auth failed
validate success
login success
auth failed
auth failed
validate success
auth success
validate success
login success
validate success
validate success
auth failed
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.509 sec - in com.rpamis.pattern.chain.DemoChainPipelineTest

Results :

Tests run: 7, Failures: 0, Errors: 0, Skipped: 0

[INFO] 
[INFO] --- jacoco-maven-plugin:0.8.10:report-aggregate (jacoco-report-aggregate) @ rpamis-chain-test ---
[INFO] Loading execution data file D:\Project\rpamis-chain\rpamis-chain-test\target\jacoco.exec
[INFO] Analyzed bundle 'rpamis-chain' with 10 classes
```

## 查看jacoco效果

打包后在`test`模块下`target`目录将会生成如下文件

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-2.png)

:::

重点关注`site`目录下有没有生成`jacoco-aggregate`，以及外层有没有生成`jacoco.exec`

点击`jacoco-aggregate/index.html`查看单侧覆盖率网页报告

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-3.png)

:::

::: warning

如果你的网页报告打开后显示单侧覆盖率为`0`，且没有找到该测试的类，那么请检查你的打包动作和`pom`设置与本文对齐

:::

## 集成codecov自动化测试步骤

[codecov](https://about.codecov.io/)在`github`中的开源项目中广泛使用，支持N种语言的单测覆盖率，支持本地编译后自行上传结果到`codecov`和从`github action`构建自动化测试，并自动上传`codecov`。它不仅提供了代码覆盖率的可视化分析，而且提供了`github`的徽标

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-4.png)

:::

首先你需要注册`codecov`账号，可采用`github`账号登陆

### 步骤1: 为你的项目增加codecov相应的github action

进入你需要进行自动化测试的仓库

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-5.png)

:::

新增一个`workflow`，选择`set up a workflow yourself`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-6.png)

:::

给你的`workflow`取个名字，并按照`workflow`语法编写脚本，本文是针对`Java`语言的单测，对应的完整`yml`如下

```yaml
# 在master分支发生push事件时触发。
name: CodeCoverageTest

on:
  push:
    branches:
      - master

env: # 设置环境变量
  TZ: Asia/Shanghai # 时区（设置时区可使页面中的`最近更新时间`使用时区时间）

jobs:
  CodeCov: # 自定义名称
    runs-on: ubuntu-latest # 运行在虚拟机环境ubuntu-latest
    steps:
      - name: Check out master code
        uses: actions/checkout@master
      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'temurin'
          cache: maven
      - name: Build with Maven
        run: mvn clean compile test
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
          files: ./rpamis-chain-test/target/site/jacoco-aggregate/jacoco.xml
          flags: unittests
          name: codecov-jacoco-rpamis
          verbose: true
```

`codecov`的配置可以在[官方流水线](https://github.com/marketplace/actions/codecov)中查询，其中`files`表示你的项目打包后`jacoco.xml`所在的位置，`token`为你的`codecov`对应的仓库`token`，可以在如下位置找到

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-7.png)

:::

`yml`中的`token`并没有直接明文写在里面，而是采用了在`github`新增私有变量的形式

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-8.png)

:::

你可以在仓库的`Settings->Secrets and variables->Actions->New repository secret`中新增一个私有变量，将`token`放入其中

### 步骤2: push代码触发自动化测试

有个对应的`workflow`之后，你只需要`push`代码到`github`，触发`github action`进行自动化测试和报告上传

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-9.png)

:::

### 步骤3: 查看codecov结果

执行完毕之后，就可以在`codecov`官网查看单测覆盖率结果了

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-10.png)

:::

同时你可以在`Settings`中找到对应的徽标

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/unit-test/unit-test-11.png)

:::



