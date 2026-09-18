import type { ComponentType } from "react";

/**
 * An icon component, typed as what we actually render.
 *
 * These config maps used to say `React.ElementType`. That is a union of
 * every component type AND every key of JSX.IntrinsicElements — and
 * @react-three/fiber augments IntrinsicElements with hundreds of three.js
 * tags whose props have nothing in common with an SVG icon's. JSX then
 * intersects the props across that whole union, `className` collapses to
 * `never`, and `<Icon className="w-4 h-4" />` fails to typecheck.
 *
 * The honest type is narrower and truer: every value in those maps is an
 * icon that takes a class, a size and a weight.
 */
export type IconType = ComponentType<{
  className?: string;
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}>;
