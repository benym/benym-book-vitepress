---
title: 输入输出——回文字串的判断（加强版）
date: 2018-07-23 19:36:35
categories: 
  - Python-基础
tags: 
  - Python面向对象
permalink: /pages/efd97d/
author: benym
---

# 输入输出——回文字串的判断（加强版）

## 代码

```python
forbindden_word = (' ', ',', ';', '.', '!', '//', '?')

# 样例字符串Rise to vote,sir.   共17长度
def ignore_word(text):  # 去除忽略的特殊字符
    strdemo = list(text.lower())
    count = 0
    print('长度为:', len(strdemo))
    for i in list(range(len(strdemo))):   # 遍历从0-16，共17长度 ，debug一下就懂了
        if strdemo[i - count] in forbindden_word:
            del strdemo[i - count]  # 删除特殊字符
            count += 1
    return strdemo


def reverse(text):
    return text[::-1]


def is_reverse(text):  # 判断是否为回文
    return text == reverse(text)


something = input('随便输入点什么:')
if is_reverse(ignore_word(something)):
    print('恭喜！他是回文文本')
else:
    print('这好像不是回文文本哦')
```

## 运行结果

```bash
随便输入点什么:Rise to vote,sir.
长度为: 17
恭喜！他是回文文本
```

