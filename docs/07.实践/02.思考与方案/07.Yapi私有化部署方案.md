---
title: Yapi私有化部署方案
categories: 
  - Java
  - 思考与方案
  - 平台
tags: 
  - Yapi
  - 私有化部署
  - Docker
author: 
  name: benym
  link: https://github.com/benym
date: 2023-05-14 14:05:43
permalink: /pages/492330/
---
## 背景

作为前文[接口管理平台Yapi-最佳实践](https://cloud.benym.cn/pages/747050/)的补充，本文将给出`Yapi`私有化部署方案的教程

开源代码地址<https://github.com/benym/yapi-deploy>

文件取自`yapi-1.9.3`开源版本

## 部署方式

### 可视化部署

使用官方提供的`yapi-cli`工具，部署 `YApi `平台是非常容易的。执行 `yapi server `启动可视化部署程序，输入相应的配置和点击开始部署，就能完成整个网站的部署。部署完成之后，可按照提示信息，执行 `node/{网站路径/server/app.js} `启动服务器。在浏览器打开指定`url`, 点击登录输入您刚才设置的管理员邮箱，默认密码为 `ymfe.org `登录系统（默认密码可在个人中心修改）。

```bash
npm install -g yapi-cli --registry https://registry.npm.taobao.org
yapi server 
```

### 虚拟机部署

1. 下载本文的`yapi-deploy`项目
2. 拷贝`yapi-virtual`文件夹到宿主机`/`，如拷贝位置不同，需要同步替换`entrypoint.sh`中的`vendors`和`init.lock`路径
3. `cd /yapi-virtual`, 填写`config.json`内`servername`, `user`, `pass `其中`authSource`为`mongodb`自带库，默认通过`admin`授权即可
4. `cd /yapi-virtual/vendors`
5. `npm install --production --registry https://registry.npm.taobao.org`
6. `cd /yapi-virtual`
7. `nohup sh entrypoint.sh > out.txt 2&1 &`

以上7步完成部署

其中`entrypoint.sh`脚本中内容如下

```sh
#!/bin/sh

# yapi初始化后会有一个init.lock文件
lockPath="/yapi-virtual/init.lock"

# 进入yapi项目，如部署机器不同，请修改该路径
cd /yapi-virtual/vendors

# 安装必要包
npm config set registry https://registry.npm.taobao.org/
npm install pm2 -g
npm install -g fs-extra --registry https://registry.npm.taobao.org/
npm install -g safeify

# 如果初始化文件文件存在,则直接运行,否则初始化
if [ ! -f "$lockPath" ]; then
  # 启动Yapi初始化
  pm2 start server/install.js
  pm2 start server/app.js
else
  # 运行yapi管理系统
  pm2 start server/app.js
fi
```

脚本将自动安装`yapi`所需要的依赖，并采用`pm2`进行`yapi`进程后台管理

::: tip

这里之所以需要`pm2`管理，是因为如果直接采用`nohup`等后台运行形式，`yapi`将在用户退出`shell`界面时同时停止运行

:::

### Docker部署

1. 下载本文的`yapi-deploy`项目
2. 拷贝`yapi-deploy`(文件内包含`yapi-virtual`)文件夹到宿主机
3. `cd /yapi-deploy/yapi-virtual`, 填写`config.json`内`servername`, `user`, `pass `其中`authSource`为`mongodb`自带库，默认通过`admin`授权即可
4. `cd /yapi-deploy`
5. `docker build -f Dockerfile -t demoyapi .`
6. `docker run -d --name=yapi -p 3000:3000 demoyapi`

以上6步完成部署

## 附录

`pm2`基本使用

- `pm2 lis`t查看运行中的`nodejs`项目

- `pm2 start`

- `pm2 stop`

- `pm2 delete id`



