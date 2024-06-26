---
title: LeetCode-面试题62-圆圈中最后剩下的数字
date: 2020-05-20 16:08:25
description: 圆圈中最后剩下的数字
tags: 
  - 数组
  - Java
  - Easy
  - 剑指Offer
keywords: 数组,Java,Easy,剑指Offer
permalink: /pages/9ca7ff/
article: true
categories: 
  - 算法
  - 剑指Offer
author: benym
---

# LeetCode-面试题62-圆圈中最后剩下的数字

## 题目

0,1,,n-1这n个数字排成一个圆圈，从数字0开始，每次从这个圆圈里删除第m个数字。求出这个圆圈里剩下的最后一个数字。

例如，0、1、2、3、4这5个数字组成一个圆圈，从数字0开始每次删除第3个数字，则删除的前4个数字依次是2、0、4、1，因此最后剩下的数字是3。

**示例1：**

```
输入: n = 5, m = 3
输出: 3
```

**示例2:**

```
输入: n = 10, m = 17
输出: 2
```

**限制：**

- `1 <= n <= 10^5`
- `1 <= m <= 10^6`

## 解题思路1

著名的约瑟夫环问题

第一轮[0,1,**2**,3,4]，删去2

第二轮[3,4,**0**,1]，删去0

第三轮[1,3,**4**]，删去4

第四轮[1,3]，删去1

最后一轮得到3，实际上每次删去的都是加粗部分位置，第四轮由于只有2个数，补全成环之后，实际上也是加粗部分位置，如[1,3,**1**,3]

原始数组是有序递增的，所以下标就是数组值

最后一轮3的下标是0，如果我们能够从最后的数字下标反推回到原始数组，就能找到最终答案

反推的方程，`(curIndex+m)%上一轮剩余数字的个数`

## 解题思路2

模拟，利用list进行模拟

## Java代码

```java
class Solution {
    public int lastRemaining(int n, int m) {
        if(n<1||m<1) return -1;
        int curindex = 0;
        for(int i=2;i<=n;i++){
            curindex = (curindex+m)%i;
        }
        return curindex;
    }
}
```

## Java代码2

```java
class Solution {
    public int lastRemaining(int n, int m) {
        List<Integer> list = new ArrayList<>();
        for(int i = 0;i<n;i++){
            list.add(i);
        }
        int index = 0;
        while(n>1){
            index = (index+m-1)%n;
            list.remove(index);
            n--;
        }
        return list.get(0);
    }
}
```
