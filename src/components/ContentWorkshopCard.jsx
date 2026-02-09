
import React from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
// import '../App.css'; 
import "./css/Header.css";
const ContentWorkshopCard = () => {
  return (
    <div className="ops-card ops-card--workshop">
      {/* Header */}
      <div className="ops-card__header">
        <SmartToyOutlinedIcon className="ops-card__icon" />    
<button className="ops-templates">
          <DescriptionOutlinedIcon fontSize="small" />
          <span>9+ Templates</span>
        </button>

      </div>

      {/* Title + Subtitle */}
      <h1 className="ops-card__title">Content Workshop</h1>
      <p className="ops-card__subtitle">
        Create content with intelligence-driven recommendations
      </p>

      {/* Status row */}
      {/* <div lassName="ops-status">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cw-pill">30</span>
          <span style={{ color: '#374151' }}>Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: '#111827' }}>0</span>
          <span>In Review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: '#111827' }}>0</span>
          <span>Completed</span>
        </div>
      </div> */}
      
{/* Status row */}
<div className="cw-status">
  <div className="cw-status__item">
    <span className="cw-pill cw-pill--blue">32</span>
    <span className="cw-status__label">Active</span>
  </div>

  <div className="cw-status__item">
    <span className="cw-pill cw-pill--green">0</span>
    <span className="cw-status__label">In Review</span>
  </div>

  <div className="cw-status__item">
    <span className="cw-pill cw-pill--white">0</span>
    <span className="cw-status__label">Completed</span>
  </div>
</div>

      <div className="ops-card__spacer" />
      {/* Primary CTA */}
      <button className="ops-primary">
        <SmartToyOutlinedIcon sx={{ fontSize: 24 }} />
        <span>Start Creating Content</span>
        <ArrowForwardIcon sx={{ fontSize: 24 }} />
      </button>

      {/* Secondary CTA */}
      <button className="ops-secondary">
        <TextSnippetOutlinedIcon />
        <span>Browse Templates</span>
      </button>

      {/* Floating bubble */}
      <div className="cw-floating">
        <ChatBubbleOutlineIcon sx={{ fontSize: 22 }} />
      </div>
    </div>
  );
};

export default ContentWorkshopCard;
