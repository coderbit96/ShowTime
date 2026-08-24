"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef } from "react";

export function SeatMotion({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof motion.button>) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
