interface Project {
  banner: string; // 图片链接
  title: string; // 项目标题
  description: string; // 项目简介
  link: string; // 项目链接
  tag?: string; // 项目标签
}

/**
 * 在此处填写你的项目介绍
 */
export const projectsInfo: Project[] = [
  {
    banner: "/project-img/gpt-feishu.png",
    title: "HNECV",
    description:
      "⛱️Heterogeneous Network Embedding via Cloud model and Variational inference. CAAI. 2021. 代码实现",
    link: "https://github.com/benym/HNECV",
    tag: "Python",
  },
  {
    banner: "/project-img/cloudMusic.png",
    title: "Rpamis",
    description: "🚀为开发者提供快速、统一的项目结构生成，统一的包管理工具，并提供开发效能工具",
    link: "https://github.com/rpamis/rpamis",
    tag: "Java",
  },
  {
    banner: "/project-img/analyze-tool.png",
    title: "Rpamis-chain",
    description:
      "🌱轻量、高扩展性的责任链模式框架，内置多种责任链形态及执行策略",
    link: "https://github.com/rpamis/rpamis-chain",
    tag: "Java",
  },
  {
    banner: "/project-img/dora-bot.png",
    title: "Rpamis-security",
    description:
      "🧱基于Mybatis-Plugin的一站式加解密脱敏安全组件",
    link: "https://github.com/rpamis/rpamis-security",
    tag: "Java",
  }
];
