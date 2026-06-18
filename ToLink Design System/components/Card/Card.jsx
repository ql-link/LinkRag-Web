/* Card — frosted action / content card.
   The signature surface: 16px radius, hairline border that warms to the
   primary accent on hover (when interactive), arrow nudge reveal. */

const { useState } = React;

const ARROW = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

export function Card({
  icon = null,
  title,
  description,
  meta = null,
  interactive = false,
  frosted = false,
  onClick,
  children,
}) {
  const [hover, setHover] = useState(false);
  const h = interactive && hover;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 18,
        borderRadius: 'var(--radius-lg)',
        background: frosted ? 'var(--color-bg-card)' : 'var(--color-bg-card-solid)',
        backdropFilter: frosted ? 'blur(8px)' : undefined,
        WebkitBackdropFilter: frosted ? 'blur(8px)' : undefined,
        border: `1px solid ${h ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
        boxShadow: h ? 'var(--shadow-card-hover)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all var(--duration-lg) var(--ease-out)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {(icon || interactive) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {icon && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: h ? 'var(--color-primary-mid)' : 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background var(--duration-md) var(--ease-out)',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          {interactive && (
            <span
              style={{
                color: 'var(--color-primary)',
                opacity: h ? 1 : 0,
                transform: h ? 'translateX(2px)' : 'translateX(0)',
                transition: 'all var(--duration-md) var(--ease-out)',
                marginTop: 4,
              }}
            >
              {ARROW}
            </span>
          )}
        </div>
      )}
      {title && (
        <h4 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', margin: 0, color: 'var(--color-text-main)' }}>
          {title}
        </h4>
      )}
      {description && (
        <p style={{ fontSize: 11, lineHeight: 1.5, margin: 0, color: 'var(--color-text-tertiary)' }}>{description}</p>
      )}
      {children}
      {meta && (
        <div
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}
