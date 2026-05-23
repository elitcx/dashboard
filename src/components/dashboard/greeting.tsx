"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { greeting } from "@/lib/utils";

export function Greeting({ name }: { name?: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10"
    >
      <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">
        {greeting()},{" "}
        <span className="text-gradient-emerald">{name?.split(" ")[0] ?? "there"}</span>
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {now
          ? now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          : ""}
      </p>
    </motion.div>
  );
}
