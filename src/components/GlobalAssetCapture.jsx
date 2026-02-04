import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

export default function GlobalContextCapture() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const projectName = state?.projectName || "HCP Clinical Insights Email Campaign - DE Adaptation";
  const importedContent = state?.content || `No content to display`;
  const inboundLang = state?.lang ?? state?.sourceLang ?? "EN";

  // State Management
  const [contentTab, setContentTab] = useState("editor"); 
  const [contentText, setContentText] = useState(importedContent);
  const [isFocusMode, setIsFocusMode] = useState(false); 
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  
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

  // Memoized phases and segments
  const localSegments = useMemo(() => segmentContent(contentText), [contentText]);
  
  const phases = useMemo(() => [
    { id: 1, name: "Global Context Capture", sub: "Source content analysis", status: "active" },
    { id: 2, name: "Smart TM Translation", sub: "AI-powered translation", status: "todo" },
    { id: 3, name: "Cultural Intelligence", sub: "Cultural adaptation", status: "todo" },
    { id: 4, name: "Regulatory Compliance", sub: "Compliance validation", status: "todo" },
    { id: 5, name: "Quality Intelligence", sub: "Quality assurance", status: "todo" },
    { id: 6, name: "DAM Integration", sub: "Asset packaging", status: "todo" },
    { id: 7, name: "Integration Lineage", sub: "System integration", status: "todo" },
  ], []);

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
        `http://localhost:5000/api/segmented-content`,
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
          fetch("http://localhost:5000/api/segmented-content", {
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
    navigate("/smartTMTranslationHub", {
      state: { projectName, segments: segmentsForNext, lang: inboundLang },
    });
  };

  return (
    <div className={`gac-page ${isFocusMode ? "focus-active" : ""}`}>
      {!isFocusMode && (
        <aside className="gac-sidebar">
          <div className="sidebar-header">
            <div className="progress-row"><span className="progress-label">Overall Progress</span><span className="progress-value">0%</span></div>
          </div>
          <nav className="sidebar-phases">
            {phases.map((p) => (
              <button key={p.id} className={`phase-item ${p.status === "active" ? "is-active" : ""}`}>
                <span className="phase-text"><span className="phase-title">{p.name}</span></span>
              </button>
            ))}
          </nav>
        </aside>
      )}

      <main className="gac-main">
        <header className="gac-header">
          <div className="header-left">
            <div className="crumbs"><button className="crumb">Main Hub</button> / <button className="crumb">Glocalization Hub</button></div>
            <h1 className="page-title">{projectName}</h1>
          </div>
          <div className="header-right">
            <button className="ghost-btn" onClick={handleSave}>Save</button>
            <button 
              className={`ghost-btn ${isFocusMode ? "focus-on" : ""}`} 
              onClick={() => setIsFocusMode(!isFocusMode)}
              style={isFocusMode ? { color: '#1F7AEC', fontWeight: 'bold', border: '1px solid #1F7AEC' } : {}}
            >
              {isFocusMode ? "Exit Focus" : "Focus"}
            </button>
          </div>
        </header>

        {/* SUMMARY SECTION - Centered as per Screenshot 1 */}
        <section className="card soft">
          <div className="card-header">
            <h3 className="card-title">Source Asset Summary</h3>
            <button className="link-btn" onClick={() => setIsEditingSummary(!isEditingSummary)}>
              {isEditingSummary ? "✅ Save" : "✏️ Edit"}
            </button>
          </div>
          <div className="info-grid four">
            {[
              { label: "Asset Type", key: "assetType" },
              { label: "Indication", key: "indication" },
              { label: "Therapy Area", key: "therapyArea" },
              { label: "Primary Target Audience", key: "audience" }
            ].map(item => (
              <div className="info-item" key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="info-label" style={{ color: '#1F7AEC', fontWeight: '700', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                {isEditingSummary ? (
                  <input 
                    className="edit-input"
                    value={summary[item.key]} 
                    onChange={(e) => setSummary({...summary, [item.key]: e.target.value})}
                    style={{ textAlign: 'center', borderRadius: '20px', border: '1.5px solid #1F7AEC', padding: '4px' }}
                  />
                ) : (
                  <span className="chip-soft">{summary[item.key]}</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card card-source">
          <div className="tabs-bar">
            <button className={`tab ${contentTab === "editor" ? "is-active" : ""}`} onClick={() => setContentTab("editor")}>Content Editor</button>
            <button className={`tab ${contentTab === "preview" ? "is-active" : ""}`} onClick={openSegmentationPreview}>Segmentation Preview</button>
          </div>

          <div className="card-body">
            {contentTab === "editor" ? (
              <textarea className="content-editor" value={contentText} onChange={(e) => setContentText(e.target.value)} />
            ) : (
              <div className="tabpanel">
                {isSegLoading && <div>Generating segments via n8n…</div>}
                {!!segError && <div className="error-banner">{segError}</div>}
                {/* Calling N8NStringSegments helper */}
                {!isSegLoading && apiRawJson && <N8NStringSegments json={apiRawJson} />}
                {!isSegLoading && !apiRawJson && (
                   <div className="segments-wrap">
                     {localSegments.map(seg => (
                       <article key={seg.index} className="segment-card">
                         <div className="segment-header">{seg.label}</div>
                         <div className="segment-body">{seg.text}</div>
                       </article>
                     ))}
                   </div>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="sticky-footer">
          <button className="primary-cta" onClick={handleComplete}>Complete Phase 1 →</button>
        </footer>
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
      <h3 className="card-title">Segmentation Preview</h3>
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