---
title: 判断一棵二叉树是否为二叉搜索树和完全二叉树
date: 2020-09-10 16:30:22
description: 如题
tags: 
  - 树
  - Java
  - Easy
  - LeetCode
keywords: 树,Java,Easy,LeetCode
permalink: /pages/6d1dda/
categories: 
  - 算法
  - LeetCode
author: benym
---

# 判断一棵二叉树是否为二叉搜索树和完全二叉树

## 题目

给定一棵二叉树，已经其中没有重复值的节点，请判断该二叉树是否为搜索二叉树和完全二叉树。

 

**示例1：**

```
输入：{2,1,3}
输出：[true,true]
```

**备注：**

```
n<=500000
```

## 解题思路

详见注释理解

## Java代码

```java
import java.util.*;

/*
 * public class TreeNode {
 *   int val = 0;
 *   TreeNode left = null;
 *   TreeNode right = null;
 * }
 */

public class Solution {
    /**
     * 
     * @param root TreeNode类 the root
     * @return bool布尔型一维数组
     */
    public boolean[] judgeIt(TreeNode root) {
        // 二叉搜索树的中序遍历严格递增
        // 每个节点左边节点小于右边节点，左子树的最大值一定小于根节点，小于右子树的最大值
        if (root == null) {
            return new boolean[]{false, false};
        }
        List<Integer> list = new ArrayList<>();
        midSearch(root, list);
        boolean f1 = true;
        for (int i = 1; i < list.size(); i++) {
            if (list.get(i) < list.get(i - 1)) {
                f1 = false;
                break;
            }
        }
        boolean f2 = isCompleteTree(root);
        return new boolean[]{f1, f2};
    }
    
    private static boolean isCompleteTree(TreeNode root) {
        // 完全二叉树，除了最后一层，每一层都是满的
        // 层序遍历，当遇到节点为null的时候，队列中剩下的节点必须为叶子节点
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node.left == null) {
                if (node.right != null) return false;
                while (!queue.isEmpty()) {
                    TreeNode temp = queue.poll();
                    if (temp.left != null || temp.right != null) return false;
                }
                return true;
            } else {
                queue.offer(node.left);
            }
            if (node.right == null) {
                while (!queue.isEmpty()) {
                    TreeNode temp = queue.poll();
                    if (temp.left != null || temp.right != null) return false;
                }
                return true;
            } else {
                queue.offer(node.right);
            }
        }
        return true;
    }

    private static void midSearch(TreeNode root, List<Integer> list) {
        if (root == null) return;
        midSearch(root.left, list);
        list.add(root.val);
        midSearch(root.right, list);
    }
}
```

