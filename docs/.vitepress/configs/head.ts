import type {HeadConfig} from 'vitepress'

const isDevelopment = process.env.NODE_ENV === 'development'

export const headConfig: HeadConfig[] = [
  ['meta', {name: 'theme-color', content: '#3eaf7c'}],
  ['meta', {name: 'apple-mobile-web-app-capable', content: 'yes'}],
  ['meta', {name: 'apple-mobile-web-app-status-bar-style', content: 'black'}],
  ['meta', {name: 'keywords', content: 'Java,benym,blog,knowledge,AI'}],
  ['meta', {name: 'msapplication-TileColor', content: '#000000'}],
  ['meta', {name: 'msapplication-TileImage', content: '/img/favicon-benym.ico'}],
  ['meta', {name: 'baidu-site-verification', content: ''}],
  ['link', {rel: 'apple-touch-icon', href: '/img/favicon-benym.ico'}],
  ['link', {rel: 'mask-icon', href: '/img/favicon-benym.ico', color: '#3eaf7c'}],
  ['link', {rel: 'manifest', href: '/manifest.webmanifest'}],
  // 在标签上显示所的 logo
  ["link", {rel: 'icon', href: "/img/favicon-benym.ico"}],
  [
    'script',
    {
      src: isDevelopment ? '' : 'https://hm.baidu.com/hm.js?44ab0268b91d13e0090e3d79467b7500'
    }
  ],
  [
    'script',
    {id: 'register-sw'},
    `;(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
        }
      })()`
  ]
]
