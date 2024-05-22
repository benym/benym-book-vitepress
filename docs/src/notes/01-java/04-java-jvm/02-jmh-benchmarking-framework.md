---
title: JMH-基准测试框架
date: 2022-12-29 14:16:15
description: 总结
categories: 
  - Java
  - JVM
tags: 
  - Java
  - JVM
  - JMH
  - BenchMark
permalink: /pages/ffed02/
author: 
  name: benym
  link: https://github.com/benym
---

## 什么是JMH

`JMH`(Java Microbenchmark Harness)由OpenJDK团队开发，是一款基准测试工具。作为JDK官方的基准测试工具，在JDK9开始已内嵌。通常用于代码的性能调优，JMH开发者同样为JIT的开发者，得益于专业的JVM优化分析，JMH具有高精度的特点，适用于Java及基于JVM的语言。通常JMH能够统计程序的`OPS`(Opeartion Per Second，每秒操作量)、及`TP99`、`平均差`等，JMH测试的对象可以是方法级的，粒度更小、不限于REST API。

官方JMH代码示例在[这里](https://hg.openjdk.java.net/code-tools/jmh/file/tip/jmh-samples/src/main/java/org/openjdk/jmh/samples/)

## 同类工具

与之类似的工具还有Apache JMeter、Wrk等

- `Apache JMeter`：提供GUI创建压力测试、调试，可在GUI执行压测(官方不推荐、误差大)，优选在GUI配置后在命令行压测
- `Wrk`: 热门开源压测工具、C语言编写、支持脚本进行压测，请求高度可定制

差异：

- `Apache JMeter`: 具有简单易懂的GUI，配置友好。支持吞吐量(Throughput、TPS)、TP90、TP95、TP99等多种指标，结果自带Web报告和文件报告，支持分布式压测。
- `Wrk`: 支持多种脚本工具，对网络的设置更多，能够更好的模拟出用户请求，发压效率高，支持TP50、TP75、TP90、TP99、每秒请求数(Requests Per Second、QPS)等指标，支持通过脚本自定义指标比例、TCP长/短连接设置，wrk没有GUI，但学习成本不高，结果通常为输出形式，仅支持单机压测。

定位：JMH更多的是代码级、方法级的压测，能够反映出某一方法的瓶颈，对网络包的定制不关心。而Apache JMeter和Wrk能做的很多、对于处理网络中的请求，对REST接口更具准确性。

更多关于Apache JMeter和Wrk的使用可阅读这篇文章[如何利用Wrk与JMeter做性能压测](https://cloud.tencent.com/developer/article/1896652)

::: tip
通常来说准确的请求压测，发压机应和服务不在同一机器，毕竟一个请求到来时，网络情况也是观测的重要部分
:::

## JMH使用

在JDK8中使用JMH需要先引入

```java
<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-core</artifactId>
    <version>1.29</version>
</dependency>

<dependency>
    <groupId>org.openjdk.jmh</groupId>
    <artifactId>jmh-generator-annprocess</artifactId>
    <version>1.29</version>
    <scope>provided</scope>
</dependency>
```

JMH实现了JSR269规范，即注解处理器，能在编译Java源码的时候识别到需要处理的注解

在pom文件中引入对应需要的插件

```java
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>2.4.1</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>shade</goal>
            </goals>
            <configuration>
                <finalName>jmh-demo</finalName>
                <transformers>
                    <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                        <mainClass>org.openjdk.jmh.Main</mainClass>
                    </transformer>
                </transformers>
            </configuration>
        </execution>
    </executions>
</plugin>
```

一个简单的基准测试代码，只需要加入`@Benchmark`

```java
public class MHBenchmark {

    @Benchmark
    public void test() {
        int i = 1;
        i+=1;
    }
}
```

上述代码意思是采用默认参数，测试i+1的性能

当然这样的类还不能够跑起来，JMH提供了2种方式运行代码

> ====================== HOW TO RUN THIS TEST: ============================
>
> 
>
> You can run this test:
>
> 
>
> a) Via the command line:
>
> ​    $ mvn clean install
>
> ​    $ java -jar target/benchmarks.jar JMHSample_09 -f 1
>
> ​    (we requested single fork; there are also other options, see -h)
>
> 
>
> b) Via the Java API:
>
> ​    (see the JMH homepage for possible caveats when running from IDE:  http://openjdk.java.net/projects/code-tools/jmh/)

1. 命令行

```java
mvn clean install
java -jar xxx.jar
```

2. 通过Java API，在IDE运行

```java
public static void main(String[] args) throws RunnerException {
    Options options = new OptionsBuilder()
            .include(MHBenchmark.class.getSimpleName())
            .result("./result-mh.json")
            .resultFormat(ResultFormatType.JSON)
            .build();
    new Runner(options).run();
}
```

如果觉得每次运行都需要手动输入命令行的方法1繁琐，可以使用IDE运行的方法2，如果方法2的main函数不好记忆，这时候可以使用JMH插件**JMH Java Microbenchmark Harness**，其作者为[Aleksey Shipilev](http://shipilev.net/)，受雇于Red Hat，是OpenJDK子项目、JMH的开发者。

在Idea的Plugins搜索JMH、安装即可

插件可以让我们能够以JUnit相同的方式使用JMH，主要功能如下：

- 自动生成带有@Benchmark的方法
- 运行单独的Benchmark方法
- 运行类中所有的Benchmark方法

和生成构造方法的Idea目录相同，插件支持通过右键点击Generate，选择操作 Generate JMH benchmark 就可以生成一个带有 @Benchmark 的方法。
::: center
![https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/genBenchmark.png](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/genBenchmark.png/zipstyle)
:::
此时不需要手动打包，也不需要编写main方法，直接点击左侧运行即可

## 常用注解解析

JMH提供的注解相当多，这里仅列出较为常用的注解，更多注解运用可查看JMH官方用例

### @BenchmarkMode

可用于类或方法上，配置Benchmark的模式，总共支持如下5种：

1. `Throughput`: 吞吐量，每秒执行了多少次调用
2. `AverageTime`: 平均时间，每次操作的平均时间
3. `SampleTime`: 对每次操作随机取样，最后输出取样结果的分布
4. `SingleShotTime`: 单词操作时间，可衡量冷启动时的性能
5. `All`: 所有模式都执行一次

同时支持分组操作

作用类上

```java
@BenchmarkMode(Mode.Throughput)
public class JMHSample {
    
    @Benchmark
    public void measureShared(BenchmarkState state) {
        TimeUnit.MILLISECONDS.sleep(100);
    }
}
```

作用方法上

```java
public class JMHSample {
    
    @BenchmarkMode(Mode.Throughput)
    @Benchmark
    public void measureShared(BenchmarkState state) {
        TimeUnit.MILLISECONDS.sleep(100);
    }
}
```

### @State

可用于类和方法上、通过@State进行标记指定对象的作用范围，JMH根据@State的Scope参数来进行实例化和共享操作。根据作用范围的不同分为如下3类：

1. `Scope.Benchmark`: 基准状态范围。同一类型的所有实例将在所有工作线程之间共享。
2. `Scope.Group`: 组状态范围。同一类型的所有实例将在同一组内的所有线程之间共享。
3. `Scope.Thread`: 线程状态范围。使用线程作用域，同一类型的所有实例都是不同的，即在同一个基准测试中注入了多个实例。

如@State作用于类内部的class上，通常用与@Setup结合

当使用@State标记内部类后，在使用时应包含该入参

```java
public class JMHSample {
    @State(Scope.Benchmark)
    public static class BenchmarkState {
        volatile double x = Math.PI;
    }
    @Benchmark
    public void measureShared(BenchmarkState state) {
        state.x++;
    }
}
```

### @Setup及@TearDown

`@Setup`: 用于基准测试方法之前调用，通常用于资源的初始化

`@TearDown`: 用于基准测试方法之后调用，通常用于资源的回收清理工作

两者都可以使用`Level`控制

`Level`: 使用@Setup和@TearDown时，在默认情况下，@Setup和@TearDown会在一个基准方法的所有批次执行前后分别执行，如果需要在每一个批次或者每一次基准方法调用执行的前后执行对应的套件方法，则可通过Level控制

- `Trial`: 试验级别。Setup和TearDown默认的配置，在每次基准测试运行之前/之后执行
- `Iteration`: 迭代级别。在基准测试的每次迭代之前/之后执行
- `Invocation`: 调用级别。为每个基准测试方法执行

单独使用

```java
public class JMHSample {
    
    private List<Integer> list = null;
    
    @Setup
    public void setup(){
        this.list = new ArrayList<>();
    }
    
    @TearDown
    public void tearDown() {
        assert this.list.size() > 0 : "The Size  Of List Must Lager Than Zero";
    }
    
    @Benchmark
    public void testRight() {
        this.list.add("Test");
    }

    @Benchmark
    public void testWrong() {
        
    }
}
```

针对testRight和testWrong进行测试，testRight能够正确通过，因为list内部有值，后置的TearDown不会被断言拦截。testWrong会被断言拦截，导致Benchmark终止。

和`@State`混合使用，组合方式不限于以下一种

```java
public class JMHSample {
    
    @State(Scope.Benchmark)
    public static class BenchmarkState {
        double x;
        @Setup
        public void setup(){
            x = Math.PI;
        }
    }
    
    @Benchmark
    public void measureShared(BenchmarkState state) {
        state.x++;
    }
}
```

### @Warmup

预热所需要配置的一些基本测试参数，可用于类或者方法上。放在Benchmark方法上，只对该方法起作用，也可以放在外围类实例上，对该类中的所有Benchmark方法起作用。一般前几次进行程序测试的时候会遇到冷启动问题，导致程序很慢，使用@Warmup，可以将JIT进行提前预热解决冷启动问题，因为 JVM 的 JIT 机制的存在，如果某个函数被调用多次之后，JVM 会尝试将其编译为机器码，从而提高执行速度，所以为了让 Benchmark 的结果更加接近真实情况就需要进行预热。

1. `iterations`：预热的次数
2. `time`：每次预热的时间
3. `timeUnit`：时间的单位，默认秒
4. `batchSize`：批处理大小，每次操作调用几次方法

### @Measurement

实际调用方法所需要配置的一些基本测试参数，可用于类或者方法上，参数和 @Warmup相同。

比如

```java
@Measurement(iterations = 10, time = 5)
```

表示为迭代10次，每次5s。可用于控制压测时间。

### @Param

指定某项参数的多种情况，适合用来测试一个函数在不同的参数输入的情况下的性能，只能作用在字段上，使用该注解必须定义@State注解。

```java
public class JMHSample {
    
    @Param({"1", "31", "65", "101", "103"})
    public int arg;

    @Param({"0", "1", "2", "4", "8", "16", "32"})
    public int certainty;
    
    @Benchmark
    public boolean bench() {
        return BigInteger.valueOf(arg).isProbablePrime(certainty);
    }
}
```

上述代码的含义为对于arg数组中的每个数，测试是否是certainty数组内以下的素数，压测计算时间，总计执行次数为arg的数组长度`x`certainty的数组长度=35次

再看一个例子

```java
public class JMHSample {
    
    @Param({"1", "31", "65", "101", "103"})
    public int arg;
    
    @Benchmark
    public boolean bench() {
        return String.valueOf(arg);
    }
}
```

上述代码为依次执行arg数组中数据，转换到String类型的耗时

### @Threads

每个进程中的测试线程，可用于类或者方法上。

### @Fork

进行Fork的次数，可用于类或者方法上。如果Fork数是2的话，则JMH会Fork出两个进程来进行测试。模拟多进程环境，完全隔离多个进程，不会相互影响。

### @OutputTimeUnit

为统计结果的时间单位，可用于类或者方法注解，单位为TimeUnit类，支持到纳秒级。

## 快速上手

以一个全面的例子来进行解释

```java
@Fork(1) // Fork 1个进程进行测试
@BenchmarkMode(Mode.Throughput) // 吞吐量
@Warmup(iterations = 3) // JIT预热
@Measurement(iterations = 10, time = 5) // 迭代10次,每次5s
@OutputTimeUnit(TimeUnit.MILLISECONDS) // 结果所使用的时间单位
@Threads(10) // 线程10个
public class BenchmarkTestSimple {

    /**
     * 作用域为本次JMH测试，线程共享
     * <p>
     * 初始化source数据集
     */
    @State(Scope.Benchmark)
    public static class GenerateModel {
        DataBaseDO dataBaseModel;

        // 初始化
        @Setup(Level.Trial)
        public void prepare() {
            dataBaseModel = new ModelService().get();
        }
    }

    /**
     * 初始化MapStruct
     */
    @State(Scope.Benchmark)
    public static class MapStructInit {
        MapStructMapper mapStructMapper;

        @Setup(Level.Trial)
        public void prepare() {
            mapStructMapper = Mappers.getMapper(MapStructMapper.class);
        }
    }

    /**
     * get/set 基准测试
     *
     * @param generateModel source
     * @return target       DataBaseVO
     * @throws Exception    Exception
     */
    @Benchmark
    public DataBaseVO testGetSet(GenerateModel generateModel) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        DataBaseDO dataBaseModel = generateModel.dataBaseModel;
        dataBaseVO.setAge(dataBaseModel.getAge());
        dataBaseVO.setName(dataBaseModel.getName());
        dataBaseVO.setTime(dataBaseModel.getTime());
        dataBaseVO.setYear(dataBaseModel.getYear());
        dataBaseVO.setOtherTime(dataBaseModel.getOtherTime());
        return dataBaseVO;
    }

    /**
     * MapStruct基准测试
     *
     * @param generateModel source
     * @param init          初始化的mapper
     * @return target       DataBaseVO
     * @throws Exception    Exception
     */
    @Benchmark
    public DataBaseVO testMapStruct(GenerateModel generateModel, MapStructInit init) throws Exception {
        DataBaseVO dataBaseVO = init.mapStructMapper.copy(generateModel.dataBaseModel);
        return dataBaseVO;
    }
}
```

上述代码的含义为：

Fork一个进程进行测试，利用吞吐量作为衡量指标，预热3轮再进行测试，对每个测试方法迭代10次、每次5秒，结果采用微秒作为单位，并采用10个线程进行发压。同时对MapStruct和源数据进行初始化，消除初始化开销，评估MapStruct和原生get/set的性能差异。

## JMH-避免死代码消除陷阱

>The downfall of many benchmarks is Dead-Code Elimination (DCE): compilers
>
>are smart enough to deduce some computations are redundant and eliminate
>
>them completely. If the eliminated part was our benchmarked code, we are
>
>in trouble.
>
>
>
>Fortunately, JMH provides the essential infrastructure to fight this
>
>where appropriate: returning the result of the computation will ask JMH
>
>to deal with the result to limit dead-code elimination (returned results
>
>are implicitly consumed by Blackholes, see JMHSample_09_Blackholes).

引用官方的解释: 许多基准测试的失败是因为死代码消除(DCE)，因为编译器足够聪明，可以推断出一些计算是冗余的并完全消除掉他们，如果被淘汰的部分是基准测试的代码，那将引起基准测试的失败(不准确)

死代码陷阱的一个典型场景如下

```java
public class JMHSample {
    
    private double x = Math.PI;
    
    @Benchmark
    public void measureWrong() {
        // This is wrong: result is not used and the entire computation is optimized away.
        Math.log(x);
    }
}
```

上述代码采用void进行返回，使得变量`x`的结果并没有被用到，JVM优化时会将整个方法的内部代码移除。

JMH提供了2种方式避免该问题:

1. 将变量作为方法的返回值，即此时方法返回`double`，`return Math.log(x)`
2. 通过JMH的`Blackhole consume`避免JIT优化消除

通过JMH插件创建的Benchmark自带该入参

```java
@Benchmark
public void measureName(Blackhole bh) {
    bh.consume(xxxxx)
}
```

JMH的其他死代码陷阱还有常量折叠、常量传播、永远不要在测试中写循环、使用 Fork 隔离多个测试方法、方法内联、伪共享与缓存行、分支预测、多线程测试等，可参考JMH专家Aleksey Shipilev的JMH公开课[Benchmarking ("The Lesser of Two Evils" Story)](https://www.youtube.com/watch?v=VaWgOCDBxYw)

## JMH可视化

JMH打印的结果为文字型，运行时可以指定保存为文件，为了更直观的观察结果，可以尝试使用JMH可视化网站

1. [http://deepoove.com/jmh-visual-chart/](http://deepoove.com/jmh-visual-chart/)
2. [https://jmh.morethan.io/](https://jmh.morethan.io/)

## 参考文章

[1]. [https://hg.openjdk.java.net/code-tools/jmh/file/tip/jmh-samples/src/main/java/org/openjdk/jmh/samples/](https://hg.openjdk.java.net/code-tools/jmh/file/tip/jmh-samples/src/main/java/org/openjdk/jmh/samples/)

[2]. [https://jmeter.apache.org/](https://jmeter.apache.org/) 

[3]. [https://github.com/wg/wrk](https://github.com/wg/wrk) 

[4]. [https://cloud.tencent.com/developer/article/1896652](https://cloud.tencent.com/developer/article/1896652) 

[5]. [http://shipilev.net/](http://shipilev.net/) 

[6]. [https://www.youtube.com/watch?v=VaWgOCDBxYw](https://www.youtube.com/watch?v=VaWgOCDBxYw)

