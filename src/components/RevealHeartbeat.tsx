import { motion } from "framer-motion";

/** Tension beat between reveal steps. Themed, centered, loops until the next phase replaces it. */
export const RevealHeartbeat = ({ label }: { label?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center bg-[color:var(--sb-bg)]"
  >
    {/* Atmosphere: accent bleeding into the background from the center, breathing with the core */}
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at center, color-mix(in srgb, var(--sb-accent) 32%, var(--sb-bg)) 0%, color-mix(in srgb, var(--sb-accent) 10%, var(--sb-bg)) 38%, var(--sb-bg) 72%)",
      }}
    />
    <div className="relative grid place-items-center" style={{ width: "70vmin", height: "70vmin" }}>
      {/* Two staggered shock rings: soft-edged bands that expand and fade */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.35, opacity: 0 }}
          animate={{ scale: [0.35, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: i }}
          className="absolute rounded-full"
          style={{
            width: "46vmin",
            height: "46vmin",
            background:
              "radial-gradient(circle, transparent 52%, color-mix(in srgb, var(--sb-accent) 85%, transparent) 62%, transparent 74%)",
          }}
        />
      ))}
      {/* Soft halo */}
      <motion.div
        animate={{ scale: [0.9, 1.25, 0.9], opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: "34vmin",
          height: "34vmin",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--sb-accent) 70%, transparent) 0%, color-mix(in srgb, var(--sb-accent) 28%, transparent) 45%, transparent 70%)",
        }}
      />
      {/* Core: lit from the top-left so it reads as a sphere, not a flat disc */}
      <motion.div
        animate={{ scale: [1, 1.14, 0.94, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-full"
        style={{
          width: "14vmin",
          height: "14vmin",
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--sb-accent) 55%, white) 0%, var(--sb-accent) 55%, color-mix(in srgb, var(--sb-accent) 70%, black) 100%)",
        }}
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
