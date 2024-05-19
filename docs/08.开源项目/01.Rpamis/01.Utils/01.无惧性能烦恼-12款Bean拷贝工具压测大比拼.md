---
title: 无惧性能烦恼-12款Bean拷贝工具压测大比拼
date: 2022-11-17 23:06:41
categories: 
  - 开源项目
  - Rpamis
tags:
  - 开源项目
  - Rpamis
  - 工具类
  - BeanUtil
  - 压测
  - JMH
permalink: /pages/3147fe/
author: 
  name: benym
  link: https://github.com/benym
---

## 背景

在开发过程中，我们通常会用到DO、DTO、VO、PO等对象，一般来说这些对象之间的字段具有一定的相似性。在进行对象转换时，除了手动get/set之外，开发者大概率会使用到类似BeanUtils等对象拷贝工具类。由于许多拷贝工具类性能低下，开发者经常在工具类没有进行选型的情况下引入项目，造成了开发社区或公司对这类工具类使用时有了更多的性能担忧。在前期的调研当中，也有类似于本文的比较，大多数使用循环/StopWatch/计算执行时间等形式衡量，少数文章采用了压测的方法。这类评价方式，能反应出一定的性能问题，但通常实验做的不够严谨准确。

本文将对比市面上10款常见拷贝工具+1款基本封装的个人工具+1原生get/set方法，采用JMH进行公平性压测比较。以此让我们对工具类有一个清晰的对比，选择出合适的工具类。

实验代码 [https://github.com/benym/benchmark-test](https://github.com/benym/benchmark-test)

## 对比方法

 - `get/set`: 原生get/set
 - `RpamisBeanUtils`: 基于Cglib BeanCopier+ConcurrentReferenceHashMap封装、基于ASM字节码拷贝原理
 - `MapStruct`: 编译器生成get/set
 - `BeanCopier`: 原生Cglib BeanCopier、基于ASM字节码拷贝原理
 - `JackSon`: Spring官方JackSon序列化工具ObjectMapper
 - `FastJson`: Alibaba Json序列化工具
 - `Hutool BeanUtil`: Hutool提供的BeanUtil工具
 - `Hutool CglibUtil`: Hutool提供的Cglib工具、基于Cglib BeanCopier、ASM字节码拷贝
 - `Spring BeanUtils`: Spring官方提供的BeanUtils、基于反射
 - `Apache BeanUtils`: 基于反射
 - `Orkia`: 基于javassist类库生成Bean映射的字节码
 - `Dozer`: 基于反射、定制化属性映射、XML映射

## 实验设置

本次实验只针对各工具类最核心接口，为了进行公平性比较，测试时将对需要动态根据source、target创建拷贝对象的工具类(RpamisBeanUtils、MapStruct、BeanCopier、Jackson、Hutool BeanUtil、Hutool CglibUtil、Orkia、Dozer)进行实例缓存、同时对源数据进行缓存，尽可能展示核心拷贝接口的性能。实际上在日常开发过程中，开发者对于经常使用的工具类也会选择用static final修饰，或采用诸如Map等进行实例缓存。或许是碍于需要每个给对比工具类增加缓存操作的工作量，**在调研的文章中很少有考虑对实例进行缓存的操作**，造成比如BeanCopier实验效果和MapStruct差异过大等问题。

在JMH中我们可以通过`@State(Scope.Benchmark)`+`@Setup(Level.Trial)`注解轻松实现在基准测试开始前的缓存初始化

### 基准参数设置
实验环境

::: tip
实验过程中应确保CPU拉满切避免发生降频现象导致实验结果不准确，发压机器理论和压力测试机器不为同一个，这里为了简单起见，在本机上进行直接压测
:::

 - `jmhVersion` : `1.29`
 - `IntelliJ IDEA 2021.2.2`
 - `jdkVersion` : `1.8.0_351`
 - `CPU` : `Intel(R) Core(TM) i5-10600KF CPU @ 4.10GHz`
 - `Fork` : `1`, 对于每个Benchmark Fork出一个线程，避免实验数据倾斜
 - `BenchmarkModel` : `Mode.Throughput`, 采用吞吐量作为衡量指标
 - `Warmup` : `3`, JIT预热3次之后进入正式测试
 - `Measurement` : `iterations=10、time=5`, 每个Benchmark迭代10次，每次迭代5秒
 - `OutputTimeUnit` : `TimeUnit.MILLISECONDS`, 吞吐量时间单位ops/ms
 - `Threads` : `10`, 生成10个线程进行发压

### 实验对象

本次实验有2组对象
 - 简单类型对象DataBaseDO、DataBaseVO，简单类型仅有5个字段；
 - 复杂类型对象DbDO、DbVo、MockOne、MockTwo，复杂类型对象中包含108个字段，且字段中存在MockOne、MockTwo对象，在MockOne中包含其自身的嵌套子集`List<MockOne>`

## 实验结果

结果中Score表示测试的吞吐量，Error表示测试结果的平均差

 1. 程序运行结果
```java
简单对象
        
Benchmark                                 Mode  Cnt       Score     Error   Units
BenchmarkTestSimple.testApacheBeanUtils  thrpt   10    1014.681 ±   5.442  ops/ms
BenchmarkTestSimple.testBeanCopier       thrpt   10  341581.539 ± 668.458  ops/ms
BenchmarkTestSimple.testDozerMapping     thrpt   10    1444.746 ±   6.486  ops/ms
BenchmarkTestSimple.testFastJson         thrpt   10    9816.492 ±  64.882  ops/ms
BenchmarkTestSimple.testGetSet           thrpt   10  341429.391 ± 407.244  ops/ms
BenchmarkTestSimple.testHutoolBeanUtil   thrpt   10    1201.178 ±  14.053  ops/ms
BenchmarkTestSimple.testHutoolCglibUtil  thrpt   10  340730.983 ± 757.836  ops/ms
BenchmarkTestSimple.testJackSon          thrpt   10    7333.661 ±  36.987  ops/ms
BenchmarkTestSimple.testMapStruct        thrpt   10  341577.692 ± 487.573  ops/ms
BenchmarkTestSimple.testOrikaMapper      thrpt   10    2377.357 ±   3.422  ops/ms
BenchmarkTestSimple.testRpasBeanUtils    thrpt   10  340737.565 ± 774.559  ops/ms
BenchmarkTestSimple.testSpringBeanUtils  thrpt   10    1949.802 ±   2.807  ops/ms
```

```java
复杂对象

Benchmark                                  Mode  Cnt      Score     Error   Units
BenchmarkTestComplex.testApacheBeanUtils  thrpt   10     34.609 ±   0.405  ops/ms
BenchmarkTestComplex.testBeanCopier       thrpt   10  24113.092 ± 127.129  ops/ms
BenchmarkTestComplex.testDozerMapping     thrpt   10     96.133 ±   0.676  ops/ms
BenchmarkTestComplex.testFastJson         thrpt   10    226.692 ±   1.215  ops/ms
BenchmarkTestComplex.testGetSet           thrpt   10  24200.668 ±  43.997  ops/ms
BenchmarkTestComplex.testHutoolBeanUtil   thrpt   10     68.630 ±   0.161  ops/ms
BenchmarkTestComplex.testHutoolCglibUtil  thrpt   10  24147.446 ±  80.792  ops/ms
BenchmarkTestComplex.testJackSon          thrpt   10    256.080 ±   2.660  ops/ms
BenchmarkTestComplex.testMapStruct        thrpt   10  24111.832 ± 100.456  ops/ms
BenchmarkTestComplex.testOrikaMapper      thrpt   10   1775.526 ±   1.818  ops/ms
BenchmarkTestComplex.testRpasBeanUtils    thrpt   10  24109.377 ± 160.851  ops/ms
BenchmarkTestComplex.testSpringBeanUtils  thrpt   10     94.354 ±   0.694  ops/ms
```
 2. 数值可视化 

**简单对象**
::: center
![image-20221117225232188](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/image-20221117225232188.png)
:::

从实验结果中我们可以看出`BeanCopier`、`MapStruct`和原生`get/set`效率类似，吞吐量都很接近。

对于本文封装的`RpamisBeanUtils`以及热门的`Hutool CglibUtil`，两者效率近似，同时也离`get/set`很接近，本质上这两款均基于BeanCopier封装，其主要性能损耗在弱引用的`Map`缓存上。

同时以上4款工具，在平均差的表现也相对稳定。

对于知名的2组JSON工具类，由于其本身定位不为高频Bean拷贝而设计，所以2者的效率对比前者差出好几倍。`FastJson`在这种场景下也明显快于`Jackson`。

`Orika`虽然采用了字节码技术，但由于其是深拷贝，需要创建新对象的原因，其效率也不尽人意。

其余的知名解决方案`SpringBeanUtils`、`Dozer`、`ApacheBeanUtils`由于采用反射+深拷贝的原因，其效率严重低下。

`Hutool`零依赖自研的`BeanUtil`，在本轮测试结果中同样也存在效率低下的问题。

**复杂对象**

::: center
![image-20221117225323448](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/image-20221117225323448.png)
:::

不同于简单对象测试，对于复杂对象的拷贝尤其考验拷贝工具类的性能，毕竟在拷贝场景中，我们不仅仅只有简单的对象。更有嵌套、多字段、多类型等复杂情况。

从实验结果中可以看出在简单对象排名前5的工具，在复杂对象的拷贝场景下依旧经受住了考验，这5个之间的排名波动可以理解为测试结果的误差性。

继续往下观察，我们可以发现在上一轮实验中，表现比其他好的2组JSON工具类性能出现了明显的下滑，原本高于`JackSon`吞吐量的`FastJson`，在本轮测试中屈居后位。

而`Orika`却在复杂对象拷贝中稳定住了他的位置。

排名最后的4个工具依旧如简单对象拷贝排名类似，性能均很差。

 3. CPU频率图
::: center
![cpu](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/cpu.png)
:::

## 结论

通过两组不同类型的对象，我们对12款工具进行了压测实验，最后结果表示`BeanCopier`和`MapStruct`依旧是市场中最顶级的两款工具类，两者均拥有相同于原生`get/set`的性能，在使用时需要考虑使用缓存，两者均是高频Bean拷贝的工具首选。`Hutool CglibUtil`提供了开箱即用的基于`BeanCopier`的拷贝工具，如果没有特殊需求，又不想自己写工具类代码，也是强力的候选工具。如果`Hutool`提供的工具类满足不了项目，可以选择本文中`RpamisBeanUtils`，基于`Spring`的弱引用`ConcurrentReferenceHashMap`map，和缓存`Cglib BeanCopier`或`MapStruct`构建工具类，站在巨人的肩膀上，开发者也能快速的构建出适配项目且高性能的工具。同时在该场景下，我们应该避免使用其余基于反射、序列化等技术做出的工具，即使他们已经很出名。

## 附录

1. 如果你的拷贝类中`get/set`含有特殊操作，以上主流的5款高性能的拷贝工具均会无法拷贝对应字段的值，其本质上是由于拷贝本身依赖于干净的`get/set`方法。此时基于反射的工具，例如`SpringBeanUtils`能够对这种特殊操作的实体进行拷贝，本质上是因为反射拷贝不需要依赖`get/set`只需要反射获取字段动态赋值即可，但代价是性能十分低下。建议实体对象中，尽量不修改原始`get/set`，如有实体类特殊需求，采用和`get/set`生成方法不重名方法。 
2. 高性能拷贝的基石是浅拷贝，请确保拷贝后不再对源对象`source`进行修改，即**拷贝时机发生在必要的转换时**，如Controller层返回给前端VO，数据库层对象DO出库给各个接口使用返回DTO，因为源对象`source`的赋值改变会引起目标对象`target`的值变化，拷贝时本身是传递实体引用，如有特殊深拷贝需要可以了解`MapStruct`的`@DeepClone`
3. BeanCopier和MapStruct都是顶尖的工具，在源对象`source`和目标对象`target`字段类型不同，但字段名相同时。可以采用BeanCopier的`Converter`定义转换规则，或采用MapStruct的`@mapping`注解。通常而言MapStruct更为强大，编译期生成get/set让人更加放心，但缺点就是基本的转换也需要写`interface`，而BeanCopier不需要这点，仅在特殊转换时需要写`Converter`。

压测核心代码

简单对象
```java
package com.benym.benchmark.test;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.extra.cglib.BeanCopierCache;
import com.alibaba.fastjson.JSON;
import com.benym.benchmark.test.interfaces.MapStructMapper;
import com.benym.benchmark.test.model.complex.DbDO;
import com.benym.benchmark.test.model.complex.DbVO;
import com.benym.benchmark.test.model.simple.DataBaseDO;
import com.benym.benchmark.test.model.simple.DataBaseVO;
import com.benym.benchmark.test.service.ModelService;
import com.benym.benchmark.test.utils.RpamisBeanUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.glasnost.orika.MapperFacade;
import ma.glasnost.orika.MapperFactory;
import ma.glasnost.orika.impl.DefaultMapperFactory;
import net.sf.cglib.beans.BeanCopier;
import org.dozer.DozerBeanMapper;
import org.mapstruct.factory.Mappers;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.results.format.ResultFormatType;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;
import org.springframework.beans.BeanUtils;

import java.util.concurrent.TimeUnit;

/**
 * 简单对象拷贝基准测试
 *
 * @author: benym
 */
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
     * 初始化Orika
     */
    @State(Scope.Benchmark)
    public static class OrikaMapper {
        MapperFactory mapperFactory;

        @Setup(Level.Trial)
        public void prepare() {
            mapperFactory = new DefaultMapperFactory.Builder().build();
        }
    }

    /**
     * 初始化Dozer
     */
    @State(Scope.Benchmark)
    public static class DozerMapper {
        DozerBeanMapper mapper;

        @Setup(Level.Trial)
        public void prepare() {
            mapper = new DozerBeanMapper();
        }
    }


    @State(Scope.Benchmark)
    public static class RpasBeanUtilsInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare() {
            copier = RpamisBeanUtils.getBeanCopierWithNoConverter(DataBaseDO.class, DataBaseVO.class);
        }
    }

    /**
     * 初始化BeanCopier
     */
    @State(Scope.Benchmark)
    public static class BeanCopierInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare() {
            copier = BeanCopier.create(DataBaseDO.class, DataBaseVO.class, false);
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
     * 初始化Objectmapper
     */
    @State(Scope.Benchmark)
    public static class ObjectMapperInit {
        ObjectMapper objectMapper;

        @Setup(Level.Trial)
        public void prepare() {
            objectMapper = new ObjectMapper();
        }
    }

    /**
     * 初始化hutool cglibUtil
     */
    @State(Scope.Benchmark)
    public static class HutoolCglibInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare(){
            copier = BeanCopierCache.INSTANCE.get(DataBaseDO.class, DataBaseVO.class, null);
        }
    }

    /**
     * get/set 基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
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
     * RpasBeanUtils基准测试
     *
     * @param generateModel source
     * @param init 初始化copier
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testRpasBeanUtils(GenerateModel generateModel, RpasBeanUtilsInit init) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        init.copier.copy(generateModel.dataBaseModel, dataBaseVO, null);
        return dataBaseVO;
    }

    /**
     * MapStruct基准测试
     *
     * @param generateModel source
     * @param init          初始化的mapper
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testMapStruct(GenerateModel generateModel, MapStructInit init) throws Exception {
        DataBaseVO dataBaseVO = init.mapStructMapper.copy(generateModel.dataBaseModel);
        return dataBaseVO;
    }

    /**
     * BeanCopier基准测试
     *
     * @param generateModel source
     * @param beanCopier    初始化的BeanCopier
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testBeanCopier(GenerateModel generateModel, BeanCopierInit beanCopier) throws Exception {
        BeanCopier copier = beanCopier.copier;
        DataBaseVO dataBaseVO = new DataBaseVO();
        copier.copy(generateModel.dataBaseModel, dataBaseVO, null);
        return dataBaseVO;
    }

    /**
     * Jackson objectMapper基准测试
     *
     * @param generateModel source
     * @param init          初始化的ObjectMapper
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testJackSon(GenerateModel generateModel, ObjectMapperInit init) throws Exception {
        String str = init.objectMapper.writeValueAsString(generateModel.dataBaseModel);
        DataBaseVO dataBaseVO = init.objectMapper.readValue(str, DataBaseVO.class);
        return dataBaseVO;
    }


    /**
     * FastJson基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testFastJson(GenerateModel generateModel) throws Exception {
        String str = JSON.toJSONString(generateModel.dataBaseModel);
        return JSON.parseObject(str, DataBaseVO.class);
    }

    /**
     * Hutool BeanUtil基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testHutoolBeanUtil(GenerateModel generateModel) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        BeanUtil.copyProperties(generateModel.dataBaseModel, dataBaseVO);
        return dataBaseVO;
    }


    /**
     * Hutool CglibUtil基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testHutoolCglibUtil(GenerateModel generateModel, HutoolCglibInit init) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        init.copier.copy(generateModel.dataBaseModel, dataBaseVO, null);
        return dataBaseVO;
    }

    /**
     * SpringBeanUtils基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testSpringBeanUtils(GenerateModel generateModel) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        BeanUtils.copyProperties(generateModel.dataBaseModel, dataBaseVO);
        return dataBaseVO;
    }

    /**
     * Apache BeanUtils基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testApacheBeanUtils(GenerateModel generateModel) throws Exception {
        DataBaseVO dataBaseVO = new DataBaseVO();
        org.apache.commons.beanutils.BeanUtils.copyProperties(dataBaseVO, generateModel.dataBaseModel);
        return dataBaseVO;
    }

    /**
     * Orika基准测试
     *
     * @param generateModel source
     * @param orikaMapper   初始化orika
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testOrikaMapper(GenerateModel generateModel, OrikaMapper orikaMapper) throws Exception {
        MapperFacade mapperFacade = orikaMapper.mapperFactory.getMapperFacade();
        DataBaseVO dataBaseVO = mapperFacade.map(generateModel.dataBaseModel, DataBaseVO.class);
        return dataBaseVO;
    }

    /**
     * Dozer基准测试
     *
     * @param generateModel source
     * @param dozerMapper   初始化dozer
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DataBaseVO testDozerMapping(GenerateModel generateModel, DozerMapper dozerMapper) throws Exception {
        DataBaseVO dataBaseVO = dozerMapper.mapper.map(generateModel.dataBaseModel, DataBaseVO.class);
        return dataBaseVO;
    }

    public static void main(String[] args) throws RunnerException {
        Options options = new OptionsBuilder()
                .include(BenchmarkTestSimple.class.getSimpleName())
                .result("result-simple.json")
                .resultFormat(ResultFormatType.JSON)
                .build();
        new Runner(options).run();
    }

}

```

复杂对象

```java
package com.benym.benchmark.test;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.extra.cglib.BeanCopierCache;
import com.alibaba.fastjson.JSON;
import com.benym.benchmark.test.interfaces.MapStructMapperComplex;
import com.benym.benchmark.test.model.complex.DbDO;
import com.benym.benchmark.test.model.complex.DbVO;
import com.benym.benchmark.test.model.simple.DataBaseVO;
import com.benym.benchmark.test.service.ModelService;
import com.benym.benchmark.test.utils.RpamisBeanUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.glasnost.orika.MapperFacade;
import ma.glasnost.orika.MapperFactory;
import ma.glasnost.orika.impl.DefaultMapperFactory;
import net.sf.cglib.beans.BeanCopier;
import org.dozer.DozerBeanMapper;
import org.mapstruct.factory.Mappers;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.results.format.ResultFormatType;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;
import org.springframework.beans.BeanUtils;

import java.util.concurrent.TimeUnit;

/**
 * 复杂对象拷贝基准测试
 *
 * @author: benym
 */
@Fork(1) // Fork 1个进程进行测试
@BenchmarkMode(Mode.Throughput) // 吞吐量
@Warmup(iterations = 3) // JIT预热
@Measurement(iterations = 10, time = 5) // 迭代10次,每次5s
@OutputTimeUnit(TimeUnit.MILLISECONDS) // 结果所使用的时间单位
@Threads(10) // 线程10个
public class BenchmarkTestComplex {
    /**
     * 作用域为本次JMH测试，线程共享
     * <p>
     * 初始化source数据集
     */
    @State(Scope.Benchmark)
    public static class GenerateModel {
        DbDO dbDo;

        // 初始化
        @Setup(Level.Trial)
        public void prepare() {
            dbDo = new ModelService().getComplex();
        }
    }

    /**
     * 初始化Orika
     */
    @State(Scope.Benchmark)
    public static class OrikaMapper {
        MapperFactory mapperFactory;

        @Setup(Level.Trial)
        public void prepare() {
            mapperFactory = new DefaultMapperFactory.Builder().build();
        }
    }

    /**
     * 初始化Dozer
     */
    @State(Scope.Benchmark)
    public static class DozerMapper {
        DozerBeanMapper mapper;

        @Setup(Level.Trial)
        public void prepare() {
            mapper = new DozerBeanMapper();
        }
    }

    @State(Scope.Benchmark)
    public static class RpasBeanUtilsInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare() {
            copier = RpamisBeanUtils.getBeanCopierWithNoConverter(DbDO.class, DbVO.class);
        }
    }

    /**
     * 初始化BeanCopier
     */
    @State(Scope.Benchmark)
    public static class BeanCopierInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare() {
            copier = BeanCopier.create(DbDO.class, DbVO.class, false);
        }
    }

    /**
     * 初始化MapStruct
     */
    @State(Scope.Benchmark)
    public static class MapStructInit {
        MapStructMapperComplex mapStructMapper;

        @Setup(Level.Trial)
        public void prepare() {
            mapStructMapper = Mappers.getMapper(MapStructMapperComplex.class);
        }
    }

    /**
     * 初始化Objectmapper
     */
    @State(Scope.Benchmark)
    public static class ObjectMapperInit {
        ObjectMapper objectMapper;

        @Setup(Level.Trial)
        public void prepare() {
            objectMapper = new ObjectMapper();
        }
    }

    /**
     * 初始化hutool cglibUtil
     */
    @State(Scope.Benchmark)
    public static class HutoolCglibInit {
        BeanCopier copier;

        @Setup(Level.Trial)
        public void prepare(){
            copier = BeanCopierCache.INSTANCE.get(DbDO.class, DbVO.class, null);
        }
    }

    /**
     * get/set 基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testGetSet(GenerateModel generateModel) throws Exception {
        DbVO DbVO = new DbVO();
        DbDO dbDo = generateModel.dbDo;
        DbVO.setAge(dbDo.getAge());
        DbVO.setName(dbDo.getName());
        DbVO.setTime(dbDo.getTime());
        DbVO.setYear(dbDo.getYear());
        DbVO.setMockModelOne(dbDo.getMockModelOne());
        DbVO.setMockModelTwo(dbDo.getMockModelTwo());
        DbVO.setOtherTime(dbDo.getOtherTime());
        DbVO.setField00(dbDo.getField00());
        DbVO.setField01(dbDo.getField01());
        DbVO.setField02(dbDo.getField02());
        DbVO.setField03(dbDo.getField03());
        DbVO.setField04(dbDo.getField04());
        DbVO.setField05(dbDo.getField05());
        DbVO.setField06(dbDo.getField06());
        DbVO.setField07(dbDo.getField07());
        DbVO.setField08(dbDo.getField08());
        DbVO.setField09(dbDo.getField09());
        DbVO.setField10(dbDo.getField10());
        DbVO.setField11(dbDo.getField11());
        DbVO.setField12(dbDo.getField12());
        DbVO.setField13(dbDo.getField13());
        DbVO.setField14(dbDo.getField14());
        DbVO.setField15(dbDo.getField15());
        DbVO.setField16(dbDo.getField16());
        DbVO.setField17(dbDo.getField17());
        DbVO.setField18(dbDo.getField18());
        DbVO.setField19(dbDo.getField19());
        DbVO.setField20(dbDo.getField20());
        DbVO.setField21(dbDo.getField21());
        DbVO.setField22(dbDo.getField22());
        DbVO.setField23(dbDo.getField23());
        DbVO.setField24(dbDo.getField24());
        DbVO.setField25(dbDo.getField25());
        DbVO.setField26(dbDo.getField26());
        DbVO.setField27(dbDo.getField27());
        DbVO.setField28(dbDo.getField28());
        DbVO.setField29(dbDo.getField29());
        DbVO.setField30(dbDo.getField30());
        DbVO.setField31(dbDo.getField31());
        DbVO.setField32(dbDo.getField32());
        DbVO.setField33(dbDo.getField33());
        DbVO.setField34(dbDo.getField34());
        DbVO.setField35(dbDo.getField35());
        DbVO.setField36(dbDo.getField36());
        DbVO.setField37(dbDo.getField37());
        DbVO.setField38(dbDo.getField38());
        DbVO.setField39(dbDo.getField39());
        DbVO.setField40(dbDo.getField40());
        DbVO.setField41(dbDo.getField41());
        DbVO.setField42(dbDo.getField42());
        DbVO.setField43(dbDo.getField43());
        DbVO.setField44(dbDo.getField44());
        DbVO.setField45(dbDo.getField45());
        DbVO.setField46(dbDo.getField46());
        DbVO.setField47(dbDo.getField47());
        DbVO.setField48(dbDo.getField48());
        DbVO.setField49(dbDo.getField49());
        DbVO.setField50(dbDo.getField50());
        DbVO.setField51(dbDo.getField51());
        DbVO.setField52(dbDo.getField52());
        DbVO.setField53(dbDo.getField53());
        DbVO.setField54(dbDo.getField54());
        DbVO.setField55(dbDo.getField55());
        DbVO.setField56(dbDo.getField56());
        DbVO.setField57(dbDo.getField57());
        DbVO.setField58(dbDo.getField58());
        DbVO.setField59(dbDo.getField59());
        DbVO.setField60(dbDo.getField60());
        DbVO.setField61(dbDo.getField61());
        DbVO.setField62(dbDo.getField62());
        DbVO.setField63(dbDo.getField63());
        DbVO.setField64(dbDo.getField64());
        DbVO.setField65(dbDo.getField65());
        DbVO.setField66(dbDo.getField66());
        DbVO.setField67(dbDo.getField67());
        DbVO.setField68(dbDo.getField68());
        DbVO.setField69(dbDo.getField69());
        DbVO.setField70(dbDo.getField70());
        DbVO.setField71(dbDo.getField71());
        DbVO.setField72(dbDo.getField72());
        DbVO.setField73(dbDo.getField73());
        DbVO.setField74(dbDo.getField74());
        DbVO.setField75(dbDo.getField75());
        DbVO.setField76(dbDo.getField76());
        DbVO.setField77(dbDo.getField77());
        DbVO.setField78(dbDo.getField78());
        DbVO.setField79(dbDo.getField79());
        DbVO.setField80(dbDo.getField80());
        DbVO.setField81(dbDo.getField81());
        DbVO.setField82(dbDo.getField82());
        DbVO.setField83(dbDo.getField83());
        DbVO.setField84(dbDo.getField84());
        DbVO.setField85(dbDo.getField85());
        DbVO.setField86(dbDo.getField86());
        DbVO.setField87(dbDo.getField87());
        DbVO.setField88(dbDo.getField88());
        DbVO.setField89(dbDo.getField89());
        DbVO.setField90(dbDo.getField90());
        DbVO.setField91(dbDo.getField91());
        DbVO.setField92(dbDo.getField92());
        DbVO.setField93(dbDo.getField93());
        DbVO.setField94(dbDo.getField94());
        DbVO.setField95(dbDo.getField95());
        DbVO.setField96(dbDo.getField96());
        DbVO.setField97(dbDo.getField97());
        DbVO.setField98(dbDo.getField98());
        DbVO.setField99(dbDo.getField99());
        DbVO.setField100(dbDo.getField100());
        return DbVO;
    }

    /**
     * RpasBeanUtils基准测试
     *
     * @param generateModel source
     * @param init 初始化copier
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testRpasBeanUtils(GenerateModel generateModel, RpasBeanUtilsInit init) throws Exception {
        DbVO dbVO = new DbVO();
        init.copier.copy(generateModel.dbDo, dbVO, null);
        return dbVO;
    }

    /**
     * MapStruct基准测试
     *
     * @param generateModel source
     * @param init          初始化的mapper
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testMapStruct(GenerateModel generateModel, MapStructInit init) throws Exception {
        DbVO DbVO = init.mapStructMapper.copy(generateModel.dbDo);
        return DbVO;
    }

    /**
     * BeanCopier基准测试
     *
     * @param generateModel source
     * @param beanCopier    初始化的BeanCopier
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testBeanCopier(GenerateModel generateModel, BeanCopierInit beanCopier) throws Exception {
        BeanCopier copier = beanCopier.copier;
        DbVO DbVO = new DbVO();
        copier.copy(generateModel.dbDo, DbVO, null);
        return DbVO;
    }

    /**
     * Jackson objectMapper基准测试
     *
     * @param generateModel source
     * @param init          初始化的ObjectMapper
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testJackSon(GenerateModel generateModel, ObjectMapperInit init) throws Exception {
        String str = init.objectMapper.writeValueAsString(generateModel.dbDo);
        DbVO dbVO = init.objectMapper.readValue(str, DbVO.class);
        return dbVO;
    }


    /**
     * FastJson基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testFastJson(GenerateModel generateModel) throws Exception {
        String str = JSON.toJSONString(generateModel.dbDo);
        return JSON.parseObject(str, DbVO.class);
    }

    /**
     * Hutool BeanUtil基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testHutoolBeanUtil(GenerateModel generateModel) throws Exception {
        DbVO DbVO = new DbVO();
        BeanUtil.copyProperties(generateModel.dbDo, DbVO);
        return DbVO;
    }

    /**
     * Hutool CglibUtil基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testHutoolCglibUtil(GenerateModel generateModel, HutoolCglibInit init) throws Exception {
        DbVO dbVO = new DbVO();
        init.copier.copy(generateModel.dbDo, dbVO, null);
        return dbVO;
    }

    /**
     * SpringBeanUtils基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testSpringBeanUtils(GenerateModel generateModel) throws Exception {
        DbVO DbVO = new DbVO();
        BeanUtils.copyProperties(generateModel.dbDo, DbVO);
        return DbVO;
    }

    /**
     * Apache BeanUtils基准测试
     *
     * @param generateModel source
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testApacheBeanUtils(GenerateModel generateModel) throws Exception {
        DbVO DbVO = new DbVO();
        org.apache.commons.beanutils.BeanUtils.copyProperties(DbVO, generateModel.dbDo);
        return DbVO;
    }

    /**
     * Orika基准测试
     *
     * @param generateModel source
     * @param orikaMapper   初始化orika
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testOrikaMapper(GenerateModel generateModel, OrikaMapper orikaMapper) throws Exception {
        MapperFacade mapperFacade = orikaMapper.mapperFactory.getMapperFacade();
        DbVO DbVO = mapperFacade.map(generateModel.dbDo, DbVO.class);
        return DbVO;
    }

    /**
     * Dozer基准测试
     *
     * @param generateModel source
     * @param dozerMapper   初始化dozer
     * @return target
     * @throws Exception
     */
    @Benchmark
    public DbVO testDozerMapping(GenerateModel generateModel, DozerMapper dozerMapper) throws Exception {
        DbVO DbVO = dozerMapper.mapper.map(generateModel.dbDo, DbVO.class);
        return DbVO;
    }

    public static void main(String[] args) throws RunnerException {
        Options options = new OptionsBuilder()
                .include(BenchmarkTestComplex.class.getSimpleName())
                .result("result-complex.json")
                .resultFormat(ResultFormatType.JSON)
                .build();
        new Runner(options).run();
    }

}

```
