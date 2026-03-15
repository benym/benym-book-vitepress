---
title: Openclaw Windows WSL安装从0开始启动你自己的小龙虾
description: Openclaw Windows WSL安装从0开始启动你自己的小龙虾
categories: 
  - AI人工智能
tags: 
  - AI
  - Agent
  - OpenClaw
  - Wsl
keywords: AI,Agent,OpenClaw,Wsl
date: 2026-03-15 16:41:41
author: benym
---

# OpenClaw环境前置要求

由于OpenClaw最近特别的火，所以我也开始尝试在本地搭建一个OpenClaw，安装OpenClaw需要如下环境

1. 任意云模型厂商API Key
2. Windows环境

因为OpenClaw的安全功能做的比较差，所以在自己主力机的Windows电脑上直接安装OpenClaw是不推荐的，所以在Windows下基于WSL初始化一个Ubuntu系统作为OpenClaw运行的沙箱就显得特别适合

至少在沙箱的环境中，不会去操作属于Windows系统本身的东西，所以安装OpenClaw不会对Windows系统造成任何影响，如果沙箱崩了重新安装系统也就几秒的事情

## WSL安装Ubuntu

首先是安装WSL环境下的Ubuntu，这里采用比较新的版本，因为OpenClaw运行代码通常是需要Python环境的，老的Ubuntu支持的Python版本太旧了，另外建议开镜像模式，让Wsl共享本地机器的网络，避免开代理的时候需要单独设置的麻烦

如果没有安装过WSL，该命令第一次也会自动安装
```bash
wsl --install -d Ubuntu-24.04
```
等待下载完毕之后会让输入超管账户和密码，输入之后就可以进入Ubuntu系统了

wsl常用命令

列出所有WSL环境
```bash
wsl --list --verbose
```

删除某个版本Ubuntu系统, 如果需要重装的话一般是先删除
```bash
wsl --unregister Ubuntu-24.04
```

## 安装基础环境依赖

```bash
# 更新系统并安装基础工具
sudo apt update -y && apt upgrade -y
sudo apt install -y wget curl git unzip nodejs npm python3 python3-pip python3-venv build-essential
# 安装nvm管理Node.js版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
# 安装Node.js LTS版本
nvm install --lts
# 验证环境
# 需≥v22.0.0
node --version  
# 需≥3.11.0
python3 --version  
git --version
```

## 通过npm安装OpenClaw

我们采用npm安装OpenClaw
```bash
npm i -g openclaw
```
安装过程配置API Key，参考各大云厂商提供的Api Key配置教程，这里不再赘述。
之后运行openclaw命令启动OpenClaw
```bash
openclaw gateway start
```

启动成功之后，再启动dashboard查看基础的网页端
```bash
openclaw dashboard
```

运行示例

![](https://img.benym.cn/openclaw/1.png)

![](https://img.benym.cn/openclaw/2.png)

上述就已经将基本的小龙虾跑起来了，但是这个阶段还不算好用，我们可以给他安装更多的Skills，方便它自己进行网上的信息阅读，截图等等操作

## 安装Skills

访问OpenClaw官方Skills网站[https://clawhub.ai/](https://clawhub.ai/)，找一些你自己喜欢的Skills进行安装，以`self-improving-agent`为例，这是一个自我提升的Agent技能

在Ubuntu中执行
```bash
clawdhub install self-improving-agent
```
进行技能安装，不过由于网站访问量非常大，所以经常会遇到限流，需要多试几次进行安装，或者采用Zip进行安装

### 安装Agent-Browser浏览器Skills

访问[https://clawhub.ai/MaTriXy/agent-browser-clawdbot](https://clawhub.ai/MaTriXy/agent-browser-clawdbot)下载Zip
或采用如下命令安装
```bash
clawdhub install agent-browser-clawdbot
```
另外还有一些额外的技能，可以自行安装，也可以让直接告诉OpenClaw进行安装，也能够安装成功

![](https://img.benym.cn/openclaw/3.png)
## 如何使用浏览器技能

这一步是经常容易卡壳的，因为OpenClaw其实自带了浏览器技能命令，网上很多教程教你用OpenClaw命令安装之后，装浏览器插件，然后和OpenClaw对话就可以进行网页浏览了，这种情况适合于你的OpenClaw直接安装在本机，而不是Wsl

对于Wsl而言，Ubuntu初始化环境没有自己的浏览器，我们先要给Ubuntu安装浏览器

### 安装Chrome浏览器

最好是装Chrome而非Chromium

```bash
# 1. 检查浏览器服务状态
openclaw browser --browser-profile openclaw status

# 2. 若未安装浏览器，安装Google Chrome（容器内执行）
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y

# 3. 配置浏览器路径
openclaw config set browser.path /usr/bin/google-chrome-stable

# 4. 重启浏览器服务
openclaw browser --browser-profile openclaw restart

# 5. 验证浏览器服务状态
openclaw browser status
```
当显示这种状态的时候就正常了

![](https://img.benym.cn/openclaw/4.png)

### 重要！配置OpenClaw Message为Full

这一步是我重装了好几次Ubuntu摸索出来的，默认的模式为message，只能恢复你消息，不能够使用浏览器技能。在message模式下每次调用浏览器技能都会显示，让你先安装浏览器，但实际上你的浏览器已经安装了

只有打开为full的时候才能正确找到浏览器使用浏览器截图搜索等技能

如图

![](https://img.benym.cn/openclaw/5.png)

另外还可以配置无头模式，建议是常用的网站都登录后启用无头模式，通常来说浏览器的操作用户不可见，但实际上Agent是在后台操作浏览器的
```bash
browser: {
  enabled: true,
  headless: true,
}
```

### 浏览器文字显示口字

这种情况是因为Ubuntu系统本身没有带很多中文字体，需要安装一些字体，否则OpenClaw截图回来也是口字

执行如下两个命令，安装完全中文字体

```bash
sudo apt-get install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

sudo apt-get install libgtk-4.so.1 libgraphene-1.0.so.0 libxslt.so.1 libevent-2.1.so.7 libgstgl-1.0.so.0 libgstcodecparsers-1.0.so.0 libavif.so.16 libharfbuzz-icu.so.0 libmanette-0.2.so.0 libenchant-2.so.2 libhyphen.so.0 libsecret-1.so.0 libwoff2dec.so.1.0.2
```

### IM集成

这一步是可选的，也就是让你在手机就能操控OpenClaw干活，比如接入QQ，企业微信，飞书，钉钉等，这里不再赘述，云服务厂商的教程很详细，有的甚至扫描就可以接入了

比如接入QQ
![](https://img.benym.cn/openclaw/6.jpg)
