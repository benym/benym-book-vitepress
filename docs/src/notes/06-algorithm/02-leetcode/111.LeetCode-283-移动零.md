---
title: LeetCode-283-移动零
date: 2021-08-24 10:16:39
description: 移动零
tags: 
  - 双指针
  - Easy
  - Java
keywords: Easy,Java,双指针
permalink: /pages/b249d6/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-283-移动零

题目来自于力扣https://leetcode-cn.com/problems/move-zeroes

给定一个数组 nums，编写一个函数将所有 0 移动到数组的末尾，同时保持非零元素的相对顺序。

示例:

```
输入: [0,1,0,3,12]
输出: [1,3,12,0,0]
```


说明:

必须在原数组上操作，不能拷贝额外的数组。
尽量减少操作次数。

 <!--more-->

### 解题思路

**方法1、0填充法：**

用一个指针j来记录非零元素的个数，每出现一个非0元素则j指针++，最终j的位置就是最后一个非零元素的位置，到数组末尾的距离则全用0填充即可。在遍历的过程中要保持数组的相对有序，可以直接采用交换即可。

**方法2、一次遍历：**

一次遍历的过程中需要一个i指向当前遍历的元素位置，同时建立一个新的指针j，在i遍历的时候进行移动。j移动的规则为，当nums[i]!=0的时候交换nums[i]和nums[j]的值，同时j向右移，这样的方法保证了j指针始终指向了已处理好的数组的尾部。每次交换，均为左指针j指向的0和右指针i的非0进行交换，且保证了非0的相对顺序。

### Java代码1

```java
class Solution {
    public void moveZeroes(int[] nums) {
        if(nums==null){
            return;
        }
        int j = 0;
        for(int i = 0;i < nums.length; i++){
            if(nums[i]!=0){
                nums[j] = nums[i];
                j++;
            }
        }

        for(int i = j;i< nums.length; i++){
            nums[i] = 0;
        }
    }
}
```

### Java代码2

```java
class Solution {
    public void moveZeroes(int[] nums) {
        if(nums==null){
            return;
        }
        int j = 0;
        for(int i = 0;i < nums.length;i++){
            if(nums[i]!=0){
                int temp = nums[i];
                nums[i] = nums[j];
                nums[j] = temp;
                j++;
            }
        }
    }
}
```
