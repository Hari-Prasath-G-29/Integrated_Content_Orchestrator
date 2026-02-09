
import React, { useState } from 'react';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import EmojiObjectsOutlinedIcon from '@mui/icons-material/EmojiObjectsOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
// import '../App.css';
import "./css/Header.css";

/* ---------- Small building blocks ---------- */
const MetricRow = ({ icon = null, label, value, sub = null }) => (
  <div className="sys-metric-row">
    {icon && <span className="sys-metric-icon">{icon}</span>}
    <span className="sys-metric-label">{label}</span>
    <span className="sys-metric-value">{value}</span>
    {sub && <span className="sys-metric-sub">{sub}</span>}
  </div>
);

const Pill = ({ children, kind = 'neutral' }) => (
  <span className={`sys-pill sys-pill--${kind}`}>{children}</span>
);

const Tile = ({ icon, title, children, borderAccent = 'slate' }) => (
  <article className={`sys-tile sys-tile--${borderAccent}`}>
    <div className="sys-tile__header">
      <span className="sys-tile__icon">{icon}</span>
      <h3 className="sys-tile__title">{title}</h3>
    </div>
    <div className="sys-tile__body">{children}</div>
  </article>
);

/* ---------- Main component (collapsible) ---------- */
export default function SystemAdministration({ defaultOpen = false }) {
  const [open, setOpen] = useState(Boolean(defaultOpen)); // default opened; set to false to start collapsed
  const contentId = 'sys-admin-content';

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <section className="sys-admin-wrap">
      {/* Header row with title + arrow toggle on the right */}
      <header className="sys-admin__header">
        <span className="sys-admin__title-wrap">
          <SettingsOutlinedIcon sx={{ fontSize: 20 }} />
          <h2 className="sys-admin__title">System Administration</h2>
        </span>

        <button
          type="button"
          className="sys-admin__toggle"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggleOpen}
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ExpandLessIcon sx={{ fontSize: 24 }} /> : <ExpandMoreIcon sx={{ fontSize: 24 }} />}
        </button>
      </header>

      {/* Collapsible content wrapper */}
      <div
        id={contentId}
        className={`sys-admin__content ${open ? 'is-open' : ''}`}
        role="region"
        aria-label="System Administration content"
      >
        {/* Tiles grid */}
        <div className="sys-admin__grid">
          {/* Brand Guardrails Health */}
          <Tile
            icon={<HealthAndSafetyOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Brand Guardrails Health"
            borderAccent="amber"
          >
            <div className="sys-admin__rows">
              <MetricRow label="Status" value={<Pill kind="success">Fresh</Pill>} />
              <MetricRow label="Last Review" value="57 days ago" />
              <MetricRow label="Compliance Score" value="85%" />
              <MetricRow label="Intelligence" value={<Pill kind="warning">Stale</Pill>} />
              <MetricRow label="Auto refresh" value="Weekly (Sundays)" />
            </div>
          </Tile>

          {/* Competitive Intelligence */}
          <Tile
            icon={<EmojiObjectsOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Competitive Intelligence"
            borderAccent="slate"
          >
            <div className="sys-admin__rows">
              <MetricRow label="Competitors Tracked" value={<Pill kind="info">6</Pill>} />
              <MetricRow
                label="Threat Level"
                value={
                  <span className="sys-pill-group">
                    <Pill kind="danger">1 High</Pill>
                    <Pill kind="warning">3 Med</Pill>
                  </span>
                }
              />
              <MetricRow
                label="Focus"
                value={<span className="sys-badge sys-badge--soft">Generic Manufacturers</span>}
              />
            </div>
          </Tile>

          {/* Regulatory Coverage */}
          <Tile
            icon={<PublicOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Regulatory Coverage"
            borderAccent="rose"
          >
            <div className="sys-admin__rows">
              <MetricRow label="Markets Supported" value={<Pill kind="success">5</Pill>} />
              <MetricRow label="Compliance Ready" value="5 / 5" />
              <MetricRow label="Active Disclaimers" value="26" />
              <MetricRow label="Approval Rate" value="100%" />
            </div>
          </Tile>

          {/* Glocalization Intelligence */}
          <Tile
            icon={<LanguageOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Glocalization Intelligence"
            borderAccent="cyan"
          >
            <div className="sys-admin__rows">
              <MetricRow label="Active Projects" value={<Pill kind="success">84</Pill>} />
              <MetricRow label="Languages" value="3" />
              <MetricRow
                label="Cultural Score"
                value={
                  <>
                    0% <Pill kind="warning">Developing</Pill>
                  </>
                }
              />
              <MetricRow label="TM Leverage" value="0%" />
            </div>
          </Tile>

          {/* Brand Documents (right column) */}
          <article className="sys-docs">
            <div className="sys-docs__header">
              <span className="sys-docs__icon">
                <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
              </span>
              <h3 className="sys-docs__title">Brand Documents</h3>
            </div>

            <div className="sys-docs__panel">
              <p className="sys-docs__panel-label">Documents</p>
              <span className="sys-docs__panel-value">2</span>
              <p className="sys-docs__panel-sub">0 parsed</p>
            </div>

            <div className="sys-docs__tiles">
              <div className="sys-docs__tile">
                <p className="sys-docs__tile-label">Total</p>
                <span className="sys-docs__tile-value">2</span>
              </div>
              <div className="sys-docs__tile">
                <p className="sys-docs__tile-label">Parsed</p>
                <span className="sys-docs__tile-value">0</span>
              </div>
            </div>

            <button type="button" className="sys-docs__cta">Manage Library</button>
          </article>
        </div>
      </div>
    </section>
  );
}
