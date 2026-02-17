import React, { useMemo } from "react";
// import "../App.css"; 
// ensure you are importing the CSS where your styles are defined

export default function TMLeverageOverview({ segments = [] }) {
  
  // Inside TMLeverageOverview.jsx

const stats = useMemo(() => {
    let exact = 0;
    let fuzzy = 0;
    let newSegs = 0;
    let totalScore = 0;

    segments.forEach((seg) => {
      // 1. ROBUST EXTRACTION: Check multiple places for the score
      let rawScore = 0;
      
      if (typeof seg.matchScore === 'number') {
          // Case A: Passed as direct prop (0-100)
          rawScore = seg.matchScore;
      } else if (seg.reviewData && typeof seg.reviewData.tmScore === 'number') {
          // Case B: Nested in reviewData (0.0 - 1.0) usually from Python/N8N
          // We assume if it's <= 1, it's a decimal percentage
          rawScore = seg.reviewData.tmScore <= 1 
            ? seg.reviewData.tmScore * 100 
            : seg.reviewData.tmScore;
      }

      // Ensure we have a clean integer
      const score = Math.round(rawScore);

      // 2. CLASSIFICATION LOGIC
      if (score >= 95) {
          exact++;      // Tier 1: Exact Match
      } else if (score >= 70) {
          fuzzy++;      // Tier 2: Fuzzy / Context Match
      } else {
          newSegs++;    // Tier 3: New / GenAI
      }

      totalScore += score;
    });

    const total = segments.length;
    const avgMatch = total > 0 ? Math.round(totalScore / total) : 0;
    
    // Leverage Rate: Percentage of segments that had ANY re-use value (Exact + Fuzzy)
    const leverageRate = total > 0 ? Math.round(((exact + fuzzy) / total) * 100) : 0;

    return { total, exact, fuzzy, newSegs, avgMatch, leverageRate };
  }, [segments]);


  // --- 2. Dynamic Recommendations Engine ---
  const recommendations = useMemo(() => {
    const recs = [];

    // Scenario A: High Leverage (Good!)
    if (stats.leverageRate > 75) {
      recs.push({
        type: "positive", // blue/green
        icon: "check",
        text: "High TM consistency detected. Minimal manual review required."
      });
    }
    // Scenario B: Low Leverage (Building phase)
    else if (stats.leverageRate < 30) {
      recs.push({
        type: "info", // blue
        icon: "info",
        text: "Low leverage rate. This project is actively building new assets for your TM."
      });
    }

    // Scenario C: Fuzzy Matches detected
    if (stats.fuzzy > 0) {
      recs.push({
        type: "warning", // orange
        icon: "alert",
        text: `${stats.fuzzy} fuzzy matches detected. Review context to ensure tone consistency.`
      });
    }

    // Default if nothing else triggered
    if (recs.length === 0) {
      recs.push({
        type: "info",
        icon: "info",
        text: "Balanced mix of new and reused content."
      });
    }

    return recs;
  }, [stats]);


  return (
    <div className="tm-overview-container">
      {/* Top Header Section */}
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
            <h3 className="tm-ov-h3">Breakdown</h3>
          </div>
          <p className="tm-ov-sub-text">Segment distribution by match type</p>
        </div>

        <div className="tm-ov-section">
          <div className="tm-ov-row-spread">
            <span className="tm-ov-label-bold">Total Leverage</span>
            <span className={`tm-ov-percent ${stats.leverageRate > 50 ? 'green' : 'orange'}`}>
              {stats.leverageRate}%
            </span>
          </div>
          <div className="tm-bar-large-bg">
            <div className="tm-bar-large-fill" style={{ width: `${stats.leverageRate}%` }} />
          </div>
          <p className="tm-ov-caption">{stats.exact + stats.fuzzy} of {stats.total} segments utilized TM</p>
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

      {/* Card 2: Match Percentage */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
           <div className="tm-ov-icon-title">
            <svg className="tm-ov-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="5" x2="5" y2="19"></line>
              <circle cx="6.5" cy="6.5" r="2.5"></circle>
              <circle cx="17.5" cy="17.5" r="2.5"></circle>
            </svg>
            <h3 className="tm-ov-h3">Avg Match %</h3>
          </div>
        </div>
        <div className="tm-ov-center-content">
          <div className="tm-big-money">{stats.avgMatch}%</div>
          <div className="tm-ov-caption center">Average similarity across all segments</div>
        </div>
      </div>

      {/* Card 3: Quality Metrics (Static for now, can be connected later) */}
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
            <span className="tm-metric-pill">--</span>
          </div>
        </div>
      </div>

      {/* Card 4: Dynamic Recommendations */}
      <div className="tm-ov-card">
        <div className="tm-ov-card-header">
           <h3 className="tm-ov-h3">Recommendations</h3>
        </div>
        <div className="tm-rec-list">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`tm-rec-item ${rec.type === 'warning' ? 'orange' : 'blue'}`}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{minWidth:18}}>
                 {rec.icon === 'alert' ? (
                   <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                   </>
                 ) : (
                   <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                   </>
                 )}
               </svg>
              <span className="tm-rec-text">{rec.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}