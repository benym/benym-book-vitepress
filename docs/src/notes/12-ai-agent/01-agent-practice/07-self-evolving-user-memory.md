---
title: 自进化的用户记忆-让AI Agent在多轮对话中更懂你
description: 自进化的用户记忆-让AI Agent在多轮对话中更懂你
categories: 
  - AI人工智能
tags: 
  - AI
  - Agent
  - Self-evolving
  - Memory
keywords: AI,Agent,Self-evolving,Memory
date: 2026-4-10 16:03:37
author: benym
---

# 自进化的用户记忆-让AI Agent在多轮对话中更懂你

大概2025年的12月初，最开始这个功能由我提交在Spring AI Alibaba DeepResearch项目中，对应的issue为[feat(memory): self-evolving user role memory-enabling the agent to better understand the user in multi-turn conversations.
](https://github.com/spring-ai-alibaba/deepresearch/pull/20)

那时候Claude Code的Skill还没有成为开放标准，OpenClaw也还没有正式发布开源，写完代码后一直没来得及整理。时间来到2026年4月，关于自进化、自我提升的Skill已经火遍全网，回过头来发现当时对这项技术的判断果然是没错的。
之所以研究这个主题是因为相信Memory一定会成为AI Agent以后极具区分度的能力，2025年中旬我在日常的上网冲浪中发现学术圈对Memory的研究逐渐开始朝向一个主题，叫`Self-evolving`，一些论文开始研究从怎么让Agent从多轮交互中自己学习到东西，而不是依靠用户告诉他应该记什么。
当时火热的Mem0和MemBank等采用LLM识别增删改查操作来实现长期记忆的迭代更新，虽然是可以一定程度的记忆住信息，但想法还是相对比较基础。2025年中时这个主题的研究方向主要分为2种实现方式，1种是工程侧的自进化记忆，另外1中是Agent RL从模型侧上实现自进化记忆，这两条路都做出了不错的实现。
由于RL的记忆目前还在探索阶段，为Agent构建奖励信号来学习一个可增量训练的小记忆模块是一个很好的idea，个人觉得以后记忆留在模型侧才是最终的体现。但在模型侧记忆展示还不够成熟的时候，采用工程方式实现自进化记忆也是一种当前的解决方案。本文主要基于工程角度来讲，怎么去设计一种可以自进化的用户记忆

## 设计动机

回想一个以前的场景，在使用AI的时候，用户通常会在对话中告诉AI一些信息，甚至一些职业信息。比如最早期模型能力不够强的时候，经常会假定AI是个什么角色，或者告诉AI用户自己是什么角色/职业，来让AI更好的理解用户的需求。
比如说用户告诉AI自己是个学生，AI就会在回答问题的时候更倾向于从学生的角度去回答，或者用户告诉AI自己是个程序员，AI就会在回答问题的时候更倾向于从程序员的角度去回答。
这种方式要求每次会话都需要让重复写一些prompt，AI并没有记住内容，这样做不够智能。所以一个基本的想法是，有没有一种机制能够让AI从对话中自己去学习，然后用这些学习到的内容去引导AI在后续的聊天，形成一种进化闭环。
于是我就设计了一种用户角色记忆：让Agent通过**主动**分析用户的聊天内容，实时、持续地通过多轮对话学习用户的潜在特征，支持在多轮对话中的自进化和更新记忆信息，并利用这些特征指导Agent生成更适合用户的对话内容

## 整体架构

Self-evolving User Role Memory采用了和Mem0类似的机制，把记忆分为了`extract`和`update`两个阶段
与Mem0不同，对话级记忆引导需要快速和实时处理，更侧重于短期记忆而非生成knowledge graph实体关系结构等内容。
所以在做这项功能的时候，我把他定义为会话级的自进化短期记忆，而非跨会话上的长期记忆(其实这部分代码也是类似的，在短期记忆里面处理不同主题冲突，应用到多个会话即可)。
因此，角色记忆在实现上通常使用与短期记忆相同的存储方法，例如内存存储或Redis

### 阶段1: Extract

这定义了一个`ShortUserRoleExtractResult`实体，具体如下，包括`ConversationAnalysis`、`IdentifiedRole`和`CommunicationPreferences`。尝试使用这三种方向来描述用户的当前角色和沟通偏好

定义代码为
```ts
interface ConversationAnalysis {
    confidenceScore: number; // The confidence score ranges from 0 to 1
    interactionCount: number; // The number of interactions in the current session
}

interface IdentifiedRole {
  possibleIdentities : string[]; // List of possible identities, like "software_engineer", "housewife", etc.
  primaryCharacteristics: string[]; // Main character feature tags
  evidenceSummary: string[]; // Summary of identification basis
  confidenceLevel: 'LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH'; // Confidence level  
}

interface CommunicationPreferences {
  detailLevel: 'CONCISE' | 'BALANCE' | 'COMPREHENSIVE'; // Detail preference level
  contentDepth: 'OVERVIEW' | 'PRACTICAL' | 'CONCEPTUAL'; // Content depth
  responseFormat: 'CONCISE' | 'DETAILED' | 'STRUCTURED_WITH_EXAMPLES'; // Preference response format
}

interface ShortUserRoleExtractResult {
  conversationAnalysisInfo: ConversationAnalysis;
  identifiedRole: IdentifiedRole;
  communicationPreferences: CommunicationPreferences;
  userOverview: string; // To describe User information in one sentence based on identifiedRole and communicationPreferences, the occupation information in possibleIdentities must be used
}
```
对于每个用户question，ShortMemoryAgent将参考historical user questions提取用户角色记忆。

- ConversationAnalysis：包含了当前会话的分析信息，包括置信度分数和交互次数
- IdentifiedRole包含了对用户角色的识别结果，包括可能的身份、主要特征、识别依据总结和置信水平
- CommunicationPreferences包含了用户的沟通偏好，包括细节层次、内容深度和响应格式
- ShortUserRoleExtractResult则是整个提取结果的封装，包含了上述三个部分的信息以及一个基于identifiedRole和communicationPreferences生成的用户概述userOverview，用于一句话描述用户的信息和偏好，用作后期引导条件。

对于具体字段的设计需要强校验的使用枚举值，强制要求LLM回答符合枚举，避免回答不规范的解析问题

字段解析：
- confidenceLevel: 置信度水平，LOW(低)、MEDIUM(中)、MEDIUM_HIGH(中高)、HIGH(高)
- detailLevel: 细节层次，CONCISE(简洁)、BALANCE(平衡)、COMPREHENSIVE(全面)
- contentDepth: 内容深度，OVERVIEW(概览)、PRACTICAL(实用)、CONCEPTUAL(概念)
- responseFormat: 响应格式，CONCISE(简洁)、DETAILED(详细)、STRUCTURED_WITH_EXAMPLES(结构化且带示例)

Q: 对于Extract阶段，为什么我们只需要考虑用户的提问，而不需要在上下文中提供LLM的回答?
A: 在设计Extract的时候，我只把用户的每一次提问作为历史传入到了LLM中，而刻意忽略掉了LLM的回答，这种设计主要是来源于一种现象直觉。即在人际沟通中，人们可以通过观察说话者的言辞来推断其大致身份和沟通习惯。然而，对方在沟通中所说的话并不能决定我的角色或背景；相反，我所说的话对于定义我的用户身份才是最重要的

### 阶段2: Update

在Update阶段，我设计了3种重要的记忆

- Current Extract Memory: 在阶段1生成的当前的用户角色记忆，基于当前的用户问题和历史用户问题生成
- Previous Extract Memory: 最新的用户角色记忆。在一次对话中只有一个最近的用户角色记忆，因为角色记忆应该随着每个用户的问题而不断更新
- History Extract Track: 用户角色记忆的历史演变轨迹

在更新阶段，此部分会传输当前用户角色记忆(Current Extract Memory)和当前轮次提取的最新用户角色记忆(Previous Extract Memory)，以及历史用户角色记忆轨迹(History Extract Track)。如果提取的当前用户角色记忆和最新用户角色记忆超过设定的阈值，则会触发`UPDATE`操作，该操作会将相似的词和特征合并。
如果两者差异显著，则会参考历史提取轨迹来确定是否执行一个操作UPDATE。如果两者仍然不同，则会触发`NONE CHANGE`操作不改变用户角色记忆，并返回最新的用户角色记忆

### 核心逻辑总览

工程化核心代码实现在`ShortUserRoleMemoryNode`，这种设计使得用户角色记忆更适合于多轮对话场景

![](https://img.benym.cn/self-evolving-memory/1.png)

## Case Study

### Conversation memory(No Plan模式)

![](https://img.benym.cn/self-evolving-memory/2.png)

返回报文

```json
{
  "code": 200,
  "status": "success",
  "message": "",
  "data": [
    {
      "messageType": "USER",
      "metadata": {
        "messageType": "USER"
      },
      "media": [
      ],
      "text": "我想做红烧肉给家人吃"
    },
    {
      "messageType": "ASSISTANT",
      "metadata": {
        "finishReason": "STOP",
        "search_info": "",
        "id": "8be26c58-0881-4601-9dba-b7bc0921f162",
        "role": "ASSISTANT",
        "messageType": "ASSISTANT",
        "reasoningContent": ""
      },
      "toolCalls": [
      ],
      "media": [
      ],
      "text": "红烧肉是一道非常受欢迎的家常菜，做法也相对简单。下面是一个基础版本的红烧肉食谱供您参考：\n\n### 材料\n- 五花肉 500克\n- 生姜几片\n- 葱 2根\n- 八角 2颗\n- 老抽、生抽各适量\n- 糖（最好是冰糖）3大勺\n- 清水足够覆盖肉块\n- 料酒少许\n\n### 做法\n1. **准备材料**：将五花肉切成约2厘米见方的小块；生姜切片；葱打结。\n2. **焯水**：把切好的五花肉放入冷水中，加入少量料酒和几片生姜，大火煮开后撇去浮沫，捞出洗净备用。\n3. **炒糖色**：锅中放少量油，加入糖小火慢慢加热至糖融化并开始变色成琥珀色时，迅速加入焯好水的五花肉快速翻炒均匀，使肉块表面裹上糖色。\n4. **调味炖煮**：向锅中加入足够的热水（没过肉），再加入剩余的生姜片、葱结、八角以及老抽调色调味，大火烧开后转小火慢炖约1小时左右或直到肉质软烂。\n5. **收汁**：待肉快熟时开大火收汁，根据个人口味调整盐分，并且可以适当增加一些生抽提鲜。\n6. **完成**：最后撒上葱花即可出锅享用啦！\n\n希望这个简单的步骤能帮助到你，给家人带来一顿美味的红烧肉！如果需要更详细的步骤或者其他建议，请随时告诉我。"
    },
    {
      "messageType": "USER",
      "metadata": {
        "messageType": "USER"
      },
      "media": [
      ],
      "text": "有老人和小孩，可以调整下食谱吗"
    },
    {
      "messageType": "ASSISTANT",
      "metadata": {
        "finishReason": "STOP",
        "search_info": "",
        "id": "1571fcda-d3a6-4c33-8111-8126fad74c96",
        "role": "ASSISTANT",
        "messageType": "ASSISTANT",
        "reasoningContent": ""
      },
      "toolCalls": [
      ],
      "media": [
      ],
      "text": "当然可以调整，考虑到老人和小孩的口味偏好以及消化能力，这里有一些小建议来调整红烧肉的做法：\n\n1. **减少糖量**：因为老人和小孩可能对甜食比较敏感，你可以适当减少糖的用量。如果原本使用了3大勺糖，那么可以尝试减至2大勺或更少。\n\n2. **增加蔬菜**：在炖煮过程中加入一些容易消化且富含纤维素的蔬菜如胡萝卜、土豆等，不仅能让菜肴更加营养均衡，还能让口感更加丰富多样。\n\n3. **软烂易嚼**：确保五花肉炖得足够软烂，这样更容易被老人和孩子咀嚼吞咽。烹饪时间可以适当延长至1小时半甚至更长，直到肉质非常柔软为止。\n\n4. **调味清淡**：除了减少糖外，还可以稍微减少酱油（尤其是老抽）的使用量以降低咸度；同时避免使用过多辛辣调料，保持整体味道温和。\n\n5. **去皮处理**：对于五花肉中的肥肉部分，可以选择去除表皮或者只保留少量脂肪层，这样既能保证菜品的风味又不会过于油腻。\n\n按照以上几点调整后的红烧肉应该会更适合全家人的口味哦！希望这些建议对你有所帮助。"
    }
  ]
}
```

### User Role Memory(Plan模式)

历史用户角色提取轨迹 - 基于用户对话动态进化的用户角色信息，我们可以明显看到随着对话轮次的增加，用户的角色信息和偏好开始变得逐渐清晰

![](https://img.benym.cn/self-evolving-memory/3.png)

返回报文
```json
{
  "code": 200,
  "status": "success",
  "message": "",
  "data": [
    {
      "messageType": "SYSTEM",
      "metadata": {
        "messageType": "SYSTEM"
      },
      "text": {
        "userId": "MOCK_USER_ID",
        "conversationId": "7ad1d39a-d8b5-41d0-aaa1-c6442fb4fb83",
        "userQuery": "研究下回锅肉的做法",
        "conversationAnalysis": {
          "confidenceScore": 0.7,
          "interactionCount": 1
        },
        "identifiedRole": {
          "possibleIdentities": [
            "家庭主妇",
            "烹饪爱好者"
          ],
          "primaryCharacteristics": [
            "注重实际操作",
            "关注具体步骤"
          ],
          "evidenceSummary": [
            "询问了回锅肉的做法"
          ],
          "confidenceLevel": "MEDIUM"
        },
        "communicationPreferences": {
          "detailLevel": "CONCISE",
          "contentDepth": "PRACTICAL",
          "responseFormat": "CONCISE"
        },
        "userOverview": "一位注重实际操作的家庭主妇或烹饪爱好者，倾向于简洁明了的步骤说明",
        "creatTime": "2025-12-01 18:18:19",
        "updateTime": ""
      }
    },
    {
      "messageType": "SYSTEM",
      "metadata": {
        "messageType": "SYSTEM"
      },
      "text": {
        "userId": "MOCK_USER_ID",
        "conversationId": "7ad1d39a-d8b5-41d0-aaa1-c6442fb4fb83",
        "userQuery": "改进一下口味，让他更加适合于老人和小孩",
        "conversationAnalysis": {
          "confidenceScore": 0.8,
          "interactionCount": 2
        },
        "identifiedRole": {
          "possibleIdentities": [
            "家庭主妇",
            "烹饪爱好者"
          ],
          "primaryCharacteristics": [
            "注重健康饮食",
            "关注家庭成员需求"
          ],
          "evidenceSummary": [
            "要求改进菜的口味以适合老人和小孩",
            "之前询问了回锅肉的做法"
          ],
          "confidenceLevel": "HIGH"
        },
        "communicationPreferences": {
          "detailLevel": "BALANCE",
          "contentDepth": "PRACTICAL",
          "responseFormat": "STRUCTURED_WITH_EXAMPLES"
        },
        "userOverview": "一位注重健康饮食的家庭主妇或烹饪爱好者，关注家庭成员的需求，希望获得适合老人和小孩的实用食谱建议",
        "creatTime": "2025-12-01 18:24:35",
        "updateTime": "2025-12-01 18:24:59"
      }
    },
    {
      "messageType": "SYSTEM",
      "metadata": {
        "messageType": "SYSTEM"
      },
      "text": {
        "userId": "MOCK_USER_ID",
        "conversationId": "7ad1d39a-d8b5-41d0-aaa1-c6442fb4fb83",
        "userQuery": "我想在进一步研究一下适合于家庭成员的回锅肉做法，详细一点",
        "conversationAnalysis": {
          "confidenceScore": 0.8,
          "interactionCount": 3
        },
        "identifiedRole": {
          "possibleIdentities": [
            "家庭主妇",
            "烹饪爱好者"
          ],
          "primaryCharacteristics": [
            "注重实际操作",
            "关注细节",
            "注重健康饮食",
            "关注家庭成员需求"
          ],
          "evidenceSummary": [
            "询问了回锅肉的详细做法",
            "之前询问过回锅肉的做法",
            "要求改进菜的口味以适合老人和小孩"
          ],
          "confidenceLevel": "HIGH"
        },
        "communicationPreferences": {
          "detailLevel": "COMPREHENSIVE",
          "contentDepth": "PRACTICAL",
          "responseFormat": "STRUCTURED_WITH_EXAMPLES"
        },
        "userOverview": "一位注重实际操作、细节、健康饮食和家庭成员需求的家庭主妇或烹饪爱好者，希望获得详细的回锅肉做法说明以及适合老人和小孩的改良建议",
        "creatTime": "2025-12-01 18:26:12",
        "updateTime": "2025-12-01 18:26:27"
      }
    }
  ]
}
```
关联的用户会话记忆
```json
{
  "code": 200,
  "status": "success",
  "message": "",
  "data": [
    {
      "messageType": "USER",
      "metadata": {
        "messageType": "USER"
      },
      "media": [
      ],
      "text": "研究下回锅肉的做法"
    },
    {
      "messageType": "ASSISTANT",
      "metadata": {
        "messageType": "ASSISTANT"
      },
      "toolCalls": [
      ],
      "media": [
      ],
      "text": "# Key Points\n- 回锅肉是一道经典川菜，核心步骤包括煮肉、煸炒和调味。\n- 煮肉时需冷水下锅，加入料酒和葱段，煮至筷子能轻松插入后切片。\n- 煸炒时要将五花肉的油脂充分炒出，搭配蒜米或花椒增加香味。\n- 调味料的选择和火候控制是回锅肉香而不腻的关键。\n- 不同做法在细节上有所差异，但基本流程一致。\n\n---\n\n# Overview\n回锅肉作为川菜中的经典代表，以其鲜香不腻、口感丰富的特点深受喜爱。这道菜的核心在于通过煮、炒两步工艺处理五花肉，并结合调味料使其风味浓郁。本报告旨在梳理回锅肉的烹饪步骤，分析其关键环节，并提供简洁明了的操作指南，帮助家庭主妇或烹饪爱好者快速掌握制作技巧。\n\n---\n\n# Detailed Analysis\n\n## 1. 煮肉：奠定基础口感\n煮肉是回锅肉的第一步，也是确保肉质鲜嫩的重要环节。根据研究发现，以下步骤至关重要：\n- **冷水下锅**：冷水煮肉可以避免肉质因骤热而收缩，保持肉质柔软。\n- **去腥增香**：加入料酒和葱段可有效去除腥味，同时增添香气。\n- **煮至适中**：煮至表皮变白且筷子能轻松插入即可，避免过度煮烂影响后续煸炒。\n\n| 步骤           | 操作方法                              | 目的               |\n|----------------|-------------------------------------|--------------------|\n| 冷水下锅       | 将五花肉与冷水一同加热              | 避免肉质收缩       |\n| 加入调料       | 放入料酒、葱段                      | 去腥增香           |\n| 控制时间       | 煮至筷子能轻松插入                 | 确保肉质适中       |\n\n案例参考：某家常做法建议煮好后静置半小时再切片，以进一步锁住肉汁（来源见参考资料）。\n\n---\n\n## 2. 煸炒：提升香气与口感\n煸炒是回锅肉的灵魂步骤，通过高温将五花肉中的油脂逼出，使成品香而不腻。具体操作如下：\n- **热锅冷油**：使用菜籽油时无需等油热即可下锅，中小火煸炒更佳。\n- **灯盏窝形状**：当肉片卷曲成“灯盏窝”状时，说明水分已被炒干，此时肉质最佳。\n- **辅料搭配**：加入蒜米或花椒等辅料，进一步提升香气。\n\n| 关键点         | 具体操作                             | 效果               |\n|----------------|------------------------------------|--------------------|\n| 灯盏窝状态     | 中小火煸炒至肉片卷曲               | 提升口感层次       |\n| 辅料选择       | 蒜米、花椒                          | 增加香气           |\n| 油脂处理       | 充分炒出肥肉中的油脂               | 减少油腻感         |\n\n案例参考：某餐厅级做法强调使用菜籽油并先下肉片，以保留传统风味。\n\n---\n\n## 3. 调味：赋予独特风味\n调味是回锅肉最后一步，决定了整道菜的风味特色。常见的调味料包括豆瓣酱、甜面酱、酱油等，这些调料不仅提味，还能让肉片更加红亮诱人。\n- **豆瓣酱**：为回锅肉提供咸香微辣的基础味道。\n- **甜面酱**：增加一丝甜味，平衡整体口感。\n- **翻炒均匀**：调味料需与肉片充分混合，确保每一片肉都入味。\n\n| 调味料        | 功能                               | 使用建议           |\n|---------------|----------------------------------|--------------------|\n| 豆瓣酱        | 提供咸香微辣                     | 适量即可           |\n| 甜面酱        | 增加甜味                         | 根据个人口味调整   |\n| 酱油          | 上色                             | 最后加入           |\n\n---\n\n## 4. 细节优化：个性化调整\n不同地区和个人习惯可能会对回锅肉的做法进行细微调整，例如：\n- **火候控制**：全程中小火更适合新手操作，避免烧焦。\n- **辅料变化**：青椒、洋葱等蔬菜可作为配菜，丰富营养和口感。\n- **提前准备**：煮好的五花肉可冷藏保存，方便随时取用。\n\n---\n\n# Survey Note (Optional)\n本报告综合了多篇关于回锅肉的文章和教程，涵盖了从家常到餐厅级别的多种做法。由于部分资料未标明具体数据，因此在实际操作中可能需要根据个人经验进行微调。\n\n---\n\n# Key Citations\n- [回锅肉的做法_经典川菜，下饭好菜](https://home.meishichina.com/recipe-130687.html)  \n- [如何炒出餐廳等級的回鍋肉？正確作法別漏掉！](https://blog.icook.tw/posts/145604)  \n- [回锅肉的家常做法，这样制作香浓不腻，美味下饭](http://www.360doc.com/content/22/1203/23/1339386_1058733874.shtml)  \n- [薇式回锅肉【中餐厅】的做法步骤](https://m.xiachufang.com/recipe/104046904/)  \n- [今天研究有香草味的回锅肉](https://www.facebook.com/ljloo68/posts/2797129930603713/)"
    },
    {
      "messageType": "USER",
      "metadata": {
        "messageType": "USER"
      },
      "media": [
      ],
      "text": "改进一下口味，让他更加适合于老人和小孩"
    },
    {
      "messageType": "ASSISTANT",
      "metadata": {
        "finishReason": "STOP",
        "search_info": "",
        "role": "ASSISTANT",
        "id": "7a4b90b7-faf6-4ca8-a0d5-40b93ffcb2c0",
        "messageType": "ASSISTANT",
        "reasoningContent": ""
      },
      "toolCalls": [
      ],
      "media": [
      ],
      "text": "为了使回锅肉更适合老人和小孩食用，我们可以从以下几个方面进行调整：\n\n1. **减少辛辣**：老人和小孩的肠胃可能对辛辣食物比较敏感，因此可以减少或省略豆瓣酱的使用，或者选择辣度较低的豆瓣酱。如果完全不加豆瓣酱，可以通过增加甜面酱的比例来弥补风味。\n\n2. **软化肉质**：确保五花肉煮得足够软烂，这样更容易咀嚼和消化。可以在煮肉时延长烹饪时间，并且在切片前让肉稍微冷却一下，这样更容易切成薄片而不散开。\n\n3. **健康调味**：使用低钠酱油和其他调味品，以减少盐分摄入；同时控制糖的用量，避免过甜。可以考虑加入一些天然食材如姜、蒜等来提味，而不是过多依赖加工调料。\n\n4. **增加蔬菜**：添加适量的蔬菜不仅可以丰富营养成分，还能改善口感。例如，胡萝卜、青椒（去籽）、洋葱都是不错的选择。这些蔬菜不仅颜色鲜艳吸引孩子，而且富含维生素和纤维素，有助于促进消化。\n\n5. **温和调味**：采用更加温和的调味方式，比如使用少量的生抽、老抽调色，以及适量的白糖提鲜，保持整体口味清新自然。\n\n### 改良版回锅肉食谱\n\n#### 材料\n- 五花肉 300克\n- 胡萝卜 1根\n- 青椒 1个（可选）\n- 洋葱 半个\n- 生姜 几片\n- 大蒜 几瓣\n- 甜面酱 1大勺\n- 低钠酱油 1小勺\n- 白糖 半小勺\n- 料酒 适量\n- 葱段 适量\n- 清水 适量\n- 菜籽油 适量\n\n#### 做法\n1. **准备材料**：将五花肉洗净后放入冷水中，加入几片生姜和葱段，大火烧开后撇去浮沫，转中小火慢炖约30分钟至肉质变软但不散。\n   \n2. **切片处理**：待肉凉透后切成薄片备用；胡萝卜、青椒、洋葱分别洗净切丝。\n\n3. **炒制过程**：\n   - 热锅冷油下入五花肉片，用中小火慢慢煸炒至表面微黄并卷曲成“灯盏窝”状。\n   - 加入切好的姜蒜末翻炒出香味。\n   - 接着依次加入胡萝卜丝、青椒丝及洋葱丝快速翻炒均匀。\n   - 最后调入甜面酱、低钠酱油、白糖以及少许料酒继续翻炒至上色均匀即可出锅装盘。\n\n通过以上改良措施，可以使这道传统川菜变得更加适合家庭成员中不同年龄段的人群享用，既保留了原有的美味特色又兼顾了健康需求。希望这个建议对你有所帮助！"
    },
    {
      "messageType": "USER",
      "metadata": {
        "messageType": "USER"
      },
      "media": [
      ],
      "text": "我想在进一步研究一下适合于家庭成员的回锅肉做法，详细一点"
    },
    {
      "messageType": "ASSISTANT",
      "metadata": {
        "messageType": "ASSISTANT"
      },
      "toolCalls": [
      ],
      "media": [
      ],
      "text": "# Key Points\n- 回锅肉的核心步骤包括煮肉、煸炒和调味，使用五花肉、豆瓣酱、蒜苗等基础食材。\n- 适合老人和小孩的改良版回锅肉建议减少油腻感、降低辣度，并增加蔬菜搭配。\n- 健康调整包括选用瘦肉比例更高的部位、减少油脂用量、搭配易消化的蔬菜。\n- 烹饪时注意火候控制，避免过焦或过油，确保肉质嫩滑且易于咀嚼。\n\n---\n\n# Overview\n回锅肉是一道经典的川菜，以其香辣浓郁的味道深受喜爱。然而，传统的回锅肉可能过于油腻或辛辣，不适合老人和小孩食用。本报告旨在提供一份详细的家庭版回锅肉制作方法，并针对老人和小孩的需求提出改良建议，以满足不同家庭成员的口味与健康需求。\n\n---\n\n# Detailed Analysis\n\n## 1. 回锅肉的基本做法\n回锅肉的传统制作过程分为三个主要步骤：煮肉、煸炒和调味。以下是详细的步骤说明：\n\n### (1) 准备食材\n- **主料**：选择肥瘦相间的五花肉（约300克），确保口感层次丰富。\n- **辅料**：青椒、蒜苗、姜片、蒜末等。\n- **调料**：郫县豆瓣酱、甜面酱、酱油、料酒、白糖、盐。\n\n### (2) 煮肉\n- 将五花肉冷水下锅，加入葱段、姜片和料酒去腥，煮至筷子能轻松插入（约15-20分钟）。\n- 捞出后冷却，切成约2元硬币厚的薄片，便于后续煸炒。\n\n### (3) 煸炒\n- 热锅冷油，将切好的肉片放入锅中，用中小火煸炒至卷曲成“灯盏窝”状，逼出多余油脂。\n- 加入姜片、蒜末、豆瓣酱翻炒出红油，随后加入甜面酱、酱油等调味料。\n\n### (4) 调味与收尾\n- 加入青椒、蒜苗等配菜，快速翻炒均匀，最后根据个人口味调整盐分即可出锅。\n\n---\n\n## 2. 改良建议：适合老人和小孩的版本\n为了适应老人和小孩的饮食需求，可以从以下几个方面对传统回锅肉进行改良：\n\n### (1) 减少油腻感\n- **选用瘦肉比例更高的部位**：如猪里脊或鸡胸肉，减少脂肪含量。\n- **控制油脂用量**：煸炒时尽量逼出多余油脂，避免过油。\n- **使用健康油品**：如橄榄油或玉米油，代替传统的菜籽油，减少饱和脂肪摄入。\n\n### (2) 降低辣度\n- **减少辣椒和辣味调料**：如豆瓣酱和辣椒酱的用量，以适应小孩和老年人的口味。\n- **增加甜味**：适当加入少量糖或甜面酱，让味道更柔和。\n- **使用低盐酱油**：减少钠摄入，更适合老年人健康饮食。\n\n### (3) 增加营养搭配\n- **搭配蔬菜**：加入青椒、胡萝卜、洋葱等蔬菜，提升维生素和纤维素摄入。\n- **搭配主食**：如米饭或面条，有助于消化吸收。\n\n### (4) 切片更薄\n- 将五花肉切得更薄一些，使其更容易咀嚼和消化，尤其适合老人和小孩。\n\n---\n\n## 3. 其他注意事项\n- **提前准备**：煮好的五花肉可以冷藏保存，方便下次快速使用。\n- **火候控制**：全程使用中小火，避免烧焦或粘锅。\n- **卫生安全**：注意食材新鲜度，尤其是肉类，避免变质引发健康问题。\n\n---\n\n# Survey Note\n本报告综合了多个来源的视频教程、文字说明以及用户评论，结合实际操作经验，提出了适合家庭制作的回锅肉详细步骤及改良建议。由于部分数据来源于非专业渠道，可能存在一定主观性。\n\n---\n\n# Key Citations\n- [回锅肉这样做，简单又好吃 - TikTok](https://www.tiktok.com/@user6963761036556/video/7577379774792879378)  \n- [轻松做出家常回锅肉,美食,美食教学,好看视频](https://haokan.baidu.com/v?pd=wisenatural&vid=11344966261624000822)  \n- [祭拜肉品這樣做！簡單又下飯！冰箱剩食也能大翻身【回鍋肉】](https://www.youtube.com/watch?v=wMtcsfJXgjI)  \n- [老公最爱回锅肉，简单做一锅，川味十足，家里也能轻松复制！](https://haokan.baidu.com/v?pd=wisenatural&vid=5462758488125479642)  \n- [在家做回锅肉，轻松掌握家常美味！](https://haokan.baidu.com/v?pd=wisenatural&vid=6178495915616329954)"
    }
  ]
}
```

### 用户角色记忆引导效果

可以明显看到随着聊天的深入，产出的报告，变得更加适合用户的身份背景

![](https://img.benym.cn/self-evolving-memory/4.png)

## 核心配置

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
其中引导的范围分为NONE, ONCE, EVERY三种，分别代表不引导、首次引导和每次引导。
更新相似度阈值则是用来判断当前提取的用户角色记忆与之前的用户角色记忆是否需要进行更新的一个重要参数，范围在0到1之间，默认值为0.8，在实现的过程中不仅代码上有阈值控制，prompt上也有。
历史用户问题数量则是指在提取用户角色记忆时，LLM会参考的历史用户问题的数量。
核心Prompt在`shortmemory-extract.md`和`shortmemory-update.md`中，基本上思想就是约束规则+few shot示例+冲突主题示例

## 总结
在Skill流行的今天，自进化主题变得越来越重要，了解各种Memory工程侧做法有助于设计出更好的自进化机制，本文提供了一种基于用户角色记忆的短期记忆设计和实现方案，也是一种工程侧尝试
