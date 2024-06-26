---
title: 列表推导
date: 2018-07-24 18:33:13
categories: 
  - Python-基础
tags: 
  - Python基础
  - 列表
permalink: /pages/f7e4b1/
author: benym
---

# 列表推导

列表推导（List Comprehension）用于从一份现有的列表中得到一份新列表。想象一下，现在
你已经有了一份数字列表，你想得到一个相应的列表，其中的数字在大于 2 的情况下将乘以
2。列表推导就是这类情况的理想选择。

## 代码

```python
# 列表推导

'''
程序理解：
当满足了某些条件时（ if i > 2 ），我们进行指定的操作（ 2*i ），以此来获
得一份新的列表。要注意到原始列表依旧保持不变。
'''

listone = [2, 3, 4]
listtwo = [2 * i for i in listone if i > 2]
print(listtwo)


'''
列表推导的优点在于，当我们使用循环来处理列表中的每个元素并将其存储到新的列表中时
它能够减少代码量
'''
```

## 运行结果

> [6, 8]
