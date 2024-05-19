---
title: with open异常处理
date: 2018-07-23 19:55:48
categories: 
  - Python-基础
tags: 
  - Python异常处理
permalink: /pages/c20072/
author: 
  name: benym
  link: https://github.com/benym
---

### with open异常处理

## 代码

```python
with open("poem.txt") as f:
    for line in f:
        print(line, end='')
'''
    with open能够将之前的try..finally最后执行的关闭文件的操作，交给with open自动完成
'''
```

## 运行结果

>poem.txt里面的内容为：12165456478

```bash
>>>12165456478
```



