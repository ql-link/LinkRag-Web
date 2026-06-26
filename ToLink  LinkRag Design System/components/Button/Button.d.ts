import * as React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. `primary` = coral CTA, `secondary` = cream+hairline, `ghost` = bare, `link` = coral inline link, `outline` = ink-bordered, `pill` = category/filter tab. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'outline' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  /** Optional leading icon node (e.g. a Lucide element). */
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

/** Primary action control. Coral CTA, humanist-sans label (sentence case), 8px radius. Theme-aware via CSS vars. */
export function Button(props: ButtonProps): JSX.Element;
