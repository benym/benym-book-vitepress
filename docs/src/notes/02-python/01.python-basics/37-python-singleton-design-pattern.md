---
title: 单例设计模式
date: 2018-08-08 21:15:36
categories: Python-基础
tags: Python面向对象
permalink: /pages/ccdd54/
author: benym
---

# 单例设计模式

## 代码

```python
# object写不写都可以，在python3.X中已经默认继承了，以前区别旧式类和新式类
# 单例设计模式
class MusicPlayer(object):
    # 记录第一个被创建对象的引用
    instance = None

    # 记录是否执行过初始化方法
    init_flag = False

    def __new__(cls, *args, **kwargs):
        # 1. 判断类属性是否是空对象
        if cls.instance is None:
            # 2. 调用父类的方法，为第一个对象分配空间
            cls.instance = super().__new__(cls)
        # 3. 返回类属性保存的对象引用
        return cls.instance

    # 让初始化方法只执行一次
    def __init__(self):

        # 1. 判断是否执行过初始化动作
        if MusicPlayer.init_flag:
            return
        # 2. 如果没有执行过，执行初始化动作
        print("111111111")
        # 3. 修改类属性的标记
        MusicPlayer.init_flag = True


# 创建多个对象
player1 = MusicPlayer()
print(player1)
player2 = MusicPlayer()
print(player2)
```

## 运行结果

```
111111111
<__main__.MusicPlayer object at 0x000000000342D0B8>
<__main__.MusicPlayer object at 0x000000000342D0B8>
```

可以看出2次对象的创建在内存上实际是一个地址
