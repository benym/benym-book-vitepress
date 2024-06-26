---
title: turtle绘图库
date: 2018-08-08 17:11:18
description: 使用绘图库绘制图形
categories: 
  - Python-机器学习
tags: 
  - Python库
permalink: /pages/0779b1/
author: benym
---

# turtle绘图库

## 代码

实例1：

绘制一条小蛇

```python
import turtle  # 绘图库

# 绘制一条小蛇
# 设置窗体大小及位置，但并不是必须的，依次长,宽，如果后两项不设置，则默认正中心
turtle.setup(650, 350, 200, 200)
# 抬起画笔
turtle.penup()
# turtle.fd表示向海龟的右边走，turtle.bk表示向海龟的左边走
turtle.fd(-250)
# 下笔
turtle.pendown()
# 设置画笔宽度
turtle.pensize(25)
# 设置画笔颜色
turtle.pencolor("purple")
# 改变当前行径的方向，原地转向的意思，参数为绝对角度
# turtle.left和turtle.right表示向左边或右边改变角度
turtle.seth(-40)
for i in range(4):
    # circle表示以某一个点为圆心，向左侧运行
    turtle.circle(40, 80)
    turtle.circle(-40, 80)
turtle.circle(40, 80 / 2)
turtle.fd(40)
turtle.circle(16, 100)
turtle.fd(40 * 2 / 3)
turtle.done()
```

## 运行结果
::: center
![snake](https://img.benym.cn/turtlesnake.png/zipstyle)
:::


## 代码
实例2：绘制一个Z

```python
import turtle

turtle.left(45)  # 转角度
turtle.fd(150)  # 前进
turtle.right(135)
turtle.fd(300)
turtle.left(135)
turtle.fd(150)
turtle.done()
```

## 运行结果
::: center
![Z](https://img.benym.cn/turtleZ.png/zipstyle)
:::
