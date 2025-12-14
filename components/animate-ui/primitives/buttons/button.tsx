"use client";

import { type HTMLMotionProps, motion } from "motion/react";

import {
  Slot,
  type WithAsChild,
} from "@/components/animate-ui/primitives/animate/slot";

type ButtonProps = WithAsChild<
  HTMLMotionProps<"button"> & {
    hoverScale?: number;
    tapScale?: number;
  }
>;

function Button(props: ButtonProps) {
  const hoverScale = props.hoverScale ?? 1.05;
  const tapScale = props.tapScale ?? 0.95;

  if (props.asChild === true) {
    const {
      asChild: _asChild,
      hoverScale: _hoverScale,
      tapScale: _tapScale,
      ...rest
    } = props;

    return (
      <Slot
        whileTap={{ scale: tapScale }}
        whileHover={{ scale: hoverScale }}
        {...rest}
      >
        {props.children}
      </Slot>
    );
  }

  const {
    asChild: _asChild,
    hoverScale: _hoverScale,
    tapScale: _tapScale,
    ...rest
  } = props;

  return (
    <motion.button
      whileTap={{ scale: tapScale }}
      whileHover={{ scale: hoverScale }}
      {...rest}
    >
      {props.children}
    </motion.button>
  );
}

export { Button, type ButtonProps };
