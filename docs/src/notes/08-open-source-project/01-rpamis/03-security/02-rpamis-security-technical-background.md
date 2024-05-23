---
title: Rpamis-security-技术背景
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
author: 
  name: benym
  link: https://github.com/benym
date: 2023-11-29 14:55:41
permalink: /pages/c7a36a/
---

## 背景

企业数据安全一直是项目中需要重点关注的问题，自2021年《中华人民共和国数据安全法》发布以来，绝大多数大型企业都展开了自身项目的安全审查和整改，对于敏感数据要求加密存储、并支持脱敏显示，这样的述求在企业中日渐增多。

现有市面上加解密、脱敏组件开源项目众多，比较出名的有`Mybatis-plus`提供的`Mybatis-mate`组件，但很可惜代码是闭源、收费的，且根据实际使用不能够很好的支持嵌套脱敏，多种类型脱敏，动态SQL加解密的需求。此外，加解密和脱敏组件互相分离，虽然开源的组件众多，但几乎都是重复工作，仍然有很多待解决的问题需要完善，没有完整形成一个企业级数据安全解决方案。此类项目拥有知名度的极少，同时由于各个组件处理类型不全面，缺少必要的单测用例，进一步造成了不敢接入的问题。

基于上述情况，[rpamis-security](https://github.com/rpamis/rpamis-security)<Badge text="1.0.1"/>由此诞生，提供一站式加解密脱敏安全解决方案。

## 技术方案横向对比

### 基于Mybatis-TypeHandler的加解密方案

`Mybatis`提供了`BaseTypeHandler`，在这种方案中通常可以继承自`BaseTypeHandler`来实现加解密逻辑

样例代码如下

```java
public class EncryptTypeHandler<T> extends BaseTypeHandler<T> {
 
    @Resource
    private EncryptService encryptService;
 
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Object parameter, JdbcType jdbcType) throws SQLException {
        ps.setString(i, encryptService.encrypt((String)parameter));
    }
    
    @Override
    public T getNullableResult(ResultSet rs, String columnName) throws SQLException {
        String columnValue = rs.getString(columnName);
        return StrUtil.isBlank(columnValue) ? (T)columnValue : (T)encryptService.decrypt(columnValue);
    }
 
    @Override
    public T getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        String columnValue = rs.getString(columnIndex);
        return StrUtil.isBlank(columnValue) ? (T)columnValue : (T)encryptService.decrypt(columnValue);
    }
 
    @Override
    public T getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        String columnValue = cs.getString(columnIndex);
        return StrUtil.isBlank(columnValue) ? (T)columnValue : (T)encryptService.decrypt(columnValue);
    }
}
```

其中`EncryptService`是开发者自己实现的加解密`Service`

通常按需使用可以配合`Mybatis-plus`的注解，或者自定义注解，指定某个字段的`handler`

```java
@Data
public class TestVersionDO {
 
    private Long id;
    
    @TableField(typeHandler = EncryptTypeHandler.class)
    private String name;
    
    @TableField(typeHandler = EncryptTypeHandler.class)
    private String idCard;
    
    @TableField(typeHandler = EncryptTypeHandler.class)
    private String phone;
    
    @TableField(typeHandler = EncryptTypeHandler.class)
    private Integer version;
}
```

#### 方案缺点

这个方案在单独使用时看起来没有问题，但没有考虑如下2个问题：

1. 对于入库的实体，实体引用可能是会被再次使用的，在此方案中入库后实体字段就被加密数据覆盖了，导致后续对于该实体的操作均基于了加密数据
2. 对于动态`SQL`，该方法无法做到加解密
3. 每个字段都需要标注用哪个`Handler`，代码重复编写

对于第1个问题，样例为

```java
TestVersionDO testVersionDO = new TestVersionDO();
testVersionDO.setName("张三");
testVersionDO.setIdCard("500101111118181952");
testVersionDO.setPhone("18523578454");
testVersionMapper.insert(testVersionDO);
TestVersionDO selectResult = testVersionMapper.selectById(testVersionDO.getId());
String nameInDb = selectResult.getName();
Assert.isTrue("张三".equals(nameInDb), "数据库姓名校验失败");
// 同一上文对象
// 此时getName返回的是加密过后的“张三”
testVersionDO.getName();
```

对于第2个问题，样例为

`TestVersionMapper.xml`

```XML
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

此时`batchInsertWithList`为`xml`动态`SQL`拼接组成

```java
@PostMapping("/mb/insert/list")
public void insertListMb() {
    TestVersionDO testVersionDO = new TestVersionDO();
    testVersionDO.setName("王五");
    testVersionDO.setIdCard("500101111118181952");
    testVersionDO.setPhone("18523578454");
    TestVersionDO testVersionDO2 = new TestVersionDO();
    testVersionDO2.setName("李四");
    testVersionDO2.setIdCard("500101111118181953");
    testVersionDO2.setPhone("18523578456");
    List<TestVersionDO> testVersionDOList = new ArrayList<>();
    testVersionDOList.add(testVersionDO);
    testVersionDOList.add(testVersionDO2);
    // 此处新增后，数据库对应字段没有成功加密
    testVersionMapper.batchInsertWithList(testVersionDOList);
}
```

### 基于Mybatis-Plugin的加解密方案

`Mybatis`提供了`Interceptor`，可以通过编写插件的形式在持久层完成加解密

通常加密插件如

```java
@Intercepts({
        @Signature(type = ParameterHandler.class, method = "setParameters",
                args = PreparedStatement.class)
})
public class MybatisEncryptInterceptor implements Interceptor {
```

解密插件如

```java
@Intercepts({
        @Signature(type = ResultSetHandler.class, method = "handleResultSets",
                args = {Statement.class})
})
public class MybatisDecryptInterceptor implements Interceptor {
```

通常加解密插件还会结合自定义注解的方式来进行实现

#### 方案缺点

该方案的缺点和前一个方案一样，同样没有考虑上述2个问题

### 基于各种工具类的脱敏方案

这种方案可以是接入各种第三方脱敏工具包，或者自定义脱敏工具包，在代码中需要进行脱敏的地方进行手动脱敏

样例代码为

```java
public void mbSelectOne() {
    TestVersionDO testVersionDO = new TestVersionDO();
    testVersionDO.setName("张三");
    testVersionDO.setIdCard("500101111118181952");
    testVersionDO.setPhone("18523578454");
    testVersionMapper.insert(testVersionDO);
    TestVersionDO selectResult = testVersionMapper.selectByTestId(testVersionDO.getId());
    String name = selectResult.getName();
    // 脱敏
    String desensitized = DesensitizedUtil.desensitized(name, DesensitizedUtil.DesensitizedType.CHINESE_NAME);
    // 再赋值
    selectResult.setName(desensitized);
}
```

#### 方案缺点

该方案的缺点有如下2个

1. 手动脱敏，需要到处增加代码埋点
2. 对于复杂类型的脱敏如`List`，`Map`嵌套等，需要解析对应类型，重复编写脱敏代码

###  基于自定义Json序列化器的脱敏方案

由于`SpringBoot`、`SpringMVC`项目在请求返回时会自动进行序列化，所以采用自定义`Json`序列化器的方式是可行的，通常一个自定义的`Json`序列化器如下

```java
/**
 * 序列化器实现
 */
public class SecretJsonSerializer extends JsonSerializer<String> implements ContextualSerializer {
 
    private SecretStrategy secretStrategy;
 
    /**
     * 步骤一
     * 方法来源于ContextualSerializer，获取属性上的注解属性,同时返回一个合适的序列化器
     */
    @Override
    public JsonSerializer<?> createContextual(SerializerProvider serializerProvider, BeanProperty beanProperty) throws JsonMappingException {
        // 获取自定义注解
        SecretColumn annotation = beanProperty.getAnnotation(SecretColumn.class);
        // 注解不为空，且标注的字段为String
        if(Objects.nonNull(annotation) && Objects.equals(String.class, beanProperty.getType().getRawClass())){
            this.secretStrategy = annotation.strategy();
            // 符合自定义情况，返回本序列化器，将顺利进入到该类中的serialize（）方法中
            return this;
        }
        // 注解为空，字段不为String，寻找合适的序列化器进行处理
        return serializerProvider.findValueSerializer(beanProperty.getType(), beanProperty);
    }
 
    /**
     * 步骤二
     * 方法来源于JsonSerializer<String>：指定返回类型为String类型，serialize()将修改后的数据返回
     */
    @Override
    public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
        if(Objects.isNull(secretStrategy)){
            // 定义策略为空，返回原字符串
            jsonGenerator.writeString(s);
        }else {
            // 定义策略不为空，返回策略处理过的字符串
            jsonGenerator.writeString(secretStrategy.getDesensitizer().apply(s));
        }
    }
}
```

对应的也需要定义具体的脱敏方法枚举，以及脱敏注解

脱敏方法枚举

```java
/**
 * 脱敏策略，不同数据可选择不同的策略
 */
@Getter
public enum SecretStrategy {
 
    /**
     * 用户名脱敏
     */
    USERNAME(str -> str.replaceAll("(\\S)\\S(\\S*)", "$1*$2")),
 
    /**
     * 身份证脱敏
     */
    ID_CARD(str -> str.replaceAll("(\\d{4})\\d{10}(\\w{4})", "$1****$2")),
 
    /**
     * 手机号脱敏
     */
    PHONE(str -> str.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2")),
 
    /**
     * 地址脱敏
     */
    ADDRESS(str -> str.replaceAll("(\\S{3})\\S{2}(\\S*)\\S{2}", "$1****$2****"));
 
    private final Function<String, String> desensitizer;
 
    SecretStrategy(Function<String, String> desensitizer){
        this.desensitizer = desensitizer;
    }
}
```

脱敏注解

```java
@Target(ElementType.FIELD) // 标注在字段上
@Retention(RetentionPolicy.RUNTIME)
@JacksonAnnotationsInside // 一般用于将其他的注解一起打包成"组合"注解
@JsonSerialize(using = SecretJsonSerializer.class) // 对标注注解的字段采用哪种序列化器进行序列化
public @interface SecretColumn {
 
    // 脱敏策略
    SecretStrategy strategy();
 
}
```

需要脱敏的实体

```java
@Data
public class User {
 
    /**
     * 真实姓名
     */
    @SecretColumn(strategy = SecretStrategy.USERNAME)
    private String realName;
 
    /**
     * 地址
     */
    @SecretColumn(strategy = SecretStrategy.ADDRESS)
    private String address;
 
    /**
     * 电话号码
     */
    @SecretColumn(strategy = SecretStrategy.PHONE)
    private String phoneNumber;
 
    /**
     * 身份证号码
     */
    @SecretColumn(strategy = SecretStrategy.ID_CARD)
    private String idCard;
 
}
```

此时当请求返回时，`Spring`会自动将实体通过`JackSon`序列化，对应的字段就会通过自定义的序列化器完成脱敏操作了

有了自定义的序列化器，自然也可以造出采用自定义序列化器的`Utils`，比如

```java
public abstract class SecretUtils {
    
    private static final ObjectMapper mapper = new ObjectMapper();
    
    public static final Logger log = LoggerFactory.getLogger(SecretUtils.class);
    
    static{
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        mapper.setDateFormat(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));
        SimpleModule module = new SimpleModule("test", Version.unknownVersion());
        // 加入自定义的序列化器
        module.addSerializer(new SecretJsonSerializer());
        mapper.registerModule(module);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }
    
    public static <T> T replaceWithMask(String jsonStr, Class<T> clazz)
            throws Exception {
        T origin = mapper.readValue(jsonStr, clazz);
        String json = MaskMapper.obj2json(origin);
        return mapper.readValue(json, clazz);
    }
    
    public static <T> T replaceWithMask(String jsonStr, TypeReference<T> typeReference) throws Exception {
        T origin = mapper.readValue(jsonStr, typeReference);
        String json = MaskMapper.obj2json(origin);
        return mapper.readValue(json, typeReference);
    }
    
}
```

使用起来和直接用`ObjectMapper`类似

#### 方案缺点

基于`Json`的方案相对而言更加容易扩展了，同时也自然的支持了嵌套脱敏，也有不少团队选择直接采用序列化的方式，减少大部分解析工作，但它也依旧存在如下3个问题：

1. 序列化虽然在接口返回时让脱敏变得容易，让同样也影响了该实体在进行对应`Json`工具序列化数据时的行为，比如被打上注解的实体在序列化后字段均会被脱敏，再如对于该实体本来想打印明文的日志信息，但打印的却只能是脱敏的，这对于现有的系统在接入后需要进一步进行代码走查，规避风险
2. 采用自定义序列化器的`Utils`，在`TypeReference`条件下能够对泛型实体进行脱敏，但在非泛型实体情况下，无法进行脱敏
3. `Fastjson`和`Jackson`的配置不通用，对于不同的`Json`工具，需要进行定制的内容不同，代码需要维护多套，难以完成统一

针对问题2，具体的实例代码如下

```java
DemoUser user = new DemoUser();
user.setId(1L);
user.setAge(1);
user.setBankCard("1234567");
user.setEmail("test@qq.com");
user.setName("张三");
user.setIdCard("12343432423424");
user.setCustomBankCard("123123131");
// 正常脱敏
DemoUser test = SecretUtils.replaceWithMask(JsonUtil.toJson(user), DemoUser.class)
List<DemoUser> users = new ArrayList<>();
users.add(user);
// 正常脱敏，因为带有正确的泛型
List<DemoUser> test2 = SecretUtils.replaceWithMask(JsonUtil.toJson(user), new TypeReference<List<DemoUser>>() {})
// 不能脱敏，因为泛型擦涂
List test2 = SecretUtils.replaceWithMask(JsonUtil.toJson(user), new TypeReference<List>() {})
```

同时这种方案还和和前文提到的**基于各种工具类的脱敏方案**具有相同的缺点

### 其他方案

除此之外，还可以通过`Spring`的`Filter`，`ResponseBodyAdvice`等扩展点，在请求返回时针对实体进行脱敏处理，在这几个扩展点中可结合工具类脱敏，但需要正确处理泛型问题以及嵌套脱敏问题。

## 组件优势

组件选择采用基于`Mybatis-Plugin`进行加解密处理、并采用`AOP`+非`Json`序列化器的脱敏处理

组件着重解决上述技术方案的如下问题：

1. 支持动态`SQL`的加解密
2. 对于需要加解密的实体，统一采用`@SecurityField`进行标注，无需编写额外代码
3. 不依赖`Json`序列化器的解决方法，自研脱敏解析器，支持嵌套脱敏，统一使用方式
4. 对于需要加密的实体，只在持久层加密，不改变原始实体引用，避免造成加密后继续使用实体时，实体字段已变为加密字段
5. 可拓展式加密算法、加解密类型处理器、脱敏类型处理器，脱敏切面可开关、切点可配置
6. 可自定义脱敏标识

## 组件原理

具体原理解析可见[Rpamis-security-原理解析](https://cloud.benym.cn/pages/1ffe0d/)

