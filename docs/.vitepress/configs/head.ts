import type {HeadConfig} from 'vitepress'

const isDevelopment = process.env.NODE_ENV === 'development'

export const head: HeadConfig[] = [
  ['meta', {name: 'theme-color', content: '#3eaf7c'}],
  ['meta', {name: 'apple-mobile-web-app-capable', content: 'yes'}],
  ['meta', {name: 'apple-mobile-web-app-status-bar-style', content: 'black'}],
  ['meta', {name: 'msapplication-TileColor', content: '#000000'}],
  ['meta', {name: 'msapplication-TileImage', content: '/img/favicon-benym.ico'}],
  ['meta', {name: 'baidu-site-verification', content: ''}],
  ['link', {rel: 'apple-touch-icon', href: '/img/favicon-benym.ico'}],
  ['link', {rel: 'mask-icon', href: '/img/favicon-benym.ico', color: '#3eaf7c'}],
  ['link', {rel: 'manifest', href: '/manifest.webmanifest'}],
  [
    'script',
    {
      src: isDevelopment ? '' : 'https://hm.baidu.com/hm.js?92af11dd09d5616401db6d088dec3a2f'
    }
  ],
  [
    'script',
    { id: 'register-sw' },
    `;(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
        }
      })()`
  ]
]
