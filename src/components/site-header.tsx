import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getAuthenticatedUser } from "@/integrations/supabase/server";

export async function SiteHeader() {
  const { user } = await getAuthenticatedUser();

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label={`${siteConfig.name} 首页`}>
          <span className="brand__mark" aria-hidden="true">
            C
          </span>
          <span>{siteConfig.name}</span>
        </Link>

        <nav aria-label="主导航">
          <ul className="site-nav">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <details className="site-menu">
          <summary aria-label="打开导航">菜单</summary>
          <nav aria-label="移动导航">
            {siteConfig.navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>

        <div className="site-header__account">
          <Link className="header-studio-link" href="/studio">
            开始创作
          </Link>
          {user ? (
            <>
              <Link href="/account">账户</Link>
              <form action="/auth/logout" method="post">
                <button className="header-action" type="submit">
                  退出
                </button>
              </form>
            </>
          ) : (
            <Link className="header-action" href="/login">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
