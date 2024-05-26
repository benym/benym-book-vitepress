---
title: 用户自己引发的异常处理
date: 2018-07-23 19:58:26
categories: 
  - Python-基础
tags: 
  - Python异常处理
permalink: /pages/74cf7d/
author: 
  name: benym
  link: https://github.com/benym
---

# 用户自己引发的异常处理

## 代码

```python
# encoding = UTF-8
# 用户自己引发异常

class ShortInputException(Exception):
    '''一个由用户定义的异常类'''

    def __init__(self, length, atleast):
        Exception.__init__(self)
        self.length = length
        self.atleast = atleast


try:
    text = input('Enter someting -->')
    if len(text) < 3:
        raise ShortInputException(len(text), 3)
    # 其他工作能够在此处正常运行
except EOFError:
    print('Why did you do an EOF on me?')
except ShortInputException as ex:
    print(('ShortInputException: The input was ' +
           '{0} long,expected at least {1}')
          .format(ex.length, ex.atleast))
else:
    print('No exception was raised.')
```

## 运行结果

>1.如果输入超过了3位数，截获错误

```bash
Enter someting -->88888
No exception was raised.
```

> 2.如果输入没有超过3位数

```bash
Enter someting -->12
ShortInputException: The input was 2 long,expected at least 3
```

