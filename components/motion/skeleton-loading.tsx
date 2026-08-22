"use client";

import { motion } from "framer-motion";

type SkeletonLoadingProps = {
  className?: string;
};

export function SkeletonLoading({ className = "" }: SkeletonLoadingProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={`overflow-hidden rounded-md bg-mist ${className}`}
      initial={{ opacity: 0.72 }}
      animate={{ opacity: [0.72, 1, 0.72] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/45 to-transparent" />
    </motion.div>
  );
}
