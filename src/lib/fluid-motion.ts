import type { Transition } from 'motion/react';

/**
 * Shared interruptible springs for public-facing surfaces.
 * Motion springs always continue from the element's current rendered value.
 */
export const fluidSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.82,
};

export const fluidSpringSoft: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 34,
  mass: 0.95,
};

export const fluidSpringQuick: Transition = {
  type: 'spring',
  stiffness: 560,
  damping: 42,
  mass: 0.68,
};

export const fluidPress = { scale: 0.97 } as const;
export const fluidLift = { y: -4, scale: 1.012 } as const;

export function fluidEnterTransition(reducedMotion: boolean | null): Transition {
  return reducedMotion ? { duration: 0.14, ease: 'linear' } : fluidSpringSoft;
}
