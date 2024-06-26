---
title: LeetCode-1247-交换字符使得字符串相同
date: 2020-08-11 09:43:28
description: 交换字符使得字符串相同
tags: 
  - 字符串
  - Java
  - Medium
keywords: 字符串,Java,Medium,LeetCode
permalink: /pages/961a11/
categories: 
  - 算法
  - LeetCode
author: benym
---

# LeetCode-1247-交换字符使得字符串相同

## 题目

有两个长度相同的字符串 s1 和 s2，且它们其中 只含有 字符 "x" 和 "y"，你需要通过「交换字符」的方式使这两个字符串相同。

每次「交换字符」的时候，你都可以在两个字符串中各选一个字符进行交换。

交换只能发生在两个不同的字符串之间，绝对不能发生在同一个字符串内部。也就是说，我们可以交换 s1[i] 和 s2[j]，但不能交换 s1[i] 和 s1[j]。

最后，请你返回使 s1 和 s2 相同的最小交换次数，如果没有方法能够使得这两个字符串相同，则返回 -1 。



**示例1：**

```
输入：s1 = "xx", s2 = "yy"
输出：1
解释：
交换 s1[0] 和 s2[1]，得到 s1 = "yx"，s2 = "yx"。
```

**示例2：**

```
输入：s1 = "xy", s2 = "yx"
输出：2
解释：
交换 s1[0] 和 s2[0]，得到 s1 = "yy"，s2 = "xx" 。
交换 s1[0] 和 s2[1]，得到 s1 = "xy"，s2 = "xy" 。
注意，你不能交换 s1[0] 和 s1[1] 使得 s1 变成 "yx"，因为我们只能交换属于两个不同字符串的字符。
```

**示例3：**

```
输入：s1 = "xx", s2 = "xy"
输出：-1
```

**示例4：**

```
输入：s1 = "xxyyxyxyxx", s2 = "xyyxyxxxyx"
输出：4
```

**提示：**

- `1 <= s1.length, s2.length <= 1000`
- `s1, s2` 只包含 `'x'` 或 `'y'`。

## 解题思路

根据示例1和示例2可知，

- 当满足'xx'和'yy'、'yy'和'xx'的时候，只需要1步就可以完成交换
- 当满足'xy'和'yx'、'yx'和'xy'的时候，只需要2步就可以完成交换

以上两种情况可以总结为，当s1=x、s2=y时，记录位x++；当s1=y、s2=x时，记录位y++

通过判断x和y的个数，计算最少交换字符的次数

如果x+y是奇数，则返回-1，因为这说明最后还剩下一对，x和y，单字符无法进行交换

如果x+y是偶数，则分为以下两种情况：

- 奇数x+奇数y：每两个x和y对应移动1次，剩下一对x和y对应移动2次
- 偶数x+偶数y：每两个x和y对应移动1次

## Java代码

```java
class Solution {
    public int minimumSwap(String s1, String s2) {
        int x = 0;
        int y = 0;
        for(int i=0;i<s1.length();i++){
            if(s1.charAt(i)=='x'&&s2.charAt(i)=='y'){
                x++;
            }
            if(s1.charAt(i)=='y'&&s2.charAt(i)=='x'){
                y++;
            }
        }
        if((x+y)%2==1) return -1;
        // x是奇数
        if(x%2!=0){
            return x/2+y/2+2;
        }else{
            return x/2+y/2;
        }
    }
}
```

