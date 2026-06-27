/* Button — Claude (Anthropic) editorial action control.
   Coral primary, humanist-sans label (sentence case, NOT uppercase),
   8px radius. Self-contained; themes via CSS custom properties. */

const { useState } = React;

const BTN_SIZES = {
  sm: { padding: '8px 14px', fontSize: 13, height: 34 },
  md: { padding: '10px 20px', fontSize: 14, height: 40 },
  lg: { padding: '13px 24px', fontSize: 15, height: 48 },
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
  const sz = BTN_SIZES[size] || BTN_SIZES.md;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1,
    height: sz.height,
    padding: sz.padding,
    fontSize: sz.fontSize,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--radius-md)',
    transition: 'background var(--duration-sm) var(--ease-out), border-color var(--duration-sm) var(--ease-out)',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
  };

  const h = hover && !disabled;
  const variants = {
    // Signature coral CTA → darkens on press/hover
    primary: {
      background: disabled ? 'var(--primary-disabled)' : h ? 'var(--primary-active)' : 'var(--primary)',
      color: disabled ? 'var(--muted)' : 'var(--on-primary)',
    },
    // Cream button with hairline outline
    secondary: {
      background: h ? 'var(--surface-soft)' : 'var(--canvas)',
      color: 'var(--ink)',
      borderColor: 'var(--hairline)',
      opacity: disabled ? 0.5 : 1,
    },
    // Inline text button, no background
    ghost: {
      background: h ? 'var(--surface-soft)' : 'transparent',
      color: 'var(--ink)',
      opacity: disabled ? 0.5 : 1,
    },
    // Coral inline link
    link: {
      background: 'transparent',
      color: 'var(--primary)',
      padding: 0,
      height: 'auto',
      textDecoration: h ? 'underline' : 'none',
      textUnderlineOffset: 3,
      opacity: disabled ? 0.5 : 1,
    },
    // Outline (ink)
    outline: {
      background: 'transparent',
      color: 'var(--ink)',
      borderColor: h ? 'var(--ink)' : 'var(--hairline)',
      opacity: disabled ? 0.5 : 1,
    },
    // Pill — category/filter tab
    pill: {
      background: h ? 'var(--surface-card)' : 'transparent',
      color: 'var(--muted)',
      borderColor: 'var(--hairline)',
      borderRadius: 'var(--radius-pill)',
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
