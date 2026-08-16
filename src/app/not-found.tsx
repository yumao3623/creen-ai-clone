import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <p className="eyebrow">404</p>
      <h1>没有找到这个页面</h1>
      <p>该路径尚不存在，或已被移动。</p>
      <Link className="button button--primary" href="/">
        返回首页
      </Link>
    </main>
  );
}
