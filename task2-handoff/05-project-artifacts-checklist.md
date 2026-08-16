# 第二道能力验证题｜过程产物清单

> 目标：用少量、持续维护的文件证明真实的 Research → Delivery 过程。  
> “必须”分为两类：`P0` 表示原题“保留过程记录”直接需要；`Project baseline` 表示虽未被原文点名，但为了让 P0 可复现、可验收而设定的工程交付基线。

## 建议保留的核心产物

| 产物 | 用途 | 创建时机 | 是否必须 | 需要记录什么 |
| --- | --- | --- | --- | --- |
| `README.md` | 让评审从零启动、配置并演示项目 | 工程初始化时建立，交付前收口 | Project baseline | 项目范围、技术栈、环境要求、安装/运行/测试、真实第三方配置、演示流程、已知限制；不得放真实密钥 |
| `docs/research.md` + `docs/research-evidence/` | 证明 Creen.ai、SEO、Auth、计费和 AI Provider 是真实调研而非模型想象 | 第一阶段，写 PRD 前 | P0 | 调研日期、URL、登录状态、截图/metadata、Observed/Inferred/Unknown、页面/流程/SEO inventory、研究如何影响范围 |
| `docs/PRD.md` | 冻结已确认产品范围与验收语义 | 调研初版完成后；范围变化时更新 | Project baseline | 背景、用户、明确需求、P1 推导、非目标、页面和主流程、Auth、模态、计费、Stripe、SEO、异常、验收、TBD；明确来源分类 |
| `docs/design.md` | 把“完整复刻”转成可实施、可视觉验收的规格 | 页面范围确定后、实现前 | Project baseline | 页面层级、组件、设计 token、布局/断点、表单、创作流、计费/支付、Loading/Empty/Error/Success、可访问性、对照证据 |
| `docs/architecture.md` | 记录成熟但不过度的工程方案和第三方边界 | PRD/design 初版后、编码前 | Project baseline | 系统/目录、渲染与 SEO、Auth、Google、AI Provider、任务、计量/账本、Stripe、持久化、安全、API/事件、环境、部署、Mock 仅限测试的边界 |
| `docs/decisions.md` | 保存重要选择、被否决方案和变化原因 | 首次关键选择时建立，持续更新 | P0 | ADR 编号、日期、状态、上下文、候选、决定、理由、影响、证据；包括技术栈但不得提前伪装成定案 |
| `docs/test-cases.md` | 作为验证状态的唯一事实来源 | PRD 验收项稳定后，测试前建立 | Project baseline | Test ID、需求映射、层级、前置、步骤、预期、环境、证据、PASS/FAIL/NOT EXECUTED；真实第三方、失败/重复/计费边界和视觉 QA |
| `docs/development-log.md` | 证明每阶段做了什么、如何验证和修正 | 每个重要阶段结束时追加 | P0 | 日期、阶段、范围、修改文件、命令、结果、问题、决策链接、下一步；避免复制 Git diff 或写流水账 |
| `.env.example` | 声明真实集成所需配置，同时防止秘密入库 | 首次第三方集成前 | Project baseline | 变量名、用途、安全占位、必需/可选、环境说明；绝不出现真实值 |
| `AGENTS.md` 或等效项目指令 | 固化 Codex 在本项目中的范围、验证和记录规则 | 新项目初始化时 | Recommended | 先调研后编码、不得扩需求、真实调用非 Mock、必须验证、文件职责、阶段汇报格式 |

## 不单独拆文件的内容

为减少无价值文档，以下内容优先并入上表核心文件：

- 需求追踪矩阵：放在 PRD 或 `test-cases.md`，以 P0/P1 ID 关联实现与测试。
- API、事件、数据模型：放在 `architecture.md`；只有契约规模明显增大时再自动生成 OpenAPI 等机器可读产物。
- 安全、隐私和威胁边界：放在 `architecture.md`，对应验证放在 `test-cases.md`。
- SEO 检查：观察放 `research.md`，目标放 PRD/design，实现方案放 architecture，结果放 test-cases。
- 视觉对照：截图放 `research-evidence/`，索引和结论写入 `research.md` 或 design。
- Git 提交历史：保持小而有意义的阶段提交，不另写逐提交说明。

## 维护规则

1. 每个文件有唯一职责；与 README 重复的“交付说明”不再单独创建。
2. 删除、合并文档时，同时清理 README、脚本、架构目录和测试记录里的引用，并重新执行相关验证。
3. `docs/test-cases.md` 是测试状态唯一主定义；没有证据的项目标 `NOT EXECUTED`。
4. 开发日志记录结论与证据链接，不粘贴大量终端输出或重复代码内容。
5. 架构或范围变化必须同时更新受影响的 PRD、design、architecture、tests 和 README。
6. 截图、录屏和生成报告只保留能证明关键调研或验收结论的部分。

## 最小阶段留痕

| 阶段 | 最少更新的产物 |
| --- | --- |
| Research | `research.md`、必要证据、development log |
| Requirements / Scope | PRD、decisions、development log |
| Architecture / Plan | design、architecture、decisions、test-cases 初版 |
| Implementation | 有意义的 Git 提交、development log、必要契约更新 |
| Verification | test-cases、测试证据、缺陷修复记录 |
| Review / Polish | 视觉对照、性能/SEO/可访问性结果、README、最终限制 |

