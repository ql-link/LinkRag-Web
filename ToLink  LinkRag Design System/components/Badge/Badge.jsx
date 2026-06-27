/* Badge — compact pill label (Claude editorial).
   Pill radius, sentence/uppercase per tone. Coral = featured/NEW. */

export function Badge({ children, tone = 'neutral', dot = false, icon = null, uppercase = false }) {
  const tones = {
    primary: { bg: 'var(--primary)', fg: 'var(--on-primary)', bd: 'transparent' },
    neutral: { bg: 'var(--surface-card)', fg: 'var(--ink)', bd: 'var(--hairline)' },
    teal: { bg: 'rgba(93,184,166,0.14)', fg: '#3f8e7e', bd: 'rgba(93,184,166,0.30)' },
    amber: { bg: 'rgba(232,165,90,0.16)', fg: '#b9772d', bd: 'rgba(232,165,90,0.32)' },
    success: { bg: 'rgba(93,184,114,0.14)', fg: '#3f8e54', bd: 'rgba(93,184,114,0.30)' },
    info: { bg: 'rgba(91,127,184,0.14)', fg: 'var(--info)', bd: 'rgba(91,127,184,0.30)' },
    error: { bg: 'rgba(198,69,69,0.12)', fg: 'var(--error)', bd: 'rgba(198,69,69,0.26)' },
    warning: { bg: 'rgba(212,160,23,0.16)', fg: '#9a7510', bd: 'rgba(212,160,23,0.32)' },
  };
  const c = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-sans)',
        fontSize: uppercase ? 12 : 13,
        fontWeight: 500,
        textTransform: uppercase ? 'uppercase' : 'none',
        letterSpacing: uppercase ? '0.1em' : 0,
        lineHeight: 1.3,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
      {icon}
      {children}
    </span>
  );
}
