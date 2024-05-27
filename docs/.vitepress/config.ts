import {defineConfig} from 'vitepress'
import {setupCustomContainers} from "./utils/markdown-ext"

import {sidebarConfig, navConfig, headConfig, algoliaConfig} from './configs'
import {blogTheme} from "./blog-theme";

export default defineConfig({
  extends: blogTheme,
  outDir: '../dist',
  srcDir: './src',
  base: process.env.APP_BASE_PATH || '/',

  lang: 'zh-CN',
  title: 'benym的知识笔记',
  description: 'benym的知识管理&博客',
  head: headConfig,

  lastUpdated: true,
  cleanUrls: true,

  // markdown 配置
  markdown: {
    config(md) {
      // 自定义容器
      setupCustomContainers(md);
    },
    // 行号显示
    lineNumbers: true,
    theme: {
      light: 'one-dark-pro',
      dark: 'one-dark-pro',
    }
  },
  // sitemap
  sitemap: {
    hostname: 'https://cloud.benym.com',
    lastmodDateOnly: false
  },

  /* 主题配置 */
  themeConfig: {
    i18nRouting: false,
    // 首页logo
    logo: '/img/favicon-benym.ico',
    // 导航栏
    nav: navConfig,
    // 侧边栏
    sidebar: sidebarConfig,
    // 右侧大纲配置
    outline: {
      level: 'deep',
      label: '本页目录'
    },
    // 社交连接
    socialLinks: [{icon: 'github', link: 'https://github.com/benym'}],
    // 页脚
    footer: {
      message: 'benym | <a href="https://github.com/benym/benym-book/blob/master/LICENSE" target="_blank">MIT License</a>'
        + '<br> <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank">渝ICP备18012574号</a>&nbsp;|&nbsp;<a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=50010902502537" target="_blank">渝公网安备50010902502537号</a>',
      copyright: 'Copyright © 2018-present &nbsp;|&nbsp;'
        + '<a href="https://www.foreverblog.cn/go.html" target="_blank"> <img src="https://img.foreverblog.cn/wormhole_4_tp.gif" alt="" style="width:auto;height:32px;vertical-align:middle;" title="穿梭虫洞-随机访问十年之约友链博客"></a>&nbsp;|&nbsp;<a href="https://www.foreverblog.cn/" target="_blank" > <img src="https://img.foreverblog.cn/logo_en_default.png" alt="" style="width:auto;height:16px;vertical-align:middle;"> </a>'
        + '&nbsp;|&nbsp;<a href="https://cloud.tencent.com/" target="_blank"> <img src="https://help-assets.codehub.cn/enterprise/guanwang/tencent-logo.svg" alt="" style="width:auto;height:18px;vertical-align:middle;"></a>&nbsp;|&nbsp;<a href="https://coding.net/" target="_blank"> <img src="https://help-assets.codehub.cn/enterprise/guanwang/coding-logo.svg" alt="" style="width:auto;height:18px;vertical-align:middle;"></a>'
    },
    // 切换黑夜模式按钮名称
    darkModeSwitchLabel: '外观',
    returnToTopLabel: '返回顶部',
    lastUpdated: {text: '上次更新'},

    // algolia配置
    search: {
      provider: 'algolia',
      options: algoliaConfig
    },
    // 翻页名称
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    }
  }
})
