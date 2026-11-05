import type { ReactNode } from 'react';

/* the doors to the dashboard: one panel on the showroom's night background */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="env" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <main id="main" className="[display:grid] min-h-dvh place-items-center px-[var(--gutter)] py-16">
        <div className="w-full max-w-[460px]">
          <a href="/" className="mb-10 block text-center font-display text-[34px] tracking-[.04em] text-ink no-underline">
            Milcar<span className="label mt-2 block">Staff</span>
          </a>
          <div className="rounded-[28px] bg-panel/80 px-[clamp(24px,6vw,44px)] py-[clamp(28px,6vw,44px)] shadow-[inset_0_0_0_1px_var(--line),0_30px_80px_rgba(0,0,0,.45)]">
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
