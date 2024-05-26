import type { Theme } from '@sugarat/theme'
import { getThemeConfig } from '@sugarat/theme/node'

const baseUrl = 'https://cloud.benym.cn'
const RSS: Theme.RSSOptions = {
  title: 'benym的知识笔记',
  baseUrl,
  copyright: 'Copyright (c) 2028-present, benym',
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
      url: 'https://cloud.benym.cn',
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
  // comment: {
  //   type: 'giscus',
  //   options: {
  //     repo: '',
  //     repoId: '',
  //     category: 'Announcements',
  //     categoryId: '',
  //     inputPosition: 'top',
  //   },
  // },
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
  }
})