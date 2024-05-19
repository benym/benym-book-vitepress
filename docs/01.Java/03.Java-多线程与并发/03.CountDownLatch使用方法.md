---
title: CountDownLatch使用方法
date: 2022-01-18 16:18:48
categories: 
  - Java
tags: 
  - Java
  - JUC
permalink: /pages/bccbee/
author: 
  name: benym
  link: https://github.com/benym
---

### CountDownLatch使用方法

`CountDownLatch`是`JUC`包中的一个同步工具类，允许一个或多个线程等待，直到其他线程执行完毕之后再执行。

#### 应用场景

`CountDownLatch`通常有两种使用场景：

- 场景1. 让多个线程等待——强调多个线程的**最大并行性**，即多个线程在同一时刻开始执行，类似赛跑场景，多个线程都在起点，等待发令后同时开跑，只需初始化1个计数器
- 场景2. 让一个线程等待——主线程等待其他n个线程执行完毕之后进行执行，需要初始化n个计数器

#### 基本原理

- 创建 CountDownLatch 并设置计数器值。
- 启动多线程并且调用 CountDownLatch 实例的 `countDown()` 方法。
- 主线程调用 `await()`方法，主线程的操作就会在这个方法上阻塞，直到其他线程完成各自的任务，count 值为 0，停止阻塞，主线程继续执行。

#### 使用方法

##### 场景1：最大并行性，多个线程就绪同时执行

在这个场景中，`CountDownLatch`可类似于发令者的角色

```java
public class Test {

    public static void main(String[] args) throws InterruptedException{
        
        CountDownLatch count = new CountDownLatch(1);
        for (int i = 0; i < 8; i++) {
            new Thread(() -> {
                try {
                    // 线程阻塞，等待所有线程就绪
                    count.await();
                    System.out.println(Thread.currentThread().getName());
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }).start();
        }
        count.countDown(); // 计数器减1，多个线程开始同时执行
        System.out.println("主线程打印");
    }
}
```

运行结果

```java
主线程打印
Thread-3
Thread-6
Thread-4
Thread-5
Thread-1
Thread-0
Thread-7
Thread-2
```

通过`count.await()`使当前线程等待，直到计数器为0，或者线程被中断。由于`count.countDown()`在循环外部，每个线程启动的时候都会将自己阻塞，但此时的阻塞并没有阻塞主线程，所以主线程打印先一步执行，在循环内8个线程就绪之后，通过计数器减1，让他们同步执行打印，达到并行执行的目的。

##### 场景2：让单个线程等待其他多个线程执行完毕后，再执行

```java
public class Test {

    public static void main(String[] args) throws InterruptedException {
        CountDownLatch count = new CountDownLatch(8);
        for (int i = 0; i < 8; i++) {
            new Thread(() -> {
                System.out.println(Thread.currentThread().getName());
                count.countDown();
            }).start();
        }
        count.await();
        System.out.println("主线程打印");
    }
}
```

运行结果

```java
Thread-0
Thread-2
Thread-1
Thread-3
Thread-4
Thread-5
Thread-6
Thread-7
主线程打印
```

`count.await()`在循环外部，阻塞主线程等待其他8个线程执行`count.countDown()`，当计数器为0时，才执行主线程打印

#### CountDownLatch与CyclicBarrier的区别

CountDownLatch和CyclicBarrier都能够实现线程之间的等待，只不过它们侧重点不同：

- CountDownLatch一般用于一个或多个线程，等待其他线程执行完任务后，再才执行
- CyclicBarrier一般用于一组线程互相等待至某个状态，然后这一组线程再同时执行
  另外，CountDownLatch是减计数，计数减为0后不能重用；而CyclicBarrier是加计数，可置0后复用。
