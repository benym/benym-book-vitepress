---
title: 简单的异常处理
date: 2018-07-23 19:51:46
categories: 
  - Python-基础
tags: 
  - Python异常处理
permalink: /pages/8d431d/
author: 
  name: benym
  link: https://github.com/benym
---

### 简单的异常处理

## 代码

```python
try:
    text = input('Enter someting -->')
except EOFError:   # 按ctrl+D
    print('Why did you do an EOF on me?')
except KeyboardInterrupt: # 按ctrl+C
    print('You cancelled the operation.')
else:
    print('You enterd {}'.format(text))
```

## 运行结果

```
Enter someting -->^D
Why did you do an EOF on me?
```

