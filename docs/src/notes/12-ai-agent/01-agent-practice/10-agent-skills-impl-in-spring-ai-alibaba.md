---
title: Agents Skills实现-以Spring AI Alibaba为例
description: Agents Skills实现-以Spring AI Alibaba为例
categories:
  - AI人工智能
tags:
  - AI
  - Agent
  - Skills
keywords: AI,Agent,Skills
date: 2026-5-18 10:29:10
author: benym
---

# Agents Skills实现

Agent Skills由Anthropic在2025年10月发布，2025年12月18号上线[agentskills.io](https://agentskills.io)的开放标准，从Claude内部功能演变为跨平台通用协议。

允许用户将提示词、脚本、代码包等专业能力打包成可按需加载的skills，极大的扩展了agent的能力边界。SAA团队在1月初也正式发布了Agent Skill的实现，本文将以SAA的Agent Skill实现为例，介绍Agent Skill的实现细节和使用方法。

## Skill标准

Skill核心包含SKILL.md，其余可包含附录文件、脚本、模版文件等

```xml
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```
在Skill.md中，可包含如下内容

| Field           | Required | Constraints                                                  |
| :-------------- | :------- | :----------------------------------------------------------- |
| `name`          | Yes      | 最多 64 个字符。只能使用小写字母、数字和连字符。不能以连字符开头或结尾。 |
| `description`   | Yes      | 最多 1024 个字符。不能为空。描述该技能的作用以及何时使用。   |
| `license`       | No       | 许可证名称或指向捆绑式许可证文件的引用。                     |
| `compatibility` | No       | 最多 500 个字符。说明环境要求（预期产品、系统包、网络访问等）。 |
| `metadata`      | No       | 用于附加元数据的任意键值映射。                               |
| `allowed-tools` | No       | 以空格分隔的可选用的预先批准工具列表。（实验性质）           |

通常在Clawhub，SkillHub中分发的SKILL一般只包含name和description字段

## 在ReActAgent中使用Agents Skills

以下示例来源于官网

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.skills.SkillsAgentHook;
import com.alibaba.cloud.ai.graph.agent.hook.shelltool.ShellToolAgentHook;
import com.alibaba.cloud.ai.graph.agent.tools.PythonTool;
import com.alibaba.cloud.ai.graph.agent.tools.ShellTool2;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.skills.registry.classpath.ClasspathSkillRegistry;
import com.alibaba.cloud.ai.graph.skills.registry.SkillRegistry;

// 1. 技能注册表：从 classpath:skills 加载（如 src/main/resources/skills/）
SkillRegistry registry = ClasspathSkillRegistry.builder()
    .classpathPath("skills")
    .build();

// 2. Skills Hook：注册 read_skill 工具并注入技能列表到系统提示
SkillsAgentHook skillsHook = SkillsAgentHook.builder()
    .skillRegistry(registry)
    .build();

// 3. Shell Hook：提供 Shell 命令执行（工作目录可指定，如当前工程目录）
ShellToolAgentHook shellHook = ShellToolAgentHook.builder()
    .shellTool2(ShellTool2.builder(System.getProperty("user.dir")).build())
    .build();

// 4. 构建 Agent：同时挂载 Skills Hook、Shell Hook 和 Python 工具
ReactAgent agent = ReactAgent.builder()
    .name("skills-integration-agent")
    .model(chatModel)
    .saver(new MemorySaver())
    .tools(PythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
    .hooks(List.of(skillsHook, shellHook))
    .enableLogging(true)
    .build();

// 5. 调用示例：用户请求处理技能目录下的文件时，模型可先 read_skill 再按技能说明调用 Python/Shell
String skillFilePath = "/path/to/skills/pdf-extractor/saa-roadmap.pdf"; // 实际路径来自技能目录或 hook.listSkills()
AssistantMessage response = agent.call("请从 " + skillFilePath + " 文件中提取关键信息。");
```

## 原理解析

### SkillRegistry

SkillRegistry主要有2个实现，1个是`ClasspathSkillRegistry`负责从jar包，resource里面加载Skill，另外1个是`FileSystemSkillRegistry`负责从文件系统中加载skill

他们都继承自`AbstractSkillRegistry`，在抽象类中定义了Skills的Map缓存，用于存储加载过的Skills元数据

```java
protected volatile Map<String, SkillMetadata> skills = new HashMap<>();
```

我们以`FileSystemSkillRegistry`为例，介绍一下技能的加载过程

FileSystemSkillRegistry的`autoLoad`默认是true，在进行build的时候会调用`loadSkillsToRegistry`方法进行技能加载

按照用户级、项目级的顺序依次进行skill注册

```java
/**
 * Loads skills from configured directories into the registry.
 * Uses Map to merge skills, ensuring project skills override user skills with the same name.
 */
@Override
protected void loadSkillsToRegistry() {
	// Use Map to merge skills, ensuring project skills override user skills with the same name
	Map<String, SkillMetadata> mergedSkills = new HashMap<>();

	if (userSkillsDirectory != null && !userSkillsDirectory.isEmpty()) {
		Path userPath = Path.of(userSkillsDirectory);
		if (Files.exists(userPath)) {
			List<SkillMetadata> userSkills = scanner.scan(userSkillsDirectory, "user");
			for (SkillMetadata skill : userSkills) {
				mergedSkills.put(skill.getName(), skill);
			}
			logger.info("Loaded {} user-level skills from {}", userSkills.size(), userSkillsDirectory);
		}
	}

	if (projectSkillsDirectory != null && !projectSkillsDirectory.isEmpty()) {
		Path projectPath = Path.of(projectSkillsDirectory);
		if (Files.exists(projectPath)) {
			List<SkillMetadata> projectSkills = scanner.scan(projectSkillsDirectory, "project");
			for (SkillMetadata skill : projectSkills) {
				// Project skills override user skills with the same name
				mergedSkills.put(skill.getName(), skill);
			}
			logger.info("Loaded {} project-level skills from {}", projectSkills.size(), projectSkillsDirectory);
		}
	}

	// Register all merged skills to registry
	int totalCount = mergedSkills.size();
	logger.info("Skills reloaded: {} total skills", totalCount);
	this.skills = mergedSkills;
}
```

其中scanner为`SkillScanner`，负责扫描目录下的SKILL.md文件，并解析成`SkillMetadata`对象，过程如下不断扫描目录下的子目录，解析SKILL.md文件，构建SkillMetadata对象，并添加到技能列表中

```java
public List<SkillMetadata> scan(String skillsDirectory, String source) {
	List<SkillMetadata> skills = new ArrayList<>();
	Path skillsPath = Path.of(skillsDirectory);

	if (!Files.exists(skillsPath)) {
		logger.warn("Skills directory does not exist: {}", skillsDirectory);
		return skills;
	}

	if (!Files.isDirectory(skillsPath)) {
		logger.warn("Skills path is not a directory: {}", skillsDirectory);
		return skills;
	}

	try (Stream<Path> paths = Files.list(skillsPath)) {
		paths.filter(Files::isDirectory)
				.forEach(skillDir -> {
					try {
						SkillMetadata metadata = loadSkill(skillDir, source);
						if (metadata != null) {
							skills.add(metadata);
							logger.info("Loaded skill: {} from {}", metadata.getName(), skillDir);
						}
					}
					catch (Exception e) {
						logger.error("Failed to load skill from {}: {}", skillDir, e.getMessage(), e);
					}
				});
	}
	catch (IOException e) {
		logger.error("Failed to scan skills directory {}: {}", skillsDirectory, e.getMessage(), e);
	}

	logger.info("Discovered {} skills from {}", skills.size(), skillsDirectory);
	return skills;
}

public SkillMetadata loadSkill(Path skillDir, String source) {
  Path skillFile = skillDir.resolve("SKILL.md");

  if (!Files.exists(skillFile)) {
    logger.warn("SKILL.md not found in {}", skillDir);
    return null;
  }

  try {
    String content = Files.readString(skillFile);
    Map<String, Object> frontmatter = parseFrontmatter(content);

    if (frontmatter == null || frontmatter.isEmpty()) {
      logger.warn("No frontmatter found in {}", skillFile);
      return null;
    }

    String name = (String) frontmatter.get("name");
    String description = (String) frontmatter.get("description");
    List<String> allowedTools;
    if (frontmatter.containsKey("allowed_tools")) {
      allowedTools = normalizeAllowedTools(frontmatter.get("allowed_tools"));
    }
    else if (frontmatter.containsKey("allowedTools")) {
      allowedTools = normalizeAllowedTools(frontmatter.get("allowedTools"));
    }
    else {
      allowedTools = List.of();
    }

    if (name == null || name.isEmpty()) {
      logger.warn("Skill name is missing in {}", skillFile);
      return null;
    }

    if (description == null || description.isEmpty()) {
      logger.warn("Skill description is missing in {}", skillFile);
      return null;
    }

    // Validate name format per Agent Skills spec (warn but still load for backwards compatibility)
    String directoryName = skillDir.getFileName().toString();
    validateSkillName(name, directoryName, skillFile);

    // Validate and truncate description length (spec: max 1024 chars)
    String descriptionStr = String.valueOf(description);
    if (descriptionStr.length() > MAX_SKILL_DESCRIPTION_LENGTH) {
      logger.warn(
        "Description exceeds {} chars in {}, truncating",
        MAX_SKILL_DESCRIPTION_LENGTH,
        skillFile
      );
      descriptionStr = descriptionStr.substring(0, MAX_SKILL_DESCRIPTION_LENGTH);
    }

    // Remove frontmatter from content to get fullContent
    String fullContent = removeFrontmatter(content);

    SkillMetadata.Builder builder = SkillMetadata.builder()
      .name(name)
      .description(descriptionStr)
      .skillPath(skillDir.toString())
      .source(source)
      .fullContent(fullContent)
      .allowedTools(allowedTools);

    return builder.build();

  }
  catch (IOException e) {
    logger.error("Failed to read skill file {}: {}", skillFile, e.getMessage(), e);
    return null;
  }
  catch (Exception e) {
    logger.error("Failed to parse skill file {}: {}", skillFile, e.getMessage(), e);
    return null;
  }
}
```

对于SKILL.md文件采用yaml frontmatter的格式进行解析，包含技能的name、description、allowedTools等信息，以及技能文件的路径和内容等元数据

### SkillsAgentHook

SkillsAgentHook主要是将SkillRegistry包装为一个`SkillsInterceptor`，同时管理模型请求前的Skill重载，构建并暴露`read_skill`、`search_skills`、`disable_skill`工具给模型使用

**ReadSkillTool**核心prompt
```text
Reads the full content of a skill from the SkillRegistry.
You can use this tool to read the complete content of any skill by providing its name or path.

Usage:
- Provide either skill_name or skill_path
- If both are provided, they must refer to the same skill
- The tool returns the full content of the skill file (e.g., SKILL.md) without frontmatter
- If the skill is not found, an error will be returned

Example:
- read_skill("pdf-extractor")
```

其中read过程会调用`com.alibaba.cloud.ai.graph.skills.registry.SkillRegistry#get`和`com.alibaba.cloud.ai.graph.skills.registry.SkillRegistry#getByPath`，之后从SkillMetadata中获取技能的完整内容

**SearchSkillsTool**核心prompt
```text
Searches the current SkillRegistry by skill name, description, or skill path.

Usage:
- Provide a query to search the locally registered skills
- Matching is performed against name, description, and path
- Returns matching skills with their descriptions and paths
```

searchSkill依赖于LLM根据提示词输出的参数，format之后从skill map中进行过滤，返回匹配的技能列表

**DisableSkillTool**核心prompt
```text
Disables a skill in the current SkillRegistry instance without deleting any files.

Usage:
- Provide either skill_name or skill_path
- If both are provided, they must refer to the same skill
- Disabled skills are hidden from the current registry's listings and reads
```

disableSkill同样依赖LLM根据提示词输出的参数，format之后加入到SkillRegistry的disabledSkills列表中，之后在get、search等方法中会过滤掉被禁用的技能

### SkillsInterceptor渐进式披露核心

Interceptor主要是在模型请求前对请求进行增强，在SkillsInterceptor中主要是构建Skills的核心system prompt

核心处理流程

```java
@Override
public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
	List<SkillMetadata> skills = skillRegistry.listAll();

	if (skills.isEmpty()) {
		return handler.call(request);
	}

	// 1. Extract resolved skills from AssistantMessage with read_skill tool calls
	List<SkillMetadata> readSkills = extractReadSkills(request.getMessages());

	// 2. Collect tools from groupedTools and allowed_tools for those skills
	List<ToolCallback> skillTools = new ArrayList<>(request.getDynamicToolCallbacks());
	Map<String, List<ToolCallback>> grouped = getGroupedTools();
	for (SkillMetadata skill : readSkills) {
		List<ToolCallback> toolsForSkill = grouped.get(skill.getName());
		if (toolsForSkill != null && !toolsForSkill.isEmpty()) {
			skillTools.addAll(toolsForSkill);
			if (logger.isInfoEnabled()) {
				logger.info("SkillsInterceptor: added {} tool(s) for skill '{}' to dynamicToolCallbacks",
						toolsForSkill.size(), skill.getName());
			}
		}
		skillTools.addAll(resolveAllowedTools(skill));
	}
	skillTools = ToolCallbackUtils.deduplicateByName(skillTools);
  
  // 3. build skills prompt and enhance system message
	String skillsPrompt = buildSkillsPrompt(skills, skillRegistry, skillRegistry.getSystemPromptTemplate());
	SystemMessage enhanced = enhanceSystemMessage(request.getSystemMessage(), skillsPrompt);

	if (logger.isDebugEnabled()) {
		logger.debug("Enhanced system message:\n{}", enhanced.getText());
	}

	ModelRequest modified = ModelRequest.builder(request)
			.systemMessage(enhanced)
			.dynamicToolCallbacks(skillTools)
			.build();

	return handler.call(modified);
}

/**
 * Builds the skills prompt string from the list of skills.
 *
 * This method processes the skills list, separates user skills from project skills,
 * formats them into a skills list, and renders the system prompt template with
 * the appropriate context variables.
 *
 * @param skills the list of skills to include in the prompt
 * @param skillRegistry the SkillRegistry instance to get registry type and load instructions
 * @param systemPromptTemplate the SystemPromptTemplate to render the prompt
 * @return the formatted skills prompt string
 */
public static String buildSkillsPrompt(List<SkillMetadata> skills, SkillRegistry skillRegistry, SystemPromptTemplate systemPromptTemplate) {
  List<SkillMetadata> userSkills = new ArrayList<>();
  List<SkillMetadata> projectSkills = new ArrayList<>();
  for (SkillMetadata skill : skills) {
    if ("project".equals(skill.getSource())) {
      projectSkills.add(skill);
    }
    else {
      userSkills.add(skill);
    }
  }

  StringBuilder skillList = new StringBuilder();
  if (!userSkills.isEmpty()) {
    skillList.append("**User Skills:**\n");
    for (SkillMetadata skill : userSkills) {
      skillList.append(String.format("- **%s**: %s", skill.getName(), skill.getDescription()));
      skillList.append(String.format("  → Supporting files that skill uses (scripts, references, etc.) are located at directory `%s`, use this path to form the absolute path when reading supporting files. \n", skill.getSkillPath()));
    }
    skillList.append("\n");
  }

  if (!projectSkills.isEmpty()) {
    skillList.append("**Project Skills:**\n");
    for (SkillMetadata skill : projectSkills) {
      skillList.append(String.format("- **%s**: %s", skill.getName(), skill.getDescription()));
      skillList.append(String.format("  → Supporting files that skill uses (scripts, references, etc.) are located at directory `%s`, use this path to form the absolute path when reading supporting files.\n", skill.getSkillPath()));
    }
    skillList.append("\n");
  }

  Map<String, Object> context = new HashMap<>();
  context.put("skills_list", skillList.toString());
  context.put("skills_load_instructions", skillRegistry.getSkillLoadInstructions());
  return systemPromptTemplate.render(context);
}
```

以FileSystemSkillRegistry为例，其system prompt为

```text
## Skills System

You have access to a skills library that provides specialized capabilities and domain knowledge. All skills are stored in a Skill Registry with a file system based storage.

### Available Skills

{skills_list}

### How to Use Skills (Progressive Disclosure)

Skills follow a **progressive disclosure** pattern - you know they exist (name + description above), but you only read the full instructions when needed:

1. **Recognize when a skill applies**: Check if the user's task matches any skill's description
2. **Read the skill's full instructions**: The skill list above shows the exact skill id to use with `read_skill`
3. **Follow the skill's instructions**: SKILL.md contains step-by-step workflows, best practices, and examples
4. **Access supporting files**: Skills may include Python scripts, configs, or reference docs - use absolute paths

#### How to Read The Full Skill Instruction

You are currently using the file system based Skill Registry. Please follow the skill loading guidelines below:

{skills_load_instructions}

**Important:**

  - **For SKILL.md files (skill instructions)**: Always use `read_skill` to read skill instructions. Do not attempt to access SKILL.md files through other methods.
  - **For other supporting files that skill uses (scripts, references, etc.)**: You may use other appropriate tools to read or access these files as needed, always use absolute paths from the skill list.

#### When to Use Skills

  - When the user's request matches a skill's domain (e.g., "research X" → web-research skill)
  - When you need specialized knowledge or structured workflows
  - When a skill provides proven patterns for complex tasks

#### Skills are Self-Documenting

  - Each SKILL.md tells you exactly what the skill does and how to use it
  - The skill list above shows the full path for each skill's SKILL.md file

#### Executing Skill Scripts

Skills may contain Python scripts or other executable files. Always use absolute paths from the skill list.

### Example Workflow

User: "Can you research the latest developments in quantum computing?"

1. Check available skills above → See "web-research" skill with its skill id
2. Read the skill using the id shown in the list
3. Follow the skill's research workflow (search → organize → synthesize)
4. Use any helper scripts with absolute paths

Remember: Skills are tools to make you more capable and consistent. When in doubt, check if a skill exists for the task!
```

这其中第3点就是构建system prompt大概的含义就是将用户级Skill，项目级Skill的**绝对地址**，系统中可用的skill名称和描述填充到system prompt中，让模型知道现有的可用skill

我们可以看到模型从请求前就已经获取到了Skill列表，但只加载了Skill的名称和描述，这部分的token占比很少，外加绑定的ReadSkillTool工具，在模型判断需要调用Skill的时候就会采用`read_skill`工具去读取Skill的完整内容，这就是渐进式披露的原理

第1、2点则是为多轮对话情况下Skill.md中描述的allowedTools组装动态Function Call，具体关键流程如下

```text
【关键：allowed_tools 的动态组装】

【第一轮】
  User: "帮我提取PDF内容"
         ↓
  extractReadSkills → [] (空)
  dynamicToolCallbacks = []
         ↓
  Model 只看到 skills 列表，没有任何具体工具
  Model 决定：我需要读 pdf-extractor 的详细信息
         ↓
  Model: "我需要调用 read_skill(pdf-extractor)"

─────────────────────────────────────────────────────────────

【第二轮】★ allowed_tools 第一次被注入
  User: "继续提取，给我全部内容"
         ↓
  extractReadSkills → [pdf-extractor]
       ↓
  for (skill : [pdf-extractor]) {
    ├─ groupedTools.get("pdf-extractor")
    └─ resolveAllowedTools(skill) ← skill 声明的所有 allowed_tools
  }
       ↓
  dynamicToolCallbacks = [pdf-extractor 的所有 allowed_tools]
       ↓
  Model (现在拥有 pdf 工具了) → 可以调用 pdf 相关工具
       ↓
  Model: "调用 extract_pdf_tool(...)"

─────────────────────────────────────────────────────────────

【第三轮】★ allowed_tools 累积注入
  User: "提取后的数据帮我处理一下"
         ↓
  extractReadSkills → [pdf-extractor, data-processor]
       ↓
  for (skill : [pdf-extractor, data-processor]) {
    ├─ pdf-extractor 的 allowed_tools  (已有)
    └─ data-processor 的 allowed_tools (新增!)
  }
       ↓
  dynamicToolCallbacks = [
    pdf-extractor 的工具,
    data-processor 的工具 ← 新动态注入
  ]
       ↓
  Model (能力范围扩展) → 既能提取 PDF，也能处理数据
       ↓
  Model: "调用 extract_pdf_tool(...) 再调用 process_data_tool(...)"

─────────────────────────────────────────────────────────────

【为什么要多轮注入 allowed_tools?】

❌ 一开始注入所有 allowed_tools:
   Model 面对 100 个工具 → 不知道用哪个 → 困惑

✓ 多轮动态注入:
   第1轮: User 问题 → Model 读 skill → 理解这个 skill 是做什么的
   第2轮: User 新问题 → 才注入它的 allowed_tools → Model 清楚应该怎么用
   第3轮: User 继续追问 → 读新 skill → 注入新的 allowed_tools
   
   → 按需、有序、清晰、和用户问题相匹配
```

## 常见问题

### 为什么在源码中只看到了加载SKILL.md，没有看到加载技能附带的Scripts、references等文件?

这个问题在社区经常提问，比如[#4314](https://github.com/alibaba/spring-ai-alibaba/issues/4314)、[#4337](https://github.com/alibaba/spring-ai-alibaba/issues/4337)

通过上述的源码，也不难发现系统启动的时候的确只加载了SKILL.md文件，而且只加载了元数据，真正的SKILL.md的内容是等到模型调用`read_skill`工具的时候才会去读取的。对于Agent而言，**想要加载SKILL覆盖的脚本、引用文件等资源依赖于ShellTool**

这也是为什么在官方的示例中，Agent同时挂载了`SkillsAgentHook`和`ShellToolAgentHook`，前者负责技能的注册和SKILL.md的读取，后者提供了Shell命令执行的能力，这样当模型读取了SKILL.md之后，如果需要执行SKILL.md中描述的脚本或引用文件，就可以调用Shell工具去执行了

对于脚本而言，模型可能输出`bash /path/to/skills/pdf-extractor/extract.sh`，对于引用文件而言，模型可能输出`cat /path/to/skills/pdf-extractor/reference.txt`，这些能力都来源于Shell工具

这也是为什么Agent Skill明明标准上写的有scripts、references等资源，但在实现上却没有直接加载这些资源，而是通过工具的形式让模型在需要的时候去调用的原因，这样做的好处是**按需加载，真正用到的时候才去加载**，避免了一开始就把所有的技能资源都加载到模型上下文中，造成token浪费和上下文拥挤的问题

由于Shell工具的存在，scripts、references这种路径也不用写到源代码中，而是Skill怎么描述，模型就怎么加载，比如自定义一个Skill的时候想要脚本不在scripts目录下，而是放在custom-scripts目录下也是完全没有问题的，只要在SKILL.md中描述清楚，模型就能够正确地调用Shell工具去执行对应路径下的脚本或引用文件，这也是Agent Skill设计的灵活性和通用性的体现

### Skill绝对路径

源码中prompt里面多处强调了如果要访问技能的资源文件，必须使用绝对路径，以windows系统为例，如果技能文件在`C:\agent\skills\pdf-extractor\SKILL.md`，那么如果要访问这个技能的资源文件，就必须使用绝对路径`C:\agent\skills\pdf-extractor\reference.txt`，而不能使用相对路径`./reference.txt`或者`reference.txt`，这是因为模型并不知道当前的工作目录是什么，也无法正确解析相对路径，所以必须使用绝对路径才能确保模型能够正确地找到和访问技能的资源文件

这样做的好处是当我们需要进行嵌套skill开发时，比如开发一个技能A组合了开源的技能B和C，我们在Skill里面的描述只需要描述A依赖的B和C的技能是什么。

**以往在处理这种嵌套场景开发时，代码上要很小心处理什么时候加载B和C，加载之后B和C的资源文件路径是什么，执行完B和C之后怎么会到A等等问题**，

但现在只需要在A的SKILL.md中描述清楚B和C的技能名称，模型就能够正确地调用`read_skill`工具去读取B和C的SKILL.md文件，

并且根据SKILL.md中的描述去访问对应的资源文件，这样就大大简化了嵌套技能开发的复杂度，同时也提升了技能的复用性和组合能力

> 部分市场上的AI IDE开发的时候就没有考虑好这个问题，导致嵌套skill执行时，如果技能A依赖了技能B，技能B又依赖了技能C，那么在执行技能A的时候就会因为路径问题导致技能B和技能C的资源文件无法访问，从而导致整个技能链路的执行失败，这也是为什么绝对路径的设计是非常重要的，能够确保无论技能如何嵌套组合，都能够正确地访问到对应的资源文件，保证技能的正常执行
