// Animated Icon Button
// app/components/ui/AnimatedIconButton.tsx

"use client";

import { motion } from "framer-motion";
import { motionVariants } from "@/lib/ui/animation";
import { cn } from "@/lib/utils";

interface AnimatedIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AnimatedIconButton({
  children,
  className,
  ...rest
}: AnimatedIconButtonProps) {
  return (
    <motion.button
      whileHover={motionVariants.subtlePop.hover}
      whileTap={motionVariants.subtlePop.tap}
      transition={{ duration: 0.12 }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}




