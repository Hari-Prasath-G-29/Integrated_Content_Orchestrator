import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TMAnalysis = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Destructure data passed from SmartTMTranslationHub 
  const { segment, reviewData, projectName } = state || {};
  
  // Calculate display values
  const score = Math.round((reviewData?.tmScore || 0) * 100);
  const wordCount = segment?.words || 0;

  return (
    <div className="tm-analysis-page">
      <div className="tm-analysis-container">
        {/* Header with Close Button */}
        <header className="tm-analysis-header">
          <div className="tm-header-main">
            <span className="tm-analysis-icon">📊</span>
            <div className="tm-title-block">
              <h2>Translation Memory Analysis</h2>
              <p>Word-level TM leverage breakdown for this segment</p>
            </div>
          </div>
          <button className="tm-close-x" onClick={() => navigate(-1)} aria-label="Close">×</button>
        </header>

        <div className="tm-analysis-body">
          {/* Section 1: Translation Summary [Matches Screenshot] */}
          <div className="tm-summary-section">
            <div className="tm-summary-card-header">
              <span className="tm-summary-icon-small">📈</span>
              <div className="tm-summary-text">
                <h3>Translation Summary</h3>
                <p>Segment {segment?.index || 1} • {wordCount} source words • {wordCount} translated words</p>
              </div>
            </div>

            <div className="tm-stats-grid">
              <div className="tm-stat-card tm-leverage-card">
                <span className="tm-stat-value">{score}%</span>
                <span className="tm-stat-label">TM Leverage</span>
              </div>
              <div className="tm-stat-card">
                <span className="tm-stat-label-top">Exact Matches</span>
                <span className="tm-stat-value-zero">0 words</span>
              </div>
              <div className="tm-stat-card">
                <span className="tm-stat-label-top">Fuzzy Matches</span>
                <span className="tm-stat-value-zero">0 words</span>
              </div>
              <div className="tm-stat-card tm-new-words-card">
                <span className="tm-stat-label-top">New Words (AI Generated)</span>
                <span className="tm-stat-value-blue">{wordCount} words</span>
              </div>
            </div>
          </div>

          {/* Section 2: AI Quality Assessment */}
          <div className="tm-quality-assessment">
            <div className="tm-quality-header">
              <span className="tm-spark-icon">✨</span>
              <h3>AI Quality Assessment</h3>
            </div>
            <p className="tm-quality-sub">Quick summary scores - expand Full AI Analysis below for detailed breakdown</p>
          </div>

          <p className="tm-expand-instruction">Expand below for comprehensive analysis with detailed explanations</p>

          {/* Section 3: Accordion for Full Analysis */}
          <div className="tm-analysis-accordion">
            <div className="tm-accordion-trigger">
              <div className="tm-trigger-left">
                <span className="tm-doc-icon">📄</span>
                <span className="tm-trigger-title">View Full AI Analysis</span>
                <span className="tm-badge-detailed">Detailed Breakdown</span>
              </div>
              <span className="tm-chevron">▼</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TMAnalysis;