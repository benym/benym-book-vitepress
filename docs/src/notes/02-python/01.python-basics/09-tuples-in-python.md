---
title: Python中的元组
date: 2018-07-07 17:15:01
categories: 
  - Python-基础
tags: 
  - Python基础
  - 元组
permalink: /pages/e8270d/
author: benym
---

# Python中的元组

## 概览

元组（Tuple）用于将多个对象保存到一起。你可以将它们近似地看作列表，但是元组不能提供列表类能够提供给你的广泛的功能。元组的一大特征类似于字符串，它们是不可变的，也就是说，你不能编辑或更改元组。元组是通过特别指定项目来定义的，在指定项目时，你可以给它们加上括号，并在括号内部用逗号进行分隔。元组通常用于保证某一语句或某一用户定义的函数可以安全地采用一组数值，意即元组内的数值不会改变。

## 代码

```python
# 元组
'''
推荐使用括号来指明元组的开始和结束
尽管括号是一个可选选项
明了胜过晦涩，显式优于隐式
'''
zoo = ('python', 'elephant', 'penguin')
print('Number of animals in the zoo is', len(zoo))
new_zoo = 'monkey', 'camel', zoo
print('Number of animals in the zoo is', len(new_zoo))
print('All animals in new zoo are', new_zoo)
print('Animals brought from old zoo are', new_zoo[2])
print('Last animal brought from old zoo is', new_zoo[2][2])
print('Number of animals in the new zoo is',
      len(new_zoo) - 1 + len(new_zoo[2]))
```

