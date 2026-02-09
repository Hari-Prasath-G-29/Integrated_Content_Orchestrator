
// PhaseProgressBar.jsx
import React from 'react';
import { PHASES } from '../lib/progressStore';

export default function PhaseProgressBar({ completedSet, nextPhase }) {
  const completed = completedSet instanceof Set ? completedSet : new Set(completedSet || []);
  const total = PHASES.length;
  const doneCount = completed.size;
 
return (
  <div className="pp-wrap">
    <div className="pp-top">
      <span className="pp-title">Phase Progress</span>
      <span className="pp-count">{doneCount} of {total} Phases Complete</span>
    </div>

    <div className="pp-bar">
      {PHASES.map((p) => {
        const idUpper = String(p.id).toUpperCase();

        // ✅ ONLY this decides green
        const isDone = completed.has(idUpper);

        // Optional: show a subtle outline on the next incomplete phase,
        // but DO NOT make it green.
        const isCurrent = nextPhase?.id === p.id;

        const cls = [
          'pp-seg',
          isDone ? 'pp-seg--done' : 'pp-seg--todo',
          isCurrent ? 'pp-seg--current' : ''  // this should be a light outline, not green
        ].join(' ');

        return (
          <div key={p.id} className={cls} tabIndex={0} role="button">
            <div className="pp-seg-label">{p.label}</div>
            {/* hover-only badge, not persistent */}
            <div className="pp-seg-badge">{p.display}</div>
          </div>
        );
      })}
    </div>
  </div>
);

}
