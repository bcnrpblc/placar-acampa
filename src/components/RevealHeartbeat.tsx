import { motion } from "framer-motion";

/** Tension beat between reveal steps. Themed, centered, loops until the next phase replaces it. */
export const RevealHeartbeat = ({ label }: { label?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center bg-[color:var(--sb-bg)]"
  >
    <div className="relative grid place-items-center" style={{ width: "60vmin", height: "60vmin" }}>
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full bg-[color:var(--sb-accent)]"
        style={{ width: "30vmin", height: "30vmin" }}
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="absolute rounded-full bg-[color:var(--sb-accent)]"
        style={{ width: "22vmin", height: "22vmin" }}
      />
      <motion.div
        animate={{ scale: [1, 1.12, 0.92, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-full bg-[color:var(--sb-accent)]"
        style={{ width: "14vmin", height: "14vmin" }}
      />
    </div>
    {label && (
      <p
        className="absolute text-center font-bold uppercase text-[color:var(--sb-muted)]"
        style={{ bottom: "12vmin", fontSize: "3.6vmin", letterSpacing: "0.12em" }}
      >
        {label}
      </p>
    )}
  </motion.div>
);
