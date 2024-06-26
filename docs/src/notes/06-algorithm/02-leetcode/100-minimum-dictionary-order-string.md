---
title: 最小字典序字符串
date: 2020-08-10 10:22:22
description: 最小字典序字符串
tags: 
  - 字符串
  - Java
  - Medium
keywords: 字符串,Java,Medium,LeetCode
permalink: /pages/bac26b/
categories: 
  - 算法
  - LeetCode
author: benym
---

# 网易2021秋招-最小字典序字符串

## 题目

第一行输入2个数字

第一个数字n代表字符串应该扩充为多少位，第二个数字m代表字符串当前有多少个字符

第二行输入m个数字，代表当前字符串

第三行为输出，输出需要满足在不改变当前字符串前后位置的情况下，扩充为长度为n的最小字典序的字符串

每个数字仅可以选择1次



**示例1：**

```
5 3
2 3 5
1 2 3 4 5
```

**示例2：**

```
5 2
4 2
1 3 4 2 5
```

## 解题思路

观察用例可以输入的n就是扩展后字符的最大数，且每个数字只可以选择1次

现有的数字的前后顺序不变，想要字典序最小，插入的数字需要和现有的数字进行比较，小的数字优先插入到现有数字之前。

可以利用一个队列Queue存储当前的字符，保证先后顺序，同时需要一个n+1的数组，用来保存数字是否被选择的状态。

将原始的字符串在对应位置置为true，表示已经选择，之后的插入数字中不能从中选择这类数字。同时将这些数字加入Queue保证先后顺序

利用StringBuilder来进行最终答案的拼接

- 循环从1开始到n，进行插入数字和队列数字的大小判断：
- 当队列不为空且队列的头部小于新选择数字`i`时，从队列中取出头部原始的数字加入到结果`res`中
- 如果不小于，则说明未选择的数字应该插入到前面，`res.append(i + " ");`
- 如果循环完了，队列中还有值，直接把队列中所有数字按顺序加入`res`即可
- 最后去除首尾空格，返回结果

## Java代码

```java
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int m = sc.nextInt();
        boolean[] visited = new boolean[n + 1];
        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < m; i++) {
            int num = sc.nextInt();
            visited[num] = true;
            queue.offer(num);
        }
        StringBuilder res = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (visited[i]) continue;
            while (!queue.isEmpty() && queue.peek() < i) {
                res.append(queue.poll() + " ");
            }
            res.append(i + " ");
        }
        while (!queue.isEmpty()) {
            res.append(queue.poll() + " ");
        }
        System.out.println(res.toString().trim());
    }
}

```



