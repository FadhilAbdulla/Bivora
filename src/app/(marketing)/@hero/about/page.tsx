export default function AboutHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="grid-bg animate-pan absolute inset-0" aria-hidden />
      <div className="animate-drift absolute -top-32 left-1/3 h-80 w-[40rem] rounded-full bg-brand/12 blur-[110px]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="animate-enter text-xs font-semibold uppercase tracking-[0.18em] text-gold">About us</p>
        <h1 className="animate-enter mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl" style={{ "--delay": "100ms" } as React.CSSProperties}>
          Trading made clear, from your first deposit to your last withdrawal.
        </h1>
      </div>
    </section>
  );
}
