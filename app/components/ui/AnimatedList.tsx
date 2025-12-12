// Animated List with Staggered Children
// app/components/ui/AnimatedList.tsx

"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/ui/animation";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({
  children,
  className,
  staggerDelay = 0.04,
}: AnimatedListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AnimatedListItem({
  children,
  className,
  ...rest
}: AnimatedListItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}




