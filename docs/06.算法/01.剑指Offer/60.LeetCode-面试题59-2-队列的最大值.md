---
title: LeetCode-面试题59-2-队列的最大值
date: 2020-05-19 16:39:45
description: 队列的最大值
tags: 
  - 队列
  - Java
  - Medium
  - 剑指Offer
keywords: 队列,Java,Medium,剑指Offer
permalink: /pages/0c523d/
article: true
categories: 
  - 算法
  - 剑指Offer
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-面试题59-2-队列的最大值

请定义一个队列并实现函数 max_value 得到队列里的最大值，要求函数max_value、push_back 和 pop_front 的均摊时间复杂度都是O(1)。

若队列为空，pop_front 和 max_value 需要返回 -1

 <!--more-->

**示例1：**

```
输入: 
["MaxQueue","push_back","push_back","max_value","pop_front","max_value"]
[[],[1],[2],[],[],[]]
输出: [null,null,null,2,1,2]
```

**示例2:**

```
输入: 
["MaxQueue","pop_front","max_value"]
[[],[],[]]
输出: [null,-1,-1]
```

**限制：**

- `1 <= push_back,pop_front,max_value的总操作数 <= 10000`
- `1 <= value <= 10^5`

### 解题思路

双队列：

利用一个队列Queue存储原本的数据，一个双端队列Deque存储最大值

两个队列联合实现一个MaxQueue

- 当新的值大于deque的尾部的值时，小的值都应该从deque尾部删去，添加大的值到尾部；同时queue实现常规的数值添加。这样保证了deque首位始终存储的是当前队列最大值
- 当需要取得队列中的最大值时，如果deque为空，根据题意返回-1，如果不为空则取得最大值(不从双端队列中删除)
- 当需要弹出队列首位时，需要判断原本的队列是否为空，为空则返回-1，不为空则需要判断出队的元素是否是当前最大值，如果是最大值，则原本的队列最大值出队了，deque中的最大值自然也不存在了，需要弹出首位。此时返回原本队列的首位即可

### Java代码

```java
class MaxQueue {
    Deque<Integer> deque;
    Queue<Integer> queue;
    public MaxQueue() {
        deque = new LinkedList<>();
        queue = new LinkedList<>();
    }
    
    public int max_value() {
        if(deque.isEmpty())
            return -1;
        return deque.getFirst();
    }
    
    public void push_back(int value) {
        // 保证deque里面放的是最大值
        while(!deque.isEmpty() && deque.getLast()<value)
            deque.removeLast();
        deque.addLast(value);
        queue.offer(value);
    }
    
    public int pop_front() {
        if(queue.isEmpty())
            return -1;
        // 如果出队的元素是当前最大值，则deque也要出队
        int temp = queue.poll();
        if(deque.getFirst()==temp)
            deque.removeFirst();
        return temp;
    }
}

/**
 * Your MaxQueue object will be instantiated and called as such:
 * MaxQueue obj = new MaxQueue();
 * int param_1 = obj.max_value();
 * obj.push_back(value);
 * int param_3 = obj.pop_front();
 */
```

### Java代码2

注释版
```java
class MaxQueue {

    // 数据队列
    private Queue<Integer> dataStack;

    // 最大值双端队列
    private Deque<Integer> maxStack;

    public MaxQueue() {
        this.dataStack = new LinkedList<>();
        this.maxStack = new ArrayDeque<>();
    }

    public int max_value() {
        // 最大值队列为空返回-1，否则返回最先的最大值
        return this.maxStack.isEmpty() ? -1 : this.maxStack.peekFirst();
    }

    public void push_back(int value) {
        // 数据队列添加数据
        this.dataStack.offer(value);
        // 当最大值队列不为空时，循环判断数据是否比双端队列最后要大，如果是就弹出
        while (!this.maxStack.isEmpty() && this.maxStack.peekLast() < value) {
            this.maxStack.pollLast();
        }
        // 更新或新增当前值到最大值队列尾部
        this.maxStack.offerLast(value);
    }

    public int pop_front() {
        // 当数据队列不为空时，判断要弹出的数据是否等于最大值队列的首个，因为队列首是最先添加的最大值
        if (!this.dataStack.isEmpty()) {
            int res = this.dataStack.poll();
            // 如果等于则同步移除最大值队列中的元素
            if (this.maxStack.peekFirst() == res) {
                this.maxStack.pollFirst();
            }
            return res;
        } else {
            // 数据队列为空返回-1
            return -1;
        }
    }
}
```


