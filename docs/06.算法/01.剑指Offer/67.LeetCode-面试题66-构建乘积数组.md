---
title: LeetCode-面试题66-构建乘积数组
date: 2020-05-21 15:08:46
description: 构建乘积数组
tags: 
  - 数组
  - Java
  - Easy
  - 剑指Offer
keywords: 数组,Java,Easy,剑指Offer
permalink: /pages/bcd8dc/
article: true
categories: 
  - 算法
  - 剑指Offer
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-面试题66-构建乘积数组

给定一个数组 A[0,1,…,n-1]，请构建一个数组 B[0,1,…,n-1]，其中 B 中的元素 B[i]=A[0]×A[1]×…×A[i-1]×A[i+1]×…×A[n-1]。不能使用除法。

 <!--more-->

**示例1：**

```
输入: [1,2,3,4,5]
输出: [120,60,40,30,24]
```

**限制：**

- 所有元素乘积之和不会溢出 32 位整数
- `a.length <= 100000`

### 解题思路

将A[0]×A[1]×…×A[i-1]分为一个数组记为C[i]，A[i+1]×…×A[n-1]分为一个数组记为D[i]，数组B可以由这两个数组的乘积得到，把B看成一个矩阵其左对角线为全1，分开上述2个数组
B=
```bash
B0&1 & A1 & A2 & ... & An-2 & An-1
B1& A0 & 1 & A2 & ...&An-2 & An-1
B2& A0 & A1 & 1 & ...&An-2 & An-1
...& A0 & A1 & ... & 1 &An-2& An-1
Bn-2& A0 & A1 & ... & An-3&1 & An-1
Bn-1& A0 & A1 & ... & An-3 &An-2& 1
```
A[0]×A[1]×…×A[i-1]可以自上而下，从左至右的顺序计算得到，对应于C[i] = C[i-1]*A[i-1]

A[i+1]×…×A[n-1]可以自下而上，从右至左的顺序计算得到，对应于D[i] = D[i+1]*A[i+1]

### Java代码

```java
class Solution {
    public int[] constructArr(int[] a) {
        if(a.length==0) return new int[0];
        int[] b = new int[a.length];
        b[0]=1;
        int temp=1;
        // 循环控制从上至下，累乘从左至右
        for(int i=1;i<a.length;i++){
            b[i] = b[i-1]*a[i-1];
        }
        // 循环控制从下至上，累乘从右至左
        for(int j=a.length-2;j>=0;j--){
            temp*=a[j+1];
            b[j]*=temp;
        }
        return b;
    }
}
```
### Java代码2

```java
class Solution {
    public int[] constructArr(int[] a) {
        int[] res = new int[a.length];
        for(int i=0,cur=1;i<a.length;i++){
            res[i] = cur; // 先乘左边的数(不包括自己)
            cur*=a[i];
        }
        for(int i=a.length-1,cur=1;i>=0;i--){
            res[i] *= cur; // 再乘右边的数(不包括自己)
            cur*=a[i];
        }
        return res;
    }
}
```

