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

如果说记忆是AI"知道什么"，那技能就是"怎么做"。传统的AI Agent每次遇到复杂任务都要从头解决，即使之前成功解决过类似问题，也无法复用之前的经验。Hermes的技能系统让AI能够将成功的问题解决方法转化为可复用的技能，并在使用中发现问题时立即修补，实现真正的自进化。

## 技能系统架构概览

技能是Agent的程序性记忆——封装特定任务类型的可执行知识。系统通过`skill_manage`工具让Agent自主创建、编辑和改进技能。

<pre>
┌─────────────────────────────────────────────────────────────┐
│                        技能存储                              │
├─────────────────────────────────────────────────────────────┤
│  bundled/          user/              hub/                   │
│  内置技能100+       Agent创建          社区共享               │
└───────────┬─────────────┬──────────────┬─────────────────────┘
            │             │              │
            ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                        技能管理                              │
├─────────────────────────────────────────────────────────────┤
│  skill_manage                                               │
│  ├─ create    创建新技能                                    │
│  ├─ patch     修补部分内容                                  │
│  └─ delete    删除技能                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        技能加载                              │
├─────────────────────────────────────────────────────────────┤
│  skills_list → skill_view → 两层缓存                        │
│  (Tier1索引)   (Tier2-3)    (LRU+快照)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    系统提示词注入                            │
├─────────────────────────────────────────────────────────────┤
│              build_skills_system_prompt()                    │
└─────────────────────────────────────────────────────────────┘
</pre>

## SKILLS_GUIDANCE：自进化的触发机制

与记忆系统类似，Hermes通过提示词工程引导AI创建技能：

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

这段提示词明确了创建和改进的触发条件：

<pre>
┌─────────────────────────────────────────────────────────────┐
│                      技能创建条件                            │
├─────────────────────────────────────────────────────────────┤
│  • 复杂任务 (5+工具调用)                                     │
│  • 修复棘手错误                                              │
│  • 发现非平凡工作流                                          │
│              ↓                                               │
│        skill_manage create                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      技能改进条件                            │
├─────────────────────────────────────────────────────────────┤
│  • 指令过时/错误                                             │
│  • OS特定失败                                               │
│  • 遗漏步骤/陷阱                                            │
│              ↓                                               │
│        skill_manage patch (立即修补，不等用户反馈)           │
└─────────────────────────────────────────────────────────────┘
</pre>

## SKILL_MANAGE_SCHEMA：完整的工具接口

`SKILL_MANAGE_SCHEMA`定义了skill_manage工具的完整功能，提供了6种操作：

```python
# tools/skill_manager_tool.py:653-673
SKILL_MANAGE_SCHEMA = {
    "name": "skill_manage",
    "description": (
        "Manage skills (create, update, delete). Skills are your procedural "
        "memory — reusable approaches for recurring task types.\n\n"
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

### 六种操作说明

| 操作 | 用途 | 参数 |
|------|------|------|
| create | 创建新技能 | name, content |
| patch | 修补部分内容 | name, old_string, new_string |
| edit | 编辑整个技能文件 | name, content |
| delete | 删除技能 | name |
| write_file | 添加支持文件 | name, file_path, file_content |
| remove_file | 删除支持文件 | name, file_path |

## 技能自进化完整流程

以一个Docker网络调试问题为例，展示技能如何从创建到改进：

<pre>
┌─────────────────────────────────────────────────────────────┐
│                   用户请求调试Docker网络                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent执行5+工具调用，多次重试后解决               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            符合SKILLS_GUIDANCE条件 (5+工具调用)               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              skill_manage(action="create")                   │
│         写入 ~/.hermes/skills/user/docker-network-debug/    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    技能已保存到文件                          │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                   下次会话开始                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│        build_skills_system_prompt() 扫描技能目录             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              新技能出现在可用技能列表中                       │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                   又遇到Docker网络问题                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│         从 skills_list 发现相关技能并加载使用                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              使用时发现遗漏了某个步骤                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│         skill_manage(action="patch") 立即修补                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    技能已更新改进                             │
└─────────────────────────────────────────────────────────────┘
</pre>

### 技能文件示例

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

## 技能索引：渐进式披露

技能系统采用渐进式披露机制，避免一次性加载所有技能内容：

<pre>
┌─────────────────────────────────────────────────────────────┐
│                    Tier 1: 索引层                            │
├─────────────────────────────────────────────────────────────┤
│              skills_list()                                  │
│         返回名称 + 描述 (最小化token使用)                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            注入系统提示词 (available_skills)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              匹配或部分相关？                                 │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼ 是                          ▼ 否
┌─────────────────────────┐    ┌─────────────────────────┐
│   skill_view(name)      │    │      跳过              │
│   按需加载完整内容        │    └─────────────────────────┘
│   (Tier 2-3)            │
└─────────────────────────┘
</pre>

### Tier 1：技能索引

```python
# tools/skills_tool.py:711-776
def skills_list(category: str = None, task_id: str = None) -> str:
    """
    List all available skills (progressive disclosure tier 1 - minimal metadata).

    Returns only name + description to minimize token usage.
    Use skill_view() to load full content, tags, related files, etc.
    """
    all_skills = _find_all_skills()

    if category:
        all_skills = [s for s in all_skills if s.get("category") == category]

    all_skills.sort(key=lambda s: (s.get("category") or "", s["name"]))

    return json.dumps({
        "success": True,
        "skills": all_skills,  # 只包含 name, description, category
        "categories": sorted(set(s.get("category") for s in all_skills)),
        "hint": "Use skill_view(name) to see full content"
    }, ensure_ascii=False)
```

### Tier 2-3：完整内容

```python
# tools/skills_tool.py:779-850
def skill_view(name: str, file_path: str = None, task_id: str = None) -> str:
    """
    View the content of a skill or a specific file within a skill directory.

    Args:
        name: Name or path of the skill
        file_path: Optional path to a specific file (e.g., "references/api.md")
    """
    all_dirs = [SKILLS_DIR] + get_external_skills_dirs()
    skill_dir = _find_skill_dir(name, all_dirs)

    if file_path:
        # 返回特定文件内容
        file_full = skill_dir / file_path
        return {"content": file_full.read_text(encoding="utf-8")}
    else:
        # 返回完整的SKILL.md内容
        skill_md = skill_dir / "SKILL.md"
        return {"content": skill_md.read_text(encoding="utf-8")}
```

## 技能条件过滤

技能系统实现了条件过滤机制，确保只显示相关的技能：

```python
# agent/prompt_builder.py:532-560
def _skill_should_show(
    conditions: dict,
    available_tools: "set[str] | None",
    available_toolsets: "set[str] | None",
) -> bool:
    """Return False if the skill's conditional activation rules exclude it."""
    if available_tools is None and available_toolsets is None:
        return True  # 无过滤信息时显示所有

    at = available_tools or set()
    ats = available_toolsets or set()

    # fallback_for: 当主要工具可用时隐藏此技能
    for ts in conditions.get("fallback_for_toolsets", []):
        if ts in ats:
            return False
    for t in conditions.get("fallback_for_tools", []):
        if t in at:
            return False

    # requires: 当必需工具不可用时隐藏此技能
    for ts in conditions.get("requires_toolsets", []):
        if ts not in ats:
            return False
    for t in conditions.get("requires_tools", []):
        if t not in at:
            return False

    return True
```

### 过滤逻辑

<pre>
┌─────────────────────────────────────────────────────────────┐
│                      技能条件过滤                             │
└─────────────────────────────────────────────────────────────┘

检查 fallback_for_toolsets/tools
    如果主要工具可用 → 隐藏此技能 (作为备用方案)

检查 requires_toolsets/tools
    如果必需工具不可用 → 隐藏此技能

都通过 → 显示此技能
</pre>

### 过滤示例

| 条件 | 行为 |
|------|------|
| `requires_tools: ["web_search"]` | 只在有web_search工具时显示 |
| `fallback_for_tools: ["terminal"]` | 有终端工具时隐藏（备用方案） |
| `platforms: ["linux"]` | 只在Linux平台显示 |
| 无conditions | 总是显示 |

## 两层缓存机制

技能索引使用两层缓存避免重复解析SKILL.md文件：

<pre>
┌─────────────────────────────────────────────────────────────┐
│            build_skills_system_prompt() 调用                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ 进程内缓存命中？ │
                    └────┬───────┬───┘
                         │       │
                    命中 │       │ 未命中
                         │       │
                         ▼       ▼
                  ┌──────────┐  ┌────────────┐
                  │返回缓存  │  │磁盘快照有效？│
                  └──────────┘  └──┬─────┬────┘
                                     │     │
                                  有效 │     │ 无效
                                     │     │
                                     ▼     ▼
                              ┌──────────┐ ┌──────────┐
                              │使用预解析│ │扫描所有  │
                              │元数据    │ │SKILL.md  │
                              └────┬─────┘ └────┬─────┘
                                   │           │
                                   ▼           ▼
                              ┌──────────────────────┐
                              │   条件过滤 + 构建索引  │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ 更新进程缓存 + 磁盘快照│
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │       返回结果        │
                              └──────────────────────┘
</pre>

### 核心实现

```python
# agent/prompt_builder.py:563-642
def build_skills_system_prompt(
    available_tools: "set[str] | None" = None,
    available_toolsets: "set[str] | None" = None,
) -> str:
    """Build a compact skill index for the system prompt.

    Two-layer cache:
      1. In-process LRU dict keyed by (skills_dir, tools, toolsets)
      2. Disk snapshot (.skills_prompt_snapshot.json) validated by
         mtime/size manifest — survives process restarts
    """
    cache_key = (str(skills_dir), tuple(sorted(available_tools or [])), ...)

    # Layer 1: 进程内LRU缓存
    cached = _SKILLS_PROMPT_CACHE.get(cache_key)
    if cached is not None:
        return cached

    # Layer 2: 磁盘快照缓存
    snapshot = _load_skills_snapshot(skills_dir)
    if snapshot is not None:
        for entry in snapshot.get("skills", []):
            skill_name = entry.get("skill_name")
            if _skill_should_show(entry.get("conditions"), ...):
                skills_by_category[category].append((skill_name, description))

    # 缓存结果（LRU最多64个条目）
    _SKILLS_PROMPT_CACHE[cache_key] = result
    return result
```

### 缓存层对比

| 特性 | 进程内LRU缓存 | 磁盘快照缓存 |
|------|--------------|-------------|
| 位置 | 内存字典 | ~/.hermes/.skills_snapshot.json |
| 容量 | 64个条目 | 无限制 |
| 持久化 | 否（进程重启丢失） | 是（跨进程存活） |
| 验证 | 无需验证 | mtime/size manifest |
| 用途 | 会话内快速响应 | 跨会话加速启动 |

## 技能目录结构

```
~/.hermes/skills/
├── bundled/              # 内置技能（100+）
│   ├── development/      # 开发相关
│   │   ├── debug-rust/
│   │   │   └── SKILL.md
│   │   └── python-fix-error/
│   │       └── SKILL.md
│   ├── devops/           # 运维相关
│   └── data-science/     # 数据科学
│
├── user/                 # AI创建的技能
│   └── docker-network-debug/
│       ├── SKILL.md      # 主指令文件（必需）
│       ├── references/   # 参考文档
│       ├── templates/    # 输出模板
│       ├── scripts/      # 可执行脚本
│       └── assets/       # 补充资源
│
└── hub/                  # 社区共享技能（agentskills.io）
    └── ...
```

## 系统提示词中的技能索引

每次会话开始时，技能通过`build_skills_system_prompt()`生成索引注入系统提示词：

```python
# agent/prompt_builder.py:757-779
result = (
    "## Skills (mandatory)\n"
    "Before replying, scan the skills below. If a skill matches or is even partially relevant "
    "to your task, you MUST load it with skill_view(name) and follow its instructions. "
    "Err on the side of loading — it is always better to have context you don't need "
    "than to miss critical steps, pitfalls, or established workflows.\n"
    "Skills contain specialized knowledge — API endpoints, tool-specific commands, "
    "and proven workflows that outperform general-purpose approaches.\n"
    "If a skill has issues, fix it with skill_manage(action='patch').\n"
    "After difficult/iterative tasks, offer to save as a skill.\n"
    "If a skill you loaded was missing steps, had wrong commands, or needed "
    "pitfalls you discovered, update it before finishing.\n\n"
    "<available_skills>\n"
    + index_lines + "\n"
    "</available_skills>\n"
    "\nOnly proceed without loading a skill if genuinely none are relevant to the task."
)
```

## 自进化的三个层面

Hermes的自进化体现在三个层层递进的层面：

<pre>
┌─────────────────────────────────────────────────────────────┐
│              长期积累（技能库） ← 最高层次                    │
├─────────────────────────────────────────────────────────────┤
│  • 技能创建：成功方法转化为可复用技能文件                     │
│  • 技能改进：使用时发现问题自动修补                           │
│  • 技能同步：agentskills.io社区分享与安装                    │
└────────────────────────────▲────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│              中期记忆（跨会话） ← 中间层次                    │
├─────────────────────────────────────────────────────────────┤
│  • 持久化记忆：MEMORY.md/USER.md在会话间保持                 │
│  • 会话搜索：SQLite+FTS5检索历史对话                         │
│  • 用户建模：理解用户深度特征                                │
└────────────────────────────▲────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│              短期学习（会话内） ← 基础层次                    │
├─────────────────────────────────────────────────────────────┤
│  • 上下文压缩：token紧张时保留关键信息                        │
│  • 迭代修正：用户反馈立即应用到当前任务                       │
│  • 工具选择优化：根据成功/失败调整策略                        │
└─────────────────────────────────────────────────────────────┘
</pre>

### 对比分析

| 层面 | 时间尺度 | 存储位置 | 典型内容 |
|------|---------|---------|---------|
| 短期学习 | 单次会话 | 对话上下文 | 迭代修正、工具优化 |
| 中期记忆 | 跨会话 | MEMORY.md/SQLite | 用户偏好、历史对话 |
| 长期积累 | 永久 | ~/.hermes/skills/ | 可复用技能 |

## 不是机器学习，是提示词工程

Hermes的自进化不是靠强化学习或神经网络训练，而是靠提示词工程 + 工具调用：

<pre>
┌─────────────────────────────────────────────────────────────┐
│                    自进化核心机制                             │
└─────────────────────────────────────────────────────────────┘

触发机制 → SKILLS_GUIDANCE
            告诉LLM何时创建技能
                │
                ▼
创建机制 → skill_manage工具
            让LLM能创建/修改技能
                │
                ▼
改进机制 → SKILL_MANAGE_SCHEMA
            引导LLM立即修补
                │
                ▼
复用机制 → build_skills_system_prompt()
            自动加载所有可用技能
</pre>

这种设计的优势：

1. **简单**：无需训练模型，只需清晰的提示词指令
2. **可解释**：每一步操作都是透明的，可追踪的
3. **易调试**：可以直接查看和编辑SKILL.md文件
4. **低成本**：不需要GPU训练，只需文件存储

## 设计哲学总结

Hermes的技能系统体现了几个重要原则：

1. **明确的目标**：不是所有问题都需要技能，只保存"复杂任务"的解决方法
2. **主动维护**：使用时发现问题立即修补，不等用户反馈
3. **简单存储**：用Markdown文件存储技能，易于阅读和编辑
4. **条件过滤**：只显示相关的技能，避免信息过载
5. **渐进式披露**：Tier 1显示索引，Tier 2-3按需加载内容

这套系统没有用强化学习训练技能，没有用向量数据库匹配相似问题，就是用简单的提示词 + 文件存储 + 工具调用，却实现了真正的自进化。

如果最终有效的技能会被反复使用，无效的技能会被遗忘，这本身就是一个自然选择的过程。Hermes为我们展示了一个可行的方向：让AI不再是被动执行指令的工具，而是能够主动学习、自我改进的"助手"。
