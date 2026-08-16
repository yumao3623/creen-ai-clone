# 第二个 Codex 项目首条 Prompt

以下代码块中的内容可以原封不动复制到第二个独立 Codex 项目，作为首条 Prompt。

```text
你现在位于一个全新的、独立的第二道入职能力验证题项目中。

请先完整阅读仓库中的 `docs/task2-handoff/07-new-project-context.md`。如果 `docs/task2-handoff/` 下还包含 `01-original-requirements.md` 至 `06-definition-of-done-draft.md`，也请完整阅读并把它们作为需求边界和工作基线。

这一次不要采用“收到，直接开始生成整个网站”的工作方式。不要立即写业务代码、安装项目依赖、初始化某个框架或自行决定技术栈。正确顺序必须是：

1. Research
2. Requirements
3. Scope
4. Architecture
5. Plan
6. Implementation
7. Verification
8. Review
9. Polish

第一阶段：理解需求

- 忠实提取题目原始五条要求。
- 建立 P0（原始明确要求）、P1（为实现 P0 的必要推导）、P2（可选优化）、Unknown/TBD 四类清单。
- 每条 P1 必须关联来源 P0 并解释必要性；不得把 P1/P2 写成题目提供方原话。
- 明确吸取第一题 B+ 反馈：第二题必须证明真实第三方集成、成熟工程规范、完整测试、UI/UX 人工打磨和可追溯开发过程。

第二阶段：真实调研 Creen.ai

- 必须访问当前真实网站，不得凭模型记忆想象。
- 调研产品定位、可发现页面、页面层级、导航、Header/Footer、注册与登录、Google 登录表现、创作流程、跨模态能力、模型展示、Pricing、credits/计费表现、支付流程、响应式设计以及 Loading/Empty/Error/Success 等状态。
- 调研 SEO：URL、metadata、canonical、robots.txt、sitemap、标题结构、结构化数据、Landing Page、FAQ、内链、Footer、公开内容页、移动端和可观察的渲染方式。
- 每项研究记录日期、URL、访问/登录状态和截图、HTML 或 metadata 等证据，并标记 Observed、Inferred 或 Unknown。
- 登录墙或付费墙后无法访问的内容标记 Requires access，不得猜测。
- 同时调查适合已确认模态的真实 AI API 候选、能力、成本、限流、失败计费、数据政策与集成复杂度。不要预设 OpenAI、Google、Replicate、Kling、Runway、Fal 或其他平台。
- 调研 Stripe 和 Auth 的候选实现，但此阶段只形成 Candidate，不直接定案。

第三阶段：需求拆解与范围候选

- 根据真实调研形成页面 inventory、核心用户流程、模态 inventory、计费表现和 SEO 观察清单。
- 给出“主要页面”和第一版演示主路径的范围候选，并说明每项依据。
- 将订阅、Credit Pack、管理后台、忘记密码、邮箱验证、对象存储、模型数量、数据库等保持为 P2/TBD，除非研究证明它们是实现某个 P0 的必要条件或我明确确认。
- 整理需要我或题目提供方确认的问题；优先通过调研消除可自行查证的问题，只提出真正会改变范围/架构的阻塞问题。

第四阶段：提出实施方案，但不要开始开发

基于调研结果提出带候选比较和依据的：

- 产品范围与非目标
- 页面范围和复刻验收精度
- 技术方案与项目结构
- 真实 AI API 方案
- 第一方注册/登录与 Google Auth 方案
- 跨模态任务、计量、价格版本、账本、幂等与失败补偿方案
- Stripe 支付与可信状态同步方案
- SEO 实现方案
- 数据、安全、密钥与部署方案
- 测试、真实集成验证、视觉 QA 和 CI 方案
- 过程记录与文档维护方案

最终技术栈在调研前是 `TBD after research`。TypeScript 和成熟工程底座应作为受第一题反馈驱动的优先候选，但不要为了“高级”过度设计；如果推荐具体方案，请同时列出候选、取舍、风险和与 P0 的对应关系。

第五阶段：等待范围和架构明确

- 先向我提交研究摘要、证据索引、P0/P1/P2/TBD、范围候选、架构候选、风险和需确认问题。
- 在我确认范围和架构以前，不进入全量代码开发。
- 确认后再生成可执行 Plan，并按最小但完整的阶段实现、验证、评审和打磨。

过程记录要求

- 维护少而有用的 research、PRD、design、architecture、decisions、test-cases、development-log 和 README。
- 每个重要阶段记录：已完成、修改文件、实际执行、测试结果（PASS/FAIL/NOT EXECUTED）、当前问题、下一步建议。
- 自动测试中的 stub/fixture 与真实 Google、AI、Stripe 集成验证必须明确区分；演示主路径禁止用 Mock 冒充真实调用。
- 不得让 Codex 默默扩大产品范围。任何新增能力先标注 Original、Derived、Research finding 或 Candidate，并说明依据。
- 不确定信息写 Unknown、TBD、Requires research 或 Candidate option，不为了文档完整而编造答案。

现在请只执行 Research、Requirements、Scope 和 Architecture proposal 所需的只读调研与过程材料准备。先回复你读取到的原始需求边界、计划调研的证据清单以及本阶段预计创建/更新的文件，然后开始真实调研；不要写业务实现代码。
```

