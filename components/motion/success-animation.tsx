"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function SuccessAnimation() {
  return (
    <div className="relative grid size-16 place-items-center">
      <motion.span
        className="absolute size-16 rounded-full bg-accent/35"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.08, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
      <motion.span
        className="relative grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"
        initial={{ scale: 0.75 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Check className="size-6" aria-hidden="true" />
      </motion.span>
      {[0, 1, 2, 3].map((item) => (
        <motion.span
          key={item}
          className="absolute size-1.5 rounded-full bg-warning"
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: [18, -18, 12, -12][item],
            y: [-18, -14, 18, 14][item],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
