---
title: 正则表达式检索与替换
date: 2018-08-07 20:43:26
categories: 
  - Python-基础
tags: 
  - Python正则表达式
permalink: /pages/e8935b/
author: 
  name: benym
  link: https://github.com/benym
---

***re.sub用于替换字符串中的匹配项***

> re.sub(pattern, repl, string,  count=0)

## 代码

```python
import re

phone = "2004-959-559 # 这是一个电话号码"

# 删除注释
num = re.sub(r'#.*$', "", phone)
print("电话号码:", num)

# 移除非数字的内容
num = re.sub(r'\D', "", phone)
print("电话号码:", num)


# 将匹配的数字乘以2
def double(matched):
    value = int(matched.group('value'))
    return str(value * 2)


s = 'A23G4HFD567'
print(re.sub('(?P<value>\d+)', double, s))
```

<!--more-->

## 运行结果

```
电话号码: 2004-959-559 
电话号码: 2004959559
A46G8HFD1134
```

