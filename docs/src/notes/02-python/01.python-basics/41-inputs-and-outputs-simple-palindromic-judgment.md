---
title: 输入输出——简单的回文判断
date: 2018-07-23 19:30:11
categories: 
  - Python-基础
tags: 
  - Python面向对象
permalink: /pages/0f3eea/
author: benym
---

# 输入输出——简单的回文判断

## 代码

```python
'''
可以通过使用 seq[a:b] 来从位置 a 开
始到位置 b 结束来对序列进行切片 。我们同样可以提供第三个参数来确定切片的步长
（Step）。默认的步长为 1 ，它会返回一份连续的文本。如果给定一个负数步长，如 -1 ，
将返回翻转过的文本。
'''


def reverse(text):
    return text[::-1]  # 使用切片功能返回倒序


def is_palindrome(text):
    return text == reverse(text)  # 如果正序和倒序相等的话，就是回文


something = input("Enter text: ")
if is_palindrome(something):
    print("Yes,it is a palidrome")  # 是回文
else:
    print("No, it is not a palindrome")  # 不是回文
```

## 运行结果

>如果是回文字串
>
>Enter text: 1221
>Yes,it is a palidrome



> 如果不是回文字串
>
> Enter text: 11111555
> No, it is not a palindrome

