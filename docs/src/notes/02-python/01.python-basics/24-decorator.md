---
title: 装饰器
date: 2018-07-24 18:45:48
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/962777/
author: benym
---

# 装饰器

## 概览

装饰器（Decorators）是应用包装函数的快捷方式。这有助于将某一功能与一些代码一遍又一
遍地“包装”。举个例子，我为自己创建了一个 retry 装饰器，这样我可以将其运用到任何函
数之中，如果在一次运行中抛出了任何错误，它就会尝试重新运行，直到最大次数 5 次，并
且每次运行期间都会有一定的延迟。这对于你在对一台远程计算机进行网络调用的情况十分
有用：

## 代码

```python
# 从time模块引入sleep函数
from time import sleep
from functools import wraps
import logging

logging.basicConfig()
log = logging.getLogger("retry")


def retry(f):
    @wraps(f)
    def wrapped_f(*args, **kwargs):
        MAX_ATTEMPTS = 5
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                return f(*args, **kwargs)
            except:
                log.exception("Attempt %s %s failed : %s",
                              attempt, MAX_ATTEMPTS, (args, kwargs))
                sleep(10 * attempt)
        log.critical("All %s attempts failed : %s",
                     MAX_ATTEMPTS,
                     (args, kwargs))

    return wrapped_f


counter = 0


@retry
def save_to_database(arg):
    print("Write to a database or make a network call or etc.")
    print("This will be automatically retried if exception is thrown.")
    global counter
    counter += 1
    # 这将在第一次调用时抛出异常
    # 在第二次运行时正常工作（也就是重试）
    if counter < 2:
        raise ValueError(arg)


# 让你写的脚本模块既可以导入到别的模块中用，另外该模块自己也可执行。
if __name__ == '__main__':
    save_to_database("Some bad value")
```

## 运行结果

```python
ERROR:retry:Attempt 1 5 failed : (('Some bad value',), {})
Traceback (most recent call last):
  File "E:/PythonProject/more/more_decorators.py", line 16, in wrapped_f
    return f(*args, **kwargs)
  File "E:/PythonProject/more/more_decorators.py", line 40, in save_to_database
    raise ValueError(arg)
ValueError: Some bad value
Write to a database or make a network call or etc.
This will be automatically retried if exception is thrown.
Write to a database or make a network call or etc.
This will be automatically retried if exception is thrown.
```

