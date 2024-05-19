---
title: 关于DO,VO,DTO,QueryParam的思考
date: 2021-08-10 17:51:47
description: Java接口规范化思考
categories:
  - Java
  - 思考与方案
tags: 
  - SpringBoot
  - Java
keywords: SpringBoot,Java
permalink: /pages/45617b/
author: 
  name: benym
  link: https://github.com/benym
---

## 关于DO,VO,DTO,QueryParam的思考

总结一下最近项目中的一些问题

**DO**（Domain Object）：领域对象，就是从现实世界中抽象出来的有形或无形的业务实体。

> 在项目中Do的作用域用于真正操作数据库的Dao层实现类中。

**VO**（View Object）：视图对象，用于前端展示层，它的作用是把某个指定页面（或组件）的所有数据封装起来

> 在项目中涉及到-----新增、删除、修改等操作时，作为后端Controller接口的入参对象。当针对的查询语句时，可以将查询的VO对象单独定义一个，用QueryParam作为查询对象，与基本的VO区别开来

**DTO**（Data Transfer Object）：数据传输对象，主要用于外部接口参数传递封装，接口与接口进行传递使用

> 在项目中接口和接口间常常需要获取大量参数，DTO就是将这些参数封装成为一个对象，简化参数的直接传递

 <!--more-->

### 实际例子

下面用一个实际的例子展示上述几个对象在具体的开发中的作用域

本文的项目结构为如下
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/%E9%A1%B9%E7%9B%AE%E7%BB%93%E6%9E%84.png)
:::
以一个简单的数据库为例，数据库中包含id、name、address、ctime、state五种字段，分别表示用户的id，名字，地址，数据创建事件，状态。

#### POJO类设计

与之对应的DO、DTO、VO、QueryParam如下

**DO**：设计上需要包含所有数据库字段

```java
package com.test.understand.pojo.domain;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

@Data
@TableName("test")
public class TestDataDO {
    @TableId
    private Integer id;

    @TableField("name")
    private String name;

    @TableField("address")
    private String location;

    @TableField(value = "ctime",fill = FieldFill.INSERT)
    private Date creatTime;

    @TableField("state")
    private Byte state;
}
```

**DTO**：用于接口间的传输，可以不同于DO传递接口间需要的参数，本文DTO和DO一致

```java
package com.test.understand.pojo.dto;
import java.util.Date;
import lombok.Data;

@Data
public class TestDataDTO {

    private Integer id;

    private String name;

    private String location;

    private Date creatTime;

    private Byte state;
}
```

**VO**：用于页面展示，不同于DO，有些数据库字段是不必要展示的，VO可以抛弃这些字段，如本文中的id或ctime等

```java
package com.test.understand.pojo.vo;

import lombok.Data;

@Data
public class TestDataVO {
    private String name;

    private String location;

    private Byte state;
}
```

**QueryParam**：为了查询参数专门封装的类对象，可包含查询相关字段

```java
package com.test.understand.pojo.query;

import lombok.Data;

@Data
public class TestDataQueryParam {
    
    private Integer id; 
    
    private String name;

    private String location;

    private Byte state;
}
```

#### Controller

以最简单的增删改查为例。我们规定前端传输为JSON，对于增加、修改和删除来说，入参统一接收为VO对象。对于查询操作，我们规定入参统一为QueryParam对象。如下图红框所示：
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/%E8%A7%84%E5%AE%9A%E5%85%A5%E5%8F%82.png)
:::
##### 类型转换

首先讲解`saveOrUpdate`方法和`deleteTestData`方法。

在这两个方法中，VO对象进入到Controller之后需要转化为DTO对象，因为后续他将经过`Service-->ServiceImpl-->Dao-->DaoImpl`，即接口之间的传输，其作用域在Controller进入之后到Mapper操作数据库之前。

转化的过程也很简单，可以利用spring提供的BeanUtils.copyProperites快速的将VO中的属性赋值给DTO对象，避免一堆set方法赋值的麻烦。

saveOrUpdate方法：
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/saveorupdate.png)
:::
deleteTestData方法：
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/delete.png)
:::
对于`getTestDataLocation`方法其入参QueryParam进入Controller之后无需转换，因为其包含查询字段，可直接通过`Service-->ServiceImpl-->Dao-->DaoImpl`传递。其作用域在Controller进入之后到Mapper操作完数据库之后的整个阶段。

getTestDataLocation方法：
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/getlist.png)
:::
#### Service层

在service和serviceImpl层中，**对DTO对象和QueryParam对象无需做对象类型转化**
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/Service.png)
:::
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/ServiceImpl.png)
:::
#### Dao层

在Dao和DaoImpl的入参定义中，DTO和QueryParam统一不需要转换对象，因为还是接口之间的参数传递，但在DaoImpl中，**操作数据库之前，需要将DTO对象转化为DO对象**，而QueryParam可以选择用QueryWapper等包装类或者直接传输的方式交给Mapper操作。如下图红框所示
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/Dao.png)
:::
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/DaoImpl.png)
:::
#### Mapper层

mapper层用于真正操作数据库，这里采用Mybatis-plus中的BaseMapper提供的接口实现增删改，查询则通过Location查数据，重写一下对应的mapper.xml文件的sql即可
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/mapper.png)
:::
#### 数据返回

增加删除修改等操作，前端往往只需要判断操作成功没有即可，所以返回值一般不是一个对象，对于非对象的传输可以直接返回。另外如查询操作，一般会涉及到分页，查出来的数据是List形式展现而从数据库查到的是DO对象，当这种操作返回值时会从`Mapper-->Dao-->Service-->Controller`一层一层返回回去，这时候就又变成了接口之间的参数传输了，DO对象显然不适合，所以还需转化为DTO对象。如下图红框操作所示，从DO的list转化为DTO的list作为返回值列表。
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/DOtoDTO.png)
:::
在返回值到达Controller之后，由于需要展示给前端，DTO对象还需要转化为VO对象
::: center
![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/DTOtoVO.png)
:::
### 总结

1. 除QueryParam以外，VO对象进入Controller之后需要进行对象转换变为DTO方便数据在接口中间的传递
2. 在数据库操作之前，DTO对象需要转换为DO
3. 在返回值的过程中，数据库返回的对象除基本类型之外需要转为DTO传递
4. 在返回值回到Controller时，需要将DTO对象转换为VO对象，从而返回给前端