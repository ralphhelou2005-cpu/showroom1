/* an address under /admin that doesn't exist */
export default function AdminNotFound() {
  return (
    <main id="main" className="[display:grid] min-h-dvh place-items-center px-[var(--gutter)]">
      <div className="max-w-[520px] text-center">
        <p className="label">Milcar dashboard</p>
        <h1 className="mt-4 text-[clamp(34px,6vw,48px)]">There’s no page here</h1>
        <p className="mt-4 mb-8 text-muted">The address may be mistyped. Everything in the dashboard is reached from its menu.</p>
        <a className="btn" href="/admin">Back to the overview</a>
      </div>
    </main>
  );
}
