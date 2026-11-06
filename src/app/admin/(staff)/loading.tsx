/* Shown the instant a dashboard link is clicked, in the page's place (the menu stays), while the server prepares the
   page: the switch is immediate and the figures follow a moment later. Next.js also fetches this ahead for every
   link in view, so nothing has to arrive before the switch. `data-loading` tells the end-to-end tests to wait. */
export default function Loading() {
  return (
    <div data-loading aria-busy="true">
      <p role="status" className="label m-0 animate-pulse">One moment</p>
      <div className="mt-4 h-[clamp(38px,6vw,64px)] w-[min(420px,70%)] animate-pulse rounded-2xl bg-panel" />
      <div className="mt-10 [display:grid] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-36 animate-pulse rounded-3xl bg-panel shadow-[inset_0_0_0_1px_var(--line)]" />)}
      </div>
    </div>
  );
}
