---
title: 动态代理
date: 2021-10-19 14:46:15
description: 总结
categories: 
  - Java
tags: 
  - 动态代理
  - Java
keywords: Java,动态代理,JDK,Cglib
permalink: /pages/ddcc22/
author: 
  name: benym
  link: https://github.com/benym
---

## 动态代理使用方法

Java动态代理实现方法概述与实验

 <!--more-->

### 代理模式

代理模式是指：为其他对象提供一种**代理**以控制对某个对象的访问。在某些情况下，一个对象不适合或者不能直接引用另一个对象，此时可以引入代理对象作为该情况下客户端和目标对象之间的中介。

作用：通过代理对象访问目标对象，可以在不修改目标对象的前提下，提供额外的功能操作，扩展目标对象的功能

在Spring生态中，AOP正是用到了代理模式，作为切面去增强业务方法。

代理目前可以分为静态代理和动态代理2类，而动态代理则分为JDK代理和Cglib代理。

- 静态代理：编译时实现，编译完成后的代理类是一个实际的class文件
- 动态代理：在运行时动态生成，编译完成后没有实际的class文件，而是**在运行时动态生成类字节码，并加载到JVM中**

### 1.静态代理

#### **场景**

假设现在我们需要创建一个用户，在创建用户的前后需要记录相关日志，但用户的创建逻辑在其他系统，我们无法直接访问代码修改业务逻辑，此时我们就需要一个代理对象在创建用户业务的前后做日志增强操作，达到扩展的目的。

#### **实现方法**

- 创建一个User接口定义`createUser`方法
- 创建一个实现了User接口的RealUser实体类，作为代理对象
- 创建一个StaticProxyHandler代理类，同样也实现User接口，并在代理类中持有代理对象的引用，在后续通过代理方法调用此引用对象的方法，以达到代理的目的

```java
public interface User {
  
    String createUser(String userName, String passWord);
}
```

```java
public class RealUser implements User {

    @Override
    public String createUser(String userName, String passWord) {
        System.out.println("用户名：" + userName + "，密码：" + passWord);
        return userName + ":" + passWord;
    }
}
```

```java
public class StaticProxyHandler implements User {

    private RealUser realUser;

    public StaticProxyHandler(RealUser realUser) {
        this.realUser = realUser;
    }

    @Override
    public String createUser(String userName, String passWord) {
        // 调用目标方法前的处理
        System.out.println("开始创建用户了...");
        // 调用目标对象的方法
        String user = realUser.createUser(userName, passWord);
        // 调用目标方法后的处理
        System.out.println("用户创建完了...");
        return user;
    }
}
```

其中的`User`类定义了代理类和代理对象之间的共用接口，而`RealUser`作为代理对象实现了真正执行的业务逻辑(在这里为创建用户)，`StaticProxyHandler`代理`RealUser`在创建用户逻辑前后做方法增强

#### **测试效果**

```java
public class Main {

    public static void main(String[] args) {
        // 新建目标对象
        RealUser target = new RealUser();
        // 创建代理对象，并使用接口对其引用
        User user = new StaticProxyHandler(target);
        // 调用接口方法
        user.createUser("张三", "123");
    }
}
```

```java
开始创建用户了...
用户名：张三，密码：123
用户创建完了...
```

#### **静态代理缺陷**

对于每个目标类都需要编写对应的代理类，如果需要代理的目标很多，那么就会写大量的代理代码，过程繁琐

#### **解决方法**

仔细思考一下上述过程，代理类中我们会创建代理对象的引用，且需要去实现和他相同的接口，我们想要减少代理类的最直接的方法是通过不断的在类中增加代理对象，实现代理方法，但是这样的代码是不具备通用性的，当遇到了需要代理的目标就需要不断的实现和引用。

- 能不能**动态的创建代理类**，减少代理类的书写呢？
  - Answer: 动态代理类

在JDK中`Proxy.getProxyClass`可以获得动态代理类

- 能不能使这个代理类**无需显示定义代理对象的引用**，还能**知道这个代理对象的方法**，做到**通用性**呢？
  - Answer: 动态代理对象

可以想到的是利用**反射机制**，动态的去生成代理的Class对象，Class对象中包含了构造器、方法、字段等，能拿到Class对象我们就能够进行对象实例化，创建一个动态的实例了

### 2.动态代理-JDK

#### **动态代理步骤**

1. 实现`InvocationHandler`接口自定义自己的`InvocationHandler`
2. 通过`Proxy.getProxyClass`获得动态代理类
3. 通过反射机制获取代理类的构造方法，方法签名为`getConstructor(InvocationHandler.class)`
4. 通过构造函数获取代理对象，并将自定义的`InvocationHandler`实例对象作为参数传入
5. 通过代理对象调用目标方法

还是以上文的对象为例

```java
public interface User {
  
    String createUser(String userName, String passWord);
}
```

```java
public class RealUser implements User {

    @Override
    public String createUser(String userName, String passWord) {
        System.out.println("用户名：" + userName + "，密码：" + passWord);
        return userName + ":" + passWord;
    }
}
```

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class DynamicProxyHandler implements InvocationHandler {

    // 目标方法
    private Object target;

    public DynamicProxyHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("开始创建用户了...");
        // 调用目标对象的方法
        Object result = method.invoke(target, args);
        System.out.println("用户创建完了...");
        return result;
    }
}

```

#### **第一种方法**

严格按照上述2-5步骤实现动态代理

```java
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class ProxyTest {

    public static void main(String[] args) throws Exception {
        // 生成$Proxy0的class文件
        System.getProperties().put("sun.misc.ProxyGenerator.saveGeneratedFiles", "true");
        // 获取动态代理对象
        Class<?> proxyClass = Proxy.getProxyClass(
                        RealUser.class.getClassLoader(), // 代理对象类加载器
                        RealUser.class.getInterfaces()); // 代理对象和目标对象实现相同的接口
        // 获取代理类的构造函数，并传入InvocationHandler.class
        Constructor<?> constructor = proxyClass.getConstructor(InvocationHandler.class);
        // 通过构造函数来创建动态代理对象，将自定义的InvocationHandler实例传入
        User user = (User) constructor
                .newInstance(new DynamicProxyHandler(new RealUser()));
        // 通过代理对象调用目标方法
        user.createUser("张三", "123456");
    }
}

```

#### **第二种方法**

上述2-5步骤可以简化为Proxy类提供的方法

```java
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class ProxyTest {

    public static void main(String[] args) throws Exception {
        /**
         * 第二种方法，使用Proxy类已封装好的方法
         */
        User user2 = (User) Proxy.newProxyInstance(
                        RealUser.class.getClassLoader(),
                        RealUser.class.getInterfaces(),
                        new DynamicProxyHandler(new RealUser())); // 创建一个与代理对象关联的InvocationHandler
        user2.createUser("李四", "45678");
    }
}

```

`Proxy.newProxyInstance()`方法接受三个参数：

- `ClassLoader loader`: 指定当前目标对象使用的类加载器,获取加载器的方法是固定的
- `Class<?>[] interfaces`: 指定目标对象实现的接口的类型,使用泛型方式确认类型
- `InvocationHandler`: 指定动态处理器，执行目标对象的方法时,会触发事件处理器的方法

JDK代理和静态代理的不同之处：

- 静态代理需要编码创建代理类
- JDK代理时，代理类不再需要**直接**实现代理对象的接口，而是采用了动态代理的方式在运行时进行代理类的创建。其核心在于实现了`InvocationHandler`，通过`invoke`来调用代理对象的方法

值得注意的是，JDK代理和静态代理**都要求代理对象(本文中的RealUser)去实现接口**，局限性很强，如果代理对象没有实现接口应该怎么去做呢？

### 3.动态代理-Cglib

Cglib包底层采用了字节码处理框架`ASM`，通过字节码技术为一个类创建子类，并在子类中拦截所有父类方法的调用，由于Cglib在生成的代理类中会去**继承代理对象**，所以其**不能对final修饰的类进行代理**。

#### Cglib代理步骤

1. 实现一个`MethodInterceptor`，与JDK动态代理`InvocationHandler`接口类型，`invoke`变为了`intercept`
2. 通过Cglib的`Enhancer`类实现动态代理获取代理对象

为了和JDK代理区分开，这里我们构造一个没有实现接口的方法

```java
public class CglibUser {

    private String name;

    public CglibUser() {
        System.out.println("无参构造函数创建代理对象");
    }

    public CglibUser(String name) {
        System.out.println("有参构造函数创建代理对象" + name);
    }

    public String createUser(String userName, String passWord) {
        System.out.println("用户名：" + userName + "，密码：" + passWord);
        return userName + ":" + passWord;
    }

    /**
     * 该方法不能被子类覆盖，Cglib无法代理final修饰的方法，而是直接调用
     */
    public final void finalTest() {
        System.out.println("final方法不能被代理");
    }
}
```

实现`MethodInterceptor`接口，在接口内实现方法增强

```java
import java.lang.reflect.Method;
import net.sf.cglib.proxy.MethodInterceptor;
import net.sf.cglib.proxy.MethodProxy;

public class CglibProxyInterceptor implements MethodInterceptor {

    /**
     * @param o cglib生成的代理对象
     * @param method 被代理对象方法
     * @param objects 方法入参
     * @param methodProxy 代理方法
     */
    @Override
    public Object intercept(Object o, Method method, Object[] objects, MethodProxy methodProxy)
            throws Throwable {
        System.out.println("开始创建用户了...");
        // 调用目标对象的方法
        // 1. 这里不能使用methodProxy.invoke()，会栈溢出，此时等于循环调用methodProxy自身
        // 2. 使用method.invoke()的时候不能使用参数中的o作为执行对象，否则也会发生
        // 类似的栈溢出错误，必须自行另外创建一个新的对象
        Object result = methodProxy.invokeSuper(o, objects);
        System.out.println("用户创建完了...");
        return result;
    }
}
```

> 在自定义Interceptor中，采用`methodProxy.invoke()`方法会发生栈溢出，而采用`methodProxy.invokeSuper`才能得到正确的结果。出现这种问题的原因可见这篇博文https://juejin.cn/post/6844904054833807374

在测试类中使用`Enhancer`对象实现动态代理

```java
import net.sf.cglib.core.DebuggingClassWriter;
import net.sf.cglib.proxy.Enhancer;

public class CglibMain {

    public static void main(String[] args) {
        // 代理类class文件存入本地磁盘方便我们反编译查看源码
        System.setProperty(DebuggingClassWriter.DEBUG_LOCATION_PROPERTY, "/Users/ben");
        // 创建增强器
        Enhancer enhancer = new Enhancer();
        // 设置enhancer对象需要代理的类，等价于JDK中newProxyInstance的第二个参数
        enhancer.setSuperclass(CglibUser.class);
        // 设置enhancer的回调对象，等价于JDK中newProxyInstance的第三个参数
        enhancer.setCallback(new CglibProxyInterceptor());
        // 创建代理对象
        CglibUser proxy = (CglibUser) enhancer.create();
        // 通过代理对象调用目标方法
        proxy.createUser("王五","123");
        // 测试final方法
        proxy.finalTest();
    }
}
```

#### 测试效果

##### 非final方法

前后可以增强，可以发现，在创建代理对象时，Cglib将调用代理对象的无参构造函数

```java
无参构造函数创建代理对象
开始创建用户了...
用户名：王五，密码：123
用户创建完了...
```

##### final方法

直接调用不能做增强

```java
final方法不能被代理
```

#### 为什么需要无参构造函数

Cglib**需要代理对象实现无参构造函数**，否则会出现错误

```java
public class CglibUser {

    private String name;

    // 仅有参构造函数
    public CglibUser(String name) {
        System.out.println("有参构造函数创建代理对象" + name);
    }

    /**省略**/
}
```

##### 测试结果

```java
Exception in thread "main" java.lang.IllegalArgumentException: Superclass has no null constructors but no arguments were given
	at net.sf.cglib.proxy.Enhancer.emitConstructors(Enhancer.java:931)
	at net.sf.cglib.proxy.Enhancer.generateClass(Enhancer.java:631)
	at net.sf.cglib.core.DefaultGeneratorStrategy.generate(DefaultGeneratorStrategy.java:25)
	....省略
```

**enhancer.create()**

出现这种问题的原因可以通过`enhancer.create()`源码了解到，create默认`argumentTypes`为`null`，如果需要无参创建代理对象自然需要代理对象具有无参构造方法

```java
    /**
     * Generate a new class if necessary and uses the specified
     * callbacks (if any) to create a new object instance.
     * Uses the no-arg constructor of the superclass.
     * @return a new instance
     */
    public Object create() {
        // 用于判断是否需要创建对象，false表示需要创建对象
        classOnly = false;
        // 因为使用的是无参构造，所以该属性为null
        argumentTypes = null;
        // 创建动态代理class的方法
        return createHelper();
    }
```

#### 如何支持有参构造函数创建对象

很多时候代理的对象内部持有有参的构造函数，纯无参的代理方式显然不满足这样的场景，在Cglib中create具有重载方法来支持这种代理场景

```java
    /**
     * Generate a new class if necessary and uses the specified
     * callbacks (if any) to create a new object instance.
     * Uses the constructor of the superclass matching the <code>argumentTypes</code>
     * parameter, with the given arguments.
     * @param argumentTypes constructor signature
     * @param arguments compatible wrapped arguments to pass to constructor
     * @return a new instance
     */

    // 接收两个参数
    // 1. 参数类型数组
    // 2. 具体的参数数组
    public Object create(Class[] argumentTypes, Object[] arguments) {
        classOnly = false;
        if (argumentTypes == null || arguments == null || argumentTypes.length != arguments.length) {
            throw new IllegalArgumentException("Arguments must be non-null and of equal length");
        }
        this.argumentTypes = argumentTypes;
        this.arguments = arguments;
        return createHelper();
    }
```

接着上面的例子，此时我们需要一个代理类从一个有参构造函数生成，稍微改造一下代理对象

```java
public class CglibUser {

    private String name;

    private Integer passWord;

    public CglibUser() {
        System.out.println("无参构造函数创建代理对象");
    }

    public CglibUser(String name,Integer passWord) {
        this.name = name;
        this.passWord = passWord;
        System.out.println("有参构造函数创建代理对象" + name);
    }

    public String createUser() {
        System.out.println("用户名：" + this.name + "，密码：" + this.passWord);
        return this.name + ":" + this.passWord;
    }
}
```

此时构造函数内有两个参数，对应的测试类需要重载`create`方法，第一个参数是`CglibUser`构造函数的参数列表的`Class`数组，第二个参数是对应的值

```java
import net.sf.cglib.core.DebuggingClassWriter;
import net.sf.cglib.proxy.Enhancer;

public class CglibMain {

    public static void main(String[] args) {
        // 代理类class文件存入本地磁盘方便我们反编译查看源码
        System.setProperty(DebuggingClassWriter.DEBUG_LOCATION_PROPERTY, "/Users/ben");
        // 通过CGLIB动态代理获取代理对象的过程
        Enhancer enhancer = new Enhancer();
        // 设置enhancer对象的父类
        enhancer.setSuperclass(CglibUser.class);
        // 设置enhancer的回调对象
        enhancer.setCallback(new CglibProxyInterceptor());
        // 创建代理对象，重载create方法填写
        CglibUser proxy = (CglibUser) enhancer
                .create(new Class[]{String.class, Integer.class}, new Object[]{"李四", 12345});
        // 通过代理对象调用目标方法
        proxy.createUser();
    }
}
```

##### 测试结果

```java
有参构造函数创建代理对象李四
开始创建用户了...
用户名：李四，密码：12345
用户创建完了...
```

### 4.总结

1. Cglib动态代理基于继承，可以不需要代理没有实现接口的类，也可以代理实现了接口的类，但Cglib无法对final方法进行代理，核心方法`MethodInterceptor`

2. JDK代理只能基于接口，代理类必须是一个实现了某个接口的类，核心方法`InvocationHandler`

3. Spring中JDK代理和Cglib代理同时存在

   - 当Bean实现接口时，Spring就会用JDK的动态代理。

   - 当Bean没有实现接口时，Spring使用CGlib实现。

   - 可以强制使用CGlib

## 参考资料：

> 1. https://www.zhihu.com/question/20794107
> 2. https://qiankunli.github.io/2020/04/09/java_dynamic_proxy.html
> 3. https://www.cnblogs.com/gonjan-blog/p/6685611.html
> 4. https://developer.aliyun.com/article/71337
> 5. https://mp.weixin.qq.com/s/dBoihzxGiDpOP8ObSHrE_w
> 6. https://www.cnblogs.com/daniels/p/8242592.html
> 7. https://baike.baidu.com/item/%E4%BB%A3%E7%90%86%E6%A8%A1%E5%BC%8F/8374046?fr=aladdin
> 8. https://stackoverflow.com/questions/15223297/superclass-has-no-null-constructors-but-no-arguments-were-given
> 9. https://juejin.cn/post/6844904054833807374

