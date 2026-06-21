/* Button — ToLink/LinkRag primary action control.
   Self-contained React component; themes via CSS custom properties
   (auto-adapts to .dark). Uppercase tracked label is the universal pattern. */

const { useState } = React;

const BTN_SIZES = {
  sm: { padding: '7px 14px', fontSize: 11 },
  md: { padding: '10px 18px', fontSize: 12 },
  lg: { padding: '13px 22px', fontSize: 13 },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
}) {
  const [hover, setHover] = useState(false);

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    lineHeight: 1,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--radius-md)',
    transition: 'all var(--duration-sm) var(--ease-out)',
    width: fullWidth ? '100%' : 'auto',
    ...(BTN_SIZES[size] || BTN_SIZES.md),
  };

  const h = hover && !disabled;
  const variants = {
    primary: {
      background: 'var(--color-btn-primary)',
      color: 'var(--color-btn-text)',
      opacity: disabled ? 0.5 : h ? 0.9 : 1,
    },
    ghost: {
      background: h ? 'var(--color-primary-hover)' : 'transparent',
      color: 'var(--color-text-secondary)',
      opacity: disabled ? 0.5 : 1,
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-text-main)',
      borderColor: h ? 'var(--color-primary)' : 'var(--color-border-subtle)',
      opacity: disabled ? 0.5 : 1,
    },
    pill: {
      background: h ? 'var(--color-btn-primary)' : 'transparent',
      color: h ? 'var(--color-btn-text)' : 'var(--color-text-main)',
      borderColor: 'var(--color-border-subtle)',
      borderRadius: 'var(--radius-pill)',
      letterSpacing: '0.14em',
      opacity: disabled ? 0.5 : 1,
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...(variants[variant] || variants.primary) }}
    >
      {icon}
      {children}
    </button>
  );
}
