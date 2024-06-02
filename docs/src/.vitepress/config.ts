import {defineConfig} from 'vitepress'
import {setupCustomContainers} from "./utils/markdown-ext"

import {sidebarConfig, navConfig, headConfig, algoliaConfig} from './configs'
import {blogTheme} from "./blog-theme";

export default defineConfig({
  extends: blogTheme,
  outDir: '../../dist',
  base: process.env.APP_BASE_PATH || '/',

  lang: 'zh-CN',
  title: 'benym的知识笔记',
  description: 'benym knowledge management & blog, documenting technical summaries and sharing knowledge',
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
    hostname: 'https://benym.cn',
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
