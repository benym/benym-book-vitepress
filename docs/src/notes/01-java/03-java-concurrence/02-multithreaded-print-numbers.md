---
title: 多线程交替打印数字—多种实现
date: 2022-01-14 21:18:48
categories: 
  - Java
tags: 
  - Java
  - 多线程
permalink: /pages/5047a0/
author: 
  name: benym
  link: https://github.com/benym
---

### 多线程交替打印数字—多种实现

#### 使用synchronized锁实现

```java
public class Test {

    public static void main(String[] args) {
        mutilThreadPrintNum m1 = new mutilThreadPrintNum();
        Thread thread1 = new Thread(m1);
        Thread thread2 = new Thread(m1);
        thread1.setName("奇数");
        thread2.setName("偶数");
        thread1.start();
        thread2.start();
    }
}

class mutilThreadPrintNum implements Runnable {

    int num = 1;

    @Override
    public void run() {
        synchronized (this) {
            while (true) {
                // 唤醒wait()的一个或所有线程
                notify();
                if (num <= 100) {
                    System.out.println(Thread.currentThread().getName() + ":" + num);
                    num++;
                } else {
                    break;
                }
                try {
                    // wait会释放当前的锁，让另一个线程可以进入
                    wait();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

##### 打印结果

```java
奇数:1
偶数:2
奇数:3
偶数:4
......
奇数:99
偶数:100
```

通过加锁和`notify()`、`wait()`机制可以有效的实现两个线程分别打印奇数和偶数，但互斥锁始终会影响性能，效率不高。

#### 使用valatile标志位实现

```java
public class Test {

    static volatile boolean flag = true;
    static volatile int num = 1;

    public static void main(String[] args) {
        mutilThreadPrintNumOdd m1 = new mutilThreadPrintNumOdd();
        mutilThreadPrintNumEven m2 = new mutilThreadPrintNumEven();
        Thread thread1 = new Thread(m1);
        Thread thread2 = new Thread(m2);
        thread1.setName("奇数");
        thread2.setName("偶数");
        thread1.start();
        thread2.start();
    }

    public static class mutilThreadPrintNumOdd implements Runnable {

        @Override
        public void run() {
            while (num <= 100) {
                if (flag) {
                    System.out.println(Thread.currentThread().getName() + ":" + num);
                    num++;
                    flag = false;
                }
            }
        }
    }

    public static class mutilThreadPrintNumEven implements Runnable {

        @Override
        public void run() {
            while (num <= 100) {
                if (!flag) {
                    System.out.println(Thread.currentThread().getName() + ":" + num);
                    num++;
                    flag = true;
                }
            }
        }
    }
}
```

打印结果和上文相同，使用`volatile`关键字可以保证变量的可见性，但并不能保证num的原子性，即多个线程操作num时，他是非线程安全的，此处能够正确打印的原因是因为`flag`标志位的判断。相对于加锁来说，效率更高

#### 使用AtomicInteger+LockSupport实现

```java
public class Test {

    public static AtomicInteger num = new AtomicInteger(1);

    public static Thread thread1 = null, thread2 = null;

    public static void main(String[] args) {
        mutilThreadPrintNumOdd m1 = new mutilThreadPrintNumOdd();
        mutilThreadPrintNumEven m2 = new mutilThreadPrintNumEven();
        thread1 = new Thread(m1);
        thread2 = new Thread(m2);
        thread1.setName("奇数");
        thread2.setName("偶数");
        thread1.start();
        thread2.start();

    }

    public static class mutilThreadPrintNumOdd implements Runnable {

        @Override
        public void run() {
            while (true) {
                if (num.get() % 2 != 0 && num.get() <= 100) {
                    System.out.println(Thread.currentThread().getName() + ":" + num);
                    // 原子递增
                    num.incrementAndGet();
                    // 获取许可，阻塞其他线程
                    LockSupport.park();
                } else {
                    // 释放许可，并将许可传递到偶数线程
                    LockSupport.unpark(thread2);
                }
            }
        }
    }

    public static class mutilThreadPrintNumEven implements Runnable {

        @Override
        public void run() {
            while (true) {
                if (num.get() % 2 == 0 && num.get() <= 100) {
                    System.out.println(Thread.currentThread().getName() + ":" + num);
                    // 原子递增
                    num.incrementAndGet();
                    // 获取许可，阻塞其他线程
                    LockSupport.park();
                } else {
                    // 释放许可，并将许可传递到奇数线程
                    LockSupport.unpark(thread1);
                }
            }
        }
    }
}
```

使用JUC包内的`AtomicInteger`保持多线程并发安全，同时采用`LockSupport`唤醒或阻塞线程

#### 踩坑日志

第三种实现方法一开始并不是正确的，如果`LockSupport.park()`方法放在如下位置

```java
@Override
public void run() {
    while (true) {
        // 获取许可，阻塞其他线程
        LockSupport.park();
        if (num.get() % 2 != 0 && num.get() <= 100) {
            System.out.println(Thread.currentThread().getName() + ":" + num);
            // 原子递增
            num.incrementAndGet();
        } else {
            // 释放许可，并将许可传递到偶数线程
            LockSupport.unpark(thread2);
        }
    }
}
```

那么程序将会发生**死锁**，**因为两个线程都持有当前线程的许可，并没有等待到释放许可的执行**，当我们把断点放在奇数和偶数获取许可的代码段上时，会发现奇数线程先获取了许可，还没来得及执行`if`判断，偶数线程也获得了许可，此时程序没有任何打印。
奇数线程：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/threadodd.png/zipstyle" alt="奇数线程" style="zoom:60%;" />
:::
偶数线程：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/threadeven.png/zipstyle" alt="偶数线程" style="zoom:60%;" />
:::
此时我们采用`jps`命令找到当前线程的`pid`
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/jpsimg.png/zipstyle" alt="jps" style="zoom:60%;" />
:::
之后采用`jstack pid`命令分析当前线程的堆栈信息，可以发现奇数线程和偶数线程都处于`WAITING `状态，他们都在等待对方释放锁或传递许可。所以正确的写法应该在`if`判断内，当打印之后便会阻塞当前线程，由于数字已经打印，再次循环时便会进入到`else`的判断逻辑，即当前线程发现不是属于自己该打印的数字就会尝试唤醒另一个线程。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/jstackan.png/zipstyle" alt="jstack" style="zoom:60%;" />
:::