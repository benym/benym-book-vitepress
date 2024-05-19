---
title: Rpamis-security-原理解析
categories: 
  - 开源项目
  - Rpamis
  - Security
  - Mybatis
  - Plugin
  - 加解密
  - 脱敏
  - 数据安全
tags: 
  - 开源项目
  - Rpamis
  - Mybatis
  - Plugin
  - 加解密
  - 脱敏
  - Security
  - 原理解析
author: 
  name: benym
  link: https://github.com/benym
date: 2023-12-13 16:00:41
permalink: /pages/1ffe0d/
---
## 核心组件

[rpamis-security](https://github.com/rpamis/rpamis-security)<Badge text="1.0.1"/>主要通过`Mybatis-Plugin`及`AOP`切面实现安全功能，其主要组件如下图所示

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-security-arch.jpg" />
:::

## Mybatis插件前置知识

在`Mybatis`中预留有`org.apache.ibatis.plugin.Interceptor`接口，通过实现该接口，开发者能够对`Mybatis`的执行流程进行拦截

```java
public interface Interceptor {
    Object intercept(Invocation var1) throws Throwable;

    default Object plugin(Object target) {
        return Plugin.wrap(target, this);
    }

    default void setProperties(Properties properties) {
    }
}
```

三个方法的解释通常为

- **【intercept】**：插件执行的具体流程，传入的`Invocation`是`MyBatis`对被代理的方法的封装。
- **【plugin】**：使用当前的`Interceptor`创建代理，通常的实现都是`Plugin.wrap(target, this)`，`wrap`方法内使用`jdk`创建动态代理对象。
- **【setProperties】**：参考下方代码，在`MyBatis`配置文件中配置插件时可以设置参数，在`setProperties`函数中调用`Properties.getProperty("param1")`方法可以得到配置的值。

```java
<plugins>
    <plugin interceptor="com.xx.xx.xxxInterceptor">
        <property name="param1" value="value1"/>
    </plugin>
</plugins>
```

### 插件原理

项目在启动时，`Mybatis`的`org.apache.ibatis.builder.xml.XMLConfigBuilder#parseConfiguration`方法内的`pluginElement`方法会解析配置文件中的`plugins`节点

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-se1.png" />
:::

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-se2.png" />
:::

之后`configuration`的`addInterceptor`方法会将拦截器加入到拦截器链中

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-se3.png" style="zoom:70%;" />
:::

在执行`SQL`时，所有的插件都会依次执行

对于一个`Mybatis`的操作而言，其能够被代理的几个概念为

- **【Executor】**: 真正执行`SQL`语句的对象，调用`sqlSession`的方法时，本质上都是调用`executor`的方法，还负责获取`connection`，创建`StatementHandler`。
- **【StatementHandler】**: 创建并持有`ParameterHandler`和`ResultSetHandler`对象，操作`JDBC`的`statement`与进行数据库操作。
- **【ParameterHandler】**: 处理入参，将`Java`方法上的参数设置到被执行语句中。
- **【ResultSetHandler】**: 处理`SQL`语句的执行结果，将返回值转换为`Java`对象。

执行顺序由前到后

可以配合对应注解实现对不同阶段不同执行方法的拦截

```java
@Intercepts({ @Signature(type = Executor.class, method = "update", args = { MappedStatement.class, Object.class }),
        @Signature(type = Executor.class, method = "query", args = { MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class }) })
```

比如这里是在`Executor`阶段对`update`和`query`方法进行拦截

### 普通SQL加密插件-MybatisEncryptInterceptor

对于一个基本的字段加密功能，可如网络中常见的教程一样，拦截`ParameterHandler`阶段的`setParameters`方法，因为此时正是处理`Java`参数和执行语句的时间

本项目也采用了这种处理方式

1. 首先获取真正需要处理的对象，并从中获取对应的参数

```java
if (!(invocation.getTarget() instanceof ParameterHandler)) {
    return invocation.proceed();
}
ParameterHandler statementHandler = PluginUtils.realTarget(invocation.getTarget());
MetaObject metaObject = SystemMetaObject.forObject(statementHandler);
// 如果是select操作，或者mybatis-plus的@SqlParser(filter = true)跳过该方法解析，不进行验证
MappedStatement mappedStatement = (MappedStatement) metaObject.getValue("mappedStatement");
if (SqlCommandType.SELECT.equals(mappedStatement.getSqlCommandType())) {
    return invocation.proceed();
}
ParameterHandler parameterHandler = (ParameterHandler) invocation.getTarget();
Object parameterObject = parameterHandler.getParameterObject();
if (Objects.isNull(parameterObject)) {
    return invocation.proceed();
}
```

2. 对于返回值是`List`和`Map`类型且包含`Mybatis-Plus`实体`key`的进行通用加密处理

```java
// mybatis对于List类型的处理，底层默认为Map类型
if (parameterObject instanceof Map) {
    Map<String, Object> parameterObjectMap = (Map<String, Object>) parameterObject;
    // 如果不包含mybatis-plus的实体key
    if (parameterObjectMap.containsKey(Constants.ENTITY)) {
        Object entity = parameterObjectMap.get(Constants.ENTITY);
        if (entity != null) {
            // 深拷贝复制
            Object deepCloneEntity = SerializationUtils.deepClone(entity);
            if (Objects.nonNull(deepCloneEntity)) {
                // 进行加密
                Object encryptObject = securityResolver.encryptFiled(deepCloneEntity);
                parameterObjectMap.put(Constants.ENTITY, encryptObject);
            }
        }
    }
}
```

通常而言`SQL`的返回值可分为`List`、`Map`、`DO实体`、`Page`对象等，其中`Mybatis`会将`List`最终转化为`Map`进行处理。

3. 对于返回值是非`List`和`Map`的类型，获取`ParameterHandler`中的`parameterObject`字段，进行通用加密处理

```java
else {
    // mybatis处理
    Object deepCloneEntity = SerializationUtils.deepClone(parameterObject);
    if (Objects.nonNull(deepCloneEntity)) {
        Field field = parameterHandler.getClass().getDeclaredField("parameterObject");
        field.setAccessible(true);
        field.set(parameterHandler, deepCloneEntity);
        // 进行加密
        Object encryptObject = securityResolver.encryptFiled(deepCloneEntity);
    }
}
```

通用加密处理过程如图所示

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-security-encrypt.png" />
:::

对于任意需要解析的实体，我们需要寻找实体内所有被`@SecurityField`注解标记的字段

通常这个过程是自底向上的，即已知实体，搜索实体内所有的字段`Filed`，并过滤出被标记的字段

在项目中具体的实现过程为

`com.rpamis.security.starter.utils.FieldUtils#getAllFields`

```java
/**
 * 获取包括父类所有的属性
 *
 * @param sourceObject 源对象
 * @return Field[]
 */
public static Field[] getAllFields(Object sourceObject) {
    // 获得当前类的所有属性(private、protected、public)
    List<Field> fieldList = new ArrayList<>();
    Class<?> tempClass = sourceObject.getClass();
    String objString = "java.lang.object";
    // 当父类为null的时候说明到达了最上层的父类(Object类).
    while (tempClass != null && !tempClass.getName().toLowerCase().equals(objString)) {
        fieldList.addAll(Arrays.asList(tempClass.getDeclaredFields()));
        // 得到父类,然后赋给自己
        tempClass = tempClass.getSuperclass();
    }
    Field[] fields = new Field[fieldList.size()];
    fieldList.toArray(fields);
    return fields;
}
```

`com.rpamis.security.starter.utils.SecurityResolver#getParamsFields`

```java
/**
 * 获取原始实体内所有被SecurityField标记的Field
 *
 * @param params SecurityField
 * @return List<Field>
 */
private List<Field> getParamsFields(Object params) {
    return Arrays.stream(FieldUtils.getAllFields(params))
            .filter(field -> Objects.nonNull(field.getAnnotation(SecurityField.class)))
            .collect(Collectors.toList());
}
```

同时考虑到解析效率问题，加解密注解处理者还持有`被解析对象Class->对应标记字段Filed列表的缓存`，实体完成一次解析之后，后续无需再进行加解密字段搜索

之后则是对需要加密的实体进行加密算法处理，并进行反射赋值

```java
/**
 * 处理加密-单一实体
 *
 * @param sourceParam   源对象
 * @param encryptFields 需要加密字段集合
 * @return Object
 */
private Object processEncrypt(Object sourceParam, List<Field> encryptFields) {
    if (!REFERENCE_SET.contains(sourceParam.hashCode())) {
        for (Field field : encryptFields) {
            ReflectionUtils.makeAccessible(field);
            Object sourceObject = ReflectionUtils.getField(field, sourceParam);
            // 目前只支持String
            if (!(sourceObject instanceof String)) {
                continue;
            }
            String encryptedString = securityAlgorithm.encrypt(String.valueOf(sourceObject));
            ReflectionUtils.setField(field, sourceParam, encryptedString);
            REFERENCE_SET.add(sourceParam.hashCode());
        }
    }
    return sourceParam;
}
```

### 动态SQL加密插件-MybatisDynamicSqlEncryptInterceptor

普通`SQL`加密插件很好的解决的大部分`Mybatis`和`Mybatis-Plus`的加密需求，但对于动态`SQL`光靠上述的方法是无法解决的，因为动态`SQL`的解析时机在`ParameterHandler`之前，`Mybatis`需要将动态标签解析为静态`SQL`，这一步操作是在`Executor`调用`StatementHandler.parameterize()`前做的，由`MappedStatementHandler.getBoundSql(Object parameterObject)`函数解析动态标签，生成静态`SQL`语句。由于执行阶段早，此时静态`SQL`已经生成，后续再拦截`StatementHandler`和`ParameterHandler`中处理`parameterObject`进行加密都是无效的。

一个典型的动态`SQL`如下

```xml
<insert id="batchInsertWithList" useGeneratedKeys="true" keyProperty="id">
    insert into test_version(id,name,id_card,
    phone,version)
    values
    <foreach collection="testVersionDOList" item="testVersion" separator=",">
        (#{testVersion.id,jdbcType=NUMERIC},#{testVersion.name,jdbcType=VARCHAR},#{testVersion.idCard,jdbcType=VARCHAR},
        #{testVersion.phone,jdbcType=VARCHAR},#{testVersion.version,jdbcType=NUMERIC})
    </foreach>
</insert>
```

所以对于动态`SQL`的加密，只能选择拦截`Executor`的`update`和`query`方法

```java
@Intercepts({
        @Signature(type = Executor.class, method = "update", args = {MappedStatement.class, Object.class}),
//        对于select请求不做处理，通常加密字段无法进行模糊查询，只能外部进行手动加密后进行等值查询，符合逻辑
//        @Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class})
})
```

同样的

1. 首先获取需要处理的对象

```java
// 获取拦截器拦截的设置参数对象DefaultParameterHandler
final Object[] args = invocation.getArgs();
Object parameterObject = args[1];
if (Objects.isNull(parameterObject)) {
    return invocation.proceed();
}
```

2. 对于`List`和`Map`，底层统一为`Map`，进行通用加密处理，不进行深拷贝

```java
// 如果为mybatis foreach用法，外部为List入参，内部统一处理为Map
if (parameterObject instanceof Map) {
    Map<String, Object> parameterObjectMap = (Map<String, Object>) parameterObject;
    for (Map.Entry<String, Object> paramObjectEntry : parameterObjectMap.entrySet()) {
        Object value = paramObjectEntry.getValue();
        if (value != null) {
            // 此处不能进行深拷贝复制，因为新增后id的回填需要上下文同一个对象引用
            // 详情可见org.apache.ibatis.executor.statement.PreparedStatementHandler.update
            // 进行加密
            Object encryptObject = securityResolver.encryptFiled(value);
            parameterObjectMap.put(paramObjectEntry.getKey(), encryptObject);
        }
    }
    invocation.getArgs()[1] = parameterObjectMap;
}
return invocation.proceed();
```

加密过程和上文一致，区别在于此时不能进行深拷贝

原因是因为`Mybatis`在新增数据后有一个回填`id`的功能，其功能实现在`org.apache.ibatis.executor.statement.PreparedStatementHandler#update`

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-se4.png" />
:::

其中`KeyGenerator`将对静态`SQL`的新增实体回填`id`，此时的新增实体`parameterObject`和需要加密的实体是同一个，如果进行深拷贝，则加密对象为另外的一个实体，而此时`id`回填的为原始实体，由于原始实体已经不再使用，出参为加密实体，将造成回填`id`失效

虽然动态`SQL`并未进行深拷贝，但其执行阶段在普通`SQL`加密插件之前，后续经过普通`SQL`加密插件后，仍然能够进行深拷贝，以确保加密对象不对原始对象引用进行修改，这也是组件将动态`SQL`和普通`SQL`分离为`2`个插件的原因

### 解密插件-MybatisDecryptInterceptor

解密需要拦截`ResultSetHandler`阶段，此时是将`SQL`执行的真实结果转化为`Java`对象的时机

```java
@Intercepts({
        @Signature(type = ResultSetHandler.class, method = "handleResultSets",
                args = {Statement.class})
})
```

本质也和加密过程差不多，核心代码为

```java
/**
 * 对字段进行解密
 *
 * @param params params
 * @return Object
 */
public Object decryptFiled(Object params) {
    if (Objects.isNull(params)) {
        return null;
    }
    // 此处没有并发问题，只是为了通过stream的lambda编译
    AtomicReference<Class<?>> clazz = new AtomicReference<>();
    AtomicReference<Object> object = new AtomicReference<>();
    // 解析返回值为List的
    if (params instanceof List) {
        List<?> sourceList = (List<?>) params;
        if (CollectionUtils.isEmpty(sourceList)) {
            return params;
        }
        sourceList.stream().filter(Objects::nonNull)
                .findFirst()
                .ifPresent(source -> {
                    clazz.set(source.getClass());
                    object.set(source);
                });
    } else {
        clazz.set(params.getClass());
        object.set(params);
    }
    if (null == clazz.get()) {
        return params;
    }
    List<Field> decryptFields = getParamsFields(object.get());
    if (!CollectionUtils.isEmpty(decryptFields)) {
        List<?> paramsList;
        if (params instanceof List) {
            paramsList = (List<?>) params;
        } else {
            paramsList = Collections.singletonList(params);
        }
        return processDecrypt(paramsList, decryptFields);
    }
    return params;
}
```

### 脱敏切面

脱敏需求采用`AOP`+自定义注解的方式实现

组件在设计时没有直接采用`@Aspect`注解的切面形式，而是采用`Advisor+Aspect+Interceptor`的`Aop`形式，目的是为了在自动注入时更好的控制切面的注入，同时预留可扩展式切点，让用户自行定义脱敏切面切点

如`DesensitizationAdvisor`中，默认切点为`@annotation(com.rpamis.security.annotation.Desensitizationed)`

#### 如何寻找所有需要脱敏字段

脱敏需求的核心诉求在于，对于任意类型的实体，只要实体内有被脱敏注解标记的类，都需要进行脱敏处理，其中包含了嵌套脱敏等。

所以如何获得任意实体的所有需要脱敏的字段是需要解决的首要任务

#### 递归法

寻找一个对象中所有包含`XXX`自定义脱敏注解的方法，通常能够快速想到递归处理

基本的伪代码如下

```java
public static List<Field> findAnnotatedFields(Object obj, Class<? extends Annotation> annotationClass) {
    List<Field> annotatedFields = new ArrayList<>();
    Class<?> clazz = obj.getClass();
    Field[] fields = clazz.getDeclaredFields();

    for (Field field : fields) {
        if (field.isAnnotationPresent(annotationClass)) {
            annotatedFields.add(field);
        }
        // 如果字段是一个嵌套的对象，则递归处理
        if (!field.getType().isPrimitive() && !field.getType().isAssignableFrom(String.class)
                && !field.getType().isEnum()) {
            field.setAccessible(true);
            try {
                Object nestedObject = field.get(obj);
                if (nestedObject != null) {
                    // 递归处理
                    annotatedFields.addAll(findAnnotatedFields(nestedObject, annotationClass));
                }
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            }
        }
    }
    return annotatedFields;
}
```

递归能够很快速的写出最简要的核心逻辑，但需要防止`OOM`的发生，同时在递归处理时需要考虑解析的对象类型，比如解析的对象是`List`、`Map`、`Enum`、`Array`需要的处理可能是不一样的，在考虑这种情况下进行递归代码很可能变成

```java
for (Field field : fields) {
    if (field == null) {
        continue;
    }
    field.setAccessible(true);
    Object value = field.get(javaBean);
    if (null != value) {
        Class<?> type = value.getClass();
        if (type.isArray()) {
            replaceArray(referenceCounter, value);
        } else if (value instanceof Collection<?>) {
            if (replaceCollection(referenceCounter, (Collection<?>) value)) {
                condition = true;
            }
        } else if (value instanceof Map<?, ?>) {
            Map<?, ?> m = (Map<?, ?>) value;
            Set<?> set = m.entrySet();
            for (Object o : set) {
                Map.Entry<?, ?> entry = (Map.Entry<?, ?>) o;
                Object mapVal = entry.getValue();
                if (isNotGeneralType(mapVal.getClass(), mapVal, referenceCounter)) {
                    stack.push(mapVal);
                }
            }
        } else if (value instanceof Enum<?>) {
            condition = true;
        } else {
            if (isNotJdkAndBaseType(referenceCounter, field, value, type)) {
                Field[] nestedFields = ObjectUtils.getAllFields(value);
                boolean nestedReplaced = replace(nestedFields, value, referenceCounter);
                if (nestedReplaced) {
                    condition = true;
                }
            }
        }
    }
```

这使得递归代码核心逻辑不清晰，且递归退出条件夹在各种类型处理过程中，对于任意需要进行拓展的处理类型，需要改动核心代码，整个组件将随着迭代变得很难维护

#### 迭代法

基于递归法的缺点，利用`Queue`迭代是个容易想到的解决方法

改进后的迭代法伪代码如下

```java
Deque<Object> stack = new ArrayDeque<>();
stack.push(obj);

while (!stack.isEmpty()) {
    Object currentObj = stack.pop();

    Class<?> clazz = currentObj.getClass();
    Field[] fields = clazz.getDeclaredFields();

    for (Field field : fields) {
        if (field.isAnnotationPresent(annotationClass)) {
            maskField(currentObj, field);
        }

        if (!field.getType().isPrimitive() && !field.getType().isAssignableFrom(String.class)
                && !field.getType().isEnum()) {
            field.setAccessible(true);
            try {
                Object nestedObject = field.get(currentObj);
                if (nestedObject != null) {
                    stack.push(nestedObject);
                }
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            }
        }
    }
}
```

对于需要解析的对象，首先加入队列中，之后每发现一个需要脱敏的`Field`就将他放入队列，外层通过队列判空作为循环条件

同时，基于可拓展性的需要，组件定义了`FieldProcess`和`TypeHandler`，其中`FieldProcess`主要有`3`个实现类

- `DataMaskingProcessor`：用于处理非泛型的，带有`@Masked`注解的实体
- `NestedMaskingProcessor`：用于处理非泛型的，带有`@NestedMasked`注解的实体
- `MaskingResponseProcessor`：用于处理所有带泛型的实体

执行顺序由上到下，每个均会执行

同时每个`Processor`中都会经过`TypeHandler`处理，`TypeHandler`主要有`4`个实现类

- `ArrayTypeHandler`：用于特殊处理`Array`类型的数据
- `CollectionTypeHandler`：用于特殊处理`Collection`类型的数据
- `MapTypeHandler`：用于特殊处理`Map`类型的数据
- `OtherTypeHandler`：用于处理自定义的实体或其他非`Java`提供的类型数据

执行顺序同样从上到下，如果有一个能够处理，则后续不会执行

基于改进后的脱敏处理核心逻辑为

```java
/**
 * 将源对象进行脱敏返回
 *
 * @param sourceObject 源对象
 * @return Object
 */
@SuppressWarnings("all")
public static Object processObjectAndMask(Object sourceObject) throws IllegalAccessException {
    if (sourceObject == null) {
        return null;
    }
    Set<Integer> referenceSet = new HashSet<>();
    // 解析队列
    Deque<Object> analyzeDeque = new ArrayDeque<>();
    analyzeDeque.offer(findActualMaskObject(sourceObject));
    MaskFunctionFactory maskFunctionFactory = new MaskFunctionFactory();
    while (!analyzeDeque.isEmpty()) {
        Object currentObj = analyzeDeque.poll();
        Field[] fields = FieldUtils.getAllFields(currentObj);
        for (Field field : fields) {
            field.setAccessible(true);
            // 获取当前对象的对应的Field的值
            Object fieldValue = field.get(currentObj);
            if (null != fieldValue) {
                Class<?> fieldValueClass = fieldValue.getClass();
                ProcessContext processContext = new ProcessContext(currentObj, fieldValue, field,
                        fieldValueClass, referenceSet, HANDLER_LIST, analyzeDeque);
                processContext.setMaskFunctionFactory(maskFunctionFactory);
                // 字段解析并脱敏
                for (FieldProcess fieldProcess : PROCESS_LIST) {
                    fieldProcess.processField(processContext);
                }
            }
        }
    }
    return sourceObject;
}
```

`findActualMaskObject`

是对`HashMap`对象的特殊处理

```java
/**
 * 找到真正需要Mask的Object，针对HashMap处理
 * 因为HashMap的key value属于静态内部类HashMap.Node
 * 这个对象判断isArray时为true，单独判断是否为HashMap.Node将无法通过编译
 * 导致后续脱敏处理失效
 *
 * @param sourceObject 源对象
 * @return Object
 */
private static Object findActualMaskObject(Object sourceObject) {
    if (sourceObject instanceof HashMap) {
        return ((HashMap<?, ?>) sourceObject).values();
    }
    return sourceObject;
}
```

这里之所以要前置处理是为了避免后续获取真实处理Field时，获取到了内部类的`HashMap.Node`，避免无法通过编译导致脱敏失败，这个条件的诞生是基于单测时的发现(也侧面说明一个组件的完善，单测是多么的重要)

其中`PROCESS_LIST`和`HANDLER_LIST`为

```java
/**
 * Filed处理者list
 */
private static final List<FieldProcess> PROCESS_LIST = new ArrayList<>();

/**
 * 类型处理者list
 */
private static final List<TypeHandler> HANDLER_LIST = new ArrayList<>();

/**
 * 必要处理者初始化
 */
static {
    PROCESS_LIST.add(new MaskingResponseProcessor());
    PROCESS_LIST.add(new NestedMaskingProcessor());
    PROCESS_LIST.add(new DataMaskingProcessor());
    HANDLER_LIST.add(new ArrayTypeHandler());
    HANDLER_LIST.add(new CollectionTypeHandler());
    HANDLER_LIST.add(new MapTypeHandler());
    HANDLER_LIST.add(new OtherTypeHandler());
}
```

对于需要脱敏的对象比如`List`

他在获取所有`Field`之后其实不是想象中的那样返回了认识的脱敏字段，而是返回了一堆`List`的属性，如图所示

::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/rpas/rpamis-se5.png" />
:::

这其中真正的数据在`fileds[4]`的`elementData`中，其他都是不必要的取值，因此所有的类型处理器都需要判断当前处理的对象是否是真正要处理的对象

那么应该怎么做呢？

答案是`com.rpamis.security.starter.utils.MaskAnnotationResolver#isNotBaseType`

```java
/**
 * 是否不是基础类型，或已经解析过
 *
 * @param clazz            当前Class
 * @param element          当前对象元素
 * @param referenceCounter 防重set
 * @return boolean
 */
public static boolean isNotBaseType(Class<?> clazz, Object element, Set<Integer> referenceCounter) {
    return !clazz.isPrimitive()
            && clazz.getPackage() != null
            && !clazz.isEnum()
            && !clazz.getPackage().getName().startsWith("java.")
            && !clazz.getPackage().getName().startsWith("javax.")
            && !clazz.getName().startsWith("java.")
            && !clazz.getName().startsWith("javax.")
            && referenceCounter.add(element.hashCode());
}
```

对于那些不需要处理的对象，他们都是`Java`本身自带的，判断是否是`Java`提供的类型或是否已经处理过就能够识别

以下实现类展示了`FieldProcess`和`TypeHandler`的基本处理

如`DataMaskingProcessor`

```java
public class DataMaskingProcessor implements FieldProcess {

    @Override
    @SuppressWarnings("all")
    public void processField(ProcessContext processContext) throws IllegalAccessException {
        Field field = processContext.getField();
        Object fieldValue = processContext.getFieldValue();
        Object currentObject = processContext.getCurrentObject();
        if (field.isAnnotationPresent(Masked.class)) {
            Masked annotation = field.getAnnotation(Masked.class);
            MaskFunctionFactory maskFunctionFactory = processContext.getMaskFunctionFactory();
            String maskValue = maskFunctionFactory.maskData(String.valueOf(fieldValue), annotation);
            field.set(currentObject, maskValue);
        }
    }
}
```

`DataMaskingProcessor`是真正去执行脱敏并进行赋值的处理类，而`NestedMaskingProcessor`和`MaskingResponseProcessor`是为了从能够处理的`TypeHandler`中获取需要脱敏的对象，并加入到迭代`Queue`中

```java
public class NestedMaskingProcessor implements FieldProcess {

    @Override
    public void processField(ProcessContext processContext) {
        Field field = processContext.getField();
        List<TypeHandler> handlerList = processContext.getHandlerList();
        // 如果字段被标记为需要嵌套脱敏
        if (field.isAnnotationPresent(NestedMasked.class)) {
            for (TypeHandler handler : handlerList) {
                boolean handleResult = handler.handle(processContext);
                if (handleResult) {
                    break;
                }
            }
        }
    }
}
```

```java
public class MaskingResponseProcessor implements FieldProcess {

    @Override
    public void processField(ProcessContext processContext) throws IllegalAccessException {
        List<TypeHandler> handlerList = processContext.getHandlerList();
        for (TypeHandler handler : handlerList) {
            boolean handleResult = handler.handle(processContext);
            if (handleResult) {
                break;
            }
        }
    }
}
```

由于各个`TypeHandler`仅是对不同类型进行解包处理，基础步骤类似

这里给出`ArrayTypeHandler`的实现便于理解

```java
public class ArrayTypeHandler implements TypeHandler {

    @Override
    public boolean handle(ProcessContext processContext) {
        Class<?> fieldValueClass = processContext.getFieldValueClass();
        Object fieldValue = processContext.getFieldValue();
        Set<Integer> referenceSet = processContext.getReferenceSet();
        Deque<Object> analyzeDeque = processContext.getAnalyzeDeque();
        if (fieldValueClass.isArray()) {
            int length = Array.getLength(fieldValue);
            for (int i = 0; i < length; i++) {
                Object arrayObject = Array.get(fieldValue, i);
                if (null != arrayObject && MaskAnnotationResolver.isNotBaseType(arrayObject.getClass(), arrayObject, referenceSet)) {
                    analyzeDeque.offer(arrayObject);
                }
            }
            return true;
        }
        return false;
    }
}
```

通常而言组件已经能够处理多种类型，如不满足需求，可以拓展`FieldProcess`和`TypeHandler`即可完成其他类型处理
