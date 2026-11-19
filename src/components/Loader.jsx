import React from 'react';
import { PageSkeleton } from './skeletons';

/**
 * Generic page loading placeholder.
 *
 * The app used to show the animated logo here; loading states are now
 * skeleton based so the layout does not jump when data arrives. Pages that
 * benefit from a closer match can import the tailored skeletons from
 * `components/skeletons` directly.
 */
export default function Loader() {
  return <PageSkeleton />;
}
