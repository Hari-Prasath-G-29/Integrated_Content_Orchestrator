import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import "../App.css";
import "./css/Translationhub.css";
import {  ArrowLeft,
  Save, ArrowRight, Upload, FileText, CheckCircle2, Maximize2, BarChart3,
  Minimize2, Users, Stethoscope, Edit3, Plus, X, Pill, Unlock, CheckCircle, TrendingUp, Languages, Loader2, Sparkles, Lock } from 'lucide-react';
import { getProject, updateProjectMeta, markPhaseComplete, setP2DraftGenerated } from '../lib/progressStore';
import { usePhaseNavigation } from "./PhaseNav.jsx";

// --- Import the new component (Ensure file is created as TMLeverageOverview.jsx) ---
import TMLeverageOverview from "./TMLeverageOverview";

/* Sidebar phases (original list retained) */
const SIDEBAR_PHASES = [
  { id: 'P1', name: "Global Context Capture", sub: "Source content analysis", status: "done", iconClass: "icon-context" },
  { id: 'P2', name: "Smart TM Translation", sub: "AI-powered translation", status: "active", iconClass: "icon-translation" },
  { id: 'P3', name: "Cultural Intelligence", sub: "Cultural adaptation", status: "todo", iconClass: "icon-culture" },
  { id: 'P4', name: "Regulatory Compliance", sub: "Compliance validation", status: "todo", iconClass: "icon-compliance" },
  { id: 'P5', name: "Quality Intelligence", sub: "Quality assurance", status: "todo", iconClass: "icon-quality" },
  { id: 'P6', name: "DAM Integration", sub: "Asset packaging", status: "todo", iconClass: "icon-dam" },
  { id: 'P7', name: "Integration Lineage", sub: "System integration", status: "todo", iconClass: "icon-integration" },
];

/* Env helpers */
const getEnv = () => {
  const pe = (typeof process !== "undefined" && process.env) ? process.env : {};
  const we = (typeof window !== "undefined" && window._env_) ? window._env_ : {};
  return { ...we, ...pe };
};
const ENV = getEnv();

/** Use .env or hardcode during test */
// const N8N_WEBHOOK_URL = ENV.REACT_APP_N8N_WEBHOOK_URL || ENV.VITE_N8N_WEBHOOK_URL || "";
// const N8N_BULK_WEBHOOK_URL = ENV.REACT_APP_N8N_BULK_WEBHOOK_URL || ENV.VITE_N8N_BULK_WEBHOOK_URL || "";

/**
 * Persists the successful AI translation to the PostgreSQL database
 */
const saveTranslationToDb = async (source, target, sLang, tLang, docName) => {
  try {
    const response = await fetch(
      "https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/translated-content",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: docName,
          source_text: source,
          target_text: target,
          source_language: sLang || "EN",
          target_language: tLang,
        }),
      },
    );

    if (response.ok) {
      console.log("Translation successfully saved to DB");
    } else {
      console.error("Failed to save to DB:", await response.text());
    }
  } catch (error) {
    console.error("Network error saving translation:", error);
  }
};

// For quick test you can uncomment and set directly:
const N8N_WEBHOOK_URL = "http://172.16.4.237:8010/webhook/csv_upload";
const N8N_BULK_WEBHOOK_URL = "http://172.16.4.237:8010/webhook/csv_upload_bulk";

// const N8N_WEBHOOK_URL = "http://172.16.4.237:8015/webhook-test/csv_upload";
// const N8N_BULK_WEBHOOK_URL = "http://172.16.4.237:8015/webhook-test/csv_upload_bulk";
// const N8N_BULK_WEBHOOK_URL = "http://172.16.4.237:8015/webhook-test/translateAll";

const N8N_AUTH =
  ENV.REACT_APP_N8N_TOKEN ||
  ENV.VITE_N8N_TOKEN ||
  "";

/** Extract target language from therapyArea like "Respiratory · DE" */
const getTargetLang = (therapyArea) => {
  const m = String(therapyArea || "").match(/·\s*([A-Za-z-]+)/);
  return m?.[1] || "DE";
};

/** Extract translated text from n8n response (single-segment helper retained) */
const extractTranslated = async (res) => {
  let body;
  try {
    body = await res.json();
  } catch {
    const text = await res.text();
    return (text || "").trim();
  }

  if (Array.isArray(body) && body.length > 0) {
    const first = body[0];
    if (first && typeof first.output === "string") return first.output.trim();
    for (const k of Object.keys(first || {})) {
      const v = first[k];
      if (typeof v === "string" && /translat|output/i.test(k)) return v.trim();
    }
  }

  if (body && typeof body === "object") {
    if (typeof body.translated === "string") return body.translated.trim();
    if (body.data && typeof body.data.translated === "string") return body.data.translated.trim();
    for (const k of Object.keys(body)) {
      const v = body[k];
      if (typeof v === "string" && /translat|output/i.test(k)) return v.trim();
    }
  }

  return "";
};

/* ===== Helpers to normalize n8n bulk output ===== */

/** Normalize the "output" object: alias keys like "segment 1" -> "1", "segment_1", etc. */
function normalizeOutputMap(outputObj) {
  const byKey = {};
  for (const [rawKey, rawVal] of Object.entries(outputObj || {})) {
    if (typeof rawVal !== "string") continue;
    const val = rawVal.trim();
    const key = String(rawKey).trim();

    // Keep original
    byKey[key] = val;

    // If key looks like "segment 1", alias to multiple variants
    const m = key.match(/segment[\s_-]*([0-9]+)/i);
    if (m) {
      const ix = m[1]; // "1"
      byKey[ix] = val;                     // "1"
      byKey[`segment ${ix}`] = val;        // "segment 1"
      byKey[`Segment ${ix}`] = val;        // case variant
      byKey[`segment_${ix}`] = val;        // "segment_1"
      byKey[`segment-${ix}`] = val;        // "segment-1"
      byKey[`seg ${ix}`] = val;            // "seg 1"
      byKey[`Seg ${ix}`] = val;            // "Seg 1"
      byKey[`segment${ix}`] = val;   // no-space
      byKey[`Segment${ix}`] = val;   // no-space PascalCase
    }
  }
  return byKey;
}

/** Lookup key variants for a segment */
function keyVariantsForSegment(seg) {
  const ix = String(seg.index);
  const id = String(seg.id);
  return [
    id,
    ix,
    `segment ${ix}`,
    `Segment ${ix}`,
    `segment_${ix}`,
    `segment-${ix}`,
    `seg ${ix}`,
    `Seg ${ix}`,
    `segment${ix}`,
    `Segment${ix}`,
    id.toLowerCase(),
    ix.toLowerCase(),
  ];
}

/** Extract bulk translations (robust to multiple response shapes, including your screenshot) */
async function extractBulkTranslations(res, pending) {
  try {
    const body = await res.json();

    // CASE A: Array with an item containing { output: { "segment 1": "...", ... } }
    if (Array.isArray(body) && body.length > 0) {
      const first = body[0];
      if (first && typeof first === "object" && first.output && typeof first.output === "object") {
        return normalizeOutputMap(first.output);
      }
    }

    // CASE B: Object with output
    if (body && typeof body === "object" && body.output && typeof body.output === "object") {
      return normalizeOutputMap(body.output);
    }

    // CASE C: Array of items with segmentId/id/index + string fields
    const arr =
      Array.isArray(body) ? body :
      Array.isArray(body?.translations) ? body.translations :
      Array.isArray(body?.data) ? body.data :
      Array.isArray(body?.items) ? body.items : null;

    const byKey = {};
    if (arr) {
      for (const item of arr) {
        const key = item.segmentId ?? item.id ?? item.index;
        if (key === undefined || key === null) continue;

        let translated = "";
        for (const k of Object.keys(item)) {
          const v = item[k];
          if (typeof v === "string" && /translat|output|target|result/i.test(k)) {
            translated = v.trim();
            break;
          }
        }
        byKey[String(key)] = translated;

        // If numeric key, add "segment N" alias
        if (typeof key === "number" || /^\d+$/.test(String(key))) {
          const ix = String(key);
          byKey[`segment ${ix}`] = translated;
        }
      }
      return byKey;
    }

    // CASE D: Object fallback
    if (body && typeof body === "object") {
      const byKey2 = {};
      for (const k of Object.keys(body)) {
        const v = body[k];
        if (typeof v === "string") byKey2[k] = v.trim();
        else if (v && typeof v === "object") {
          for (const kk of Object.keys(v)) {
            const vv = v[kk];
            if (typeof vv === "string" && /translat|output|target|result/i.test(kk)) {
              byKey2[k] = vv.trim();
              break;
            }
          }
        }
      }
      if (Object.keys(byKey2).length > 0) return byKey2;
    }
  } catch {
    // fall through to text parsing
  }

  // Text fallback: map lines to pending indexes
  const txt = await res.text();
  const lines = String(txt || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const byKey = {};
  pending.forEach((seg, i) => {
    byKey[seg.id] = lines[i] || "";
    byKey[`segment ${seg.index}`] = lines[i] || ""; // helpful alias
  });
  return byKey;
}

/** Progress modal (visual) */
function BulkProgressModal({ open, progress, subtitle = "Translating all pending segments with Smart TM..." }) {
  if (!open) return null;
  const pct = Math.round((progress.done / Math.max(progress.total || 0, 1)) * 100);

  return (
    <div className="tm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bulk-progress-title">
      <div className="tm-modal tm-modal-progress">
        <div className="tm-modal-header">
          <h3 id="bulk-progress-title" className="tm-modal-title">Bulk Translation in Progress</h3>
          <button className="tm-close is-disabled" aria-label="Close" disabled title="Closes when translation finishes">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="13" fill="#EEF3FB" stroke="#CFE0FB" />
              <path d="M9 9l10 10M19 9L9 19" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="tm-modal-sub">{subtitle}</p>

        <div className="tm-progress-bar large" aria-label="Bulk progress">
          <div className="tm-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="tm-modal-status">
          {progress.done} of {progress.total} segments completed
          {progress.failed > 0 ? ` (failed: ${progress.failed})` : ""}
        </div>

        <div className="tm-info-box">
          <svg className="tm-info-radio" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.5" fill="none" stroke="#9CA3AF" />
            <circle cx="9" cy="9" r="3.5" fill="#1F7AEC" />
          </svg>
          <div className="tm-info-text">
            <div>This may take several minutes. Please don't close the window.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Draft panel integrated on the same page (TOP BAR REMOVED) ===== */
function DraftPanel({
  projectName,
  therapyArea,
  inboundLang,
  segments,
  tmLeveragePct = 0,
  onBackToWorkspace, // still passed, but no mini top bar is rendered
  onSendToCI,
}) {
  // Normalize and sort segments defensively
  const normalized = useMemo(() => {
    const arr = Array.isArray(segments) ? segments : [];
    return arr
      .map((s, i) => {
        const index = typeof s.index === "number" ? s.index : i + 1;
        const id = s.id ?? `seg-${index}`;
        const source = String(s.source ?? "");
        const translatedRaw = String(s.translated ?? "");
        const translated = translatedRaw.trim() === "— Awaiting translation —" ? "" : translatedRaw.trim();
        const words = typeof s.words === "number" ? s.words : source.split(/\s+/).filter(Boolean).length;
        const status = s.status ?? (translated ? "Completed" : "Pending");
        const lang = s.lang ?? inboundLang ?? "EN";
        return { ...s, id, index, source, translated, words, status, lang };
      })
      .sort((a, b) => (a.index || 0) - (b.index || 0));
  }, [segments, inboundLang]);

  const totalSegments = normalized.length;
  const totalWords = normalized.reduce((a, s) => a + (s.words || 0), 0);

  const [openIds, setOpenIds] = useState(new Set());
  useEffect(() => {
    // setOpenIds(new Set(normalized.map((s) => s.id)));
    setOpenIds(new Set());
  }, [normalized]);

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
    return normalized
      .map((s) => `Section ${s.index}\n${(s.translated || "").trim() || "[No translation]"}`)
      .join("\n\n---\n\n");
  }, [normalized]);

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

  const generatedAt = useMemo(() => {
    const d = new Date();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss} ${d.getHours() >= 12 ? "PM" : "AM"}`;
  }, []);

  return (
    <div className="dt-app">
      {/* NOTE: Mini top bar removed on purpose to avoid duplication with main page header/tabs */}

      {/* Header strip */}
      <div className="dt-header-strip">
        <div className="dt-header-left">
          <h2 className="dt-title"> <FileText size={19} className="h-5 w-5 text-emerald-600 ml-2" />Complete Draft Translation</h2>
          <div className="dt-subtitle">
            {totalSegments} segments • {totalWords} words • {tmLeveragePct}% TM leverage
          </div>
          {/* <div className="dt-subtitle dt-muted">
            {projectName} &nbsp;&middot;&nbsp; {therapyArea} &nbsp;&middot;&nbsp; {inboundLang}
          </div> */}
        </div>
        <div className="dt-header-actions">
          <button className="dt-btn outline py-2 px-4" onClick={handleCopyToClipboard}>Copy to Clipboard</button>
          <button className="dt-btn outline py-2 px-4" onClick={handleDownloadAsText}>Download as Text</button>
          <button className="dt-btn primary" onClick={() => onSendToCI(normalized)}>
          <ArrowRight size={15} className="h-4 w-4 mr-2" />Send to Cultural Intelligence</button>
        </div>
      </div>

      {/* Body */}
      <div className="dt-body">
        {/* Left sections */}
        <div className="dt-left">
          {normalized.length === 0 && (
            <div className="dt-empty">
              No translated segments found. Please run "Translate All" from the Smart TM Translation tab.
            </div>
          )}

          {normalized.map((s, i) => {
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
          <h4 className="dt-meta-title">
            <BarChart3 size={19} className="h-4 w-4" />
              Translation Metadata</h4>

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

/** Smart TM Translation Hub */
export default function SmartTMTranslationHub({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressWords: progressWordsProp = { done: 0, total: 333 },
  // segments: segmentsProp = "No Segments to display",
  segments: segmentsProp = null,
}) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const projectId = state?.projectId;

  const projectRec = React.useMemo(() => getProject(projectId), [projectId]);

// 🔁 Restore "draft generated" flag (from meta or localStorage)
const draftGeneratedPersisted = !!(
    projectRec?.meta?.p2DraftGenerated ||
    localStorage.getItem(`p2_draft_generated_${projectId}`) === "true"
  );
  
  // Ensure Draft tab is unlocked if the persisted flag exists
  useEffect(() => {
    if (draftGeneratedPersisted) {
      setIsDraftUnlocked(true);
      setShowGenerateDraft(false);
    }
}, [draftGeneratedPersisted]);
  

const persistedSegmentsP2 = React.useMemo(
    () => (projectRec?.meta?.segmentsP2 && Array.isArray(projectRec.meta.segmentsP2))
          ? projectRec.meta.segmentsP2
          : [],
    [projectRec]
  );
  
   const persistedSegmentsP1 = React.useMemo(
     () => (projectRec?.meta?.segmentsP1 && Array.isArray(projectRec.meta.segmentsP1))
           ? projectRec.meta.segmentsP1
           : [],
     [projectRec]
   );

  const [isEditingTranslation, setIsEditingTranslation] = useState(false);
  // Toggle handler
 const [isFocusMode, setIsFocusMode] = useState(() => {
  // restore from localStorage on mount
  const v = localStorage.getItem('tm_focus_mode');
  return v === 'true';
});
const toggleFocusMode = () => setIsFocusMode(prev => !prev);

// persist on change
useEffect(() => {
  localStorage.setItem('tm_focus_mode', String(isFocusMode));
}, [isFocusMode]);

// keyboard: F to focus, Esc to exit
useEffect(() => {
  const onKey = (e) => {
    const k = String(e.key || '').toLowerCase();
    if (k === 'f') setIsFocusMode(true);
    if (k === 'escape') setIsFocusMode(false);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);

  /** Tabs */
  const [activeTab, setActiveTab] = useState("workspace");

  /** Prefer project from previous page */
  const projectName = state?.projectName ?? projectNameProp;

  /** Language passed from previous page */
  const inboundLang = state?.lang ?? "EN";
  const gotoPhase = usePhaseNavigation(projectId, projectName);

  /** Normalize incoming segments */
  // const segments = useMemo(() => {
  //   const raw = Array.isArray(state?.segments)
  //     ? state.segments
  //     : Array.isArray(segmentsProp)
  //     ? segmentsProp
  //     : [];

  //   return (raw || [])
  //     .map((seg, i) => {
  //       const index = typeof seg.index === "number" ? seg.index : i + 1;
  //       const source = String(seg.source ?? "");
  //       const translated = String(seg.translated ?? "");
  //       const words =
  //         typeof seg.words === "number"
  //           ? seg.words
  //           : source.split(/\s+/).filter(Boolean).length;

  //       return {
  //         id: seg.id ?? `seg-${index}`,
  //         index,
  //         source,
  //         translated,
  //         words,
  //         status: seg.status ?? (translated.trim() ? "Completed" : "Pending"),
  //         lang: seg.lang ?? inboundLang,
  //       };
  //     })
  //     .filter((s) => s.source.trim().length > 0)
  //     .sort((a, b) => a.index - b.index);
  // }, [state?.segments, segmentsProp, inboundLang]);

  const segments = useMemo(() => {
    // const raw = Array.isArray(state?.segments)
    //   ? state.segments
    //   : Array.isArray(segmentsProp)
    //   ? segmentsProp
    //   : [];

// ✅ Prefer location.state.segments; fallback to persisted P1 segments
    //  const raw = Array.isArray(state?.segments)
    //    ? state.segments
    //    : (Array.isArray(segmentsProp) ? segmentsProp : persistedSegments);
    
const rawCandidate =
    (Array.isArray(state?.segments) && state.segments.length > 0)
      ? state.segments     
      : (Array.isArray(persistedSegmentsP2) && persistedSegmentsP2.length > 0)
      ? persistedSegmentsP2
      : (Array.isArray(persistedSegmentsP1) && persistedSegmentsP1.length > 0)
      ? persistedSegmentsP1
      : (Array.isArray(segmentsProp) && segmentsProp.length > 0)
      ? segmentsProp
      : [];


    return (rawCandidate || [])
      .map((seg, i) => {
        const index = typeof seg.index === "number" ? seg.index : i + 1;
        const source = String(seg.source ?? "");
        const translated = String(seg.translated ?? "");
        const words =
          typeof seg.words === "number"
            ? seg.words
            : source.split(/\s+/).filter(Boolean).length;

        return {
          id: seg.id ?? `seg-${index}`,
          index,
          source,
          translated,
          words,
          status: seg.status ?? (translated.trim() ? "Completed" : "Pending"),
          // 🆕 Default each segment's lang to inboundLang if not present
          lang: seg.lang ?? inboundLang,
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  // }, [state?.segments, segmentsProp, inboundLang]);
// }, [state?.segments, segmentsProp, persistedSegmentsP1, inboundLang]);
}, [state?.segments, segmentsProp, persistedSegmentsP1, persistedSegmentsP2, inboundLang]);

  /** Selected segment */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);

  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /** UI overlays (do NOT mutate original segments) */
  const [segOverrides, setSegOverrides] = useState({}); // { [id]: { translated?: string, status?: string } }
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [tmLeverageOn, setTmLeverageOn] = useState(true);

  /** Bulk modal */
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 });

  /** Success banner → Generate Draft Translation */
  const [showGenerateDraft, setShowGenerateDraft] = useState(false);

  // 🚦 Draft tab lock: disabled until user clicks "Generate Draft Translation"
const [isDraftUnlocked, setIsDraftUnlocked] = useState(false);

/** Are ALL segments completed (has real text or explicit status=Completed)? */
const allSegmentsCompleted = useMemo(() => {
  if (segments.length === 0) return false;
  return segments.every((s) => {
    const o = segOverrides[s.id];
    const translated = (o?.translated ?? s.translated ?? "").trim();
    const status = (o?.status ?? s.status) || (translated ? "Completed" : "Pending");
    // treat only real (non-placeholder) translations as completed
    return (translated.length > 0 && translated !== "— Awaiting translation —") || status === "Completed";
  });
}, [segments, segOverrides]);

/** Show success banner only when all complete AND draft is still locked */
useEffect(() => {
    const canShow = allSegmentsCompleted && !isDraftUnlocked && !draftGeneratedPersisted;
    setShowGenerateDraft(canShow);
  }, [allSegmentsCompleted, isDraftUnlocked, draftGeneratedPersisted]);

  /** Draft state for same-page tab */
  const [draftSegments, setDraftSegments] = useState([]);
  const [tmLeveragePct, setTmLeveragePct] = useState(0);
  const [draftPrepared, setDraftPrepared] = useState(false); // to control empty state
  const [tmMatchInfo, setTmMatchInfo] = useState({}); // Stores match percentages by segment ID [cite: 34, 89]

  /** Resolved selected with overrides applied (display only) */
  const selectedResolved = useMemo(() => {
    if (!selected) return null;
    const o = segOverrides[selected.id] || {};
    return { ...selected, ...o };
  }, [selected, segOverrides]);

  /** Helper: has real translated string? */
  const hasRealTranslation = (s) => {
    const t = (s?.translated || "").trim();
    return t.length > 0 && t !== "— Awaiting translation —";
  };

  /** Detail card enabled iff we have real translation */
  const isDetailEnabled = useMemo(() => hasRealTranslation(selectedResolved), [selectedResolved]);

  /** When switching segments, keep detail disabled until translation exists */
  useEffect(() => {
    if (!selected) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        translated: (prev[selected.id]?.translated || "").trim()
          ? prev[selected.id]?.translated
          : "",
      },
    }));
  }, [selectedId, selected, setSegOverrides]);

  /** Progress respects overrides */
  const progressWords = useMemo(() => {
    const total = segments.reduce((acc, s) => acc + (s.words || 0), 0);
    const done = segments.reduce((acc, s) => {
      const o = segOverrides[s.id];
      const translated = (o?.translated ?? s.translated ?? "").trim();
      const status = o?.status ?? s.status;
      if (translated.length > 0 || status === "Completed") acc += (s.words || 0);
      return acc;
    }, 0);
    return total > 0 ? { done, total } : progressWordsProp;
  }, [segments, segOverrides, progressWordsProp]);

  const progressPct = useMemo(() => {
    const pct = (progressWords.done / Math.max(progressWords.total, 1)) * 100;
    return Math.round(pct);
  }, [progressWords]);

  /** Sidebar navigation (original) */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", {
        state: { projectName, segments, lang: inboundLang },
      });
    }
  };

  /** Merge UI overrides into base segments */
  const mergeSegmentsWithOverrides = (segmentsArr, overrides) => {
    if (!Array.isArray(segmentsArr)) return [];
    return segmentsArr.map((s) => {
      const o = overrides?.[s.id] || {};
      return {
        ...s,
        ...(o.translated !== undefined ? { translated: o.translated } : {}),
        ...(o.status !== undefined ? { status: o.status } : {}),
      };
    });
  };

  /** Complete Phase */
  // const handleCompletePhase = () => {
  //   const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides);
  //   navigate("/culturalAdaptationWorkspace", {
  //     state: {
  //       projectName,
  //       segments: mergedSegments,
  //       lang: inboundLang,
  //     },
  //   });
  // };

  /** Complete Phase → go to Cultural Adaptation (preserving translated text) */
  const handleCompletePhase = () => {
    // Merge translated/status overlays (from n8n) into base segments
    // const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides);
    
const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides).map(s => ({
  ...s,
 tmStatus: (s.translated?.trim() ? "Completed" : "Pending"),
 ciStatus: "Pending", // always start P3 as pending
}));

   // ✅ Persist P2 outputs for downstream resume
   updateProjectMeta(projectId, { segmentsP2: mergedSegments });

   const db = JSON.parse(localStorage.getItem('glocal_progress_v1') || '{}');
   console.log('DB meta.segmentsP2', db[projectId]?.meta?.segmentsP2);
   
    markPhaseComplete(projectId, 'P2');     
    navigate("/culturalAdaptationWorkspace", {
      state: {
        projectId,
        projectName,
        segments: mergedSegments, // ✅ entire segments list, with translated content included
        // 🆕 propagate lang
        lang: inboundLang,
      },
    });
  };


  // /** Single segment translate (kept, via single endpoint if you need it) */
  // const handleAiTranslate = async () => {
  //   if (!selected) return;
  //   if (!N8N_WEBHOOK_URL) {
  //     setTranslationError("N8N_WEBHOOK_URL is not configured.");
  //     return;
  //   }

  //   setIsTranslating(true);
  //   setTranslationError(null);

  //   setSegOverrides((prev) => ({
  //     ...prev,
  //     [selected.id]: {
  //       ...prev[selected.id],
  //       translated: "— Awaiting translation —",
  //       status: "Pending",
  //     },
  //   }));

  //   try {
  //     const translated = await translateOneSegment(selected);
  //     setSegOverrides((prev) => ({
  //       ...prev,
  //       [selected.id]: {
  //         ...prev[selected.id],
  //         translated: translated || "— Awaiting translation —",
  //         status: translated ? "Completed" : "Pending",
  //       },
  //     }));
  //   } catch (err) {
  //     setTranslationError(err.message || "Translation failed.");
  //     setSegOverrides((prev) => ({
  //       ...prev,
  //       [selected.id]: {
  //         ...prev[selected.id],
  //         status: "Pending",
  //       },
  //     }));
  //   } finally {
  //     setIsTranslating(false);
  //   }
  // };

   // -----------------------------------------------------------------------
  // REPLACE YOUR EXISTING handleAiTranslate FUNCTION WITH THIS ONE
  // -----------------------------------------------------------------------
  const handleAiTranslate = async () => {
    if (!selected) return;

    // 1. Validation Checks
    if (!N8N_WEBHOOK_URL) {
      setTranslationError("N8N_WEBHOOK_URL is not configured.");
      return;
    }
    if (segOverrides[selected.id]?.status === "Completed") {
      return; // Already done
    }

    // 2. UI Feedback: "Thinking..."
    setIsTranslating(true);
    setTranslationError(null);
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        translated: "— Analyzing TM & Glossary —",
        status: "Pending",
      },
    }));

    try {
      const targetLang = inboundLang; // e.g., "DE" or "Chinese"
      const sourceLang = "English";

      // ---------------------------------------------------------
      // STEP 1: SMART LOOKUP (The "Brain" API)
      // ---------------------------------------------------------
      const lookupRes = await fetch(
        "https://9hrpycs3g5.execute-api.us-east-1.amazonaws.com/Prod/api/smart-tm-lookup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_text: selected.source,
            target_lang: targetLang,
          }),
        },
      );

      if (!lookupRes.ok) throw new Error("Smart TM Lookup failed");
      const decision = await lookupRes.json();
      console.log("🧠 Smart TM Decision:", decision);

      let finalTranslation = "";
      let matchBadgeValue = 0;
      let statusLabel = "Completed"; // Default

      // ---------------------------------------------------------
      // STEP 2: EXECUTE DECISION (3 Tiers)
      // ---------------------------------------------------------

      // --- TIER 1: HIGH MATCH (>= 95%) -> REUSE ---
      if (decision.action === "reuse") {
        console.log(`Exact Match Found (${decision.score * 100}%). Reuse.`);
        finalTranslation = decision.translation;
        matchBadgeValue = Math.round(decision.score * 100);
        statusLabel = "Completed"; // Auto-approve high matches
      }

      // --- TIER 2: HYBRID / CONTEXT MATCH (70% - 94%) -> REVIEW NEEDED ---
      else if (decision.action === "context") {
        console.log(
          `Hybrid Match (${decision.score * 100}%). Enforcing Glossary & Context.`,
        );

        // Set Status to "Review Needed" so user MUST click "View Analysis"
        statusLabel = "Review Needed";
        matchBadgeValue = Math.round(decision.score * 100);

        // Call AI with Context + Glossary Hints
        const payload = {
          segmentId: selected.id,
          projectName,
          source: selected.source,
          sourceLang,
          targetLang,
          inboundLang,
          fuzzyMatch: decision.context_target, // Pass the previous translation as style guide
          glossaryHints: decision.glossary || [], // Pass mandatory terms
          meta: {
            brand_id: state?.brand_id,
            tm_score: decision.score,
          },
        };

        const aiRes = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!aiRes.ok) throw new Error(`n8n Error: ${aiRes.status}`);
        finalTranslation = (await extractTranslated(aiRes)).trim();
      }

      // --- TIER 3: LOW MATCH (< 70%) -> FULL AI ---
      else {
        console.log(`Low/No Match. Full AI Generation.`);
        statusLabel = "Completed"; // Standard AI translation is auto-completed
        matchBadgeValue = 0;

        const payload = {
          segmentId: selected.id,
          projectName,
          source: selected.source,
          sourceLang,
          targetLang,
          inboundLang,
          fuzzyMatch: "", // No context
          glossaryHints: decision.glossary || [], // We still send glossary if we found any!
          meta: { tm_score: 0 },
        };

        const aiRes = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!aiRes.ok) throw new Error(`n8n Error: ${aiRes.status}`);
        finalTranslation = (await extractTranslated(aiRes)).trim();
      }

      // ---------------------------------------------------------
      // STEP 3: FINALIZE & UPDATE UI
      // ---------------------------------------------------------
      if (finalTranslation && finalTranslation !== "— Awaiting translation —") {
        // A. Save to DB (Only if NOT reusing an exact match)
        // Note: For "Review Needed", we technically save the draft now,
        // but the user will approve/overwrite it in the Analysis page later.
        if (decision.action !== "reuse") {
          await saveTranslationToDb(
            selected.source,
            finalTranslation,
            sourceLang,
            targetLang,
            projectName,
          );
        }

        // B. Prepare Data for Analysis Page
        const formattedGlossary = {};
        if (Array.isArray(decision.glossary)) {
          decision.glossary.forEach((item) => {
            formattedGlossary[item.term] = item.translation;
          });
        }

        // C. Update UI
        setSegOverrides((prev) => ({
          ...prev,
          [selected.id]: {
            ...prev[selected.id],
            translated: finalTranslation,
            status: statusLabel,
            // Important: Store data for the Analysis Page
            reviewData: {
              tmScore: decision.score,
              glossaryUsed: formattedGlossary,
              maskedSource: selected.source,
            },
          },
        }));

        // D. Update Badge
        if (typeof setTmMatchInfo === "function") {
          setTmMatchInfo((prev) => ({
            ...prev,
            [selected.id]: matchBadgeValue,
          }));
        }
      }
    } catch (err) {
      console.error("Translation logic error:", err);
      setTranslationError(err.message || "Translation failed.");
      setSegOverrides((prev) => ({
        ...prev,
        [selected.id]: {
          ...prev[selected.id],
          translated: "— Failed —",
          status: "Pending",
        },
      }));
    } finally {
      setIsTranslating(false);
    }
  };

  /** Helper: translate one segment via n8n (single endpoint) */
  async function translateOneSegment(seg) {
    const targetLang = getTargetLang(therapyArea);

    const payload = {
      segmentId: seg.id,
      index: seg.index,
      projectName,
      source: seg.source,
      sourceLang: "EN",
      targetLang,
      inboundLang,
      meta: {
        therapyArea,
        words: seg.words,
        tmLeverage: tmLeverageOn,
        sourceLangFromPrev: inboundLang,
      },
    };

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`n8n responded with ${res.status}: ${txt}`);
    }

    const translated = (await extractTranslated(res)).trim();
    return translated;
  }

  /** Mark selected segment complete (overlay only) */
  const handleCompleteSegment = () => {
    if (!selected) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        status: "Completed",
      },
    }));
  };

  /** Bulk: send all pending segments in ONE request — and then auto-prep Draft tab */
  const handleTranslateAllClick = async () => {
    if (!N8N_BULK_WEBHOOK_URL) {
      setTranslationError("N8N_BULK_WEBHOOK_URL is not configured.");
      return;
    }

    const pending = segments.filter((s) => {
      const o = segOverrides[s.id];
      const mergedTranslated = (o?.translated ?? s.translated ?? "").trim();
      const mergedStatus = o?.status ?? s.status;
      return !(mergedTranslated.length > 0 || mergedStatus === "Completed");
    });

    if (pending.length === 0) {
      // Already translated → show draft tab (hide banner on draft)
      // const mergedSegmentsNow = mergeSegmentsWithOverrides(segments, segOverrides);
      // setDraftSegments(mergedSegmentsNow);
      // setTmLeveragePct(0);
      // setDraftPrepared(true);
      // setActiveTab("draft");
      // setShowGenerateDraft(false); 
      setShowGenerateDraft(allSegmentsCompleted && !isDraftUnlocked);
      return;
    }

    // Show placeholders for pending segments while bulk call runs
    setSegOverrides((prev) => {
      const next = { ...prev };
      for (const s of pending) {
        next[s.id] = {
          ...next[s.id],
          translated: "— Awaiting translation —",
          status: "Pending",
        };
      }
      return next;
    });

    setBulkProgress({ done: 0, total: pending.length, failed: 0 });
    setShowGenerateDraft(false);
    setIsBulkTranslating(true);
    setTranslationError(null);

    try {
      const targetLang = getTargetLang(therapyArea);

      const payload = {
        projectName,
        sourceLang: "EN",
        targetLang,
        inboundLang,
        tmLeverageOn,
        therapyArea,
        segments: pending.map((s) => ({
          segmentId: s.id,
          index: s.index,
          source: s.source,
          words: s.words,
        })),
      };

      const res = await fetch(N8N_BULK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(N8N_AUTH ? { Authorization: N8N_AUTH } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Bulk n8n responded with ${res.status}: ${txt}`);
      }

      // Parse translations from bulk response (handles your screenshot shape)
      const byKey = await extractBulkTranslations(res, pending);

      // Apply overrides from returned items
      let translatedCount = 0;
      const locallyMergedOverrides = { ...segOverrides };

      for (const s of pending) {
        const candidates = keyVariantsForSegment(s);
        const translatedRaw = candidates
          .map((k) => byKey[k])
          .find((v) => typeof v === "string" && v.trim().length > 0);

        const translated = (translatedRaw || "").trim();

        if (translated) {
          translatedCount += 1;
          locallyMergedOverrides[s.id] = {
            ...(locallyMergedOverrides[s.id] || {}),
            translated,
            status: "Completed",
          };
        } else {
          locallyMergedOverrides[s.id] = {
            ...(locallyMergedOverrides[s.id] || {}),
            status: "Pending",
          };
        }
      }

      setSegOverrides(locallyMergedOverrides);

      setBulkProgress({
        done: translatedCount,
        total: pending.length,
        failed: Math.max(pending.length - translatedCount, 0),
      });

      // Prepare and switch to 'draft' tab with merged segments (hide banner)
      // const mergedSegmentsFinal = mergeSegmentsWithOverrides(segments, locallyMergedOverrides);
      // setDraftSegments(mergedSegmentsFinal);
      // setTmLeveragePct(0);
      // setDraftPrepared(true);
      // setActiveTab("draft");
      // setShowGenerateDraft(false); 
      
// Do NOT auto-switch to Draft; just show the "Generate Draft Translation" banner
setShowGenerateDraft(true);

    } catch (err) {
      setTranslationError(err.message || "Bulk translation failed.");
      setBulkProgress((bp) => ({ ...bp, failed: bp.total - bp.done }));
    } finally {
      setIsBulkTranslating(false);
    }
  };

  /** Generate Draft Translation → switch to Draft tab on the same page (hide banner) */
  // const handleGenerateDraftTranslation = () => {
  //   const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides);
  //   setDraftSegments(mergedSegments);
  //   setTmLeveragePct(0);
  //   setDraftPrepared(true);
  //   setActiveTab("draft");
  //   setShowGenerateDraft(false); 
  // };

  /** Generate Draft Translation → switch to Draft tab and unlock it */
const handleGenerateDraftTranslation = () => {
  const mergedSegments = mergeSegmentsWithOverrides(segments, segOverrides);
  setDraftSegments(mergedSegments);
  setTmLeveragePct(0);
  setDraftPrepared(true);
  setIsDraftUnlocked(true);       // 🔓 unlock Draft tab
  setActiveTab("draft");          // go to Draft tab
  setShowGenerateDraft(false);    // hide the success banner
   
  // ✅ Persist "draft generated" so it survives navigation/refresh
  // try {
  //   updateProjectMeta(projectId, {
  //     segmentsP2: mergedSegments,           
  //     p2DraftGeneratedAt: new Date().toISOString(),
  //     p2DraftGenerated: true,
  //   });
  // } catch (e) {
  //   console.warn("Failed to persist draft generated flag", e);
  // }
   setP2DraftGenerated(projectId, true, { segmentsP2: mergedSegments });
  // Optional localStorage fallback (project-scoped key)
  localStorage.setItem(`p2_draft_generated_${projectId}`, "true");
};

  /** Send to CI (from Draft panel) */
  // const handleSendToCI = (normalizedDraftSegments) => {
  //   navigate("/culturalAdaptationWorkspace", {
  //     state: {
  //       projectName,
  //       segments: normalizedDraftSegments,
  //       lang: inboundLang,
  //       therapyArea,
  //     },
  //   });
  // };
  /** Send to CI (from Draft panel) */
  const handleSendToCI = (normalizedDraftSegments) => {
    
    // Persist P2 + "draft generated" flag before leaving
    // try {
    //   updateProjectMeta(projectId, {
    //     segmentsP2: normalizedDraftSegments,
    //     p2DraftGenerated: true,
    //     p2DraftGeneratedAt: new Date().toISOString(),
    //   });
    // } catch (e) {
    //   console.warn('Failed to persist segmentsP2 before sending to CI', e);
    // }
    setP2DraftGenerated(projectId, true, { segmentsP2: normalizedDraftSegments });
    localStorage.setItem(`p2_draft_generated_${projectId}`, "true");
    markPhaseComplete(projectId, 'P2');    
      navigate("/culturalAdaptationWorkspace", {
        state: {
          projectId,
          projectName,
          segments: normalizedDraftSegments,
          lang: inboundLang,
          therapyArea,
          fromDraft: true, // optional: for any additional UX control on CI
        },
      });
    };

  return (
    <div className={`tm-app ${isFocusMode ? 'is-focus' : ''}`} data-page="tm">
      {/* Sidebar */}
      <aside className="tm-sidebar">
        <div className="tm-sidebar-progress">
          <div className="tm-progress-row">
            <span className="tm-progress-label">Overall Progress</span>
            <span className="tm-progress-value">{progressPct}%</span>
          </div>
        <div className="tm-progress-sub">1 of 7 phases completed</div>
          <div className="tm-progress-bar">
            <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => (
            <button
              key={p.id}
              className={`tm-phase-item ${p.status} ${p.status === "active" ? "is-active" : ""}`}
              aria-label={`Open ${p.name}`}
              // onClick={() => handlePhaseClick(p.name)}
              onClick={() => gotoPhase(p.id)}
            >
              <span className={`tm-phase-icon ${p.iconClass}`} />
              <span className="tm-phase-text">
                <span className="tm-phase-title">{p.name}</span>
                <span className="tm-phase-sub">{p.sub}</span>
              </span>
              {p.status === "done" && <span className="tm-phase-check">✓</span>}
              {p.status === "active" && <span className="tm-phase-dot" />}
            </button>
          ))}
        </nav>
      </aside>

  {/* Main */}
      <div className="tm-main">
        {/* Header */}
        <header className="tm-header py-3 px-4">
      <div className="tm-crumbs">
          <button className="tm-crumb" onClick={() => navigate('/')}>
          <ArrowLeft size={14} className="h-1 w-1 mr-2" /> Main Hub
          </button>
          <span className="tm-divider"></span>
          <button className="tm-crumb" onClick={() => navigate('/glocalizationHub')}>
            Glocalization Hub
          </button>
        </div>
      {/* Center: Title */}
        <div className="tm-title-section">
          <h1 className="tm-page-title">{projectName}</h1>
          {/* <span className="tm-title-sub">{therapyArea}</span> */}
        </div>
            
      {/* Right: Saved + Buttons */}
        <div className="tm-header-right">
          <span className="tm-saved"> <CheckCircle2 size={12} className="h-1 w-1 text-green-600" />
          Saved</span>
          <button className="tm-btn-outline">
          <Save size={15} className="h-4 w-4 mr-2" /> Save
          </button>
          
<button
              className="tm-btn-outline"
              onClick={toggleFocusMode}
              aria-pressed={isFocusMode}
              title={isFocusMode ? 'Exit focus (Esc)' : 'Enter focus (F)'}
            >
              {isFocusMode ? (
                <>
                  <Minimize2 size={16} /> Exit
                </>
              ) : (
                <>
                  <Maximize2 size={16} /> Focus
                </>
              )}
            </button>

        </div>
      </header>

        {/* Top tabs bar */}
        <section className="tm-tabs-bar">
  <div className="tm-tabs">
    <button
      className={`tm-tab ${activeTab === 'workspace' ? 'is-active' : ''}`}
      onClick={() => setActiveTab('workspace')}
    >
      <FileText className="tm-tab-icon" />
      Translation Workspace
    </button>

    {/* <button
      className={`tm-tab ${activeTab === 'draft' ? 'is-active' : ''}`}
      onClick={() => setActiveTab('draft')}
    >
      <CheckCircle className="tm-tab-icon" />
      Draft Translation
    </button> */}

    <button
  className={`tm-tab ${activeTab === 'draft' ? 'is-active' : ''} ${!isDraftUnlocked ? 'is-disabled' : ''}`}
  onClick={() => isDraftUnlocked && setActiveTab('draft')}
  disabled={!isDraftUnlocked}
  title={isDraftUnlocked ? 'Open Draft Translation' : 'Generate Draft Translation to open'}
>
  <CheckCircle className="tm-tab-icon" />
  Draft Translation
</button>

    <button
      className={`tm-tab ${activeTab === 'tm' ? 'is-active' : ''}`}
      onClick={() => setActiveTab('tm')}
    >
      <TrendingUp className="tm-tab-icon" />
      TM Leverage Overview
    </button>
  </div>

          {/* <div className="tm-tabs-right">
            <div className="tm-progress-inline">
              <span className="tm-progress-inline-label">Progress:</span>
              <span className="tm-progress-inline-value">
                {progressWords.done} / {progressWords.total} words
              </span>
              <div className="tm-progress-inline-bar">
                <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="tm-tabs-actions">
              <button
                className={`tm-btn primary outline ${isBulkTranslating ? "is-loading" : ""}`}
                onClick={handleTranslateAllClick}
                disabled={isBulkTranslating}
              >
                {isBulkTranslating ? "Translating all…" : "Translate All"}
              </button>

              <button className="tm-btn primary" onClick={handleCompletePhase}>
                Complete Phase
              </button>
            </div>
          </div> */}
        </section>

        {/* Success banner (HIDDEN when on Draft tab) */}
        {showGenerateDraft && activeTab !== "draft" && (
          <div className="tm-success-banner">
            <div className="tm-success-left">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#D1FADF" stroke="#12B981" />
                <path d="M7.5 12.5l3 3 6-6" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="tm-success-text">
                <strong>All Segments Completed! 🎉</strong>
                <span className="tm-success-sub">
                  Ready to generate the complete draft translation for Cultural Intelligence review
                </span>
              </div>
            </div>

            <button className="tm-success-btn" onClick={handleGenerateDraftTranslation}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3 7h7l-5.5 4 2.1 7L12 16l-6.6 4 2.1-7L2 9h7z" fill="currentColor" />
              </svg>
              <span>Generate Draft Translation</span>
            </button>
          </div>
        )}

        {/* Workspace tab */}
        {activeTab === "workspace" && (
              <div>
              <section className="tm-page-heading">
    <div>
      <h2 className="tm-section-title">Smart TM Translation Hub</h2>
      <p className="tm-section-sub">AI-powered translation with Translation Memory leverage</p>
    </div>
  
    <div className="tm-heading-right">
      {/* Reuse the same inline progress and actions, or keep empty if you prefer only the tabs bar showing them. */}
      <div className="tm-progress-inline">
        <span className="tm-progress-inline-label">Progress:</span>
        <span className="tm-progress-inline-value">
          {progressWords.done} / {progressWords.total} words
        </span>
        <div className="tm-progress-inline-bar">
          <div
            className="tm-progress-inline-fill"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>
  
      <div className="tm-actions">
        {/* <button className="tm-btn-outline"> <Languages size={14} className="h-4 w-4 mr-2" /> Translate All</button> */}
        <button
                  className={`tm-btn outline ${isBulkTranslating ? "is-loading" : ""}`}
                  onClick={handleTranslateAllClick}
                  disabled={isBulkTranslating}
                >
                  <Languages size={14} className="h-4 w-4 mr-2" />
                  {isBulkTranslating ? "Translating all…" : "Translate All"}
                </button>
        <button className="tm-btn-primary" onClick={handleCompletePhase}><CheckCircle2 size={14} className="h-4 w-4 mr-2" />Complete Phase</button>
      </div>
    </div>
  </section>
  <section className="tm-workspace">
          {/* Left card: Segments list (unchanged) */}
          <div className="tm-card tm-left">
            <div className="tm-card-header">
              <h3 className="tm-card-title">Segments</h3>
              <span className="tm-light">{segments.length} items</span>
            </div>

            <div className="tm-seg-list">
              {segments.map((seg) => {
                const isSelected = seg.id === selectedId;
                
// ✅ Use overrides if present
    const o = segOverrides[seg.id];
    const mergedStatus = o?.status ?? seg.status;

                // const statusClass =
                //   seg.status === "Pending"
                //     ? "pending"
                //     : seg.status === "Completed"
                //     ? "completed"
                //     : "neutral";
                
                const statusClass =
                mergedStatus === "Pending"
                  ? "pending"
                  : mergedStatus === "Completed"
                  ? "completed"
                  : "neutral";
            //     return (
            //       <button
            //         key={seg.id}
            //         className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
            //         onClick={() => setSelectedId(seg.id)}
            //         aria-label={`Open Segment ${seg.index}`}
            //       >
            //         <div className="tm-seg-item-top">
            //           <span className={`tm-seg-pill ${statusClass}`}>Segment {seg.index}</span>
            //           <span className="tm-seg-state">{seg.status}</span>
            //         </div>
            //         <div className="tm-seg-snippet">{seg.source}</div>
            //         <div className="tm-seg-meta-row">
            //           <span className="tm-seg-meta">{seg.words} words</span>
            //         </div>
            //       </button>
            //     );
            //   })}
            //   {segments.length === 0 && (
            //     <div className="tm-empty">No segment present to display.</div>
            //   )}
            // </div>
            
return (
  <button
    key={seg.id}
    className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
    onClick={() => setSelectedId(seg.id)}
    aria-label={`Open Segment ${seg.index}`}
  >
    <div className="tm-seg-item-top">
      <span className={`tm-seg-pill ${statusClass}`}>Segment {seg.index}</span>
      <span className="tm-seg-state">{mergedStatus}</span>
    </div>
    <div className="tm-seg-snippet">{seg.source}</div>
    <div className="tm-seg-meta-row">
      <span className="tm-seg-meta">{seg.words} words</span>
    </div>
  </button>
);
})}
{segments.length === 0 && (
<div className="tm-empty">No segment present to display.</div>
)}
</div>

          </div>
         {/* ===== Right column: TWO SEPARATE CARDS ===== */}
         <div className="tm-right-column">
            {/* 1) ACTION CARD — always first */}
            <div className="tm-card tm-action-card">
            <div className="tm-card-header">
      <h3 className="tm-card-title">
        {selectedResolved?.index ? `Section ${selectedResolved.index}` : "Section"}
      </h3>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {/* Optional TM badge here if you want it in the header too */}
        {/* <span className="tm-chip">TM: {selectedResolved?.status === "Completed" ? "100%" : "0%"}</span> */}
        <span className="tm-chip soft">
          {selectedResolved?.type || "body"}
        </span>
      </div>
    </div>
    {selectedResolved?.status !== "Completed" && 
              <div className="tm-card-header1">
              <div className="tm-action-title">
                  <h3 className="tm-card-title1">TM Leverage</h3>
                  <div className="tm-card-subset">
                    <span className="tm-light">
                      {tmLeverageOn
                        ? "AI will use Translation Memory for consistency and cost savings"
                        : "Pure AI translation without TM matching"}
                    </span>
                  </div>
                </div>
                <label className="tm-switch" aria-label="Toggle TM Leverage">
                  <input
                    type="checkbox"
                    checked={tmLeverageOn}
                    onChange={(e) => setTmLeverageOn(e.target.checked)}
                  />
                  <span className="tm-slider" />
                </label>
              </div>
}

              {/* <div className="tm-action-buttons">
                <button
                  className={`tm-btn primary small ${isTranslating ? "is-loading" : ""}`}
                  onClick={handleAiTranslate}
                  disabled={!selected || isTranslating}
                >
                  {isTranslating ? "Translating…" : "AI Translate"}
                </button>

                <button
                  className="tm-btn outline small"
                  onClick={handleCompleteSegment}
                  disabled={!selected}
                >
                  Complete
                </button>
              </div> */}

<div className="tm-detail-actions">
  {/* Completed segment - show Edit button only when NOT editing */}
  
{selectedResolved?.status === "Completed" && !isEditingTranslation && (
    <button
      className="tm-btn outline small"
      onClick={() => setIsEditingTranslation(true)}
      title="Edit Translation"
    >
      <Edit3 size={15} className="h-4 w-4 mr-2" />
      Edit Translation
    </button>
  )}

  {selectedResolved?.status === "Completed" && isEditingTranslation && (
    <button
      className="tm-btn primary small"
      onClick={() => {
        // Persist as needed, then re-lock
        setIsEditingTranslation(false);
      }}
      title="Save Changes"
    >
      <CheckCircle size={16} className="h-4 w-4 mr-2" />
      Save Changes
    </button>
  )}

  {/* Pending / In-progress segment - show AI Translate + Complete */}
  
{/* Pending / In-progress segment - show AI Translate + Complete */}
{selectedResolved?.status !== "Completed" && (
  <>
    <button
      className={`tm-btn outline small ${isTranslating ? "is-loading" : ""} flex items-center gap-2`}
      onClick={handleAiTranslate}
      disabled={!selectedResolved || isTranslating}
    >
      {isTranslating
        ? <Loader2 size={14} className="h-4 w-4 animate-spin" />
        : <Sparkles size={14} className="h-4 w-4" />}
      {isTranslating ? "Translating…" : "AI Translate"}
    </button>

    {/* <button
      className="tm-btn primary small flex items-center gap-2"
      onClick={handleCompleteSegment}
      disabled={!hasRealTranslation(selectedResolved)}
      title="Mark segment as complete"
    >
      <CheckCircle size={15} className="h-4 w-4" />
      Complete
    </button> */}
  </>
)}
</div>

              {/* Inline feedback */}
              {translationError && (
                <div className="tm-inline-error" role="alert">{translationError}</div>
              )}
              {/* {!isDetailEnabled && selected && (
                <div className="tm-inline-hint">
                  After translation, the detail card with Source/Translated will enable below.
                </div>
              )} */}
            </div>

            {/* 2) DETAIL CARD — below; disabled until translation exists */}
            <div
              className={`tm-card tm-detail-card ${isDetailEnabled ? "" : "is-disabled"}`}
              aria-disabled={!isDetailEnabled}
            >
              {/* {!isDetailEnabled && (
                <div className="tm-detail-overlay">
                  <div className="tm-overlay-content">
                    <div className="tm-overlay-title">Waiting for translation…</div>
                    <div className="tm-overlay-sub">
                      Click <strong>AI Translate</strong> above to fetch translation from n8n.
                    </div>
                  </div>
                </div>
              )} */}

              {/* <div className="tm-card-header">
                <h3 className="tm-card-title">Section 1</h3>
                <div className="tm-card-subset">
                  <span className="tm-light">body</span>
                </div>
              </div> */}

              {/* {!selected && (
                <div className="tm-empty large">
                  Select a segment from the left to view Source &amp; Translated text.
                </div>
              )} */}

              {selected && (
                <div className="tm-detail">
                  {/* <div className="tm-detail-row">
                    <div className="tm-detail-row-left">
                      <span className="tm-chip soft">Source Text</span>
                    </div>
                    <div className="tm-detail-row-right">
                      <span className="tm-lang-chip">{selectedResolved?.lang || inboundLang || "EN"}</span>
                    </div>
                  </div>
                  <div className="tm-box source">{selectedResolved?.source || ""}</div> */}

<div className="tm-source-card">
  <div className="tm-source-card-header">
    <span className="tm-chip soft tm-chip-source">
    <FileText size={15} className="h-4 w-4" />
      Source Text
    </span>
    <span className="tm-lang-chip">
      {/* {selectedResolved?.lang || inboundLang || "EN"} */}
      EN
    </span>
  </div>

  <div className="tm-source-card-body">
    {selectedResolved?.source || ""}
  </div>
</div>

                  
                  {/* <div className="tm-chip success">Translated Text</div>
                  <div className="tm-box translated">
                    {isDetailEnabled
                      ? (selectedResolved?.translated || "")
                      : <span className="tm-light">— Awaiting translation —</span>}
                  </div>
                  <div className="tm-detail-tools">
                    <span className="tm-light">
                      {selectedResolved?.status === "Completed" ? "TM 100%" : "TM 0%"}
                    </span>
                    <div className="tm-detail-spacer" />
                    <button className="tm-btn link small" disabled={!isDetailEnabled}>
                      Locked
                    </button>
                    <button className="tm-btn link small" disabled={!isDetailEnabled}>
                      View TM Analysis
                    </button>
                  </div> */}
                  
{/* Translated Text card (pretty version) */}
<div className="tm-translated-card">
  {/* Header row */}
  <div className="tm-translated-card-header">
    <span className="tm-chip success tm-chip-translated">
    <Languages size={15} className="h-4 w-4" />
      Translated Text
    </span>


    <span className="tm-lang-chip1">
    {inboundLang}
  </span>
  {/* <span className="tm-light">
    TM {tmMatchInfo[selectedResolved?.id] || 0}%
  </span> */}
   
<div className="tm-translated-tools" >
    {/* Completed + not editing → Locked pill */}
    {selectedResolved?.status === "Completed" && !isEditingTranslation && (
      <span className="tm-locked-pill" title="Locked">
        <Lock size={13} className="h-3 w-3 mr-1" />
        Locked
      </span>
    )}

    {/* Completed + editing → Unlock + Editing pill */}
    {selectedResolved?.status === "Completed" && isEditingTranslation && (
      <span className="tm-editing-pill" title="Editing">
        <Unlock size={13} className="h-3 w-3 mr-1" />
        Editing
      </span>
    )}

    {/* Completed only → View TM Analysis */}
    {selectedResolved?.status === "Completed" && (
      <button
        className="tm-btn link small"
        disabled={!isDetailEnabled}
        onClick={() => {
          const reviewData = selectedResolved?.reviewData || segOverrides[selectedResolved?.id]?.reviewData;
    
          navigate("/tm-analysis", {
            state: {
              segment: selectedResolved,
              reviewData: reviewData,
              projectName: projectName,
              targetLang: inboundLang || "EN",
              sourceLang: "English",
              allSegments: segments
            }
          });
        }}
      >
         <BarChart3 size={15} className="h-4 w-4 mr-2" />
        {/* View TM Analysis */}
        View TM Analysis {selectedResolved?.status === "Review Needed" ? "(Action Required)" : ""}
      </button>
    )}
  </div>

  </div>

  {/* Body panel (rounded green-tinted area) */}
  {/* <div className="tm-translated-card-body">
    {isDetailEnabled
      ? (selectedResolved?.translated || "")
      : <span className="tm-light">— Awaiting translation —</span>}
  </div> */}
  
<div className="tm-translated-card-body">
  {!isDetailEnabled ? (
    <span className="tm-light">Enter translation or use TM/AI suggestions...</span>
  ) : isEditingTranslation ? (
    <textarea
      value={selectedResolved?.translated || ""}
      onChange={(e) => {
        const newText = e.target.value;
        setSegOverrides(prev => ({
          ...prev,
          [selectedResolved.id]: {
            ...prev[selectedResolved.id],
            translated: newText
          }
        }));
      }}
      placeholder="Edit translated text..."
      className="tm-translated-textarea"
    />
  ) : (
    <div className="tm-translated-readonly">
      {selectedResolved?.translated || ""}
    </div>
  )}
</div>

</div>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
         )}
        {/* Integrated Draft tab content (same page) */}
        {activeTab === "draft" && (
          <DraftPanel
            projectName={projectName}
            therapyArea={therapyArea}
            inboundLang={inboundLang}
            segments={draftPrepared ? draftSegments : mergeSegmentsWithOverrides(segments, segOverrides)}
            tmLeveragePct={tmLeveragePct}
            onBackToWorkspace={() => setActiveTab("workspace")} // no mini top bar shown
            onSendToCI={handleSendToCI}
          />
        )}
        
        {/* === NEW TM LEVERAGE TAB INTEGRATION === */}
        {activeTab === "tm" && (
          <TMLeverageOverview 
            segments={mergeSegmentsWithOverrides(segments, segOverrides)} 
          />
        )}
        
      </div>

      {/* Bulk progress modal */}
      <BulkProgressModal
        open={isBulkTranslating}
        progress={bulkProgress}
        subtitle="Translating all pending segments with Smart TM..."
      />
    </div>
  );
}