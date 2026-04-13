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

传统AI对话存在一个明显的问题：每次会话都是独立的。用户今天告诉AI的偏好，明天它就忘了；昨天说过的项目约定，今天它又不记得了。Hermes Agent通过一套持久化记忆系统解决了这个问题，让AI能够主动识别并保存有价值的信息，在会话间保持这些记忆。

## 记忆系统架构概览

Hermes的记忆系统采用双文件结构，通过冻结快照模式注入系统提示词，确保前缀缓存性能最大化。

<pre>
┌─────────────────────────────────────────────────────────────┐
│                        存储层                               │
├─────────────────────────────────────────────────────────────┤
│  MEMORY.md         USER.md                                 │
│  (2200字符)        (1375字符)                               │
│  Agent个人笔记     用户画像与偏好                            │
└───────────┬─────────────────┬───────────────────────────────┘
            │                 │
            ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        处理层                               │
├─────────────────────────────────────────────────────────────┤
│  load_from_disk() → 捕获冻结快照 → format_for_system_prompt │
│  会话开始时加载    _system_prompt_snapshot   返回快照        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        API层                                │
├─────────────────────────────────────────────────────────────┤
│              注入System Prompt (每次API调用)                 │
└─────────────────────────────────────────────────────────────┘
</pre>

双文件设计各有侧重：

| 特性 | MEMORY.md | USER.md |
|------|-----------|---------|
| 用途 | Agent的个人笔记 | 用户画像与偏好 |
| 内容类型 | 环境事实、约定、经验教训 | 沟通风格、工作习惯、技术背景 |
| 字符限制 | 2,200字符 (~800 tokens) | 1,375字符 (~500 tokens) |
| 典型条目数 | 8-15条 | 5-10条 |

## MEMORY_GUIDANCE：提示词驱动的记忆机制

Hermes最巧妙的设计是通过提示词工程引导LLM自主决定何时保存记忆，而非依赖硬编码规则。

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

这段指导明确了三个层次的信息处理：

<pre>
┌─────────────────────────────────────────────────────────────┐
│                      信息分类决策                            │
└─────────────────────────────────────────────────────────────┘

应该保存 → memory工具
  • 用户偏好 (沟通风格)
  • 环境事实 (技术栈/工具)
  • 稳定约定 (工作流程)

不要保存 → session_search
  • 任务进度 (会话特定)
  • 临时状态 (TODO列表)

转为技能 → skill_manage工具
  • 解决方法 (可复用流程)
</pre>

## MEMORY_SCHEMA：工具调用接口

`MEMORY_SCHEMA`定义了memory工具的Function-Calling Schema，提供了完整的操作接口：

```python
# tools/memory_tool.py:489-538
MEMORY_SCHEMA = {
    "name": "memory",
    "description": "Save durable information to persistent memory that survives across sessions...",
    "parameters": {
        "action": {"enum": ["add", "replace", "remove"]},
        "target": {"enum": ["memory", "user"]},
        "content": "Entry content (for add/replace)",
        "old_text": "Identifies entry to replace/remove",
    },
}
```

**操作说明：**
- `add`：添加新条目
- `replace`：更新现有条目（通过old_text定位）
- `remove`：删除条目（通过old_text定位）

**存储目标：**
- `memory` → MEMORY.md：环境事实、项目约定、工具特性
- `user` → USER.md：用户偏好、沟通风格、角色信息

## 冻结快照机制：前缀缓存优化的核心

LLM API会缓存系统提示词的前缀部分。如果会话中途修改记忆内容，整个系统提示词会变化，导致缓存失效。Hermes通过冻结快照机制解决这个问题。

<pre>
┌─────────────────────────────────────────────────────────────┐
│                    冻结快照时序                              │
└─────────────────────────────────────────────────────────────┘

会话开始
    │
    ▼
load_from_disk() ────────→ 读取 MEMORY.md/USER.md
    │
    ▼
解析条目
    │
    ▼
捕获冻结快照 ────────────→ _system_prompt_snapshot
    │                        (会话期间保持不变)
    ▼
每次API调用 ─────────────→ format_for_system_prompt()
    │                        (返回快照)
    ▼
缓存命中 ✓

─────────────────────────────────────────────────────────────

memory工具新增记忆 → 写入文件
    │
    ▼
快照仍保持不变 ✓
    │
    ▼
新记忆下次会话生效
</pre>

### 核心实现

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

### 冻结快照生成

```python
# tools/memory_tool.py:367-383
def _render_block(self, target: str, entries: List[str]) -> str:
    """Render a system prompt block with header and usage indicator."""
    if not entries:
        return ""

    limit = self._char_limit(target)
    content = ENTRY_DELIMITER.join(entries)
    current = len(content)
    pct = min(100, int((current / limit) * 100)) if limit > 0 else 0

    if target == "user":
        header = f"USER PROFILE (who the user is) [{pct}% — {current:,}/{limit:,} chars]"
    else:
        header = f"MEMORY (your personal notes) [{pct}% — {current:,}/{limit:,} chars]"

    separator = "═" * 46
    return f"{separator}\n{header}\n{separator}\n{content}"
```

**快照输出示例：**

<pre>
═══════════════════════════════════════════════════
USER PROFILE (who the user is) [12% — 165/1,375 chars]
═══════════════════════════════════════════════════
• 用户使用Rust开发，项目使用Axum框架和SQLx
• 偏好简洁的回答风格，不喜欢冗长解释
• 时区：UTC+8（中国）
• 技术栈：Rust + Axum + SQLx + Docker

═══════════════════════════════════════════════════
MEMORY (your personal notes) [8% — 176/2,200 chars]
═══════════════════════════════════════════════════
• 项目使用Docker Compose进行本地开发
• 数据库迁移使用 sqlx-cli
• Git工作流：feature分支 → PR → main
• 不要在周五部署（团队约定）
</pre>

## 记忆写入时机与判断逻辑

记忆系统通过提示词工程让LLM自主判断何时保存，而非硬编码规则。

<pre>
┌─────────────────────────────────────────────────────────────┐
│                      记忆写入决策流程                         │
└─────────────────────────────────────────────────────────────┘

用户输入
    │
    ▼
LLM分析
    │
    ▼
符合MEMORY_SCHEMA条件？
    │
    ├─ 是 → 调用memory工具
    │         │
    │         ▼
    │      安全扫描
    │         │
    │         ▼
    │      通过？
    │         │
    │         ├─ 否 → 返回错误
    │         │
    │         └─ 是 → 检查重复？
    │                   │
    │                   ├─ 是 → 跳过
    │                   │
    │                   └─ 否 → 检查字符限制？
    │                              │
    │                              ├─ 超限 → 拒绝写入
    │                              │
    │                              └─ 正常 → 写入文件
    │                                        │
    │                                        ▼
    │                                     更新实时状态
    │                                        │
    │                                        ▼
    │                                     返回成功
    │
    └─ 否 → 正常对话
</pre>

### 写入判断标准

**应该保存：**
- 用户纠正："不要用4空格，用2空格"
- 用户偏好："我喜欢简洁的回答"
- 环境事实："项目使用Rust和Axum"
- 项目约定："周五不部署"

**不会保存：**
- 临时角色："扮演一个侦探"
- 一次性话题："今晚吃什么"
- 任务状态："进度80%"
- 会话特定结果："调试完成"

**转为技能：**
- Docker网络调试流程
- Rust内存泄漏排查步骤

### 核心写入逻辑

```python
# tools/memory_tool.py:198-241
def add(self, target: str, content: str) -> Dict[str, Any]:
    """Append a new entry. Returns error if it would exceed the char limit."""
    content = content.strip()
    if not content:
        return {"success": False, "error": "Content cannot be empty."}

    # 1. 扫描安全性（注入攻击、凭证泄露）
    scan_error = _scan_memory_content(content)
    if scan_error:
        return {"success": False, "error": scan_error}

    with self._file_lock(path):  # 文件锁保证并发安全
        # 2. 重新读取（获取其他会话的最新写入）
        self._reload_target(target)

        entries = self._entries_for(target)
        limit = self._char_limit(target)

        # 3. 检查重复
        if content in entries:
            return "Entry already exists (no duplicate added)."

        # 4. 检查字符限制
        new_total = len(ENTRY_DELIMITER.join(entries + [content]))
        if new_total > limit:
            return {"error": f"Would exceed {limit} chars"}

        # 5. 追加并写入文件
        entries.append(content)
        self.save_to_disk(target)

    return self._success_response(target, "Entry added.")
```

## 安全机制

由于记忆内容会被直接注入系统提示词，安全问题变得尤为重要。Hermes实现了完整的安全扫描机制。

### 威胁模式检测

```python
# tools/memory_tool.py:60-97
_MEMORY_THREAT_PATTERNS = [
    # 提示词注入攻击
    (r'ignore\s+(previous|all|above|prior)\s+instructions', "prompt_injection"),
    (r'you\s+are\s+now\s+', "role_hijack"),
    (r'do\s+not\s+tell\s+the\s+user', "deception_hide"),
    (r'system\s+prompt\s+override', "sys_prompt_override"),

    # 数据外泄
    (r'curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD)', "exfil_curl"),
    (r'wget\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD)', "exfil_wget"),

    # 读取敏感文件
    (r'cat\s+[^\n]*(\.env|credentials|\.netrc)', "read_secrets"),

    # 持久化后门
    (r'authorized_keys', "ssh_backdoor"),
]
```

### 隐形Unicode字符检测

零宽度字符攻击是一种高级注入技术，攻击者可以在看似正常的内容中隐藏恶意代码。

```python
_INVISIBLE_CHARS = {
    '\u200b', '\u200c', '\u200d',  # 零宽空格
    '\u2060', '\ufeff',             # 零宽非连字符、BOM
    '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',  # 双向文本覆盖
}
```

### 扫描函数

```python
def _scan_memory_content(content: str) -> Optional[str]:
    """Scan memory content for injection/exfil patterns."""
    # 检查隐形Unicode字符
    for char in _INVISIBLE_CHARS:
        if char in content:
            return f"Blocked: content contains invisible unicode U+{ord(char):04X}"

    # 检查威胁模式
    for pattern, pid in _MEMORY_THREAT_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            return f"Blocked: content matches threat pattern '{pid}'"

    return None
```

## 原子写入：并发安全保证

记忆文件使用临时文件 + 原子重命名的方式保证并发安全，避免竞态窗口。

```python
@staticmethod
def _write_file(path: Path, entries: List[str]):
    """Write entries using atomic temp-file + rename.

    Previous implementation used open("w") + flock, but "w" truncates
    the file *before* the lock is acquired, creating a race window.
    Atomic rename avoids this: readers always see either old or new file.
    """
    content = ENTRY_DELIMITER.join(entries) if entries else ""
    try:
        # 写入临时文件
        fd, tmp_path = tempfile.mkstemp(
            dir=str(path.parent), suffix=".tmp", prefix=".mem_"
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())  # 强制刷盘
            os.replace(tmp_path, str(path))  # 原子性重命名
        except BaseException:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
```

## 文件格式与存储

### 目录结构

```
~/.hermes/memories/
├── MEMORY.md      # Agent的个人笔记（2200字符限制）
├── USER.md        # 用户画像与偏好（1375字符限制）
├── MEMORY.md.lock # 文件锁（并发写入安全）
└── USER.md.lock
```

### 条目分隔符

每个条目使用 `§` 分隔，这种设计简单且有效：

```python
ENTRY_DELIMITER = "§"

# 文件内容：
用户使用Rust开发，项目使用Axum框架§偏好简洁的回答风格§项目使用Docker部署§

# 解析时：
entries = raw.split("§")
# → ["用户使用Rust开发...", "偏好简洁的回答...", "项目使用Docker部署..."]
```

## 设计哲学总结

Hermes的记忆系统体现了几个重要的设计原则：

1. **提示词工程 > 硬编码规则**：通过描述性指导让LLM自主判断，而非if-else规则
2. **前缀缓存优化**：冻结快照机制确保系统提示词稳定，最大化缓存命中率
3. **简单有效**：纯文本存储 + 字符限制，易于调试和备份
4. **安全第一**：完整的安全扫描机制防止注入攻击

这套系统没有使用复杂的向量化数据库或语义搜索，就是用简单的提示词工程 + 文件存储 + 冻结快照，却有效解决了跨会话记忆的实际问题。这正是"简单设计往往更有效"的体现。

## 与其他方案对比

| 特性 | Hermes Memory | Mem0 | 传统方案 |
|------|--------------|------|---------|
| 存储格式 | 纯文本 + 字符限制 | 向量数据库 | 无 |
| 快照机制 | 冻结快照（前缀缓存友好） | 动态查询 | 无 |
| 安全扫描 | 完整注入检测 | 基础验证 | 无 |
| 字符限制 | 2200/1375 | 无限制 | 无 |

Hermes的设计更偏向实用主义，不求最新最炫的技术，但求稳定可靠。对于当前的使用场景，它已经足够好了。
