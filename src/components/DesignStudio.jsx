
import React from 'react';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
// import '../App.css';
import "./css/Header.css";

const DesignStudio = () => {
  return (
    <article className="tool-card tool-card--design">
      {/* Header */}
      <div className="tool-card__header">
        <span className="tool-card__icon">
          <PaletteOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <h3 className="tool-card__title">Design Studio</h3>
        <span className="tool-card__badge">9 Designs Ready</span>
      </div>

      {/* Body */}
      <div className="tool-card__body">
        <p className="tool-card__desc">
          Transform approved content into production-ready designs with automated brand compliance.
        </p>

        {/* Metrics (2 columns) */}
        <div className="tool-card__metrics">
          <div className="tool-metric">
            <p className="tool-metric__label">DESIGNS READY</p>
            <span className="tool-metric__value">
              9 <span className="delta delta--up">+6</span>
            </span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">BRAND COMPLIANCE</p>
            <span className="tool-metric__value">0%</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">MULTI-FORMAT</p>
            <span className="tool-metric__value">8 types</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">QUALITY SCORE</p>
            <span className="tool-metric__value">4.8/5</span>
          </div>
        </div>
      </div>

      {/* Footer tint closure (keeps rounded inner surface) */}
      <div className="tool-card__footer" />
    </article>
  );
};

export default DesignStudio;
