---
title: Spring AI Alibaba DeepResearch源码解读
description: DeepResearch源码解读
categories: 
  - AI人工智能
tags: 
  - AI
  - Agent
  - Multi Agent
  - Reflection
  - Plan and Execute
  - Vector Search
  - RAG
keywords: AI,Agent,Multi Agent,Reflection,Plan and Execute,Vector Search,RAG
date: 2025-12-5 17:08:01
author: benym
---

# Spring AI Alibaba DeepResearch源码解读

DeepResearch是由SAA社区发起的一个智能体项目，参考了许多市面上DeepResearch Agent的相关用法。对于用户而言，可以通过这样的系统实现复杂的信息搜索、分析到产出结构化报告的全流程。

本文主要介绍DeepResearch项目在实现过程中的一些关键源码。

## 官方整体架构

![](https://img.benym.cn/deepresearch/deepresearch-workflow.png)

官方仓库内这张图能够大致的描述出DeepResearch项目的整体架构，但其实读源码之后还有更多的技术细节没有在图中表达，比如Hybrid RAG，Reflection机制等

## 核心Graph节点

DeepResearch通过SAA Graph构建了一个多节点的智能体系统，其Plant UML图结构如下

![](https://img.benym.cn/deepresearch/deepresearch-graph.png)

在`com.alibaba.cloud.ai.example.deepresearch.config.DeepResearchConfiguration`中，我们可以看到DeepResearch的Graph节点配置以及边关系

共有13个节点，功能如下：
- `CoordinatorNode(协调节点)`：根据用户提问信息，识别任务类型走接下来的流程，非任务类型直接结束；
- `RewriteAndMultiQueryNode(重写和扩展节点)`：优化用户提问信息，并扩展为多个语义；
- `BackgroundInvestigationNode(背景调查节点)`：利用搜索引擎查询问题相关资讯，可根据主题类型(学术研究、生活旅游、百科、数据分析、通用研究)定向查找对应内容；
- `PlannerNode(规划节点)`：将任务拆解为几个步骤；
- `InformationNode(信息节点)`：判断搜寻的内容是否充足；
- `HumanFeedbackNode(人类节点)`：支持用户新增反馈内容；
- `ParallelExecutorNode(并行执行节点)`：设置子Plan Step结果，Reflection调度；
- `ResearchTeamNode(研究组节点)`：异步并行执行ReseacherNode、CoderNode，等待返回结果；
- `ReseacherNode(研究者节点)`：调用搜索引擎，可根据主题类型查找对应内容；
- `CoderNode(数据处理节点)`：调用python处理工具，进行数据分析；
- `RagNode(Rag节点)`：针对用户上传的文件，针对提问进行检索出相关内容；
- `ProfessionalKbDecisionNode(专业知识库决策节点)`：根据查询内容和知识库描述智能判断是否需要查询专业知识库
- `ReporterNode(报告节点)`：整合上述所有节点整理的内容，生成对应的报告；

// todo
