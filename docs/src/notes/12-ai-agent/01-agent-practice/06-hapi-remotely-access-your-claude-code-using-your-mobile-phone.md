---
title: hapi-使用手机远程你的claude code
description: hapi-使用手机远程你的claude code
categories: 
  - AI人工智能
tags: 
  - AI
  - Agent
  - Hapi
  - Claude Code
keywords: AI,Agent,Hapi,Claude Code
date: 2026-3-25 13:57:41
author: benym
---

# Hapi-使用手机远程你的claude code

## 什么是Hapi

[Hapi](https://hapi.run/)是一个基于Happy二次开源的远程Vibe Coding工具，支持在手机上远程访问和操作你的Claude Code环境，支持斜杠命令，远程开启会话，操作你本地Claude Code一切支持的东西，让你随时随地都能进行代码编写和调试。

![](https://img.benym.cn/hapi/1.png)

相对于Happy来说，Hapi的所有数据都保存在本地电脑上，数据不上服务器

对于想要数据自主，自托管，最小设置的用户而言，Hapi就是很好的选择

对应想要多用户协作，云端托管的模型，Happy也可以

在国内的环境下访问Happy的App经常卡顿，闪退，而且项目开始逐渐不活跃了。Happy采用的服务端和应用层数据加密，其架构复杂度稍微比较复杂，对于只是想要一个简单的可以使用的远程Claude Code工具，大家可以选择使用Claude Pro支持的Claude APP官方远程。但是会面临Claude对于国内IP封禁严重，且Pro的价格昂贵的问题。

在国内云厂商大力推广Coding Plan的背景下，使用Coding Plan接入CC是常规操作，但是这样的接入方式不支持官方远程，这时候Hapi就会派上用场了

## 国内用户快速安装最佳实践

官方文档虽然有写怎么[快速安装](https://hapi.run/docs/guide/quick-start.html)，但是其默认提供的远程链接在国内根本无法访问到，另外文档对于如何自建配置写的很不详细，导致他并不是一个开箱即用的工具。经过网上搜集资料和一些摸索，我总结出了适合于国内用户的最佳实战

本教程适用于，有自己的公网服务器的用户，并不需要太高的配置，因为只做中继数据转发，如没有公网服务器，可采用官方教程介绍使用Cloudflare Tunnel、Tailscale等进行中继服务器建设，但有公网服务器就是最简单的方法了

### 1. 安装Hapi依赖

首先需要云服务器和本地电脑都安装上hapi依赖

```bash
npm install -g @twsxtd/hapi --registry=https://registry.npmjs.org
```

### 2. 在服务器启动Hapi hub

我们可以在自己的云服务器上启动Hapi，让云服务器作为中继服务器，用于连接手机和本地电脑

```bash
hapi hub
```

使用hapi hub，而不是hapi hub --relay，因为使用relay会连接作者本身提供的中继，作者的中继在海外的，国内本地电脑无法连接，只会一直显示

```bash
HAPI Hub is ready!
[Tunnel] Waiting for trusted TLS certificate…
[Tunnel] Waiting for trusted TLS certificate…
[Tunnel] 2026/02/26 08:43:05 tunwg: initiating handshake to server
[Tunnel] Waiting for trusted TLS certificate…
[Tunnel] Waiting for trusted TLS certificate…
```

证明无法连接作者的`relay.hapi.run`

使用hapi hub之后，控制台输出大概会长这样，如果是第一次运行，会打印token，并存储在`~/.hapi/setting.json`文件里面

```bash
[Hub] CLI_API_TOKEN: loaded from settings.json
[Hub] HAPI_LISTEN_HOST: 1.1.1.1 (environment)
[Hub] HAPI_LISTEN_PORT: 3006 (default)
[Hub] HAPI_PUBLIC_URL: http://localhost:3006 (default)
[Hub] Telegram: disabled (no TELEGRAM_BOT_TOKEN)
[Hub] Tunnel: disabled (default)
[Web] hub listening on 1.1.1.1:3006
[Web] public URL: http://localhost:3006

[Web] Hub listening on :3006
[Web] Local: http://localhost:3006
```

但是这样只是运行在了云服务器本地，此时你用ip:3006是访问不到的，因为监听配置还没有修改

#### 使用域名(推荐)

使用域名是推荐的方式，因为采用的云服务器自建，通常需要增加Https认证，一定程度的避免安全问题

以腾讯云轻量服务器为例，在宝塔面板上增加3006端口上的反向代理映射即可

![](https://img.benym.cn/hapi/2.png)

比如你的域名为`https://example.com`，按照如下操作设置

```bash
# 重新设置监听地址
export HAPI_LISTEN_HOST=0.0.0.0
# 导致外网可以访问的IP地址
export HAPI_PUBLIC_URL=https://example.com
```

之后重启hapi

```bash
hapi hub
```

重启之后能看到如下日志就算成功

```bash
HAPI Hub starting...
[Hub] CLI_API_TOKEN: loaded from settings.json
[Hub] HAPI_LISTEN_HOST: 0.0.0.0 (settings.json)
[Hub] HAPI_LISTEN_PORT: 3006 (default)
[Hub] HAPI_PUBLIC_URL: https://example.com (settings.json)
[Hub] Telegram: disabled (no TELEGRAM_BOT_TOKEN)
[Hub] Tunnel: disabled (default)
[Web] hub listening on 0.0.0.0:3006
[Web] public URL: https://example.com

[Web] Hub listening on :3006
[Web] Local:  http://localhost:3006

HAPI Hub is ready!
```

此时再访问`https://example.com`(云服务器需要开通3006端口防火墙)就能够访问到hapi首页了，首页一般先会让输入Token，token就是刚刚启动时候的setting文件里面，填完token之后会让你填一个连接地址，这个地址就是中继服务器地址，如果不填就会默认作者的，大概率进不去，这时候我填自己的域名`https://example.com`，就能进去看到页面了，但是此时是没有会话的

![](https://img.benym.cn/hapi/3.png)

#### 使用ip

如果你没有域名，想直接使用ip+端口访问中继，那么可以参考如下配置

```bash
# 重新设置监听地址
export HAPI_LISTEN_HOST=0.0.0.0
# 导致外网可以访问的IP地址
export HAPI_PUBLIC_URL=http://你的服务器ip
```

之后重新运行

```bash
hapi hub
```

此时再访问ip:3006(云服务器需要开通此端口防火墙)就能够访问到hapi首页了，同样的填写token和地址，地址可以填写`http://你的ip:3006`

#### 后台长期运行Hapi Hub

对于云服务而言，直接采用hapi hub或者nohup运行hapi进程，在关闭终端之后，都会将进程休眠，导致服务连接不上

最好的方式是采用pm2进行管理，使得应用能够在关闭终端后长期运行

可以采用如下命令

```bash
# Install pm2
npm install -g pm2

# Start hub and runner
pm2 start "hapi hub --relay" --name hapi-hub

# View status and logs
pm2 status
pm2 logs hapi-hub

# Auto-restart on system reboot
pm2 startup    # Follow the printed instructions
```

### 3. 在本地开发机器启动Hapi

这里其实可以让Hapi hub(中继服务端)和Hapi(连接Claude Code客户端)都启动在云服务器上，但是cc写代码其实还是挺吃配置的，不建议这样做，所以一般是本地电脑开发机作为主力，启动Hapi客户端

之前我们已经在本地机器安装过Hapi，如果没有安装，则参考1里面的命令去安装

安装完成之后，使用如下命令

```bash
hapi auth login
```

然后会让你输入token，仍然使用刚刚在服务端输入的token

输入之后设置本地连接的远端api地址为你的中继服务器地址

- linux 用户：

```bash
export HAPI_API_URL="https://example.com"
```

- windows用户：

在系统变量-环境变量里面新建一个用户变量，输入key为`HAPI_API_URL`，value为`https://example.com`或者Ip，保存即可

之后启动Hapi

启动Hapi有两种方式：

1. 直接启动hapi
2. 采用hapi runner start启动

#### 直接启动hapi

先说第一个，输入

```bash
hapi
```

进行直接启动，这样启动的好处是，cc会显示在前台，你可以看到远程的操作是什么，可以用空格进行打断

windows用户如果是采用NPM安装的claude code，大概率会遇到如下问题

```bash
➜ hapi
Starting HAPI hub in background...
HAPI hub started
 [local]: Local Claude process failed: Claude Code CLI not found on PATH. Install Claude Code or set HAPI_CLAUDE_PATH.
Failed to execute: "D:\\nvm\\v22.19.0\\node_modules\\@twsxtd\\hapi\\node_modules\\@twsxtd\\hapi-win32-x64\\bin\\hapi.exe"
Binary exited with status 1.
Command failed: D:\nvm\v22.19.0\node_modules\@twsxtd\hapi\node_modules\@twsxtd\hapi-win32-x64\bin\hapi.exe
```

说找不到Claude Code的安装路径

此时你需要从Claude Code官方安装带有claude.exe的完全安装版本

对于Powershell而言，命令是

```bash
irm https://claude.ai/install.ps1 | iex
```

安装完成之后，仍然去设置环境变量，新增key为`HAPI_CLAUDE_PATH`，value为`C:\User\XXX\claude.exe`，或者在IDE中安装Claude Code的插件，也会自动下载claude.exe，找到对应的可执行文件路径即可

路径设置完成之后，重新运行hapi

可以看到被Hapi控制的cc，同时在手机会话上也能找到对应的会话了，在本地操作和远程操作会自动切换连接

#### hapi runner start启动

如果你不需要控制台在前台显示，只是想要hapi静默的被远程控制，那么可以采用如下命令启动

```bash
hapi runner start
```

启动之后，cc就运行在后台了，采用手机也可以正常看到，开启新的会话

效果如图

![](https://img.benym.cn/hapi/4.png)

### PWA支持

手机谷歌浏览器访问你部署hub的ip+端口，或者域名，进入之后点击右上角三个点，点击保存到桌面应用即可
