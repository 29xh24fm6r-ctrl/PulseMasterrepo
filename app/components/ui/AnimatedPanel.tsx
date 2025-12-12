// Animated Panel for Section-Level Animations
// app/components/ui/AnimatedPanel.tsx

"use client";

import { motion } from "framer-motion";
import { motionDurations, motionEasings } from "@/lib/ui/animation";
import { cn } from "@/lib/utils";

interface AnimatedPanelProps extends React.HTMLAttributes<HTMLElement> {
  delay?: number;
  children: React.ReactNode;
}

export function AnimatedPanel({
  delay = 0,
  children,
  className,
  ...rest
}: AnimatedPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDurations.normal,
        delay,
        ease: motionEasings.entrance,
      }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.section>
  );
}




