---
title: 在函数中接受元组与字典
date: 2018-07-24 18:36:49
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/f954d1/
author: benym
---

# 在函数中接受元组与字典

> 有一种特殊方法，即分别使用 * 或 ** 作为元组或字典的前缀，来使它们作为一个参数为
> 函数所接收。当函数需要一个可变数量的实参时，这将非常有用。

## 代码

```python
# 当args变量前面添加了一个*时，函数的所有其他的参数都将传递到args中，并作为一个元组储存
# 如果采用的是 ** 前缀，则额外的参数将被视为字典的键值—值配对。
def powersum(power, *args):
    '''Return the sum of each argument raised to the specified power.'''
    total = 0
    # 在for循环中，i每次获取的是args的值，也就是说初值由args而定
    for i in args:
        total += pow(i, power)
    return total


# 这里可以debug一下看下i的变化，在这里一开始的时候power=2，*args=（3，4）
# i在初始时为3
print(powersum(2, 3, 4))
# 这里i初始时为10
print(powersum(2, 10))
```



## 运行结果

> 25
> 100
