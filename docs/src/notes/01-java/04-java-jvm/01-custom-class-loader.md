---
title: 自定义类加载器
date: 2021-11-18 19:48:15
description: 总结
categories: 
  - Java
tags: 
  - 类加载器
  - ClassLoader
  - 双亲委派模型
  - Java
keywords: Java,类加载器,ClassLoader,双亲委派模型
permalink: /pages/0a146e/
author: 
  name: benym
  link: https://github.com/benym
---

## 自定义类加载器

自定义类加载器的实现与作用

 <!--more-->

### 为什么需要自定义类加载器

自定义类加载器是从实际场景出发，解决一些应用上的问题，比如：

1. 热部署、插件化类：常用的比如`SpringBoot-devtools`和`Arthas`等工具，其实现原理就用到了类加载机制
2. 加密：有些核心代码不想公开，但又必须使用，可以通过加密类字节码的方式将编译后的加密代码交给类加载器加载，再采用某种解密算法将真正的类载入`JVM`，保证核心代码不被反编译泄漏
3. 类隔离：在项目中可能不同的微服务用的某个类的版本不一样，某些应用依赖于特定版本的`SDK`功能，自定义类加载器可以解决某个同名的`Class`想要加载不同的版本的场景，实现同名Class多版本共存，相互隔离从而达到解决版本冲突的目的。如`Java`模块化规范 `OSGi `、蚂蚁金服的类隔离框架`SOFAArk`
4. 非标准化来源加载代码：编译后的字节码在数据库、云端等情况

### 双亲委派模型

想要自定义类加载器，一定需要了解双亲委派模型

双亲委派模型加载`class`的步骤可为如下几步：

1. 根据全限定类名(name)**判断类是否加载**，如果已经加载则直接返回已加载类。
2. 如果没有加载，尝试**委托父类加载器**加载此类。同时，**父类加载器也会采用相同的策略**，查看是否自己已经加载该类，如果有就返回，没有就继续委托给父类进行加载，直到`BootStrapClassLoader`。如果父类加载器为`null`则代表使用`BootStrapClassLoader`进行加载。
3.  父类无法加载，交给子类进行加载。按照从`BootStrapClassLoader->ExtClassLoader->AppClassLoader->自定义类加载器`的顺序依次尝试加载。

其加载`class`的核心方法`loadClass`源码如下：

```java
    protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException
    {
        synchronized (getClassLoadingLock(name)) {
            // First, check if the class has already been loaded
            // 第一步，检查需要加载的这个类是否已经被加载过
            Class<?> c = findLoadedClass(name);
            if (c == null) {
                long t0 = System.nanoTime();
                try {
                    // 调用父类加载器尝试加载
                    if (parent != null) {
                        c = parent.loadClass(name, false);
                    } else {
                        c = findBootstrapClassOrNull(name);
                    }
                } catch (ClassNotFoundException e) {
                    // ClassNotFoundException thrown if class not found
                    // from the non-null parent class loader
                    // 捕获父类加载器无法加载的请求
                }

                if (c == null) {
                    // If still not found, then invoke findClass in order
                    // to find the class.
                    long t1 = System.nanoTime();
                    // 如果父类加载器不能加载，就尝试采用子类加载器加载
                    c = findClass(name);

                    // this is the defining class loader; record the stats
                    PerfCounter.getParentDelegationTime().addTime(t1 - t0);
                    PerfCounter.getFindClassTime().addElapsedTimeFrom(t1);
                    PerfCounter.getFindClasses().increment();
                }
            }
            if (resolve) {
                // 链接指定类
                resolveClass(c);
            }
            return c;
        }
    }
```

下图更好的展示了双亲委派的过程：

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/%E5%8F%8C%E4%BA%B2%E5%A7%94%E6%B4%BE%E6%A8%A1%E5%9E%8B.png)

### 双亲委派的好处

1. 安全性。避免了用户自己编写的类与Java的核心类冲突，如自定义了java.lang.String.class类不会被系统加载，因为顶层启动类加载器会先于自定义加载器加载该类，防止核心API被修改
2. 避免类的重复加载。如果父类已经加载过该类，则直接返回，在JVM中区分不同的类，不仅需要根据全限定名，且需要判断是否是同一个ClassLoader。相同的class文件被不同的ClassLoader加载就是不同的两个类。

### 自定义步骤

自定义类加载器只需要继承`ClassLoader`，同时覆盖`findClass`方法(而不是`loadClass`方法)即可

::: tip
Subclasses of ClassLoader are encouraged to override findClass(String), rather than this method.
Unless overridden, this method synchronizes on the result of getClassLoadingLock method during the entire class loading process. 官方推荐
:::

准备两个类，一个类作为实体，一个类作为Service

`TestUser.java`

```java
public class TestUser {

    private String name;

    public TestUser() {
    }

    public TestUser(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "========这是User测试文件1号========";
    }
}
```

`TestService.java`

```java
public class TestService {

    public String testPrint(String name) {
        String result = name + "调用当前方法";
        System.out.println(name + "调用当前方法");
        return result;
    }
}
```

自定义类加载器`CustomClassLoader.java`

```java
package com.test.custom;

import java.io.FileInputStream;


public class CustomClassLoader extends ClassLoader {

    private String classPath;

    public CustomClassLoader() {
    }

    public CustomClassLoader(String classPath) {
        this.classPath = classPath;
    }

    private byte[] loadByte(String name) throws Exception {
        name = name.replaceAll("\\.", "/");
        String a = classPath + "/" + name + ".class";
        FileInputStream fileInputStream = new FileInputStream(classPath + "/" + name + ".class");
        int len = fileInputStream.available();
        byte[] data = new byte[len];
        fileInputStream.read(data);
        fileInputStream.close();
        return data;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
            byte[] data = loadByte(name);
            //defineClass将一个字节数组转为Class对象，这个字节数组是class文件读取后最终的字节数组。
            return defineClass(name, data, 0, data.length);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return super.findClass(name);
    }
}

```

自定义的函数很简单，将全限定名的class文件加载为字节码数组，然后传入`defineClass`方法进行加载，`defineClass`的作用是将一个字节数组转化为`Class`对象

#### POJO测试类LoadCustomPojoTest

需要注意的是**要加载的Class必须在全限定名一样的目录**下进行`javac`编译，以为`package`必须一致，比如`com.test.custom.pojo.TestUser`，`TestUser`必须在`com.test.custom.pojo`目录下编译生成字节码

```java
package com.test.custom;


public class LoadCustomPoJoTest {

    public static void main(String[] args) throws Exception {
        // 初始化自定义类加载器，会先初始化父类ClassLoader，其中会把自定义类加载器的父类加载器设置为应用程序类加载器AppClassLoader
        CustomClassLoader classLoader = new CustomClassLoader(
                "E:/ideaProject/custom-classloader/src");
        // 从磁盘中创建一个目录，将要加载的类的class放入目录
        // Class.forName效果和classLoader.loadClass一致
        Class<?> clazz = Class.forName("com.test.custom.pojo.TestUser", true, classLoader);
        Object obj = clazz.newInstance();
        System.out.println(obj.toString());
        System.out.println(clazz.getClassLoader());

        System.out.println();
        CustomClassLoader classLoader2 = new CustomClassLoader(
                "E:/ideaProject/custom-classloader/src");
        Class clazz1 = Class.forName("com.test.custom.pojo.repeat.TestUser", true, classLoader2);
        Object obj1 = clazz1.newInstance();
        System.out.println(obj1.toString());
        System.out.println(clazz1.getClassLoader());
    }
}

```

我们测试两个同名的`Class`对象共存的情况，两个`TestUser`只在`toString`方法打印的**数据**和**包名**不一样

必须采用不同的类加载器加载同名对象，否则同一个类加载器会以第一次加载的对象为准

```java
com.test.custom.pojo.TestUser

package com.test.custom.pojo;

public class TestUser {
    // ......
    public String toString() {
        return "========这是User测试文件1号========";
    }
}
```

```java
package com.test.custom.pojo.repeat;

public class TestUser {
    // ......
    public String toString() {
        return "========这是User测试文件2号========";
    }
}
```

#### 测试POJO结果

```java
========这是User测试文件1号========
com.test.custom.CustomClassLoader@2133c8f8

========这是User测试文件2号========
com.test.custom.CustomClassLoader@30c7da1e
```

可以看到，两个类加载器是不一样的，且两个类的方法都已经打印了，说明此时同名类不同版本共存。

#### Service测试类LoadCustomMethodTest

构建一个带参数的Service方法，加载到方法之后，利用反射进行调用

```java
package com.test.custom;

import java.lang.reflect.Method;


public class LoadCustomMethodTest {

    public static void main(String[] args) throws Exception {
        // 初始化自定义类加载器，会先初始化父类ClassLoader，其中会把自定义类加载器的父类加载器设置为应用程序类加载器AppClassLoader
        CustomClassLoader classLoader = new CustomClassLoader(
                "E:/ideaProject/custom-classloader/src");
        // 从磁盘中创建一个目录，将要加载的类的class放入目录
        Class clazz = classLoader.loadClass("com.test.custom.service.TestService");
        Object obj = clazz.newInstance();
        Method method = clazz.getDeclaredMethod("testPrint", String.class);
        method.invoke(obj, "李四");
        System.out.println(clazz.getClassLoader());
    }
}
```

#### 测试Service结果

```java
李四调用当前方法
com.test.custom.CustomClassLoader@49e4cb85
```

## 参考资料

> 1. <https://www.cnblogs.com/twoheads/p/10143038.html>
> 2. <https://blog.csdn.net/liubenlong007/article/details/103593443>
> 3. <https://www.cnblogs.com/lichmama/p/12858517.html>
> 4. <https://www.cnblogs.com/huangjianping/p/14968403.html>

