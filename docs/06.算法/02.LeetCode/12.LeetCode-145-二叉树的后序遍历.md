---
title: LeetCode-145-二叉树的后序遍历
date: 2020-05-13 15:05:04
description: 二叉树的后序遍历
tags: 
  - 树
  - BFS
  - Java
  - Hard
keywords: 树,DFS,Java,Hard
permalink: /pages/bc617d/
categories: 
  - 算法
  - LeetCode
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-145-二叉树的后序遍历

给定一个二叉树，返回它的 *后序* 遍历。

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

输出: [3,2,1]
```

### 解题思路

二叉树的遍历问题都有2种解法，一种是递归，一种是迭代

递归：开启左子树递归，开启右子树递归，添加根节点

迭代：后序遍历的方式是左右根，前序遍历是根左右，如果用Stack来实现根左右，那么左边先加入就会后出，右边后加入会先出，于是看似是add(left)之后add(right)，实际上会先访问到right再访问left，从而实现前序遍历得到根右左，即后序遍历的倒序，之后将列表倒序就是后序遍历的结果

迭代模拟：严格按照后序遍历的左右根访问，代码整体与中序遍历很相似，但需要注意其中两个点。

思想来源于[这里](https://leetcode-cn.com/problems/binary-tree-postorder-traversal/solution/di-gui-die-dai-qu-qiao-san-chong-fang-fa-quan-jie-/)

第一，stack.peek()只是取出栈顶元素，要和stack.pop()弹出栈顶元素区分开来；

第二，变量last用于保存当前栈顶所弹出的元素，判断 curr.right == last 是为了避免重复访问同一个元素而陷入死循环当中

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
    public List<Integer> postorderTraversal(TreeNode root) {
        if(root==null) return res;
        helper(root);
        return res;
    }
    public void helper(TreeNode root){
        if(root==null) return;
        helper(root.left);
        helper(root.right);
        res.add(root.val);
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
    public List<Integer> postorderTraversal(TreeNode root) {
        LinkedList<Integer> res = new LinkedList<>();
        Stack<TreeNode> stack = new Stack<>(); // Stack实现根右左
        if(root==null) return res;
        stack.add(root);
        while(!stack.isEmpty()){
            TreeNode temp = stack.pop();
            res.addFirst(temp.val); // 添加到头部，实现倒序
            if(temp.left!=null)
                stack.add(temp.left);
            if(temp.right!=null)
                stack.add(temp.right);
        }
        return res;
    }
}
```

### Java代码(迭代模拟)

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
    public List<Integer> postorderTraversal(TreeNode root) {
        List<Integer> res = new LinkedList<>();
        Stack<TreeNode> stack = new Stack<>();
        TreeNode curr = root;
        TreeNode last = null;
        while (curr != null || !stack.isEmpty()) {
            while (curr != null) {
                stack.push(curr);
                curr = curr.left;
            }
            curr = stack.peek();
            if (curr.right == null || curr.right == last) {
                res.add(curr.val);
                stack.pop();
                last = curr;
                curr = null;
            } else {
                curr = curr.right;
            }
        }
        return res;
    }
}
```
