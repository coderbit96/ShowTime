"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef } from "react";

type CardHoverProps = ComponentPropsWithoutRef<typeof motion.div>;

export function CardHover({ children, ...props }: CardHoverProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ y: -1, scale: 0.992 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
