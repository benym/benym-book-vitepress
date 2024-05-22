---
title: 优雅的参数校验与全局异常-代码规范的天生落地
date: 2023-02-01 11:30:04
categories: 
  - 开源项目
  - Rpamis
  - Exception
  - Dubbo
  - Spring
tags:
  - 开源项目
  - Rpamis
  - Exception
  - 返回体
  - 优雅校验
  - Validated
  - Valid
  - Advice
  - Dubbo
  - Filter
  - Http
author: 
  name: benym
  link: https://github.com/benym
permalink: /pages/1c47ed/
---

## 背景

代码规范是项目质量的基石，能够帮助开发者和管理者更好的管理/维护项目、专注于推动快速成长的业务、留出更多时间攻坚重难点系统设计。`全局异常+自定义异常+参数校验+统一返回体`组合是互联网中Java开发规范、使用代码扫描工具后的提升效率的**必然落地方式**。

针对开发规范的细节考量，本文主要描述业界常用的基于`@Valid`和`@Validated`的前置校验，结合全局异常与`Http Code`，帮助读者理解高效且优雅的参数校验，及通用场景下的全局异常机制。

## JSR303规范及主流实现

数据的正确性校验是研发过程中不可或缺的步骤，开发者需要保证数据在进入系统后的基本正确性。

在通常的开发过程中前端可以帮助校验用户的数据请求，为了保证服务端数据的安全，避免非法请求绕过前端，直接采用脚本等方式向服务端发起请求。服务端同样需要进行数据校验。

根据校验先后的不同可以选择的方法也可以不同，比如在`Controller`前的`@Valid`和`@Validated`校验，这类校验通常用于实体、字段的校验规则，如非空判断、长度判断、正则匹配、el表达式判断等。再者就是复杂业务或网关层面的校验，通常会使用`责任链模式`进行特定实现。当不使用该两种方法时，开发者通常会使用`if else`语法进行校验，但当校验过多且复杂时，成片的`if else`会造成代码臃肿，可复用性差的问题，导致研发效率的低下。

JSR(Java Specification Requests)是Java规范的提案，JSR-303[^1]是JavaEE6中的一项子规范，叫做Bean Validation[^2]，该提案于2009年正式面向公众，后续的JSR-349、JSR-380均在此提案上进行增强。该规范只提供了校验的注解，位于`javax.validation.constraints`包下，在官网指定的实现贡献者有3个

::: center
![Contributions](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/hi-contribution.png/zipstyle)
:::

其中`Hibernate Validator`使用最为广泛。

这里列出一些基本的constraint，在最新的hibernate validator中包括但不限于以下注解，更多实现可直达官网[^3]了解。

`Bean Validation`中内置的`constraint`

::: center

![Bean Validation constraint](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/BeanValidator.png/zipstyle)

:::

`Hibernate Validator`附加的`constraint`

::: center

![Hibernate Validator](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/hibernate-validator.png/zipstyle)

:::

## 参数校验-快速开始

`SpringBoot`项目无需引入额外依赖，自带所需依赖，非`SpringBoot`项目需要引入如下2个依赖，参数校验依赖于`get/set`方法

```java
<dependency>
    <groupId>javax.validation</groupId>
    <artifactId>validation-api</artifactId>
    <version>2.0.1.Final</version>
</dependency>
<dependency>
    <groupId>org.hibernate.validator</groupId>
    <artifactId>hibernate-validator</artifactId>
    <version>6.1.5.Final</version>
</dependency>
```

### 基本校验

以一个`User`实体为例

```java
public class User {

    @NotNull(message = "用户名不能为空")
    private String userName;

    @NotNull(message = "密码不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9|_]+$", message = "密码必须由字母、数字、下划线组成")
    @Size(min = 6, max = 12, message = "密码长度必须在6-12字符之间")
    private String passWord;

    @Range(min = 1, max = 150, message = "年龄必须在1-150区间")
    private Integer age;
    
    @NotEmpty(message = "用户的兴趣不能为空")
    private List<String> interest;
    
    // 省略get/set

}
```

假设要求传入的`Json`字段(`@RequestBody`)中，用户名、密码、年龄都有特定的规则

对应的`Controller`应该为

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @PostMapping("/validate")
    public String test(@Valid @RequestBody User user) {
        System.out.println(1);
        return "success";
    }

    @PostMapping("/validate2")
    public String test2(@Validated @RequestBody User user) {
        System.out.println(1);
        return "success";
    }
}
```

使用`@Valid`或`@Validated`均可

此时当`Postman`参数传递不符合预期时，将无法进入`Controller`中(前置拦截，体现在`Debug`时，进不到`test`方法体内`System.out`行)，同时接口返回`400`，带`Spring`封装的基础返回体

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validate-return-spring.png/zipstyle)

:::

控制台抛出对应异常

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/console-validate.png/zipstyle)

:::



结合上图结果和代码我们可以观察到，`Spring`自带的基础返回体没有将我们想要的`message`显示出来，仅仅是在控制台有日志打印，只有显示指定`@NotNull、@NotBlank、@NotEmpty`等非空注解时，参数才为必传。在本例中`age`字段虽然有`@Range`，但他不是必传的选项。只有当入参`Json`包含`age`字段时，`@Range`才会生效。

由于参数校验结果的特点以及各公司对返回体的定制化需求，参数校验通常与统一返回体、全局异常处理结合。

::: tip

最新的`Spring6`、`SpringBoot3`中，已提供了`org.springframework.http.ProblemDetail`来实现`Http`错误的返回信息和问题细节，避免自定义新的错误返回格式，可参考文章4[^4]和文章5[^5]。

:::

### 嵌套校验

嵌套校验支持用户将`@Valid`和`@Validated`混合使用，可用于更复杂的校验

还是以`User`为例，新增一个`friends`字段，代表用户的朋友们，同时加上`@Valid`注解代表如果`friends`入参有传，则需要对`Friend`类的内部字段进行校验，如果没有传递则无需校验。

```java
public class User {

    @NotNull(message = "用户名不能为空")
    private String userName;

    @NotNull(message = "密码不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9|_]+$", message = "密码必须由字母、数字、下划线组成")
    @Size(min = 6, max = 12, message = "密码长度必须在6-12字符之间")
    private String passWord;

    @Range(min = 1, max = 150, message = "年龄必须在1-150区间")
    private Integer age;

    @Valid
    private List<Friend> friends;
    
    // 省略get/set
}
```

`Friend`类

```java
public class Friend {

    @NotNull(message = "朋友名称不能为空")
    private String userName;

    @Range(min = 1, max = 150, message = "年龄必须在1-150区间")
    private Integer age;
    
    // 省略get/set
}
```

假设此时参数传递为

```json
{
    "userName" : "11",
    "passWord" : "test123_2",
    "age" : 11,
    "friends" : [
        {
            "age" : "22"
        },
        {
            "userName" : "33"
        }
    ]
}
```

表示该用户有2个`friend`，其中一个只写了名字，其中一个只写了年龄，由代码可知年龄是非必填字段，对应的控制台日志为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validandvalidated.png/zipstyle)

:::

符合校验预期，当此时`friend`字段没有传递时，则不进行校验

### 分组校验

分组校验是`Spring Validation`的特性，校验时在`Controller层`对实体的书写必须使用`@Validated`，分组校验提高了实体校验注解的可复用能力，只需要指定校验分组即可让同一实体适配多种场景。

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @PostMapping("/validate2")
    public String test2(@Validated @RequestBody User user) {
        System.out.println(1);
        return "success";
    }
}
```

首先需要定义常见的CRUD分组场景，取任意名字均可，接口无需实现

```java
public class ValidatedAction {
    
    public interface Insert {
    }

    public interface Update {
    }

    public interface Search {
    }

    public interface Delete {
    }
}
```

为刚才的`User`内的字段增加分组，如在新增时需要填写用户名、密码，在删除时需要填写id和密码

```java
public class User {

    @NotNull(message = "id不能为空", groups = {ValidatedAction.Delete.class})
    private String id;

    @NotNull(message = "用户名不能为空", groups = {ValidatedAction.Insert.class})
    private String userName;

    @NotNull(message = "密码不能为空", groups = {ValidatedAction.Insert.class, ValidatedAction.Delete.class})
    @Pattern(regexp = "^[a-zA-Z0-9|_]+$", message = "密码必须由字母、数字、下划线组成")
    @Size(min = 6, max = 12, message = "密码长度必须在6-12字符之间")
    private String passWord;

    @Range(min = 1, max = 150, message = "年龄必须在1-150区间")
    private Integer age;

    @Valid
    private List<Friend> friends;
    
    // 省略get/set
}
```

修改`Controller`接口，指定校验分组，一个为新增分组校验，一个为删除分组校验，同时需要加上`javax`中自带的`Default`分组，避免实体中没有写group的校验注解失效

```java {6,12}
@RestController
@RequestMapping("/test")
public class TestController {

    @PostMapping("/validate")
    public String test(@Validated({ValidatedAction.Insert.class, Default.class}) @RequestBody User user) {
        System.out.println(1);
        return "success";
    }

    @PostMapping("/validateDelete")
    public String test2(@Validated({ValidatedAction.Delete.class, Default.class}) @RequestBody User user) {
        System.out.println(1);
        return "success";
    }
}
```

新增时`Postman`传参为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validated-insert.png/zipstyle)

:::

由于新增时，非空参数仅有用户名和密码，所以正常返回，此时分组为`Delete`的`id`并没有参与非空校验

删除时`Postman`传参为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validated-delete.png/zipstyle)

:::

由于删除时，非空参数包含id，此时传参中没有id则会在控制台输出对应提示

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validated-delete-console.png/zipstyle)

:::

### 自定义校验

`hibernate`提供的校验注解在简单字段的场景已经基本够用了，如果提供的校验注解无法满足要求，这个时候可以考虑自定义注解，将校验与`Controller`完全隔离。

本文主要考虑4种较为通用的场景下自定义注解的实现方法

- 场景1：字段为`基础类型`，约束传递的字段只能在枚举code的约束范围内，虽然定义字段为枚举字段可以简单实现传输枚举对象名完成枚举约束，但通常我们不将字段本身定义为枚举直接暴露给前端。期望能够通过直接引用枚举类，达成约束。
- 场景2：字段为`String`，约束传递的字段只能是一组特定的String字符串
- 场景3：字段为`Integer`，约束传递的字段只能是一组特定的Integer值
- 场景4：字段为`List<String>`，约束传递的字段只能是一组特定的String字符串

自定义的过程比较简单

第一步：新增一个你的自定义注解，这里为`SpecifiesValueValidator`

自定义注解的写法可完全照搬`@NotNull`等注解，稍微改动下`@Constraint`的`validatedBy`属性为当前自定义注解类，同时加上可重复性校验注解(非必须)`@Repeatable(SpecifiesValueValidator.List.class)`，用于支持多个自定义注解使用在同一字段。

```java
@Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER})
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = {SpecifiesValueValidatorImpl.class})
@Repeatable(SpecifiesValueValidator.List.class)
public @interface SpecifiesValueValidator {
    /**
     * 默认校验消息
     *
     * @return String
     */
    String message() default "入参必须为指定值";

    /**
     * 分组校验
     *
     * @return Class<?>[]
     */
    Class<?>[] groups() default {};

    /**
     * 负载
     *
     * @return Class<? extends Payload>[]
     */
    Class<? extends Payload>[] payload() default {};

    /**
     * 指定特定String值
     *
     * @return String[]
     */
    String[] strGroup() default {};

    /**
     * 指定特定int值
     *
     * @return int[]
     */
    int[] intGroup() default {};

    /**
     * 指定枚举类型
     *
     * @return Class<?>
     */
    Class<?> enumClass() default Class.class;

    /**
     * 可重复校验
     */
    @Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER})
    @Retention(RetentionPolicy.RUNTIME)
    @Documented
    @interface List {
        SpecifiesValueValidator[] value();
    }
}
```

第二步：实现`javax.validation.ConstraintValidator`接口

泛型第一个参数为自定义注解，第二个参数为被加上注解的字段值

这里在请求初始化时将规定的合法值加载进内存，校验的过程逻辑非常简单，符合返回true，反之false即可

```java
public class SpecifiesValueValidatorImpl implements ConstraintValidator<SpecifiesValueValidator, Object> {

    private Class<?> enumClass;

    private HashSet<String> strSet;

    private Set<Integer> intSet;

    @Override
    public void initialize(SpecifiesValueValidator constraintAnnotation) {
        String[] strGroup = constraintAnnotation.strGroup();
        strSet = new HashSet<>(Arrays.asList(strGroup));
        int[] intGroup = constraintAnnotation.intGroup();
        intSet = Arrays.stream(intGroup).boxed().collect(Collectors.toSet());
        enumClass = constraintAnnotation.enumClass();
    }

    /**
     * 此时value为被注解的字段类型
     *
     * @param value   object to validate
     * @param context context in which the constraint is evaluated
     * @return boolean
     */
    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        try {
            if (null == value) {
                return true;
            }
            if (enumClass.isEnum()) {
                return validEnum(value, enumClass);
            }
            if (value instanceof String && strSet.contains(value)) {
                return true;
            }
            if (value instanceof Integer && intSet.contains(value)) {
                return true;
            }
            if (value instanceof List) {
                return validList(value, strSet);
            }
        } catch (NoSuchMethodException e) {
            throw ExceptionFactory.sysException(enumClass + "枚举类没有getCode方法", e);
        } catch (Exception e) {
            throw ExceptionFactory.sysException("特定值校验器异常", e);
        }
        return false;
    }

    public static boolean validEnum(Object value, Class<?> enumClass) throws InvocationTargetException, IllegalAccessException, NoSuchMethodException {
        // 获取传入的枚举class的所有定义的枚举，反射获取code判断是否和入参相同
        Object[] enumConstants = enumClass.getEnumConstants();
        for (Object enumConstant : enumConstants) {
            Method method = enumClass.getDeclaredMethod("getCode");
            Object invokeResult = method.invoke(enumConstant);
            if (invokeResult.equals(value)) {
                return true;
            }
        }
        return false;
    }

    public static boolean validList(Object value, Set<String> strSet) {
        for (Object v : (List<?>) value) {
            String cast = (String) v;
            if (!strSet.contains(cast)) {
                return false;
            }
        }
        return true;
    }
}
```

以`UserSpValid`类为例

```java
public class UserSpValid {


    @NotNull(message = "手机品牌不能为空")
    @SpecifiesValueValidator(message = "手机品牌需符合枚举", enumClass = PhoneBrandEnums.class)
    private String phoneBrand;

    @SpecifiesValueValidator(message = "用户状态需要符合规则", intGroup = {1, 2, 3})
    private Integer status;

    @SpecifiesValueValidator(message = "用户的学校需要符合规则", strGroup = {"11", "22", "33"})
    private String shchool;

    @SpecifiesValueValidator(message = "传输list需要符合规则", strGroup = {"456","789"})
    private List<String> testList;
    
    // 省略get/set
}
```

其中枚举`PhoneBrandEnums`为

```java
public enum PhoneBrandEnums implements StatusCode {

    /**
     * 苹果
     */
    IPHONE("0", "苹果手机"),
    /**
     * 华为
     */
    HUAWEI("1", "华为手机"),
    /**
     * 小米
     */
    XIAOMI("2", "小米手机");

    private String code;

    private String message;

    PhoneBrandEnums(String code, String message) {
        this.code = code;
        this.message = message;
    }

    @Override
    public String getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
```

为了方便校验枚举类型，通常需要实现接口(这里为`StatusCode`)，因为枚举校验实现中需要`getDeclaredMethod("getCode")`之后进行`inovke`

对应的`Controller`写法和之前没有变化

```java
@PostMapping("/validateSp")
public String test3(@Validated @RequestBody UserSpValid user) {
    System.out.println(1);
    return "success";
}
```

当`Postman`传输如下参数时，校验器将对参数进行校验，比如此时的`phoneBrand`字段必须是枚举中的值

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/valid-sp.png/zipstyle)

:::

显然以上参数都是无法通过校验的，对应的控制台打印为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/valid-sp-console.png/zipstyle)

:::

### Spring Validation与Dubbo Validation

`Spring Validation`主要提供了编程式的校验验证，以及`@Validated`注解，支持了`@Valid`混用等多种场景，由于本文篇幅原因使用方法及原理这里不做过多介绍，mvc处理最终会调用`hibernate validator`的校验，Spring只是在处理过程中包装了一层，可以通过文章6进行了解[^6]。

`Dubbo Validation`主要提供RPC时对参数的校验，本质上也依赖于`javax`与`hibernate`的包，在客户端和服务端均可单独开启校验，对于需要开启校验的接口加上`validation="true"`即可，dubbo2.1.x以上版本均支持，最佳实践可参考[官方文档](https://cn.dubbo.apache.org/zh/docs/advanced/parameter-validation/)[^7]

在客户端验证参数

```java
<dubbo:reference id="validationService" interface="org.apache.dubbo.examples.validation.api.ValidationService" validation="true" />
```

在服务端验证参数

```java
<dubbo:service interface="org.apache.dubbo.examples.validation.api.ValidationService" ref="validationService" validation="true" />
```

### 实践对比

简单结合自定义校验和基本校验，观察两者代码量上的区别

未使用参数校验注解

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/no-valid.png)

:::

使用参数校验注解

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/have-valid.png)

:::

显然，没有使用参数校验开发者会写大量的校验代码，场景越复杂，需要考虑非空判断的地方也就越多，很容易写出高复杂度的代码，增加后期维护的难度，难以通过代码检查工具的扫描。而使用参数校验能够极大地减轻开发者的校验压力，校验与实体绑定，`Controller`逻辑更加简洁、清晰，对应的`Controller`代码只需要关注实体转化和业务。

## 全局异常-快速开始

上文中JSR303校验方法的引入有一个缺点，即错误信息仅体现在控制台日志中，无法反馈给前端。我们希望将错误信息包装在统一的返回体中，此时便需要定义全局异常。

全局异常的好处在于：

1. 天生适配异常情况下统一返回体的需求，让优雅的参数校验更加易用
2. 结合`Http Code`释放前、后端代码压力，减轻前后端对接业务code沟通成本。促进前端请求/处理数据代码和后端返回代码模板化，让开发者专注推动业务，减少联调周期，清晰前后端问题处理边界
3. 允许开发者在系统内任意位置通过简单的`throw new XXException`，完成异常情况下统一返回体的包装。无论代码层级多深，轻松实现统一返回，彻底告别系统内部除RPC接口，想要返回给前端异常信息仍然需要手动包装统一返回体，手动一层一层返回的情况，减少系统内非必要判空和传输体体积
3. 精简代码，降低大量`try catch`引起的代码简洁性问题
4. 全局兜底日志，结合唯一请求等信息，不再出现忘记打印日志，重新部署代码再排查问题的情况
6. 配合自定义异常，做到`抛特定异常=打特定日志=返回对应Http Code+统一返回体`，全面覆盖通用场景

作为前置知识，这里首先讲解统一返回体

### 统一返回体

绝大多数公司都会定义自己的统一返回体，以一个简单的返回体为例，包含错误代码`errCode`，简要错误`errMessage`，详细信息`detailMessage`，数据`data`，4个字段，通常会结合泛型书写一些请求成功和请求失败的重载方法。

```java
public class Response<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    private String errCode;

    private String errMessage;

    private String detailMessage;

    private T data;

    public Response() {

    }

    public Response(String errCode, String errMessage, String detailMessage) {
        this.errCode = errCode;
        this.errMessage = errMessage;
        this.detailMessage = detailMessage;
    }

    public Response(String errCode, String errMessage) {
        this(errCode, errMessage, "");
    }

    public Response(T data) {
        errCode = "";
        errMessage = "";
        setData(data);
    }

    public Response(StatusCode statusCode) {
        errCode = statusCode.getCode();
        errMessage = statusCode.getMessage();
    }

    public static <T> Response<T> success() {
        return new Response<>(ResponseCode.SUCCESS);
    }

    public static <T> Response<T> success(T data, String errCode, String errMessage) {
        Response<T> response = new Response<>();
        response.setData(data);
        response.setErrCode(errCode);
        response.setErrMessage(errMessage);
        return response;
    }

    public static <T> Response<T> success(T data) {
        return success(data, ResponseCode.SUCCESS.getCode(), ResponseCode.SUCCESS.getMessage());
    }

    public static <T> Response<T> success(T data, String errMessage) {
        return success(data, ResponseCode.SUCCESS.getCode(), errMessage);
    }


    public static <T> Response<T> fail(String errCode, String errMessage) {
        Response<T> response = new Response<>();
        response.setErrCode(errCode);
        response.setErrMessage(errMessage);
        return response;
    }

    public static <T> Response<T> fail() {
        return fail(ResponseCode.FAILED.getCode(), ResponseCode.FAILED.getMessage());
    }

    public static <T> Response<T> fail(StatusCode statusCode) {
        return fail(statusCode.getCode(), statusCode.getMessage());
    }

    public static <T> Response<T> fail(StatusCode statusCode, String detailMessage) {
        Response<T> response = new Response<>();
        response.setErrCode(statusCode.getCode());
        response.setErrMessage(statusCode.getMessage());
        response.setDetailMessage(detailMessage);
        return response;
    }

    public static <T> Response<T> fail(T data, String errCode, String errMessage) {
        Response<T> response = new Response<>();
        response.setData(data);
        response.setErrCode(errCode);
        response.setErrMessage(errMessage);
        return response;
    }
    // 省略get/set等
    
}
```

用`Controller`、`Service`、`Dao`经典的MVC分层，看看下面这个典型的请求例子

`Controller`

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @Autowired
    private TestService testService;

    @PostMapping("/getUser")
    public Response<User> test6(@RequestBody User user) {
        User user1 = testService.getUser(user.getId());
        return Response.success(user1);
    }
}
```

`Service`

```java
public interface TestService {
    User getUser(String id);
}
```

```java
@Service
public class TestServiceImpl implements TestService {

    @Autowired
    private TestDao testDao;

    @Override
    public User getUser(String id) {
        // 写一些业务逻辑，比如转换id等等
        return testDao.getUserById(id);
    }
}
```

`Dao`

```java
public interface TestDao {
    User getUserById(String id);
}
```

```java
@Repository
public class TestDaoImpl implements TestDao {

    @Autowired
    private UserMapper userMapper;

    @Override
    public User getUserById(String id) {
        User userByUserId = null;
        try {
            // 其他逻辑
            userByUserId = userMapper.getUserByUserId(id);
        } catch (Exception e) {
            throw new RuntimeException("报错了");
        }
        return userByUserId;
    }
}
```

正常请求接口，这看上去没有什么问题，但如果上述查询数据库的代码出现异常了，这句"报错了"的消息前端是不知道的，有的时候我们希望将这些已知的异常捕获住并返回一个特定的消息告诉前端。这时候，有同学可能会这样修改

`Controller`

```java
@PostMapping("/getUserWrap")
public Response<User> test7(@RequestBody User user) {
    Response<User> userWrap = testService.getUserWrap(user.getId());
    return userWrap;
}
```

`Service`

```java
public interface TestService {
    
    Response<User> getUserWrap(String id);
}
```

```java
@Service
public class TestServiceImpl implements TestService {

    @Autowired
    private TestDao testDao;

    @Override
    public Response<User> getUserWrap(String id) {
        // 写一些业务逻辑，比如转换id等等
        return testDao.getUserByIdWrap(id);
    }
}
```

`Dao`

```java
public interface TestDao {

    Response<User> getUserByIdWrap(String id);
}
```

```java
@Repository
public class TestDaoImpl implements TestDao {

    @Autowired
    private UserMapper userMapper;

    @Override
    public Response<User> getUserByIdWrap(String id) {
        User userByUserId = null;
        try {
            // 其他逻辑
            userByUserId = userMapper.getUserByUserId(id);
        } catch (Exception e) {
            // 这里同样可以用Response.fail()方法，手动set的写法是考虑有些返回体没有重载方法
            // 如果有重载方法则Response.fail(ResponseCode.FAILED.getCode(),"报错了")替代下面3行
            Response<User> response = new Response<>();
            response.setErrCode(ResponseCode.FAILED.getCode());
            response.setErrMessage("报错了");
            return response;
        }
        return Response.success(userByUserId);
    }
}
```

这种方式给内层的所有方法加上统一返回体，虽然满足了返回给前端异常消息的需求，但需要在最内层开始一层一层返回。如果包装的返回体没有提供便捷的重载方法，甚至需要手动set出错误体，同时对于可复用的`Dao`层，其余方法在调用他时还需要再从统一返回体中取出真正的对象。长期下去会产生大量的冗余代码，降低了效率，显得不够整洁。

或许你看到这里觉得仅仅只是给`Service`、`Dao`加上了一下返回体包装，如果加上返回体的重载方法，这样返回也还好。那么我们继续看下面这个例子，即返回体地狱。

一个`Service`不仅仅依赖于一次`SQL`查询，那么他可能会使用多个`Dao`或一个`Dao`中的多个方法，为上文中的`Controller`添加save方法，同时改变`Service`、`Dao`支持`saveOrUpdate`操作为如下

`Controller`

```java
@PostMapping("/save")
public Response<Boolean> test8(@RequestBody User user) {
    Response<Boolean> result = testService.saveOrUpdate(user);
    return result;
}
```

`Service`

```java
public interface TestService {

    Response<Boolean> saveOrUpdate(User user);
}
```

```java
@Service
public class TestServiceImpl implements TestService {

    @Autowired
    private TestDao testDao;

    @Override
    public Response<Boolean> saveOrUpdate(User user) {
        Response<Boolean> response = new Response<>();
        // 传输id不为空为update，否则为新增
        if (StringUtils.isEmpty(user.getId())) {
            try {
                int insertRow = testDao.insert(user);
                if (insertRow < 1) {
                    response.setErrCode(ResponseCode.FAILED.getCode());
                    response.setErrMessage("新增失败");
                    return response;
                } else {
                    response.setErrCode(ResponseCode.SUCCESS.getCode());
                    response.setErrMessage("新增成功");
                    return response;
                }
            } catch (Exception e) {
                response.setErrCode(ResponseCode.FAILED.getCode());
                response.setErrMessage("新增时异常");
                return response;
            }
        } else {
            try {
                int insertRow = testDao.update(user);
                if (insertRow < 1) {
                    response.setErrCode(ResponseCode.FAILED.getCode());
                    response.setErrMessage("更新失败");
                    return response;
                } else {
                    response.setErrCode(ResponseCode.SUCCESS.getCode());
                    response.setErrMessage("更新成功");
                    return response;
                }
            } catch (Exception e) {
                response.setErrCode(ResponseCode.FAILED.getCode());
                response.setErrMessage("更新时异常");
                return response;
            }
        }
    }
}
```

`Dao`

```java
public interface TestDao {
    
	int insert(User user);

    int update(User user);
}

```

```java
@Repository
public class TestDaoImpl implements TestDao {

    @Autowired
    private UserMapper userMapper;

    @Override
    public int insert(User user) {
        return userMapper.insert(user);
    }

    @Override
    public int update(User user) {
        return userMapper.update(user);
    }
}
```

其中`Dao`层的处理专门模拟了没有进行`try catch`处理的情况。

这时候的`Service`需要做的很多，对每一个`Dao`层结果处理都需要进行`try catch`然后包装返回体，打印错误日志，这里真实的业务实际上只是如下4行，但由于`Dao`层处理的不规范，加上不得不包装返回体的原因，这里需要写很多代码，而这些代码仅仅只是为了满足让前端感知错误消息这一需求

```java
if (StringUtils.isEmpty(user.getId())) {
    int insertRow = testDao.insert(user);
} else {
    int updateRow = testDao.update(user);
}
```

上述方法如果也没有结合参数校验注解，将会使得`Controller`层也会出现同样的情况，同时还有可能增加`Service`在业务校验上包装返回体提示的代码，这样开发者无法专注于真正的业务逻辑，更多的是在处理如何进行友好返回。

后文将解释全局异常的出现是如何克服该问题。

### 全局异常捕获

#### 为什么用Http Code

本文的全局异常与`Http Code`、`自定义异常`紧密结合。

在最新的阿里官方发布(2022.2.3)的《阿里巴巴Java开发手册》[^8]中，强制规范提到返回给前端的响应信息必须包含`HTTP状态码`，`errCode`，`errorMessage`，`用户提示信息`4个部分。

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/aliguide-frontback.png/zipstyle)

:::

其中`Http状态码!=errCode`，在调研过程中我们发现有不少的公司全统一采用了`Http Code=200`的情况，通过`errCode`来表示业务的状态码，关于这一点网上的讨论非常激烈[^9]。总结起来就是，部分网友认为Http为网络层协议，表达网络含义，不应该表达业务。另外有人表示这是历史原因，以前返回非200状态码会被运营商拦截，当然现在没有这个情况了。还有说HTTP Code不够业务使用，所以得用errCode表示。听起来都有道理。

就落地而言，如果仅仅使用`errCode`虽然看起来各自的产品运行得没有问题，但实际上这里存在一个隐藏的时间成本，涉及到前后端联调沟通、接口问题排查边界、接口请求处理代码模版的问题。

以下面这个真实案例开始

在公司内的前端涉及到对接多个系统，当所有接口无论错误或正确都返回`Http Code=200`时，前端通过`errCode`区分这次结果到底是正确还是错误，可能写出的代码为

```js
if(errCode=="20000") {
    status = 200
    data = response
}
if(errCode = "200001") {
    status = 500
    msg = response.errors
}
if(dataList = true && dataList.length>0) {
    status = 200
    data = response
}
switch (status) {
    case 200: // 做处理
    case 500: // 做处理
}
```

以上代码的status为前端拿到的该请求的`Http Code`，可以显然看出，前端需要对后端传输的`errCode`进行区分，然后才能知道这次的`Http Code`到底应该转化为多少，因为后端统一都是传的`200`。如果前端仅仅只对接一个系统，那么可能后端定义的`errCode`是固定不变的，则前端可以写出固定的处理请求的模版覆盖提示场景、异常场景、正确请求场景。

**弊端解释：**

1. 上述情况仅仅是一种理想的状态，现实是各个后端系统所定义的异常枚举类**都不相同**，统一各个系统采用一份异常枚举类是不现实的，导致前端在对接每个系统的时候都需要沟通系统各自枚举`Code`的含义，如果枚举`Code`耦合或差异大，无疑会写出成片需要特殊转换，毫无规律的处理代码。还可能出现`Http Code`返回`200`，但接口内返回`500`这种存在二义性的场景。造成联调成本的上升。
2. 当一个接口出现问题时，开发者从`F12`中海量的接口请求很难一眼看出到底哪个接口出现了问题，是前端的问题？还是后端的问题？在`Http Code`为`200`的场景下，经常会发生前端排查半天发现是后端的问题，后端排查半天发现是前端传参的问题。排查问题的边界难以确定，一个问题甚至同时需要前后端多个人力一起来看。
3. 全`200`情况下，`errCode`对前端观测的无用性，如果有完善的接口监控系统，那么在全`200`情况下将无法识别接口到底成功还是失败，定制化开发监控平台会增加成本。从上面的实例代码也能看出，前端对于后端的`errCode`仅仅是做出了一次转化，到底这个`errCode`代表什么前端不知道，属于后端需要观测的范围。

显然单纯采用`errCode`会增加前后端开发负担。

对于业务服务而言，我们最为常用的`Http Code`应该为如下3个，对于`401未授权,404未找到`等状态码，应该交给网关服务

- `200-请求成功`：代表着本次请求是成功的
- `400-请求参数有误`：代表着本次请求的参数有误，需要前端处理
- `500-服务器内部错误`：代表着本次请求的服务端错误，需要后端处理

如图`200`，`400`，`500`，其中`400`和`500`显示红色，请求很多的情况下也能明显可见

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/200.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/400.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/500.png/zipstyle)

:::

在后文自定义异常栏，我们将展示`Http Code`和`自定义异常`的结合。

#### Web Controller

全局异常是`Spring3.2`开始就有的方法，主要提供了`@RestControllerAdvice`和`@ControllerAdvice`2个注解定义全局异常。`@RestControllerAdvice=@ControllerAdvice+@ResponseBody`。一般定义一个`@RestControllerAdvice`即可。同时采用`@ExceptionHandler`指定处理哪种异常。

一个简单的全局异常例子为，捕获系统内所有的异常，并返回1

```java
@RestControllerAdvice
public class ExceptionErrorHandler {

    @ExceptionHandler(Exception.class)
    public Object handleException(Exception exception) {
        // 自定义处理
        return "1";
    }
}
```

当然了，在真实的系统中，我们需要对异常进行分类对不同种异常做出不一样的处理。

首先加入对参数校验异常的兼容，主要有如下3个

- `MethodArgumentNotValidException`


使用`javax、hibernate`参数校验注解会抛出`BindException`，而`BindException`会将错误信息绑定在`BindingResult`中，我们可以直接捕获`BindException`对`BindingResult`进行处理，但这样处理起来是没有格式化的，也可以采用`MethodArgumentNotValidException`通过内部方法直接返回格式化之后的`BindingResult`的相关信息。

具体处理的对象为`@Valid`、`@Validated`、以及`@NotNull`、`@NotEmpty`等注解注释的实体或方法

- `HttpMessageNotReadableException`

处理Http消息不可读的异常，当如参数传入为`String`类型字段，但接收方为`Integer`类型。使用`@RequestBody`规定传输Json，但前端并没有传递参数或前端传输为表单类型。后端只支持`Get`，但前端发送`Post`等类似场景会抛出该异常。

- `MissingServletRequestParameterException`

处理缺少参数异常，即后端指定有`@RequestParam`必传参数，前端没有传递该参数时将会抛出该异常。

对应的全局异常处理为

```java
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ExceptionErrorHandler {

    private static final Logger logger = LoggerFactory.getLogger(ExceptionErrorHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Object>> handleBindException(MethodArgumentNotValidException validException) {
        final Trace trace = TraceIdUtils.getTrace();
        String validateMessage = Objects.requireNonNull(validException.getBindingResult().getFieldError()).getDefaultMessage();
        logger.warn("请求Id:{}, SpanId:{}, 参数校验失败:{}", trace.getTraceId(), trace.getSpanId(), validateMessage);
        if (logger.isDebugEnabled()) {
            logger.debug(validException.getMessage(), validException);
        }
        final Response<Object> failResponse = Response.fail(ResponseCode.VALIDATE_ERROR, validateMessage);
        return new ResponseEntity<>(failResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Response<Object>> handleNotReadException(HttpMessageNotReadableException notReadableException) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.warn("请求Id:{}, SpanId:{}, 错误码:{}, 错误信息:{}, 详细信息:{}", trace.getTraceId(), trace.getSpanId(),
                ResponseCode.READ_JSON_ERROR.getCode(), ResponseCode.READ_JSON_ERROR.getMessage(), notReadableException.getMessage());
        if (logger.isDebugEnabled()) {
            logger.debug(notReadableException.getMessage(), notReadableException);
        }
        final Response<Object> failResponse = Response.fail(ResponseCode.READ_JSON_ERROR, ResponseCode.READ_JSON_ERROR.getMessage());
        return new ResponseEntity<>(failResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Response<Object>> handleParameterException(MissingServletRequestParameterException misException) {
        final Trace trace = TraceIdUtils.getTrace();
        String missParams = String.format("%s参数, 类型%s缺失", misException.getParameterName(),misException.getParameterType());
        logger.warn("请求Id:{} ,SpanId:{} ,详细信息:{}",trace.getTraceId(), trace.getSpanId(), missParams);
        if (logger.isDebugEnabled()) {
            logger.debug(misException.getMessage(), misException);
        }
        final Response<Object> failResponse = Response.fail(ResponseCode.INVALID_PARAMETER, missParams);
        return new ResponseEntity<>(failResponse, HttpStatus.BAD_REQUEST);
    }
}
```

此处的`@Order`指定了该异常处理的时机，避免在`SpringMVC`项目中全局异常还没处理，请求就返回跳转页面的情况。`new ResponseEntity<>()`由`org.springframework.http`提供，支持包装`HttpCode`和`统一返回体`，这里的`HttpStatus.BAD_REQUEST`，体现在页面上即状态码`400`，当然也可采用`@ResponseStatus()`注解。

全局异常处理的逻辑非常简单，拿到异常后将异常消息包装进返回体即可。同时我们可以结合任意分布式链路跟踪系统，打印唯一请求id及错误消息，在debug模式下开启堆栈的跟踪。做到前后端均有兜底感知。

加入全局异常后，我们再次请求参数校验时的例子，可以发现参数不正确时的异常包装，与控制台的唯一请求日志

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validandexception.png/zipstyle)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/validandexception-console.png/zipstyle)

:::

此时的消息为校验实体注解上所编写的消息。

#### 自定义异常

在全局异常捕获了参数校验异常后，我们就可以省去关于Http请求的代码校验，仅需要使用注解即可自动包装返回体和提示语给前端。此时只要前端或后端看到状态码`400`，就明确知道这是前端的传参问题。

当然了，除了参数校验异常，业务上也需要自定义异常，根据开发手册和`SonrLint`的提示，这一步是必备的。

本文的自定义异常定义参考了，阿里`COLA`[^10]整洁架构中`cola-component-exception`的异常定义

分为`1+5`类：

- `AbstractException`：抽象异常类

```java
public abstract class AbstractException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private String errCode;

    private String errMessage;

    protected AbstractException(String errMessage) {
        super(errMessage);
    }

    protected AbstractException(String errMessage, Throwable throwable) {
        super(errMessage, throwable);
    }

    protected AbstractException(String errCode, String errMessage) {
        super(errMessage);
        this.setErrCode(errCode);
        this.setErrMessage(errMessage);
    }

    protected AbstractException(String errCode, String errMessage, Throwable throwable) {
        super(errMessage, throwable);
        this.setErrCode(errCode);
        this.setErrMessage(errMessage);
    }

    protected AbstractException(StatusCode statusCode) {
        this(statusCode.getCode(), statusCode.getMessage());
    }

    protected AbstractException(StatusCode statusCode, Throwable throwable) {
        super(statusCode.getMessage(), throwable);
    }

    public String getErrCode() {
        return errCode;
    }

    public void setErrCode(String errCode) {
        this.errCode = errCode;
    }

    public String getErrMessage() {
        return errMessage;
    }

    public void setErrMessage(String errMessage) {
        this.errMessage = errMessage;
    }
}
```

- `ValidException`：业务类校验异常，固定`errCode`

```java
public class ValidException extends AbstractException {

    private static final long serialVersionUID = 1L;

    private static final ResponseCode DEFAULT_VALID_ERRCODE = ResponseCode.VALID_EXCEPTION_CODE;

    public ValidException(String errMessage) {
        super(DEFAULT_VALID_ERRCODE.getCode(), errMessage);
    }

    public ValidException(String errCode, String errMessage) {
        super(errCode, errMessage);
    }

    public ValidException(StatusCode statusCode) {
        super(statusCode.getCode(), statusCode.getMessage());
    }
}
```

- `BizException`：业务类异常(含堆栈)，固定`errCode`

```java
public class BizException extends AbstractException {

    private static final long serialVersionUID = 1L;

    private static final ResponseCode DEAULT_BIZ_ERRCODE = ResponseCode.BIZ_EXCEPTION_CODE;

    public BizException(String errMessage, Throwable e) {
        super(DEAULT_BIZ_ERRCODE.getCode(), errMessage, e);
    }

    public BizException(StatusCode statusCode, Throwable e) {
        super(statusCode.getCode(), statusCode.getMessage(), e);
    }

    public BizException(String errCode, String errMessage, Throwable e) {
        super(errCode, errMessage, e);
    }

    public BizException(Throwable e) {
        super(DEAULT_BIZ_ERRCODE, e);
    }
}
```

- `BizNoStackException`：业务类异常(不带堆栈信息)，固定`errCode`

```java
public class BizNoStackException extends AbstractException implements Serializable {

    private static final long serialVersionUID = 2628908675799105091L;

    private static final ResponseCode DEAULT_BIZ_ERRCODE = ResponseCode.BIZ_NOSTACK_EXCEPTION;


    public BizNoStackException(String errMessage) {
        super(DEAULT_BIZ_ERRCODE.getCode(), errMessage);
    }

    public BizNoStackException(String errCode, String errMessage) {
        super(errCode, errMessage);
    }

    public BizNoStackException(StatusCode statusCode) {
        super(statusCode.getCode(), statusCode.getMessage());
    }
}
```

- `SysException`：系统级异常(带堆栈)，固定`errCode`

```java
public class SysException extends AbstractException {

    private static final long serialVersionUID = 1L;

    private static final ResponseCode DEFAULT_SYS_ERRCODE = ResponseCode.SYS_EXCEPTION_CODE;

    public SysException(String errMessage, Throwable e) {
        super(DEFAULT_SYS_ERRCODE.getCode(), errMessage, e);
    }

    public SysException(StatusCode statusCode, Throwable e) {
        super(statusCode.getCode(), statusCode.getMessage(), e);
    }

    public SysException(String errCode, String errMessage, Throwable e) {
        super(errCode, errMessage, e);
    }

    public SysException(Throwable e) {
        super(DEFAULT_SYS_ERRCODE, e);
    }
}
```

- `RpasException`：任意异常类(宽松条件)

```java
public class RpasException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private String errCode;

    private String errMessage;

    private String detailMessage;

    public RpasException() {
        super();
    }

    public RpasException(String errCode, String errMessage, String detailMessage) {
        super(errMessage);
        this.errCode = errCode;
        this.errMessage = errMessage;
        this.detailMessage = detailMessage;
    }

    public RpasException(String errCode, String errMessage) {
        this(errCode, errMessage, null);
    }

    public RpasException(StatusCode statusCode) {
        this(statusCode.getCode(), statusCode.getMessage(), null);
    }

    public RpasException(StatusCode statusCode, String detailMessage) {
        this(statusCode.getCode(), statusCode.getMessage(), detailMessage);
    }

    public String getErrCode() {
        return errCode;
    }

    public String getErrMessage() {
        return errMessage;
    }

    public String getDetailMessage() {
        return detailMessage;
    }

}
```

我们希望各类异常与`Http Code`进行绑定，同时固定状态码，达成`抛特定异常=打特定日志=返回对应Http Code+统一返回体`的效果。总结起来如下场景

1. 日志级别`WARN`:对于前置校验类异常，正常来说状态码为`400`，代表前端参数错误，`400`状态下前端不能直接拿到返回体，需要前端异常捕获配合才能打印`msg`，该类型异常已知，不需要人工处理
2. 日志级别`WARN`:对于业务类校验异常`ValidException(不带堆栈)`，状态码为`200`，表示请求正常只是业务拦截，该类型异常已知，不需要人工处理
3. 日志级别`WARN`：对于业务类异常`BizException(带堆栈)`、`BizNoStackException(不带堆栈)`，状态码`200`，表示请求正常只是业务拦截，该类型异常已知，不需要人工处理
4. 日志级别`ERROR`:对于已知可能发生的系统级异常`SysException(带堆栈)`，状态码为`500`，表示出现系统异常，开发者手动抛出该异常说明，该系统级异常已知，需要人工处理
5. 日志级别`ERROR`:对于未知的发生的系统级异常`Exception(带堆栈)`，状态码`500`，表示出现未知的没有被`try catch`的异常，需要人工处理
6. 日志级别`WARN`:用于非固定状态码任意位置的异常`RpasException(可带堆栈、也可不带)`，状态码`200`，由于该类接受任意状态码，目的是兼容前端对接业务状态码场景，可用于兼容存量项目做全局异常

根据上述场景总结，我们可以写出对应的全局异常代码如下

```java
@ExceptionHandler(ValidException.class)
public ResponseEntity<Response<Object>> handleValidException(ValidException validException) {
    final Trace trace = TraceIdUtils.getTrace();
    String errCode = validException.getErrCode();
    String message = validException.getMessage();
    logger.warn("请求Id:{}, SpanId:{}, 参数校验异常:{}, 错误码:{}", trace.getTraceId(), trace.getSpanId(), message, errCode);
    final Response<Object> failResponse = Response.fail(errCode, message);
    return new ResponseEntity<>(failResponse, HttpStatus.OK);
}

@ExceptionHandler(BizException.class)
public ResponseEntity<Response<Object>> handleBizException(BizException bizException) {
    final Trace trace = TraceIdUtils.getTrace();
    String errCode = bizException.getErrCode();
    String message = bizException.getMessage();
    logger.warn("请求Id:{}, SpanId:{}, 业务异常:{}, 错误码:{}, 详细信息:", trace.getTraceId(), trace.getSpanId(), message, errCode, bizException);
    if (logger.isDebugEnabled()) {
        logger.debug(message, bizException);
    }
    final Response<Object> failResponse = Response.fail(errCode, message);
    return new ResponseEntity<>(failResponse, HttpStatus.OK);
}

@ExceptionHandler(BizNoStackException.class)
public ResponseEntity<Response<Object>> handleBizNoStackException(BizNoStackException bizNoStackException) {
    final Trace trace = TraceIdUtils.getTrace();
    String errCode = bizNoStackException.getErrCode();
    String message = bizNoStackException.getMessage();
    logger.warn("请求Id:{}, SpanId:{}, 业务异常(无堆栈):{}, 错误码:{}", trace.getTraceId(), trace.getSpanId(), message, errCode);
    final Response<Object> failResponse = Response.fail(errCode, message);
    return new ResponseEntity<>(failResponse, HttpStatus.OK);
}

@ExceptionHandler(SysException.class)
public ResponseEntity<Response<Object>> handleSysException(SysException sysException) {
    final Trace trace = TraceIdUtils.getTrace();
    String errCode = sysException.getErrCode();
    String message = sysException.getMessage();
    logger.error("请求Id:{}, SpanId:{}, 系统异常:{}, 错误码:{}, 详细信息:", trace.getTraceId(), trace.getSpanId(), message, errCode, sysException);
    if (logger.isDebugEnabled()) {
        logger.debug(message, sysException);
    }
    final Response<Object> failResponse = Response.fail(errCode, message);
    return new ResponseEntity<>(failResponse, HttpStatus.INTERNAL_SERVER_ERROR);
}

@ExceptionHandler(RpasException.class)
public ResponseEntity<Response<Object>> handleRpasException(RpasException rpasException) {
    final Trace trace = TraceIdUtils.getTrace();
    String errCode = rpasException.getErrCode();
    String message = rpasException.getMessage();
    String detailMessage = rpasException.getDetailMessage();
    logger.error("请求Id:{}, SpanId:{}, 系统内部异常:{}, 错误码:{}, 详细信息:{}", trace.getTraceId(), trace.getSpanId(), message, errCode, detailMessage);
    if (logger.isDebugEnabled()) {
        logger.debug(message, rpasException);
    }
    final Response<Object> failResponse = Response.fail(errCode, detailMessage);
    return new ResponseEntity<>(failResponse, HttpStatus.OK);
}

@ExceptionHandler(Exception.class)
public ResponseEntity<Response<Object>> handleException(Exception exception) {
    final Trace trace = TraceIdUtils.getTrace();
    logger.error("请求ID:{}, SpanId:{}, 未知异常:{}, 详细信息:", trace.getTraceId(), trace.getSpanId(), exception.getMessage(), exception);
    if (logger.isDebugEnabled()) {
        logger.debug(exception.getMessage(), exception);
    }
    final Response<Object> failResponse = Response.fail(ResponseCode.UNKNOWN_EXCEPTION_CODE, exception.getMessage());
    return new ResponseEntity<>(failResponse, HttpStatus.INTERNAL_SERVER_ERROR);
}
```

其中，最底下的`Exception`异常捕获将获取到系统内所有的未知/未捕获的异常，进行错误信息打印和统一返回体的包装，不会在出现漏打日志和异常未被捕获的情况。全局异常的处理顺序从上至下，被上层异常处理过的不会再被之后的异常处理。

在有了完备的异常机制之后，前端仅需要记忆`200`、`400`、`500`的`Http Code`含义即可，能够书写出固定的请求模板代码，在对接各个系统之间进行复用，极大地减轻了联调的压力，而`errCode`转变为原本的作用，帮助后端人员快速定位后端服务问题，前/后端也能快速通过状态码看出本次请求出现问题的一方是谁。

::: tip
需要注意的是，`@RestControllerAdvice`定义的全局异常机制，只适用于以`Controller`为入口的请求，在进入`Controller`之后所调用的所有方法任意位置出现异常，均可生效
:::

#### Dubbo RPC

除了`Controller`为入口的全局异常以外，在提供给第三方接口时，我们通常会用到`RPC`。对于`RPC`的异常我们同样需要进行全局异常处理，避免产生提供方接口报错，未进行异常捕获，调用方也未进行异常捕获，将提供方的异常日志打印到调用方，调用方排查半天发现是提供方的问题的情况。

在《阿里巴巴Java开发手册》，也提到过可参考的异常使用方法

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/aliguide-exception.png/zipstyle)
:::

以`Dubbo`为例，我们可以定义一个`Filter`进行异常捕获，此时的`Filter`接口位于`org.apache.dubbo.rpc.Filter`

```java
@Activate(group = {CommonConstants.PROVIDER})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DubboExceptionFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(DubboExceptionFilter.class);

    @Override
    public Result invoke(Invoker<?> invoker, Invocation invocation) throws RpcException {
        String params = JSONUtil.toJsonStr(invocation.getArguments());
        logger.info("Global dubbo exception filter, interface:{}, methodName:{}, params:{}",
                invoker.getInterface(), invocation.getMethodName(), params);
        Result result = invoker.invoke(invocation);
        if (result.hasException()) {
            try {
                ExceptionHandlerMethodResolver resolver = new ExceptionHandlerMethodResolver(this.getClass());
                // 获取RPC过程中出现的具体异常
                Exception exception = (Exception) result.getException();
                // 从@ExceptionHandler注解方法中找到value为exception方法的特定对象
                Method method = resolver.resolveMethod(exception);
                // 找到具体的异常处理类，执行对应处理，这里即返回RemoteResult
                assert method != null;
                Object value = method.invoke(this, exception);
                result.setValue(value);
                return result;
            } catch (Throwable e) {
                logger.error("Dubbo exception filter error, Casued by ", e);
            }
        }
        return result;
    }

    @ExceptionHandler(ValidException.class)
    public Object handleValidException(ValidException exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.warn("catch dubbo validExpcetion, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<ValidException> opValid = Optional.ofNullable(exception);
        String errCode = opValid.map(AbstractException::getErrCode)
                .orElse(ResponseCode.VALID_EXCEPTION_CODE.getCode());
        String errMessage = opValid.map(AbstractException::getErrMessage)
                .orElse(ResponseCode.VALID_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }

    @ExceptionHandler(BizException.class)
    public Object handleBizException(BizException exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.warn("catch dubbo bizExpcetion, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<BizException> opBiz = Optional.ofNullable(exception);
        String errCode = opBiz.map(AbstractException::getErrCode)
                .orElse(ResponseCode.BIZ_EXCEPTION_CODE.getCode());
        String errMessage = opBiz.map(AbstractException::getErrMessage)
                .orElse(ResponseCode.BIZ_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }

    @ExceptionHandler(BizNoStackException.class)
    public Object handleBizNoStackException(BizNoStackException exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.warn("catch dubbo bizNoStackException, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<BizNoStackException> opValid = Optional.ofNullable(exception);
        String errCode = opValid.map(AbstractException::getErrCode)
                .orElse(ResponseCode.VALID_EXCEPTION_CODE.getCode());
        String errMessage = opValid.map(AbstractException::getErrMessage)
                .orElse(ResponseCode.VALID_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }

    @ExceptionHandler(SysException.class)
    public Object handleSysException(SysException exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.error("catch dubbo sysExpcetion, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<SysException> opSys = Optional.ofNullable(exception);
        String errCode = opSys.map(AbstractException::getErrCode)
                .orElse(ResponseCode.SYS_EXCEPTION_CODE.getCode());
        String errMessage = opSys.map(AbstractException::getErrMessage)
                .orElse(ResponseCode.SYS_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }

    @ExceptionHandler(RpasException.class)
    public Object handleRpasException(RpasException exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.error("catch dubbo rpasExpcetion, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<RpasException> opRpas = Optional.ofNullable(exception);
        String errCode = opRpas.map(RpasException::getErrCode)
                .orElse(ResponseCode.RPAS_EXCEPTION_CODE.getCode());
        String errMessage = opRpas.map(RpasException::getErrMessage)
                .orElse(ResponseCode.RPAS_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }

    @ExceptionHandler(Exception.class)
    public Object handleException(Exception exception) {
        final Trace trace = TraceIdUtils.getTrace();
        logger.error("catch dubbo unknown Expcetion, requestId:{}, spanId:{}, exception is:",
                trace.getTraceId(), trace.getSpanId(), exception);
        Optional<Exception> opExcetion = Optional.ofNullable(exception);
        String errCode = ResponseCode.UNKNOWN_EXCEPTION_CODE.getCode();
        String errMessage = opExcetion.map(Exception::getMessage)
                .orElse(ResponseCode.UNKNOWN_EXCEPTION_CODE.getMessage());
        return Response.fail(errCode, errMessage);
    }
}
```

采用`@Activate`定义`Dubbo Filter`扩展点，各异常类的处理与之前的全局异常类似，对于每个RPC请求都会打印请求的接口信息、方法名、参数信息，主要实现在于`invoke`方法内

在这个方法中，会首先进行原生的`RPC`调用拿到调用的结果，如果出现异常则获取当前`Class`下的异常处理类，之后将异常处理的结果(包装统一返回体)重新`set`进原本出现异常的`Result`中，这样便完成了异常的捕获和异常消息的传递。本文拓展的`Dubbo Filter`对默认`Filter`处理无影响。

提供方接入该`Dubbo SPI`后，调用方无需在对`RPC`异常进行处理，无论发生什么异常，提供方均会包装返回体返回，调用方只需关系本次统一返回体中的标示位是否成功即可。

在这里有一个经常会遇到的问题：**受检异常问题**

这个问题的表现在于，假设没有`RPC`全局异常机制，系统内定义了自定义异常，在提供方的实现方法中抛出自定义异常如`throw new BizException()`，此时我们预期的是调用方收到的是`BizExcption`消息，但Dubbo返回的是`RuntimeException`

这个问题的出现在于`Dubbo`默认的`com.alibaba.dubbo.rpc.filter.ExceptionFilter`处理中对于不认识的异常，均会返回`RuntimeException`，虽然在Dubbo服务化最佳实践[^11]中推荐采用将自定义异常放入到`API`包内进行识别，但现实中自定义异常往往跟项目不在一个`Package`，这样做比较繁琐。

网上的解决方法一般还有在接口处申明`throw XXXException`或是直接`Copy Dubbo`本身的`ExceptionFilter`进行覆盖，关闭原本的`ExceptionFilter`的形式，其实都不太好。

这个问题其实在高版本`Dubbo`是不存在的，因为由`@Activate`实现，`dubbo版本<=2.5.x`时可以通过简单的`Xml`配置或`application`配置解决

`Xml`

```xml
<dubbo:provider filter="DubboExceptionFilter"/>
```

`application.yml`

```yaml
dubbo:
  provider:
    filter: com.benym.rpamis.common.core.exception.DubboExceptionFilter
```

### 异常使用

本文使用的技术遵循《阿里巴巴Java开发手册》规范，应用内直接抛出异常，跨应用采用RPC返回体包装

**对于`SpringBoot`项目而言**

- 接入全局异常

在启动类上扫描`exception`基类包即可

```java
@ComponentScan({"你的启动类基础package路径","com.benym.rpamis.common.exception"})
```

- 接入RPC全局异常

通用于`Dubbo SPI`接入方法，在`resource`目录下新建`META-INFO/dubbo/com.alibaba.dubbo.rpc.Filter`(捐赠前)或`META-INFO/dubbo/com.apache.dubbo.rpc.Filter`(捐赠后)，并在文件中填写`DubboExceptionFilter`(可自定义名字)

```java
DubboExceptionFilter=com.benym.rpamis.common.core.exception.DubboExceptionFilter
```

同时在`Provider`的`Xml`或`application.yml`中配置

`Xml`

```xml
<dubbo:provider filter="DubboExceptionFilter"/>
```

`application.yml`

```yaml
dubbo:
  provider:
    filter: com.benym.rpas.common.core.exception.DubboExceptionFilter
```

**对于`SpringMVC`项目而言**

- 接入全局异常

在Xml文件中配置即可

```xml
<context:component-scan base-package="你的启动类基础package路径, com.benym.rpas.common.exception"/>
```

- 接入RPC全局异常

同SpringBoot接入方式

#### 统一使用方法

`全局异常`：

任意`Controller`后位置使用

```java
throw new ValidException("测试自定义异常");
throw new BizException("测试自定义异常", e);
throw new BizNoStackException("测试自定义异常");
throw new SysException("测试自定义异常",e);
throw new RpasException(ResponseCode.SUCCESS.getCode(),"测试自定义异常");
```

对于`ValidException`、`BizNoStackException`，抛出时没有异常堆栈入口，errCode固定，传输StatusCode子类时可改变errCode，日志不打印堆栈

对于`BizException`、`SysException`，抛出时强制带异常堆栈，errCode固定，传输StatusCode子类时可改变errCode，日志打印堆栈

对于`RpasException`，抛出时可带堆栈，也可不带，errCode不固定，传输StatusCode子类时可改变errCode，日志默认不带堆栈，可在debug模式下开启，状态码200

`RPC全局异常`：

无额外使用方法，接入后即可生效

### 实践对比

以之前的返回体地狱示例为例

接入前

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/exception-before.png)
:::

接入后

::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/exception-after.png)
:::

由此可见接入后的业务逻辑更加清晰，且MVC三层职责明确，代码量减少明显

### 可控性分析

全局异常及全局RPC异常仅在开启后生效。

`全局异常`：

- 捕获的入口位于`Controller`，正常来说需要接受返回值，全局异常捕获自定义异常及参数校验注解，对未接入过该异常包的项目无任何影响。如原本项目中已存在自定义异常，请酌情使用任意一个即可。
- 全局异常仅在出现异常时生效，最大的Exception能够捕获所有没有捕获的异常，接入前出现未捕获异常和接入后出现未捕获异常，接口均返回`500`，对前端处理逻辑无影响。
- 抛出自定义异常后，状态码对接需要由对接`errCode->Http Code`，具体异常原因提示，需要前端异常处理后再显示。

`RPC全局异常`：

- 捕获的入口为`Dubbo RPC`接口，如调用方需要识别异常来进行重试等操作需要改变代码
- 如调用方采用识别`isSuccess`标识，判断接口调用是否成功，则无需改变代码

当然了，这样的异常基础包也可以做成`starter`便于多个项目接入，通过配置yml达成开关全局异常/rpc异常的目的，本文不再介绍。

### 可扩展性分析

所有的自定义异常都具有`StatusCode`为入口改变异常枚举Code的方法，为了适配多系统间不统一的状态码

可采用实现`StatusCode`接口+`RpasException`的形式，快速接入全局异常，且不会对存量项目造成额外的影响。

### 参考文章

[^1]: <https://jcp.org/en/jsr/detail?id=303>
[^2]: <https://beanvalidation.org/>
[^3]: <https://docs.jboss.org/hibernate/stable/validator/reference/en-US/html_single/#validator-gettingstarted>
[^4]: <https://www.toutiao.com/article/7158309490746589727/?upstream_biz=toutiao_pc&_share_channel=wechat&source=m_redirect&wid=1667972352288>
[^5]: <https://docs.spring.io/spring-framework/docs/6.0.0-RC2/javadoc-api/org/springframework/http/ProblemDetail.html>
[^6]: <https://segmentfault.com/a/1190000023471742>
[^7]: <https://cn.dubbo.apache.org/zh/docs/advanced/parameter-validation/>
[^8]: <https://github.com/alibaba/p3c>
[^9]: <https://www.zhihu.com/question/513865370>
[^10]: <https://github.com/alibaba/COLA>
[^11]: <https://cn.dubbo.apache.org/zh/docsv2.7/user/best-practice/>

