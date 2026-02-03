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

共有14个节点，功能如下：
- `CoordinatorNode(协调者节点)`：根据用户提问信息，识别任务类型走接下来的流程，非任务类型直接结束；
- `RewriteAndMultiQueryNode(重写和扩展节点)`：优化用户提问信息，并扩展为多个语义；
- `BackgroundInvestigationNode(背景调查节点)`：利用搜索引擎查询问题相关资讯，可根据主题类型(学术研究、生活旅游、百科、数据分析、通用研究)定向查找对应内容；
- `PlannerNode(计划节点)`：将任务拆解为几个步骤；
- `InformationNode(信息节点)`：判断搜寻的内容是否充足；
- `HumanFeedbackNode(人类节点)`：支持用户新增反馈内容；
- `ParallelExecutorNode(并行执行节点)`：设置子Plan Step结果，Reflection调度；
- `ResearchTeamNode(研究组节点)`：异步并行执行ReseacherNode、CoderNode，等待返回结果；
- `ReseacherNode(研究者节点)`：调用搜索引擎，可根据主题类型查找对应内容；
- `CoderNode(数据处理节点)`：调用python处理工具，进行数据分析；
- `RagNode(Rag节点)`：针对用户上传的文件，针对提问进行检索出相关内容；
- `ProfessionalKbDecisionNode(专业知识库决策节点)`：根据查询内容和知识库描述智能判断是否需要查询专业知识库
- `ReporterNode(报告节点)`：整合上述所有节点整理的内容，生成对应的报告；
- `ShortUserRoleMemoryNode(短期用户角色记忆节点)`: 自进化的用户角色记忆，根据用户多轮对话识别用户的背景信息和沟通偏好，并引导模型生成符合用户偏好的回答

在上述节点的支撑下，引入了如下技术点：多模型配置、提示词工程、多Agent写协作、LLM Reflection(反思)机制、Plan and Execute(任务规划)、Graph(节点并行、流式输出、人类反馈)工作流搭建、工具及自定义MCP配置、RAG专业知识库、Self-evolution(自进化)角色记忆、链路可观测、报告内容在线可视化。

接下来我们从最顶层的节点开始从上往下分析DeepResearch的实现

Tip: 如果是第一次接触这个项目建议先看如下这些类

`com.alibaba.cloud.ai.example.deepresearch.config.DeepResearchConfiguration`：DeepResearch建立Graph配置，串联所有节点和节点流转过程

`com.alibaba.cloud.ai.example.deepresearch.agents.AgentModelsConfiguration`：多ChatClient模型bean注入

`com.alibaba.cloud.ai.example.deepresearch.agents.AgentsConfiguration`：多Agent初始化

`com.alibaba.cloud.ai.example.deepresearch.agents.McpAssignNodeConfiguration`：多Agent MCP分配

`com.alibaba.cloud.ai.example.deepresearch.controller.ChatController#ChatController`：Controller初始化时编译图，并设置HITL应该打断的地方，能够走到人类反馈节点的前置节点可根据业务逻辑动态设置，比如在任意节点中更新下一跳为`human_feedback`，然后在定义图时添加条件边

`src/main/resources/model-config.json`：多Agent采用的模型设置

`src/main/resources/mcp-config.json`：多Agent绑定的MCP

## CoordinatorNode(协调者节点)

`src/main/resources/prompts/coordinator.md`

协调者节点主要读取这个prompt文件，主要作为前置意图识别，内部对于闲聊和计划型问题进行区分

其中绑定了一个空的Tool工具，绑定配置在`com.alibaba.cloud.ai.example.deepresearch.agents.AgentsConfiguration#coordinatorAgent`，Tool(`com.alibaba.cloud.ai.example.deepresearch.tool.PlannerTool`)用于识别是否触发了计划，如果触发了计划则在CoordinatorNode中动态设置协调者后续节点为`RewriteAndMultiQueryNode`

协调者和`supervisor`监督者的作用类似，本质都是进行意图识别，只不过协调者意图的是触发计划，而监督者在一般的例子中可以是根据意图选择不同的Agent来进行处理

## RewriteAndMultiQueryNode(重写和扩展节点)

对于用户的提问进行`查询重写 -> 查询扩展`流程

重写和扩展均采用了Spring AI内置的方法，实现比较简单

重写为`org.springframework.ai.rag.preretrieval.query.transformation.RewriteQueryTransformer`

扩展为`org.springframework.ai.rag.preretrieval.query.expansion.MultiQueryExpander`

其中扩展为多少个由项目配置，默认为3个

同时定义了下一步节点为背景调查节点`background_investigator`

## BackgroundInvestigationNode(背景调查节点)

在进行深度研究之前，会首先根据拓展后的提问进行多次网络搜索

- 如果开启了智能Agent功能，则会根据问题进行分类选择，看是否是垂类的Agent能够解答的，每个垂类Agent绑定了对应的搜索平台来源，比如对于学术搜索，会使用`openalex`来源，对于百科搜索，会使用`wikipedia`。
- 如果没有开启智能Agent功能，则默认搜索引擎为`tavilySearch`，AgentType为`GENERAL_RESEARCH`通用研究类型

提问的分类问题依旧是属于意图识别，只不过这次识别需要模型输出对应的AgentType，可以从prompt中查看到`src/main/resources/prompts/multiagent/classifier.md`

具体的代码为

```java
for (String query : queries) {
	// 使用统一的智能搜索选择方法
	SmartAgentUtil.SearchSelectionResult searchSelection = smartAgentSelectionHelper
		.intelligentSearchSelection(state, query);
	List<Map<String, String>> results;

	// 使用支持工具调用的搜索方法
	results = searchInfoService.searchInfo(StateUtil.isSearchFilter(state), searchSelection.getSearchEnum(),
			query, searchSelection.getSearchPlatform());
	resultsList.add(results);
}
```

具体的搜索服务实现由下列这些包提供

[](https://img.benym.cn/deepresearch/deepresearch-search-impl.png)

展开其中一个搜索查看实现，可以发现对于这些api都是采用的http请求

[](https://img.benym.cn/deepresearch/deepresearch-search-baidu.png)

由于各个搜索引擎返回的数据不一样，DeepResearch在处理这些信息时统一规定了一些key，如title、content、url、weight权重、source来源

```java
/**
 * 将工具调用结果转换为标准搜索结果格式
 */
private List<Map<String, String>> convertToSearchResults(List<SearchService.SearchContent> contents,
       SearchPlatform platform) {

    List<Map<String, String>> results = new ArrayList<>();

    for (SearchService.SearchContent content : contents) {
       Map<String, String> result = new HashMap<>();
       result.put("title", content.title() != null ? content.title() : "未知标题");
       result.put("content", content.content() != null ? content.content() : "无内容描述");
       result.put("url", content.url() != null ? content.url() : "");
       result.put("weight", "1.0"); // 工具调用结果默认权重
       result.put("source", platform.getName()); // 标识数据来源
       results.add(result);
    }

    logger.info("工具调用搜索完成: platform={}, results_count={}", platform.getName(), results.size());
    return results;
}
```

如果系统内并没有工具搜索的服务注入，则回退到传统搜索，同样采用的是`tavilySearch`搜索，对于搜索到的结果按照权重排序，如果启用了`Jina Crawler`则还会将搜索到的url进行传递，通过`Jina AI`的能力进行`url`网页内容爬取，然后重新格式化为大模型友好的`content`

获取到搜索结果之后，将会将这些搜索信息作为side info(辅助信息)交给大模型，具体实现上的表现为，组装了隐式组装了一个UserMessage，整个历史的报告信息一起输入给背景调查Agent处理

[](https://img.benym.cn/deepresearch/deepresearch-search-background.png)

之后如果是开启了深度研究，则将背景调查的信息交给Plan，否则则直接进入Report环节

## PlannerNode(计划节点)



## Search API



## RAG

