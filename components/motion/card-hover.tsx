"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef } from "react";

type CardHoverProps = ComponentPropsWithoutRef<typeof motion.div>;

export function CardHover({ children, ...props }: CardHoverProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
