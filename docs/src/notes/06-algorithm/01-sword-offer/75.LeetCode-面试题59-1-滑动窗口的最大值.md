---
title: LeetCode-面试题59-1-滑动窗口的最大值
date: 2020-05-19 15:13:10
description: 滑动窗口的最大值
tags: 
  - 数组
  - 滑动窗口
  - Java
  - Hard
  - 剑指Offer
keywords: 数组,Java,滑动窗口,Hard,剑指Offer
permalink: /pages/e91bb1/
article: true
categories: 
  - 算法
  - 剑指Offer
author: 
  name: benym
  link: https://github.com/benym
---

## LeetCode-面试题59-1-滑动窗口的最大值

给定一个数组 `nums` 和滑动窗口的大小 `k`，请找出所有滑动窗口里的最大值。

 <!--more-->

**示例：**

```
输入: nums = [1,3,-1,-3,5,3,6,7], 和 k = 3
输出: [3,3,5,5,6,7] 
解释: 

  滑动窗口的位置                最大值
---------------               -----
[1  3  -1] -3  5  3  6  7       3
 1 [3  -1  -3] 5  3  6  7       3
 1  3 [-1  -3  5] 3  6  7       5
 1  3  -1 [-3  5  3] 6  7       5
 1  3  -1  -3 [5  3  6] 7       6
 1  3  -1  -3  5 [3  6  7]      7
```

**提示：**

你可以假设 *k* 总是有效的，在输入数组不为空的情况下，1 ≤ k ≤ 输入数组的大小。

### 解题思路1

常规的想法是滑动一次窗口遍历一次窗口值，返回最大值，但这样的时间复杂度是O(nk)

双端队列：

把有可能成为滑动窗口最大值的数字存入双端队列中，最大值始终放在队列头部

对于前k个数值，当队列不为空的情况下，如果当前遍历的元素要>=队列尾部元素，则说明队列尾部的值不可能是最大值，弹出队列尾部，添加当前值

对于[k,nums.length]区间的数值，需要判断队列中的值是否仍然在滑动窗口内部，如果不在内部需要弹出队列头部。如果当前遍历的元素要>=队列尾部元素，则说明队列尾部的值不可能是最大值，弹出队列尾部。遍历时恒添加当前元素到末尾。

为了便于判断队列头部是否还在滑动窗口内部，队列存储的并非是真正的元素，而是元素在数组中的下标

### 解题思路2

三指针：

当初始化时，首先直接遍历找到当前窗口的最大值，并记录位置。当移动左右指针时，判断最大值是否因为移动左指针，而不在窗口内了，不在窗口内则重新遍历。如果在窗口内，则只需要判断右指针新进来的数值是否比窗口内最大值大，谁大就作为当前窗口内的最大值下标

### Java代码

```java
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        List<Integer> res = new LinkedList<>();
        if (nums.length >= k && k >= 1) {
            Deque<Integer> deque = new LinkedList<>();
            // 前k个
            for (int i = 0; i < k; i++) {
                // 队列不为空，且当前元素>=队列尾部，则尾部不可能是最大值，弹出
                while (!deque.isEmpty() && nums[i] >= nums[deque.getLast()])
                    deque.removeLast();
                deque.addLast(i);
            }
            // k到末尾个
            for (int i = k; i < nums.length; i++) {
                // 添加最大值
                res.add(nums[deque.getFirst()]);
                // 队列不为空，且当前元素>=队列尾部，则尾部不可能是最大值，弹出
                while (!deque.isEmpty() && nums[i] >= nums[deque.getLast()])
                    deque.removeLast();
                // 判断队列头部是否还在滑动窗口内，如果当前处理元素的下标i减去窗口大小k>=队列头部下标
                // 说明头部不在滑动窗口内，需要弹出
                if (!deque.isEmpty() && deque.getFirst() <= (i - k))
                    deque.removeFirst();
                deque.addLast(i);
            }
            // 添加最后一个滑动窗口的最大值
            res.add(nums[deque.getFirst()]);
        }
        return res.stream().mapToInt(Integer::intValue).toArray();
    }
}
```

### Python代码

```python
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        if not nums or k == 0: return []
        deque = collections.deque()
        for i in range(k):
            while deque and deque[-1] < nums[i]: deque.pop()
            deque.append(nums[i])
        res = [deque[0]]
        for i in range(k, len(nums)):
            if deque[0] == nums[i - k]: deque.popleft()
            while deque and deque[-1] < nums[i]: deque.pop()
            deque.append(nums[i])
            res.append(deque[0])
        return res
```

### Java代码2

```java
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        if (nums == null || nums.length == 0) {
            return new int[0];
        }
        if (nums.length == 1) {
            return nums;
        }
        int[] res = new int[nums.length + 1 - k];
        // 窗口起始位置
        int left = 0;
        // 窗口结束位置
        int right = k - 1;
        // 记录最大值的位置
        int maxIndex = 0;
        // 结果位置
        int j = 0;
        while (right < nums.length) {
            // 当初始化时，首先直接遍历找到当前窗口的最大值，并记录位置
            // 当移动左右指针时，判断最大值是否因为移动左指针，而不在窗口内了，不在窗口内则重新遍历
            // 如果在窗口内，则只需要判断右指针新进来的数值是否比窗口内最大值大，谁大就作为当前窗口内的最大值下标
            if (left > maxIndex || left == 0) {
                maxIndex = left;
                for (int i = left; i <= right; i++) {
                    maxIndex = nums[i] > nums[maxIndex] ? i : maxIndex;
                }
            } else {
                maxIndex = nums[right] > nums[maxIndex] ? right : maxIndex;
            }
            res[j++] = nums[maxIndex];
            left++;
            right++;
        }
        return res;
    }
}
```
