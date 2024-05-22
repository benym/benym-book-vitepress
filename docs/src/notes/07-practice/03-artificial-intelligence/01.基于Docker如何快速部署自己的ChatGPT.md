---
title: 基于Docker如何快速部署自己的ChatGPT
description: chatgpt部署
categories: 
  - AI人工智能
tags: 
  - AI
  - LLM
  - ChatGPT
  - 部署
  - Docker
keywords: AI,LLM,ChatGPT,部署,Docker
author: 
  name: benym
  link: https://github.com/benym
date: 2023-03-26 15:36:44
permalink: /pages/859608/
---

## 背景

随着OpenAI在2022年底发布的LLM模型-ChatGPT展现出的强大效果，ChatGPT无疑成为了当下炙手可热的明星模型。

现有的基于GPT的开源项目已经非常多，本文以现有的高热度github开源项目[chatgpt-web](https://github.com/Chanzhaoyu/chatgpt-web)为例![star](https://img.shields.io/github/stars/Chanzhaoyu/chatgpt-web?style=social)![docker](https://img.shields.io/docker/pulls/chenzhaoyu94/chatgpt-web)，教大家简单快速地搭建属于自己的ChatGPT。

## ChatGPT-Web

chatgpt-web项目中的部署教程已经非常完整，本文不再过多解释。

仅以Docker部署为例

前置条件

- 本地或者服务器应该具有Docker环境
- 具有ChatGPT帐号

以token模式为例，请求chatgpt web版本，免费但稍微具有延迟

**Step1. 找到你帐号的token**

点击<https://chat.openai.com/api/auth/session>，获取你帐号的token，并记录他

**Step2. 运行docker**

按需配置访问Web页面的密码，Token、超时等信息

```bash
docker run --name chatgpt-web -d -p 127.0.0.1:3888:3002 --env OPENAI_ACCESS_TOKEN=your_access_token --env AUTH_SECRET_KEY=you_secret_key chenzhaoyu94/chatgpt-web
```

**Step3. 访问localhost:3002查看效果**

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/chatgpt-web-init.png)

:::

::: tip

在上述步骤中我们无需进行任何代理，就可以直接与GPT交流，使用API方式同理。当然了，根据项目作者的介绍，**使用API时需要进行代理自建**。

:::

如果你只是在本地部署给自己使用，那么以上3步就满足了需求，如果想要在公网访问，或者像App一样访问你的ChatGPT，那么请接着往下看。

## Nginx反向代理

以宝塔面板为例，我们在服务器上拉起docker镜像后，可以通过`ip:port`进行访问

但通常来说我们的网站带有域名，以笔者所使用的腾讯云服务器为例

前置条件

- 拥有一个域名
- 拥有一台云服务器

**Step1. SSL证书**

首先在云产品中找到SSL证书，点击我的证书-免费证书-申请免费证书

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/SSL-gpt.png)

:::

填写申请的域名，申请成功之后，点击下载，下载nginx格式的即可

**Step2. 配置域名SSL**

在宝塔面板中选择-网站-添加站点

填写刚刚申请SSL证书的域名，选择纯静态，其余默认，点击确定即可

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/bt-gpt.png)

:::

**Step3. 配置证书**

点击添加好的网站，然后点击SSL，填入刚刚下载的文件中的`key`和`pem`

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/SSL-L-gpt.png)

:::

配置完成后点击保存

**Step4. 配置DNS解析**

在云产品中搜索-云解析-选择DNS解析DNSPod

点击我的域名-添加记录

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/DNS-gpt.png)

:::

填入刚刚申请的域名，如果带有前缀，则第一个红框填入你的域名前缀，比如www.baidu.com，则这里填www

第二个红框填写你的服务器ip，或者你的CDN域名

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/DNS-add.png)

:::

**Step5. 配置反向代理**

在宝塔面板中，点击刚刚添加的网站，点击反向代理，填入刚刚docker启动时的宿主机端口

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/nginx-gpt.png)

:::

如上文中的3888

以上配置完成之后，访问https://你的域名就可以了~

## PWA支持

PWA技术可以让我们访问网站能够拥有访问App一般的体验，在chatgpt-web中已经内嵌，但默认是关闭的

我们可以通过设置启动时的参数`-env VITE_GLOB_APP_PWA=true`将他打开

```bash
docker run --name chatgpt-web -d -p 127.0.0.1:3888:3002 --env OPENAI_ACCESS_TOKEN=your_access_token --env AUTH_SECRET_KEY=you_secret_key --env VITE_GLOB_APP_PWA=true chenzhaoyu94/chatgpt-web
```

部署成功之后，我们再到手机上访问该网站时便可以保存他在桌面了。

::: tip

默认的PWA图标和全局用户信息配置在项目中，即使在网页可以修改当前登陆者的用户信息，在清除Cookie之后便会还原，如果你想定制这两种信息，请拉下chatgpt-web项目进行镜像自定义

:::

本文使用PWA时采用了自定义镜像，效果在手机上如下，我定制为了可爱的花花🐼🌸

::: center

![](https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/gpt/pwa-gpt.jpg)

:::

## 博客嵌入

在博客中也已经加入了ChatGPT的嵌入体验

欢迎访问<https://cloud.benym.cn/gpt/>

