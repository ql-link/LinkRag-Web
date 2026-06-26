/* Card — Claude (Anthropic) editorial surface card.
   Color-block first: flat cream (surface-card), dark-navy (product
   mockups), or coral (callout). 12px radius, generous padding, no
   frosted glass. Optional interactive arrow nudge. */

const { useState } = React;

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const SURFACES = {
  card: { bg: 'var(--surface-card)', bd: 'transparent', ink: 'var(--ink)', sub: 'var(--body)', iconBg: 'var(--canvas)', iconFg: 'var(--primary)' },
  canvas: { bg: 'var(--canvas)', bd: 'var(--hairline)', ink: 'var(--ink)', sub: 'var(--body)', iconBg: 'var(--surface-card)', iconFg: 'var(--primary)' },
  dark: { bg: 'var(--surface-dark)', bd: 'transparent', ink: 'var(--on-dark)', sub: 'var(--on-dark-soft)', iconBg: 'var(--surface-dark-elevated)', iconFg: 'var(--primary)' },
  coral: { bg: 'var(--primary)', bd: 'transparent', ink: 'var(--on-primary)', sub: 'rgba(255,255,255,0.82)', iconBg: 'rgba(255,255,255,0.16)', iconFg: 'var(--on-primary)' },
};

export function Card({
  icon = null,
  title,
  description,
  meta = null,
  variant = 'card',   // card | canvas | dark | coral
  interactive = false,
  frosted = false,     // legacy — ignored (color-block now)
  onClick,
  children,
}) {
  const [hover, setHover] = useState(false);
  const h = interactive && hover;
  const s = SURFACES[variant] || SURFACES.card;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 32,
        borderRadius: 'var(--radius-lg)',
        background: s.bg,
        border: `1px solid ${s.bd}`,
        boxShadow: h ? 'var(--shadow-card-hover)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'box-shadow var(--duration-lg) var(--ease-out), transform var(--duration-lg) var(--ease-out)',
        transform: h ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {(icon || interactive) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {icon && (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: s.iconBg,
                color: s.iconFg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          {interactive && (
            <span
              style={{
                color: s.iconFg,
                opacity: h ? 1 : 0.5,
                transform: h ? 'translateX(3px)' : 'translateX(0)',
                transition: 'all var(--duration-md) var(--ease-out)',
                marginTop: 6,
              }}
            >
              {ARROW}
            </span>
          )}
        </div>
      )}
      {title && (
        <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, letterSpacing: 0, margin: 0, color: s.ink }}>
          {title}
        </h4>
      )}
      {description && (
        <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, color: s.sub }}>{description}</p>
      )}
      {children}
      {meta && (
        <div
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.02em',
            color: variant === 'dark' || variant === 'coral' ? s.sub : 'var(--muted)',
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}
