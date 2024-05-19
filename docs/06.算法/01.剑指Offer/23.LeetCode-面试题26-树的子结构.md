---
title: LeetCode-面试题26-树的子结构
date: 2020-04-20 13:33:50
description: 树的子结构
tags: 
  - 树
  - Python
  - Java
  - Medium
  - 剑指Offer
keywords: 树,Java,Python,Medium,剑指Offer
permalink: /pages/022144/
article: true
categories: 
  - 算法
  - 剑指Offer
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-面试题26-树的子结构

输入两棵二叉树A和B，判断B是不是A的子结构。(约定空树不是任意一个树的子结构)

B是A的子结构， 即 A中有出现和B相同的结构和节点值。

例如:
给定的树 A:
```
     3
    / \
   4   5
  / \
 1   2
```
给定的树 B：
```
   4 
  /
 1
```
返回 true，因为 B 与 A 的一个子树拥有相同的结构和节点值。

 <!--more-->

**示例1：**

```
输入：A = [1,2,3], B = [3,1]
输出：false
```

**示例2：**

```
输入：A = [3,4,5,1,2], B = [4,1]
输出：true
```

**限制：**

`0 <= 节点个数 <= 10000`

### 解题思路

首先需要判断A和B根节点是否相同，如果相同则开启子树的匹配，如果不相同则需要判断A树的左右节点是否和B树根节点相同，再判断子树结构。

子树的判断用递归的思路来考虑，如果传入的A的根节点和B的根节点值不相同，则以A的根节点开始的子树肯定没有B子树相同的节点。如果他们的值是相同的则需要递归考虑，它们各自的左右节点的值是不是相同。

递归的终止条件是到达了树A或者树B的叶子节点，当树B的叶子节点为空的时候说明，B子树已经遍历完了，A包含B。而当A的叶子节点为空时，说明遍历完A也没有找到B子树，A不包含B

### Java代码

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
    public boolean isSubStructure(TreeNode A, TreeNode B) {
        boolean result = false;
        if(A!=null&&B!=null){
            if(A.val==B.val)
                result = isSubTree(A,B);
            if(!result)
                result = isSubStructure(A.left,B);
            if(!result)
                result = isSubStructure(A.right,B);
        }
        return result;
    }

    public boolean isSubTree(TreeNode root1,TreeNode root2){
        if(root2==null)
            return true;
        if(root1==null)
            return false;
        if(root1.val!=root2.val)
            return false;
        return isSubTree(root1.left,root2.left)&&isSubTree(root1.right,root2.right);
    }
}
```

### Python代码

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution:
    def isSubStructure(self, A: TreeNode, B: TreeNode) -> bool:
        result = False
        if A and B:
            if A.val==B.val:
                result = self.helper(A,B)
            if not result:
                result = self.isSubStructure(A.left,B)
            if not result:
                result = self.isSubStructure(A.right,B)
        return result

    def helper(self,A:TreeNode,B:TreeNode)->bool:
        if not B: return True
        if not A: return False
        if A.val!=B.val: return False
        return self.helper(A.left,B.left) and self.helper(A.right,B.right)
```

