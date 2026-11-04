import { TERMS } from "@/lib/terms";

export function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {TERMS.map((t) => (
        <section key={t.title}>
          <h2 className="font-semibold text-foreground">{t.title}</h2>
          <p className="mt-1 text-muted">{t.body}</p>
        </section>
      ))}
    </div>
  );
}
