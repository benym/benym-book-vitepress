import { h, watch } from 'vue'
import { useData, EnhanceAppContext } from 'vitepress'

import MNavVisitor from './components/MNavVisitor.vue'
import MDocFooter from './components/MDocFooter.vue'
import MAsideSponsors from './components/MAsideSponsors.vue'
import MNavLinks from './components/MNavLinks.vue'
import LinkCard from "./components/LinkCard.vue";
import HText from "./components/HText.vue";

import './styles/index.scss'
import "./styles/tailwind.scss";
import BlogTheme from '@sugarat/theme'

if (typeof window !== 'undefined') {
  /* 注销 PWA 服务 */
  if (window.navigator && navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        registration.unregister()
      }
    })
  }

  /* 删除浏览器中的缓存 */
  if ('caches' in window) {
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          return caches.delete(key)
        })
      )
    })
  }
}

let homePageStyle: HTMLStyleElement | undefined

export default {
  extends: BlogTheme,
  Layout: () => {
    const props: Record<string, any> = {}
    // 获取 frontmatter
    const { frontmatter } = useData()

    /* 添加自定义 class */
    if (frontmatter.value?.layoutClass) {
      props.class = frontmatter.value.layoutClass
    }

    return h(BlogTheme.Layout, props, {
      /**
       * 相关插槽
       * https://vitepress.dev/guide/extending-default-theme#layout-slots
       * https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/Layout.vue
       */
      'doc-after': () => h(MDocFooter),
      // 'nav-bar-title-after': () => h(MNavVisitor),
      'aside-bottom': () => h(MAsideSponsors)
    })
  },
  enhanceApp({ app, router }: EnhanceAppContext) {
    app.component("LinkCard", LinkCard);
    app.component("HText", HText);
    app.component('MNavLinks', MNavLinks)

    app.provide('DEV', process.env.NODE_ENV === 'development')

    if (typeof window !== 'undefined') {
      watch(
        () => router.route.data.relativePath,
        () => updateHomePageStyle(location.pathname === '/'),
        { immediate: true }
      )
      // 创建并配置difyChatbotConfig脚本
      const chatbotConfigScript = document.createElement('script')
      chatbotConfigScript.textContent = `window.difyChatbotConfig = { token: 'I9I2dnjtK7fXLcnv' }`
      document.head.appendChild(chatbotConfigScript)

      // 创建并引入embed.min.js脚本
      const embedScript = document.createElement('script')
      embedScript.src = 'https://udify.app/embed.min.js'
      embedScript.id = 'I9I2dnjtK7fXLcnv'
      embedScript.defer = true
      document.head.appendChild(embedScript)
    }
  }
}

if (typeof window !== 'undefined') {
  // detect browser, add to class for conditional styling
  const browser = navigator.userAgent.toLowerCase()
  if (browser.includes('chrome')) {
    document.documentElement.classList.add('browser-chrome')
  } else if (browser.includes('firefox')) {
    document.documentElement.classList.add('browser-firefox')
  } else if (browser.includes('safari')) {
    document.documentElement.classList.add('browser-safari')
  }
}

// Speed up the rainbow animation on home page
function updateHomePageStyle(value: boolean) {
  if (value) {
    if (homePageStyle) return

    homePageStyle = document.createElement('style')
    homePageStyle.innerHTML = `
    :root {
      animation: rainbow 12s linear infinite;
    }`
    document.body.appendChild(homePageStyle)
  } else {
    if (!homePageStyle) return

    homePageStyle.remove()
    homePageStyle = undefined
  }
}
