---
title: LeetCode-面试题56-1-数组中数字出现的次数
date: 2020-05-18 16:06:08
description: 数组中数字出现的次数
tags: 
  - 数组
  - Java
  - Medium
  - 剑指Offer
keywords: 数组,Java,Medium,剑指Offer
permalink: /pages/0dd136/
article: true
categories: 
  - 算法
  - 剑指Offer
author: benym
---

# LeetCode-面试题56-1-数组中数字出现的次数

## 题目

一个整型数组 `nums` 里除两个数字之外，其他数字都出现了两次。请写程序找出这两个只出现一次的数字。要求时间复杂度是O(n)，空间复杂度是O(1)。

**示例1：**

```
输入：nums = [4,1,4,6]
输出：[1,6] 或 [6,1]
```

**示例 2:**

```
输入：nums = [1,2,10,4,1,4,3,3]
输出：[2,10] 或 [10,2]
```

- **限制：**

  `2 <= nums.length <= 10000`

## 解题思路

异或运算(单1为1，其余0)：

根据异或运算的特点，相同的数字会在异或的时候抵消了，不相同的数字，其不相同的位会被保留

如果数组中有2个数字是不相同的，所以对数组整体异或之后，剩下的数字肯定至少有一位为1

如果能够找到第一个为1的那一位，那么就能够通过判断这一位是否为1，而划分数组为2个子数组

这样问题就分解成了，分别寻找2个子数组中，只出现一次的数字

由于判断位的条件具有二分性，当判断出一个不相同的数字位为1时，另一个数字该位则不为1，于是划分的子数组中自然一个数组会包含一个不相同数字

## Java代码

```java
class Solution {
    public int[] singleNumbers(int[] nums) {
        int temp=0;
        // 数组整体异或
        for(int i:nums)
            temp^=i;
        // 初始化mask=1
        int mask = 1;
        // 通过mask，判断第一次出现1的位数
        while((temp&mask)==0){
            mask<<=1;
        }
        int num1 = 0;
        int num2 = 0;
        for(int j:nums){
            // 通过判断1出现的位置和数组元素与运算结果是否为0，来二分数组
            if((j&mask)==0){ // 相同的数字会分在一起，但不同的数字会因此隔开
                num1^=j;
            }else{
                num2^=j;
            }
        }
        return new int[]{num1,num2};
    }
}
```

