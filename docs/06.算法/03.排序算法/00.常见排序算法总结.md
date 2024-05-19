---
title: 常见排序算法总结
date: 2020-07-02 16:17:37
description: 排序算法总结
tags: 
  - 排序算法
  - Java
keywords: 排序,Java
permalink: /pages/8d006a/
categories: 
  - 算法
  - 排序算法
author: 
  name: benym
  link: https://github.com/benym
---

## 常见排序算法总结

总结了常用的排序算法，以及对应分析

相关链接：

1. [冒泡排序](https://cloud.benym.cn/benym-book/pages/3fd3f6/)
2. [选择排序](https://cloud.benym.cn/benym-book/pages/ee0279/)
3. [插入排序](https://cloud.benym.cn/benym-book/pages/db04fa/)
4. [快速排序](https://cloud.benym.cn/benym-book/pages/c1fce8/)
5. [归并排序](https://cloud.benym.cn/benym-book/pages/246724/)
6. [希尔排序](https://cloud.benym.cn/benym-book/pages/05578a/)
7. [桶排序](https://cloud.benym.cn/benym-book/pages/7a5e99/)
8. [基数排序](https://cloud.benym.cn/benym-book/pages/5ee1b6/)
9. [堆排序](https://cloud.benym.cn/benym-book/pages/c0468a/)

 <!--more-->

总结各种排序算法的时间复杂度和空间复杂度，以及其对应的稳定性
::: center
| 算法种类 | 最好情况  |  平均时间复杂度   | 最坏情况  | 空间复杂度 | 是否稳定 |
| :------: | :-------: | :---------------: | :-------: | :--------: | :------: |
| 冒泡排序 |   O(n)    |      O(n^2)       |  O(n^2)   |    O(1)    |    是    |
| 选择排序 |  O(n^2)   |      O(n^2)       |  O(n^2)   |    O(1)    |    是    |
| 插入排序 |   O(n)    |      O(n^2)       |  O(n^2)   |    O(1)    |    是    |
| 快速排序 | O(nlogn)  |     O(nlogn)      |  O(n^2)   |  O(logn)   |    否    |
| 归并排序 | O(nlogn)  |     O(nlogn)      | O(nlogn)  |    O(n)    |    是    |
| 希尔排序 |           |  O(n^1.3)-O(n^2)  |           |    O(1)    |    否    |
|  桶排序  |   O(n)    | O(n*(log(n/m)+1)) |  O(n^2)   |   O(n+m)   |    是    |
| 基数排序 | O(d(n+r)) |     O(d(n+r))     | O(d(n+r)) |    O(r)    |    是    |
|  堆排序  | O(nlogn)  |     O(nlogn)      | O(nlogn)  |    O(1)    |    否    |
:::


