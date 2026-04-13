---
title: Hermes Agent自进化记忆机制-让AI记住你说过的话
description: Hermes Agent自进化记忆机制-通过MEMORY_GUIDANCE和冻结快照实现跨会话持久记忆
categories:
  - AI人工智能
tags:
  - AI
  - Agent
  - Hermes
  - Memory
  - Self-evolving
keywords: AI,Agent,Hermes,Memory,Self-evolving
date: 2026-4-13 18:00:00
author: benym
---

# Hermes Agent自进化记忆机制-让AI记住你说过的话

最近在研究 Hermes Agent 这个项目的时候，发现它的记忆系统设计得特别有意思。用过 AI 的朋友应该都有这种感觉：每次开新会话都要重新告诉 AI 你的偏好，特别累。Hermes 用了一个很巧妙的方式解决了这个问题。

## 为什么需要记忆系统

传统的 AI 对话有个很明显的问题：每次会话都是独立的。你今天告诉 AI 你喜欢简洁的回答，明天它又忘了。你昨天说过的项目约定，今天它又不知道了。

这种体验其实挺让人沮丧的。Hermes 的做法是引入了一套**持久化记忆系统**，让 AI 能够：

- 主动识别并保存有价值的用户偏好和环境信息
- 在会话间保持这些记忆，下次自动加载
- 通过冻结快照机制保证系统提示词的稳定性

## 核心设计：MEMORY_GUIDANCE

我觉得 Hermes 最聪明的地方在于，它不是靠复杂的算法来实现记忆，而是通过**提示词工程**来引导 LLM 自己决定什么时候该保存记忆。

看看这段 `MEMORY_GUIDANCE` 的内容：

```python
# agent/prompt_builder.py:145-156
MEMORY_GUIDANCE = (
    "You have persistent memory across sessions. Save durable facts using the memory "
    "tool: user preferences, environment details, tool quirks, and stable conventions. "
    "Memory is injected into every turn, so keep it compact and focused on facts that "
    "will still matter later.\n"
    "Prioritize what reduces future user steering — the most valuable memory is one "
    "that prevents the user from having to correct or remind you again. "
    "User preferences and recurring corrections matter more than procedural task details.\n"
    "Do NOT save task progress, session outcomes, completed-work logs, or temporary TODO "
    "state to memory; use session_search to recall those from past transcripts. "
    "If you've discovered a new way to do something, solved a problem that could be "
    "necessary later, save it as a skill with the skill tool."
)
```

这段提示词其实告诉了 LLM 几件事：

1. 你有持久化记忆，要用 memory 工具保存有价值的信息
2. 记忆会被注入到每轮对话中，所以要保持简洁
3. 最有价值的记忆是那些能避免用户重复纠正的内容
4. 不要保存任务进度这类临时状态，用 session_search 查询历史就好
5. 如果发现新的解决方法，保存为 skill 而不是 memory

我觉得这里有个很核心的理念：**区分"记忆"和"技能"**。用户偏好、环境细节是记忆，而解决方法是技能。

## MEMORY_SCHEMA：工具调用接口

光有指导还不够，还得给 LLM 一个明确的工具接口。这就是 `MEMORY_SCHEMA` 的作用：

```python
# tools/memory_tool.py:489-538
MEMORY_SCHEMA = {
    "name": "memory",
    "description": (
        "Save durable information to persistent memory that survives across sessions. "
        # ... 完整的描述
    ),
    "parameters": {
        "action": {"enum": ["add", "replace", "remove"]},
        "target": {"enum": ["memory", "user"]},
        "content": "Entry content (for add/replace)",
        "old_text": "Identifies entry to replace/remove",
    },
}
```

这个设计其实很巧妙：

- `action` 有三种操作：添加、更新、删除
- `target` 分为两类：`memory`（AI 的笔记）和 `user`（用户画像）
- 通过 `old_text` 定位要修改或删除的条目

我发现这种设计让 LLM 能够非常精确地操作记忆，不会出现"想改但改不到"的情况。

## 冻结快照：我见过最优雅的解决方案

在研究源码的时候，我发现了一个特别有意思的设计：**冻结快照机制**。

这个设计解决了一个很实际的问题：LLM API 对系统提示词变化很敏感，如果会话中途修改了记忆内容，整个前缀缓存就会失效。

Hermes 的做法是：

1. 会话开始时加载一次记忆，捕获为冻结快照
2. 整个会话期间使用这个快照注入系统提示词
3. 新写入的记忆保存到文件，但不影响当前会话
4. 下次会话开始时才会重新加载，包含新的记忆

```python
# tools/memory_tool.py:335-346
def format_for_system_prompt(self, target: str) -> str:
    """Return the frozen snapshot for system prompt injection.

    This ALWAYS returns the snapshot captured at session start,
    never the live state. The live state can have new entries
    added during the session, but those don't affect the prompt
    until the next session (prefix cache stability).
    """
    return self._system_prompt_snapshot.get(target, "")
```

这种设计让我想起数据库的 MVCC 机制，都是通过"读写分离"来保证一致性。

## 记忆文件格式：简单但有效

Hermes 的记忆存储方式特别简单，就是纯文本文件：

```
~/.hermes/memories/
├── MEMORY.md      # Agent的个人笔记（2200字符限制）
├── USER.md        # 用户画像与偏好（1375字符限制）
├── MEMORY.md.lock # 文件锁（并发写入安全）
└── USER.md.lock
```

每个条目用 `§` 分隔：

```python
ENTRY_DELIMITER = "§"

# 文件内容：
用户使用Rust开发，项目使用Axum框架§偏好简洁的回答风格§项目使用Docker部署§

# 解析时：
entries = raw.split("§")
# → ["用户使用Rust开发...", "偏好简洁的回答...", "项目使用Docker部署..."]
```

我一开始觉得这种设计太简单了，但后来发现简单其实有简单的好处：

- 易于调试，可以直接打开文件查看
- 易于备份，直接复制文件就行
- 有字符限制，强迫保持精简

## 安全机制：不得不防

由于记忆内容会被直接注入到系统提示词中，安全问题就变得特别重要。Hermes 在这方面做得挺周到的。

首先是威胁模式检测：

```python
_MEMORY_THREAT_PATTERNS = [
    # 提示词注入攻击
    (r'ignore\s+(previous|all|above|prior)\s+instructions', "prompt_injection"),
    (r'you\s+are\s+now\s+', "role_hijack"),
    # ... 更多模式
]
```

然后是隐形 Unicode 字符检测，这个我之前都没想过：

```python
_INVISIBLE_CHARS = {
    '\u200b', '\u200c', '\u200d',  # 零宽空格
    '\u2060', '\ufeff',             # 零宽非连字符、BOM
    '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',  # 双向文本覆盖
}
```

零宽度字符攻击是一种高级注入技术，攻击者可以在看似正常的内容中隐藏恶意代码。Hermes 直接把这些字符全部屏蔽，挺果断的。

## 原子写入：细节见功底

在研究源码的时候，我还发现了一个小细节：Hermes 使用临时文件 + 原子重命名的方式来保证并发安全。

```python
@staticmethod
def _write_file(path: Path, entries: List[str]):
    """Write entries to a memory file using atomic temp-file + rename.

    Previous implementation used open("w") + flock, but "w" truncates the
    file *before* the lock is acquired, creating a race window where
    concurrent readers see an empty file. Atomic rename avoids this:
    readers always see either the old complete file or the new one.
    """
    content = ENTRY_DELIMITER.join(entries) if entries else ""
    try:
        fd, tmp_path = tempfile.mkstemp(
            dir=str(path.parent), suffix=".tmp", prefix=".mem_"
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, str(path))
        except BaseException:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
```

注释里写得很清楚：之前的实现用 `open("w") + flock`，但 `"w"` 会在获取锁之前就清空文件，造成竞态窗口。原子重命名避免了这个问题，读者要么看到旧文件，要么看到新文件，不会看到空文件。

这种细节让我感觉到作者确实在生产环境中踩过坑，不是纸上谈兵。

## 实际使用体验

我自己试用了一段时间，感觉记忆系统确实让体验提升了不少。

比如我告诉它我用 Rust 开发，之后它推荐方案的时候就会优先考虑 Rust 生态。我说过我喜欢简洁的回答，之后的回复就变得更精炼了。

最让我惊喜的是，它会记住一些我都没注意到的细节。比如我无意中提到过"我们团队周五不部署"，之后它真的会在周五提醒我这个约定。

## 和其他方案对比

| 特性 | Hermes Memory | Mem0 | 传统方案 |
|------|--------------|------|---------|
| 存储格式 | 纯文本 + 字符限制 | 向量数据库 | 无 |
| 快照机制 | 冻结快照（前缀缓存友好） | 动态查询 | 无 |
| 安全扫描 | 完整注入检测 | 基础验证 | 无 |
| 字符限制 | 2200/1375 | 无限制 | 无 |

我觉得 Hermes 的设计更偏向实用主义，不求最新最炫的技术，但求稳定可靠。

## 总结

Hermes 的记忆系统给我最大的感受是：**简单的设计往往更有效**。

它没有用复杂的向量化数据库，没有用语义搜索，就是用纯文本 + 提示词工程 + 冻结快照，却解决了一个很实际的问题。

我觉得这种设计思路值得学习：不是所有问题都需要用最前沿的技术来解决，有时候简单直接的方案反而更好。

当然，这套系统也不是完美的。比如字符限制可能会导致一些信息被截断，纯文本存储也不利于语义搜索。但对于当前的使用场景来说，它已经足够好了。

如果你也在做类似的 AI Agent 项目，我建议可以参考一下 Hermes 的记忆系统设计。说不定你会发现，简单才是最好的。
