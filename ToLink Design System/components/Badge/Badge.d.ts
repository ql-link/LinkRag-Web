import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Color tone. Maps to semantic token sets. */
  tone?: 'primary' | 'neutral' | 'success' | 'info' | 'error' | 'warning';
  /** Show a leading status dot in the current tone color. */
  dot?: boolean;
  icon?: React.ReactNode;
}

/** Compact status / category label. */
export function Badge(props: BadgeProps): JSX.Element;
