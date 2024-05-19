---
title: Semaphore使用方法
date: 2022-01-18 22:35:48
categories: 
  - Java
tags: 
  - Java
  - JUC
permalink: /pages/8e40cc/
author: 
  name: benym
  link: https://github.com/benym
---

### Semaphore使用方法

Semaphore可以翻译为信号量，Semaphore可以控制同时访问的线程个数，通过`acquire()`获取一个许可，如果没有许可就等待，`release()`方法则可以释放一个许可

#### 构造方法

```java
    /**
     * Creates a {@code Semaphore} with the given number of
     * permits and nonfair fairness setting.
     *
     * @param permits the initial number of permits available.
     *        This value may be negative, in which case releases
     *        must occur before any acquires will be granted.
     */
    public Semaphore(int permits) {
        sync = new NonfairSync(permits);
    }

    /**
     * Creates a {@code Semaphore} with the given number of
     * permits and the given fairness setting.
     *
     * @param permits the initial number of permits available.
     *        This value may be negative, in which case releases
     *        must occur before any acquires will be granted.
     * @param fair {@code true} if this semaphore will guarantee
     *        first-in first-out granting of permits under contention,
     *        else {@code false}
     */
    public Semaphore(int permits, boolean fair) {
        sync = fair ? new FairSync(permits) : new NonfairSync(permits);
    }
```

- permits表示许可线程的数量
- fair表示公平性，如果为true则线程为先进先出

#### 常用方法

```java
public void acquire() throws InterruptedException {  }     //获取一个许可
public void acquire(int permits) throws InterruptedException { }    //获取permits个许可
public void release() { }          //释放一个许可
public void release(int permits) { }    //释放permits个许可
```

acquire()用来获取一个许可，若无许可能够获得，则会一直等待，直到获得许可

release()用来释放许可。注意，在释放许可之前，必须先获获得许可

这4个方法都会被阻塞，如果想立即执行得到结果，可以使用以下方法：

```java
//尝试获取一个许可，若获取成功，则立即返回true，若获取失败，则立即返回false
public boolean tryAcquire() { };    
//尝试获取一个许可，若在指定的时间内获取成功，则立即返回true，否则则立即返回false
public boolean tryAcquire(long timeout, TimeUnit unit) throws InterruptedException { };  
//尝试获取permits个许可，若获取成功，则立即返回true，若获取失败，则立即返回false
public boolean tryAcquire(int permits) { }; 
//尝试获取permits个许可，若在指定的时间内获取成功，则立即返回true，否则则立即返回false
public boolean tryAcquire(int permits, long timeout, TimeUnit unit) throws InterruptedException { }; 
```

另外还可以通过availablePermits()方法得到可用的许可数目。

#### 使用案例

**案例一：**假若一个工厂有5台机器，但是有8个工人，一台机器同时只能被一个工人使用，只有使用完了，其他工人才能继续使用。那么我们就可以通过Semaphore来实现

```java
public class Test {

    public static void main(String[] args) {
        // 工人数目
        int n = 8;
        // 机器数目
        Semaphore semaphore = new Semaphore(5);
        for (int i = 0; i < n; i++) {
            int finalI = i;
            new Thread(() -> {
                try {
                    semaphore.acquire();
                    System.out.println("工人" + finalI + "占用一个机器在生产");
                    Thread.sleep(2000);
                    System.out.println("工人" + finalI + "释放出机器");
                    semaphore.release();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
```

在获取许可之后，我们sleep一下当前线程，让他不要那么快进行释放，观察运行的结果

运行结果

```java
工人0占用一个机器在生产
工人3占用一个机器在生产
工人2占用一个机器在生产
工人1占用一个机器在生产
工人4占用一个机器在生产
工人3释放出机器
工人4释放出机器
工人0释放出机器
工人1释放出机器
工人2释放出机器
工人6占用一个机器在生产
工人5占用一个机器在生产
工人7占用一个机器在生产
工人6释放出机器
工人7释放出机器
工人5释放出机器
```

可以发现，当规定`Semaphore`的`permits`为5时，最多有5个线程获取许可，剩余的线程必须等待许可释放之后才能获取许可

**案例二：**流量控制

`Semaphore`可以用于做流量控制，特别是公用资源有限的应用场景，比如数据库连接。假如有一个需求， 要读取几万个文件的数据，因为都是 IO 密集型任务，我们可以启动几十个线程并发地读取，但是如果读到内存后，还需要存储到数据库中，而数据库的连接数只有 10 个，这时我们必须控制只有 10 个线程同时获取数据库连接保存数据，否则会报错无法获取数据库连接。这个时候，就可以使用 Semaphore 来做流量控制。

```java
public class ConnectionSemaphore {

    private final static int CONNECTION_SIZE = 10;
    // 两个信号量，分别表示可用连接和已用连接
    private final Semaphore userFulLink, useLessLink;
    // 存放数据库链接的容器，这里用Integer代替
    private static final LinkedList<Integer> connectionPool = new LinkedList<>();

    static {
        for (int i = 0; i < CONNECTION_SIZE; i++) {
            connectionPool.addLast(i);
        }
    }

    public ConnectionSemaphore(Semaphore userFulLink, Semaphore useLessLink) {
        this.userFulLink = userFulLink;
        this.useLessLink = useLessLink;
    }

    /*归还连接*/
    public void returnConnect(Integer connection) throws InterruptedException {
        if (connection != null) {
            System.out.println(
                    "当前有" + userFulLink.getQueueLength() + "个线程等待数据库连接，" + "可用连接数:" + userFulLink
                            .availablePermits());
            useLessLink.acquire();
            synchronized (connectionPool) {
                connectionPool.addLast(connection);
            }
            userFulLink.release();
        }
    }

    /*从池子拿连接*/
    public Integer takeConnect() throws InterruptedException {
        userFulLink.acquire();
        Integer connection;
        synchronized (connectionPool) {
            connection = connectionPool.removeFirst();
        }
        useLessLink.release();
        return connection;
    }
}
```

```java
/**
 * 测试类
 */
public class Test {

    private static ConnectionSemaphore connectionSemaphore = new ConnectionSemaphore();

    private static class testThread implements Runnable {

        @Override
        public void run() {
            // 模拟每个线程的不同持有时间
            Random randomTime = new Random();
            long start = System.currentTimeMillis();
            try {
                Integer connect = connectionSemaphore.takeConnect();
                System.out.println(Thread.currentThread().getName()
                        + "_获取数据库连接共耗时【" + (System.currentTimeMillis() - start) + "】ms.");
                // 模拟业务，线程持有连接查询数据
                Thread.sleep(100 + randomTime.nextInt(100));
                System.out.println(Thread.currentThread().getName()+"_查询数据完成，释放连接");
                connectionSemaphore.returnConnect(connect);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

        }
    }

    public static void main(String[] args) {
        for (int i = 0; i < 15; i++) {
            Thread thread = new Thread(new testThread());
            thread.start();
        }
    }
}
```

运行结果

```java
Thread-14_获取数据库连接共耗时【0】ms.
Thread-13_获取数据库连接共耗时【0】ms.
Thread-8_获取数据库连接共耗时【0】ms.
Thread-0_获取数据库连接共耗时【1】ms.
Thread-10_获取数据库连接共耗时【0】ms.
Thread-11_获取数据库连接共耗时【0】ms.
Thread-6_获取数据库连接共耗时【0】ms.
Thread-12_获取数据库连接共耗时【0】ms.
Thread-1_获取数据库连接共耗时【2】ms.
Thread-9_获取数据库连接共耗时【0】ms.
Thread-0_查询数据完成，释放连接
Thread-14_查询数据完成，释放连接
当前有5个线程等待数据库连接，可用连接数:0
当前有5个线程等待数据库连接，可用连接数:0
Thread-7_获取数据库连接共耗时【180】ms.
Thread-9_查询数据完成，释放连接
当前有3个线程等待数据库连接，可用连接数:0
Thread-4_获取数据库连接共耗时【179】ms.
Thread-5_获取数据库连接共耗时【181】ms.
Thread-8_查询数据完成，释放连接
当前有2个线程等待数据库连接，可用连接数:0
Thread-3_获取数据库连接共耗时【185】ms.
Thread-10_查询数据完成，释放连接
当前有1个线程等待数据库连接，可用连接数:0
Thread-2_获取数据库连接共耗时【190】ms.
Thread-12_查询数据完成，释放连接
Thread-1_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:0
当前有0个线程等待数据库连接，可用连接数:0
Thread-13_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:2
Thread-6_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:3
Thread-11_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:4
Thread-3_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:5
Thread-2_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:6
Thread-5_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:7
Thread-7_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:8
Thread-4_查询数据完成，释放连接
当前有0个线程等待数据库连接，可用连接数:9
```

从打印结果可以看出，一次只有 10 个线程执行`acquire()`，只有线程进行`release()`方法后才会有别的线程执行`acquire()`。看到这里或许会疑惑在`takeConnect`中获取许可的是可用连接`userFulLink`，而释放许可的是`useLessLink`，在`Semaphore`中的`release`方法原本的注释如下

```java
    /**
     * Releases a permit, returning it to the semaphore.
     *
     * <p>Releases a permit, increasing the number of available permits by
     * one.  If any threads are trying to acquire a permit, then one is
     * selected and given the permit that was just released.  That thread
     * is (re)enabled for thread scheduling purposes.
     *
     * <p>There is no requirement that a thread that releases a permit must
     * have acquired that permit by calling {@link #acquire}.
     * Correct usage of a semaphore is established by programming convention
     * in the application.
     */
    public void release() {
        sync.releaseShared(1);
    }
```

> 释放许可证，将其返回给信号量。释放许可证，将可用许可证的数量增加一。如果任何线程试图获得许可，则选择一个线程并给予刚刚释放的许可。该线程（重新）启用用于线程调度目的。不要求释放许可的线程必须通过调用` {@link acquire}` 获得该许可。信号量的正确使用是通过应用程序中的编程约定建立的。

这句话的意思就是说，release方法仅仅只是把许可证数量加一，在release之前不需要对应的信号量去执行acquire，那么这段代码的含义就可以理解为**减少可用连接的数量，增加已用连接的数量**，因为当一个线程持有连接之后可用连接应该-1，而已用的连接数应该+1，当一个线程执行完毕业务之后应该将已用连接-1，可用连接+1。

**需要注意的是：**`Semaphore `只是对资源并发访问的线程数进行监控，并不会保证线程安全。

#### 参考文章

> https://www.cnblogs.com/dolphin0520/p/3920397.html
> https://www.jianshu.com/p/0d53a643a60c