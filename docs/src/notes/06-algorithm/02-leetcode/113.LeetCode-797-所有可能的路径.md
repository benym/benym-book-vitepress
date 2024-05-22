---
title: LeetCode-797-所有可能的路径
date: 2021-08-25 14:56:24
description: 所有可能的路径
tags: 
  - 回溯
  - Medium
  - Java
  - 数组
  - DFS
  - 图
keywords: Medium,Java,回溯,数组,图,DFS
permalink: /pages/0b83ab/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-797-所有可能的路径

题目来自于力扣https://leetcode-cn.com/problems/all-paths-from-source-to-target

给你一个有 n 个节点的 有向无环图（DAG），请你找出所有从节点 0 到节点 n-1 的路径并输出（不要求按特定顺序）

二维数组的第 i 个数组中的单元都表示有向图中 i 号节点所能到达的下一些节点，空就是没有下一个结点了。

译者注：有向图是有方向的，即规定了 a→b 你就不能从 b→a 。

示例1:

```
输入：graph = [[1,2],[3],[3],[]]
输出：[[0,1,3],[0,2,3]]
解释：有两条路径 0 -> 1 -> 3 和 0 -> 2 -> 3
```

示例2:

```
输入：graph = [[4,3,1],[3,2,4],[3],[4],[]]
输出：[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]
```

示例3:

```
输入：graph = [[1],[]]
输出：[[0,1]]
```

示例4:

```
输入：graph = [[1,2,3],[2],[3],[]]
输出：[[0,1,2,3],[0,2,3],[0,3]]
```

示例5:

```
输入：graph = [[1,3],[2],[3],[]]
输出：[[0,1,2,3],[0,3]]
```

提示：

- n == graph.length
- 2 <= n <= 15
- 0 <= graph[i][j] < n
- graph[i][j] != i（即，不存在自环）
- graph[i] 中的所有元素 **互不相同**
- 保证输入为 **有向无环图（DAG）**

 <!--more-->

### 解题思路

**方法1、DFS**

采用深度优先遍历的方式求解所有路径

- **初始状态：**从0号节点出发
- **递归规则：**固定某一个节点(**add**操作)，选择一个他的邻居节点(**循环遍历**二维数组)，并记录他(**add**操作)，在重复进行这三步
- **回溯：**当这条路径走完了，或者遍历结束时，移除上一轮加入path中的节点(**remove**操作)
- **终止条件：**当目前的深度达到了数组length-1时结束，因为最后一个节点始终是空

### Java代码1

```java
class Solution {
    List<List<Integer>> res = new ArrayList<>();
    public List<List<Integer>> allPathsSourceTarget(int[][] graph) {
        List<Integer> path = new ArrayList<>();
        path.add(0);
        dfs(path,graph,0,graph.length-1);
        return res;
    }

    public void dfs(List<Integer> path,int[][] graph,int start, int depth){
        if(start==depth){
            res.add(new ArrayList<>(path));
            return;
        }
        for(int row : graph[start]){
            path.add(row);
            dfs(path,graph,row,depth);
            path.remove(path.size()-1);
        }
    }
}
```
