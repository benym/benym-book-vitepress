---
title: 二叉搜索树及AVL树详解
date: 2022-01-28 15:42:48
categories:
  - Java
  - 思考与方案
tags: 
  - Java
  - 树
  - 平衡二叉搜索树
  - 二叉搜索树
permalink: /pages/2efaaf/
author: 
  name: benym
  link: https://github.com/benym
---

### 二叉搜索树
#### 特点
二叉搜索树，有如下特点：
 1. 若它的左子树不为空，则左子树上所有的节点值都小于它的根节点值
 2. 若它的右子树不为空，则右子树上所有的节点值均大于它的根节点值
 3. 它的左右子树也分别可以充当为二叉查找树
例如
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree.png/zipstyle" alt="二叉搜索树" style="zoom:60%;" />
:::
#### 优点
二叉搜索树的优点：能够快速找到想要查找的值。
以查找数值为14的节点为例，由于二叉搜索树的特性，我们可以很快找到它，其查找过程如下：
 1. 和根节点9比较
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree2.png/zipstyle" alt="二叉搜索树2" style="zoom:60%;" />
:::

 2. 由于14>9，所以14只可能存在于9的右子树中，因此查看右孩子13
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree3.png/zipstyle" alt="二叉搜索树3" style="zoom:60%;" />
:::

 3. 由于14>13，所以继续查看13的右孩子15
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree4.png/zipstyle" alt="二叉搜索树4" style="zoom:60%;" />
:::

 4. 由于14<15，所以14只可能存在于15的左孩子中，因此查找15的左孩子14
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree5.png/zipstyle" alt="二叉搜索树5" style="zoom:60%;" />
:::

 5. 这时候发现14正是自己查找的值，于是查找结束
这种查找二叉树的方式正是**二分查找**的思想，可以很快的找到目标节点，查找所需的最大次数等于二叉搜索树的高度。
在插入的时候也是一样，通过一层一层的比较，最后找到适合自己的位置。
#### 缺点
二叉搜索树具有什么缺陷呢？
假设初始的二叉搜索树只有三个节点：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree6.png/zipstyle" alt="二叉搜索树6" style="zoom:60%;" />
:::

然后我们按照顺序陆续插入节点4、3、2、1、0。插入之后的结构如下：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree7.png/zipstyle" alt="二叉搜索树7" style="zoom:60%;" />
:::

可以观察到，所有的节点都倾向于一边了，当出现这种情况时，二叉搜索树在查找的性能就大打折扣，几乎变成线性了。
### 平衡二叉搜索树(AVL树)
为了解决二叉搜索树的缺点，平衡二叉树被提出
#### 特点
其具有如下特点：
 1. 具有二叉搜索树的全部特性
 2. 每个节点的左子树和右子树的高度差至多等于1
例如：下图就是一颗AVL树
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree8.png/zipstyle" alt="二叉搜索树8" style="zoom:60%;" />
:::

而这张图中的则不是AVL树(节点右边的数字为节点的高度)
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree9.png/zipstyle" alt="二叉搜索树9" style="zoom:60%;" />
:::

对于上图而言，节点9的左孩子高度为2，而右孩子高度为0，他们之间的差值超过了1。AVL树可以保证不会出现大量节点偏向一边的情况。
#### 左旋和右旋
听起来AVL树还不错，但思考一下，如果我们要插入一个节点3，按照查找二叉树的特性，我们只能把3作为节点4的左子树插进去，可是插进去之后，又会破坏了AVL树的特性，那我们那该怎么弄？
在这之前，先了解一下左旋和右旋的概念。
**右旋:**
我们在进行节点插入的时候，可能会出现节点都倾向于左边的情况，例如
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree10.png/zipstyle" alt="二叉搜索树10" style="zoom:60%;" />
:::

我们把这种倾向于左边的情况称之为**左-左型**。这个时候，我们就可以对节点9进行**右旋操作**，使它恢复平衡。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree11.png/zipstyle" alt="二叉搜索树11" style="zoom:60%;" />
:::

**即：顺时针旋转两个节点，使得父节点被自己的左孩子取代，而自己成为自己的右孩子**
再举个例子：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree12.png/zipstyle" alt="二叉搜索树12" style="zoom:60%;" />
:::

节点4和9高度相差大于1。由于是**左孩子的高度较高**，此时是**左-左型**，进行**右旋**。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree13.png/zipstyle" alt="二叉搜索树13" style="zoom:60%;" />
:::

**这里要注意，节点4的右孩子成为了节点6的左孩子了**
用一个动图示例：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree14.gif/zipstyle" alt="二叉搜索树14gif" style="zoom:100%;" />
:::

**左旋:**
左旋和右旋一样，就是用来解决当大部分节点都偏向右边的时候，通过左旋来还原。例如：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree14.png/zipstyle" alt="二叉搜索树14" style="zoom:60%;" />
:::

我们把这种倾向于右边的情况称之为**右-右型**。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree15.gif/zipstyle" alt="二叉搜索树15gif" style="zoom:100%;" />
:::

#### 详细示例
以一个具体实例详细讲解：
假设二叉树初试状态如下：
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree15.png/zipstyle" alt="二叉搜索树15png" style="zoom:60%;" />
:::

我们逐渐插入如下数值：1，4，5，6，7，10，9，8

插入1
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree16.png/zipstyle" alt="二叉搜索树16png" style="zoom:60%;" />
:::

此时为左-左型，需要右旋调整
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree17.png/zipstyle" alt="二叉搜索树17png" style="zoom:60%;" />
:::

插入4
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree18.png/zipstyle" alt="二叉搜索树18png" style="zoom:60%;" />
:::

继续插入5
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree19.png/zipstyle" alt="二叉搜索树19png" style="zoom:60%;" />
:::

此时为右-右型，需要左旋调整
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree20.png/zipstyle" alt="二叉搜索树20png" style="zoom:60%;" />
:::

继续插入6
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree21.png/zipstyle" alt="二叉搜索树21png" style="zoom:60%;" />
:::

右-右型，需要进行左旋
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree22.png/zipstyle" alt="二叉搜索树22png" style="zoom:60%;" />
:::

继续插入7
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree23.png/zipstyle" alt="二叉搜索树23png" style="zoom:60%;" />
:::

右-右型，需要进行左旋
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree24.png/zipstyle" alt="二叉搜索树24png" style="zoom:60%;" />
:::

继续插入10
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree25.png/zipstyle" alt="二叉搜索树25png" style="zoom:60%;" />
:::

继续插入9
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree26.png/zipstyle" alt="二叉搜索树26png" style="zoom:60%;" />
:::

出现了这种情况应该怎么办呢？对于这种**右-左型**的情况，单单一次左旋或右旋是不行的，下面我们先说说如何处理这种情况。
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree27.png/zipstyle" alt="二叉搜索树27png" style="zoom:60%;" />
:::

这种类型我们把他成为**右-左型**，处理方式是**先对节点10进行右旋把它变成右-右型**
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree28.png/zipstyle" alt="二叉搜索树28png" style="zoom:60%;" />
:::

然后再进行左旋
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree29.png/zipstyle" alt="二叉搜索树29png" style="zoom:60%;" />
:::

所以对这种**右-左型的，我们需要进行一次右旋再左旋**，依次类推，**左-右型需要进行一次左旋再右旋，与右-左型相反**
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree30.png/zipstyle" alt="二叉搜索树30png" style="zoom:60%;" />
:::

回到刚才那道题
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree26.png/zipstyle" alt="二叉搜索树26png" style="zoom:60%;" />
:::

对它进行右旋再左旋
::: center
<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/tree/searchtree31.png/zipstyle" alt="二叉搜索树31png" style="zoom:60%;" />
:::

到此，节点的插入结束
### 总结
在插入的过程中，会出现一下四种情况破坏AVL树的特性，我们可以采取如下相应的旋转。
 1. 左-左型：做右旋。
 2. 右-右型：做左旋。
 3. 左-右型：先做左旋，后做右旋。
 4. 右-左型：先做右旋，再做左旋。
### 代码示例
```java
//定义节点
class AvlNode {
   int data;
   AvlNode lchild;//左孩子
   AvlNode rchild;//右孩子
   int height;//记录节点的高度
}

//在这里定义各种操作
public class AVLTree{
   //计算节点的高度
   static int height(AvlNode T) {
       if (T == null) {
           return -1;
       }else{
           return T.height;
       }
   }

   //左左型，右旋操作
   static AvlNode R_Rotate(AvlNode K2) {
       AvlNode K1;

       //进行旋转
       K1 = K2.lchild;
       K2.lchild = K1.rchild;
       K1.rchild = K2;

       //重新计算节点的高度
       K2.height = Math.max(height(K2.lchild), height(K2.rchild)) + 1;
       K1.height = Math.max(height(K1.lchild), height(K1.rchild)) + 1;

       return K1;
   }

   //进行左旋
   static AvlNode L_Rotate(AvlNode K2) {
       AvlNode K1;

       K1 = K2.rchild;
       K2.rchild = K1.lchild;
       K1.lchild = K2;

       //重新计算高度
       K2.height = Math.max(height(K2.lchild), height(K2.rchild)) + 1;
       K1.height = Math.max(height(K1.lchild), height(K1.rchild)) + 1;

       return K1;
   }

   //左-右型，进行右旋，再左旋
   static AvlNode R_L_Rotate(AvlNode K3) {
       //先对其孩子进行左旋
       K3.lchild = R_Rotate(K3.lchild);
       //再进行右旋
       return L_Rotate(K3);
   }

   //右-左型，先进行左旋，再右旋
   static AvlNode L_R_Rotate(AvlNode K3) {
       //先对孩子进行左旋
       K3.rchild = L_Rotate(K3.rchild);
       //在右旋
       return R_Rotate(K3);
   }

   //插入数值操作
   static AvlNode insert(int data, AvlNode T) {
       if (T == null) {
           T = new AvlNode();
           T.data = data;
           T.lchild = T.rchild = null;
       } else if(data < T.data) {
           //向左孩子递归插入
           T.lchild = insert(data, T.lchild);
           //进行调整操作
           //如果左孩子的高度比右孩子大2
           if (height(T.lchild) - height(T.rchild) == 2) {
               //左-左型
               if (data < T.lchild.data) {
                   T = R_Rotate(T);
               } else {
                   //左-右型
                   T = R_L_Rotate(T);
               }
           }
       } else if (data > T.data) {
           T.rchild = insert(data, T.rchild);
           //进行调整
           //右孩子比左孩子高度大2
           if(height(T.rchild) - height(T.lchild) == 2)
               //右-右型
               if (data > T.rchild.data) {
                   T = L_Rotate(T);
               } else {
                   T = L_R_Rotate(T);
               }
       }
       //否则，这个节点已经在书上存在了，我们什么也不做
       
       //重新计算T的高度
       T.height = Math.max(height(T.lchild), height(T.rchild)) + 1;
       return T;
   }
}
```