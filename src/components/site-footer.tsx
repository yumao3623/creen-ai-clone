import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <p>Creen</p>
          <span>统一 AI 创作工作区</span>
        </div>
        <nav aria-label="产品链接">
          <h2>产品</h2>
          <Link href="/studio">创作</Link>
          <Link href="/features">功能</Link>
          <Link href="/models">模型</Link>
          <Link href="/pricing">价格</Link>
        </nav>
        <nav aria-label="支持链接">
          <h2>支持</h2>
          <Link href="/faq">常见问题</Link>
          <Link href="/about">关于</Link>
          <Link href="/contact">联系</Link>
        </nav>
        <nav aria-label="法律链接">
          <h2>法律</h2>
          <Link href="/privacy">隐私</Link>
          <Link href="/terms">条款</Link>
          <Link href="/refund">退款</Link>
        </nav>
      </div>
      <p className="site-footer__copyright">Creen AI 创作工作区</p>
    </footer>
  );
}
