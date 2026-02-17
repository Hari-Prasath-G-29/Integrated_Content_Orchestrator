
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { getProject, updateProjectMeta, markPhaseComplete } from '../lib/progressStore';
import { usePhaseNavigation } from "./PhaseNav.jsx";
import "./css/Regulatory.css";
import {  ArrowLeft,
  Save, ArrowRight, Flag, Upload, FileText, CheckCircle2, Maximize2, BarChart3, FileDown, Brain,Shield,
  Minimize2, Users, Stethoscope, Edit3, Plus, X, Pill, Unlock, CheckCircle, TrendingUp, Languages, Loader2, Sparkles, Lock } from 'lucide-react';
/**
 * Regulatory Compliance Hub (Destination page)
 * - 3 Tabs: Compliance Review | Compliance Report | Regulatory Intelligence
 * - Two cards: Left segments, Right detail (Source | Adapted | Compliant)
 */
export default function RegulatoryComplianceHub({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressItems: progressItemsProp = { approved: 0, total: 15 },
  segments: segmentsProp = [],
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  const projectId = state?.projectId;
   const projectName = state?.projectName ?? projectNameProp;
   const gotoPhase = usePhaseNavigation(projectId, projectName);
  
  /** Tabs */
  // const [activeTab, setActiveTab] = useState("review"); 

  
const projectRec = useMemo(() => getProject(projectId), [projectId]);

const persistedSegmentsP4 = useMemo(
    () =>
      (projectRec?.meta?.segmentsP4 && Array.isArray(projectRec.meta.segmentsP4))
        ? projectRec.meta.segmentsP4
        : [],
    [projectRec]
  );
  
 const persistedSegmentsP3 = useMemo(
   () => (projectRec?.meta?.segmentsP3 && Array.isArray(projectRec.meta.segmentsP3))
         ? projectRec.meta.segmentsP3 : [],
   [projectRec]
 );
 const persistedSegmentsP2 = useMemo(
   () => (projectRec?.meta?.segmentsP2 && Array.isArray(projectRec.meta.segmentsP2))
         ? projectRec.meta.segmentsP2 : [],
   [projectRec]
 );



 // --- Focus mode state (unique key for Cultural page) ---
const [isFocusMode, setIsFocusMode] = useState(() => {
  const v = localStorage.getItem('ci_focus_mode');
  return v === 'true';
});

const toggleFocusMode = () => setIsFocusMode(prev => !prev);

// persist on change
useEffect(() => {
  localStorage.setItem('ci_focus_mode', String(isFocusMode));
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

// ===== n8n Endpoint (configure via env) =====
const N8N_COMPLIANCE_URL =
(typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_N8N_COMPLIANCE_URL) ||
process.env.REACT_APP_N8N_COMPLIANCE_URL ||
"http://172.16.4.237:8015/webhook-test/regulatory";

/* ================= LANGUAGE HELPERS ================= */
const getTargetLang = (therapyAreaStr) => {
  const m = String(therapyAreaStr || "").match(/·\s*([A-Za-z-]+)/);
  return m?.[1] || "DE";
};

  /** Normalize incoming segments from router state */
  const segments = useMemo(() => {
    const raw = Array.isArray(state?.segments)
      // ? state.segments
      // : Array.isArray(segmentsProp)
      // ? segmentsProp
      // : [];

      
const rawCandidate =
   (Array.isArray(state?.segments) && state.segments.length > 0)
     ? state.segments
     : (Array.isArray(persistedSegmentsP4) && persistedSegmentsP4.length > 0)
     ? persistedSegmentsP4
     : (Array.isArray(persistedSegmentsP3) && persistedSegmentsP3.length > 0)
     ? persistedSegmentsP3
     : (Array.isArray(persistedSegmentsP2) && persistedSegmentsP2.length > 0)
     ? persistedSegmentsP2
     : (Array.isArray(segmentsProp) && segmentsProp.length > 0)
     ? segmentsProp
     : [];

      
    return (rawCandidate || [])
      .map((seg, i) => {
        const index = typeof seg.index === "number" ? seg.index : i + 1;
        const source = String(seg.source ?? "");
        const adapted = String(seg.adapted ?? seg.culturallyAdapted ?? seg.translated ?? ""); // phase 3 result if present
        const compliant = String(seg.compliant ?? ""); // phase 4 will fill this
        const words =
          typeof seg.words === "number"
            ? seg.words
            : source.split(/\s+/).filter(Boolean).length;

        return {
          id: seg.id ?? `seg-${index}`,
          index,
          source,
          adapted,   // shown under "Culturally Adapted Text (Phase 3)"
          compliant, // shown under "Regulatory Compliant Text"
          words,
          status: seg.status ?? (adapted.trim() ? "Pending" : "Pending"),
          lang: seg.lang ?? "EN",
          complianceScore: typeof seg.complianceScore === "number" ? seg.complianceScore : null,
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  // }, [state?.segments, segmentsProp]);
}, [state?.segments, segmentsProp, persistedSegmentsP3, persistedSegmentsP2]);

  /** Selected segment */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);
  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /** Local UI state for score & compliant text (per selection) */
  const [scoreById, setScoreById] = useState({});
  const [compliantById, setCompliantById] = useState({});


  // useEffect(() => {
  //   const initialScores = {};
  //   const initialCompliant = {};
  //   segments.forEach((s) => {
  //     if (typeof s.complianceScore === "number") initialScores[s.id] = s.complianceScore;
  //     if (s.compliant?.trim()) initialCompliant[s.id] = s.compliant;
  //   });
  //   setScoreById((prev) => ({ ...initialScores, ...prev }));
  //   setCompliantById((prev) => ({ ...initialCompliant, ...prev }));
  // }, [segments.length]);

  useEffect(() => {
    // hydrate from incoming segment score/compliant if provided
    const initialScores = {};
    const initialCompliant = {};
   const initialOverrides = {};

    segments.forEach((s) => {
      if (typeof s.complianceScore === "number") initialScores[s.id] = s.complianceScore;
      if (s.compliant?.trim()) initialCompliant[s.id] = s.compliant;
 
     if (
       s.status || s.compliantText || s.mlr || s.mlrDefer || s.acceptedRisk || s.blocked
     ) {
      initialOverrides[s.id] = {
        ...(s.status ? { status: s.status } : {}),
        ...(s.compliantText ? { compliantText: s.compliantText } : {}),
         ...(s.mlr ? { mlr: s.mlr } : {}),
         ...(s.mlrDefer ? { mlrDefer: s.mlrDefer } : {}),
        ...(s.acceptedRisk ? { acceptedRisk: s.acceptedRisk } : {}),
         ...(s.blocked ? { blocked: s.blocked } : {}),
       };
     }
    });
    setScoreById((prev) => ({ ...initialScores, ...prev }));
    setCompliantById((prev) => ({ ...initialCompliant, ...prev }));
   setSegOverrides((prev) => ({ ...initialOverrides, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);
 
  /** Progress (approved count) */
  const progressItems = useMemo(() => {
    const total = segments.length || progressItemsProp.total || 0;
    const approved = segments.filter((s) => (compliantById[s.id] || s.compliant || "").trim().length > 0).length;
    return total > 0 ? { approved, total } : progressItemsProp;
  }, [segments, compliantById, progressItemsProp]);

  /* ================= PER-SEGMENT OVERRIDES ================= */
  const [segOverrides, setSegOverrides] = useState({});
  const selectedResolved = useMemo(() => {
    if (!selected) return null;
    return { ...selected, ...(segOverrides[selected.id] || {}) };
  }, [selected, segOverrides]);

  const currentSegOverride = segOverrides[selectedResolved?.id] || {};

  

// const approvedCount = useMemo(() => {
//   return segments.filter((s) => {
//     const text = (compliantById[s.id] ?? s.compliant ?? "").trim();
//     return text.length > 0;
//   }).length;
// }, [segments, compliantById]);

const buildP4Segments = () =>
  segments.map((s) => {
    const o = segOverrides[s.id] || {};
    return {
      ...s,
      complianceScore: scoreById[s.id] ?? s.complianceScore ?? null,
      compliant: compliantById[s.id] ?? s.compliant ?? "",
      status: o.status ?? s.status ?? "Pending",
      ...(o.compliantText ? { compliantText: o.compliantText } : {}),
      ...(o.mlr ? { mlr: o.mlr } : {}),
      ...(o.mlrDefer ? { mlrDefer: o.mlrDefer } : {}),
      ...(o.acceptedRisk ? { acceptedRisk: o.acceptedRisk } : {}),
      ...(o.blocked ? { blocked: o.blocked } : {}),
    };
  });

  useEffect(() => {
      if (!projectId) return;
      try {
      updateProjectMeta(projectId, { segmentsP4: buildP4Segments() });
      } catch {}
    }, [projectId, segOverrides, scoreById, compliantById, segments]);

/* ================= PROGRESS ================= */
const approvedCount = useMemo(() => {
  return segments.filter((s) => {
    const o = segOverrides[s.id] || {};
    const status = String(o.status ?? s.status ?? "Pending").toLowerCase();
    return status === "approved";
  }).length;
}, [segments, segOverrides]);

const flaggedCount = useMemo(() => {
  return segments.filter((s) => {
    const o = segOverrides[s.id] || {};
    const status = String(o.status ?? s.status ?? "Pending").toLowerCase();
    return status === "flagged";
  }).length;
}, [segments, segOverrides]);

const changedCount = useMemo(() => {
  return segments.filter((s) => {
    const o = segOverrides[s.id] || {};
    return Boolean((o.compliantText || "").trim());
  }).length;
}, [segments, segOverrides]);

const totalCount = segments.length;
const progressPct = Math.round((approvedCount / Math.max(totalCount, 1)) * 100);

  // const progressPct = useMemo(() => {
  //   const pct = (progressItems.approved / Math.max(progressItems.total, 1)) * 100;
  //   return Math.round(pct);
  // }, [progressItems]);

  /** Sidebar: retain context when moving across phases */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", { state: { projectName, segments } });
    }
    if (phaseName === "Smart TM Translation") {
      navigate("/smartTMTranslationHub", { state: { projectName, segments } });
    }
    if (phaseName === "Cultural Intelligence") {
      navigate("/culturalAdaptationWorkspace", { state: { projectName, segments } });
    }
  };

   /* ================= MAIN TABS (Top) ================= */
   const [mainTab, setMainTab] = useState("review"); // review | report | intel

  /* ================= ANALYSIS MODAL (n8n renders-only under Critical Issues & Recommendations) ================= */
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("issues"); // issues | pre | templates
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysisData, setAnalysisData] = useState({
    score: 70,
    risk: "MEDIUM",
    criticalIssues: [], // keep empty (we only show n8n)
    recommendations: [], // keep empty (we only show n8n)
  });

  // n8n results rendered under Critical Issues & Recommendations
  const [n8nCritical, setN8nCritical] = useState([]); // [{id, text}] from critical_issue
  const [n8nRecs, setN8nRecs] = useState([]); // [{id, text}] from recommendation1 & recommendation2
  const [n8nLoading, setN8nLoading] = useState(false);
  const [n8nError, setN8nError] = useState("");

  // Utility: normalize an array of strings into [{id, text}]
  const normalizeStringArray = (arr = [], prefix = "item") =>
    Array.isArray(arr)
      ? arr.map((t, i) => ({ id: `${prefix}-${i + 1}`, text: String(t) }))
      : [];

  // Minimal HTML entity decoding for webhook payloads
  const decodeHtmlEntities = (s = "") =>
    s
      .replace(/&amp;amp;/g, "&")
      .replace(/&amp;lt;/g, "<")
      .replace(/&amp;gt;/g, ">")
      .replace(/&amp;quot;/g, '"')
      .replace(/&amp;#39;/g, "'");

  // Split enumerated text like: "1. Item one. 2. Item two. 3. Item three."
  const splitEnumeratedText = (text) => {
    const t = decodeHtmlEntities(String(text || "")).trim();
    if (!t) return [];

    // Insert a delimiter before each "N. " sequence (start or after whitespace/punct)
    const withDelims = t.replace(/(^|[\s;])(\d+)\.\s+/g, "||SEP||");
    const parts = withDelims
      .split("||SEP||")
      .map((p) => p.trim().replace(/^[.;-]+\s*/, ""))
      .filter(Boolean);

    if (parts.length <= 1) {
      const fallback = t
        .split(/\n+|•\s+/g)
        .map((p) => p.trim())
        .filter(Boolean);
      return fallback.length > 1 ? fallback : parts;
    }

    return parts;
  };

  // ===== Parser for the provided n8n output shape =====
  // Expected: [ { output: { critical_issue: string, recommendation1: string, recommendation2: string } } ]
  const parseN8nShape_CritAndRecs = (payload) => {
    try {
      if (!Array.isArray(payload)) return { crit: [], recs: [] };

      const first = payload[0];
      const out = first?.output ?? first?.Output ?? null;

      if (out && typeof out === "object") {
        const critical_issue = decodeHtmlEntities(String(out.critical_issue || "").trim());
        const recommendation1 = decodeHtmlEntities(String(out.recommendation1 || "").trim());
        const recommendation2 = decodeHtmlEntities(String(out.recommendation2 || "").trim());

        const crit = critical_issue
          ? [{ id: "n8n-crit-1", text: critical_issue }]
          : [];

        const recs = []
          .concat(recommendation1 ? [{ id: "n8n-rec-1", text: recommendation1 }] : [])
          .concat(recommendation2 ? [{ id: "n8n-rec-2", text: recommendation2 }] : []);

        return { crit, recs };
      }

      // Fallback: if shape is different, try to split strings
      if (typeof first?.output === "string") {
        const parts = splitEnumeratedText(first.output);
        // Put first as critical, next two as recommendations
        const crit = parts[0] ? [{ id: "n8n-crit-1", text: parts[0] }] : [];
        const recs = []
          .concat(parts[1] ? [{ id: "n8n-rec-1", text: parts[1] }] : [])
          .concat(parts[2] ? [{ id: "n8n-rec-2", text: parts[2] }] : []);
        return { crit, recs };
      }

      return { crit: [], recs: [] };
    } catch {
      return { crit: [], recs: [] };
    }
  };

  // (Legacy parser retained for safety if workflows change to earlier string shapes)
  const extractN8nCriticalFromCustomShape = (payload) => {
    try {
      if (Array.isArray(payload) && typeof payload[0]?.output === "string") {
        const out = payload[0].output;

        // Try JSON-in-a-string first (in case)
        try {
          const parsed = JSON.parse(out);
          if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
            return normalizeStringArray(parsed, "n8n-crit");
          }
          if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.US_Pharma_Regulatory_Rules)
          ) {
            return normalizeStringArray(parsed.US_Pharma_Regulatory_Rules, "n8n-crit");
          }
        } catch {
          // Not JSON; fall through to enumerated split
        }

        const items = splitEnumeratedText(out);
        return normalizeStringArray(items, "n8n-crit");
      }

      // Fallbacks
      if (payload && typeof payload === "object") {
        const maybeArr =
          payload.criticalIssues ||
          payload.issues ||
          (Array.isArray(payload) ? payload : []);
        if (Array.isArray(maybeArr) && maybeArr.every((x) => typeof x === "string")) {
          return normalizeStringArray(maybeArr, "n8n-crit");
        }
      }

      if (Array.isArray(payload) && payload.every((x) => typeof x === "string")) {
        return normalizeStringArray(payload, "n8n-crit");
      }

      return [];
    } catch {
      return [];
    }
  };

  const openAnalysisModal = async () => {
    if (!selectedResolved?.adapted?.trim()) return;

    // Ensure local lists are EMPTY (we only show n8n content)
    setAnalysisData({
      score: 70,
      risk: "MEDIUM",
      criticalIssues: [],
      recommendations: [],
    });

    // Open modal immediately
    setActiveTab("issues");
    setIsAnalysisModalOpen(true);

    // Begin async n8n call – results will render under Critical Issues and Recommended Changes
    setN8nCritical([]);
    setN8nRecs([]);
    setN8nError("");
    setN8nLoading(true);
    setIsAnalyzing(true);

    const payload = {
      projectName,
      therapyArea,
      segmentId: selectedResolved.id,
      index: selectedResolved.index,
      adaptedText: selectedResolved.adapted,
    };

    try {
      const res = await fetch(N8N_COMPLIANCE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `n8n responded with ${res.status}${txt ? ` - ${txt.slice(0, 180)}` : ""}`
        );
      }

      const raw = await res.json().catch(() => null);

      // Prefer the specific shape (critical_issue, recommendation1, recommendation2)
      const { crit, recs } = parseN8nShape_CritAndRecs(raw);

      if (crit.length === 0) {
        // Fallback to legacy extraction if no crit found
        const legacyCrit = extractN8nCriticalFromCustomShape(raw);
        if (legacyCrit.length > 0) {
          setN8nCritical(legacyCrit);
        } else {
          setN8nError("No critical issue returned by AI for this segment.");
        }
      } else {
        setN8nCritical(crit);
      }

      // Set recommendations from n8n (and ONLY those)
      setN8nRecs(recs || []);
    } catch (err) {
      setN8nError(err?.message || "Failed to analyze with AI.");
    } finally {
      setN8nLoading(false);
      setIsAnalyzing(false);
    }
  };

  const [isReAnalyzeDisabled] = useState(false);

  const compliantEditorValue = selectedResolved?.compliantText ?? "";
  const setCompliantEditorValue = (val) => {
    if (!selectedResolved) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        compliantText: val,
      },
    }));
  };

  const handleApprove = () => {
    if (!selectedResolved) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Approved",
      },
    }));
  };

  const handleFlag = () => {
    if (!selectedResolved) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Flagged",
      },
    }));
  };

   /* ============ Analysis actions ============ */
   const applyCompliantSuggestion = () => {
    const suggestion =
      "Suggested compliant edit: Replace broad ‘efficacy’ references with approved SmPC-aligned wording and include the necessary disclaimers per HWG.";
    setCompliantEditorValue(
      suggestion +
        (selectedResolved?.compliantText ? "\n\n" + selectedResolved.compliantText : "")
    );
  };

  const acceptRecommendation = (recText) => {
    const appended =
      (selectedResolved?.compliantText || "").trim().length > 0
        ? selectedResolved.compliantText + "\n\n" + "• " + recText
        : "• " + recText;
    setCompliantEditorValue(appended);
  };

  const reAnalyzeInModal = async () => {
    setIsReAnalyzing(true);
    setTimeout(() => setIsReAnalyzing(false), 800);
  };

  const markCompliantFromModal = () => {
    handleApprove();
    setIsAnalysisModalOpen(false);
  };

  /* ================= Request MLR Exception ================= */
  const [isMlrOpen, setIsMlrOpen] = useState(false);
  const [mlrRuleText, setMlrRuleText] = useState("");
  const [mlrReason, setMlrReason] = useState("");
  const [mlrTouched, setMlrTouched] = useState(false);
  const [mlrSubmitting, setMlrSubmitting] = useState(false);

  const openMlrModal = (ruleText) => {
    setMlrRuleText(ruleText || "");
    setMlrReason("");
    setMlrTouched(false);
    setIsMlrOpen(true);
  };

  const submitMlr = async () => {
    setMlrTouched(true);
    if (!mlrReason.trim()) return;
    setMlrSubmitting(true);

    const payload = {
      rule: mlrRuleText,
      reasoning: mlrReason.trim(),
      at: new Date().toISOString(),
    };

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Flagged",
        mlr: payload,
      },
    }));

    setTimeout(() => {
      setMlrSubmitting(false);
      setIsMlrOpen(false);
    }, 300);
  };

  /* ================= Defer to MLR Review ================= */
  const [isDeferOpen, setIsDeferOpen] = useState(false);
  const [deferRuleText, setDeferRuleText] = useState("");
  const [deferReason, setDeferReason] = useState("");
  const [deferTouched, setDeferTouched] = useState(false);
  const [deferSubmitting, setDeferSubmitting] = useState(false);

  const openDeferModal = (ruleText) => {
    setDeferRuleText(ruleText || "");
    setDeferReason("");
    setDeferTouched(false);
    setIsDeferOpen(true);
  };

  const submitDefer = async () => {
    setDeferTouched(true);
    if (!deferReason.trim()) return;
    setDeferSubmitting(true);

    const payload = {
      rule: deferRuleText,
      reasoning: deferReason.trim(),
      at: new Date().toISOString(),
    };

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Flagged",
        mlrDefer: payload,
      },
    }));

    setTimeout(() => {
      setDeferSubmitting(false);
      setIsDeferOpen(false);
    }, 300);
  };

  /* ================= Accept Risk & Skip ================= */
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [riskRuleText, setRiskRuleText] = useState("");
  const [riskReason, setRiskReason] = useState("");
  const [riskTouched, setRiskTouched] = useState(false);
  const [riskSubmitting, setRiskSubmitting] = useState(false);

  const openRiskModal = (ruleText) => {
    setRiskRuleText(ruleText || "");
    setRiskReason("");
    setRiskTouched(false);
    setIsRiskOpen(true);
  };

  const submitRisk = async () => {
    setRiskTouched(true);
    if (!riskReason.trim()) return;
    setRiskSubmitting(true);

    const payload = {
      rule: riskRuleText,
      reasoning: riskReason.trim(),
      at: new Date().toISOString(),
    };

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        acceptedRisk: payload,
      },
    }));

    setTimeout(() => {
      setRiskSubmitting(false);
      setIsRiskOpen(false);
    }, 300);
  };

  /* ================= Mark as Blocking ================= */
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockRuleText, setBlockRuleText] = useState("");
  const [blockReason, setBlockReason] = useState(
    "Marked as blocking - must be resolved before approval"
  );
  const [blockTouched, setBlockTouched] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const openBlockModal = (ruleText) => {
    setBlockRuleText(ruleText || "");
    setBlockReason("Marked as blocking - must be resolved before approval");
    setBlockTouched(false);
    setIsBlockOpen(true);
  };

  const submitBlock = async () => {
    setBlockTouched(true);
    if (!blockReason.trim()) return;
    setBlockSubmitting(true);

    const payload = {
      rule: blockRuleText,
      reasoning: blockReason.trim(),
      at: new Date().toISOString(),
    };

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Flagged",
        blocked: payload,
      },
    }));

    setTimeout(() => {
      setBlockSubmitting(false);
      setIsBlockOpen(false);
      setIsAnalysisModalOpen(false);
    }, 300);
  };

  /* ================= Navigation ================= */
  const goBack = () => navigate(-1);

  /* ================= Derived: Report / Intel ================= */
  const avgCompliance = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;
  const criticalIssuesCount = 0; // left as-is (report widgets unchanged)
  const totalChanges = changedCount;

  /* ================= Export Report (simple .txt) ================= */
  const exportReport = () => {
    const lines = [
      `Project: ${projectName}`,
      `Therapy Area: ${therapyArea}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Final Regulatory-Compliant Translation",
      "======================================",
      "",
      ...segments.map((seg) => {
        const adapted = (seg.adapted || "").trim() ? seg.adapted : "— No adapted text —";
        return `Segment ${seg.index}\n${adapted}\n`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}_Compliance_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  /** Actions on detail panel */
  const runComplianceCheck = () => {
    if (!selected) return;
    // naive score demo: based on length and presence of certain terms
    const base = Math.min(100, Math.round(selected.adapted.length / 3));
    const hasBrand = /ofev|nintedanib/i.test(selected.adapted);
    const hasRisk = /risk|warning|contraindication/i.test(selected.adapted);
    const score = Math.max(0, Math.min(100, base + (hasBrand ? 10 : 0) + (hasRisk ? 8 : 0)));

    setScoreById((prev) => ({ ...prev, [selected.id]: score }));
  };

  const flagForReview = () => {
    if (!selected) return;
    // Just toggle a marker (you can persist if needed)
    alert(`Segment ${selected.index} flagged for regulatory review.`);
  };

  const approveCompliant = () => {
    if (!selected) return;
    // For demo: set compliant to adapted, you can pipe to your API
    const text = selected.adapted?.trim().length ? selected.adapted : selected.source;
    setCompliantById((prev) => ({ ...prev, [selected.id]: text }));
  };

  /** Complete Phase → next page (Quality Intelligence or your desired route) */
  const handleCompletePhase = () => {
    navigate("/qualityIntelligence", {
      state: {
        projectName,
        segments: segments.map((s) => ({
          ...s,
          complianceScore: scoreById[s.id] ?? s.complianceScore ?? null,
          compliant: compliantById[s.id] ?? s.compliant ?? "",
        })),
      },
    });
  };

  return (
    <div className={`regulatory tm-app ${isFocusMode ? 'is-focus' : ''}`}>
      {/* Sidebar */}
      <aside className="tm-sidebar">
        <div className="tm-sidebar-progress">
          {/* <div className="tm-progress-row">
            <span className="tm-progress-label">Overall Progress</span>
            <span className="tm-progress-value">{progressPct}%</span>
          </div> */}
          <div className="tm-progress-row">
            <span className="tm-progress-label">Overall Progress</span>
            {/* <span className="tm-progress-value">{progressPct}%</span> */}
          </div>
          <div className="tm-progress-sub">
            {/* {progressItems.reviewed} / {progressItems.total} pieces completed */}
            {Math.max(approvedCount, 0)} / {Math.max(totalCount, 0)} pieces completed
          </div>  
            <div
                className="tm-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
              >
                <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
                {/* Percentage pill inside the bar (like pasted rail) */}
                <span className="tm-progress-pct">{progressPct}%</span>
              </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => (
            <button
              key={p.id}
              className={`tm-phase-item ${p.status} ${p.name === "Regulatory Compliance" ? "is-active" : ""}`}
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
              {p.name === "Regulatory Compliance" && <span className="tm-phase-dot" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="tm-main">
        {/* Header */}
        <header className="tm-header">
          <div className="tm-header-left">
          <div className="tm-crumbs">
      <button className="tm-crumb" onClick={() => navigate('/')}>
        <ArrowLeft size={14} className="h-1 w-1 mr-2" /> Main Hub
      </button>
      <span className="tm-divider" />
      <button className="tm-crumb" onClick={() => navigate('/glocalizationHub')}>
        Glocalization Hub
      </button>
    </div>

    <div className="tm-header-center">
    <div className="tm-title-row">
      <h1 className="tm-page-title">{projectName}</h1>
      {/* <span className="tm-title-sub">{therapyArea}</span> */}
    </div>
  </div>
          </div>

          <div className="tm-header-right">
  <span className="tm-saved"> <CheckCircle2 size={12} className="h-1 w-1 text-green-600" />
  Saved</span>

    <button className="tm-btn ghost tm-btn-icon">
    <Save size={15} className="h-4 w-4 mr-2" /> Save
    </button>

    <button
      className="tm-btn ghost tm-btn-icon"
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

        {/* Tabs bar */}
        <section className="tm-tabs-bar">
          <div className="tm-tabs">
            <button
              className={`tm-tab ${mainTab === "review" ? "is-active" : ""}`}
              onClick={() => setMainTab("review")}
            >
              Compliance Review
            </button>
            <button
              className={`tm-tab ${mainTab === "report" ? "is-active" : ""}`}
              onClick={() => setMainTab("report")}
            >
              Compliance Report
            </button>
            <button
              className={`tm-tab ${mainTab === "intel" ? "is-active" : ""}`}
              onClick={() => setMainTab("intel")}
            >
              Regulatory Intelligence
            </button>
          </div>

          {/* <div className="tm-tabs-right">
            <div className="tm-progress-inline">
              <span className="tm-progress-inline-label">Progress:</span>
              <span className="tm-progress-inline-value">
                {progressItems.approved} / {progressItems.total} approved
              </span>
              <div className="tm-progress-inline-bar">
                <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="tm-tabs-actions">
              <button className="tm-btn outline">Generate PDF</button>
              <button className="tm-btn primary" onClick={handleCompletePhase}>
                Complete Phase 3
              </button>
            </div>
          </div> */}
        </section>
        {mainTab === "review" && (
        <div>
        <section className="tm-tabs-right">
  <div className="tm-status-left">
    <h2 className="tm-section-title"><Shield size={20} className="h-5 w-5" />Regulatory Compliance Workspace</h2>
    <p className="tm-section-sub">Review culturally adapted content for regulatory compliance and market requirements</p>
  </div>

  <div className="tm-progress-inline">
    <span className="tm-progress-inline-label">Progress:</span>
    {/* <span className="tm-progress-inline-value"> {progressItems.approved} / {progressItems.total} approved</span> */}
    <span className="tm-progress-inline-value">{approvedCount} / {totalCount} approved</span>
    <div className="tm-progress-inline-bar">
      <div className="tm-progress-inline-fill" style={{ width: `${progressPct}%` }} />
    </div>
  </div>
</section>
        {/* Workspace grid */}
        <section className="tm-workspace rc-workspace">
         
          <div className="tm-card tm-left">
            <div className="tm-card-header">
              <h3 className="tm-card-title">Content Segments</h3>
              <span className="tm-light">{segments.length} segments to review</span>
            </div>

            <div className="tm-seg-list">
              {segments.map((seg) => {
                const isSelected = seg.id === selectedId;
                return (
                  <button
                    key={seg.id}
                    className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(seg.id)}
                    aria-label={`Open Segment ${seg.index}`}
                  >
                    <div className="tm-seg-item-top">
                      <span className="tm-ci-index">Segment {seg.index}</span>
                      <span className="tm-seg-state">
                        {/* {(compliantById[seg.id] || seg.compliant || "").trim() ? "Approved" : "Pending"} */}                    
                          {(() => {
                            const o = segOverrides[seg.id] || {};
                            const st = String(o.status ?? seg.status ?? "Pending").toLowerCase();
                            return (
                              <span className="tm-seg-state">
                                {st === "approved" ? "Approved" : st === "flagged" ? "Flagged" : "Pending"}
                              </span>
                            );
                          })()}

                        </span>
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

         
          <div className="tm-card tm-right">
            {/* <div className="tm-card-header">
              <h3 className="tm-card-title">Regulatory Compliance Workspace</h3>
              <span className="tm-light">Review culturally adapted content for compliance</span>
            </div>

            {!selected && (
              <div className="tm-empty large">
                Select a segment on the left to review Source, Adapted, and Compliant text.
              </div>
            )} */}

            {selected && (
              // <div className="tm-detail">
                
              //   <div className="tm-detail-row">
              //     <div className="tm-detail-row-left">
              //       <span className="tm-chip soft">Source Text</span>
              //     </div>
              //     <div className="tm-detail-row-right">
              //       <span className="tm-lang-chip">{selected.lang || "EN"}</span>
              //     </div>
              //   </div>
              //   <div className="tm-box source">{selected.source}</div>

               
              //   <div className="tm-detail-head">
              //     <span className="tm-chip">Culturally Adapted Text (Phase 3)</span>
              //     <div className="rc-tools-inline">
              //       <span className="rc-score-badge">
              //         Score: {typeof scoreById[selected.id] === "number" ? `${scoreById[selected.id]}/100` : "—"}
              //       </span>
              //       <button className="tm-btn outline small" onClick={runComplianceCheck}>
              //         Run Compliance Check
              //       </button>
              //     </div>
              //   </div>
              //   <div className="tm-box">{selected.adapted?.trim().length ? selected.adapted : <span className="tm-light">— No adapted text —</span>}</div>

                
              //   <div className="tm-detail-head">
              //     <span className="tm-chip success">Regulatory Compliant Text</span>
              //     <div className="rc-tools-inline">
              //       <button className="tm-btn link small" onClick={flagForReview}>Flag for Review</button>
              //       <button className="tm-btn primary small" onClick={approveCompliant}>Approve</button>
              //     </div>
              //   </div>
              //   <div className="tm-box translated">
              //     {(compliantById[selected.id] || selected.compliant || "").trim().length
              //       ? (compliantById[selected.id] || selected.compliant)
              //       : <span className="tm-light">— Awaiting compliance approval —</span>}
              //   </div>
              // </div>
              

<div className="tm-detail">

{/* ===== 1) Source Text ===== */}
<div className="rc-section">
  <div className="rc-section-head">
    <span className="rc-chip blue">Source Text</span>
    {/* <span className="rc-lang-chip">{selected.lang || "EN"}</span> */}
  </div>

  <div className="rc-source-body">
    {/* {selected.source} */}
    {selectedResolved.source}
  </div>
</div>

{/* ===== 2) Culturally Adapted Text (Phase 3) ===== */}
<div className="rc-section">
  <div className="rc-section-head">
    <span className="rc-chip blue">Culturally Adapted Text (Phase 3)</span>

    <div className="rc-tools-inline">
      <span className="rc-score-pill">
        Score: {typeof scoreById[selected.id] === "number" ? `${scoreById[selected.id]}/100` : "—"}
      </span>
      <button className="rc-btn-check"  onClick={openAnalysisModal}
                          disabled={!selectedResolved.adapted?.trim() || isAnalyzing}
                          title={
                            selectedResolved.adapted?.trim()
                              ? "Open Compliance Analysis"
                              : "No adapted text to check"
                          }>
      <Shield size={15} className="h-5 w-5" />
        {/* Run Compliance Check */}
        {isAnalyzing ? "Analyzing…" : "Run Compliance Check"}
      </button>
    </div>
  </div>

  <div className="rc-adapted-card">
    <div className="rc-adapted-body">
      {/* {selected.adapted?.trim().length
        ? selected.adapted
        : <span className="rc-muted">— No adapted text —</span>} */}
        {selectedResolved.adapted?.trim()
                          ? selectedResolved.adapted
                          : <span className="rc-muted">— No adapted text —</span>}
    </div>
  </div>
</div>

{/* ===== 3) Regulatory Compliant Text ===== */}
<div className="rc-section">
  <div className="rc-section-head">
    <span className="rc-chip green">Regulatory Compliant Text</span>

    <div className="rc-tools-inline">
      <button className="rc-link-flag" onClick={handleFlag}>
      <Flag size={12} className="h-4 w-4 mr-2" />
        Flag for Review
      </button>
      <button className="rc-btn-approve" onClick={handleApprove}>
      <CheckCircle size={12} className="h-4 w-4 mr-2" />
        Approve
      </button>
    </div>
  </div>

  {/* <div className="rc-compliant-card"> */}
    {/* <div className="rc-textarea">
      {(compliantById[selected.id] || selected.compliant || "").trim().length
        ? (compliantById[selected.id] || selected.compliant)
        : <span className="rc-muted">— Awaiting compliance approval —</span>}
    </div> */}
    
{/* <textarea
    className="rc-textarea"
    value={(compliantById[selected.id] ?? selected.compliant ?? "")}
    onChange={(e) => {
      const newText = e.target.value;
      setCompliantById(prev => ({ ...prev, [selected.id]: newText }));
    }}
    placeholder="— Awaiting compliance approval —"
    rows={8}
  /> */}
<textarea
                        className="rc-textarea"
                        placeholder="Enter or edit the final compliant text here…"
                        value={compliantEditorValue}
                        onChange={(e) => setCompliantEditorValue(e.target.value)}
                      />
  {/* </div> */}
</div>

</div>

            )}
          </div>
        </section>
        </div>
        )}
        {mainTab === "report" && (
          <div className="rc-report">
            {/* SUMMARY CARDS */}
            <div className="rc-report-cards">
              <div className="rc-report-card">
                <div className="rc-report-card-label">Segments Approved</div>
                <div className="rc-report-card-value">
                  {approvedCount}/{totalCount}
                </div>
              </div>
              <div className="rc-report-card">
                <div className="rc-report-card-label">Critical Issues</div>
                <div className="rc-report-card-value danger">{criticalIssuesCount}</div>
              </div>
              <div className="rc-report-card">
                <div className="rc-report-card-label">Avg Compliance Score</div>
                <div className="rc-report-card-value">{avgCompliance}%</div>
              </div>
              <div className="rc-report-card">
                <div className="rc-report-card-label">Total Changes</div>
                <div className="rc-report-card-value">{totalChanges}</div>
              </div>
            </div>

            {/* FINAL REGULATORY-COMPLIANT TRANSLATION */}
            <div className="rc-card rc-report-list">
              <div className="rc-card-head">
                <div className="rc-card-title">Final Regulatory-Compliant Translation</div>
                <div className="rc-card-actions">
                  <button className="rc-btn outline" onClick={exportReport}>
                    Export Report
                  </button>
                </div>
              </div>

              <div className="rc-report-items">
                {segments.length === 0 && (
                  <div className="rc-empty">No segments found.</div>
                )}

                {segments.map((seg) => {
                  const adapted = (seg.adapted || "").trim()
                    ? seg.adapted
                    : "— No adapted text —";
                  return (
                    <div className="rc-report-item" key={`rep-${seg.id}`}>
                      <div className="rc-report-item-head">
                        <span className="rc-report-item-index">Segment {seg.index}</span>
                      </div>
                      <div className="rc-report-item-body">
                        <pre className="rc-pre">{adapted}</pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mainTab === "intel" && (
          <div className="rc-intel">
            {/* DASHBOARD HEADER */}
            <div className="rc-intel-head">
              <div className="rc-intel-title">Regulatory Intelligence Dashboard</div>
              <span className="rc-chip small success">Compliance: {avgCompliance}%</span>
            </div>

            {/* KPI CARDS */}
            <div className="rc-intel-kpis">
              <div className="rc-intel-kpi">
                <div className="rc-intel-kpi-top">Overall Compliance</div>
                <div className="rc-intel-kpi-value">{avgCompliance}%</div>
              </div>
              <div className="rc-intel-kpi">
                <div className="rc-intel-kpi-top">Passed Rules</div>
                <div className="rc-intel-kpi-value">{approvedCount}</div>
              </div>
              <div className="rc-intel-kpi">
                <div className="rc-intel-kpi-top">Warnings</div>
                <div className="rc-intel-kpi-value">{flaggedCount}</div>
              </div>
              <div className="rc-intel-kpi">
                <div className="rc-intel-kpi-top">Critical Issues</div>
                <div className="rc-intel-kpi-value danger">{criticalIssuesCount}</div>
              </div>
            </div>

            {/* INNER TABS */}
            <IntelInnerTabs
              locale={getTargetLang(therapyArea)}
              overallPct={avgCompliance}
            />
          </div>
        )}
      </div>
       {/* ================== ANALYSIS POPUP ================== */}
       {isAnalysisModalOpen && selectedResolved && (
        <div
          className="rcm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Regulatory Compliance Analysis - Segment ${selectedResolved.index}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAnalysisModalOpen(false);
          }}
        >
          <div className="rcm-modal">
            {/* HEADER */}
            <div className="rcm-modal__header">
              <div className="rcm-modal__title">
                <span className="rcm-bullet" />
                Regulatory Compliance Analysis - Segment {selectedResolved.index}
              </div>
              <div className="rcm-modal__chips">
                <span className={`rcm-chip risk ${analysisData.risk.toLowerCase()}`}>
                  {analysisData.risk[0] + analysisData.risk.slice(1).toLowerCase()} Risk
                </span>
                <span className="rcm-chip score">Score: {analysisData.score}%</span>
              </div>
            </div>

            {/* TABS */}
            <div className="rcm-tabs">
              <button
                className={activeTab === "issues" ? "active" : ""}
                onClick={() => setActiveTab("issues")}
              >
                Compliance Issues{" "}
                <span className="rc-tab-badge">
                  {analysisData.criticalIssues.length + n8nCritical.length + n8nRecs.length}
                </span>
              </button>
              <button
                className={activeTab === "pre" ? "active" : ""}
                onClick={() => setActiveTab("pre")}
              >
                Pre-Approved Content
              </button>
              <button
                className={activeTab === "templates" ? "active" : ""}
                onClick={() => setActiveTab("templates")}
              >
                Regulatory Templates
              </button>
            </div>

            {/* BODY */}
            <div className="rcm-modal__body">
              {/* Overall score row */}
              <div className="rcm-overall">
                <div className="rcm-overall__left">
                  <div className="rcm-overall__label">Overall Compliance Score</div>
                  <div className="rcm-overall__value">{analysisData.score}/100</div>
                </div>
                <div className="rcm-overall__right">
                  <div className="rcm-overall__sub">Risk Level</div>
                  <div className={`rcm-overall__risk ${analysisData.risk.toLowerCase()}`}>
                    {analysisData.risk}
                  </div>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="rcm-section-title">
                <span className="rcm-icon warn">!</span>
                Critical Issues – Must Change{" "}
                <span className="rc-tab-badge">
                  {analysisData.criticalIssues.length + n8nCritical.length}
                </span>
              </div>

              {/* Existing (kept empty) critical issues structure */}
              {analysisData.criticalIssues.map((it) => {
                const mlrMatch = currentSegOverride?.mlr?.rule === it.text;
                return (
                  <div key={it.id} className="rcm-issue rcm-issue--critical">
                    <div className="rcm-issue__content">{it.text}</div>

                    {!mlrMatch && (
                      <div className="rcm-issue__actions">
                        <button className="btn success" onClick={applyCompliantSuggestion}>
                          ✓ Accept &amp; Apply Changes
                        </button>
                        <button className="btn outline" onClick={() => openMlrModal(it.text)}>
                          ⓘ Request MLR Exception
                        </button>
                        <button className="btn danger" onClick={() => openBlockModal(it.text)}>
                          ⛔ Mark as Blocking
                        </button>
                      </div>
                    )}

                    {mlrMatch && (
                      <div className="rcm-logged-note">
                        <div className="rcm-logged-note__label">Decision Reasoning:</div>
                        <textarea
                          className="rcm-logged-note__textarea"
                          value={currentSegOverride.mlr.reasoning}
                          readOnly
                        />
                        <div className="rcm-logged-note__meta">
                          Logged at: {new Date(currentSegOverride.mlr.at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* n8n loading indicator */}
              {n8nLoading && (
                <div className="rcm-issue rcm-issue--critical" key="n8n-loading">
                  <div className="rcm-issue__content">Analyzing with AI…</div>
                </div>
              )}

              {/* n8n error (appended, non-blocking) */}
              {!n8nLoading && n8nError && (
                <div className="rcm-issue rcm-issue--critical" key="n8n-error">
                  <div className="rcm-issue__content">{n8nError}</div>
                </div>
              )}

              {/* n8n results under Critical Issues */}
              {!n8nLoading &&
                !n8nError &&
                n8nCritical.map((it) => {
                  const mlrMatch = currentSegOverride?.mlr?.rule === it.text;
                  return (
                    <div key={it.id} className="rcm-issue rcm-issue--critical">
                      <div className="rcm-issue__content">{it.text}</div>

                      {!mlrMatch && (
                        <div className="rcm-issue__actions">
                          <button className="btn success" onClick={applyCompliantSuggestion}>
                            ✓ Accept &amp; Apply Changes
                          </button>
                          <button className="btn outline" onClick={() => openMlrModal(it.text)}>
                            ⓘ Request MLR Exception
                          </button>
                          <button className="btn danger" onClick={() => openBlockModal(it.text)}>
                            ⛔ Mark as Blocking
                          </button>
                        </div>
                      )}

                      {mlrMatch && (
                        <div className="rcm-logged-note">
                          <div className="rcm-logged-note__label">Decision Reasoning:</div>
                          <textarea
                            className="rcm-logged-note__textarea"
                            value={currentSegOverride.mlr.reasoning}
                            readOnly
                          />
                          <div className="rcm-logged-note__meta">
                            Logged at: {new Date(currentSegOverride.mlr.at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Recommended Changes (ONLY from n8n) */}
              <div className="rcm-section-title">
                <span className="rcm-icon info">○</span>
                Recommended Changes{" "}
                <span className="rc-tab-badge">
                  {n8nRecs.length}
                </span>
              </div>

              {!n8nLoading &&
                !n8nError &&
                n8nRecs.map((it) => {
                  const deferredMatch = currentSegOverride?.mlrDefer?.rule === it.text;
                  const riskMatch = currentSegOverride?.acceptedRisk?.rule === it.text;
                  const hasDecision = deferredMatch || riskMatch;

                  return (
                    <div key={it.id} className="rcm-issue rcm-issue--reco">
                      <div className="rcm-issue__content">{it.text}</div>

                      {!hasDecision && (
                        <div className="rcm-issue__actions">
                          <button
                            className="btn hollow-success"
                            onClick={() => acceptRecommendation(it.text)}
                          >
                            ✓ Accept Recommendation
                          </button>
                          <button
                            className="btn outline-blue"
                            onClick={() => openDeferModal(it.text)}
                          >
                            ☐ Defer to MLR Review
                          </button>
                          <button className="btn ghost" onClick={() => openRiskModal(it.text)}>
                            Accept Risk &amp; Skip
                          </button>
                        </div>
                      )}

                      {deferredMatch && (
                        <div className="rcm-logged-note">
                          <div className="rcm-logged-note__label">Decision Reasoning:</div>
                          <textarea
                            className="rcm-logged-note__textarea"
                            value={currentSegOverride.mlrDefer.reasoning}
                            readOnly
                          />
                          <div className="rcm-logged-note__meta">
                            Logged at: {new Date(currentSegOverride.mlrDefer.at).toLocaleString()}
                          </div>
                        </div>
                      )}

                      {riskMatch && (
                        <div className="rcm-logged-note">
                          <div className="rcm-logged-note__label">Decision Reasoning:</div>
                          <textarea
                            className="rcm-logged-note__textarea"
                            value={currentSegOverride.acceptedRisk.reasoning}
                            readOnly
                          />
                          <div className="rcm-logged-note__meta">
                            Logged at: {new Date(currentSegOverride.acceptedRisk.at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* FOOTER */}
            <div className="rcm-modal__footer">
              <button
                className={`btn outline ${isReAnalyzing ? "is-loading" : ""}`}
                onClick={reAnalyzeInModal}
                disabled={isReAnalyzing || isReAnalyzeDisabled}
              >
                {isReAnalyzing ? "Re-analyzing…" : "Re-Analyze with AI"}
              </button>
              <div className="rcm-footer-right">
                <button className="btn success" onClick={markCompliantFromModal}>
                  ✓ Mark as Compliant
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setIsAnalysisModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================== Request MLR Exception POPUP ================== */}
      {isMlrOpen && (
        <div
          className="mlr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Request MLR Exception"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMlrOpen(false);
          }}
        >
          <div className="mlr-modal">
            {/* Header */}
            <div className="mlr-header">
              <div className="mlr-title">
                <span className="mlr-warn-icon">⚠</span> Request MLR Exception
              </div>
              <button
                className="mlr-close"
                aria-label="Close"
                onClick={() => setIsMlrOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Subtext */}
            <div className="mlr-subtext">
              Explain why this critical compliance issue requires an exception. This will
              be escalated to the Medical Legal Regulatory team for approval.
            </div>

            {/* Rule */}
            <div className="mlr-label">Rule</div>
            <div className="mlr-rule-box">{mlrRuleText || "No rule text available."}</div>

            {/* Reasoning */}
            <div className="mlr-label req">Reasoning *</div>
            <textarea
              className={`mlr-textarea ${mlrTouched && !mlrReason.trim() ? "is-invalid" : ""}`}
              placeholder="Enter detailed reasoning for this decision..."
              value={mlrReason}
              onChange={(e) => setMlrReason(e.target.value)}
              onBlur={() => setMlrTouched(true)}
            />

            <div className="mlr-hint">This reasoning will be logged for audit purposes.</div>

            {/* Footer */}
            <div className="mlr-footer">
              <button className="btn ghost" onClick={() => setIsMlrOpen(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={submitMlr}
                disabled={!mlrReason.trim() || mlrSubmitting}
              >
                {mlrSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== Defer to MLR Review POPUP ================== */}
      {isDeferOpen && (
        <div
          className="mlr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Defer to MLR Review"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeferOpen(false);
          }}
        >
          <div className="mlr-modal">
            {/* Header */}
            <div className="mlr-header">
              <div className="mlr-title">
                <span className="mlr-warn-icon">⚠</span> Defer to MLR Review
              </div>
              <button
                className="mlr-close"
                aria-label="Close"
                onClick={() => setIsDeferOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Subtext */}
            <div className="mlr-subtext">
              Provide context for the MLR team to review during the approval process.
              Explain why manual review is needed.
            </div>

            {/* Rule */}
            <div className="mlr-label">Rule</div>
            <div className="mlr-rule-box">{deferRuleText || "No rule text available."}</div>

            {/* Reasoning */}
            <div className="mlr-label req">Reasoning *</div>
            <textarea
              className={`mlr-textarea ${
                deferTouched && !deferReason.trim() ? "is-invalid" : ""
              }`}
              placeholder="Enter detailed reasoning for this decision..."
              value={deferReason}
              onChange={(e) => setDeferReason(e.target.value)}
              onBlur={() => setDeferTouched(true)}
            />

            <div className="mlr-hint">This reasoning will be logged for audit purposes.</div>

            {/* Footer */}
            <div className="mlr-footer">
              <button className="btn ghost" onClick={() => setIsDeferOpen(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={submitDefer}
                disabled={!deferReason.trim() || deferSubmitting}
              >
                {deferSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== Accept Risk & Skip POPUP ================== */}
      {isRiskOpen && (
        <div
          className="mlr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Accept Risk &amp; Skip"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRiskOpen(false);
          }}
        >
          <div className="mlr-modal">
            {/* Header */}
            <div className="mlr-header">
              <div className="mlr-title">
                <span className="mlr-warn-icon">⚠</span> Accept Risk &amp; Skip
              </div>
              <button
                className="mlr-close"
                aria-label="Close"
                onClick={() => setIsRiskOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Subtext */}
            <div className="mlr-subtext">
              Document your decision to skip this recommendation. Include your rationale
              and any risk assessment considerations.
            </div>

            {/* Rule */}
            <div className="mlr-label">Rule</div>
            <div className="mlr-rule-box">{riskRuleText || "No rule text available."}</div>

            {/* Reasoning */}
            <div className="mlr-label req">Reasoning *</div>
            <textarea
              className={`mlr-textarea ${
                riskTouched && !riskReason.trim() ? "is-invalid" : ""
              }`}
              placeholder="Enter detailed reasoning for this decision..."
              value={riskReason}
              onChange={(e) => setRiskReason(e.target.value)}
              onBlur={() => setRiskTouched(true)}
            />

            <div className="mlr-hint">This reasoning will be logged for audit purposes.</div>

            {/* Footer */}
            <div className="mlr-footer">
              <button className="btn ghost" onClick={() => setIsRiskOpen(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={submitRisk}
                disabled={!riskReason.trim() || riskSubmitting}
              >
                {riskSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== Mark as Blocking POPUP ================== */}
      {isBlockOpen && (
        <div
          className="mlr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blockTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBlockOpen(false);
          }}
        >
          <div className="block-modal">
            <div className="block-header">
              <div className="block-title" id="blockTitle">
                <span className="block-warn-circ">i</span>
                Blocking Decision
              </div>
              <span className="block-badge">Blocking</span>
              <button
                className="block-close"
                aria-label="Close"
                onClick={() => setIsBlockOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="block-card">
              <div className="block-icon">!</div>
              <div className="block-text">{blockRuleText || "No rule text available."}</div>
            </div>

            <div className="block-reason-wrap">
              <div className="block-reason-label">Decision Reasoning:</div>
              <textarea
                className={`block-reason ${blockTouched && !blockReason.trim() ? "is-invalid" : ""}`}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                onBlur={() => setBlockTouched(true)}
                placeholder="Add any additional context for why this is blocking..."
              />
            </div>

            <div className="block-footer">
              <button className="btn ghost" onClick={() => setIsBlockOpen(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={submitBlock}
                disabled={!blockReason.trim() || blockSubmitting}
                title={!blockReason.trim() ? "Reasoning is required" : "Submit blocking decision"}
              >
                {blockSubmitting ? "Marking…" : "Mark as Blocking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== Small Component: Regulatory Intelligence Inner Tabs ================== */
function IntelInnerTabs({ locale = "DE", overallPct = 100 }) {
  const [tab, setTab] = useState("matrix"); // matrix | pre | templates | realtime

  return (
    <div className="intel-tabs">
      <div className="intel-tabbar">
        <button className={tab === "matrix" ? "active" : ""} onClick={() => setTab("matrix")}>
          Compliance Matrix
        </button>
        <button className={tab === "pre" ? "active" : ""} onClick={() => setTab("pre")}>
          Pre-Approved Content
        </button>
        <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>
          Templates
        </button>
        <button className={tab === "realtime" ? "active" : ""} onClick={() => setTab("realtime")}>
          Real-Time Validator
        </button>
      </div>

      {tab === "matrix" && (
        <div className="intel-panel">
          <div className="intel-matrix-row">
            <div className="intel-matrix-label">{locale}</div>
            <div className="intel-matrix-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPct}>
              <div className="intel-matrix-fill" style={{ width: `${overallPct}%` }} />
              <span className="intel-matrix-pct">{overallPct}%</span>
            </div>
          </div>
        </div>
      )}

      {tab === "pre" && (
        <div className="intel-panel">
          <div className="intel-placeholder">
            No pre-approved content linked. Use your brand library to attach items.
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="intel-panel">
          <div className="intel-templates">
            <div className="intel-template-card">
              <div className="intel-template-title">HWG Disclosure Boilerplate</div>
              <div className="intel-template-sub">Localized: {locale}</div>
              <button className="rc-btn tiny">Insert</button>
            </div>
            <div className="intel-template-card">
              <div className="intel-template-title">Social Media Risk Footnote</div>
              <div className="intel-template-sub">Localized: {locale}</div>
              <button className="rc-btn tiny">Insert</button>
            </div>
          </div>
        </div>
      )}

      {tab === "realtime" && (
        <div className="intel-panel">
          <div className="intel-validator">
            <div className="intel-validator-head">
              Real-Time Validator
              <span className="rc-chip small">Beta</span>
            </div>
            <div className="intel-validator-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPct}>
              <div className="intel-validator-fill" style={{ width: `${overallPct}%` }} />
              <span className="intel-validator-pct">{overallPct}%</span>
            </div>
            <div className="intel-placeholder small">Live checks are green. No critical issues.</div>
          </div>
        </div>
      )}
    </div>
  );
}


/* Sidebar phases */
const SIDEBAR_PHASES = [
  { id: 'P1', name: "Global Context Capture", sub: "Source content analysis", status: "done", iconClass: "icon-context" },
  { id: 'P2', name: "Smart TM Translation", sub: "AI-powered translation", status: "done", iconClass: "icon-translation" },
  { id: 'P3', name: "Cultural Intelligence", sub: "Cultural adaptation", status: "done", iconClass: "icon-culture" },
  { id: 'P4', name: "Regulatory Compliance", sub: "Compliance validation", status: "active", iconClass: "icon-compliance" },
  { id: 'P5', name: "Quality Intelligence", sub: "Quality assurance", status: "todo", iconClass: "icon-quality" },
  { id: 'P6', name: "DAM Integration", sub: "Asset packaging", status: "todo", iconClass: "icon-dam" },
  { id: 'P7', name: "Integration Lineage", sub: "System integration", status: "todo", iconClass: "icon-integration" },
];