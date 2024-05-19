---
title: LeetCode-238-除自身以外数组的乘积
date: 2021-08-25 09:59:56
description: 除自身以外数组的乘积
tags: 
  - 前缀和
  - Medium
  - Java
  - 数组
keywords: Medium,Java,前缀和,数组
permalink: /pages/c56f5d/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-238-除自身以外数组的乘积

题目来自于力扣https://leetcode-cn.com/problems/product-of-array-except-self

给你一个长度为 n 的整数数组 nums，其中 n > 1，返回输出数组 output ，其中 output[i] 等于 nums 中除 nums[i] 之外其余各元素的乘积。

示例:

```
输入: [1,2,3,4]
输出: [24,12,8,6]
```


提示：题目数据保证数组之中任意元素的全部前缀元素和后缀（甚至是整个数组）的乘积都在 32 位整数范围内。

说明: 请**不要使用除法**，且在 O(n) 时间复杂度内完成此题。

进阶：
你可以在常数空间复杂度内完成这个题目吗？（ 出于对空间复杂度分析的目的，**输出数组不被视为额外空间。**）

 <!--more-->

### 解题思路

我们先假设可以使用除法，那么解题的思路可以为，先计算出所有元素的连续乘积，然后利用最后一个位置的总乘积除以当前元素本身的值就可以得到结果，但是这种情况没有考虑除数为0的情况，且由于题目不允许使用除法，所以可以排除这种方法。

**方法1、乘积结果=当前数左边的乘积(前缀)*当前数右边的乘积(后缀)**

由于结果的值为除当前值之外的乘积，所以可以利用2个数组来记录当前值左侧的乘积和当前值右侧的乘积，两个乘积结果再进行一次对应位置相乘即为排除当前位置数的所有元素乘积。

最基本的方法是使用2个数组进行左右乘积的存储，最后需要再次遍历一遍数组进行乘积合并，时间和空间复杂度均为`O(N)`。

**方法2、进阶优化：**

题目规定存储答案的数组不算空间，所以进阶方法尝试能不能用一个答案数组就可以完成上面三个数组的操作。我们可以发现，**res数组其实在最后一轮才使用**，所以我们很自然的想到res可以直接替换掉leftDot数组，用res数组乘以rightDot一样能够得到结果，节省了leftDot前缀数组的空间，但是这仍然使用到了O(N)的空间。

进一步进行优化，我们可以使用一个指针right替换掉后缀数组，而采用动态计算的方式来得到后缀乘积。从右侧动态计算后缀的原理和计算前缀原理类似，而此时我们的res为前缀积，在一次循环中，我们可以使用前缀积和动态计算的后缀积相乘得到最终结果。

### Java代码1

```java
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int length = nums.length;
        int[] leftDot = new int[length];
        int[] rightDot = new int[length];
        int[] res = new int[length];
      	// 因为索引为'0'的元素左侧没有元素，所以leftDot为1
        leftDot[0] = 1;
        // 计算前缀乘积
        for (int i = 1; i < length; i++) {
            leftDot[i] = nums[i - 1] * leftDot[i - 1];
        }
        rightDot[length - 1] = 1;
        // 计算后缀乘积
        for (int i = length - 2; i >= 0; i--) {
            rightDot[i] = nums[i + 1] * rightDot[i + 1];
        }
        // 计算乘积结果
        for (int i = 0; i < length; i++) {
            res[i] = leftDot[i] * rightDot[i];
        }
        return res;
    }
}
```

### Java代码2

```java
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int length = nums.length;
        int[] res = new int[length];
        res[0] = 1;
        // 计算前缀乘积
        for (int i = 1; i < length; i++) {
            res[i] = nums[i - 1] * res[i - 1];
        }
        // 因为right右侧没有任何元素，所以right=1
        int right = 1;
        // 计算结果，后缀动态计算
        for (int i = length - 1; i >= 0; i--) {
            res[i] = res[i] * right;
            right *= res[i];
        }
        return res;
    }
}
```
