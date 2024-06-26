---
title: 多种方法快速交换两个变量的值
date: 2018-07-24 09:33:48
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/e5cf66/
author: benym
---

# 使用多种方法快速交换两个变量的值

## 概览

> 1、利用元组的快速交换变量值
>
> 2、引入新的变量来交换
>
> 3、使用加减法交换变量值
>
> 4、利用元组从一个函数中返回两个不同的值

## 代码

```python
# 1. 利用元组的快速交换变量值
a = 5
b = 8
a, b = b, a
print(a, b)
# 2. 引入新的变量来交换
c = b
b = a
a = c
print(a, b)
# 3. 使用加减法交换变量值
a = a + b
b = a - b
a = a - b
print(a, b)


# 4. 利用元组从一个函数中返回两个不同的值
def get_error_details():
    return (2, 'details')


errnum, errstr = get_error_details()
print(errnum)
print(errstr)
```

## 运行结果

```
8 5
5 8
8 5
2
details
```

