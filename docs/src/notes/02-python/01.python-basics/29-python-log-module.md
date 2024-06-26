---
title: Python日志模块
date: 2018-07-23 20:03:18
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/adffdd/
author: benym
---

# Python日志模块

## 代码

```python
# 日志模块
import os
import platform
import logging

# os.getenv()获取一个环境变量，如果没有返回none
# os.path.join()： 将多个路径组合后返回
if platform.platform().startswith('Windows'):
    logging_file = os.path.join(os.getenv('HOMEDRIVE'),
                                os.getenv('HOMEPATH'),
                                'test.log')
else:
    logging_file = os.path.join(os.getenv('HOME'),
                                'test.log')
print("Logging to", logging_file)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)s :%(message)s',
    filename=logging_file,
    filemode='w',
)

# 日志文件将存储在电脑上
logging.debug("Start of the program")
logging.info("Doing something")
logging.warning("Dying now")
```

## 运行结果

```bash
Logging to C:\Users\dylink\test.log
电脑查看该目录文件为
2018-07-23 20:03:55,441: DEBUG :Start of the program
2018-07-23 20:03:55,441: INFO :Doing something
2018-07-23 20:03:55,441: WARNING :Dying now
```

