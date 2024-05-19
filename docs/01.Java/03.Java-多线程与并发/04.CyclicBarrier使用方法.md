---
title: CyclicBarrier使用方法
date: 2022-01-18 17:28:48
categories: 
  - Java
tags: 
  - Java
  - JUC
permalink: /pages/3898a4/
author: 
  name: benym
  link: https://github.com/benym
---

### CyclicBarrier使用方法

`CyclicBarrier`字面意思就是回环栅栏，通过它可以实现让一组线程等待至某个状态之后再全部同时执行。叫做回环是因为当所有等待线程都被释放以后，CyclicBarrier可以被重用。我们暂且把这个状态就叫做barrier，当调用await()方法之后，线程就处于barrier了。

**构造方法**

- parties指让多少个线程或者任务等待至barrier状态
- barrierAction为当这些线程都达到barrier状态时会执行的内容

```java
    /**
     * Creates a new {@code CyclicBarrier} that will trip when the
     * given number of parties (threads) are waiting upon it, and which
     * will execute the given barrier action when the barrier is tripped,
     * performed by the last thread entering the barrier.
     *
     * @param parties the number of threads that must invoke {@link #await}
     *        before the barrier is tripped
     * @param barrierAction the command to execute when the barrier is
     *        tripped, or {@code null} if there is no action
     * @throws IllegalArgumentException if {@code parties} is less than 1
     */
    public CyclicBarrier(int parties, Runnable barrierAction) {
        if (parties <= 0) throw new IllegalArgumentException();
        this.parties = parties;
        this.count = parties;
        this.barrierCommand = barrierAction;
    }

    /**
     * Creates a new {@code CyclicBarrier} that will trip when the
     * given number of parties (threads) are waiting upon it, and
     * does not perform a predefined action when the barrier is tripped.
     *
     * @param parties the number of threads that must invoke {@link #await}
     *        before the barrier is tripped
     * @throws IllegalArgumentException if {@code parties} is less than 1
     */
    public CyclicBarrier(int parties) {
        this(parties, null);
    }
```

#### 应用场景

##### 场景一：多个线程执行读数据操作，读取完毕之后执行后续任务

```java
public class Test {

    public static void main(String[] args) {
        CyclicBarrier cyclicBarrier = new CyclicBarrier(8);
        for (int i = 0; i < 8; i++) {
            new Thread(() -> {
                try {
                    System.out.println("读取" + Thread.currentThread().getName());
                    cyclicBarrier.await();
                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
                System.out.println("后续操作" + Thread.currentThread().getName());
            }).start();
        }
    }
}
```

运行结果

```java
读取Thread-0
读取Thread-2
读取Thread-1
读取Thread-4
读取Thread-3
读取Thread-5
读取Thread-6
读取Thread-7
后续操作Thread-7
后续操作Thread-0
后续操作Thread-1
后续操作Thread-5
后续操作Thread-2
后续操作Thread-6
后续操作Thread-3
后续操作Thread-4
```

##### 场景二：所有线程读取完毕之后，进行额外操作

在这时候初始化`CyclicBarrier`时可以开启一个额外的`Runnable`线程执行其他任务

```java
public class Test {

    public static void main(String[] args) {
        CyclicBarrier cyclicBarrier = new CyclicBarrier(8,
                () -> System.out.println(Thread.currentThread().getName() + "额外任务执行"));
        for (int i = 0; i < 8; i++) {
            new Thread(() -> {
                try {
                    System.out.println("读取" + Thread.currentThread().getName());
                    cyclicBarrier.await();
                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
                System.out.println("后续操作" + Thread.currentThread().getName());
            }).start();
        }
    }
}
```

运行结果

```java
读取Thread-0
读取Thread-3
读取Thread-2
读取Thread-1
读取Thread-5
读取Thread-4
读取Thread-6
读取Thread-7
Thread-1额外任务执行
后续操作Thread-1
后续操作Thread-0
后续操作Thread-5
后续操作Thread-7
后续操作Thread-3
后续操作Thread-2
后续操作Thread-6
后续操作Thread-4
```

可以看出，当读取操作完成之后，这8个线程都到达了barrier状态，此时会**随机其中的一个线程去执行额外的任务**，这个执行额外任务的线程执行完毕之后，就会接着执行后续的任务。

##### 特性：指定await时间

```java
public class Test {

    public static void main(String[] args) {
        CyclicBarrier cyclicBarrier = new CyclicBarrier(8);
        for (int i = 0; i < 8; i++) {
            if (i < 7) {
                new Thread(() -> {
                    try {
                        System.out.println("读取" + Thread.currentThread().getName());
                        cyclicBarrier.await(100, TimeUnit.MILLISECONDS);
                    } catch (InterruptedException | BrokenBarrierException | TimeoutException e) {
                        e.printStackTrace();
                    }
                    System.out.println("后续操作" + Thread.currentThread().getName());
                }).start();
            } else {
                new Thread(() -> {
                    try {
                        Thread.sleep(5000);
                        System.out.println("读取" + Thread.currentThread().getName());
                        cyclicBarrier.await(100, TimeUnit.MILLISECONDS);
                    } catch (InterruptedException | BrokenBarrierException | TimeoutException e) {
                        e.printStackTrace();
                    }
                    System.out.println("后续操作" + Thread.currentThread().getName());
                }).start();
            }
        }
    }
}
```

运行结果

```java
读取Thread-0
读取Thread-2
读取Thread-1
读取Thread-3
读取Thread-4
读取Thread-5
读取Thread-6
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.TimeoutException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:257)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:250)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$0(Test.java:21)
	at java.lang.Thread.run(Thread.java:748)
后续操作Thread-3
后续操作Thread-4
后续操作Thread-6
后续操作Thread-5
后续操作Thread-2
后续操作Thread-1
后续操作Thread-0
读取Thread-7
后续操作Thread-7
java.util.concurrent.BrokenBarrierException
	at java.util.concurrent.CyclicBarrier.dowait(CyclicBarrier.java:207)
	at java.util.concurrent.CyclicBarrier.await(CyclicBarrier.java:435)
	at com.tencent.ioc.duty.event.service.impl.Test.lambda$main$1(Test.java:32)
	at java.lang.Thread.run(Thread.java:748)
```

这个场景模拟其中一个线程延迟执行，`await`等待时间内，检测到最后一个线程还没有到达栅栏，就会直接抛出异常让到达栅栏的线程继续执行后面的任务

##### 特性：可复用

```java
public class Test {

    public static void main(String[] args) throws InterruptedException {
        CyclicBarrier cyclicBarrier = new CyclicBarrier(5);
        for (int i = 0; i < 5; i++) {
            new Thread(() -> {
                try {
                    System.out.println("读取" + Thread.currentThread().getName());
                    cyclicBarrier.await();
                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
                System.out.println("后续操作" + Thread.currentThread().getName());
            }).start();
        }
        Thread.sleep(5000);
        System.out.println("CyclicBarrier复用");
        for (int i = 0; i < 5; i++) {
            new Thread(() -> {
                try {
                    System.out.println("读取" + Thread.currentThread().getName());
                    cyclicBarrier.await();
                } catch (InterruptedException | BrokenBarrierException e) {
                    e.printStackTrace();
                }
                System.out.println("后续操作" + Thread.currentThread().getName());
            }).start();
        }
    }
}
```

运行结果

```java
读取Thread-0
读取Thread-1
读取Thread-2
读取Thread-3
读取Thread-4
后续操作Thread-4
后续操作Thread-0
后续操作Thread-2
后续操作Thread-3
后续操作Thread-1
CyclicBarrier复用
读取Thread-5
读取Thread-6
读取Thread-7
读取Thread-8
读取Thread-9
后续操作Thread-9
后续操作Thread-5
后续操作Thread-8
后续操作Thread-7
后续操作Thread-6
```

这里的可复用不是代表的线程复用，而是指的当之前的所有线程都达到栅栏之后，初始化的栅栏仍然能够在下一次线程操作复用，而不像`CountDownLatch`一样减为0之后就无法再使用了。