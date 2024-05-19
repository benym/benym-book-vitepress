---
title: 接口管理平台Yapi-最佳实践
categories: 
  - Java
  - 思考与方案
  - 平台
tags: 
  - 接口管理
  - Yapi
author: 
  name: benym
  link: https://github.com/benym
date: 2023-05-13 17:04:53
permalink: /pages/747050/
---

## 背景
在开发人员开发过程中，与各方交接(前端、后端、测试、第三方平台)往往会有提供接口文档的需要

在没有在线文档应用的情况下，传统的书写`md`或`word`，难以简单高效的完成编写文档工作，且面临着一次修改，重新导出、上传等问题

`Yapi`是目前最出色的开源接口管理平台之一，`Apache Lisence`，提供了在线的接口文档管理平台、高级`Mock`等工具，解放文档编写时间。

配合`Easy-Yapi`插件可实现**无侵入式接口文档生成**

## 现有产品对比

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-back.png)

:::

与现有产品相比Yapi具有如下优点

1. 几乎没有学习成本，**私有化部署**
2. **支持在线编辑**
3. 支持`Postman`接口导入(仅支持V1)
4. 支持`ApiFox` 、`Swagger`接口导入
5. 支持在线抓包导入
6. 支持`Swagger2.0`格式导入、自动同步
7. **配合EasyYapi idea插件零侵入式导入Controller，无需swagger注解**
8. **配合EasyYapi idea插件支持导入RPC接口**
9. **配合EasyYapi idea插件支持导出MarkDown、JSON、Postman格式文档**
10. **支持权限分层、多项目隔离**

## 基本使用

### 主页面

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-1.png)

:::

### 最佳实践-配合EasyYapi插件

首先在`IDEA`中下载`EasyYapi`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-2.png)

:::

之后在任意`Java`类中点击右键，便会出现对应功能

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-3.png)

:::

#### 导出Controller到Yapi

前往任意`Controller`类中，点击`Export Yapi`

输入`Yapi`在线地址中，对应项目的`token`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-4.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-5.png)

:::

输入之后，此时控制台显示导出成功

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-6.png)

:::

前往在线地址观察结果

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-7.png)

:::

`EasyYap`i原理是识别`Java doc`来创建生成的接口，上述的导出`Controller`没有写任何注释，则导出时不会自动加上备注

如`Controller`等接口上有`Java doc`注释，则导出时加上备注，用例如下

当`Controller上`有`Java doc`时，导出则会产生备注

如下，**该注释为idea输入/\**+回车时自动生成，无需额外配置，也不需要Swagger注解**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-8.png)

:::

对应实体仅需**按照开发规范书写Java doc**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-9.png)

:::

此时，生成的`Yapi`文档为

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-10.png)

:::

#### 导出RPC到Yapi

**导出RPC接口，插件是默认关闭的，需要打开Settings中的开关**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-11.png)

:::

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/yapi/yapi-12.png)

:::

这里导出时默认会以`RPC`接口的名字为导出项目，比如此时导出项目为`contractapi`，如果你的项目名和`api`名不一致则会提示你输入另外的`token`(识别为2个项目)

如果想要将`RPC`接口导出到同项目名的地方，加上`@module`指定导出项目名即可。

如果你不想每次都书写该`doc`，**可以指定创建interface时的IDEA模版生成**，和创建时增加作者名、创建时间同理。

#### 导出为MarkDown及Postman JSON

在右键菜单选择即可

### 更多操作

更多关于`EasyYapi`可识别的`Java doc`可查看[官网教程](http://easyyapi.com/documents/index.html)

其实有`EasyYapi`后续的内容都是可以抛弃的了，但为了全面介绍，后续支持的操作也在这里列出来相关链接

#### 从Postman导入Yapi

[点击这里](https://blog.csdn.net/qq_42374233/article/details/111307663)

#### 从Swagger导入Yapi

这个教程写的比较全，但容易乱，总结就2步

1. 从`http://服务域名/v2/api-docs`中获取`Swagger Json`

2. 将`Json`导入到`Yapi`即可

[点击这里](https://cloud.tencent.com/developer/article/1618493)

#### 从ApiFox导入Yapi

同理，导出的请求为`Swagger2.0`格式即可

