import type {DefaultTheme} from 'vitepress'

export const navConfig: DefaultTheme.Config['nav'] = [
  {text: '🦮导航', link: '/notes/0-navigation/nav', activeMatch: '^/nav'},
  {
    text: '🦁Java',
    items: [
      {
        text: 'Java',
        items: [
          {text: 'Java-基础', link: '/notes/01-java/01-java-basics/01-reflection-acquires-class-objects-in-three-ways'},
          {text: 'Java-集合', link: '/notes/01-java/02-java-collection/01-expansion-mechanism-of-arraylist'},
          {text: 'Java-并发', link: '/notes/01-java/03-java-concurrence/01-several-ways-to-implement-multithreading'},
          {text: 'Java-JVM', link: '/notes/01-java/04-java-jvm/01-custom-class-loader'},
          {text: 'Java-IO', link: '/notes/01-java/05-java-io/01-overview'}
        ]
      },
      {
        text: 'Python',
        items: [
          {text: 'Python-基础', link: '/notes/02-python/01.python-basics/01-assert-statement-usage'},
          {text: 'Python-机器学习', link: '/notes/02-python/02-python-machine-learning/01-first-use-of-numpy'},
        ]
      }
    ]
  },
  {
    text: '🐯分布式与中间件',
    items: [
      {text: 'Kafka', link: '/notes/03-distribution-and-middleware/01-kafka/01-overview'},
      {text: 'Redis', link: '/notes/03-distribution-and-middleware/02-redis/01-redis-implements-shared-sessions'},
      {
        text: 'MySQL',
        link: '/notes/03-distribution-and-middleware/03-mysql/01-principles-and-application-scenarios-of-mysql-index'
      },
      {
        text: '分布式事务',
        link: '/notes/03-distribution-and-middleware/04-distributed-transaction/01-characteristics-of-transactions-CAP-theorem-BASE-theory'
      },
    ]
  },
  {
    text: '🐼框架',
    items: [
      // 说明：以下所有link的值只是在相应md文件头部定义的永久链接（不是什么特殊编码）。另外，注意结尾是有斜杠的
      {
        text: 'Spring',
        items: [
          {text: 'SpringIOC', link: '/notes/05-foundation-framework/01-spring/01-spring-ioc/01-overview'},
          {
            text: 'SpringAOP',
            link: '/notes/05-foundation-framework/01-spring/02-spring-aop/01-implement-operation-logging-with-aop'
          },
        ],
      },
    ],
  },
  {
    text: '🦌设计模式',
    items: [
      {text: '状态机模式', link: '/notes/11-design-pattern/01-state-machine-mode/01-cola-statemachine-transaction-failure-pit'}
    ]
  },
  {
    text: '🐻算法',
    items: [
      {text: '剑指Offer', link: '/notes/06-algorithm/01-sword-offer/00-0-1-knapsack-problem-explained-in-detail'},
      {text: 'LeetCode', link: '/notes/06-algorithm/02-leetcode/01-leetcode-54-helix-matrix'},
      {text: '排序算法', link: '/notes/06-algorithm/03-sorting-algorithm/00-summary-of-common-sorting-algorithms'},
    ]
  },
  {text: '🐧实践', link: '/notes/07-practice/01-site-optimization/01-upgrade-the-hexo-custom-domain-name-to-https'},
  {
    text: '🐳开源项目',
    items: [
      {
        text: '项目汇总', link: "Projects.md"
      },
      {
        text: '项目介绍',
        items: [
          {text: 'Rpamis', link: '/notes/08-open-source-project/01-rpamis/01-utils/01-fear-no-performance-worries-twelve-bean-copy-tools-pressure-test-big-competition'},
        ]
      }
    ],
  },
  {text: '🦉里程碑', link: '/notes/09-milestone/01.milestone-detail'},
  {text: '🐷关于', link: '/notes/10-about/01.about-me'},
  {text: "👫友情链接", link: "Friends.md"},
]
