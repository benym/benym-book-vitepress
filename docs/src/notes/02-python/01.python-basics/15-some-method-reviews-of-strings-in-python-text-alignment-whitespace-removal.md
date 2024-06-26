---
title: Python中字符串的一些方法回顾(文本对齐、去除空白)
date: 2018-07-26 19:39:41
categories: 
  - Python-基础
tags: 
  - Python基础
  - strip
permalink: /pages/a7c3f3/
author: benym
---

# Python中字符串的一些方法回顾(文本对齐、去除空白)

文本对齐的方法，以及用strip函数去除字符串的中空白字符

## 代码

```python
# 假设：以下内容是从网络上抓取下来的
# 要求：顺序并且居中对齐输出一下内容
poem = ["\t\n登鹤鹊楼",
        "王之涣",
        "白日依山尽\t\n",
        "黄河入海流",
        "欲穷千里目",
        "更上一层楼"]

for poem_str in poem:
    # 先使用strip方法去除字符串中的空白字符
    # 居中对齐  
    '''
      Python center() 返回一个原字符串居中,并使用空格填充至长度 width 的新字符串。默认填充字符为空格。
    '''
    print("|%s|" % poem_str.strip().center(10, "　"))
    # 向左对齐
    # print("|%s|" % poem_str.ljust(10, "　"))
    # 向右对齐
    # print("|%s|" % poem_str.rjust(10, "　"))
```

## 运行结果

```
|　　　登鹤鹊楼　　　|
|　　　王之涣　　　　|
|　　白日依山尽　　　|
|　　黄河入海流　　　|
|　　欲穷千里目　　　|
|　　更上一层楼　　　|
```

