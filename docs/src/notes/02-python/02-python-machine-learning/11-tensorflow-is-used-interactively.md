---
title: Tensorflow交互式使用
date: 2018-08-26 16:52:59
categories: Python-机器学习
tags: 
  - Tensorflow
  - Python
  - 机器学习
keywords: 机器学习,Python,Tensorflow
permalink: /pages/b8d563/
author: 
  name: benym
  link: https://github.com/benym
---

# Tensorflow交互式使用

## 概览

文档中的 Python 示例使用一个会话 [`Session`](http://www.tensorfly.cn/tfdoc/api_docs/python/client.html#Session) 来 启动图, 并调用 [`Session.run()`](http://www.tensorfly.cn/tfdoc/api_docs/python/client.html#Session.run) 方法执行操作.

为了便于使用诸如 [IPython](http://ipython.org/) 之类的 Python 交互环境, 可以使用 [`InteractiveSession`](http://www.tensorfly.cn/tfdoc/api_docs/python/client.html#InteractiveSession)代替 `Session` 类, 使用 [`Tensor.eval()`](http://www.tensorfly.cn/tfdoc/api_docs/python/framework.html#Tensor.eval) 和 [`Operation.run()`](http://www.tensorfly.cn/tfdoc/api_docs/python/framework.html#Operation.run) 方法代替`Session.run()`. 这样可以避免使用一个变量来持有会话.

## 代码

```python
# 进入一个交互式TensorFlow会话
import tensorflow as tf
sess = tf.InteractiveSession()

x = tf.Variable([1.0,2.0])
a = tf.constant([3.0,3.0])

# 使用初始化器 initializer op 的run()方法初始化'x'
x.initializer.run()

# 增加一个减法subtract op，从'x'减去'a'，运行减法op，输出结果
sub = tf.subtract(x,a)
print(sub.eval())
```

## 运行结果

```
[-2. -1.]
```

