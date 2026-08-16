export default function Loading() {
  return (
    <main className="state-page" aria-live="polite" aria-busy="true">
      <p className="eyebrow">LOADING</p>
      <h1>正在准备工作区</h1>
      <div className="state-page__bar" aria-hidden="true" />
    </main>
  );
}
