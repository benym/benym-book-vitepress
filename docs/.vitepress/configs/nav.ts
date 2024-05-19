import type {DefaultTheme} from 'vitepress'

export const nav: DefaultTheme.Config['nav'] = [
  {text: '导航', link: '/nav', activeMatch: '^/nav'},
  {
    text: '🦮首页', link: '/'
  },
  {
    text: '🦁Java',
    items: [
      {
        text: 'Java',
        items: [
          {text: 'Java-基础', link: '/pages/225727/'},
          {text: 'Java-集合', link: '/pages/9786e5/'},
          {text: 'Java-多线程与并发', link: '/pages/487c60/'},
          {text: 'Java-JVM', link: '/pages/0a146e/'},
          {text: 'Java-IO', link: '/pages/4aef64/'}
        ]
      },
      {
        text: 'Python',
        items: [
          {text: 'Python-基础', link: '/pages/0de67d/'},
          {text: 'Python-机器学习', link: '/pages/43f8b9/'},
        ]
      }
    ]
  },
  {
    text: '🐯分布式与中间件',
    items: [
      {text: 'Kafka', link: '/pages/b53b0f/'},
      {text: 'Redis', link: '/pages/847591/'},
      {text: 'MySQL', link: '/pages/0f7e8e/'},
      {text: '分布式事务', link: '/pages/aaed8c/'},
    ]
  },
  {
    text: '🐼框架',
    items: [
      // 说明：以下所有link的值只是在相应md文件头部定义的永久链接（不是什么特殊编码）。另外，注意结尾是有斜杠的
      {
        text: 'Spring',
        items: [
          {text: 'SpringIOC', link: '/pages/6e0b99/'},
          {text: 'SpringAOP', link: '/pages/a657d3/'},
        ],
      },
    ],
  },
  {text: '🦌设计模式', link: '/pages/ac5f01/'},
  {
    text: '🐻算法',
    items: [
      {text: '剑指Offer', link: '/pages/83cdcf/'},
      {text: 'LeetCode', link: '/pages/b2b5b5/'},
      {text: '排序算法', link: '/pages/8d006a/'},
    ]
  },
  {text: '🐧实践', link: '/pages/f6b758/'},
  {
    text: '🐳开源项目',
    items: [
      {
        text: 'Rpamis',
        items: [
          {text: 'Utils', link: '/pages/3147fe/'},
          {text: 'Exception', link: '/pages/b127c7/'},
          {text: 'Security', link: '/pages/792496/'},
        ],
      },
    ],
  },
  {
    text: '🐿️索引',
    items: [
      {text: '归档', link: '/archives/'},
      // {text: '分类', link: '/categories/'},
      {text: '标签', link: '/tags/'},
      {text: '目录', link: '/pages/059f1f/'},
    ]
  },
  {text: '🦉里程碑', link: '/milestone/'},
  {text: '🐷关于', link: '/about/'},
]
