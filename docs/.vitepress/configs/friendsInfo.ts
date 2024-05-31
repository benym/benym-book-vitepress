interface Friend {
  avatar: string; // 头像链接
  name: string; // 用户 id
  link: string; // 博客链接
  title?: string; // 用户头衔
  tag?: string; // 用户标签
  color?: string; // 标签颜色
}

/**
 * 在此处填写你的友情链接
 */
export const friendsInfo: Friend[] = [
  {
    avatar: "https://avatars.githubusercontent.com/u/108183563?v=4",
    name: "虚位以待",
    title: "🚀 全能 🐳",
    link: "",
    tag: "虚拟tag",
    color: "indigo",
  },
  {
    avatar: "https://avatars.githubusercontent.com/u/29620619?v=4",
    name: "虚位以待",
    title: "强大的计算机科学家🧐",
    link: "",
    tag: "虚拟tag",
    color: "pink",
  },
  {
    avatar: "https://avatars.githubusercontent.com/u/106670529?v=4",
    name: "虚位以待",
    title: "懂不懂全栈开发の含金量",
    link: "",
    tag: "虚拟tag",
    color: "sky",
  },
  {
    avatar: "https://q.qlogo.cn/g?b=qq&nk=1515903788&s=140",
    name: "虚位以待",
    title: "人工智能明日之星🌟",
    link: "",
    tag: "虚拟tag",
    color: "green",
  }
];
