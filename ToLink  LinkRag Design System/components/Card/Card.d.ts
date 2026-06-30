import * as React from 'react';

export interface CardProps {
  /** Icon node shown in the top-left tile. */
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  /** Mono caption pinned to the card foot. */
  meta?: React.ReactNode;
  /** Surface mode. `card` = cream feature card, `canvas` = hairline on canvas, `dark` = navy product mockup, `coral` = full-bleed callout. */
  variant?: 'card' | 'canvas' | 'dark' | 'coral';
  /** Enables hover affordances: shadow lift, arrow reveal. */
  interactive?: boolean;
  /** @deprecated color-block now — ignored. */
  frosted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

/** Editorial surface card — color-block (cream / navy / coral), 12px radius, no frosted glass. */
export function Card(props: CardProps): JSX.Element;
