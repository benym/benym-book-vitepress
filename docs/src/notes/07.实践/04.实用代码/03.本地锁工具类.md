---
title: 本地锁工具类
date: 2023-05-17 17:37:06
permalink: /pages/0e762d/
tags:
  - Caffine
  - ReentrantLock
  - 锁
author: 
  name: benym
  link: https://github.com/benym
---
## 起步依赖
```bash
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
    <version>2.9.3</version>
</dependency>
```
## LockUtil
```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 本地锁工具类，每个key一把锁
 */
public class LockUtil {

    private LockUtil() {
        throw new IllegalStateException("工具类禁止实例化");
    }

    /**
     * 线程安全，具有过期时间
     */
    private static final Cache<String, ReentrantLock> LOCK_CACHE = Caffeine.newBuilder()
            .expireAfterAccess(10, TimeUnit.MINUTES)
            .maximumSize(1000)
            .build();

    /**
     * 获取锁实例
     * 如果key不存在则新建ReentrantLock
     *
     * @param key key
     * @return Lock
     */
    public static ReentrantLock getLock(String key) {
        return LOCK_CACHE.get(key, lock->newLock());
    }
    
    /**
     * 移除缓存的已解锁lock实例
     *
     * @param key key
     */
    public static void removeCacheLock(String key) {
        ReentrantLock cacheLock = LOCK_CACHE.getIfPresent(key);
        if (cacheLock != null) {
            LOCK_CACHE.invalidate(key);
        }
    }

    /**
     * 新建锁
     *
     * @return ReentrantLock
     */
    private static ReentrantLock newLock(){
        return new ReentrantLock();
    }
}
```