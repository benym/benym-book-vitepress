---
title: 千亿相似度计算量向量化搜索加速方法
description: 向量化搜索实践
categories: 
  - AI人工智能
tags: 
  - AI
  - Vector Search
  - Embedding
  - Similarity calculation
  - Knn
  - RAG
keywords: AI,Vector Search,Knn,Embedding,Similarity,RAG
date: 2025-06-11 18:36:44
author: benym
---

# 千亿相似度计算量向量化搜索加速方法

## 背景

现在有个需求是在订单系统中，业务想要给特定类型订单按照用户进行分组

分组的规则为：如果订单地址的相似度>85%则认为是同一个用户，给对应的订单进行分组打标

比如

用户1 订单1 地址为 北京市海淀区XXX小区

用户2 订单2 地址为 北京市海淀区XXX小区

两个地址相似度为100%，则将用户1和用户2视为同一用户，我们先不考虑这个需求是否合理，从技术的角度讲，如果要实现动态分组和计算，那么我们必然会至少计算一次用户1订单1和用户2订单2之间的地址相似度，通过计算出的相似度我们才能知道是否满足业务阈值，来进行分类打标

如果假设系统中有N个订单，则需要计算NxN次地址相似度，计算量是笛卡尔积

或许听到这里数据量的感知还不太明显

在我们实际的系统中，需要计算的订单量大概为40w单，则总共需要计算400000x400000=160000000000次=1600亿次

结论先写在前面：一旦单量超过1w单时，要计算笛卡尔积，优先采用向量化搜索方案，而非叠加多线程，并行计算、多分片等方法。传统的基于多线程、并行计算、多分片，甚至Spark大数据计算方法不适合于极其大量的计算。

## 方案设计

接下来本文将介绍，该需求在实际实现过程中，尝试的方法

针对这种大数据量计算型任务，在后端实现过程中，需要考虑任务的管理和断点续传，包括

1. 任务task存储、支持任务断点和重传
2. 全量计算
3. 增量计算
4. 按时间段计算

### 两两计算

首先我们分析这个需求，40w单的单量并不多，所以最开始尝试的也是普通Java代码来编写

#### 分片任务

由于订单的地址可能分布在全国各地各个省份，所以一开始多分片方案就能够确定下来，让每个机器上启动多个任务分片，每个分片持有部分省市的部分订单

依靠分布式定时任务，我们可以很方便的做到这点，比如elastic-job，xxl-job，power-job等

以elastic-job为例，按照生产机器数及对应机器性能按需配置分片总数，比如64分片，生产8台机器，平均每台启动8个分片线程。实现的代码样例为

```java
@Component
@Slf4j
public class SimiAddressJob implements SimpleJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(SimiAddressJob.class);

    @Resource
    private SimiComputeService simiComputeService;

    @Resource
    private CacheRepository cacheRepository;

    @Override
    public void execute(ShardingContext shardingContext) {
        int shardingItem = shardingContext.getShardingItem();
        String lockKey = "simiJobKey:" + shardingItem;
        try {
            boolean lockSuccess = cacheRepository.tryLock(lockKey, 1L, TimeUnit.SECONDS);
            if (!lockSuccess) {
                LOGGER.info("simiJobKey is locked, skip execute");
            }
            LocalDateTime start = LocalDateTime.now();
            LOGGER.info("start simiAddress compute, now shardingItem:{}", shardingItem);
            simiComputeService.computeSimiAddress(shardingContext);
            LocalDateTime end = LocalDateTime.now();
            long days = start.until(end, ChronoUnit.DAYS);
            long hours = start.until(end, ChronoUnit.HOURS);
            long minutes = start.until(end, ChronoUnit.MINUTES);
            long seconds = start.until(end, ChronoUnit.SECONDS);
            LOGGER.info("simiAddress compute done, now shardingItem:{}, cost days:{}, hours:{}, minutes:{}, seconds:{}", shardingItem, days, hours, minutes, seconds);
        } catch (Exception e) {
            LOGGER.error("unknown exception in SimiAddressJob execute, exception is:", e);
        } finally {
            cacheRepository.unlock(lockKey);
        }
    }
}
```

只需要在内部针对分片总数进行切片，就可以划分出来，划分List的方法可采用guava内置的，或自定义

```java
@Override
public void computeSimiAddress(ShardingContext shardingContext) {
    // 获取分片总数
    int shardingTotalCount = shardingContext.getShardingTotalCount();
    int shardingItem = shardingContext.getShardingItem();
    // 获取全量的三级地址，大概2000条，很少变动
    List<ProvinceParam> allThirdLevelAddress = addressManager.getAllThirdLevelAddress();
    List<List<ProvinceParam>> shardingList = ShardingListSplitUtil.averageAssign(allThirdLevelAddress, shardingTotalCount);
    // 获取对应分片需要处理的数据
    List<ProvinceParam> shardingThirdLevelAddress = shardingList.get(shardingItem);
    // 根据计算类型切换策略
    ComputeTypeEnums computeType = dynamicConfig.getComputeType();
    ComputeStrategy strategy = computeFactory.getStrategy(computeType);
    // 开始计算
    strategy.startCompute(shardingThirdLevelAddress);
}
```

#### 省级维度-多线程化

由于每个分片持有的是部分省份数据(即`List<ProvinceParam> shardingThirdLevelAddress`)，省与省之间并不冲突，所以在省级维度是可以再次进行并行的

骨架代码如下

```java
public void startCompute(List<ProvinceParam> allThirdLevelAddress) {
    LOGGER.info("FullComputeImpl startCompute, allThirdLevelAddress size:{}", allThirdLevelAddress.size());
    // 全量计算
    CompletableFuture<Void> allFutures = CompletableFuture.allOf(allThirdLevelAddress.stream().map(provinceParam ->
            CompletableFuture.runAsync(() -> {
        try {
            // 省略业务处理
        } catch (Exception e) {
            LOGGER.error("computeSimilarity in FullComputeImpl error, province:{}, city:{}, county:{}", provinceParam.getProvince(),
                    provinceParam.getCity(), provinceParam.getCounty(), e);
            // 省略异常处理
        }
    }, threadPoolTaskExecutor)).toArray(CompletableFuture[]::new));
    // 处理所有任务完成后的操作
    allFutures.thenRun(() -> LOGGER.info("FullComputeImpl All tasks completed.")).exceptionally(ex -> {
        LOGGER.error("FullComputeImpl Error occurred while waiting for all tasks to complete.", ex);
        return null;
    });
    allFutures.join();
}
```

#### 省内维度-串行计算

按照最开始的想法，单个省份内的所有订单地址都需要两两进行相似度计算，代码是这样的

```java
/**
 * 计算省市区下的订单，两两之间的地址相似度
 *
 * @param provinceParam           三级地址实体
 * @param incrementOrderAddress   增量三级地址下的订单列表
 * @param allProvinceOrderAddress 全量三级地址下的订单列表
 * @param isTimeWindow            是否时间段计算
 */
public void computeSimilarity(ProvinceParam provinceParam, List<OrderAddressDTO> incrementOrderAddress,
                              List<OrderAddressDTO> allProvinceOrderAddress, Boolean isTimeWindow) {
    LOGGER.info("computeSimilarity start, province:{}, city:{}, county:{}, incrementOrderAddress size:{}, allProvinceOrderAddress size:{}, isTimeWindow:{}",
            provinceParam.getProvince(), provinceParam.getCity(), provinceParam.getCounty(), incrementOrderAddress.size(), allProvinceOrderAddress.size(), isTimeWindow);
    for (OrderAddressDTO orderAddressOne : incrementOrderAddress) {
        for (OrderAddressDTO orderAddressTwo : allProvinceOrderAddress) {
            if (orderAddressOne.getOrderCode().equals(orderAddressTwo.getOrderCode())) {
                continue;
            }
            // 更新最后处理的订单的时间
            if (Boolean.FALSE.equals(isTimeWindow)) {
                orderSimilarTaskManager.updateOrderSimilarTask(provinceParam, orderAddressOne.getOrderCreateTime());
            }
            // 已经计算过了则跳过计算
            Boolean alreadyCompute = orderSimilarAddressManager.alreadyComputeAddress(orderAddressOne, orderAddressTwo);
            if (alreadyCompute) {
                continue;
            }
            // 计算地址相似度
            double similarity = similarityAlgorithm.getSimilarity(orderAddressOne.getDetailAddress(), orderAddressTwo.getDetailAddress());
            // 相似度大于阈值时
            if (similarity >= dynamicConfig.getSimilarityThreshold()) {
                // 省略业务逻辑
            } else {
                // 相似度小于阈值时，说明两个不是同一个用户，分开存储groupId
                // 省略业务逻辑
            }
        }
    }
}
```

对于已经计算过的订单直接跳过计算，订单号相同的订单无需计算，同时根据相似度算法判定地址相似度是否大于阈值，根据阈值的大小关系进行对应的分组逻辑。由于是串行计算，所以叠加2次for循环是最简单的方法

详细分组逻辑可如下

1. 相似度大于阈值时
   1. 如果两个用户都没有历史分组，则插入一条新分组，并插入两个用户的分组信息，两个用户相同
   2. 如果第一个用户的groupId为空，第二个用户的groupId不为空，则插入第一个用户，且分组和第二个用户相同
   3. 如果第二个用户的groupId为空，第一个用户的groupId不为空，则插入第二个用户，且分组和第一个用户相同
   4. 如果都不为空，则说明已经存在两个相同的用户在表中，更新所有分组为第二个用户分组的id为第一个用户的分组
2. 相似度小于阈值时
   1. 如果两个用户都没有历史分组，则插入一条新分组，并插入两个用户的分组信息，两个用户不相同
   2. 如果第一个用户的groupId为空，第二个用户的groupId不为空，则插入第一个用户，且分组为当前最大的group+1
   3. 如果第二个用户的groupId为空，第一个用户的groupId不为空，则插入第二个用户，且分组为当前最大的group+1
   4. 如果都不为空，则说明已经存在两个相同的用户在表中，更新最后处理的订单的时间

```java
// 相似度大于阈值时
if (similarity >= dynamicConfig.getSimilarityThreshold()) {
    Long userOneGroupId = orderSimilarUserManager.getByUserId(orderAddressOne.getUserId());
    Long userTwoGroupId = orderSimilarUserManager.getByUserId(orderAddressTwo.getUserId());
    if (userOneGroupId == null && userTwoGroupId == null) {
        // 如果两个用户都没有历史分组，则插入一条新分组，并插入两个用户的分组信息，两个用户相同
        Long maxGroupId = orderSimilarGroupManager.insertGroup();
        OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
                .userId(orderAddressOne.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserOne);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "up");
        OrderSimilarUserDO similarUserTwo = OrderSimilarUserDO.builder()
                .userId(orderAddressTwo.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserListTwo = new ArrayList<>();
        similarUserListTwo.add(similarUserTwo);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserListTwo, "up");
    } else if (userOneGroupId == null && userTwoGroupId != null) {
        // 如果第一个用户的groupId为空，第二个用户的groupId不为空，则插入第一个用户，且分组和第二个用户相同
        OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
                .userId(orderAddressOne.getUserId())
                .groupId(userTwoGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserOne);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "up");
    } else if (userOneGroupId != null && userTwoGroupId == null) {
        // 如果第二个用户的groupId为空，第一个用户的groupId不为空，则插入第二个用户，且分组和第一个用户相同
        OrderSimilarUserDO similarUserTwo = OrderSimilarUserDO.builder()
                .userId(orderAddressTwo.getUserId())
                .groupId(userOneGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserTwo);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "up");
    } else if (userOneGroupId != null && userTwoGroupId != null) {
        // 如果都不为空，则说明已经存在两个相同的用户在表中
        // 更新所有分组为第二个用户分组的id为第一个用户的分组
        orderSimilarUserManager.updateGroupId(userOneGroupId, userTwoGroupId,
                orderAddressOne.getOrderCode(), orderAddressTwo.getOrderCode(), provinceParam);
        // 更新最后处理的订单的时间
        if (Boolean.FALSE.equals(isTimeWindow)) {
            orderSimilarTaskManager.updateOrderSimilarTask(provinceParam, orderAddressOne.getOrderCreateTime());
        }
    }
} else {
    // 相似度小于阈值时，说明两个不是同一个用户，分开存储groupId
    Long maxGroupId;
    // 查询是否已经存在了
    Long userOneGroupId = orderSimilarUserManager.getByUserId(orderAddressOne.getUserId());
    Long userTwoGroupId = orderSimilarUserManager.getByUserId(orderAddressTwo.getUserId());
    if (userOneGroupId == null && userTwoGroupId == null) {
        maxGroupId = orderSimilarGroupManager.insertGroup();
        OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
                .userId(orderAddressOne.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserOne);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "down");
        maxGroupId = orderSimilarGroupManager.insertGroup();
        OrderSimilarUserDO similarUserTwo = OrderSimilarUserDO.builder()
                .userId(orderAddressTwo.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserListTwo = new ArrayList<>();
        similarUserListTwo.add(similarUserTwo);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserListTwo, "down");
    } else if (userOneGroupId == null && userTwoGroupId != null) {
        // 如果第一个用户的groupId为空，第二个用户的groupId不为空，则插入第一个用户，且分组为当前最大的group+1
        maxGroupId = orderSimilarGroupManager.insertGroup();
        OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
                .userId(orderAddressOne.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserOne);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "down");
    } else if (userOneGroupId != null && userTwoGroupId == null) {
        // 如果第二个用户的groupId为空，第一个用户的groupId不为空，则插入第二个用户，且分组为当前最大的group+1
        maxGroupId = orderSimilarGroupManager.insertGroup();
        OrderSimilarUserDO similarUserTwo = OrderSimilarUserDO.builder()
                .userId(orderAddressTwo.getUserId())
                .groupId(maxGroupId)
                .build();
        List<OrderSimilarUserDO> similarUserList = new ArrayList<>();
        similarUserList.add(similarUserTwo);
        orderSimilarUserManager.insertOrderSimilarUser(similarUserList, "down");
    } else if (userOneGroupId != null && userTwoGroupId != null) {
        // 如果都不为空，则说明已经存在两个相同的用户在表中
        // 更新最后处理的订单的时间
        if (Boolean.FALSE.equals(isTimeWindow)) {
            orderSimilarTaskManager.updateOrderSimilarTask(provinceParam, orderAddressOne.getOrderCreateTime());
        }
    }
}
```

在相似度大于阈值时，我们针对两个用户已经在数据表中的情况做的是，更新所有分组为第二个用户分组的id为第一个用户的分组。这样做的目的是为了简化场景，如果严格来说当发现两个用户已经存在表中，且大于阈值，则需要将用户1和用户2的当前分组下的所有订单地址一并查询出来，然后再次挨个进行两两计算，很明显这很容易从2个用户扩散到很多个用户进行再次计算，从而形成一张图网络。为了避免扩散计算产生大量的时间损耗，在业务允许的情况下，对此进行了简化处理

#### 省内维度-并行计算

通过观察上述代码，我们可以很快的分析出单个省份内的数据其实也是可以进行并行的，只需要在开始计算前对数据进行合适的切片，让每个线程持有一部分的省份数据，于是在不变动两两计算核心代码的情况下，可以利用ForkJoin来进行并行计算

代码如下

```java
/**
 * 并行相似度计算任务
 */
public class ParallelSimiComputeTask extends RecursiveAction {

    private static final long serialVersionUID = -2944556608219836758L;

    private static final Logger LOGGER = LoggerFactory.getLogger(ParallelSimiComputeTask.class);

    /**
     * 集合超过阈值才进行并行拆分，否则直接执行
     */
    private static final int THRESHOLD = 1000;

    private final List<OrderAddressDTO> shardingList;

    private final AbstractCompute abstractCompute;

    private final ProvinceParam provinceParam;

    private final Boolean isTimeWindow;

    public ParallelSimiComputeTask(List<OrderAddressDTO> shardingList, AbstractCompute abstractCompute, ProvinceParam provinceParam, Boolean isTimeWindow) {
        this.shardingList = shardingList;
        this.abstractCompute = abstractCompute;
        this.provinceParam = provinceParam;
        this.isTimeWindow = isTimeWindow;
    }

    @Override
    protected void compute() {
        if (CollectionUtils.isEmpty(shardingList)) {
            return;
        }
        if (shardingList.size() <= THRESHOLD) {
            abstractCompute.computeSimilarity(provinceParam, shardingList, shardingList, isTimeWindow);
            return;
        }
        int mid = shardingList.size() / 2;
        List<OrderAddressDTO> leftHandlerList = new ArrayList<>(shardingList.subList(0, mid));
        List<OrderAddressDTO> rightHandlerList = new ArrayList<>(shardingList.subList(mid, shardingList.size()));
        ParallelSimiComputeTask leftTask = new ParallelSimiComputeTask(leftHandlerList, abstractCompute, provinceParam, isTimeWindow);
        ParallelSimiComputeTask rightTask = new ParallelSimiComputeTask(rightHandlerList, abstractCompute, provinceParam, isTimeWindow);
        invokeAll(leftTask, rightTask);
    }
}
```

代码上和一般的并行Forkjoin没太大区别，达到切分长度时按照左右两边切数据分别进行计算，本身是一个分治的过程。在实际使用过程上述代码过程中，我们发现虽然看起来各个地方已经多线程并行化，但实际上存储的数据存在漏计算的问题。

漏计算的点就在于Forkjoin位置处的代码，仅考虑了进行分组拆分，但实际上分组和分组之间的用户也应该进行两两计算，由于没有考虑这点的原因，导致跨分组用户的计算漏了。

根据实践，漏计算的模式算下来只有2000w次计算，甚至不足全量16亿次的0头

改进的方案为增加跨分组用户的计算

```java
@Override
protected void compute() {
    if (CollectionUtils.isEmpty(shardingList)) {
        return;
    }
    if (shardingList.size() <= THRESHOLD) {
        abstractCompute.computeSimilarity(provinceParam, shardingList, shardingList, isTimeWindow);
        return;
    }
    int mid = shardingList.size() / 2;
    List<OrderAddressDTO> leftHandlerList = new ArrayList<>(shardingList.subList(0, mid));
    List<OrderAddressDTO> rightHandlerList = new ArrayList<>(shardingList.subList(mid, shardingList.size()));
    ParallelSimiComputeTask leftTask = new ParallelSimiComputeTask(leftHandlerList, abstractCompute, provinceParam, isTimeWindow);
    ParallelSimiComputeTask rightTask = new ParallelSimiComputeTask(rightHandlerList, abstractCompute, provinceParam, isTimeWindow);
    invokeAll(leftTask, rightTask);
    // 再每个子任务左右执行完毕之后，再次计算跨组相似度
    this.computeCrossGroupSimilarity(leftHandlerList, rightHandlerList);
}

/**
 * 计算跨组相似度
 * 比如用户组200个用户被分为了2组
 * A组：100个用户，B组：100个用户
 * 上面left和right分别计算了A和B组内的两两相似度，但是没有计算left分组和right分组组间的相似度
 * 所以需要对left中的每一个用户都计算其和right中每一个用户的相似度
 *
 * @param leftList 左侧用户列表
 * @param rightList 右侧用户列表
 */
private void computeCrossGroupSimilarity(List<OrderAddressDTO> leftList, List<OrderAddressDTO> rightList) {
    for (OrderAddressDTO left : leftList) {
        List<OrderAddressDTO> leftGroupList = new ArrayList<>();
        leftGroupList.add(left);
        List<OrderAddressDTO> rightGroupList = new ArrayList<>(rightList);
        abstractCompute.computeSimilarity(provinceParam, leftGroupList, rightGroupList, isTimeWindow);
    }
}
```

在计算完毕左侧和右侧的用户时，向上归并的时候，也要计算跨分组的相似度。在自底向上的过程中，会存在一定的重复计算，通过内部`abstractCompute.computeSimilarity`进行防重处理

#### 并发修改及死锁

由于整个流程中涉及到多层并行、并发计算，所以并发修改问题尤其凸显，具体体现在给用户进行实际分组的时候

如最开始的方案是

```java
// 如果两个用户都没有历史分组，则插入一条新分组，并插入两个用户的分组信息，两个用户相同
orderSimilarGroupManager.insertGroup();
Long maxGroupId = orderSimilarGroupManager.getMaxGroupId();
OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
    .userId(orderAddressOne.getUserId())
    .groupId(maxGroupId)
    .build();
```

没有历史分组则插入一条新分组，然后查出来最新的分组填充进去

这样做看起来以为没有问题，但由于并发过高，当插入一条数据到查出来数据的间隔时间内，就已经跨了好几个分组，这会导致不同线程之间的用户分组错乱，以为分到了一组，但由于多线程的原因导致分组完全不对

解决这个问题的方法是，插入之后就使用回填的新id作为后续使用id，在单一应用中能够保持有序，回填新增id使用任意ORM框架均自带该功能

```java
Long maxGroupId = orderSimilarGroupManager.insertGroup();
OrderSimilarUserDO similarUserOne = OrderSimilarUserDO.builder()
    .userId(orderAddressOne.getUserId())
    .groupId(maxGroupId)
    .build();
```

另外一个情况是高并发修改造成的死锁

如以下代码

```java
else if (userOneGroupId != null && userTwoGroupId != null) {
    // 如果都不为空，则说明已经存在两个相同的用户在表中
    // 更新所有分组为第二个用户分组的id为第一个用户的分组
    orderSimilarUserManager.updateGroupId(userOneGroupId, userTwoGroupId,
                                          orderAddressOne.getOrderCode(), orderAddressTwo.getOrderCode(), provinceParam);
}
```

updateGroupId的原始实现为

```java
@Override
public void updateGroupId(Long userIdOneGroupId, Long userIdTwoGroupId) {
    try {
        String lockKey = "updateGroupId:" + userIdTwoGroupId;
        boolean lockSuccess = cacheRepository.tryLock(lockKey, 10L, TimeUnit.SECONDS);
        if (lockSuccess) {
            orderSimilarUserMapper.updateGroupId(userIdOneGroupId, userIdTwoGroupId);
        } else {
            LOGGER.info("updateGroupId lock failed, userIdOneGroupId:{}, userIdTwoGroupId:{}", userIdOneGroupId, userIdTwoGroupId);
        }
    } catch (Exception e) {
        throw ExceptionFactory.sysException("updateGroupId unknown exception:", e);
    } finally {
        cacheRepository.unlock("updateGroupId:" + userIdTwoGroupId);
    }
}
```

对应SQL

```sql
update
order_similar_user
set group_id=#{groupOneId}
where group_id = #{groupTwoId}
```

group_id非主键，可能出现如下2种情况

1. 如果没有加索引，则MYSQL会进行全表扫描，并对所有扫描到的行加锁（即使不满足条件），同时可能在主键索引的间隙中加锁
2. 如有加索引，在RR隔离级别下，MYSQL会对满足`group_id = #{groupTwoId}`条件的索引记录加行锁，同时在这些记录的前后间隙加间隙锁，以防止其他事务插入新的`group_id = #{groupTwoId}`的数据

可以看到，无论是否加索引，对于非主键而言都可能造成加锁，在上述的高并发修改的情况下，很快就会发生死锁问题了

对应的改进方法为，将使用主键id进行更新，将可能的间隙锁或表锁转化为行锁，减少锁的粒度

代码可为

```java
@Override
public void updateGroupId(Long userIdOneGroupId, Long userIdTwoGroupId) {
    try {
        String lockKey = "updateGroupId:" + userIdTwoGroupId;
        boolean lockSuccess = cacheRepository.tryLock(lockKey, 10L, TimeUnit.SECONDS);
        if (lockSuccess) {
            QueryWrapper<OrderSimilarUserDO> queryWrapper = new QueryWrapper<>();
            queryWrapper.lambda()
                .eq(OrderSimilarUserDO::getGroupId, userIdTwoGroupId);
            // 根据需要更新的groupId查询出所有原始分组的主键id
            List<OrderSimilarUserDO> orderSimilarUserListByTwoGroup = orderSimilarUserMapper.selectList(queryWrapper);
            if (!CollectionUtils.isEmpty(orderSimilarUserListByTwoGroup)) {
                // 根据id更新，转化为行级锁
                List<Long> groupTwoIdList = orderSimilarUserListByTwoGroup.stream()
                    .map(OrderSimilarUserDO::getId)
                    .collect(Collectors.toList());
                orderSimilarUserMapper.updateGroupId(userIdOneGroupId, groupTwoIdList);
            }
        } else {
            LOGGER.info("updateGroupId lock failed, userIdOneGroupId:{}, userIdTwoGroupId:{}", userIdOneGroupId, userIdTwoGroupId);
        }
    } catch (Exception e) {
        LOGGER.error("updateGroupId unknown exception:", e);
    } finally {
        cacheRepository.unlock("updateGroupId:" + userIdTwoGroupId);
    }
}
```

SQL为

```sql
update
order_similar_user
set group_id=#{groupOneId}
where id in
<foreach collection="groupTwoIdList" item="groupTwoId" open="(" close=")" separator=",">
	#{groupTwoId}
</foreach>
```

#### 整体架构图

![vector-sim](https://img.benym.cn/vector-search/compute-execute.jpg)

#### 生产核心计算数据

完成两两计算全链路多线程并行化之后，我们就在生产环境上进行验证了，看如下一堆数据

从当天的下午5点到第二天的10点，19个小时跑了增量750w次两两比较

平均每小时写入7500000/19=394736条=每秒写入394736/3600=109条/s

当前处理省份为第46个广州省广州市天河区，总共2930+省份，该省份需要计算13403x13403=179640409=1.796亿次

179640409/109=1648077.14s

2651376.14/3600=457.79小时

457.79/24=19.07天

**实际生产环境计算次数=每个省市区的数据量两两匹配**

按照uat跑了一年的经验，2w订单产生2300w地址数据，缩放比例23000000/(20000x20000)=0.05

则预估生产环境需要计算为160000000000x0.05=1445000000=80亿

**预估耗时=80亿/109/3600/24=849.47天**

经过几周的计算，生产环境共写入了13亿数据，这对于MYSQL单表而已是非常大的数据量了

![vector-sim](https://img.benym.cn/vector-search/vector-sim1.png)

但实际上速度还是很慢，我们继续往下分析

**总共省份2935**

1. 分片任务，生产机器拉4台，每台4c8g，总分片数16，平均1台分片任务4个线程，每个线程需要处理省份183个，平均每台机器处理省份183x4=732个
2. 多核并行计算，4核心跑满，每个分片任务处理单个省份数据大于100则触发切分子任务

**理论计算：**

比如广州省广州市天河区，生产环境共13403，按uat测试，2c4g，总共可以开启并行线程50+，在多任务中按照JDK ForkJoin窃取算法复用线程，预计生产环境可开启线程100+

分片+并行能够增快多省份和省份内的写入速度

目前109条/s是单进程顺序写入速度，109x16(分片数)x100(线程数)=174400条/s
上述等式100，最理想状态每个子任务持有100个线程，但实际上不是这样的，这100个线程是在多个子任务复用，所以实际每台机器只有100线程
预估写入速度
109x16x(100/4(每台机器的核心数))=43600条/s

179640409/43600=4120s=1.14小时

理论提升效率19.06天=99%

理想估计全量总预估耗时=1445000000/43600=33142.20s=9.2小时

上述是理想估计，4wTPS/s对于MYSQL来说是做不到的，而且线程的窃取不透明，并不是每个任务都会用到25个线程

至少提升估计109x16=1744条/s，在MYSQL TPS范围内

至少提升估计全量总预估耗时=1445000000/1744=828555.04s=230.15小时=9.58天

至少提升(153.43-9.58)/153.43=93%

**整体任务理论耗时变为**

数据最多的省份处理时间，而数据最多的省份处理时间=该省份多核并行切分后最长并行任务处理时间

**实际生产环境执行时间(未考虑跨分组计算)**

**4台4c8g，总共16分片情况下，耗时16小时完成全量计算**

![vector-sim](https://img.benym.cn/vector-search/vector-sim2.png)

8台4c8g，总共64分片情况下，耗时4小时全量计算(截图没了)

分片数提升4倍的情况下，耗时也减少了4倍

**实际生产环境按天增量计算执行时间(未考虑跨分组计算)**

8台4c8g，总共64分片情况下，耗时4-5分钟

![vector-sim](https://img.benym.cn/vector-search/vector-sim3.png)

**测试环境全量(跨分组并行)**

**单机耗时35分钟**

![vector-sim](https://img.benym.cn/vector-search/vector-sim4.png)

**测试环境全量(跨分组未并行)**

**单机耗时97分钟**

![vector-sim](https://img.benym.cn/vector-search/vector-sim5.png)

**结论，跨分组并行有效，且未存在数据丢失，分组正常归类，跨分组并行部分实际效率提升(97-35)/97=63.92%**

### 向量化检索

由于实际生产运行上述方案效率上不可接受，所以换为向量化搜索架构，向量化搜索改版后结果

存量全量数据向量化写入时间

![](https://img.benym.cn/vector-search/vector-sim6.png)

相似度实时全量计算时间(最大省份)

112分钟=6720秒

![](https://img.benym.cn/vector-search/vector-sim7.png)

单天增量相似度数据写入时间

272秒=4分钟

![](https://img.benym.cn/vector-search/vector-sim8.png)

可以看到面对超大数据量的计算，向量化检索的方案在计算效率上有了质的提高

#### 整体架构图

![](https://img.benym.cn/vector-search/vector-compute.jpg)

#### Embedding模型选择

由于采用了向量化方案，计算的准确性变得和Embedding模型的选择息息相关，选用什么样的模型直接决定了向量化后地址的质量。这时候可能大家都会想到GPT系列、BGE系列的模型，这些SOTA模型在NLP领域表现得非常好

但地址数据相对特殊，他不属于一个需要去理解文字语义的场景

比如从NLP的角度来说

`北京市海淀区海淀街道新海大厦`和`北京市海淀区人民政府海淀街道办事处`，这两句话可能是非常相似的

但实际上对于定位地址来说，新海大厦和街道办事处是完全不同的两个地方

在我们实际上的测试中，我们使用了GPT的text-embedding、BGE large、Sentence-bert、word2vec、以及原始的编辑距离

根据测试结果我们最终使用了word2vec

因为他的效果最接近编辑距离，基于单个词来进行地址区分，能够明显得判别出上述SOTA模型识别的语义上CASE接近，但实际上是两个不同地址的问题

#### 向量数据库选择

我们首选了milvus和elasticsearch，最终由于一些资源限制，使用了生产环境的高版本支持向量存储的elasticsearch

在es中，需要新建如下索引

```sql
PUT /address_vector/_mapping
{
  "properties": {
    "orderId": {
      "type": "long"
    },
    "province":{
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "city":{
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "county" :{
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "township": {
      "type": "text",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        }
      }
    },
    "detailAddress":{
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "userId" :{
      "type" : "keyword"
    },
    "addressVector": {
      "type": "dense_vector",
      "dims": 200,
      "index": true,
      "similarity": "cosine",
      "index_options": {
        "type": "hnsw",
        "m": 16,
        "ef_construction": 200
      }
    }
  }
}
```

addressVector用于存储向量化之后的地址，采用余弦相似度进行计算，和HNSW小世界图索引，参数的具体设置可以参考腾讯云的[十亿级高性能向量检索实践](https://cloud.tencent.com/document/practice/845/98224)以及https://blog.csdn.net/xcg340123/article/details/142521029

#### 混合检索

上述索引的过程中我们也加上了地址的一些其他信息，用于在召回的时候同时进行混合检索先过滤掉一些不必要的地址，再去检索，加快检索的效率。

对于低版本的es而言，可以选择使用KNN插件https://opendistro.github.io/for-elasticsearch-docs/docs/knn/approximate-knn/，不过我们尝试过在低版本上集成该插件，实际上效果并不好(可能是使用姿势的原因)，建议是直接升级到能够支持向量存储的es版本

**需要注意的是：通常使用es进行向量搜索都是使用近似KNN(Approximate k-NN)，也叫做ANN，一般是基于HNSW索引情况下，近邻计算意味着每次对于一个地址他会去计算小世界图上你开始搜索设置的k个邻居，允许少量误差的算法，在大规模数据情况下，可以在短时间内获得卓越的准确性，所以使用这个方法时应该对自身的业务有一定的估计，比如说我这个地址可能就和近似的200个地址计算(通过历史数据观测)，就能够满足业务了**

如果觉得KNN的评分不够准确，那么还可以使用script_score去定义评分规则，但是这样做会让KNN退化为精确计算，在我们的测试中，这和让es直接两两计算相似度无疑，这是很难让人接受的，因为KNN的计算方法一般都是暴力搜索或者KD树，在计算量大的时候不友好

向量化搜索的核心代码是

```java
public List<VectorAddressDTO> searchSimilarUser(ProvinceParam provinceParam, OrderAddressDTO orderAddressOne, Double similarityThreshold) {
    // 1.根据订单号查询订单地址向量
    BatchStockOrderDTO esOrder = this.searchOrderByOrderId(String.valueOf(orderAddressOne.getOrderCode()));
    if (esOrder == null) {
        throw ExceptionFactory.bizNoStackException("从es中未获取到数据");
    }
    // 2.根据地址向量查询所有相似地址
    List<BatchStockOrderDTO> esOrders = this.searchSimilarDocumentsByKnn(esOrder, provinceParam, similarityThreshold, orderAddressOne.getOrderCode());
    if (CollectionUtils.isEmpty(esOrders)) {
        return new ArrayList<>();
    }
    // 3.数据转型
    return esOrders.stream().map(tmpEsOrder -> {
                VectorAddressDTO vectorAddressDTO = new VectorAddressDTO();
                vectorAddressDTO.setOrderCode(String.valueOf(tmpEsOrder.getOrderCode()));
                vectorAddressDTO.setUserId(tmpEsOrder.getUserId());
                vectorAddressDTO.setProvince(tmpEsOrder.getProvince());
                vectorAddressDTO.setCity(tmpEsOrder.getCity());
                vectorAddressDTO.setCounty(tmpEsOrder.getCounty());
                vectorAddressDTO.setDetailAddress(tmpEsOrder.getDetailAddress());
                return vectorAddressDTO;
            })
            .collect(Collectors.toList());
}
```

其中第2点为

```java
public List<BatchStockOrderDTO> searchSimilarDocumentsByKnn(BatchStockOrderDTO esOrder, ProvinceParam provinceParam, Double similarityThreshold, Long orderId) {
    try {
        QueryWrapper<OrderSimilarUserDO> queryWrapper = new QueryWrapper<>();
        queryWrapper.lambda()
                .eq(OrderSimilarUserDO::getOrderId, orderId);
        OrderSimilarUserDO orderSimilarUserDO = orderSimilarUserMapper.selectOne(queryWrapper);
        if (orderSimilarUserDO != null) {
            throw new NoNeedComputeException(orderId + "已被分组,不再需要召回计算");
        }
        if (log.isDebugEnabled()) {
            log.info("searchSimilarDocumentsByKnn, similarityThreshold: {}, orderId: {}", similarityThreshold, orderId);
        }
        // 构建查询条件
        BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder()
                .must(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.DELIVERY_PROVINCE).query(provinceParam.getProvince()).build()._toQuery())
                .must(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.DELIVERY_CITY).query(provinceParam.getCity()).build()._toQuery())
                .must(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.DELIVERY_COUNTY).query(provinceParam.getCounty()).build()._toQuery())
                .mustNot(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.ORDER_CODE).query(String.valueOf(orderId)).build()._toQuery())
                .mustNot(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.USER_ID).query(esOrder.getUserId()).build()._toQuery());
        // 添加街道信息作为 must 查询条件（如果存在）
        if (StringUtils.hasLength(esOrder.getTownship())) {
            boolQueryBuilder.must(new MatchPhraseQuery.Builder().field(EsOrderIndexKey.TOWNSHIP).query(esOrder.getTownship()).build()._toQuery());
        }
        // 构建最终的 BoolQuery 对象
        BoolQuery boolQuery = boolQueryBuilder.build();
        // 1. 构建KNN查询，召回向量地址
        Integer k = dynamicConfig.getKnnNum();
        KnnQuery knnQuery = new KnnQuery.Builder()
                .field(EsOrderIndexKey.DELIVERY_ADDRESS_VECTOR)
                .k(k)
                // 可选：增加候选数以提高召回率
                .numCandidates(dynamicConfig.getNumCandidates())
                .filter(boolQuery._toQuery())
                .queryVector(esOrder.getAddressVector())
                .build();
        // 构建搜索请求
        SearchRequest searchRequest = new SearchRequest.Builder()
                .index(indexConfig.getIndexName4OrderVector())
                .size(dynamicConfig.getRecallSize())
                // 使用KNN查询作为主查询
                .query(knnQuery._toQuery())
                .build();
        // 执行搜索请求
        if (log.isDebugEnabled()) {
            log.info("searchSimilarDocumentsByKnn, final es query string {}", searchRequest.toString());
        }
        SearchResponse<BatchStockOrderDTO> response = elasticsearchClient.search(searchRequest, BatchStockOrderDTO.class);
        // 提取响应中的命中项
        List<BatchStockOrderDTO> resultList = new ArrayList<>();
        // 2. 执行rerank重排序
        ReRankQueryDTO reRankQuery = new ReRankQueryDTO();
        reRankQuery.setThrehold(similarityThreshold);
        reRankQuery.setQueryAddress(esOrder.getDetailAddress());
        List<ReRankOrderDTO> reRankOrderList = new ArrayList<>();
        int count = 0;
        // 该订单数据是否有街道信息
        for (Hit<BatchStockOrderDTO> hit : response.hits().hits()) {
            if (Objects.nonNull(hit.score()) && hit.source() != null) {
                Double score = hit.score();
                if (score.compareTo(similarityThreshold) >= 0) {
                    resultList.add(hit.source());
                    if (log.isDebugEnabled()) {
                        log.info("searchSimilarDocumentsByKnn, hit score: {}, similarityThreshold:{}", hit.score(), similarityThreshold);
                    }
                    ReRankOrderDTO reRankOrderDTO = new ReRankOrderDTO();
                    reRankOrderDTO.setOrderId(hit.source().getOrderCode());
                    reRankOrderDTO.setAddress(hit.source().getDetailAddress());
                    reRankOrderDTO.setSimilarity(hit.score());
                    reRankOrderList.add(reRankOrderDTO);
                }
                count++;
                if (count % dynamicConfig.getRecallSize() == 0 && score.compareTo(similarityThreshold) >= 0) {
                    log.info("searchSimilarDocumentsByKnn, count: {}, query address:{}, orderId:{}, similarityThreshold:{}", count,
                            esOrder.getDetailAddress(), esOrder.getOrderCode(), similarityThreshold);
                }
            }
        }
        if (CollectionUtils.isEmpty(reRankOrderList)) {
            return resultList;
        }
        reRankQuery.setOrders(reRankOrderList);
        List<String> rerankOrderIdAddressList = this.rerankForRecallAddress(reRankQuery);
        // 根据重排序结果过滤
        return resultList.stream().filter(batchStockOrderDTO -> rerankOrderIdAddressList.contains(batchStockOrderDTO.getDetailAddress()))
                .collect(Collectors.toList());
    } catch (NoNeedComputeException e) {
        throw e;
    } catch (Exception e) {
        log.error("searchSimilarDocumentsByKnn error", e);
        return new ArrayList<>();
    }
}
```

当然也可以选择Hybrid search，在搜索的时候融入BM25评分，这个就看需不需要了，es本身也支持bm25计算

#### Rerank

通常在召回过后，回来的地址/文档需要再一次需要重排序，来进行二次评分。这也是由于地址的特殊性，word2vec实际上还是有一些问题，召回回来的地址不是能够很好的去区分一些bad case

通过混合相似度rerank权重调节可根据不同需求调整不同的权重分数满足相似度分类需求，减少相似度分类错误问题，比如权重（订单地址向量化相似度0.74+文本相似度0.25+数字相似度0.01）

在这次项目中，我们没有用到ReRank模型，仅仅只是简单的加权打分，满足需求即可





