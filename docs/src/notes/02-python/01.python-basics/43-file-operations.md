---
title: 文件操作
date: 2018-07-23 19:36:35
categories: 
  - Python-基础
tags: 
  - Python面向对象
permalink: /pages/9d76ce/
author: benym
---

# 文件操作

## 代码

```python
poem = '''
Programming is fun
When the work is done
if you wanna make your work also fun:
    use Python!
'''

# 打开文件以编辑（'w'riting）
f = open('poem.txt', 'w')
# 向文件中编写文本
f.write(poem)
# 关闭文件
f.close()

# 如果没有特别指定
# 将假定启用默认的阅读（'r'ead）模式
f = open('poem.txt')
while True:
    line = f.readline()
    # 零长度指示 EOF , 用来判断文档结尾
    if len(line) == 0:
        break
    # 每行（'line'）的末尾
    # 都已经有了换行符
    # 因为它是从一个文件中进行读取的
    print(line, end=' ')
# 关闭文件
f.close()
```

## 运行结果

```
 Programming is fun
 When the work is done
 if you wanna make your work also fun:
     use Python!
```

