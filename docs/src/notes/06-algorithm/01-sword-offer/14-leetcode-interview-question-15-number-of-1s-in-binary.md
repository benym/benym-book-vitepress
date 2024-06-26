---
title: LeetCode-面试题15-二进制中1的个数
date: 2020-04-14 10:59:53
description: 二进制中1的个数
tags: 
  - 位运算
  - Java
  - Python
  - Easy
  - 剑指Offer
keywords: 位运算,Java,Python,Easy,剑指Offer
permalink: /pages/5abb63/
article: true
categories: 
  - 算法
  - 剑指Offer
author: benym
---

# LeetCode-面试题15-二进制中1的个数

## 题目

请实现一个函数，输入一个整数，输出该数二进制表示中 1 的个数。例如，把 9 表示成二进制是 1001，有 2 位是 1。因此，如果输入 9，则该函数输出 2。

 

**示例1**

```
输入：00000000000000000000000000001011
输出：3
解释：输入的二进制串 00000000000000000000000000001011 中，共有三位为 '1'。
```

**示例2**

```
输入：00000000000000000000000010000000
输出：1
解释：输入的二进制串 00000000000000000000000010000000 中，共有一位为 '1'。
```

**示例3**

```
输入：11111111111111111111111111111101
输出：31
解释：输入的二进制串 11111111111111111111111111111101 中，共有 31 位为 '1'。
```

## 解题思路

实际上把二进制不断向右移动和1求与运算就可以得到所有1了，但是这样不适用于负整数的情况。

换一个思路把1左移一位，右边始终是加0，跟n求与运算得到所有的1，这种是有多少位数循环多少次。

一种更好的方法是，把n减去1，再和原本的n做与运算，会把n最右边的1变为0，有多少1就会执行多少次。

## Java代码

```java
public class Solution {
    // you need to treat n as an unsigned value
    public int hammingWeight(int n) {
        int count = 0;
        int flag = 1;
        while(flag!=0){
            if((n&flag)!=0)
                count++;
            flag = flag<<1;
        }
        return count;
    }
}
```

## Python代码

```python
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        while n:
            n = (n-1)&n
            count+=1
        return count
```

