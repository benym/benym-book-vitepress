---
title: LeetCode-94-二叉树的中序遍历
date: 2020-05-13 11:01:06
description: 二叉树的中序遍历
tags: 
  - 树
  - DFS
  - Java
  - Medium
keywords: 树,DFS,Java,Medium
permalink: /pages/4517f3/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-94-二叉树的中序遍历

给定一个二叉树，返回它的*中序* 遍历。

相关链接：

1. [LeetCode-144-二叉树的前序遍历](https://cloud.benym.cn/benym-book/pages/3fd3f6/)
2. [LeetCode-94-二叉树的中序遍历](https://cloud.benym.cn/benym-book/pages/4517f3/#leetcode-94-%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E4%B8%AD%E5%BA%8F%E9%81%8D%E5%8E%86)
3. [LeetCode-145-二叉树的后序遍历](https://cloud.benym.cn/benym-book/pages/bc617d/#leetcode-145-%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E5%90%8E%E5%BA%8F%E9%81%8D%E5%8E%86)

<!--more-->

**示例 1:**

```
输入: [1,null,2,3]
   1
    \
     2
    /
   3

输出: [1,3,2]
```

### 解题思路

二叉树的遍历问题都有2种解法，一种是递归，一种是迭代

递归：开启左子树递归，添加根节点，开启右子树递归

迭代：中序遍历一般等同于DFS，用Stack来实现，后进先出。迭代是先把左子树全部添加进Stack中，然后弹出一个尾部，获得对应的val之后遍历右子树，在添加左子树的时候同时也添加了根节点，所以pop弹出时再添加val实际上会对左子树和左子树的根节点进行操作

### Java代码(递归)

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) { val = x; }
 * }
 */
class Solution {
    List<Integer> res = new ArrayList<>();
    public List<Integer> inorderTraversal(TreeNode root) {
        DFS(root);
        return res;
    }
    public void DFS(TreeNode root){
        if(root==null) return;
        DFS(root.left);
        res.add(root.val);
        DFS(root.right);
    }
}
```

### Java代码(迭代)

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) { val = x; }
 * }
 */
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
    	List<Integer> res = new ArrayList<>();
        Stack<TreeNode> stack = new Stack<>();
        TreeNode node = root;
        while(node!=null||!stack.isEmpty()){
            while(node!=null){
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            res.add(node.val);
            node = node.right;
        }
        return res;
    }
}
```
