---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
layoutClass: 'm-home-layout'

hero:
  name: benym的知识笔记
  text: Deployed with a Cloud-Native Architecture
  tagline: 惟其艰难，才更显勇毅🍂惟其笃行，才弥足珍贵
  image:
    src: /img/playhome.png
    alt: benym-book
  actions:
    - theme: brand
      text: Markdown Examples
      link: /markdown-examples
    - theme: alt
      text: API Examples
      link: /api-examples

features:
  - title: Java
    details: Java、Python相关知识
    link: /pages/225727/
    imgUrl: https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/site1back.png
  - title: 分布式与中间件
    details: Kafka、Redis、分布式相关知识
    link: /pages/847591/
    imgUrl: https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/site2back.png
  - title: 框架与数据库
    details: Spring生态框架与MySQL相关知识
    link: /pages/a657d3/
    imgUrl: https://image-1-1257237419.cos.ap-chongqing.myqcloud.com/img/site3back.png
---

<style>
/*爱的魔力转圈圈*/
.m-home-layout .image-src:hover {
  transform: translate(-50%, -50%) rotate(666turn);
  transition: transform 59s 1s cubic-bezier(0.3, 0, 0.8, 1);
}

.m-home-layout .details small {
  opacity: 0.8;
}

.m-home-layout .item:last-child .details {
  display: flex;
  justify-content: flex-end;
  align-items: end;
}
</style>
