import React, { useMemo } from "react";
import "../App.css";

export default function TMLeverageOverview({ segments = [] }) {
  // --- Analytics Logic ---
  // In a real app, segments would have a 'matchScore' property (0-100).
  // Here we simulate or calculate based on status/properties.
  
  const stats = useMemo(() => {
    let exact = 0;
    let fuzzy = 0;
    let newSegs = 0;
    let totalScore = 0;

    segments.forEach((seg) => {
      // Logic: Check if there's a simulated match score, otherwise default to "New"
      // You can bind this to real data properties like seg.matchScore later.
      const score = seg.matchScore || 0; 
      
      if (score === 100) exact++;
      else if (score >= 75) fuzzy++;
      else newSegs++;

      totalScore += score;
    });

    const total = segments.length;
    const avgMatch = total > 0 ? Math.round(totalScore / total) : 0;
    
    // Leverage Rate: (Exact + Fuzzy) / Total
    const leverageRate = total > 0 ? Math.round(((exact + fuzzy) / total) * 100) : 0;

    return { total, exact, fuzzy, newSegs, avgMatch, leverageRate };
  }, [segments]);

  return (
    <div className="tm-overview-container">
      {/* Top Header Section inside the tab view */}
      <div className="tm-ov-header">
        <div className="tm-ov-header-left">
          <h2 className="tm-ov-title">TM Leverage Overview</h2>
          <p className="tm-ov-subtitle">Translation Memory analytics and optimization insights</p>
        </div>
        <div className="tm-ov-header-right">
          <span className="tm-ov-label">Leverage: {stats.leverageRate}%</span>
          <div className="tm-progress-pill-bg">
            <div 
              className="tm-progress-pill-fill" 
              style={{ width: `${stats.leverageRate}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 1: Leverage Overview & Stats */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
          <div className="tm-ov-icon-title">
            <svg className="tm-ov-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="tm-ov-h3">TM Leverage Overview</h3>
          </div>
          <p className="tm-ov-sub-text">Translation Memory intelligence for JP</p>
        </div>

        <div className="tm-ov-section">
          <div className="tm-ov-row-spread">
            <span className="tm-ov-label-bold">Leverage Rate</span>
            <span className="tm-ov-percent orange">{stats.leverageRate}%</span>
          </div>
          <div className="tm-bar-large-bg">
            <div className="tm-bar-large-fill" style={{ width: `${stats.leverageRate}%` }} />
          </div>
          <p className="tm-ov-caption">{stats.exact + stats.fuzzy} of {stats.total} segments have TM matches</p>
        </div>

        <div className="tm-stat-grid">
          {/* Exact */}
          <div className="tm-stat-box green">
            <div className="tm-stat-icon-circle green-bg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="tm-stat-val green-text">{stats.exact}</div>
            <div className="tm-stat-label">Exact</div>
          </div>

          {/* Fuzzy */}
          <div className="tm-stat-box blue">
            <div className="tm-stat-icon-circle blue-bg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div className="tm-stat-val blue-text">{stats.fuzzy}</div>
            <div className="tm-stat-label">Fuzzy</div>
          </div>

          {/* New */}
          <div className="tm-stat-box orange">
            <div className="tm-stat-icon-circle orange-bg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="tm-stat-val orange-text">{stats.newSegs}</div>
            <div className="tm-stat-label">New</div>
          </div>
        </div>
      </div>

      {/* Card 2: Match Percentage (Replaces Estimated Cost Savings) */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
           <div className="tm-ov-icon-title">
            <svg className="tm-ov-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="5" x2="5" y2="19"></line>
              <circle cx="6.5" cy="6.5" r="2.5"></circle>
              <circle cx="17.5" cy="17.5" r="2.5"></circle>
            </svg>
            <h3 className="tm-ov-h3">Match %</h3>
          </div>
        </div>
        <div className="tm-ov-center-content">
          <div className="tm-big-money">{stats.avgMatch}%</div>
          <div className="tm-ov-caption center">Average TM match percentage vs. new translation</div>
        </div>
      </div>

      {/* Card 3: Quality Metrics */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
          <div className="tm-ov-icon-title">
            <svg className="tm-ov-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <h3 className="tm-ov-h3">Quality Metrics</h3>
          </div>
        </div>
        
        <div className="tm-ov-list-rows">
          <div className="tm-ov-metric-row">
            <div className="tm-metric-label-group">
              <span className="tm-metric-label">Avg Match Score</span>
            </div>
            <span className="tm-metric-val">{stats.avgMatch}%</span>
          </div>
          {/* Progress bar for Avg Match */}
          <div className="tm-bar-small-bg">
            <div className="tm-bar-small-fill" style={{ width: `${stats.avgMatch}%` }} />
          </div>

          <div className="tm-ov-metric-row border-top">
            <div className="tm-metric-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E90FA" strokeWidth="2" style={{marginRight:8}}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="tm-metric-label">Therapeutic Area Matches</span>
            </div>
            <span className="tm-metric-pill">0</span>
          </div>

          <div className="tm-ov-metric-row border-top">
             <div className="tm-metric-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E90FA" strokeWidth="2" style={{marginRight:8}}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="tm-metric-label">Cultural Adaptations</span>
            </div>
            <span className="tm-metric-pill">0</span>
          </div>
        </div>
      </div>

      {/* Card 4: Recommendations */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
           <h3 className="tm-ov-h3">Recommendations</h3>
        </div>
        <div className="tm-rec-list">
          <div className="tm-rec-item orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F79009" strokeWidth="2" style={{minWidth:18}}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="tm-rec-text">Lower TM leverage - consider human review for consistency</span>
          </div>
          <div className="tm-rec-item blue">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E90FA" strokeWidth="2" style={{minWidth:18}}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="tm-rec-text">Many new segments - good opportunity to build TM for future projects</span>
          </div>
        </div>
      </div>

    </div>
  );
}