---
title: Python的__name__ = '__main__' 的作用
date: 2018-07-24 11:05:44
categories: 
  - Python-基础
tags: 
  - Python基础
permalink: /pages/f09b25/
author: 
  name: benym
  link: https://github.com/benym
---

# Python的__name__ = '__main__' 的作用

## 代码

```python
__name__ = '__main__' 的作用
先写一个模块：

#module.py
def main():
  print "we are in %s"%__name__
if __name__ == '__main__':
  main()
```

我们经常看到想上面代码底下的代码，其主要的意义在于：

### **让你写的脚本即可以导入别的模块中用，另外该模块自己也可以执行**

这个函数定义了一个main函数，我们执行一下该py文件发现结果是打印出”we are in __main__“,说明我们的if语句中的内容被执行了，调用了main()：

但是如果我们从另我一个模块导入该模块，并调用一次main()函数会是怎样的结果呢？

其执行的结果是：we are in module

但是没有显示

```
”we are in __main__“
```

,也就是说模块

```
__name__ = '__main__' 
```

下面的函数没有执行。

这样既可以让“模块”文件运行，也可以被其他模块引入，而且不会执行函数2次。这才是关键。



## 总结

```bash
如果我们是直接执行某个.py文件的时候，
该文件中那么”__name__ == '__main__'“是True,
但是我们如果从另外一个.py文件通过import导入该文件的时候，
这时__name__的值就是我们这个py文件的名字而不是__main__。
这个功能还有一个用处：调试代码的时候，在”if __name__ == '__main__'“
中加入一些我们的调试代码，我们可以让外部模块调用的时候不执行
我们的调试代码，但是如果我们想排查问题的时候，
直接执行该模块文件，调试代码能够正常运行！
```
