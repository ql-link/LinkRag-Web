import * as React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. `primary` = walnut CTA, `ghost` = bare, `outline` = bordered, `pill` = suggestion chip. */
  variant?: 'primary' | 'ghost' | 'outline' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  /** Optional leading icon node (e.g. a Lucide element). */
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

/** Primary action control. Uppercase tracked label, theme-aware via CSS vars. */
export function Button(props: ButtonProps): JSX.Element;
