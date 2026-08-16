export const siteConfig = {
  name: "Creen",
  title: "Creen — 统一 AI 创作工作区",
  description:
    "在统一工作区中创建图片、视频与音频，并在生成前提供清晰的 Credits 报价。",
  navigation: [
    { label: "创作", href: "/studio" },
    { label: "功能", href: "/features" },
    { label: "模型", href: "/models" },
    { label: "价格", href: "/pricing" },
  ],
} as const;

export type NavigationItem = (typeof siteConfig.navigation)[number];
