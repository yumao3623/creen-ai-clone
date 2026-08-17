"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unexpected application error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="state-page">
      <p className="eyebrow">发生错误</p>
      <h1>页面暂时无法加载</h1>
      <p>请稍后重试。如果问题持续存在，请返回首页。</p>
      <button className="button button--primary" type="button" onClick={reset}>
        重试
      </button>
    </main>
  );
}
