
import React from 'react';
import { Link } from 'react-router-dom';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
// import '../App.css';
import "./css/Header.css";

const GlocalizationFactory = () => {
  return (
    <Link
      to="/glocalizationHub"
      className="tool-card tool-card--glocal glocal-card--link"
      aria-label="Open Glocalization Factory"
    >
      {/* Header with arrow */}
      <div className="tool-card__header">
        <span className="tool-card__icon">
          <LanguageOutlinedIcon sx={{ fontSize: 18 }} />
        </span>
        <h3 className="tool-card__title">Glocalization Factory</h3>
        <span className="tool-card__badge">82 Active Projects</span>
      </div>

      {/* Body */}
      <div className="tool-card__body">
        <p className="tool-card__desc">
          Scale content globally with AI translation, cultural adaptation,
          and regulatory compliance.
        </p>

        {/* Metrics */}
        <div className="tool-card__metrics">
          <div className="tool-metric">
            <p className="tool-metric__label">ACTIVE PROJECTS</p>
            <span className="tool-metric__value">
              82 <span className="delta delta--up">+5</span>
            </span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">LANGUAGES</p>
            <span className="tool-metric__value">3</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">CULTURAL SCORE</p>
            <span className="tool-metric__value">4.3/5</span>
          </div>

          <div className="tool-metric">
            <p className="tool-metric__label">TM LEVERAGE</p>
            <span className="tool-metric__value">
              78% <span className="delta delta--up">+6%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="tool-card__footer" />
    </Link>
  );
};

export default GlocalizationFactory;
