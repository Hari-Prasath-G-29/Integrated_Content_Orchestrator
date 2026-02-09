import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import {  ArrowLeft,
  Save, ArrowRight, Upload, FileText, CheckCircle2, Maximize2,
  Minimize2, Users, Stethoscope, Edit2, Plus, X, Pill, Unlock } from 'lucide-react';
import { Button } from "@mui/material";
import { updateProjectMeta, markPhaseComplete, getProject, resetP2DraftState } from '../lib/progressStore';
import { usePhaseNavigation } from "./PhaseNav.jsx";
import "./css/GlobalAssetCapture.css";

export default function GlobalContextCapture() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isFocusMode, setIsFocusMode] = useState(false); 

  // Toggle handler
const toggleFocusMode = () => setIsFocusMode(prev => !prev);
const projectId = state?.projectId || 'proj-unknown';
 // From previous page (if passed)
 const projectName =
 state?.projectName ||
 "HCP Clinical Insights Email Campaign - DE Adaptation";
const importedContent = state?.content || `No content to display`;
const type = state?.type || "email";
 // 🆕 Receive language from previous page (fallbacks included)
  // Prefer 'lang', then 'sourceLang', finally default to 'EN'
  const inboundLang = state?.lang ?? state?.sourceLang ?? "EN";
// Tabs
const [contentTab, setContentTab] = useState("editor"); // "editor" | "preview"
const [contentText, setContentText] = useState(importedContent);


  const [isEditingSummary, setIsEditingSummary] = useState(false);
  
  // Local fallback (unchanged)
  const localSegments = useMemo(() => segmentContent(contentText), [contentText]);
  const [summary, setSummary] = useState({
    assetType: "Marketing Email",
    indication: "Not specified",
    therapyArea: "Respiratory",
    audience: "Pulmonologists"
  });
  const [extraAudiences, setExtraAudiences] = useState([]);
  const [apiRawJson, setApiRawJson] = useState(null);
  const [isSegLoading, setIsSegLoading] = useState(false);
  const [segError, setSegError] = useState("");
  const [assetType, setAssetType] = useState(type || "email");
  const [therapeuticContext, setTherapeuticContext] = useState("");
  const [indication, setIndication] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [additionalAudiences, setAdditionalAudiences] = useState([]);
  const [isEditingContext, setIsEditingContext] = useState(false);
   
// ✅ read the passed values
const marketsCount   = state?.marketsCount ?? 0;
const marketCodes    = Array.isArray(state?.marketCodes) ? state.marketCodes : [];
const gotoPhase = usePhaseNavigation(projectId, projectName);
React.useEffect(() => {
  localStorage.setItem('gac_focus_mode', String(isFocusMode));
}, [isFocusMode]);


 // 🆕 Hydrate from persisted meta
    React.useEffect(() => {
       if (!projectId) return;
       const rec = getProject(projectId);
       const m = rec?.meta || {};
       // only set if a value exists to avoid clobbering current edits
       if (typeof m.assetType === 'string') setAssetType(m.assetType);
      if (typeof m.therapeuticContext === 'string') setTherapeuticContext(m.therapeuticContext);
       if (typeof m.indication === 'string') setIndication(m.indication);
       if (typeof m.targetAudience === 'string') setTargetAudience(m.targetAudience);
       if (Array.isArray(m.additionalAudiences)) setAdditionalAudiences(m.additionalAudiences);
       if (typeof m.contentText === 'string' && m.contentText.trim().length) {
         setContentText(m.contentText);
       }
     }, [projectId]);
  
// Sidebar Phases (unchanged)
const phases = useMemo(
  () => [
    { id: 'P1', name: "Global Context Capture", sub: "Source content analysis", status: "active" },
    { id: 'P2', name: "Smart TM Translation", sub: "AI-powered translation", status: "todo" },
    { id: 'P3', name: "Cultural Intelligence", sub: "Cultural adaptation", status: "todo" },
    { id: 'P4', name: "Regulatory Compliance", sub: "Compliance validation", status: "todo" },
    { id: 'P5', name: "Quality Intelligence", sub: "Quality assurance", status: "todo" },
    { id: 'P6', name: "DAM Integration", sub: "Asset packaging", status: "todo" },
    { id: 'P7', name: "Integration Lineage", sub: "System integration", status: "todo" },
  ],
  []
);

const availableAdditionalAudiences = [
  "Secondary care physicians",
  "Primary care physicians",
  "Nurses/Healthcare staff",
  "Patients/Caregivers",
  "Specialists",
  "Pharmacists",
  "Healthcare administrators",
  "Payers/Insurance providers",
];


const toggleAdditionalAudience = (aud) => {
  setAdditionalAudiences((prev) =>
    prev.includes(aud) ? prev.filter((x) => x !== aud) : [...prev, aud]
  );
};

  const handleSave = () => alert("Project changes saved successfully!");

    const openSegmentationPreview = async () => {
    setContentTab("preview");

    // 1. If we already have data in memory for this session, don't fetch anything
    if (apiRawJson || isSegLoading) return;

    setIsSegLoading(true);
    setSegError("");

    try {
      // 2. Try to get existing segments from YOUR Database first
      // Note: Using localhost:5000 based on your previous console error logs
      const dbResponse = await fetch(
        `https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/segmented-content`,
      );
      if (!dbResponse.ok)
        throw new Error("Failed to check database for existing segments.");

      const allDbContent = await dbResponse.json();

      // Filter segments that belong to this specific document/project
      const existingSegments = allDbContent.filter(
        (item) => item.document_name === projectName,
      );

      if (existingSegments.length > 0) {
        console.log(
          "Found existing segments in DB. Loading those instead of calling n8n.",
        );

        // Reconstruct the n8n-style JSON object so your UI components can read it
        // This maps the DB 'description' back to the 'segment X' keys expected by N8NStringSegments
        const reconstructedJson = {
          output: existingSegments.reduce((acc, seg) => {
            // Ensure keys match the "segment 1" format your UI expects
            const key = seg.segmented_no.toLowerCase();
            acc[key] = seg.description;
            return acc;
          }, {}),
        };

        setApiRawJson(reconstructedJson);
        setIsSegLoading(false);
        return; // Exit here; no need to call n8n
      }

      // 3. If no segments found in DB, call the n8n Workflow
      console.log("No segments found in DB. Triggering n8n workflow...");
      const n8nUrl =
        process.env.REACT_APP_N8N_SEGMENT_URL ||
        "http://172.16.4.237:8033/webhook/pdfUpload";

      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.REACT_APP_N8N_TOKEN
            ? { Authorization: `Bearer ${process.env.REACT_APP_N8N_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          projectName,
          content: contentText,
          lang: inboundLang,
        }),
      });

      if (!res.ok) throw new Error(`n8n responded with HTTP ${res.status}`);
      const json = await res.json();

      // Update UI state with n8n results
      setApiRawJson(json);

      // 4. Store these new segments in the DB for future clicks
      const segmentsToStore = GlobalAssetCapture(json, []);
      if (segmentsToStore && segmentsToStore.length > 0) {
        const savePromises = segmentsToStore.map((seg) =>
          fetch("https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/segmented-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_name: projectName,
              segmented_no: `Segment ${seg.index}`,
              description: seg.source,
            }),
          }),
        );
        await Promise.all(savePromises);
        console.log("New segments generated via n8n and saved to DB.");
      }
    } catch (err) {
      setSegError(err?.message || "Error processing segmentation preview.");
    } finally {
      setIsSegLoading(false);
    }
  };

  const handleComplete = () => {
    // Calling the helper function from the bottom
    const segmentsForNext = GlobalAssetCapture(apiRawJson, localSegments, inboundLang);
    // ✅ Debug BEFORE marking complete
  console.log('GAC: Completing P1 for projectId:', projectId, {
    projectName,
    hasApiJson: !!apiRawJson,
    localSegmentsCount: localSegments.length
  });

// ✅ Persist any context you’ve collected here as REAL meta

updateProjectMeta(projectId, {
       assetType,
       therapeuticContext,
       indication,
       targetAudience,
       additionalAudiences,
       marketsCount,
       marketCodes,
       // 🆕 store edited source text so GAC can restore later
       contentText,
      // 🆕 store P1 produced segments so TM hub can restore later
       segmentsP1: segmentsForNext,
          // not strictly required here if you're calling resetP2DraftState below,
   // but harmless if kept in one place:
   p2DraftGenerated: false,
   p2DraftGeneratedAt: null,
   p2BannerDismissed: false,
     });
  
// ✅ Explicitly reset P2 flags for this new asset
 resetP2DraftState(projectId);

       // ✅ Real completion of P1 ONLY at this point
       markPhaseComplete(projectId, 'P1');
  

       const db = JSON.parse(localStorage.getItem('glocal_progress_v1') || '{}');
       console.log('GAC: store after P1:', db[projectId]); // should show completed: ['P1']

    navigate("/smartTMTranslationHub", {
      state: {  projectId, projectName, segments: segmentsForNext, lang: inboundLang },
    });
  };

  return (
    <div className={`gac-page ${isFocusMode ? 'is-focus' : ''}`} data-page="gac">
      {/* Sidebar */}
      {!isFocusMode && (
      <aside className="gac-sidebar">
        <div className="sidebar-header">
          <div className="progress-row">
            <span className="progress-label">Overall Progress</span>
            <span className="progress-value">0%</span>
          </div>
          <div className="progress-sub">0 of 7 phases completed</div>
        </div>

        <nav className="sidebar-phases">
          {phases.map((p) => (
            <button
              key={p.id}
              className={`phase-item ${p.status === "active" ? "is-active" : ""}`}
              onClick={() => gotoPhase(p.id)}  // ✅ navigate by phase id
              aria-label={`Open ${p.name}`}
            >
              <span className="phase-dot" />
              <span className="phase-text">
                <span className="phase-title">{p.name}</span>
                <span className="phase-sub">{p.sub}</span>
              </span>
              {p.status === "active" && <span className="phase-active-ind" />}
            </button>
          ))}
        </nav>
      </aside>
      )}

      {/* Content Area */}
      <main className="gac-main">
      <div className="gac-content">
        {/* Header */}
        {/* <header className="gac-header">
          <div className="header-left">
            <div className="crumbs">
              <button className="crumb" onClick={() => navigate('/')}>Main Hub</button>
              <button className="crumb" onClick={() => navigate('/importContentPage')}>Glocalization Hub</button>
            </div>
            <div className="title-row">
              <h1 className="page-title">{projectName}</h1>
              <span className="title-sub">Respiratory · DE</span>
            </div>
          </div>
          <div className="header-right">
            <span className="saved-ind">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="#1F7AEC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
            <button className="ghost-btn">Save</button>
            <button className="ghost-btn">Focus</button>
          </div>
        </header> */}
        
<header className="gac-header d-flex justify-content-between align-items-center px-4 mb-3">
  {/* Left Section */}
  <div className="d-flex align-items-center gap-3">
    {/* Breadcrumbs */}
    <button className="crumb d-flex align-items-center gap-1" onClick={() => navigate('/')}>
    <ArrowLeft size={14} className="h-1 w-1 mr-2" /> Main Hub
    </button>
    <span className="divider"></span>
    <button className="crumb" onClick={() => navigate('/glocalizationHub')}>
      Glocalization Hub
    </button>
  </div>

  {/* Center Section */}
  <div className="title-section text-center">
    <h1 className="page-title1 fw-bold mb-0">
    {projectName}
    </h1>
    {/* <h2 className="page-subtitle fw-bold mb-0">(DE)</h2> */}
    {/* <span className="title-sub1 text-muted">HIV/AIDS · DE</span> */}
  </div>

  {/* Right Section */}
  <div className="d-flex align-items-center gap-3">
    <span className="saved-ind1 d-flex align-items-center gap-1 text-success">
    <CheckCircle2 size={12} className="h-1 w-1 text-green-600" />
      Saved
    </span>
    <button className="action-btn">
    <Save size={15} className="h-4 w-4 mr-2" onClick={handleSave}/> Save
    </button>
    {/* <button className="action-btn">
    <Maximize2 size={15} className="h-4 w-4 mr-2" /> Focus
    </button> */}
    
<button
      className="action-btn"
      onClick={toggleFocusMode}
      aria-pressed={isFocusMode}
      title={isFocusMode ? 'Exit focus (Esc)' : 'Enter focus (F)'}
    >
      {isFocusMode ? (
        <>
          <Minimize2 size={15} className="h-4 w-4 mr-2" /> Exit
        </>
      ) : (
        <>
          <Maximize2 size={15} className="h-4 w-4 mr-2" /> Focus
        </>
      )}
    </button>

  </div>
</header>


        {/* Phase Label */}
        <div className="phase-label">
          <span className="badge">Phase 1</span>
          <div className="phase-title-group">
            <h2 className="section-title">Global Asset Context Capture</h2>
            <p className="section-desc">
              Configure source content and context for global adaptation
            </p>
          </div>
        </div>

        {/* Source Asset Summary */}
        {/* <section className="card soft">
          <div className="card-header">
            <div className="header-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="#1F7AEC" strokeWidth="2" />
              </svg>
              <h3 className="card-title">Source Asset Summary</h3>
            </div>
            <button className="link-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h16M8 4h8v4H8V4zm0 8h8v4H8v-4z" stroke="#6B7178" strokeWidth="1.6" />
              </svg>
              Edit
            </button>
          </div>

          <p className="imported-from">Imported from “{projectName}”</p>

          <div className="info-grid four">
            <div className="info-item">
              <div className="info-label">Asset Type</div>
              <span className="chip chip-soft">{type}</span>
            </div>
            <div className="info-item">
              <div className="info-label">Indication</div>
              <span className="chip chip-soft muted">Not specified</span>
            </div>
            <div className="info-item">
              <div className="info-label">Therapy Area</div>
              <span className="chip chip-soft">Respiratory</span>
            </div>
            <div className="info-item">
              <div className="info-label">Primary Target Audience</div>
              <span className="chip chip-soft">Pulmonologists</span>
            </div>
          </div>

          <div className="audiences">
            <div className="aud-row">
              <div className="aud-left">
                <div className="info-label">Additional Audiences</div>
                <div className="aud-empty">No additional audiences selected</div>
              </div>
              <button className="add-aud-btn">+ Add audience</button>
            </div>
          </div>
        </section> */}
        

 {/* Source Asset Summary (Edit/Lock) */}
 <section className="card1 source-card">
            {/* Header */}
            <div className="card-header1 d-flex justify-content-between align-items-start">
              <div className="d-flex align-items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#1F7AEC" strokeWidth="2" />
                  <path
                    d="M9.5 12.5l2 2 3.5-4"
                    stroke="#1F7AEC"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="card-title1 m-0">Source Asset Summary</h3>
              </div>

              {/* Edit/Lock toggle */}
              <button
                type="button"
                className="link-btn1 d-inline-flex align-items-center"
                onClick={() => setIsEditingContext((prev) => !prev)}
              >
                <Edit2 size={12} className="h-3 w-3 mr-1" />
                {isEditingContext ? "Lock" : "Edit"}
              </button>
            </div>

            {/* Imported from line */}
            <p className="imported-from">Imported from "{projectName}"</p>

            {/* Two-column info grid */}
            <div className="info-grid two">
              {/* Asset Type */}
              <div className="info-item1">
                <div className="info-label-line">
                  <FileText size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Asset Type</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip1 chip-green">
                    {assetType === "email" && "Marketing Email"}
                    {assetType === "webpage" && "Web Page"}
                    {assetType === "brochure" && "Brochure"}
                    {assetType === "presentation" && "Presentation"}
                    {assetType === "social" && "Social Media"}
                    {!["email", "webpage", "brochure", "presentation", "social"].includes(assetType) && assetType}
                  </span>
                ) : (
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="form-select form-select-sm mt-1"
                  >
                    <option value="email">Marketing Email</option>
                    <option value="webpage">Web Page</option>
                    <option value="brochure">Brochure</option>
                    <option value="presentation">Presentation</option>
                    <option value="social">Social Media</option>
                  </select>
                )}
              </div>

              {/* Therapy Area */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Stethoscope size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Therapy Area</div>
                </div>
                {!isEditingContext ? (
                  // <span className="chip2 chip-green">{therapeuticContext || "Not specified"}</span>
                  <span className="chip2 chip-green">{"Not specified"}</span>
                ) : (
                  <input
                    type="text"
                    value={therapeuticContext}
                    onChange={(e) => setTherapeuticContext(e.target.value)}
                    placeholder="e.g., Cardiovascular"
                    className="form-control form-control-sm mt-1"
                  />
                )}
              </div>

              {/* Indication */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Pill size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Indication</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip1 chip-green">{indication || "Not specified"}</span>
                ) : (
                  <input
                    type="text"
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    placeholder="e.g., Hypertension"
                    className="form-control form-control-sm mt-1"
                  />
                )}
              </div>

              {/* Primary Target Audience */}
              <div className="info-item1">
                <div className="info-label-line">
                  <Users size={15} className="h-4 w-4 text-muted-foreground" />
                  <div className="info-label1">Primary Target Audience</div>
                </div>
                {!isEditingContext ? (
                  <span className="chip2 chip-green">{targetAudience || "Not specified"}</span>
                ) : (
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Healthcare professionals"
                    className="form-control form-control-sm mt-1"
                  />
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="soft-divider" />

            {/* Additional audiences */}
            <div className="audiences">
              <div className="aud-row d-flex align-items-start justify-content-between">
                <div className="aud-left">
                  <div className="info-label">Additional Audiences</div>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {additionalAudiences.length === 0 ? (
                      <span className="aud-empty1">No additional audiences selected</span>
                    ) : (
                      additionalAudiences.map((aud) => (
                        <span key={aud} className="chip chip-green d-inline-flex align-items-center gap-1">
                          {aud}
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 ms-1 text-danger text-decoration-none"
                            onClick={() => toggleAdditionalAudience(aud)}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Add audience select */}
              <div className="d-flex align-items-center gap-2 mt-2">
                <select
                  className="form-select form-select-sm"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) toggleAdditionalAudience(v);
                    e.target.value = ""; // reset
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Add audience
                  </option>
                  {availableAdditionalAudiences
                    .filter((a) => !additionalAudiences.includes(a))
                    .map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </section>



        {/* Source Content Card */}
        <section className="card card-source">
          <div className="card-header">
            <div className="header-left">
              <h3 className="card-title">Source Content</h3>
              <p className="card-sub">Imported content can be edited or replaced</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-bar content-tabs" role="tablist" aria-label="Source content tabs">
            <div className="tabs">
              <button
                role="tab"
                id="tab-editor"
                aria-controls="panel-editor"
                aria-selected={contentTab === "editor"}
                tabIndex={contentTab === "editor" ? 0 : -1}
                className={`tab ${contentTab === "editor" ? "is-active" : ""}`}
                onClick={() => setContentTab("editor")}
              >
                Content Editor
              </button>
              <button
                role="tab"
                id="tab-preview"
                aria-controls="panel-preview"
                aria-selected={contentTab === "preview"}
                tabIndex={contentTab === "preview" ? 0 : -1}
                className={`tab ${contentTab === "preview" ? "is-active" : ""}`}
                onClick={openSegmentationPreview}
              >
                Segmentation Preview
              </button>
            </div>
          </div>

          {/* Full-frame tab content area */}
          <div className="card-body">
            {/* Editor */}
            <div
              role="tabpanel"
              id="panel-editor"
              aria-labelledby="tab-editor"
              hidden={contentTab !== "editor"}
              className="tabpanel"
            >
              <div className="editor-wrap full-frame neutral">
                <textarea
                  className="content-editor"
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Preview */}
            <div
              role="tabpanel"
              id="panel-preview"
              aria-labelledby="tab-preview"
              hidden={contentTab !== "preview"}
              className="tabpanel"
            >
              {isSegLoading && (
                <div className="seg-loading">
                  <div className="spinner" />
                  <span>Generating segments via n8n…</span>
                </div>
              )}

              {/* ERROR MODE: show ONLY the banner, no segments or fallback */}
              {!!segError && (
                <div className="error-banner" role="alert">
                  <strong>Couldn’t generate segments.</strong>
                  <div className="error-sub">{segError}</div>
                  {/* Intentionally no fallback rendering below */}
                </div>
              )}

              {/* SUCCESS MODE: n8n segments */}
              {!isSegLoading && !segError && apiRawJson && (
                <N8NStringSegments json={apiRawJson} />
              )}

{/* {!isSegLoading && apiRawJson && <N8NStringSegments json={apiRawJson} />} */}

              {/* NO DATA MODE: if no n8n data and no error, show fallback or empty message */}
              {!isSegLoading && !segError && !apiRawJson && (
                <div className="segments-wrap">
                  {localSegments.length > 0 ? (
                    localSegments.map((seg) => (
                      <article key={seg.id} className="segment-card">
                        <div className="segment-header">
                          <span className={`seg-label ${seg.kindClass}`}>{seg.label}</span>
                          <span className="seg-meta">
                            Segment {seg.index} · {seg.length} characters
                          </span>
                        </div>
                        <div className="segment-body">{seg.text}</div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-seg">No segment present to display.</div>
                  )}
                </div>
              )}
{/* 
{!isSegLoading && !apiRawJson && (
                   <div className="segments-wrap">
                     {localSegments.map(seg => (
                       <article key={seg.index} className="segment-card">
                         <div className="segment-header">{seg.label}</div>
                         <div className="segment-body">{seg.text}</div>
                       </article>
                     ))}
                   </div>
                )} */}
            </div>
          </div>
        </section>

        {/* Sticky Footer CTA */}
        <footer className="sticky-footer">
        <button className="primary-cta" onClick={handleComplete}>Complete Phase 1 →</button>
          {/* <button
            className="primary-cta"
            onClick={handleClick}  
          >
            Complete Phase 1 →
          </button> */}
        </footer>
        </div>
      </main>
    </div>
  );
}

/**
 * RESTORED HELPER FUNCTIONS (Logic here)
 */

function N8NStringSegments({ json }) {
  const first = Array.isArray(json) ? json[0] : json;
  const output = first?.output;
  const entries = output && typeof output === "object" && !Array.isArray(output)
    ? Object.keys(output).filter((k) => /^segment\s*\d+/i.test(k)).map((k) => {
        const num = parseInt(k.replace(/\D+/g, ""), 10);
        return { num: isNaN(num) ? 0 : num, title: `Segment ${isNaN(num) ? k : num}`, text: String(output[k] ?? "") };
      }).filter((seg) => seg.text.trim().length > 0).sort((a, b) => a.num - b.num)
    : [];

  return (
    <div className="segments-wrap">
      {/* <h3 className="card-title">Segmentation Preview</h3> */}
      {entries.map((seg) => (
        <article key={seg.title} className="segment-card">
          <div className="segment-header">
            <span className="seg-label kind-paragraph">{seg.title}</span>
            <span className="seg-meta">{seg.text.length} characters</span>
          </div>
          <div className="segment-body">{seg.text}</div>
        </article>
      ))}
    </div>
  );
}

function segmentContent(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim());
  const segments = [];
  let idx = 1;
  const subjectLine = lines.find((l) => /^subject\b/i.test(l)) || lines[0] || "";
  if (subjectLine) {
    const txt = subjectLine.replace(/^subject:\s*/i, "");
    segments.push({ id: "subject", index: idx++, label: "Subject Line", kindClass: "kind-subject", text: txt, length: txt.length });
  }
  return segments;
}

function GlobalAssetCapture(apiRawJson, localSegments, langFromPrev = "EN") {
  const getIndexFromKey = (key, fallbackIdx) => {
    const m = String(key || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : fallbackIdx;
  };
  const first = Array.isArray(apiRawJson) ? apiRawJson[0] : apiRawJson;
  const output = first?.output;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return Object.keys(output).filter((k) => /^segment\b/i.test(k)).map((k, idx) => ({
      id: k, index: getIndexFromKey(k, idx + 1), source: String(output[k] ?? ""),
      words: String(output[k] || "").split(/\s+/).filter(Boolean).length, status: "Pending", lang: langFromPrev
    })).filter((s) => s.source.trim().length > 0).sort((a, b) => a.index - b.index);
  }
  return localSegments.map((seg, i) => ({
    id: seg.id || `seg-${i+1}`, index: seg.index || i+1, source: seg.text, 
    words: seg.text.split(/\s+/).filter(Boolean).length, status: "Pending", lang: langFromPrev
  }));
}