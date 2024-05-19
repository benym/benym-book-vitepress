---
title: MethodHandle结合LambdaMetafactory-使用方法及性能测试
date: 2022-12-27 14:23:30
categories: 
  - 开源项目
  - Rpamis
tags:
  - 开源项目
  - Rpamis
  - MethodHandles
  - LambdaMetafactory
  - 压测
  - 反射
author: 
  name: benym
  link: https://github.com/benym
permalink: /pages/b127c7/
---

## 背景
在进行实例的动态推断和构建时，我们会经常使用到反射这一技巧，然而在某些场景中反射的效率显得有些力不从心。从JDK7开始，MethodHandle被推出，用于解决反射的效率问题。在JDK8，MethodHandle又与Lambda进行深度结合，成为Lambda的最底层调用方式。在JDK9，MethodHandle又被进一步增强。
在开源项目中，Mybatis Mapper的动态代理、fastjson2实现则运用了MethodHandle。

本文代码地址[https://github.com/benym/benchmark-test](https://github.com/benym/benchmark-test)，其中的`MhBenchMark`和`MhExceptionBenchMark`目录

## MethodHandle是什么
MethodHandle直译为方法句柄，调用时JVM采用invokedynamic指令[^1]，直接调用native方法，引用JDK中的说明
::: tip
A method handle is a typed, directly executable reference to an underlying method, constructor, field, or similar low-level operation, with optional transformations of arguments or return values.
:::
方法句柄是一个有类型的，可以直接执行的指向底层方法、构造器、field等的引用，可以简单理解为函数指针，它是一种更加底层的查找、调整和调用方法的机制。

一个简单的使用方法为

step1: 创建mh lookup、根据访问权限任选其一即可
```java
//仅访问public方法
MethodHandles.Lookup publicLookup = MethodHandles.publicLookup();
//访问public、private、protected方法
MethodHandles.Lookup allLookup = MethodHandles.lookup();
```
step2: 创建MethodType，它用来描述被访问的方法的参数类型、返回值类型，JVM强制要求声明的Method Type与实际调用方法的参数类型必须匹配
```java
// 即入参为String、返回为void类型
MethodType methodType = MethodType.methodType(void.class, String.class);
```
step3: 通过mh lookup和MethodType获取对应方法MethodHandle并执行，下例为通过Test.class字节码，找到类Test中以String为入参，void为返回值的构造方法、并进行invoke赋值，返回赋值后的Test实体类
```java
MethodHandle methodHandle = publicLookup.findConstructor(Test.class, methodType);
Object invoke = methodHandle.invoke("赋值Test消息");
```
其中step2为可选，根据step3使用方法的不同入参不同，step3还可以为：通过MethodHandle访问普通方法、访问静态方法、访问构造函数、访问私有方法、访问公有成员等。
最终执行，按照对参数数目、参数类型的要求限制不同，分为三类`invokeWithArguments()`,`invoke()`,`invokeExact()`
- invokeWithArguments要求接收变长参数，允许参数拆装箱类型转换
- invoke要求接收固定的参数列表，允许参拆装箱，类型转换
- invokeExact要求最严格，参数类型不匹配会报错
这里不再对MethodHandle各个用例的使用进行展开。

## MethodHandle性能测试

### 前言

参考StackOverflow[^2]和OptaPlanner引擎论坛[^3]对MethodHandle的测试结果，大多数情况下，mh的执行效率接近原生，但随着JDK对反射的优化，反射的效率也没有想象中的特别慢。

在上述引文的第2篇，作者做了非常全面的实验，包括[Traveling Salesman Problem](https://www.optaplanner.org/learn/useCases/vehicleRoutingProblem.html)(旅行商问题、反应在调用链路耗时)、直接调用、非静态化调用、静态化调用、Java编译器生成、LambdaMetafactory结合、启动消耗等，值得一读。

::: tip
OptaPlanner是一个开源的轻量级、可嵌入的约束满足引擎，可求解规划问题，100%由Java编写，可以在任何JVM上运行，也可以在Maven中央存储库中使用、支持多种平台下载。在底层，OptaPlanner 将复杂的人工智能优化算法（例如禁忌搜索、模拟退火、延迟接受和其他元启发式算法）与非常有效的分数计算和其他最先进的 NP-complete 或 NP-约束求解技术相结合。

可参考文章[^4][^5],  官网为<https://www.optaplanner.org/>
:::

引文的结论中：**非静态化的mh甚至比反射效率更低**，这迫使开发者采用其他方法增强mh，**想要做到具有通用性、且高效的Methodhandle需要结合LambdaMetafactory**；如果不会使用LambdaMetafactory、在字段不多的情况下选择static化的mh同样是选择，而采用Java编译器去动态生成代码的方式，虽然效率上达到原生，但写的很不方便。

在本文中，MethodHandle主要解决如下2个问题

1. 类外访问private变量并动态赋值
2. 动态根据class带入参创建实例

虽然反射实现起来很简单，但由于这两种场景在工具类中使用高频，所以出于性能考量采用了MethodHandle，同时做出性能测试。

### 场景1-类外访问private变量并动态赋值

项目中存在某实体，出于某些特殊原因，**没有向外部提供对应字段的set方法**，赋值需要通过构造特定对象进行实例新建。在转换时有一定的不便捷性。

示例代码如下，这里不展示通过特定对象创建实例的构造方法。

```java
public class EntityWithNoSet {
    private int testField;

    public EntityWithNoSet() {
    }

    public int getTestField() {
        return testField;
    }

    public EntityWithNoSet(int testField) {
        this.testField = testField;
    }
}
```

当不采用构造特定对象的方式进行示例创建，又需要对私有变量赋值时，可以采用反射或MethodHandle实现

一个简单的压测代码为，采用平均时间作为性能衡量指标

```java
@Fork(1) // Fork 1个进程进行测试
@BenchmarkMode(Mode.AverageTime) // 平均时间
@Warmup(iterations = 3) // JIT预热
@Measurement(iterations = 10, time = 5) // 迭代10次,每次5s
@OutputTimeUnit(TimeUnit.NANOSECONDS) // 结果所使用的时间单位
@Threads(10) // 线程10个
public class MHBenchmark {

    private static final MethodHandle staticMethod = MethodAccessor.getCache(EntityWithNoSet.class + "testField");

    private static final Field field = ReflectInit.init(EntityWithNoSet.class, "testField");

    /**
     * 作用域为本次JMH测试，线程共享
     * <p>
     * 初始化source数据集
     */
    @State(Scope.Benchmark)
    public static class GenerateModel {
        EntityWithNoSet source;

        // 初始化
        @Setup(Level.Trial)
        public void prepare() {
            source = new EntityWithNoSet(123);
        }
    }

    @Benchmark
    public void testNoStaticReflection(GenerateModel generateModel) throws NoSuchFieldException, IllegalAccessException {
        EntityWithNoSet entityWithNoSet = new EntityWithNoSet();
        Class<? extends EntityWithNoSet> EntityWithNoSetClass = entityWithNoSet.getClass();
        Field testField = EntityWithNoSetClass.getDeclaredField("testField");
        testField.setAccessible(true);
        testField.set(entityWithNoSet, generateModel.source.getTestField());
    }

    @Benchmark
    public void testStaticReflection(GenerateModel generateModel) throws NoSuchFieldException, IllegalAccessException {
        EntityWithNoSet entityWithNoSet = new EntityWithNoSet();
        field.set(entityWithNoSet, generateModel.source.getTestField());
    }

    @Benchmark
    public void testStaticMethodHandle(GenerateModel generateModel) throws Throwable {
        EntityWithNoSet entityWithNoSet = new EntityWithNoSet();
        staticMethod.invoke(entityWithNoSet, generateModel.source.getTestField());
    }

    @Benchmark
    public void testNoStaticMethodHandle(GenerateModel generateModel) throws Throwable {
        EntityWithNoSet entityWithNoSet = new EntityWithNoSet();
        MethodAccessor.getCache(EntityWithNoSet.class + "testField").invoke(entityWithNoSet, generateModel.source.getTestField());
    }

    public static void main(String[] args) throws RunnerException {
        Options options = new OptionsBuilder()
                .include(MHBenchmark.class.getSimpleName())
                .result("./result-mh.json")
                .resultFormat(ResultFormatType.JSON)
                .build();
        new Runner(options).run();
    }
}
```

所需要的初始化后的MethodHandle为

```java
public final class MethodAccessor {
    private static final Logger logger = LoggerFactory.getLogger(MethodAccessor.class);

    private static final MethodHandles.Lookup lookup = MethodHandles.lookup();

    private static final ConcurrentHashMap<String, MethodHandle> methodHandleCache = new ConcurrentHashMap<>();

    static {
        initMethodHandles("testField");
    }

    private static void initMethodHandles(String fieldName) {
        try {
            String key = EntityWithNoSet.class + fieldName;
            MethodHandle cacheHandle = methodHandleCache.get(key);
            if (cacheHandle != null) {
                return;
            }
            Field field = EntityWithNoSet.class.getDeclaredField(fieldName);
            field.setAccessible(true);
            MethodHandle methodHandle = lookup.unreflectSetter(field);
            methodHandleCache.putIfAbsent(key, methodHandle);
        } catch (Exception e) {
            logger.warn("MethodHandle初始化异常", e);
            throw new RuntimeException(e);
        }
    }

    public static MethodHandle getCache(String key) {
        return methodHandleCache.get(key);
    }
}
```

所需要的初始化后的反射方法为

```java
public class ReflectInit {

    public static Field init(Class<?> clazz, String fieldName) {
        Field field;
        try {
            field = clazz.getDeclaredField(fieldName);
            field.setAccessible(true);
        } catch (NoSuchFieldException e) {
            throw new RuntimeException(e);
        }
        return field;
    }
}
```

压测分别对`非静态化MethodHandle`、`非静态化反射`、`静态化MethodHandle`、`静态化反射`4种情况进行测试

测试结果、纳秒为单位，数值越小越快：

```java
Benchmark                                              Mode  Cnt    Score    Error  Units
MethodHandleTest.MHBenchmark.testNoStaticMethodHandle  avgt   10  732.150 ± 40.476  ns/op
MethodHandleTest.MHBenchmark.testNoStaticReflection    avgt   10  439.412 ±  8.547  ns/op
MethodHandleTest.MHBenchmark.testStaticMethodHandle    avgt   10    1.561 ±  0.014  ns/op
MethodHandleTest.MHBenchmark.testStaticReflection      avgt   10   25.693 ±  0.543  ns/op
```

#### 小结

可以看出非静态化使用MethodHandle是不会比直接反射更快的，在使用时应该注意这一情况，在静态化之后，反射和MethodHandle都得到了显著的效率提升，此时MethodHandle效率更高。但观察代码我们可以发现，如文章[^3]所说一致，静态化的方案虽然有效果，但重复代码需要写很多，每个需要动态赋值的变量都需要一个静态申明，在小规模场景使用还好，但这种情况越多代码就越难看了。

#### 可优化点

通过调研StackOverflow上对于这种类外访问private变量并动态赋值的场景的文章[^6][^7]，我们了解到想要在JDK8环境下实现通用性的MethodHandle处理需要用到一些hack方法，单纯结合`LambdaMetafactory`可能很难做到。

在JDK9环境类外访问private变量的MethodHandle可采用

```java
MethodHandles.privateLookupIn(Class, MethodHandles.Lookup)
```

### 场景2-动态根据class带入参创建实例

该场景的主要动机造异常轮子Assert时，动态根据异常消息message和异常class构建出异常实例，从而达到抛出异常的目的，而取代通过new的方式抛出异常

改造前

```java
Assert.isTrue(false,"测试消息");
```

改造后

```java
Assert.isTrue(false,"测试消息", ValidException.class);
```

一个典型的子类为`ValidException`

```java
public class ValidException extends AbstractException {

    private static final long serialVersionUID = 1L;

    private static final String DEFAULT_VALID_ERRCODE = "test";

    public ValidException() {
        super(DEFAULT_VALID_ERRCODE);
    }

    public ValidException(String errMessage) {
        super(DEFAULT_VALID_ERRCODE, errMessage);
    }
}
```

他的父类为`AbstractException`

```java
public abstract class AbstractException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private String errMessage;

    public AbstractException(String errMessage) {
        super(errMessage);
    }
}
```

压测代码为

```java
@Fork(1) // Fork 1个进程进行测试
@BenchmarkMode(Mode.AverageTime) // 平均时间
@Warmup(iterations = 3) // JIT预热
@Measurement(iterations = 10, time = 5) // 迭代10次,每次5s
@OutputTimeUnit(TimeUnit.NANOSECONDS) // 结果所使用的时间单位
@Threads(10) // 线程10个
public class MhExceptioTest {

    @State(Scope.Benchmark)
    public static class MhNoLambda{
        MethodHandle methodHandle;

        @Setup(Level.Trial)
        public void prepare() throws NoSuchMethodException, IllegalAccessException {
            MethodType methodType = MethodType.methodType(void.class, String.class);
            methodHandle = MethodHandles.publicLookup().findConstructor(ValidException.class, methodType);
        }
    }

    @State(Scope.Benchmark)
    public static class MhLambda{
        Function<String,AbstractException> function;

        @Setup(Level.Trial)
        public void prepare(){
            function = MethodAccessor.createConstruct(ValidException.class);
        }
    }

    @State(Scope.Benchmark)
    public static class Constr{
        Constructor<ValidException> constructor;

        @Setup(Level.Trial)
        public void prepare() throws NoSuchMethodException {
            constructor = ValidException.class.getConstructor(String.class);
        }
    }


    @Benchmark
    public <T extends AbstractException> AbstractException directNew(){
        ValidException validException = new ValidException("test");
        return validException;
    }

    @Benchmark
    public <T extends AbstractException> AbstractException mhNoLamda(MhNoLambda mhNoLambda) throws Throwable {
        return (AbstractException) mhNoLambda.methodHandle.invoke("test");
    }

    @Benchmark
    public <T extends AbstractException> AbstractException reflet(Constr constr) throws NoSuchMethodException, InvocationTargetException, InstantiationException, IllegalAccessException {
        ValidException validException = constr.constructor.newInstance("test");
        return validException;
    }

    @Benchmark
    public <T extends AbstractException> AbstractException mhLamda(MhLambda mhLambda){
        return mhLambda.function.apply("test");
    }

    public static void main(String[] args) throws RunnerException {
        Options options = new OptionsBuilder()
                .include(MhExceptioTest.class.getSimpleName())
                .result("./result-mh-ex.json")
                .resultFormat(ResultFormatType.JSON)
                .build();
        new Runner(options).run();
    }
}
```

对于反射和Lambda化的MethodHandle，本文进行了方法的初始化，反射代码可见压测代码块中

MethodHandle+LambdaMetafactory封装的类，参考了StackOverflow[^8]，代码为

```java
public final class MethodAccessor {

    private static final Logger logger = LoggerFactory.getLogger(MethodAccessor.class);

    private static final MethodHandles.Lookup lookup = MethodHandles.lookup();

    private static final MethodType methodType = MethodType.methodType(void.class, String.class);

    private static final ConcurrentHashMap<String, Function<String, AbstractException>> cacheFunction = new ConcurrentHashMap<>();

    /**
     *
     * @param cls     动态推断的class
     * @param message 需要抛出的信息
     * @param <T>     class类型
     * @return AbstractException或其子类
     */
    public static <T extends AbstractException> AbstractException getException(Class<T> cls, String message) {
        try {
            Function<String, AbstractException> function = cacheFunction.get(cls.toString());
            if (function != null) {
                return applyMessage(function, message);
            }
            function = MethodAccessor.createConstruct(cls);
            cacheFunction.putIfAbsent(cls.toString(), function);
            return applyMessage(function, message);
        } catch (Throwable throwable) {
            throw new RuntimeException("获取cache exception异常", throwable);
        }
    }

    /**
     * 根据异常Class，动态通过LambdaMetafactory寻找构造函数
     *
     * @param cls 异常Class
     * @param <T> 异常Class类型
     * @return Function<String, AbstractException>
     */
    @SuppressWarnings("unchecked")
    public static <T> Function<String, AbstractException> createConstruct(Class<T> cls) {
        try {
            MethodHandle methodHandle = lookup.findConstructor(cls, methodType);
            CallSite site = LambdaMetafactory.metafactory(
                    lookup,
                    "apply",
                    MethodType.methodType(Function.class),
                    methodHandle.type().generic(),
                    methodHandle,
                    methodHandle.type());
            return (Function<String, AbstractException>) site.getTarget().invokeExact();
        } catch (Throwable throwable) {
            logger.warn("LambdaMetafactory create construct异常:", throwable);
            throw new RuntimeException(throwable);
        }
    }

    /**
     * 根据Function函数和异常message，调用对应构造函数方法
     *
     * @param function function函数
     * @param message  异常消息
     * @return AbstractException
     */
    public static AbstractException applyMessage(Function<String, AbstractException> function, String message) {
        try {
            return function.apply(message);
        } catch (Throwable throwable) {
            logger.warn("LambdaMetafactory function apply异常:", throwable);
            throw new RuntimeException(throwable);
        }
    }
}
```

压测分别对`直接new set`、`Lambda MethodHandle`、`无Lambda MethodHandle`、`反射`4种情况进行测试

测试结果、纳秒为单位，数值越小越快：

```java
Benchmark                                      Mode  Cnt     Score     Error  Units
MhExceptionBenchMark.MhExceptioTest.directNew  avgt   10  2421.192 ± 165.195  ns/op
MhExceptionBenchMark.MhExceptioTest.mhLamda    avgt   10  2589.443 ± 204.428  ns/op
MhExceptionBenchMark.MhExceptioTest.mhNoLamda  avgt   10  2664.148 ± 217.869  ns/op
MhExceptionBenchMark.MhExceptioTest.reflet     avgt   10  2710.181 ± 304.747  ns/op
```

#### 小结

可以看出在创建实例的场景下，其实mh无论是否lambda化，都与反射和原生方法差别不大。还会编写大量的`LambdaMetafactory`使用的代码。本质上是因为异常类实例化的消耗绝大多数在于堆栈收集上，仅仅是创建实例场景比较有限，优势也不会太明显。一个值得一读的异常性能文章是[^9][exceptional-performance](https://shipilev.net/blog/2014/exceptional-performance/)。值得注意的是，虽然本文的场景2中MethodHandle的性能并没有提高多少，但依据社区测试经验[^10]，大多数情况下，一个正确使用的MethodHandle在性能上依旧会比反射领先，可作为基础组件的不二之选。

### 参考文章

[^1]: <https://zhuanlan.zhihu.com/p/30936412>
[^2]: <https://stackoverflow.com/questions/19557829/faster-alternatives-to-javas-reflection>
[^3]: <https://www.optaplanner.org/blog/2018/01/09/JavaReflectionButMuchFaster.html>
[^4]: <https://zhuanlan.zhihu.com/p/84149346>
[^5]: <https://www.optaplanner.org/localized/zh/index.html>
[^6]: <https://stackoverflow.com/questions/28184065/java-8-access-private-member-with-lambda>
[^7]: <https://stackoverflow.com/questions/69068124/lambdametafactory-and-private-methods>
[^8]: <https://stackoverflow.com/questions/53675777/how-to-instantiate-an-object-using-lambdametafactory>
[^9]: <https://shipilev.net/blog/2014/exceptional-performance/>
[^10]: <https://stackoverflow.com/questions/19557829/faster-alternatives-to-javas-reflection>
