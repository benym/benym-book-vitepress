import {createWriteStream} from 'node:fs'
import {resolve} from 'node:path'
import {SitemapStream} from 'sitemap'
import {defineConfig, PageData} from 'vitepress'
import {fileURLToPath, URL} from "node:url";
import {getSidebar} from "./utils/getSidebar";

import {head, nav, algolia} from './configs'

const links: { url: string; lastmod: PageData['lastUpdated'] }[] = []

export default defineConfig({
  outDir: '../dist',
  srcDir: './src',
  base: process.env.APP_BASE_PATH || '/',

  lang: 'zh-CN',
  title: 'benym的知识笔记',
  description: 'benym的知识管理&博客',
  head,

  lastUpdated: true,
  cleanUrls: true,

  /* markdown 配置 */
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'one-dark-pro',
      dark: 'one-dark-pro',
    }
  },

  sitemap: {
    hostname: 'https://cloud.benym.com',
    lastmodDateOnly: false
  },

  /* 主题配置 */
  themeConfig: {
    i18nRouting: false,

    logo: '/img/favicon-benym.ico',

    nav,
    // 【文章页面左侧导航】
    sidebar: {
      "/notes/01-java/": getSidebar("/docs/src", "/notes/01-java/"),
      "/notes/02-python/": getSidebar("/docs/src", "/notes/02-python/"),
      "/notes/03-distribution-and-middleware/": getSidebar("/docs/src", "/notes/03-distribution-and-middleware/"),
      "/notes/05-foundation-framework/": getSidebar("/docs/src", "/notes/05-foundation-framework/"),
      "/notes/06-algorithm/": getSidebar("/docs/src", "/notes/06-algorithm/"),
      "/notes/07-practice/": getSidebar("/docs/src", "/notes/07-practice/"),
      "/notes/08-open-source-project/": getSidebar("/docs/src", "/notes/08-open-source-project/"),
      "/notes/09-milestone/": getSidebar("/docs/src", "/notes/09-milestone/"),
      "/notes/10-about/": getSidebar("/docs/src", "/notes/10-about/"),
      "/notes/11-design-pattern/": getSidebar("/docs/src", "/notes/11-design-pattern/")
    },
    /* 右侧大纲配置 */
    outline: {
      level: 'deep',
      label: '本页目录'
    },

    socialLinks: [{icon: 'github', link: 'https://github.com/benym'}],

    footer: {
      message: 'benym | <a href="https://github.com/benym/benym-book/blob/master/LICENSE" target="_blank">MIT License</a>'
        + '<br> <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank">渝ICP备18012574号</a>&nbsp;|&nbsp;<a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=50010902502537" target="_blank">渝公网安备50010902502537号</a>',
      copyright: 'Copyright © 2018-present benym&nbsp;|&nbsp;'
        + '<a href="https://www.foreverblog.cn/go.html" target="_blank"> <img src="https://img.foreverblog.cn/wormhole_4_tp.gif" alt="" style="width:auto;height:32px;vertical-align:middle;" title="穿梭虫洞-随机访问十年之约友链博客"></a>&nbsp;|&nbsp;<a href="https://www.foreverblog.cn/" target="_blank" > <img src="https://img.foreverblog.cn/logo_en_default.png" alt="" style="width:auto;height:16px;vertical-align:middle;"> </a>'
        + '&nbsp;|&nbsp;<a href="https://cloud.tencent.com/" target="_blank"> <img src="https://help-assets.codehub.cn/enterprise/guanwang/tencent-logo.svg" alt="" style="width:auto;height:18px;vertical-align:middle;"></a>&nbsp;|&nbsp;<a href="https://coding.net/" target="_blank"> <img src="https://help-assets.codehub.cn/enterprise/guanwang/coding-logo.svg" alt="" style="width:auto;height:18px;vertical-align:middle;"></a>'
    },

    darkModeSwitchLabel: '外观',
    returnToTopLabel: '返回顶部',
    lastUpdated: {text: '上次更新'},

    /* Algolia DocSearch 配置 */
    algolia,

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    }
  }
})
