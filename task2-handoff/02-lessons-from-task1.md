# 第二道能力验证题｜第一题复盘与工程经验

> 依据：当前第一题仓库的 `CODEX_TASK.md`、PRD、设计、架构、决策、测试、README、配置、前后端源码、Mock fixture、Git 历史及 2026-08-14 实际测试结果；同时结合第一题 `B+` 评价。  
> 原则：只记录仓库可观察事实，不把推测写成事实。

## 第一题采用了什么开发方式

### 技术栈与工程底座

- 前端采用原生微信小程序：WXML、WXSS、CommonJS JavaScript 与微信官方 API，共注册 13 个页面。
- 后端采用 Node.js 20+、Express 5、CommonJS JavaScript 和 REST/JSON；运行依赖只有 `express` 与 `dotenv`。
- 数据使用两类 JSON：Git 跟踪的四家虚构企业 fixture，以及被 Git 忽略的 Session、Consent、Assessment、Report、Lead runtime 集合。
- 自动测试采用 Node.js 内置 test runner，没有发现 TypeScript、ESLint、Prettier、覆盖率门槛、CI 工作流或浏览器 E2E 框架配置。

### 目录和职责划分

- `miniprogram/pages`、`components`、`services`、`utils` 分离页面、复用组件、网络/认证/流程编排与纯函数。
- `server/src` 按 `routes → services → domain/provider/repositories` 分层。
- 企业数据通过 `EnterpriseProvider` 抽象；当前唯一实现为 `MockEnterpriseProvider`。
- 资质规则通过 `QualificationEngine` 编排四个独立 Evaluator，动态表单由规则字段需求与已有企业数据计算差集。
- 前端不重新计算资质结论；报告、证据、缺口和行动来自后端快照。

### API、状态与认证

- API 覆盖健康检查、企业搜索/详情、Demo 登录/会话/注销、动态字段、诊断创建/状态/报告、报告列表/详情和顾问线索。
- 使用统一成功/错误 envelope、request ID、Bearer Session、输入校验和变更请求幂等键。
- 诊断以可注入时钟按查询推进 `pending → processing → ready | failed`，没有 Worker 或队列。
- 只有用户明确同意协议后才触发 `wx.login`；但后端仅实现 Demo Auth，不调用微信 `code2Session`。
- 页面主要使用 Page 自身 `data` 与本地 storage；没有集中状态管理框架。

### 测试、文档与过程记录

- `tests/unit` 覆盖 Provider、动态字段、四类 Evaluator、Engine、报告和小程序纯函数/静态约束。
- `tests/integration/api` 覆盖真实 HTTP 路由、身份/协议、诊断状态、报告、线索、故障恢复与独立后端进程主链路。
- 2026-08-14 在当前 HEAD 实际执行 `npm.cmd test`：`91 PASS / 0 FAIL`。
- `docs/test-cases.md` 将自动测试、DevTools、真机专项分开，仍有报告五态专项、弱网、前后台恢复、多尺寸、真机 HTTPS 和草稿真实过期等 `NOT EXECUTED`。
- Git 历史按规划、文档、后端骨架、规则、认证、游客流程、完整流程、集成收口等阶段提交；`docs/decisions.md` 保存 24 条接受、生产待补和被取代决策。
- 历史上存在分阶段 `PLAN.md`，最终交付提交中删除；当前主要过程证据保留在 Git、决策日志、测试记录和各规格文档中。

## 第一题做得好的地方

1. **业务层次真实存在，而不是只有页面。** `QualificationEngine`、四个 Evaluator、`ReportGenerator`、动态字段 builder 均可脱离 UI 测试；补充数据会真实改变缺失项和报告。
2. **关键合规时序有双端约束。** 协议组件每次打开重置为未勾选，前端明确同意后才登录，后端再次校验协议快照；游客路径和顾问独立隐私同意都有测试。
3. **可解释性和不确定性处理扎实。** 结果保留规则版本、来源、统计期、证据、缺口和行动；`0`/`false` 与缺失严格区分，无法自动判断的条件进入 `manual_review`。
4. **轻量架构仍保留替换边界。** Provider、Repository、Service 和 Domain 分离；错误处理、资源所有权、token 摘要、幂等和安全公共错误均有实现及测试。
5. **测试状态相对诚实。** 当前自动测试可复现为 91 项全通过，人工未执行项没有冒充 PASS；Git 提交也能看出阶段演进和一次主动删除越界 Admin 的范围收口。

## 第一题扣分原因

### 评价直接指出的问题

- 总评为 `B+`，评价是“能胜任部分工作场景，正常实习生水平”。
- 原始业务期待中的企查查真实数据没有接通，全部使用 Mock。
- Demo 偏简单，人工产品和视觉打磨不够明显。
- 工程规范较简单，没有充分采用成熟工程最佳实践。
- 使用 JavaScript 而不是 TypeScript，底层工程偏手搓，缺少成熟框架/工程方案的明显证据。

### 当前仓库能验证的具体表现

- `createDefaultEnterpriseProvider()` 对非 `mock` 配置直接报错；仓库中不存在 `QichachaEnterpriseProvider` 实现。真实企业 API 只停留在 `.env.example` 和架构文档的未来方案。
- `DemoAuthProvider` 不进行生产微信身份交换；共享游客模式还允许本地 Demo code 降级。这满足第一题 Demo 边界，但不能证明真实认证集成能力。
- 所有业务代码和测试均为 JavaScript/CommonJS；没有静态类型、lint、format、覆盖率门槛或 CI 自动门禁。
- 小程序页面多为简洁卡片和短页面样式；仓库没有视觉基线截图、视觉回归、响应式专项通过记录或真机验收证据。测试记录也明确多尺寸和键盘为 `NOT EXECUTED`。
- 自动测试较强，但前端测试大量聚焦纯函数、静态扫描和源码结构；没有完整的可重复 UI 自动化测试链路。
- 为避免与 README 重复，最终提交时有意删除了根目录 `交付说明.md`；这个范围收口本身合理。但 `docs/architecture.md` 的目录和 `scripts/build-delivery.ps1` 仍保留该文件引用，交付脚本在当前 HEAD 会因此无法完成。问题不是“应该恢复重复文档”，而是删除后没有同步清理引用并重跑交付验证；历史“交付 ZIP 检查 PASS”不能直接视为当前状态已复验。
- 部分测试名仍带 `Phase 5/6/8`，适合作为开发阶段痕迹，但最终命名没有完全转成长期可维护的业务语义。

## 第二题必须避免的问题

1. **不能以 Mock 代替明确要求的真实集成。** AI 调用、第一方登录、Google 登录和 Stripe 都必须提供可操作、可观测、可验证的真实链路；测试 fixture 只能服务自动测试，不能成为演示主路径。
2. **不能先写全站再补需求。** 必须先真实调研 Creen.ai，冻结“主要页面”、模态、计费表现和 SEO 观察，再确定范围与架构。
3. **不能只证明代码能跑。** 还要用设计对照、响应式检查、状态覆盖、交互细节和视觉复核证明页面经过人工打磨。
4. **不能继续依赖手工约定维持质量。** 第二题应在选型阶段优先评估 TypeScript 与成熟工程底座，并建立格式、lint、类型、测试、构建和 CI 门禁；最终选择仍需调研确认。
5. **不能让文档落后于实现。** 需求、页面清单、API/事件、计费规则、环境变量、测试结果和当前限制必须与最终代码逐项核对。
6. **不能只测成功路径。** 真实第三方集成要覆盖取消、失败、超时、重复回调、额度不足、计费争议、重试和幂等边界。
7. **不能默默扩需求。** 订阅、Credit Pack、管理后台、忘记密码、邮箱验证、对象存储、具体模型数等只能在调研或确认后进入范围。

## 第二题工程质量目标

- **真实第三方集成能力：** 以供应商可验证的请求、响应、身份或支付状态证明不是 Mock，并妥善隔离密钥。
- **成熟工程规范：** 技术栈 `TBD after research`；TypeScript 是受第一题反馈驱动的优先候选，除非调研后有明确理由不用。工程需具备自动格式化、lint、类型检查、测试、构建和 CI 的可重复命令。
- **完整测试：** 单元、集成、关键流程 E2E、第三方沙箱/测试环境、失败路径、安全边界与人工视觉 QA 分层记录。
- **UI/UX 打磨：** 以调研证据、页面对照、断点验证、Loading/Empty/Error/Success、可访问性和交互反馈证明打磨过程。
- **可审计计费：** 不同模态的计量、价格版本、余额或应付金额变化、失败回滚/不扣费、幂等与支付状态可以追溯。
- **过程可追溯：** Research → Requirements → Scope → Architecture → Plan → Implementation → Verification → Review → Polish 各阶段保留少而有用的记录。
