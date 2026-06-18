/* Badge — compact status / category label.
   8px radius, 10px uppercase tracked. Tone drives color from CSS vars. */

export function Badge({ children, tone = 'neutral', dot = false, icon = null }) {
  const tones = {
    primary: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)', bd: 'var(--color-primary-mid)' },
    neutral: { bg: 'var(--color-bg-inset)', fg: 'var(--color-text-secondary)', bd: 'var(--color-border-subtle)' },
    success: { bg: 'rgba(34,197,94,0.10)', fg: 'var(--color-success)', bd: 'rgba(34,197,94,0.22)' },
    info: { bg: 'rgba(59,130,246,0.10)', fg: 'var(--color-info)', bd: 'rgba(59,130,246,0.22)' },
    error: { bg: 'rgba(217,115,115,0.10)', fg: 'var(--color-error)', bd: 'rgba(217,115,115,0.22)' },
    warning: { bg: 'rgba(245,158,11,0.10)', fg: 'var(--color-warning)', bd: 'rgba(245,158,11,0.22)' },
  };
  const c = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        lineHeight: 1,
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
