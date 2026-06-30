import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Color tone. `primary` = coral fill, `neutral` = cream pill, plus accent/semantic tones. */
  tone?: 'primary' | 'neutral' | 'teal' | 'amber' | 'success' | 'info' | 'error' | 'warning';
  /** Show a leading status dot in the current tone color. */
  dot?: boolean;
  /** Uppercase + tracked (e.g. "NEW", "BETA"). */
  uppercase?: boolean;
  icon?: React.ReactNode;
}

/** Compact pill label — category tags & status. Coral fill = featured/NEW. */
export function Badge(props: BadgeProps): JSX.Element;
