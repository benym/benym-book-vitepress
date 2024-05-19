---
title: CompletableFuture常用用法及踩坑
categories: 
  - Java
tags: 
  - Java
  - JUC
  - CompletableFuture
date: 2022-06-06 21:05:25
permalink: /pages/b1318d/
author: 
  name: benym
  link: https://github.com/benym
---

### CompletableFuture常用用法及踩坑

作为常用的并发类，`CompletableFuture`在项目中会经常使用，其作用与`Google`的`ListenableFuture`类似；

总结来说`CompletableFuture`比`Future`多出了流式计算，返回值，异步回调，多`Future`组合的功能。

#### 适用场景

- 某个接口不好修改，又没有提供批量的方法时
- 需要异步调用接口时
- CPU密集型任务，计算场景多，或多个不关联的接口需要同时调用时

#### 场景一

**问题**：系统中存量老接口，逻辑复杂，改造成本大。

**解决方案**：利用`CompletableFuture`提交多个任务分别执行逻辑，`join`等待所有任务执行完毕

```java
// 模拟功能：根据某个id列表，查询得到与id相关的数据，其中查询得到与id相关数据的过程非常复杂且耗时
// executor为全局线程池

List<MockDTO> results = Collections.synchronizedList(new ArrayList<>());

List<String> mockIds = new ArrayList<>();
List<CompletableFuture<Void>> futures = new ArrayList<>();
mockIds.forEach(mockId -> {
    CompletableFuture<Void> res = CompletableFuture.supplyAsync(() -> {
        // 根据mockId组装查询实体
      	MockDTO mockdto = new MockDTO();
        mockdto.setId(mockId);
        
        // 调用存量老接口
        List<MockDTO> result = mockService
                .getDataByMockIds(mockdto);
        return result;
    },executor).thenAccept(results::addAll).exceptionally(ex -> {
        throw new RuntimeException(ex.getMessage() + "异步数据获取执行异常");
    });
    futures.add(res);
});
futures.forEach(CompletableFuture::join);
```

- 这一场景描述一个典型的问题，当存量接口不好更改，查询速度很慢时，我们可以通过简单的`CompletableFuture`任务来并行执行。
- 由于返回值是`List`的原因，需要注意并发`add`问题，可采用一个`synchronizedList`来解决。
- 对于每一个任务返回之后执行`thenAccept`将返回数据加入到`results`中。
- 同时，主线程需要等待异步线程全部执行完毕才返回结果，即`join`操作。

##### 如果不join会发生什么？

主线程会很快就执行完毕，异步线程还没有执行完，主线程就返回了结果，这个结果必然不是我们预期的

#### 场景二

**问题**：异步调用接口，比如消息发送接口，不能够阻塞主流程，但又需要获取返回值/知道本次调用是否成功

**解决方案**：`CompletableFuture`异步调用+`handle`同时处理结果和异常

`handle`与`whenComplete`均可

以一个更容易踩坑的异步调用第三方接口为例

```java
log.info("url={}, messageDTO={}", serverUrl, messageDTO);
String jsonParams = JacksonUtils.toJson(messageDTO);
HttpHeaders headers = new HttpHeaders();
headers.set("Content-Type", "application/json");
HttpEntity<String> entity = new HttpEntity<>(jsonParams, headers);
AtomicReference<JSONObject> responseJsonObject = new AtomicReference<>();
log.info("==============Entity=========={}",entity);
try {
    CompletableFuture future = CompletableFuture.supplyAsync(() -> {
        // 一定要设置超时时间
        ResponseEntity<JSONObject> exchange = restTemplate.exchange(serverUrl, HttpMethod.POST, entity,
                JSONObject.class);
        return exchange;
    },asyncTaskExecutor)
            .handle((exchange, ex) -> {
                if (ex == null) {
                    if (exchange.hasBody()) {
                        responseJsonObject.set(exchange.getBody());
                        log.info("=========Message body========={}", responseJsonObject);
                        //当返回对象为空或者不为规定的code时，接口失败
                        if (responseJsonObject.get() == null || !responseJsonObject.get().getString("code").equals("200")) {
                            String errCode = responseJsonObject.get().getString("code");
                            String errMsg = responseJsonObject.get().getString("message");
                            log.warn("消息接口应答码不成功，错误代码:{}，返回消息{}",errCode,errMsg);
                        } else {
                            log.info("消息接口返回成功，返回消息{}",exchange.getBody());
                        }
                    } else {
                        log.warn("消息接口返回body不存在");
                    }
                } else {
                    log.warn("=========消息发送失败,第三方提供接口异常========={}",ex.getMessage());
                }
                return null;
            });
} catch (Exception e) {
    log.warn("异步线程内部异常",e);
}
log.info("发送消息主线程执行完毕");
```

以上代码逻辑很简单，处理原则就是有异常处理异常，没有异常就正常解析返回值。同时打印足量的日志方便排查。

##### 踩坑场景

对于调用非主流程接口，如发送消息等，其调用原则不应该阻塞主流程，同时出现错误可不用抛出异常，以免发生主流程正常执行，但发送消息失败，消息模块抛出异常造成主流程回滚。本文不讨论消息如何可靠，只考虑作为生产者，在不引入中间件的情况下，如何简单快速的对接第三方消息接口。

**处理原则**：

1. 对于一般的`RPC`，如`Fegin`、`Dubbo`等。或者外部提供的接口/或需要走`RestTemplate`的接口。

   **设置RPC或者全局RestTemplate的超时时间**

   如果不设置超时时间，运行上述代码时会发现，明明主线程执行完毕，异步线程没有直接报错，但异步线程的结果迟迟没有返回(假设调用的接口网络不通，且没有回TCP包，没有快速失败)，也没有打印日志。以`RestTemplate`为例，其默认的超时时间为30s，也就是说其实不是不会打印日志，只是30秒之后才觉得调用的接口网络不通。很久才打印日志，会让我们排查问题时变得疑惑

2. 对于直接调用的Service服务：即时返回结果，可不做超时设置

::: tip
注意点：
`CompletableFuture`在本地测试的时候会发现，主线程执行完毕了，异步线程一直没有返回，这是因为如果使用java的主线程方法测试，那么运行结束后，程序就退出了，异步线程自然也就没有了。对于`Web`项目，调用该方法时，只是主线程结束，但程序没有退出，异步线程依旧可以运行
:::

#### 场景三

**问题**：多个不相关的任务，并行计算

**解决方案**：多个`CompletableFuture`异步计算，使用`allOf`+`join`

```java
List<CompletableFuture> futures = new ArrayList<>(3);
List<Double> result = new ArrayList<>();
// 创建异步执行任务:
CompletableFuture<List<Double>> cf = CompletableFuture.supplyAsync(() -> {
    System.out.println(
            Thread.currentThread() + " start job1,time->" + System.currentTimeMillis());
    // 执行业务逻辑
    result.add(1.2);
    System.out.println(
            Thread.currentThread() + " exit job1,time->" + System.currentTimeMillis());
    return result;
});
CompletableFuture<List<Double>> cf2 = CompletableFuture.supplyAsync(() -> {
    System.out.println(
            Thread.currentThread() + " start job2,time->" + System.currentTimeMillis());
    // 执行业务逻辑
    result.add(3.2);
    System.out.println(
            Thread.currentThread() + " exit job2,time->" + System.currentTimeMillis());
    return result;
});
CompletableFuture<List<Double>> cf3 = CompletableFuture.supplyAsync(() -> {
    System.out.println(
            Thread.currentThread() + " start job3,time->" + System.currentTimeMillis());
    // 执行业务逻辑
    result.add(2.2);
    System.out.println(
            Thread.currentThread() + " exit job3,time->" + System.currentTimeMillis());
    return result;
});
futures.add(cf);
futures.add(cf2);
futures.add(cf3);
//allof等待所有任务执行完成才执行cf4，如果有一个任务异常终止，则cf4.get时会抛出异常，都是正常执行，cf4.get返回null
//anyOf是只有一个任务执行完成，无论是正常执行或者执行异常，都会执行cf4，cf4.get的结果就是已执行完成的任务的执行结果
CompletableFuture<Void> cf4 = CompletableFuture
        .allOf(futures.toArray(new CompletableFuture[0]));

System.out.println("main thread start cf4.get(),time->" + System.currentTimeMillis());
//等待子任务执行完成
cf4.join();
System.out.println("子任务状态" + cf.isDone() + " " + cf2.isDone() + " " + cf3.isDone());
System.out.println("计算结果" + result);
System.out.println("main thread exit,time->" + System.currentTimeMillis());
```

##### 运行结果

```java
Thread[ForkJoinPool.commonPool-worker-9,5,main] start job1,time->1654514454630
Thread[ForkJoinPool.commonPool-worker-9,5,main] exit job1,time->1654514454630
Thread[ForkJoinPool.commonPool-worker-9,5,main] start job2,time->1654514454631
Thread[ForkJoinPool.commonPool-worker-9,5,main] exit job2,time->1654514454631
Thread[ForkJoinPool.commonPool-worker-9,5,main] start job3,time->1654514454631
Thread[ForkJoinPool.commonPool-worker-9,5,main] exit job3,time->1654514454631
main thread start cf4.get(),time->1654514454631
子任务状态true true true
计算结果[1.2, 3.2, 2.2]
main thread exit,time->1654514454633
```

异步线程依次执行，同时主线程等待所有子任务执行完毕，等到子任务执行完之后汇总结果，最后主线程退出。
