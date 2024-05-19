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
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-144-二叉树的前序遍历

给定一个二叉树，返回它的 *前序* 遍历。

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

输出: [1,2,3]
```

### 解题思路

二叉树的遍历问题都有2种解法，一种是递归，一种是迭代

递归：添加根节点，开启左子树递归，开启右子树递归

迭代：前序遍历一般等同于BFS，一般用Queue来实现，先进先出，层序遍历即可。

不过奇怪的是这个题跑不过测试用例.......只能换成栈来做，也就是调整一下加入顺序，需要先添加右子树，再添加左子树，由于pop是后进先出，所以弹出的顺序变为了先弹出左子树，再是右子树，变成了Queue的先进先出的样子

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

### Java代码(迭代Queue)

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
        if(root==null) return res;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while(!queue.isEmpty()){
            TreeNode temp = queue.poll();
            res.add(temp.val);
            if(temp.left!=null)
                queue.add(temp.left);
            if(temp.right!=null)
                queue.add(temp.right);
        }
        return res;
    }
}
```

### Java代码(迭代Stack)

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
        if(root==null) return res;
        Stack<TreeNode> stack = new Stack<>();
        stack.add(root);
        while(!stack.isEmpty()){
            TreeNode temp = stack.pop();
            res.add(temp.val);
            if(temp.right!=null)
                stack.add(temp.right);
            if(temp.left!=null)
                stack.add(temp.left);
        }
        return res;
    }
}
```
