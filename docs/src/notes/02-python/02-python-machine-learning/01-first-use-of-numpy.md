---
title: Numpy库的首次使用
date: 2018-08-09 20:53:08
categories: 
  - Python-机器学习
tags: 
  - Numpy
  - 机器学习
  - 矩阵
permalink: /pages/43f8b9/
author: 
  name: benym
  link: https://github.com/benym
---

# Numpy库的首次使用

在pycharm中的setting安装numpy，或者在cmd里面通过pip install方法安装均可

## 代码

```python
from numpy import *

# 构造一个4x4的随机数组
print("数组:\n",random.rand(4, 4))

# 调用mat()函数将数组转化为矩阵
randMat = mat(random.rand(4, 4))
# .I操作符实现了矩阵求逆的运算
print("矩阵求逆:\n",randMat.I)
# 矩阵乘以逆矩阵
invRandMat = randMat.I
print("矩阵乘以逆矩阵:\n",randMat*invRandMat)

# 函数eye(4)创建一个4x4的单位矩阵，下面是算误差
myEye = randMat*invRandMat
print("计算误差:\n",myEye-eye(4))
```

## 运行结果

```python 
数组:
 [[ 0.46089523  0.94167701  0.76910005  0.96892095]
 [ 0.38894192  0.88828275  0.28144475  0.91774255]
 [ 0.13997437  0.7435124   0.89709322  0.68924161]
 [ 0.41461243  0.19911356  0.64856312  0.49160523]]
矩阵求逆:
 [[-0.45014095  1.92871242  0.28217777 -0.76959459]
 [ 1.09829851 -0.9829715  -1.78955478  2.70643663]
 [ 0.95057662 -1.40675696  0.67345673 -0.70029109]
 [-1.11436955 -0.35496085  1.88297962 -0.76459429]]
矩阵乘以逆矩阵:
 [[  1.00000000e+00   7.20736257e-17  -3.04329603e-17  -1.66886258e-17]
 [ -2.27212878e-16   1.00000000e+00   2.93001892e-17  -1.63043911e-16]
 [  8.73583235e-18  -3.06881469e-17   1.00000000e+00  -3.50839733e-17]
 [ -4.04804848e-17   1.45085950e-16  -1.23671214e-16   1.00000000e+00]]
计算误差:
 [[ -1.11022302e-16   7.20736257e-17  -3.04329603e-17  -1.66886258e-17]
 [ -2.27212878e-16   2.22044605e-16   2.93001892e-17  -1.63043911e-16]
 [  8.73583235e-18  -3.06881469e-17  -2.22044605e-16  -3.50839733e-17]
 [ -4.04804848e-17   1.45085950e-16  -1.23671214e-16   2.22044605e-16]]
```
