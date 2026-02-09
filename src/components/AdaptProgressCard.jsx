
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PhaseProgressBar from './PhaseProgressBar';
import { computeProgress, deleteProject } from '../lib/progressStore';
import { PHASES } from '../lib/progressStore';
import { Trash2 } from 'lucide-react';
import {
  Brain,
  Shield,
  Zap,
} from 'lucide-react';

export default function AdaptProgressCard({ record }) {
  const navigate = useNavigate();
  const { completedSet, doneCount, total, nextPhase } = computeProgress(record);

  
console.debug('AdaptProgressCard progress:', {
  projectId: record.id,
  completed: Array.from(completedSet),
  doneCount,
  total,
  nextPhase
});

  const onResume = () => {
    if (!nextPhase) return; // all complete
    const route = nextPhase.route || '/';
    navigate(route, { state: { projectId: record.id, projectName: record.meta?.title } });
  };

  const onDelete = () => {
    deleteProject(record.id);
  };

  return (
    <article className="ap-card">
      <header className="ap-header">
        <div>
          <h4 className="ap-title">{record.meta?.title || '(Untitled)'}</h4>
          <div className="ap-sub">
            <span className="chip small">Content</span>
            <span className="sep">·</span>
            <span>{record.meta?.therapeuticContext || record.meta?.domain || '—'}</span>
          </div>
        </div>
        <span className="ap-status chip chip-blue">In Progress</span>
      </header>

      <div className="ap-section">
        <PhaseProgressBar completedSet={completedSet} nextPhase={nextPhase} />
      </div>
      <div className="ap-divider" />
      <div className="ap-grid">
        <div className="ap-row">
          <div className="ap-label">Target Markets</div>
          <div className="ap-value">
{Array.isArray(record.meta?.marketCodes) && record.meta.marketCodes.length > 0
    ? record.meta.marketCodes.join(', ')
    : '—'}
</div>
        </div>
        <div className="ap-row">
          <div className="ap-label">Languages</div>
          <div className="ap-value">{record.meta?.marketsCount ?? 0}</div>
        </div>
      </div>
      <div className="ap-divider" />
      
<div className="ap-metrics">
  <Metric
    icon={Brain}
    label="Cultural"
    value={completedSet.has('P3') ? '100%' : '0%'}
  />
  <Metric
    icon={Shield}
    label="Regulatory"
    value={completedSet.has('P4') ? '100%' : '0%'}
  />
  <Metric
    icon={Zap}
    label="TM Leverage"
    value={completedSet.has('P2') ? '100%' : '0%'}
  />
</div>


      <footer className="ap-footer">
        <button className="ap-btn ap-btn--primary" onClick={onResume}>Resume Work</button>
        <button className="ap-btn ap-btn--ghost" onClick={onDelete}><Trash2 size={16} /> Delete</button>
      </footer>
    </article>
  );
}


function Metric({ icon: Icon, label, value }) {
  return (
    <div className="ap-metric">
      <div className="ap-metric-top">
        {Icon && <Icon size={18} className="ap-metric-icon" aria-hidden="true" />}
       
      </div>
      <div> <span className="ap-metric-label">{label}</span></div>
      <div className="ap-metric-value">{value}</div>
    </div>
  );
}


