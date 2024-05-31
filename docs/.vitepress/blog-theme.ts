import type { Theme } from '@sugarat/theme'
import {footerHTML, getThemeConfig} from '@sugarat/theme/node'

const baseUrl = 'https://benym.cn'
const RSS: Theme.RSSOptions = {
  title: 'benym的知识笔记',
  baseUrl,
  copyright: 'Copyright (c) 2018-present, benym',
  description: 'benym的知识笔记'
}

export const blogTheme = getThemeConfig({
  // 本地搜索
  search: false,
  // 博客模式
  blog: false,
  RSS,
  authorList: [
    {
      nickname: 'benym',
      url: 'https://benym.cn',
      des: 'benym的知识笔记'
    }
  ],
  recommend: {
    nextText: '下一页',
    sort(a, b) {
      return +new Date(b.meta.date) - +new Date(a.meta.date)
    },
  },
  // 文章默认作者
  author: 'benym',
  // 评论
  comment: {
    type: 'giscus',
    options: {
      repo: 'benym/benym-book-vitepress',
      repoId: 'R_kgDOL9jcpA',
      category: 'Announcements',
      categoryId: 'DIC_kwDOL9jcpM4Cfrz9',
      inputPosition: 'top',
    },
    mobileMinify: true
  },
  buttonAfterArticle: {
    openTitle: '投"币"支持',
    closeTitle: '下次一定',
    content: '<img src="https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/ali.jpg/zipstyle">',
    icon: 'wechatPay',
  },
  popover: {
    title: '公告',
    body: [
      { type: 'text', content: '❤️博客翻新中' },
    ],
    duration: 0
  },
  // footer: {
  //   version: true,
  //   copyright: 'MIT License | 2018-present benym',
  //   icpRecord: {
  //     name: '渝ICP备18012574号',
  //     link: 'https://beian.miit.gov.cn/#/Integrated/index'
  //   },
  //   securityRecord: {
  //     name: '渝公网安备50010902502537号',
  //     link: 'http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=50010902502537'
  //   },
  // }
})
