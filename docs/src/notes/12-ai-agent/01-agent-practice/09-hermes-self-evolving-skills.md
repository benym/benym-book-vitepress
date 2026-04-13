---
title: Hermes Agent自进化技能系统-让AI学会新技能
description: Hermes Agent自进化技能系统-通过SKILLS_GUIDANCE和skill_manage工具实现程序性记忆的自进化
categories:
  - AI人工智能
tags:
  - AI
  - Agent
  - Hermes
  - Skills
  - Self-evolving
keywords: AI,Agent,Hermes,Skills,Self-evolving
date: 2026-4-13 18:00:00
author: benym
---

# Hermes Agent自进化技能系统-让AI学会新技能

在上一篇介绍了 Hermes 的记忆系统后，这次我想聊聊它的技能系统。如果说记忆是"知道什么"，那技能就是"怎么做"。

Hermes 的技能系统让我印象最深的是：它能让 AI 在使用过程中自己学习新技能，而且用的时候发现问题还会自己修补。这种自进化的感觉真的很神奇。

## 为什么需要技能系统

传统的 AI Agent 有个痛点：每次遇到复杂任务都要从头解决。即使之前成功解决过类似问题，也无法复用之前的经验。

我举个例子：假设你让 AI 帮你调试 Docker 网络问题，它花了好一番功夫终于解决了。过几天你又遇到类似的问题，它还是得重新来过，完全不记得上次是怎么解决的。

Hermes 的做法是：让 AI 把成功的解决方法保存为"技能"，下次遇到类似问题就能直接复用。

## 核心设计：SKILLS_GUIDANCE

和记忆系统一样，Hermes 也是通过提示词来引导 AI 创建技能的：

```python
# agent/prompt_builder.py:164-171
SKILLS_GUIDANCE = (
    "After completing a complex task (5+ tool calls), fixing a tricky error, "
    "or discovering a non-trivial workflow, save the approach as a "
    "skill with skill_manage so you can reuse it next time.\n"
    "When using a skill and finding it outdated, incomplete, or wrong, "
    "patch it immediately with skill_manage(action='patch') — don't wait to be asked. "
    "Skills that aren't maintained become liabilities."
)
```

这段提示词有几个关键点：

1. **明确的触发条件**：复杂任务（5+工具调用）、修复棘手错误、发现非平凡工作流
2. **主动改进要求**：使用时发现问题要立即修补，不等用户说
3. **维护责任强调**：不维护的技能会成为负债

我特别欣赏最后那句话："Skills that aren't maintained become liabilities." 这提醒 AI 不要盲目积累技能，要确保技能始终有效。

## SKILL_MANAGE_SCHEMA：完整的工具接口

光有指导还不够，还得给 AI 一个强大的工具接口：

```python
# tools/skill_manager_tool.py:653-673
SKILL_MANAGE_SCHEMA = {
    "name": "skill_manage",
    "description": (
        "Manage skills (create, update, delete). Skills are your procedural "
        "memory — reusable approaches for recurring task types. \n\n"
        "Create when: complex task succeeded (5+ calls), errors overcome, "
        "user-corrected approach worked, non-trivial workflow discovered...\n\n"
        "Update when: instructions stale/wrong, OS-specific failures, "
        "missing steps or pitfalls found during use. "
        "If you used a skill and hit issues not covered by it, patch it immediately.\n\n"
        "After difficult/iterative tasks, offer to save as a skill. "
        "Good skills: trigger conditions, numbered steps with exact commands, "
        "pitfalls section, verification steps."
    ),
    "parameters": {
        "action": {
            "enum": ["create", "patch", "edit", "delete",
                      "write_file", "remove_file"]
        },
        "name": "Skill name (lowercase, hyphens/underscores, max 64 chars)",
        "content": "Full SKILL.md content (YAML frontmatter + markdown body)",
        "old_string": "Text to find in the file (required for 'patch')",
        "new_string": "Replacement text (required for 'patch')",
        "file_path": "Path to supporting file",
        "file_content": "Content for the file (required for 'write_file')",
    }
}
```

我注意到这个设计提供了 6 种操作，比记忆系统的 3 种多多了：

- `create`：创建新技能
- `patch`：修补技能的部分内容
- `edit`：编辑整个技能文件
- `delete`：删除技能
- `write_file`：添加支持文件（参考资料、脚本等）
- `remove_file`：删除支持文件

这种设计让 AI 能够非常精细地管理技能，不是简单的 CRUD。

## 技能自进化完整流程

让我用一个实际的例子来说明技能是如何自进化的。

### 阶段1：任务完成

你说："帮我调试这个 Docker 网络问题"

AI 执行了一堆工具调用，试了好几种方法，终于解决了问题。

### 阶段2：触发判断

AI 收到 SKILLS_GUIDANCE 的指导，发现自己刚才执行了 5+ 个工具调用，符合"复杂任务"的条件，于是决定创建一个技能。

### 阶段3：生成技能文件

AI 自动生成一个 SKILL.md 文件：

```markdown
---
name: docker-network-debug
category: devops
description: Debug Docker container network connectivity issues
trigger: Container cannot reach external services or other containers
---

# Docker Network Debugging

## When to use
When a container cannot reach external services or other containers.

## Steps
1. Check container is running: `docker ps`
2. Inspect container network settings: `docker inspect <container>`
3. Test from inside container: `docker exec <container> ping <target>`
4. Check bridge network: `docker network inspect bridge`
5. Verify DNS resolution: `docker exec <container> nslookup example.com`

## Common pitfalls
- Custom firewall rules may block container traffic
- Overlay networks require key-value store configuration
- Windows/Mac networking differs from Linux
```

### 阶段4：写入文件

AI 调用 `skill_manage(action="create", ...)` 把技能保存到 `~/.hermes/skills/devops/docker-network-debug/SKILL.md`。

### 阶段5：下次自动加载

下次会话开始时，AI 会扫描技能目录，把这个新技能加入到可用技能列表中。当你再遇到 Docker 网络问题时，AI 就会自动加载这个技能。

## 技能使用与即时改进

我觉得最神奇的是这个"即时改进"机制。

假设 AI 在使用某个技能时发现遗漏了步骤，或者某个命令在特定系统上不工作，它会立即调用 `skill_manage(action='patch')` 修补技能，而不是等用户反馈。

这种主动维护的态度让我感觉 AI 不再是被动执行指令的工具，而是一个会自我反思、自我改进的"助手"。

## 两层缓存机制

技能系统还有一个让我印象深刻的设计：两层缓存。

第一层是进程内 LRU 缓存，最多缓存 64 个条目。当技能目录没有变化时（mtime/size 相同），直接返回缓存的索引。

第二层是磁盘快照缓存，存储在 `~/.hermes/.skills_snapshot.json`，包含预解析的技能元数据。

这种设计避免了每次会话都重新解析所有 SKILL.md 文件，提高了启动速度。

## 技能目录结构

Hermes 的技能目录组织得很有条理：

```
~/.hermes/skills/
├── bundled/              # 内置技能（100+）
│   ├── development/      # 开发相关
│   ├── devops/           # 运维相关
│   └── data-science/     # 数据科学
│
├── user/                 # AI 创建的技能
│   └── docker-network-debug/
│       ├── SKILL.md      # 主指令文件（必需）
│       ├── references/   # 参考文档
│       ├── templates/    # 输出模板
│       ├── scripts/      # 可执行脚本
│       └── assets/       # 补充资源
│
└── hub/                  # 社区共享技能（agentskills.io）
```

我觉得这个设计有几个亮点：

1. **bundled** 和 **user** 分开，内置技能和用户技能清晰分离
2. 每个技能都是一个目录，可以包含多个支持文件
3. 预留了 **hub** 目录用于社区技能共享

## 技能加载与条件过滤

Hermes 还有一个很实用的功能：条件过滤。

比如某个技能只适用于 Linux 平台，那在 Windows 上就不应该显示。或者某个技能是"备用方案"，当有更好的工具时就应该隐藏。

这个是通过 `_skill_should_show()` 函数实现的：

```python
# agent/prompt_builder.py:532-560
def _skill_should_show(
    conditions: dict,
    available_tools: "set[str] | None",
    available_toolsets: "set[str] | None",
) -> bool:
    # fallback_for: 当主要工具可用时隐藏此技能
    for ts in conditions.get("fallback_for_toolsets", []):
        if ts in available_toolsets:
            return False
    # requires: 当必需的工具不可用时隐藏此技能
    for ts in conditions.get("requires_toolsets", []):
        if ts not in available_toolsets:
            return False
    return True
```

这种渐进式披露的设计让技能列表不会太长，AI 也不会被不相关的技能干扰。

## 自进化的三个层面

Hermes 的自进化其实体现在三个层面：

### 短期学习（会话内）

- 上下文压缩：token 紧张时保留关键信息
- 迭代修正：用户反馈立即应用到当前任务
- 工具选择优化：根据成功/失败调整策略

### 中期记忆（跨会话）

- 持久化记忆：MEMORY.md/USER.md 在会话间保持
- 会话搜索：检索历史对话
- 用户建模：理解用户深度特征

### 长期积累（技能库）

- 技能创建：成功方法转化为可复用技能
- 技能改进：使用中发现问题自动修补
- 技能同步：社区分享与安装

这三个层面层层递进，让 AI 能够从单次会话的学习，积累到跨会话的记忆，最终形成长期的技能库。

## 不是机器学习，是提示词工程

我在研究源码的时候发现一个有趣的事实：Hermes 的自进化不是靠机器学习，而是靠提示词工程 + 工具调用。

- **触发机制**：通过 SKILLS_GUIDANCE 告诉 LLM 什么时候应该创建技能
- **创建机制**：通过 skill_manage 工具让 LLM 能够自主创建/修改技能文件
- **改进机制**：通过 SKILL_MANAGE_SCHEMA 引导 LLM 在使用技能时发现问题立即修补
- **复用机制**：通过 build_skills_system_prompt() 在每次会话时自动加载所有可用技能

没有复杂的进化算法，没有神经网络训练，只有清晰的提示词指令和工具接口。

但我觉得这恰恰是它的优势：简单、可解释、易于调试。LLM 根据这些指导自主决定何时创建、何时改进、如何使用技能。

## 实际使用体验

我自己试用了一段时间，感觉技能系统确实让 AI 变得更"聪明"了。

最明显的体验是：重复问题的解决速度变快了。比如之前花很久才解决的 Docker 网络问题，现在几秒钟就搞定了。

还有一个让我惊喜的发现：AI 会主动总结我没注意到的模式。有次我让它处理几种不同格式的数据文件，它居然自己总结出了一个通用的工作流，保存成了技能。

## 总结

Hermes 的技能系统给我最大的感受是：**好的设计不需要复杂的技术**。

它没有用强化学习训练技能，没有用向量数据库匹配相似问题，就是用简单的提示词 + 文件存储 + 工具调用，却实现了真正的自进化。

我觉得这种设计思路值得学习：

1. **明确的目标**：不是所有问题都需要技能，只保存"复杂任务"的解决方法
2. **主动维护**：使用时发现问题立即修补，不等用户反馈
3. **简单存储**：用 Markdown 文件存储技能，易于阅读和编辑
4. **条件过滤**：只显示相关的技能，避免信息过载

如果你也在做类似的 AI Agent 项目，我建议可以参考一下 Hermes 的技能系统设计。说不定你会发现，让 AI 学会新技能其实没那么难。

当然，这套系统也不是完美的。比如技能质量控制可能是个问题，AI 可能会创建一些不太有用的技能。但随着使用，有效的技能会被反复使用，无效的技能会被遗忘，这本身就是一个自然选择的过程。

总的来说，我觉得 Hermes 的技能系统为我们展示了一个可行的方向：让 AI 不再是被动执行指令的工具，而是能够主动学习、自我改进的"助手"。
