---
title: 编程式事务工具类
date: 2023-05-17 17:35:59
permalink: /pages/66bd9f/
tags:
  - 事务
  - 编程式事务
  - Spring
author: 
  name: benym
  link: https://github.com/benym
---
## TransactionalUtil
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.interceptor.DefaultTransactionAttribute;

/**
 * 编程式事务工具类
 */
@Component
public class TransactionalUtil {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionalUtil.class);

    @Autowired
    private DataSourceTransactionManager dataSourceTransactionManager;

    /**
     * 开启事务
     *
     * @return TransactionStatus
     */
    public TransactionStatus begin(){
        LOGGER.info("Start a programmatic transaction");
        return dataSourceTransactionManager.getTransaction(new DefaultTransactionAttribute());
    }

    /**
     * 提交事务
     *
     * @param transactionStatus transactionStatus
     */
    public void commit(TransactionStatus transactionStatus) {
        dataSourceTransactionManager.commit(transactionStatus);
        LOGGER.info("transaction commit");
    }

    /**
     * 回滚事务
     *
     * @param transactionStatus transactionStatus
     */
    public void rollback(TransactionStatus transactionStatus) {
        dataSourceTransactionManager.rollback(transactionStatus);
        LOGGER.info("transaction rollback");
    }
}
```
