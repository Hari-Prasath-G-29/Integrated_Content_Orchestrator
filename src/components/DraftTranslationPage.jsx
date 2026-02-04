
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/* PATCH: normalize helper to clean up segments */
function normalizeSegments(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((s, i) => {
      const index = typeof s.index === "number" ? s.index : i + 1;
      const source = String(s.source ?? "");
      const translatedRaw = String(s.translated ?? "");
      const translated =
        translatedRaw.trim() === "— Awaiting translation —" ? "" : translatedRaw.trim();
      const words =
        typeof s.words === "number" ? s.words : source.split(/\s+/).filter(Boolean).length;
      const status = s.status ?? (translated ? "Completed" : "Pending");
      const id = s.id ?? `seg-${index}`;
      return {
        ...s,
        id,
        index,
        source,
        translated,
        words,
        status,
      };
    })
    .sort((a, b) => (a.index || 0) - (b.index || 0));
}

export default function DraftTranslationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  /* PATCH: pick these from state when available */
  const projectName = state?.projectName || "Smart TM Project";
  const inboundLang = state?.inboundLang || state?.lang || "EN";
  const therapyArea = state?.therapyArea || "Respiratory · DE";

  /* PATCH: hydrate segments from state first, or sessionStorage fallback */
  const [segments, setSegments] = useState(() => {
    if (Array.isArray(state?.segments)) {
      const norm = normalizeSegments(state.segments);
      try {
        sessionStorage.setItem("draftSegments", JSON.stringify(norm));
      } catch {}
      return norm;
    }
    try {
      const saved = sessionStorage.getItem("draftSegments");
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeSegments(parsed);
      }
    } catch {}
    return [];
  });

  /* PATCH: react when upstream passes new segments via state */
  useEffect(() => {
    if (Array.isArray(state?.segments)) {
      const norm = normalizeSegments(state.segments);
      setSegments(norm);
      try {
        sessionStorage.setItem("draftSegments", JSON.stringify(norm));
      } catch {}
    }
  }, [state?.segments]);

  /* PATCH: compute totals based on hydrated segments */
  const totalSegments = state?.totalSegments ?? segments.length;
  const totalWords =
    state?.totalWords ?? segments.reduce((a, s) => a + (s.words || 0), 0);
  const tmLeveragePct =
    typeof state?.tmLeveragePct === "number" ? state.tmLeveragePct : 0;

  // default open AFTER segments are known
  const [openIds, setOpenIds] = useState(new Set());
  useEffect(() => {
    setOpenIds(new Set(segments.map((s) => s.id)));
  }, [segments]);

  const isOpen = (id) => openIds.has(id);
  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const compiledDraft = useMemo(() => {
    return (segments || [])
      .map(
        (s) =>
          `Section ${s.index}\n${
            (s.translated || "").trim() || "[No translation]"
          }`
      )
      .join("\n\n---\n\n");
  }, [segments]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(compiledDraft);
      alert("Draft copied to clipboard.");
    } catch {
      alert("Copy failed.");
    }
  };

  const handleDownloadAsText = () => {
    const blob = new Blob([compiledDraft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `DraftTranslation-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToCI = () => {
    navigate("/culturalAdaptationWorkspace", {
      state: { projectName, segments, lang: inboundLang, therapyArea },
    });
  };

  const generatedAt = useMemo(() => {
    const d = new Date();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss} ${d.getHours() >= 12 ? "PM" : "AM"}`;
  }, []);

  return (
    <div className="dt-app">
      {/* Top bar (shows Draft tab active) */}
      <div className="dt-topbar">
        <div className="dt-top-left">
          <button className="dt-crumb" onClick={() => navigate(-1)}>
            <span className="dt-crumb-icon">〈</span> Translation Workspace
          </button>
        </div>
        <div className="dt-top-center">
          <div className="dt-tab dt-tab-active">
            <span className="dt-tab-icon">✔</span> Draft Translation
          </div>
          <span className="dt-tab-status">Ready</span>
        </div>
        <div className="dt-top-right">
          <button
            className="dt-link"
            onClick={() =>
              navigate("/tmLeverageOverview", {
                state: { projectName, segments, totalSegments, totalWords },
              })
            }
          >
            TM Leverage Overview
          </button>
        </div>
      </div>

      {/* Header strip */}
      <div className="dt-header-strip">
        <div className="dt-header-left">
          <h2 className="dt-title">Complete Draft Translation</h2>
          <div className="dt-subtitle">
            {totalSegments} segments • {totalWords} words • {tmLeveragePct}% TM leverage
          </div>
          {/* PATCH: show context */}
          <div className="dt-subtitle dt-muted">
            {projectName} &nbsp;&middot;&nbsp; {therapyArea} &nbsp;&middot;&nbsp; {inboundLang}
          </div>
        </div>
        <div className="dt-header-actions">
          <button className="dt-btn outline" onClick={handleCopyToClipboard}>Copy to Clipboard</button>
          <button className="dt-btn outline" onClick={handleDownloadAsText}>Download as Text</button>
          <button className="dt-btn primary" onClick={handleSendToCI}>Send to Cultural Intelligence</button>
        </div>
      </div>

      {/* Body */}
      <div className="dt-body">
        {/* Left sections */}
        <div className="dt-left">
          {segments.length === 0 && (
            <div className="dt-empty">
              No translated segments found. Please run "Translate All" from the Smart TM Translation page.
            </div>
          )}

          {segments.map((s, i) => {
            const open = isOpen(s.id);
            return (
              <div key={s.id || `seg-${s.index || i}`} className="dt-item">
                <div className="dt-item-header">
                  <span className="dt-item-num">{s.index}</span>
                  <span className="dt-item-title">Section {s.index}</span>

                  <span className="dt-badge green">{s.words || 0} words</span>
                  <span className="dt-badge gray">{tmLeveragePct}% TM</span>

                  <button
                    className={`dt-toggle ${open ? "open" : ""}`}
                    onClick={() => toggleOpen(s.id)}
                    aria-label={open ? "Collapse section" : "Expand section"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {open && (
                  <div className="dt-item-content">
                    {(s.translated || "").trim() || "[No translation]"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right metadata */}
        <aside className="dt-right">
          <div className="dt-meta-card">
            <h4 className="dt-meta-title">Translation Metadata</h4>

            <div className="dt-meta-percentage-card">
              <div className="dt-meta-percentage">{tmLeveragePct}%</div>
              <div className="dt-meta-percentage-sub">Average TM Leverage</div>
            </div>

            <div className="dt-meta-list">
              <div className="dt-meta-row">
                <span className="dt-meta-label">Total Segments</span>
                <span className="dt-meta-value">{totalSegments}</span>
              </div>
              <div className="dt-meta-row">
                <span className="dt-meta-label">Total Words</span>
                <span className="dt-meta-value">{totalWords}</span>
              </div>
              <div className="dt-meta-row">
                <span className="dt-meta-label">Generated</span>
                <span className="dt-meta-value">{generatedAt}</span>
              </div>
            </div>

            <div className="dt-meta-ready">
              <span className="dt-ready-icon">✅</span>
              <span>Ready for Cultural Intelligence Analysis</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
