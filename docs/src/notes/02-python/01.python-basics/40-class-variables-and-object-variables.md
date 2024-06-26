---
title: 类变量与对象变量
date: 2018-07-23 19:08:50
categories: 
  - Python-基础
tags: 
  - Python面向对象
permalink: /pages/43bfe3/
author: benym
---

# 类变量与对象变量

## 代码

```python
# coding=UTF-8,类变量与对象变量
class Robot:
    """表示有一个带有名字的机器人。"""
    # 一个类变量，用来计数机器人的数量
    population = 0  # 这是一个类变量，属于Robot类

    def __init__(self, name):  # name变量属于一个对象（通过self分配），因此它是一个对象变量
        """初始化数据"""
        self.name = name
        print("(Initializing {})".format(self.name))

        # 当有人被创建时，机器人会增加人口数量
        '''
       除了 Robot.popluation ，我们还可以使用 self.__class__.population ，因为每个对象都通过
       self.__class__ 属性来引用它的类。 
       '''
        Robot.population += 1

    def die(self):
        """我挂了。"""
        print("{} is being destroyed!".format(self.name))

        Robot.population -= 1

        if Robot.population == 0:
            print("{} was the last one.".format(self.name))
        else:
            print("There are still {:d} robots working.".format(Robot.population))

    def say_hi(self):
        """来自机器人的诚挚问候

        没问题，你做得到"""
        print("Greetings , my masters call me {}".format(self.name))

    '''
    classmethod 修饰符对应的函数不需要实例化，不需要 self 参数，
    但第一个参数需要是表示自身类的 cls 参数，可以来调用类的属性，类的方法，实例化对象等。
    '''

    # how_many实际上是一个属于类而非属于对象的方法
    # classmethod(类方法)或是一个staticmethod(静态方法)
    @classmethod  # 装饰器，等价于how_many = classmethod(how_many)
    def how_many(cls):
        """打印出当前的人口数量"""
        print("We have {:d} robots.".format(cls.population))


droid1 = Robot("R2-D2")
droid1.say_hi()
Robot.how_many()

droid2 = Robot("C-3PO")
droid2.say_hi()
Robot.how_many()
print("\nRobots can do some work here.\n")
print("Robots have finished their work. So let's destroy them.")
droid1.die()
droid2.die()

Robot.how_many()
```

## 运行结果

```bash
(Initializing R2-D2)
Greetings , my masters call me R2-D2
We have 1 robots.
(Initializing C-3PO)
Greetings , my masters call me C-3PO
We have 2 robots.

Robots can do some work here.

Robots have finished their work. So let's destroy them.
R2-D2 is being destroyed!
There are still 1 robots working.
C-3PO is being destroyed!
C-3PO was the last one.
We have 0 robots.
```

