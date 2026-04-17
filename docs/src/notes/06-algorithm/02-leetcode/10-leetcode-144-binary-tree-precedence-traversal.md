---
title: LeetCode-144-二叉树的前序遍历
date: 2020-05-13 13:01:06
description: 二叉树的前序遍历
tags: 
  - 树
  - BFS
  - Java
  - Medium
keywords: 树,BFS,Java,Medium
permalink: /pages/b03f05/
categories: 
  - 算法
  - LeetCode
author: benym
---

# LeetCode-144-二叉树的前序遍历

## 题目

给定一个二叉树，返回它的 *前序* 遍历。

相关链接：

1. [LeetCode-144-二叉树的前序遍历](./10-leetcode-144-binary-tree-precedence-traversal)
2. [LeetCode-94-二叉树的中序遍历](./11-leetcode-94-mid-order-traversal-of-a-binary-tree)
3. [LeetCode-145-二叉树的后序遍历](./12-leetcode-145-binary-tree-posterior-traversal)

**示例 1:**

```
输入: [1,null,2,3]
   1
    \
     2
    /
   3

输出: [1,2,3]
```

## 解题思路

二叉树的遍历问题都有2种解法，一种是递归，一种是迭代

递归：添加根节点，开启左子树递归，开启右子树递归

迭代：使用Queue或者Stack，先添加根节点，弹出根节点，添加右子树，再添加左子树
## Java代码(递归)

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
    public List<Integer> preorderTraversal(TreeNode root) {
        if(root==null) return res;
        BFS(root);
        return res;
    }
    public void BFS(TreeNode root){
        if(root!=null){
            res.add(root.val);
            BFS(root.left);
            BFS(root.right);
        }
    }
}
```

## Java代码(迭代Stack)

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
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        if (root == null) return res;
        
        Deque<TreeNode> stack = new ArrayDeque<>();
        stack.push(root);
        
        while (!stack.isEmpty()) {
            TreeNode node = stack.pop();
            res.add(node.val);
            
            // 注意：先压入右子节点，再压入左子节点
            // 这样左子节点会先出栈，符合前序遍历的顺序
            if (node.right != null) {
                stack.push(node.right);
            }
            if (node.left != null) {
                stack.push(node.left);
            }
        }
        return res;
    }
}
```
