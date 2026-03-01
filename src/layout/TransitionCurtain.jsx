import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function TransitionCurtain({ show, dir }) {
  // dir: 1 forward, -1 back
  const DIST = 120; // obvious direction

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="curtain"
          initial={{ opacity: 0, x: dir * DIST }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -DIST }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="curtainCard">
            <div className="curtainTitle">Loading view…</div>
            <div className="curtainSub">Preparing visualization</div>
            <div className="curtainBar" />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}