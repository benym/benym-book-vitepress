/**
 * 将目录名（或文件名）翻译成自定义名称
 *
 * ! 由于自动路由脚本是按照字典序排列。
 * ! 如果想要实现特定的顺序，请在文件或目录前人为排序。
 * ! 并在该文件中将其名称进行替换。
 */
export const fileName2Title: Record<string, string> = {
  "01-java": "Java",
  "01-java-basics": "Java-基础",
  "02-java-collection": "Java-集合",
  "03-java-concurrence": "Java-并发",
  "04-java-jvm": "Java-JVM",
  "05-java-io": "Java-IO",
  "02-python": "Python",
  "01.python-basics": "Python-基础",
  "02-python-machine-learning": "Python-机器学习",
  "03-distribution-and-middleware": "分布式与中间件",
  "01-kafka": "Kafka",
  "02-redis": "Redis",
  "03-mysql": "MySQL",
  "04-distributed-transaction": "分布式事务",
  "05-foundation-framework": "基础框架",
  "01-spring": "Spring",
  "01-spring-ioc": "Spring-IOC",
  "02-spring-aop": "Spring-AOP",
  "06-algorithm": "算法",
  "01-sword-offer": "剑指Offer",
  "02-leetcode": "LeetCode",
  "03-sorting-algorithm": "排序算法",
  "07-practice": "实践",
  "01-site-optimization": "站点优化",
  "02-thinking-and-scheme": "思考与方案",
  "03-artificial-intelligence": "人工智能",
  "04-utility-code": "实用代码",
  "08-open-source-project": "开源项目",
  "01-rpamis": "Rpamis",
  "01-utils": "Utils",
  "02-exception": "Exception",
  "03-security": "Security",
  "09-milestone": "里程碑",
  "10-about": "关于",
  "11-design-pattern": "设计模式",
  "01-state-machine-mode": "状态机模式",
};
