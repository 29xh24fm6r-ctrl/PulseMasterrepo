// Animated Card Wrapper
// app/components/ui/AnimatedCard.tsx

"use client";

import { motion } from "framer-motion";
import { motionDurations, motionEasings, motionVariants } from "@/lib/ui/animation";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  variant?: keyof typeof motionVariants;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  variant = "fadeInUp",
  ...rest
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={motionVariants[variant]}
      initial="initial"
      animate="animate"
      transition={{
        duration: motionDurations.normal,
        delay,
        ease: motionEasings.entrance,
      }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}




