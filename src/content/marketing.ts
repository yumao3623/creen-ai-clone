export type PublicPageSeoContent = Readonly<{
  intent: string;
  title: string;
  description: string;
  keywords: readonly string[];
}>;

export type MarketingPage = Readonly<{
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  capability: string;
  steps: readonly string[];
  related: readonly Readonly<{ href: string; label: string }>[];
  seo: PublicPageSeoContent;
  faq: readonly Readonly<{ question: string; answer: string }>[];
}>;

export type SupportPage = Readonly<{
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: readonly (readonly [string, string])[];
  seo: PublicPageSeoContent;
}>;

export const marketingPages = [
  {
    slug: "ai-image-generator",
    eyebrow: "IMAGE CREATION",
    title: "AI 图片生成器",
    description:
      "把清晰的文字描述转化为可下载的图片，在提交前查看确定的 Credits 报价。",
    capability: "Text to Image",
    steps: ["描述你想看到的画面", "选择图像尺寸", "确认报价后生成"],
    related: [
      { href: "/text-to-image", label: "Text to Image" },
      { href: "/image-to-video", label: "Image to Video" },
    ],
    seo: {
      intent: "使用文字提示创建 AI 图片",
      title: "AI 图片生成器",
      description: "使用文字提示创建图片，并在提交前查看确定的 Credits 报价。",
      keywords: ["AI 图片生成器", "文字生成图片", "Text to Image"],
    },
    faq: [
      {
        question: "生成图片前会显示成本吗？",
        answer: "会。登录后会先获得服务端创建的 Credits Quote，再提交生成。",
      },
      {
        question: "图片生成与视频生成必须连续使用吗？",
        answer: "不需要。三个模态独立使用，并共享账户、Credits 和历史记录。",
      },
    ],
  },
  {
    slug: "ai-video-generator",
    eyebrow: "VIDEO CREATION",
    title: "AI 视频生成器",
    description:
      "上传参考图片并定义动作与氛围，独立创建短视频，无需先完成图片任务。",
    capability: "Image to Video",
    steps: ["上传一张参考图片", "描述镜头中的变化", "选择 5 或 10 秒时长"],
    related: [
      { href: "/image-to-video", label: "Image to Video" },
      { href: "/text-to-image", label: "Text to Image" },
    ],
    seo: {
      intent: "使用参考图片创建 AI 短视频",
      title: "AI 视频生成器",
      description:
        "上传参考图片并描述动作，独立创建短视频并确认 Credits 报价。",
      keywords: ["AI 视频生成器", "图片生成视频", "Image to Video"],
    },
    faq: [
      {
        question: "视频生成需要先完成图片任务吗？",
        answer: "不需要。你可以上传自己的参考图片，直接开始视频工作流。",
      },
      {
        question: "可以选择视频时长吗？",
        answer: "可以。提交前选择 5 秒或 10 秒时长，并查看相应报价。",
      },
    ],
  },
  {
    slug: "text-to-image",
    eyebrow: "IMAGE WORKFLOW",
    title: "从文本创建图片",
    description:
      "通过 Text to Image 工作流创建概念图、社交素材和视觉方向，并保留结果历史。",
    capability: "Text to Image",
    steps: ["写下主体、风格与环境", "设置输出比例", "在 History 中查看结果"],
    related: [
      { href: "/ai-image-generator", label: "AI 图片生成器" },
      { href: "/studio", label: "打开 Studio" },
    ],
    seo: {
      intent: "了解从文本到图片的创作工作流",
      title: "从文本创建图片",
      description: "通过 Text to Image 工作流创建概念图、社交素材和视觉方向。",
      keywords: ["从文本创建图片", "Text to Image 工作流", "AI 概念图"],
    },
    faq: [
      {
        question: "Text to Image 可以用于哪些创作？",
        answer: "可用于概念图、社交素材和前期视觉方向探索。",
      },
      {
        question: "生成结果在哪里查看？",
        answer: "已完成的任务和结果会保留在登录用户的账户历史中。",
      },
    ],
  },
  {
    slug: "image-to-video",
    eyebrow: "VIDEO WORKFLOW",
    title: "从图片创建视频",
    description:
      "使用已有图片作为参考，为镜头补充运动、节奏和氛围，生成短视频片段。",
    capability: "Image to Video",
    steps: ["选择上传图片", "输入运动描述", "确认时长与报价"],
    related: [
      { href: "/ai-video-generator", label: "AI 视频生成器" },
      { href: "/studio", label: "打开 Studio" },
    ],
    seo: {
      intent: "了解从图片到视频的创作工作流",
      title: "从图片创建视频",
      description: "将已有图片作为参考，补充运动、节奏和氛围来创建短视频。",
      keywords: ["从图片创建视频", "Image to Video 工作流", "AI 短视频"],
    },
    faq: [
      {
        question: "上传图片后还需要输入什么？",
        answer: "补充镜头中的变化与运动描述，并选择需要的时长。",
      },
      {
        question: "视频工作流如何计费？",
        answer: "5 秒和 10 秒视频有独立的 Credits Quote，会在提交前显示。",
      },
    ],
  },
  {
    slug: "text-to-speech",
    eyebrow: "AUDIO WORKFLOW",
    title: "从文本创建语音",
    description:
      "输入需要朗读的文本，选择声音标识后生成音频；图片、视频和音频共享同一账户与 Credits。",
    capability: "Text to Speech",
    steps: ["输入需要朗读的文本", "填写可选声音标识", "确认按字符计算的报价"],
    related: [
      { href: "/studio", label: "打开 Studio" },
      { href: "/pricing", label: "查看 Credits" },
    ],
    seo: {
      intent: "使用文本创建 AI 语音",
      title: "从文本创建语音",
      description:
        "输入文本并选择声音标识，创建音频并按字符确认 Credits 报价。",
      keywords: ["从文本创建语音", "Text to Speech", "AI 语音生成"],
    },
    faq: [
      {
        question: "语音生成如何计算 Credits？",
        answer: "系统按文本字符数创建确定报价，提交前会显示总 Credits。",
      },
      {
        question: "语音和图片任务共用余额吗？",
        answer: "共用。同一账户下的三种模态使用统一 Credits 与历史记录。",
      },
    ],
  },
] as const satisfies readonly MarketingPage[];

export const supportPages = [
  {
    slug: "faq",
    eyebrow: "SUPPORT",
    title: "常见问题",
    description: "了解 Studio 的登录、报价、Credits 与任务状态。",
    sections: [
      [
        "何时需要登录？",
        "你可以浏览 Studio 和填写输入；在获取可信报价或提交生成前需要登录。",
      ],
      [
        "Credits 何时扣除？",
        "系统会先展示不可变报价。生成请求获得预留后才会进入 Provider 队列，失败会按状态机处理补偿。",
      ],
      [
        "付款返回页会直接发放 Credits 吗？",
        "不会。余额只能由 Stripe 签名 Webhook 确认后更新。",
      ],
    ],
    seo: {
      intent: "解答 Creen Studio 的常见使用问题",
      title: "常见问题",
      description: "了解 Studio 的登录、报价、Credits 与任务状态。",
      keywords: ["Creen FAQ", "Credits 常见问题", "AI Studio 帮助"],
    },
  },
  {
    slug: "about",
    eyebrow: "ABOUT CREEN",
    title: "一个统一的创作工作区",
    description: "Creen 将图片、视频和音频创作放在一个可追踪的工作区中。",
    sections: [
      [
        "独立的创作路径",
        "三种模态可分别使用，并共享登录、任务历史和 Credits。",
      ],
    ],
    seo: {
      intent: "了解 Creen 统一创作工作区",
      title: "关于 Creen",
      description: "了解 Creen 如何将图片、视频和音频创作放在一个工作区中。",
      keywords: ["关于 Creen", "统一 AI 创作工作区"],
    },
  },
  {
    slug: "contact",
    eyebrow: "CONTACT",
    title: "联系支持团队",
    description:
      "需要帮助时，请附上任务状态和发生时间，避免发送密码、密钥或付款卡信息。",
    sections: [
      ["账户与付款", "付款与 Credits 状态以 Account 页面中的可信记录为准。"],
    ],
    seo: {
      intent: "联系 Creen 支持团队",
      title: "联系支持团队",
      description: "需要账户、付款或任务帮助时，联系 Creen 支持团队。",
      keywords: ["联系 Creen", "Creen 支持"],
    },
  },
  {
    slug: "privacy",
    eyebrow: "PRIVACY",
    title: "隐私说明",
    description:
      "本页面说明该演示工作区中账户、输入和生成记录的最小数据处理边界。",
    sections: [
      [
        "账户数据",
        "身份验证由 Supabase 会话管理；服务端对受保护资源执行所有权校验。",
      ],
    ],
    seo: {
      intent: "了解 Creen 的最小数据处理边界",
      title: "隐私说明",
      description: "了解 Creen 对账户、输入和生成记录的最小数据处理边界。",
      keywords: ["Creen 隐私", "AI 创作隐私说明"],
    },
  },
  {
    slug: "terms",
    eyebrow: "TERMS",
    title: "使用条款",
    description: "使用 Studio 时，请确认你拥有上传内容和提示词的必要权利。",
    sections: [
      [
        "生成与可用性",
        "异步任务可能排队或失败；状态未确认前，不应假定任务完成或 Credits 已最终结算。",
      ],
    ],
    seo: {
      intent: "了解 Creen Studio 的使用条款",
      title: "使用条款",
      description: "了解使用 Studio 时对上传内容、提示词和生成可用性的要求。",
      keywords: ["Creen 使用条款", "AI 创作条款"],
    },
  },
  {
    slug: "refund",
    eyebrow: "REFUND",
    title: "退款说明",
    description:
      "本项目的支付范围固定为 Stripe Sandbox，不在应用内实现退款工作流。",
    sections: [
      [
        "Sandbox 范围",
        "测试支付状态与 Credits 发放以签名 Webhook 和账本记录为准。",
      ],
    ],
    seo: {
      intent: "说明 Creen Stripe Sandbox 的退款范围",
      title: "退款说明",
      description:
        "了解本项目 Stripe Sandbox 支付范围与 Credits 可信状态的依据。",
      keywords: ["Creen 退款", "Stripe Sandbox Credits"],
    },
  },
] as const satisfies readonly SupportPage[];

export function marketingPageFor(slug: string) {
  return marketingPages.find((page) => page.slug === slug);
}

export function supportPageFor(slug: string) {
  return supportPages.find((page) => page.slug === slug);
}
