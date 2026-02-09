
import React from 'react';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EqualizerIcon from '@mui/icons-material/Equalizer';
// import '../App.css'; 
// import './css/Intelligent.css';
import "./css/Header.css";

export default function IntelligenceHub() {
  return (
    <div className="ops-card ops-card--workshop">
      {/* Add the outlined variant + (optional) exact 2rem rounding */}
      {/* <section className="ops-card ops-card--hub"> */}
        <div className="ops-card__header">
          <PsychologyIcon className="ops-card__icon" />
          <ArrowForwardIcon className="ops-card__arrow" />
        </div>

        <h1 className="ops-card__title">Intelligence Hub</h1>
        <p className="ops-card__subtitle">
          Unified view of all your brand intelligence insights
        </p>

        <ul className="ops-card__list">
          <li><PeopleOutlineIcon className="list-icon" /> Audience Insights</li>
          <li><TrackChangesIcon className="list-icon" /> Content Performance</li>
          <li><EqualizerIcon className="list-icon" /> Competitive Analysis</li>
        </ul>

        <div className="ops-card__spacer">
          <button className="ops-primary">View Intelligence</button>
        </div>
      {/* </section> */}
    </div>
  );
}

