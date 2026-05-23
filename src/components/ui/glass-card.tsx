"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLMotionProps<"div"> & {
  hoverable?: boolean;
  delay?: number;
};

export function GlassCard({
  className,
  hoverable = true,
  delay = 0,
  children,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass rounded-3xl p-7",
        hoverable && "glass-hover cursor-default",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/90", className)}>
      {children}
    </p>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-lg font-medium tracking-tight text-white", className)}>
      {children}
    </h3>
  );
}
