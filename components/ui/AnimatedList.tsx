"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <AnimatePresence initial={false}>
      <ul className={cn("flex flex-col gap-2", className)}>{children}</ul>
    </AnimatePresence>
  );
}

// 👇 NOTE: this is a different type than AnimatedListProps
// Exclude HTML event handlers that conflict with Framer Motion's event system
export interface AnimatedListItemProps
  extends Omit<
    React.LiHTMLAttributes<HTMLLIElement>,
    // Drag events (Framer Motion has its own drag system)
    "onDrag" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragExit" | "onDragLeave" | "onDragOver" | "onDrop" |
    // Animation events (Framer Motion handles animations differently)
    "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" |
    // Transition events (Framer Motion handles transitions)
    "onTransitionEnd"
  > {}

export function AnimatedListItem({
  className,
  children,
  ...rest
}: AnimatedListItemProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className={cn("rounded-md", className)}
      {...rest}
    >
      {children}
    </motion.li>
  );
}
