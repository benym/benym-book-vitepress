---
title: 数组的最多素数个数
date: 2020-08-10 09:50:59
description: 数组的最多素数个数
tags: 
  - 数组
  - Java
  - Easy
keywords: 数组,Java,Easy,LeetCode
permalink: /pages/13f871/
categories: 
  - 算法
  - LeetCode
author: benym
---

# 网易2021秋招-数组的最多素数个数

## 题目

第一行输入一个数字n

第二行输入n个数字，求这n个数字最多能够拆解为多少个素数，且数字拆解之后素数之后等于数字本身。如5可以拆解为2，3；3本身为素数；7可以拆解为2，2，3

第三行输出数组最多能够拆解成的素数个数

最多1e6个数，每个数字最大为1e9，1不是素数



**示例1：**

```
3
5 3 7
6
```

## 解题思路

观察题目可知，当2的数量最多的时候，数组就拥有最多的素数个数。

**考虑数字范围，需要通过long存储结果，因为累加肯定是超过了int范围**

可以通过判断数字的奇数和偶数来分别进行计算：

偶数情况直接除以2，奇数情况减去3再除以2，再+1个即可

观察可知，上面的奇数情况可以直接合并为数字除以2即可，因为减去3也是减去的一个数，这个数最后还是要加回来的。

所以对每个数字除以2累加即可得到答案。

## Java代码1

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long sum = 0;
        int n = Integer.parseInt(sc.nextLine().trim());
        Main main = new Main();
        for (int i = 0; i < n; i++) {
            int num = sc.nextInt();
            sum += main.countSu(num);
        }
        System.out.println(sum);
    }

    public long countSu(int num) {
        long sum = 0;
        if (num % 2 == 0) {
            sum += num / 2;
        } else {
            sum += ((num - 3) / 2) + 1;
        }
        return sum;
    }
}

```

## Java代码2

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long res = 0;
        int n = sc.nextInt();
        for (int i = 0; i < n; i++) {
            res += sc.nextInt() >> 1;
        }
        System.out.println(res);
    }
}
```



