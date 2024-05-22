---
title: LeetCode-338-比特位计数
date: 2021-08-31 18:49:29
description: 比特位计数
tags: 
  - DP
  - Easy
  - Java
  - 数组
keywords: Easy,Java,数组,DP
permalink: /pages/4a24f6/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-338-比特位计数

题目来自于力扣https://leetcode-cn.com/problems/counting-bits

给定一个非负整数 num。对于 0 ≤ i ≤ num 范围中的每个数字 i ，计算其二进制数中的 1 的数目并将它们作为数组返回。

**示例 1:**

```
输入: 2
输出: [0,1,1]
```

**示例 2:**

```
输入: 5
输出: [0,1,1,2,1,2]
```

**进阶:**

- 给出时间复杂度为**O(n*sizeof(integer))**的解答非常容易。但你可以在线性时间**O(n)**内用一趟扫描做到吗？
- 要求算法的空间复杂度为**O(n)**。
- 你能进一步完善解法吗？要求在C++或任何其他语言中不使用任何内置函数（如 C++ 中的 **__builtin_popcount**）来执行此操作。

 <!--more-->

### 解题思路

**方法1、暴力破解：**

从0到n计算每个数的二进制，转换的同时计算1的个数。

当i大于0时，持续对2求余表示计算当前位置的余数，由于是2进制，余数只可能是0或者1，所以res无论i%2是0(不影响结果)还是1都加上，表示当前位置1的个数。

之后将i/2即进行二进制移位，重复此两个步骤计算每一位是否为1。

**方法2、动态规划：**

没想出来....，参考https://leetcode-cn.com/problems/counting-bits/solution/bei-bi-de-yi-xiang-ren-qiao-miao-de-dong-v6zr/

### Java代码1

```java
class Solution {
    public int[] countBits(int n) {
        int[] result = new int[n+1];
        for(int i = 0; i <= n; i++){
            result[i] = oneNumsByN(i);
        }   
        return result;
    }

    public int oneNumsByN(int i){
        int res = 0;
        while(i>0){
            res += i%2;
            i = i/2;
        }
        return res;
    }
}
```
