
import React from 'react';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
// import '../App.css';
import "./css/Header.css";

const PreMLRCompanion = () => {
  return (
    <article className="tool-card tool-card--mlr">
      {/* Header */}
      <div className="tool-card__header">
        <span className="tool-card__icon">
          <ShieldOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <h3 className="tool-card__title">Pre-MLR Companion</h3>
        <span className="tool-card__badge">50 Reviews Ready</span>
      </div>

      {/* Body */}
      <div className="tool-card__body">
        <p className="tool-card__desc">
          AI-powered compliance checking and intelligent review preparation before MLR submission.
        </p>

        {/* Metrics */}
        <div className="tool-card__metrics">
          <div className="tool-metric">
            <p className="tool-metric__label">REVIEWS READY</p>
            <span className="tool-metric__value">50</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">SUCCESS PREDICTION</p>
            <span className="tool-metric__value">
              85% <span className="delta delta--up">+4%</span>
            </span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">ISSUES FOUND</p>
            <span className="tool-metric__value">0</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">REVIEW TIME</p>
            <span className="tool-metric__value">
              2.3d <span className="delta delta--down">-18%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="tool-card__footer" />
    </article>
  );
};

export default PreMLRCompanion;
