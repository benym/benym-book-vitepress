---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
layoutClass: 'm-home-layout'

hero:
  name: benym的知识笔记
  text: Deployed with a Cloud-Native Architecture
  tagline: 惟其艰难，才更显勇毅🍂惟其笃行，才弥足珍贵
  image:
    src: https://img.benym.cn/img/playhome.png
    alt: benym-book
  actions:
    - theme: brand
      text: 探索知识
      link: /notes/07-practice/03-artificial-intelligence/03-interpretation-of-spring-ai-alibaba-deepresearch-source-code
    - theme: alt
      text: 开源项目
      link: Projects
    - theme: alt
      text: 里程碑
      link: /notes/09-milestone/01.milestone-detail

features:
  - title: Java
    details: Java基础知识总结
    link: /notes/01-java/01-java-basics/01-reflection-acquires-class-objects-in-three-ways
    icon:
      src: https://img.benym.cn/img/site1back.png
  - title: 分布式与中间件
    details: Kafka、Redis、MySQL、分布式相关知识
    link: /notes/03-distribution-and-middleware/03-mysql/01-principles-and-application-scenarios-of-mysql-index
    icon:
      src: https://img.benym.cn/img/site2back.png
  - title: 基础框架
    details: Spring生态框架与常用框架相关知识
    link: /notes/05-foundation-framework/01-spring/02-spring-aop/01-implement-operation-logging-with-aop
    icon:
      src: https://img.benym.cn/img/site3back.png
  - title: 项目实践方案
    details: 包含站点优化、通用技术方案、AI Agent、实用代码等总结整理
    link: /notes/07-practice/03-artificial-intelligence/03-interpretation-of-spring-ai-alibaba-deepresearch-source-code
    icon:
      src: https://img.benym.cn/img/task.svg
  - title: 开源项目
    details: Rpamis系列开源项目，现有快速脚手架、通用工具类、安全组件、责任链组件
    link: /notes/08-open-source-project/01-rpamis/01-utils/01-fear-no-performance-worries-twelve-bean-copy-tools-pressure-test-big-competition
    icon:
      src: https://img.benym.cn/img/open.svg
  - title: 设计模式
    details: 状态机设计模式
    link: /notes/11-design-pattern/01-state-machine-mode/01-cola-statemachine-transaction-failure-pit
    icon:
      src: https://img.benym.cn/img/design.svg
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
  align-items: flex-end;
}
</style>
