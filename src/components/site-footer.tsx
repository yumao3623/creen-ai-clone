import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>Creen · 统一 AI 创作工作区</p>
        <nav aria-label="页脚导航">
          <Link href="/faq">FAQ</Link>
          <Link href="/about">关于</Link>
          <Link href="/contact">联系</Link>
          <Link href="/privacy">隐私</Link>
          <Link href="/terms">条款</Link>
          <Link href="/refund">退款</Link>
        </nav>
      </div>
    </footer>
  );
}
