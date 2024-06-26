---
title: 获取满足指数的最长字符串
date: 2020-08-20 19:16:41
description: 笔试题
tags: 
  - Java
  - Medium
keywords: Java,Medium
permalink: /pages/5969d4/
categories: 
  - 算法
  - LeetCode
author: benym
---

## 获取满足指数的最长字符串

## 题目

字母表的26个字母，每个字母(忽略大小写)按照他们在字母表的顺序，代表一个数，例如：a代表1，h代表8，z代表26

对于任意由英文字母组成的字符串，我们可以把他们每一位对应的数加起来，便可以计算出这个字符串的**指数**，例如：abc的指数为6。

现在给你一个**字符串**与一个期望的**指数**，希望可以找出这个字符串的所有满足这个指数子串中，最长子串的长度。

要求：时间复杂度为O(n)，空间复杂度为O(1)



输入描述：

```
输入为两行，第一行是字符串，第二行是期望的指数，例如：

bcdafga
8
```

输出描述:

```
输出为最长子串的长度。如果没有合适的子串，则应该返回0，例如，对于示例中的输入，应该输出：
3
```

## 解题思路

**方法1、双指针：**

初始化left和right指针，len指针记录最长子串的长度，res记录当前窗口内数值的和

采用类似滑动窗口的思想

- 当[left,right)窗口内的值等于期望值时，说明找到了一个满足期望的子串，更新最长子串长度，因为此时窗口值已经等于期望值，向右扩展必定会使窗口值增加，所以此时应该缩减左窗口，才有可能在后续的子串中找到另外的满足期望值的left和right，res减去缩减左窗口的值，同时使得left++
- 当[left,right)窗口内的值大于期望值时，需要缩减左窗口，即left++，同时时res减去左窗口的缩减部分的值
- 当[left,right)窗口内的值小于期望值时，需要向右扩展窗口，即right++，同时res加上右窗口增加部分的值

## Java代码

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        char[] s = sc.nextLine().toCharArray();
        int exNum = Integer.parseInt(sc.nextLine().trim());
        int left = 0;
        int right = 0;
        int len = 0;
        int res = 0;
        while (right < s.length) {
            if (res == exNum) {
                len = Math.max(len, right - left);
                res -= (s[left] - 'a' + 1);
                left++;
            } else if (res > exNum) {
                res -= (s[left] - 'a' + 1);
                left++;
            } else {
                res += (s[right] - 'a' + 1);
                right++;
            }
        }
        System.out.println(len);
    }
}

```



