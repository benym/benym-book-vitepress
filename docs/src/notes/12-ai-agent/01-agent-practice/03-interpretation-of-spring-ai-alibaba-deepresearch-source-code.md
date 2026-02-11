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

[DeepResearch](https://github.com/spring-ai-alibaba/deepresearch)是由SAA社区发起的一个智能体项目，参考了许多市面上DeepResearch Agent的相关用法。对于用户而言，可以通过这样的系统实现复杂的信息搜索、分析到产出结构化报告的全流程。

本文主要介绍DeepResearch项目在实现过程中的一些关键源码。

## 官方整体架构

![](https://img.benym.cn/deepresearch/deepresearch-workflow.png)

官方仓库内这张图能够大致的描述出DeepResearch项目的整体架构，但其实读源码之后还有更多的技术细节没有在图中表达，比如Plan设计，Reflection机制，Hybrid RAG等

## 核心Graph节点

DeepResearch通过SAA Graph构建了一个多节点的智能体系统，其Plant UML图结构如下

![](https://img.benym.cn/deepresearch/deepresearch-graph.png)

在`com.alibaba.cloud.ai.example.deepresearch.config.DeepResearchConfiguration`中，我们可以看到DeepResearch的Graph节点配置以及边关系

共有14个节点，功能如下：
- `ShortUserRoleMemoryNode(短期用户角色记忆节点)`: 自进化的用户角色记忆，根据用户多轮对话识别用户的背景信息和沟通偏好，并引导模型生成符合用户偏好的回答
- `CoordinatorNode(协调者节点)`：根据用户提问信息，识别任务类型走接下来的流程，非任务类型直接结束；
- `RewriteAndMultiQueryNode(重写和扩展节点)`：优化用户提问信息，并扩展为多个语义；
- `BackgroundInvestigationNode(背景调查节点)`：利用搜索引擎查询问题相关资讯，可根据主题类型(学术研究、生活旅游、百科、数据分析、通用研究)定向查找对应内容；
- `PlannerNode(计划节点)`：将任务拆解为几个步骤；
- `InformationNode(信息节点)`：判断搜寻的内容是否充足；
- `HumanFeedbackNode(人类节点)`：支持用户新增反馈内容；
- `ParallelExecutorNode(并行执行节点)`：设置子Plan Step结果，Reflection调度；
- `ResearchTeamNode(研究组节点)`：异步并行执行ResearcherNode、CoderNode，等待返回结果；
- `ReseacherNode(研究者节点)`：调用搜索引擎，可根据主题类型查找对应内容；
- `CoderNode(数据处理节点)`：调用python处理工具，进行数据分析；
- `RagNode(Rag节点)`：针对用户上传的文件，针对提问进行检索出相关内容；
- `ProfessionalKbDecisionNode(专业知识库决策节点)`：根据查询内容和知识库描述智能判断是否需要查询专业知识库
- `ReporterNode(报告节点)`：整合上述所有节点整理的内容，生成对应的报告；

在上述节点的支撑下，引入了如下技术点：多模型配置、提示词工程、多Agent写协作、LLM Reflection(反思)机制、Plan and Execute(任务规划)、Graph(节点并行、流式输出、人类反馈)工作流搭建、工具及自定义MCP配置、RAG专业知识库、Self-evolution(自进化)角色记忆、链路可观测、报告内容在线可视化。

接下来我们从最顶层的节点开始从上往下分析 DeepResearch 的实现

Tip: 如果是第一次接触这个项目建议先看如下这些类

`com.alibaba.cloud.ai.example.deepresearch.config.DeepResearchConfiguration`：DeepResearch建立Graph配置，串联所有节点和节点流转过程

`com.alibaba.cloud.ai.example.deepresearch.agents.AgentModelsConfiguration`：多ChatClient模型bean注入

`com.alibaba.cloud.ai.example.deepresearch.agents.AgentsConfiguration`：多Agent初始化

`com.alibaba.cloud.ai.example.deepresearch.agents.McpAssignNodeConfiguration`：多Agent MCP分配

`com.alibaba.cloud.ai.example.deepresearch.controller.ChatController#ChatController`：Controller初始化时编译图，并设置HITL应该打断的地方，能够走到人类反馈节点的前置节点可根据业务逻辑动态设置，比如在任意节点中更新下一跳为`human_feedback`，然后在定义图时添加条件边

`src/main/resources/model-config.json`：多Agent采用的模型设置

`src/main/resources/mcp-config.json`：多Agent绑定的MCP

## ShortUserRoleMemoryNode(短期用户角色记忆节点)

ShortUserRoleMemory节点主要负责根据用户的多轮对话进行角色记忆的自进化，通过角色记忆来塑造用户的背景信息和沟通偏好，从而引导模型生成符合用户偏好的回答，达成用户聊天越多，模型越懂你的效果。比如LLM在面对小学生和大学生时回答应该是明显不一样的，这个节点主要是参考了类似mem0的机制来实现self-evolution的角色记忆。

这点可以展开的很多后续将专门写文章解析，下面列出自进化角色记忆示意图，以及对应的pr，可自行查看动机和实现内容

Pull Request https://github.com/spring-ai-alibaba/deepresearch/pull/20

![](https://img.benym.cn/deepresearch/deepresearch-self-evolution-usermemory.png)

## CoordinatorNode(协调者节点)

`src/main/resources/prompts/coordinator.md`

协调者节点主要读取这个prompt文件，主要作为前置意图识别，内部对于闲聊和计划型问题进行区分

其中绑定了一个空的Tool工具，绑定配置在`com.alibaba.cloud.ai.example.deepresearch.agents.AgentsConfiguration#coordinatorAgent`，Tool(`com.alibaba.cloud.ai.example.deepresearch.tool.PlannerTool`)用于识别是否触发了计划，如果触发了计划则在CoordinatorNode中动态设置协调者后续节点为`RewriteAndMultiQueryNode`

协调者和`supervisor`监督者的作用类似，本质都是进行意图识别，只不过协调者意图的是触发计划，而监督者在一般的例子中可以是根据意图选择不同的Agent来进行处理

```java
@Bean
public ChatClient coordinatorAgent(ChatClient.Builder coordinatorChatClientBuilder, PlannerTool plannerTool) {
	return coordinatorChatClientBuilder
		.defaultOptions(ToolCallingChatOptions.builder()
			.internalToolExecutionEnabled(false) // 禁用内部工具执行
			.build())
		// 当前CoordinatorNode节点只绑定一个计划工具
		.defaultTools(plannerTool)
		.build();
}
```

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

![](https://img.benym.cn/deepresearch/deepresearch-search-impl.png)

展开其中一个搜索查看实现，可以发现对于这些api都是采用的http请求

![](https://img.benym.cn/deepresearch/deepresearch-search-baidu.png)

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

![](https://img.benym.cn/deepresearch/deepresearch-search-background.png)

之后如果是开启了深度研究，则将背景调查的信息交给Plan，否则则直接进入Report环节

## PlannerNode(计划节点)

Plan节点将会根据用户提问和背景调查信息，生成深度研究的计划，然后将计划推送给前端展示

这一部分关于计划的生成，主要是通过`src/main/resources/prompts/planner.md`这个prompt文件来实现

在prompt中对于Plan设定角色和分析的细节，让Planner产生一个多Step的Json格式的计划用于后续反序列为Plan实体，其中Step的子步骤数量由占位符{{ max_step_num }}决定，这个变量由系统进行配置，然后传递给大模型前进行prompt渲染

![](https://img.benym.cn/deepresearch/deepresearch-search-planner-json.png)

我们可以看到在一个Plan中含有一个Step数组，也就是将任务拆解为了多个子任务，每个子任务会有自己的标题、描述、是否需要搜索等信息

其中StepType用于区分是研究类的Step还是数据处理类的Step，如果是研究类的Step后续处理时则会进入`ResearcherNode`进行处理，如果是数据处理类的Step则会进入`CoderNode`进行处理

## InformationNode(信息节点)

Information节点主要承接Plan的反序列化，因为即使提示模型输出了Json格式的Plan，但并不代表这个Plan就一定是符合要求的，对于反序列化失败的Plan，会捕获到反序列化异常，然后根据设定的最大重试次数生成Plan，重新设置下一条节点到PlannerNode再次生成计划。

Plan生成成功后，如果在系统设置的时候选择了不自动接受计划，则会动态设置下一条节点为人类反馈节点`human_feedback`，否则进入research_team节点

设置位置在

![](https://img.benym.cn/deepresearch/deepresearch-search-acceptplan.png)

## HumanFeedbackNode(人类反馈节点)

由于在编译Graph时设定了当node_id为`human_feedback`时会打断流程，等待人类反馈，所以在任何节点都可以动态设置下一跳为`human_feedback`，从而实现让用户对当前节点的结果进行反馈。

不过此时还没有进入`HumanFeedbackNode`人类反馈节点，前端此时只展示了Plan的内容，用户可以根据Plan内容进行审核然后输入修改意见，或者接受计划。

再键入意见之后，前端将会调用`com.alibaba.cloud.ai.example.deepresearch.controller.ChatController#resume`恢复接口，带上用户反馈信息进入中断Graph的恢复，此处才会真正进入到`HumanFeedbackNode`节点

节点内处理时如果用户有feedBack反馈，则动态设置下一条节点回到PlannerNode，带上用户的反馈重新生成Plan，否则进入research_team节点

## ResearchTeamNode(研究组节点)

ResearchTeam节点主要负责判断Plan的每个Step是否执行完成，如果没有则走向`parallel_executor`，否则走到`professional_kb_decision`节点，可以理解为一个简单的中间态调度，在一开始所有的Step是都没有执行的，所以一定会走向`parallel_executor`。

我们需要注意的是，ResearchTeam的概念就是研究组，而研究组下面的研究者(ResearcherNode)和编码者(CoderNode)都是在`com.alibaba.cloud.ai.example.deepresearch.config.DeepResearchConfiguration`中循环生成的

具体生成的个数在DeepResearch项目中是通过yaml进行预先配置，默认都是4个，对于这两个节点他们默认在`parallel_executor`节点之后，且下一跳节点都是`research_team`

详细代码为

```java
private void addResearcherNodes(StateGraph stateGraph) throws GraphStateException {
	ReflectionProcessor reflectionProcessor = reflectionProcessor();
	for (int i = 0; i < deepResearchProperties.getParallelNodeCount()
		.get(ParallelEnum.RESEARCHER.getValue()); i++) {
		String nodeId = "researcher_" + i;
		stateGraph.addNode(nodeId,
				node_async(new ResearcherNode(researchAgent, String.valueOf(i), reflectionProcessor,
						mcpProviderFactory, searchFilterService, smartAgentDispatcher, smartAgentProperties,
						jinaCrawlerService)));
		stateGraph.addEdge("parallel_executor", nodeId).addEdge(nodeId, "research_team");
	}
}

private void addCoderNodes(StateGraph stateGraph) throws GraphStateException {
	ReflectionProcessor reflectionProcessor = reflectionProcessor();
	for (int i = 0; i < deepResearchProperties.getParallelNodeCount().get(ParallelEnum.CODER.getValue()); i++) {
		String nodeId = "coder_" + i;
		stateGraph.addNode(nodeId,
				node_async(new CoderNode(coderAgent, String.valueOf(i), reflectionProcessor, mcpProviderFactory)));
		stateGraph.addEdge("parallel_executor", nodeId).addEdge(nodeId, "research_team");
	}
}
```

## ParallelExecutorNode(并行执行节点)

并行执行节点主要是将Plan中的Step状态进行初始化，在`com.alibaba.cloud.ai.example.deepresearch.util.StateUtil`中定义了如下几个状态前缀，可以理解为Plan的子Step的状态机，只不过采用了简单的实现，手动设置状态来进行推进

- `assigned_`: 初始状态，标识Step已分配但未开始执行
- `processing_`: 处理中，标识Step正在执行
- `completed_`: 标识Step已完成
- `waiting_reflecting_`: 标识Step等待反思
- `waiting_processing_`: 标识Step反思后质量不合格再次等待处理
- `error_`: 标识Step执行出错

在系统中其余Research或Code节点，他们在执行过程中会这样拼接，assigned_Step类型_当前节点编号，如assigned_researcher_1

## ResearcherNode(研究者节点)

```java
@Bean
public ChatClient researchAgent(ChatClient.Builder researchChatClientBuilder) {
	ToolCallback[] mcpCallbacks = getMcpToolCallbacks("researchAgent");

	var builder = researchChatClientBuilder.defaultSystem(ResourceUtil.loadResourceAsString(researcherPrompt));
	var toolArray = this.getAvailableTools(JinaCrawlerConstants.TOOL_NAME);
	if (toolArray.length > 0) {
		builder = builder.defaultToolNames(toolArray);
	}
	return builder.defaultToolCallbacks(mcpCallbacks).build();
}
```

研究者节点是由几个并行研究一起工作的，所以第一步就是从上下文中找到属于自己标号的Plan Step，在Research中Reflection反思是默认注入的，首先会判断是否已经进入了反思流程，或者已经完成了，如果都不是则说明才开始处理Step，设置当前Step的状态为`processing_`

![](https://img.benym.cn/deepresearch/deepresearch-research-status.png)

进入研究后首先组装当前Step Task，同时增加上反思的内容(如果有)，将他们合并为一个大的UserMessage，另外动态添加关于search citation引文的规范，为另一个UserMessage。

同样根据上下文搜索引擎的类型和当前Step的Title智能选择回答的Agent，为选择的Agent动态绑定MCP工具，同时将当前Step Task的内容作为query来进行搜索引擎调用，之后将搜索结果和上下文中背景调查的结果`site_information`进行合并，再整体标准化为一个UserMessage后输入给研究者Agent进行处理

![](https://img.benym.cn/deepresearch/deepresearch-research-1.png)

![](https://img.benym.cn/deepresearch/deepresearch-research-2.png)

处理时会进行反思内容判断，如果是反思节点则会注册固定Step Title用于后续推送给前端展示进入了反思，默认一开始时是没有反思的，所以对于Flux处理结束时，会将`executionStatus`设置为`waiting_reflecting_`等待反思的状态

![](https://img.benym.cn/deepresearch/deepresearch-research-3.png)

由于之前配置了ResearchNode的下一条节点为`research_team`，Research执行完毕等待反思后会回到研究组节点判断，由于并不是执行完毕状态，所以研究组会继续走回到`parallel_executor`，而`parallel_executor`的下一条又是各个Research或Coder节点，这意味着，每个Research或Coder至少都会执行2次。

第一次是正常执行，第二次是反思执行查看第一次执行的质量是否达标

当第二次执行时，会带上第一次执行的结果和任务信息交给反思Agent，具体代码为`com.alibaba.cloud.ai.example.deepresearch.util.ReflectionProcessor#performReflection`

```java
/**
 * Perform reflection evaluation
 */
private ReflectionHandleResult performReflection(Plan.Step step, String nodeName, String nodeType) {
	try {
		int attemptCount = getReflectionAttemptCount(step);
		if (attemptCount >= maxReflectionAttempts) {
			logger.warn("Step {} has reached maximum reflection attempts {}, forcing pass", step.getTitle(),
					maxReflectionAttempts);
			step.setExecutionStatus(StateUtil.EXECUTION_STATUS_COMPLETED_PREFIX + nodeName);
			return ReflectionHandleResult.skipProcessing();
		}

		boolean qualityGood = evaluateStepQuality(step, nodeType);

		if (qualityGood) {
			step.setExecutionStatus(StateUtil.EXECUTION_STATUS_COMPLETED_PREFIX + nodeName);
			logger.info("Step {} reflection passed, quality is acceptable", step.getTitle());
			return ReflectionHandleResult.skipProcessing();
		}
		else {
			incrementReflectionAttemptCount(step);
			step.setExecutionStatus(StateUtil.EXECUTION_STATUS_WAITING_PROCESSING + nodeName);
			logger.info("Step {} reflection failed, marked for reprocessing (attempt {})", step.getTitle(),
					attemptCount + 1);
			return ReflectionHandleResult.skipProcessing();
		}

	}
	catch (Exception e) {
		logger.error("Reflection process failed, defaulting to pass: {}", e.getMessage());
		step.setExecutionStatus(StateUtil.EXECUTION_STATUS_COMPLETED_PREFIX + nodeName);
		return ReflectionHandleResult.skipProcessing();
	}
}
```

最大反思次数默认为2次，如果超过2次则强制设置Step为`completed_`完成状态，否则会根据反思结果决定是设置为`completed_`还是`waiting_processing_`等待重新处理

具体质量评估方法为`com.alibaba.cloud.ai.example.deepresearch.util.ReflectionProcessor#evaluateStepQuality`，依旧是`llm as judge`的方式进行质量评估，对应System提示词在`src/main/resources/prompts/reflection.md`中

核心要求模型产出一个`ReflectionResult`的json格式，包含`passed`和`feedback`两个字段，few-short样例为

![](https://img.benym.cn/deepresearch/deepresearch-research-4.png)

如果模型判断不通过，则重新设置Step状态为`waiting_processing_`，然后重新进入Research或Coder节点进行处理，直到产出的质量通过反思或超过最大反思次数为止

## CoderNode(数据处理节点)

CoderNode节点和ResearcherNode节点实现类似，区别在于CoderNode节点调用的是数据处理Agent，且不需要进行搜索引擎调用，他的初始化代码为

```java
/**
 * Create Coder Agent ChatClient Bean
 * @param coderChatClientBuilder ChatClientBuilder McpAsyncClient and the locally
 * configure ToolCallbackProviders.
 * @return ChatClient
 */
@Bean
public ChatClient coderAgent(ChatClient.Builder coderChatClientBuilder, PythonCoderProperties coderProperties) {
	ToolCallback[] mcpCallbacks = getMcpToolCallbacks("coderAgent");

	return coderChatClientBuilder.defaultSystem(ResourceUtil.loadResourceAsString(coderPrompt))
		.defaultTools(new PythonReplTool(coderProperties))
		.defaultToolCallbacks(mcpCallbacks)
		.build();
}
```

默认绑定了一个Python工具Tool，`com.alibaba.cloud.ai.example.deepresearch.tool.PythonReplTool`，用于执行Python代码

![](https://img.benym.cn/deepresearch/deepresearch-research-5.png)

由于在运行环境下直接运行python代码需求的环境不同，且直接操作主机环境风险较高，DeepResearch采用了Docker SDK动态创建Docker容器作为Python代码运行沙箱，并在prompt中要求coderAgent不仅要产出python代码，还需要产出requirements.txt文件内容，用于指定python代码运行时的依赖包

其整体流程代码基本和ResearcherNode类似，这里不再赘述，关于Docker沙箱的创建和脚本运行可自行查看源码

## ProfessionalKbDecisionNode(专业知识库决策节点)

专业知识库主要是集成各种平台的api，或者es中的数据

如阿里云百炼的知识库为例，可以在线上[创建知识库](https://bailian.console.aliyun.com/cn-beijing/?tab=app#/knowledge-base)，然后通过[api的形式进行查询](https://bailian.console.aliyun.com/cn-beijing/?tab=doc#/doc/?type=app&url=2852772)

![](https://img.benym.cn/deepresearch/deepresearch-knowledge.png)

详细的专业知识库配置在`src/main/resources/application-kb.yml`

Agent根据用户的提问来分析适合使用哪些知识库来进行回答，然后将这些模型选择的知识库id传入上下文中，选中知识库后进入`professional_kb_rag`处理，这块主要是用`com.alibaba.cloud.ai.example.deepresearch.service.RagNodeService`来区分到底是采用Hybrid RAG还是传统的多元RAG召回融合

## RagNode(Rag节点)

**Hybrid Rag**:

`com.alibaba.cloud.ai.example.deepresearch.rag.core.DefaultHybridRagProcessor`提供了HybridRag的默认实现框架，主要分为如下几个步骤：

1. 查询前处理
2. 构建过滤表达式
3. 执行Hybrid Retrieve
4. 文档后处理

对于查询前处理，用户的原始提问将经过`TranslationQueryTransformer(查询翻译) -> MultiQueryExpander(查询扩展) -> HyDeTransformer(假设性文档嵌入生成)`进行多元转化

转化之后根据当前的会话id，用户id，来源类型元数据进行ES表达式构建

之后ES根据表达式执行KNN+BM25的混合检索，查询符合用户问题的topK个文档，同时采用RRF融合算法对检索结果进行Rank排序，同时根据文档id进行去重

文档后处理部分是DeepResearch提供的RRF实现，用于召回后进行Rerank，主要是为了克服ES RRF需要收费的问题，所以内置了一个简单的RRF实现，当然这一部分也可以用户自己实现

**多元策略Rag**:

当系统内存在`com.alibaba.cloud.ai.example.deepresearch.rag.strategy.RetrievalStrategy`的实现类Bean时，DeepResearch会采用传统的Rag策略，即多元Rag召回(这里其实每个实现类最终都用的Hybrid Rag框架，我觉得这里不叫传统Rag，叫多元Hybrid Rag更合适)。

系统内有如下3个实现
- `com.alibaba.cloud.ai.example.deepresearch.rag.strategy.ProfessionalKbApiStrategy`: 专业知识库，根据大模型判断问题需要选择的知识库id，调用对于的api进行检索
- `com.alibaba.cloud.ai.example.deepresearch.rag.strategy.ProfessionalKbEsStrategy`: 专业知识库ES自建系统，检索自建ES内的数据
- `com.alibaba.cloud.ai.example.deepresearch.rag.strategy.UserFileRetrievalStrategy`: 用户上传文件检索，针对用户上传的文件进行向量化存储，然后根据问题进行检索，不一定存储在ES可以是任何向量数据库

对于用户上传文件检索来说，后端的接口代码主要在`com.alibaba.cloud.ai.example.deepresearch.controller.RagDataController`，这一部分只实现了后端接口，但前端是没有实现的，需要用户自行实现上传文件的功能

RagDataController用户上传部分的实现是典型的`文件解析 -> 文本分块 -> 富文本Metadata构建 -> embedding向量化 -> 向量存储`流程

从多个渠道召回文档之后，同样采用了内置的RRF进行融合排序

## ReporterNode(报告节点)

报告节点主要负责将之前所有节点处理的内容进行整合，生成最终的报告包含参考文献，包括背景调查信息`background_investigation_results`，研究组的结果`researcherTeam_content`，以及Rag的结果`use_professional_kb`。

处理完毕之后存储当前报告到报告记忆中，如果有多轮对话，则会将之前的报告内容作为上下文传递给报告Agent，进行多轮报告的生成

## 上下文工程

### Memory

DeepResearch中关于Memory的处理主要分为对话记忆，用户角色记忆，报告记忆三种

#### ConversationMemory(对话记忆)

其中对话记忆仍然采用了Spring AI的内置实现，采用滑动窗口式的对话记忆，详细配置在`com.alibaba.cloud.ai.example.deepresearch.config.MemoryConfig`，默认保存100条

会话记忆实现得比较简单，仅在`CoordinatorNode`和`ReporterNode`中进行会话的存储，即保存用户的问题和产出的报告回答，在多轮对话中根据`session_id`进行查询，每次会话均会带上对应的会话历史记录，让模型能够记住之前说的信息

一般来讲，这一块的实现还可以埋点得更细粒度，比如保存模型的思考过程，保存MCP调用的Tool信息等等

#### ShortUserRoleMemory(短期用户角色记忆)

如前文所说，用户角色记忆能够根据用户的多轮对话进行自进化的角色记忆，塑造用户的背景信息和沟通偏好，从而引导模型生成符合用户偏好的回答

其yaml配置如下

```yaml
spring:
  ai:
    alibaba:
      deepresearch:
        # short-term memory configuration
        short-term-memory:
          enabled: true
          # conversation memory configuration
          conversation-memory:
            # maximum Reservation conversation Length
            max-messages: 100
          # user role memory configuration
          user-role-memory:
            # scope of User Role Short-Term Memory Guidance Model Generation
            guide-scope: every
            # The similarity threshold for determining when a memory update is needed ranges from 0 to 1, with a default of 0.8.
            update-similarity-threshold : 0.8
            # Refer to the number of questions asked by users in the past
            history-user-messages-num: 10
          # memory-type
          memory-type: in-memory
```

其中`guide-scope`用户角色记忆引导范围，包含

- `every`: 每次对话都引导
- `once`: 仅第一次对话引导
- `none`: 不引导

系统内的引导方式主要是通过`com.alibaba.cloud.ai.example.deepresearch.util.TemplateUtil#addShortUserRoleMemory`进行设置，并在`BackgroundInvestigationNode`背景调查节点、`CordinatorNode`协调者节点、`PlannerNode`计划节点、`ResearcherNode`研究者节点、`ReporterNode`报告节点中进行调用

主要实现类为`com.alibaba.cloud.ai.example.deepresearch.memory.ShortTermMemoryRepository`

#### ReportMemory(报告记忆)

报告记忆主要负责存储用户的历史报告内容，方便多轮对话时调用，由于实现的先后顺序报告记忆分别有`com.alibaba.cloud.ai.example.deepresearch.service.ReportRedisService`的直接redis存储，和基于Spring AI MessageWindowChatMemory的实现。实现过程比较简单，这里不再赘述

### Reflection

Reflection机制是DeepResearch中一个非常重要的机制，主要用于在Plan执行过程中对每个Step的结果进行质量评估，如果质量不达标则进行重新处理，直到质量达标或者超过最大反思次数为止，本质上还是llm as judge的方式进行实现。

### Tool & MCP

DeepResearch中的Tool主要是`PlannerTool`、`PythonReplTool`、`SearchFilterTool`，前两个分别作用于Planner生成，Coder数据分析，而`SearchFilterTool`则用户Agent判断是否需要进行搜索引擎搜索，但是阅读源码的时候发现目前是强制搜索的，没有绑定Tool。

如果需要绑定这个Tool则它应该定义在`com.alibaba.cloud.ai.example.deepresearch.agents.AgentsConfiguration#researchAgent`中，毕竟在`src/main/resources/prompts/researcher.md`中已经定义了这个Tool可用

![](https://img.benym.cn/deepresearch/deepresearch-tool.png)

DeepResearch的MCP部分支持了JSON化的，多Agent和MCP的绑定，不同于直接使用Spring AI的yaml配置全局MCP，多个Agent时，每个Agent下的MCP工具应该是不同的。初始配置可从这个类查看`com.alibaba.cloud.ai.example.deepresearch.agents.McpAssignNodeConfiguration`。由于MCP连接需要经过initial过程，在项目早期的版本中采用的为项目启动就为所有Agent初始化好MCP连接的形式，

但这样启动项目很快就发现，经过会出现MCP超时，尤其是MCP连接较多的时候，同时维持一些没有使用的长连接，导致资源浪费和性能下降。所以DeepResearch采用了先注入Mcp工厂，再聊天时动态绑定MCP工具到Agent的方式，只有真实产生Agent调用了才会使用MCP。

典型代码如

```java
// 使用MCP工厂创建MCP客户端
AsyncMcpToolCallbackProvider mcpProvider = mcpFactory != null
		? mcpFactory.createProvider(state, "coderAgent") : null;
if (mcpProvider != null) {
	requestSpec = requestSpec.toolCallbacks(mcpProvider.getToolCallbacks());
}
```

## 总结

DeepResearch作为2025年特别热门的AI项目方向，有许多开源产品值得我们学习，SAA DeepResearch基本上囊括了现阶段最为主流，全面的AI技术，如Graph，Plan、Reflection、Tool、MCP、Hybrid RAG、RRF ReRank、HITL、Memory、Online Search、Coding、Sandbox、LLM as Judge、Trace等。

但同样还有许多值得完善的地方

- Memory: Memory一定是上下文工程2026的重点方向，如何用好记忆，将会是Agent的核心竞争力之一，2025年Memory的探索仍然处于怎么存储Memory，和怎么定义长期和短期记忆，且和RAG技术有一定的重叠，如把记忆分为聊天记忆、工作记忆、情景记忆。好的工作比如Mem0和MemoryBank。但很多长期记忆仅仅是存储了就没在深入说到底要用这些长期记忆做些什么，如何用好记忆，将会是2026年Memory的重点方向。好的记忆应该是可以自进化的，self-evolving这个词最近在业界也经常提起，我们可以通过RL算法来实现Memory的自进化。也可以像DeepResearch一样，做工程侧的self-evolving memory用来引导模型生成适合用户背景的回答。甚至Memory本身应该是一个OS系统般的存在
- HITL(人类反馈): 由于Graph本质上还是人工预先编排的workflow，所以HITL人类反馈到底什么时候需要反馈还是人为定义的，Workflow+Agentic的组合非常适合于现存的业务项目朝着AI Agent进行转型，即有一定的智能，但关键节点需要控制。但现在更多的声音我们发现，人类反馈机制其实也可以作为Tool，模型应该自己判断当前的操作是否需要进行人类反馈，比如输出的命令是一个风险命令的时候。
- Evaluation(评测): DeepResearch作为开放式任务，评测会比较困难，由于社区精力的关系没有实现评测这一环，对于Agent效果的评估是非常重要的，如果没有指标评测，甚至会不知道优化方向。对于DeepResearch项目而言，[DeepResearch Bench](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard)就是很好的基准测试。同样的不仅仅是最终效果的评估，Prompt的评估、RAG的评估都将决定整个Agent最终的效果。另外对于线上评测，通常来说开始上线还可以人工收集，但后期bad case应该也采用[Agent自动化收集和打分](https://mp.weixin.qq.com/s/5ytev_RLKutH9S6mgmMQpw)
- MCP & Prompt: DeepResearch为了快速实现多Agent绑定MCP的功能，MCP的配置是采用本地JSON化的，真实的生产环境下应该用Nacos结合Higress完成MCP的注册和发现，包括多模型配置、Prompt的管理也应该存储在其他存储而非本地。比如采用SAA的admin项目来管理Prompt和评测数据集
- 上下文压缩: 对于长程任务，上下文压缩至关重要，这部分在2025年的实现中已经在AI IDE内跑出了许多上下文压缩的落地，包括Spring AI Alibaba和AgentScope也都有了Token的估计，和达到阈值后压缩的功能，这一部分也是实现长期运行的Agent的重要技术，怎样压缩上下文，怎么保留关键信息非常重要
- Agentic API: 基于Graph的API在定义的时候仍然不是很方便，而且Graph其实还是Workflow，当模型能力足够强的时候，我们其实应该以ReActAgent为核心，这也是SAA和AgentScope所实现的，基于Hook机制来扩展Agent，让模型自主选择智能执行的能力放大

## 参考资料
- [Spring AI Alibaba DeepResearch](https://github.com/spring-ai-alibaba/deepresearch)
- [基于Spring AI Alibaba 的 DeepResearch 架构与实践](https://mp.weixin.qq.com/s/JNATHAe2gWpiMNpubj6qAw)
- [DeepResearch Bench](https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard)
- [自动化评测的九九归一—评测agent](https://mp.weixin.qq.com/s/5ytev_RLKutH9S6mgmMQpw)

