import * as React from 'react';

export interface CardProps {
  /** Icon node shown in the top-left tile. */
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  /** Mono caption pinned to the card foot. */
  meta?: React.ReactNode;
  /** Enables hover affordances: amber border, shadow lift, arrow reveal. */
  interactive?: boolean;
  /** Use the translucent frosted-glass surface instead of solid. */
  frosted?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

/** Frosted action / content card — the system's signature surface. */
export function Card(props: CardProps): JSX.Element;
