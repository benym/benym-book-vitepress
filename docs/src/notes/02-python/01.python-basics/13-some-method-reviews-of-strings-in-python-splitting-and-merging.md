---
title: Python中字符串的一些方法回顾(拆分与合并)
date: 2018-07-26 19:40:01
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/5386bd/
author: benym
---

# python中字符串的一些方法回顾(拆分与合并)

字符串中split函数和join函数的使用

## 代码

```python
# 假设：以下内容是从网络上抓取的
# 要求：
# 1、将字符串中的空白字符全部去掉
# 2、再使用"  "作为分隔符，拼接成一个整齐的字符串
poem_str = "登鹤鹊楼\t 王之涣 \t 白日依山尽 \t\n 黄河入海流 \t\t 欲穷千里目\t\t更上一层楼"

print(poem_str)

# 1、拆分字符串  split方法会返回列表
poem_list = poem_str.split()
print(poem_list)

# 2、合并字符串
result = " ".join(poem_list)
print(result)
```

## 运行结果

```bash
原始字符串：
 登鹤鹊楼	 王之涣 	 白日依山尽 	
 黄河入海流 		 欲穷千里目		更上一层楼
拆分字符串后：
 ['登鹤鹊楼', '王之涣', '白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼']
合并字符串后: 
 登鹤鹊楼 王之涣 白日依山尽 黄河入海流 欲穷千里目 更上一层楼
```

