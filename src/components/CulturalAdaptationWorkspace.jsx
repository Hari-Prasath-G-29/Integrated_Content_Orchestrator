
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/**
 * Cultural Intelligence Hub
 * - Fix: robust score parsing from n8n ("92.5%", "0.925", etc.)
 * - NEW: Gate popup before switching to "Culturally-Adapted Draft" tab
 * - Keeps all other functionality intact.
 */
export default function CulturalAdaptationWorkspace({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  progressItems: progressItemsProp = { reviewed: 0, total: 75 },
  segments: segmentsProp = [],
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  /** Tabs */
  const [activeTab, setActiveTab] = useState("adaptation");

  /** Prefer project from previous page */
  const projectName = state?.projectName ?? projectNameProp;

  /** ========= ENV HELPERS ========= */
  const getEnv = () => {
    const pe = typeof process !== "undefined" && process.env ? process.env : {};
    const we =
      typeof window !== "undefined" && window._env_ ? window._env_ : {};
    return { ...we, ...pe };
  };
  const ENV = getEnv();

  /** Cultural Translation webhook URL (used by Analyze with AI) */
  const N8N_CULTURAL_WEBHOOK_URL =
    ENV.REACT_APP_N8N_CULTURAL_WEBHOOK_URL ||
    ENV.VITE_N8N_CULTURAL_WEBHOOK_URL ||
    "http://172.16.4.237:8010/webhook/cultural";

  /** Token for n8n (optional) */
  const N8N_AUTH = ENV.REACT_APP_N8N_TOKEN || ENV.VITE_N8N_TOKEN || "";

  /** Target language hint from therapyArea like "Respiratory · DE" */
  const getTargetLang = (therapyAreaStr) => {
    const m = String(therapyAreaStr || "").match(/·\s*([A-Za-z-]+)/);
    return m?.[1] || "DE";
  };

  /** Extract culturally translated text from various n8n response shapes (legacy fallback) */
  const extractCulturalTranslated = async (res) => {
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
      if (first && typeof first.cultural_output === "string")
        return first.cultural_output.trim();
      for (const k of Object.keys(first || {})) {
        const v = first[k];
        if (typeof v === "string" && /cultur|adapt|output|translat/i.test(k))
          return v.trim();
      }
    }

    if (body && typeof body === "object") {
      if (typeof body.culturalTranslated === "string")
        return body.culturalTranslated.trim();
      if (body.data && typeof body.data.culturalTranslated === "string")
        return body.data.culturalTranslated.trim();
      if (typeof body.translated === "string") return body.translated.trim();
      for (const k of Object.keys(body)) {
        const v = body[k];
        if (typeof v === "string" && /cultur|adapt|output|translat/i.test(k))
          return v.trim();
      }
    }
    return "";
  };

  /** ========= Helpers to parse TPS (translation/problem/suggestion) ========= */
  const tryParseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const extractTPSFromBody = (body) => {
    if (!body) return null;

    if (Array.isArray(body) && body.length > 0) {
      const first = body[0];
      const out = first?.output ?? first?.cultural_output ?? first;

      if (typeof out === "string") {
        const parsed = tryParseJSON(out);
        if (parsed && (parsed.translation || parsed.problem || parsed.suggestion)) {
          return {
            translation: String(parsed.translation || "").trim(),
            problem: String(parsed.problem || "").trim(),
            suggestion: String(parsed.suggestion || "").trim(),
          };
        }
        return { translation: "", problem: "", suggestion: String(out).trim() };
      }

      if (out && typeof out === "object") {
        return {
          translation: String(out.translation || "").trim(),
          problem: String(out.problem || "").trim(),
          suggestion: String(out.suggestion || "").trim(),
        };
      }
    }

    if (body && typeof body === "object") {
      const out = body.output ?? body.cultural_output ?? body.data ?? body;
      if (typeof out === "string") {
        const parsed = tryParseJSON(out);
        if (parsed && (parsed.translation || parsed.problem || parsed.suggestion)) {
          return {
            translation: String(parsed.translation || "").trim(),
            problem: String(parsed.problem || "").trim(),
            suggestion: String(parsed.suggestion || "").trim(),
          };
        }
        return { translation: "", problem: "", suggestion: String(out).trim() };
      }
      if (out && typeof out === "object") {
        return {
          translation: String(out.translation || "").trim(),
          problem: String(out.problem || "").trim(),
          suggestion: String(out.suggestion || "").trim(),
        };
      }
    }

    if (typeof body === "string") {
      const parsed = tryParseJSON(body);
      if (parsed && (parsed.translation || parsed.problem || parsed.suggestion)) {
        return {
          translation: String(parsed.translation || "").trim(),
          problem: String(parsed.problem || "").trim(),
          suggestion: String(parsed.suggestion || "").trim(),
        };
      }
      return { translation: "", problem: "", suggestion: String(body).trim() };
    }

    return null;
  };

  const extractTPSFromResponse = async (res) => {
    let body;
    try {
      body = await res.json();
    } catch {
      const txt = await res.text();
      body = tryParseJSON(txt) ?? txt;
    }
    return (
      extractTPSFromBody(body) || {
        translation: "",
        problem: "",
        suggestion: "",
      }
    );
  };

  /** ====== NEW: Robust score parsing from n8n (supports %, decimals, normalized) ====== */
  const parseScore = (val) => {
    if (val === null || val === undefined) return null;

    if (typeof val === "number") {
      const n = val <= 1 && val >= 0 ? val * 100 : val;
      return Math.max(0, Math.min(100, +n.toFixed(1)));
    }

    const str = String(val).trim().replace(",", ".");
    const match = str.match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    let n = parseFloat(match[0]);
    if (n <= 1 && n >= 0 && !/%/.test(str)) n *= 100;
    return Math.max(0, Math.min(100, +n.toFixed(1)));
  };

  /** ========== Extract suggestionA/suggestionB/score/scoreA/scoreB ========== */
  const extractExtrasFromBody = (body) => {
    // Handles: [{ output: "<json string>" }] OR object with .output
    let out = null;

    if (Array.isArray(body) && body.length > 0) {
      const first = body[0];
      out = first?.output ?? first?.cultural_output ?? first;
    } else if (body && typeof body === "object") {
      out = body.output ?? body.cultural_output ?? body.data ?? body;
    } else if (typeof body === "string") {
      out = body;
    }

    // If `out` is a JSON string, parse; if object, use as-is
    let parsed = null;
    if (typeof out === "string") {
      try {
        parsed = JSON.parse(out);
      } catch {
        parsed = null;
      }
    } else if (out && typeof out === "object") {
      parsed = out;
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        suggestionA: "",
        suggestionB: "",
        score: null,
        scoreA: null,
        scoreB: null,
      };
    }

    const suggestionA = String(parsed.suggestionA ?? "").trim();
    const suggestionB = String(parsed.suggestionB ?? "").trim();
    const score = parseScore(parsed.score);
    const scoreA = parseScore(parsed.scoreA);
    const scoreB = parseScore(parsed.scoreB);

    return { suggestionA, suggestionB, score, scoreA, scoreB };
  };

  const extractExtrasFromResponse = async (res) => {
    let body;
    try {
      body = await res.json();
    } catch {
      const txt = await res.text();
      try {
        body = JSON.parse(txt);
      } catch {
        body = txt;
      }
    }
    return extractExtrasFromBody(body);
  };

  const statusFromScore = (score) => {
    if (score == null) return "Needs Improvement";
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Poor Fit";
  };

  /**
   * Normalize incoming segments from router state.
   * Force status to Pending and adapted blank.
   */
  const segments = useMemo(() => {
    const raw = Array.isArray(state?.segments)
      ? state.segments
      : Array.isArray(segmentsProp)
      ? segmentsProp
      : [];

    const targetFromTherapy = getTargetLang(therapyArea);

    return (raw || [])
      .map((seg, i) => {
        const index = typeof seg.index === "number" ? seg.index : i + 1;
        const source = String(seg.source ?? "");
        const translated = String(seg.translated ?? "");
        const adapted = "";

        const title =
          seg.title ||
          seg.assetTitle ||
          source.split(/\r?\n/)[0] ||
          `Section ${index}`;
        const words =
          typeof seg.words === "number"
            ? seg.words
            : source.split(/\s+/).filter(Boolean).length;

        return {
          id: seg.id ?? `seg-${index}`,
          index,
          title,
          source,
          translated,
          adapted,
          words,
          status: "Pending",
          lang: seg.lang ?? targetFromTherapy ?? "EN",
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  }, [state?.segments, segmentsProp, therapyArea]);

  /** Selected segment */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);

  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /** ========= UI OVERLAYS (do not mutate base segments) ========= */
  const [segOverrides, setSegOverrides] = useState({}); // { [id]: { adapted?: string, status?: string } }
  const [isAdapting] = useState(false);
  const [adaptError] = useState(null);

  const selectedResolved = useMemo(() => {
    if (!selected) return null;
    const o = segOverrides[selected.id] || {};
    return { ...selected, ...o };
  }, [selected, segOverrides]);

  /** Progress */
  const progressItems = useMemo(() => {
    const total = segments.length || progressItemsProp.total || 0;
    const reviewed = segments.filter((s) => {
      const o = segOverrides[s.id];
      const status = String(o?.status ?? "Pending").toLowerCase();
      return status === "completed" || status === "reviewed";
    }).length;
    return total > 0 ? { reviewed, total } : progressItemsProp;
  }, [segments, segOverrides, progressItemsProp]);

  const progressPct = useMemo(() => {
    const pct = (progressItems.reviewed / Math.max(progressItems.total, 1)) * 100;
    return Math.round(pct);
  }, [progressItems]);

  /** ---------- NEW: Gate modal before entering Draft tab ---------- */
  const [isDraftGateOpen, setIsDraftGateOpen] = useState(false);

  const trySwitchToTab = (nextTab) => {
    if (nextTab === "draft") {
      const total = Math.max(progressItems.total || 0, segments.length);
      const reviewed = progressItems.reviewed || 0;
      if (reviewed < total) {
        // Show the popup and DO NOT switch
        setIsDraftGateOpen(true);
        return;
      }
    }
    setActiveTab(nextTab);
  };

  /** Sidebar navigation */
  const handlePhaseClick = (phaseName) => {
    if (phaseName === "Smart TM Translation") {
      navigate("/smartTMTranslationHub", { state: { projectName, segments } });
    }
    if (phaseName === "Global Context Capture") {
      navigate("/globalAssetCapture", { state: { projectName, segments } });
    }
  };

  /** Complete Phase 3 → next page */
  const handleCompletePhase = () => {
    const mergedSegments = segments.map((s) => {
      const o = segOverrides[s.id] || {};
      return {
        ...s,
        ...(o.adapted !== undefined ? { adapted: o.adapted } : {}),
        ...(o.status !== undefined ? { status: o.status } : {}),
      };
    });

    navigate("/regulatoryCompliance", {
      state: { projectName, segments: mergedSegments },
    });
  };

  /** Mark as Reviewed */
  const handleMarkReviewed = () => {
    if (!selectedResolved) return;
    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        status: "Reviewed",
      },
    }));
  };

  /** Helper: status pill */
  const statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return "completed";
    if (s === "reviewed") return "reviewed";
    if (s === "pending") return "pending";
    return "neutral";
  };

  const TickIcon = ({ className = "" }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  /** ========= AI Analysis Modal ========= */
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisBySegment, setAnalysisBySegment] = useState({}); // cache

  /** Chip selections state (kept for future use; not used for A/B) */
  const [termSelectionsBySeg, setTermSelectionsBySeg] = useState({});

  const buildCulturalPayload = (seg) => {
    const targetLang = getTargetLang(therapyArea);
    return {
      segmentId: seg.id,
      index: seg.index,
      projectName,
      source: seg.source,
      sourceLang: "EN",
      translated: seg.translated,
      targetLang: seg.lang || targetLang,
      meta: { therapyArea, words: seg.words, title: seg.title },
    };
  };

  const handleAnalyzeClick = async () => {
    if (!selectedResolved) return;
    if (!selectedResolved.translated?.trim().length) {
      setAnalysisError("No translated text found for this segment.");
      setIsAnalysisOpen(true);
      return;
    }

    const cached = analysisBySegment[selectedResolved.id];
    if (cached) {
      setAnalysisError(null);
      setIsAnalysisOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsAnalysisOpen(true);

    try {
      if (!N8N_CULTURAL_WEBHOOK_URL) {
        throw new Error("N8N_CULTURAL_WEBHOOK_URL is not configured.");
      }

      const payload = buildCulturalPayload(selectedResolved);

      const res = await fetch(N8N_CULTURAL_WEBHOOK_URL, {
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

      // 1) Existing TPS
      const resForTPS = res.clone();
      const { translation, problem, suggestion } =
        await extractTPSFromResponse(resForTPS);

      // 2) NEW: A/B suggestions and scores (+ overall score if provided)
      const resForExtras = res.clone();
      const { suggestionA, suggestionB, score, scoreA, scoreB } =
        await extractExtrasFromResponse(resForExtras);

      // 3) Legacy/fallback adapted text
      const resForAdapted = res.clone();
      const adaptedFallback = (await extractCulturalTranslated(resForAdapted)).trim();
      const adaptedText = suggestion || adaptedFallback;

      // overallScore preference: explicit "score" -> max(scoreA, scoreB) -> 75
      const computedFromAB = Math.max(scoreA ?? -Infinity, scoreB ?? -Infinity);
      const overallScore =
        typeof score === "number"
          ? score
          : Number.isFinite(computedFromAB)
          ? computedFromAB
          : 75;
      const needsStatus = statusFromScore(overallScore);

      // Build analysis object for modal
      const analysis = {
        segmentId: selectedResolved.id,
        createdAt: new Date().toISOString(),
        overallScore,
        needsStatus,
        sections: [
          {
            id: "tone",
            title: "Cultural Tone & Messaging",
            score: overallScore,
            issues: [
              {
                priority: "Medium",
                translation:
                  (translation && translation.trim()) ||
                  (selectedResolved?.translated?.trim() || ""),
                problem: problem || "—",
                suggestion: adaptedText || "—",
                actions: ["Accept Suggestion", "Flag for Review", "Dismiss"],
              },
            ],
            strengths: [],
          },
        ],
        // Alternatives kept for reference (now rendered inside Terminology Validation panel)
        alternatives: [
          ...(suggestionA
            ? [{ label: "Alternative A", text: suggestionA, score: scoreA ?? null }]
            : []),
          ...(suggestionB
            ? [{ label: "Alternative B", text: suggestionB, score: scoreB ?? null }]
            : []),
        ],
      };

      setAnalysisBySegment((prev) => ({
        ...prev,
        [selectedResolved.id]: analysis,
      }));
    } catch (err) {
      setAnalysisError(err.message || "AI analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedResolved) return;
    setAnalysisBySegment((prev) => {
      const { [selectedResolved.id]: _, ...rest } = prev;
      return rest;
    });
    await handleAnalyzeClick();
  };

  /** Accept suggestion (closes modal) */
  const handleAcceptSuggestion = (suggestionText) => {
    if (!selectedResolved) return;

    const sanitized = String(suggestionText || "").trim();
    if (!sanitized.length) return;

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        adapted: sanitized,
        status: "Pending",
      },
    }));

    setIsAnalysisOpen(false);
  };

  /** Apply selected alternative (keeps modal open) */
  const handleApplyAlternative = (text) => {
    if (!selectedResolved) return;
    const sanitized = String(text || "").trim();
    if (!sanitized.length) return;

    setSegOverrides((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...prev[selectedResolved.id],
        adapted: sanitized,
        status: "Pending",
      },
    }));
  };

  const handleModalReviewedAndContinue = () => {
    handleMarkReviewed();
    setIsAnalysisOpen(false);

    const currentIdx = segments.findIndex((s) => s.id === selectedResolved.id);
    const next = segments[currentIdx + 1];
    if (next) setSelectedId(next.id);
  };

  /** Demo content (kept for look-and-feel in the panel) */
  const defaultTerminologyForScreenshot = [
    {
      id: "term-aids-treatment",
      status: "NEEDS REVIEW",
      termLabel: "“艾滋病治疗”",
      issue:
        "While ‘艾滋病治疗’ (AIDS Treatment) is medically accurate, for a pharmaceutical industry context, emphasizing ‘HIV’ rather than just ‘AIDS’ might be preferred...",
      alternatives: ["HIV治疗", "HIV/AIDS治疗"],
    },
    {
      id: "term-clinical-excellence",
      status: "NEEDS REVIEW",
      termLabel: "“临床卓越”",
      issue:
        "‘临床卓越’ (Clinical Excellence) can be vague; depending on brand messaging, more specific outcome-focused phrasing may be preferred.",
      alternatives: ["卓越的临床成果", "领先的临床实践", "创新的临床治疗"],
    },
  ];

  const defaultVisualGuidance = {
    score: 95,
    imageGuidance: [
      "Ensure any imagery related to treatment avoids stigmatizing representations.",
      "Focus on positive outcomes, patient diversity, and professional healthcare settings.",
      "Avoid overly graphic or emotionally heavy imagery unless required.",
    ],
    designRecommendations: [
      "Maintain a clean, professional layout.",
      "Ensure sufficient white space for readability.",
      "Use legible sans-serif fonts for digital content.",
    ],
  };

  /** Per-segment chip selections (for demo panel above) */
  const segChipSelections =
    termSelectionsBySeg[selectedResolved?.id || ""] || {};

  const setChipSelectionForSeg = (termId, value) => {
    if (!selectedResolved) return;
    setTermSelectionsBySeg((prev) => ({
      ...prev,
      [selectedResolved.id]: {
        ...(prev[selectedResolved.id] || {}),
        [termId]: value,
      },
    }));
  };

  /** ========= DRAFT VIEW LOGIC ========= */
  // Calculate metrics for draft view based on actual progress
  const draftMetrics = useMemo(() => {
    let changesApplied = 0;
    let totalScore = 0;
    let scoredItems = 0;

    segments.forEach((seg) => {
      const o = segOverrides[seg.id] || {};
      const analysis = analysisBySegment[seg.id];

      // Count change if adapted text exists or marked reviewed
      if (o.adapted || o.status === "Reviewed") {
        changesApplied++;
      }

      // Sum scores
      if (analysis && typeof analysis.overallScore === "number") {
        totalScore += analysis.overallScore;
        scoredItems++;
      }
    });

    const avgScore = scoredItems > 0 ? Math.round(totalScore / scoredItems) : 0;

    return {
      segments: segments.length,
      changesApplied,
      flagged: 0, // Placeholder as flagging isn't fully persisted yet
      culturalScore: avgScore || 69, // Default fallback if 0
    };
  }, [segments, segOverrides, analysisBySegment]);

  // Consolidate text for the draft view
  const fullDraftText = useMemo(() => {
    if (!segments.length) return "";
    return segments
      .map((seg) => {
        const o = segOverrides[seg.id] || {};
        // Priority: Adapted -> Translated -> Source
        const content = o.adapted || seg.translated || seg.source;
        return `[Segment ${seg.index}]\n${content}\n`;
      })
      .join("\n");
  }, [segments, segOverrides]);

  /** ========= REPORT VIEW LOGIC ========= */
  const reportItems = useMemo(() => {
    // Build items that the report tab will render
    return segments.map((seg) => {
      const o = segOverrides[seg.id] || {};
      const analysis = analysisBySegment[seg.id];
      const adaptedOrBest = (o.adapted || seg.translated || "").trim();
      const bestText = adaptedOrBest || seg.source;
      return {
        id: seg.id,
        index: seg.index,
        title: seg.title,
        lang: seg.lang || getTargetLang(therapyArea),
        source: seg.source,
        adapted: bestText,
        score: typeof analysis?.overallScore === "number" ? analysis.overallScore : null,
        needsStatus: analysis?.needsStatus || null,
      };
    });
  }, [segments, segOverrides, analysisBySegment, therapyArea]);

  // Local expand/collapse state for report cards
  const [expandedMap, setExpandedMap] = useState({});
  const expandAll = () => {
    const next = {};
    reportItems.forEach((r) => (next[r.id] = true));
    setExpandedMap(next);
  };
  const collapseAll = () => {
    const next = {};
    reportItems.forEach((r) => (next[r.id] = false));
    setExpandedMap(next);
  };
  const toggleExpanded = (id) =>
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));

  // Full report text for clipboard export
  const fullReportText = useMemo(() => {
    if (!reportItems.length) return "No segments available.";
    return reportItems
      .map((r) => {
        const header = `Segment ${r.index}${r.title ? `: ${r.title}` : ""}`;
        const score = r.score != null ? ` [Score: ${r.score}/100]` : "";
        const lang = r.lang ? ` [${r.lang}]` : "";
        return `${header}${score}${lang}\nSource:\n${r.source}\n\nAdapted Translation:\n${r.adapted}\n`;
      })
      .join("\n------------------------------\n\n");
  }, [reportItems]);

  return (
    <div className="tm-app">
      {/* Sidebar */}
      <aside className="tm-sidebar" aria-label="Workflow Phases">
        <div className="tm-sidebar-progress">
          <div className="tm-progress-row">
            <span className="tm-progress-label">Overall Progress</span>
            <span className="tm-progress-value">{progressPct}%</span>
          </div>
          <div className="tm-progress-sub">
            {progressItems.reviewed} of {progressItems.total} reviewed
          </div>
          <div
            className="tm-progress-bar"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <nav className="tm-phases">
          {SIDEBAR_PHASES.map((p) => (
            <button
              key={p.id}
              className={`tm-phase-item ${p.status} ${
                p.name === "Cultural Intelligence" ? "is-active" : ""
              }`}
              aria-label={`Open ${p.name}`}
              onClick={() => handlePhaseClick(p.name)}
            >
              <span className={`tm-phase-icon ${p.iconClass}`} />
              <span className="tm-phase-text">
                <span className="tm-phase-title">{p.name}</span>
                <span className="tm-phase-sub">{p.sub}</span>
              </span>
              {p.status === "done" && (
                <span className="tm-phase-check" aria-hidden={true}>
                  ✓
                </span>
              )}
              {p.name === "Cultural Intelligence" && (
                <span className="tm-phase-dot" aria-hidden={true} />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="tm-main">
        {/* Tabs bar */}
        <section className="tm-tabs-bar">
          <div className="tm-tabs" role="tablist" aria-label="Cultural Intelligence Tabs">
            <button
              className={`tm-tab ${activeTab === "adaptation" ? "is-active" : ""}`}
              onClick={() => trySwitchToTab("adaptation")}
              role="tab"
              aria-selected={activeTab === "adaptation"}
            >
              Cultural Adaptation
            </button>
            <button
              className={`tm-tab ${activeTab === "draft" ? "is-active" : ""}`}
              onClick={() => trySwitchToTab("draft")}
              role="tab"
              aria-selected={activeTab === "draft"}
            >
              Culturally-Adapted Draft
            </button>
            <button
              className={`tm-tab ${activeTab === "report" ? "is-active" : ""}`}
              onClick={() => trySwitchToTab("report")}
              role="tab"
              aria-selected={activeTab === "report"}
            >
              Intelligence Report
            </button>
          </div>

          <div className="tm-tabs-right">
            <div className="tm-saved-banner" aria-live="polite">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#12B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>All changes saved</span>
            </div>

            <div className="tm-tabs-actions">
              <button className="tm-btn primary outline">
                <span className="tm-btn-icon" aria-hidden={true}>
                  📄
                </span>
                Generate Agency Handoff PDF
              </button>
              <button className="tm-btn primary" onClick={handleCompletePhase}>
                Complete Phase 3
              </button>
            </div>
          </div>
        </section>

        {/* Header row */}
        {activeTab === "adaptation" && (
          <section className="tm-header-secondary">
            <div className="tm-header-left">
              <h2 className="tm-page-subtitle">Cultural Adaptation Workspace</h2>
              <span className="tm-light">
                Review translations and adapt content for cultural relevance
              </span>
            </div>
            <div className="tm-header-right-inline">
              <div className="tm-progress-inline">
                <span className="tm-progress-inline-label">Progress:</span>
                <span className="tm-progress-inline-value">
                  {progressItems.reviewed} / {progressItems.total} reviewed
                </span>
                <div className="tm-progress-inline-bar">
                  <div
                    className="tm-progress-inline-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* WORKSPACE CONTENT SWITCHER */}
        {activeTab === "adaptation" ? (
          /* ============= ORIGINAL ADAPTATION VIEW ============= */
          <section className="tm-workspace ci-workspace">
            {/* Left card */}
            <div className="tm-card tm-left">
              <div className="tm-card-header">
                <h3 className="tm-card-title">Content Segments</h3>
                <span className="tm-light">{segments.length} segments to review</span>
              </div>

              <div className="tm-seg-list">
                {segments.map((seg) => {
                  const isSelected = seg.id === selectedId;
                  const o = segOverrides[seg.id] || {};
                  const status = o.status || "Pending";
                  const pillClass = statusPill(status);

                  return (
                    <button
                      key={seg.id}
                      className={`tm-seg-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedId(seg.id)}
                      aria-label={`Open Segment ${seg.index}`}
                    >
                      <div className="tm-seg-item-top">
                        <span className="tm-ci-index">[{seg.index}]</span>
                        <span className={`tm-seg-pill ${pillClass}`}>
                          <TickIcon className="tm-pill-icon" /> {status}
                        </span>
                      </div>

                      <div className="tm-seg-title">{seg.title}</div>
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

            {/* Right card */}
            <div className="tm-card tm-right">
              {!selectedResolved && (
                <div className="tm-empty large">
                  Select a segment on the left to view translation and adapted text.
                  Use <strong>Analyze with AI</strong> to view the deeper analysis in
                  the modal.
                </div>
              )}

              {selectedResolved && (
                <div className="tm-detail">
                  {/* Translation (Target Language) */}
                  <div className="tm-detail-row">
                    <div className="tm-detail-row-left">
                      <span className="tm-chip soft">
                        Translation ({selectedResolved.lang || getTargetLang(therapyArea) || "—"})
                      </span>
                    </div>
                    <div className="tm-detail-row-right">
                      <span className="tm-lang-chip">
                        {selectedResolved.lang || getTargetLang(therapyArea) || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Segment title */}
                  <div className="tm-light" style={{ margin: "4px 0 8px" }}>
                    {selectedResolved.title}
                  </div>

                  {/* Show translation */}
                  <div className="tm-box source" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedResolved.translated?.trim()?.length ? (
                      selectedResolved.translated
                    ) : (
                      <span className="tm-light">— No translation provided —</span>
                    )}
                  </div>

                  {/* Analyze button */}
                  <div className="tm-detail-head" style={{ marginTop: 12 }}>
                    <span className="tm-chip success">Analysis</span>
                    <button
                      className={`tm-btn primary small ${isAnalyzing ? "is-loading" : ""}`}
                      disabled={!selectedResolved.translated?.trim().length || isAnalyzing}
                      aria-label="Analyze translation with AI"
                      onClick={handleAnalyzeClick}
                    >
                      Analyze with AI
                    </button>
                  </div>

                  {/* Culturally Adapted Text */}
                  <div className="tm-detail-head">
                    <span className="tm-chip">Culturally Adapted Text</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="tm-btn primary small"
                        onClick={handleMarkReviewed}
                        aria-label="Mark current segment as reviewed"
                      >
                        Mark as Reviewed
                      </button>
                    </div>
                  </div>

                  <div className="tm-box" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedResolved.adapted?.trim().length ? (
                      selectedResolved.adapted
                    ) : (
                      <span className="tm-light">— Awaiting cultural adaptation —</span>
                    )}
                  </div>

                  {analysisError && (
                    <div className="tm-inline-error" role="alert" style={{ marginTop: 8 }}>
                      {analysisError}
                    </div>
                  )}

                  <div className="tm-detail-tools">
                    <span className="tm-light">TM 0%</span>
                    <div className="tm-detail-spacer" />
                    <button
                      className="tm-btn primary small"
                      onClick={() => {
                        const cached = analysisBySegment[selectedResolved?.id || ""];
                        if (cached) {
                          setAnalysisError(null);
                          setIsAnalysisOpen(true);
                        } else {
                          // If no cached analysis, run it so the modal shows meaningful content
                          handleAnalyzeClick();
                        }
                      }}
                    >
                      View TM Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : activeTab === "draft" ? (
          /* ============= NEW CULTURALLY-ADAPTED DRAFT VIEW ============= */
          <div className="tm-draft-container">
            <div className="tm-draft-header-section">
              <h2 className="tm-page-subtitle">Culturally-Adapted Draft Translation</h2>
              <span className="tm-light">
                Consolidated culturally-adapted content ready for final review
              </span>
            </div>

            {/* Metrics Cards */}
            <div className="tm-draft-metrics">
              <div className="tm-metric-card">
                <span className="tm-metric-value blue">{draftMetrics.segments}</span>
                <span className="tm-metric-label">Segments</span>
              </div>
              <div className="tm-metric-card">
                <span className="tm-metric-value green">{draftMetrics.changesApplied}</span>
                <span className="tm-metric-label">Changes Applied</span>
              </div>
              <div className="tm-metric-card">
                <span className="tm-metric-value orange">{draftMetrics.flagged}</span>
                <span className="tm-metric-label">Flagged for Review</span>
              </div>
              <div className="tm-metric-card">
                <span className="tm-metric-value dark">{draftMetrics.culturalScore}</span>
                <span className="tm-metric-label">Cultural Score</span>
              </div>
            </div>

            {/* Main Draft Content */}
            <div className="tm-draft-main-card">
              <div className="tm-draft-card-head">
                <h3 className="tm-card-title">Final Culturally-Adapted Translation</h3>
                <div className="tm-draft-actions">
                  {/* <button className="tm-btn outline small">
                    <span className="icon-magic">✨</span> Regenerate
                  </button> */}
                  <button
                    className="tm-btn outline small"
                    onClick={() => navigator.clipboard.writeText(fullDraftText)}
                  >
                    <span className="icon-copy">❐</span> Copy to Clipboard
                  </button>
                </div>
              </div>
              <div className="tm-draft-text-area">
                <pre>{fullDraftText}</pre>
              </div>
            </div>

            {/* Summary Panel (Collapsible placeholder) */}
            <div className="tm-draft-summary-card">
              <h3 className="tm-card-title">Cultural Adaptation Summary</h3>
            </div>
          </div>
        ) : (
          /* ============= NEW INTELLIGENCE REPORT VIEW ============= */
          <div className="tm-report-container">
            {/* Header */}
            <div className="tm-report-header">
              <h2 className="tm-page-subtitle">Cultural Intelligence Report</h2>
              <span className="tm-light">
                Comprehensive analysis of cultural adaptations
              </span>

              <div className="tm-report-actions">
                <button
                  className="tm-btn outline small"
                  onClick={() => navigator.clipboard.writeText(fullReportText)}
                  title="Copy the full report to clipboard"
                >
                  ❐ Copy Full Report
                </button>
                <button className="tm-btn outline small" onClick={expandAll} title="Expand all">
                  ⤢ Expand All
                </button>
                <button
                  className="tm-btn outline small"
                  onClick={collapseAll}
                  title="Collapse all"
                >
                  ⤡ Collapse All
                </button>
              </div>
            </div>

            {/* Report List */}
            <div className="tm-report-list">
              {reportItems.map((r) => {
                const expanded = expandedMap[r.id] ?? true;

                const scoreBadgeClass =
                  r.score == null
                    ? "gray"
                    : r.score >= 90
                    ? "green"
                    : r.score >= 75
                    ? "blue"
                    : r.score >= 60
                    ? "orange"
                    : "red";

                return (
                  <div key={r.id} className="tm-report-card">
                    <div className="tm-report-card-head">
                      <div className="tm-report-card-title-wrap">
                        <div className="tm-report-card-title">Segment {r.index}</div>
                        {/* {r.title && (
                          <div className="tm-report-card-subtitle tm-light">
                            {r.title}
                          </div>
                        )} */}
                      </div>

                      <div className="tm-report-card-tools">
                        <span className={`tm-mini-score ${scoreBadgeClass}`}>
                          {r.score != null ? r.score : "—"}
                        </span>
                        <span className="tm-lang-chip" title="Target language">
                          {r.lang || getTargetLang(therapyArea) || "—"}
                        </span>

                        <button
                          className="tm-btn ghost small"
                          title="Copy adapted text"
                          onClick={() => navigator.clipboard.writeText(r.adapted || "")}
                        >
                          Copy
                        </button>
                        <button
                          className="tm-btn ghost small"
                          onClick={() => toggleExpanded(r.id)}
                          aria-expanded={expanded}
                          aria-controls={`report-body-${r.id}`}
                          title={expanded ? "Collapse" : "Expand"}
                        >
                          {expanded ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="tm-report-card-body" id={`report-body-${r.id}`}>
                        {/* Source */}
                        <div className="tm-report-block">
                          <div className="tm-report-label">Source</div>
                          <div className="tm-report-content" style={{ whiteSpace: "pre-wrap" }}>
                            {r.source || <span className="tm-light">—</span>}
                          </div>
                        </div>

                        {/* Adapted Translation */}
                        <div className="tm-report-block">
                          <div className="tm-report-label">
                            Adapted Translation
                          </div>
                          <div className="tm-report-content" style={{ whiteSpace: "pre-wrap" }}>
                            {r.adapted?.trim()?.length ? (
                              r.adapted
                            ) : (
                              <span className="tm-light">— No adapted text—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {reportItems.length === 0 && (
                <div className="tm-empty large">No segments to report.</div>
              )}
            </div>
          </div>
        )}

        {/* ---------- DRAFT GATE MODAL (before opening "Draft" tab) ---------- */}
        <Modal
          open={isDraftGateOpen}
          onClose={() => setIsDraftGateOpen(false)}
          ariaLabel="Draft Not Generated Yet"
        >
          <div className="draft-gate-card">
            <div className="draft-gate-icon" aria-hidden>📄</div>
            <h3 className="draft-gate-title">Draft Not Generated Yet</h3>
            <div className="draft-gate-sub tm-light">
              Complete all segment reviews to generate the final culturally‑adapted draft
            </div>

            <div className="draft-gate-counter">
              <strong>{progressItems.reviewed}</strong>{" "}
              <span className="tm-light">of</span>{" "}
              <strong>{progressItems.total}</strong>{" "}
              <span className="tm-light">segments reviewed</span>
            </div>

            <div
              className="tm-progress-bar draft-gate-progress"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="tm-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="draft-gate-actions">
              {/* <button className="tm-btn outline" onClick={() => setIsDraftGateOpen(false)}>
                Back
              </button> */}

              {/* To allow "Proceed anyway", remove the disabled prop below */}
              {/* <button
                className="tm-btn primary"
                onClick={() => {
                  const total = Math.max(progressItems.total || 0, segments.length);
                  const reviewed = progressItems.reviewed || 0;
                  if (reviewed >= total) {
                    setIsDraftGateOpen(false);
                    setActiveTab("draft");
                  }
                }}
                disabled={progressItems.reviewed < Math.max(progressItems.total || 0, segments.length)}
                title={
                  progressItems.reviewed < Math.max(progressItems.total || 0, segments.length)
                    ? "Complete all reviews to continue"
                    : "Open Draft"
                }
              >
                Open Draft
              </button> */}
            </div>
          </div>
        </Modal>

        {/* ---------- AI Analysis Modal ---------- */}
        <Modal
          open={isAnalysisOpen}
          onClose={() => setIsAnalysisOpen(false)}
          ariaLabel={`AI Cultural Analysis - ${
            selectedResolved ? `Segment ${selectedResolved.index}` : ""
          }`}
        >
          <div className="ai-modal-header">
            <span className="tm-chip soft">
              🧠 AI Cultural Analysis -{" "}
              {selectedResolved ? `Segment ${selectedResolved.index}` : ""}
            </span>
            {selectedResolved && (
              <div className="tm-light" style={{ marginTop: 4 }}>
                {selectedResolved.title}
              </div>
            )}
          </div>

          <div className="ai-summary">
            {isAnalyzing && <div className="tm-loading">Analyzing…</div>}
            {analysisError && (
              <div className="tm-inline-error" role="alert">
                {analysisError}
              </div>
            )}

            {!isAnalyzing &&
              !analysisError &&
              selectedResolved &&
              analysisBySegment[selectedResolved.id] && (
                <>
                  {(() => {
                    const analysis = analysisBySegment[selectedResolved.id];

                    return (
                      <>
                        {/* Overall */}
                        <div className="ai-overall">
                          <div className="ai-overall-left">
                            <div className="ai-overall-label">Overall Score</div>
                            <div className="ai-overall-score">
                              <span className="ai-score-number">
                                {analysis.overallScore}
                              </span>
                              <span className="ai-score-total">/100</span>
                            </div>
                          </div>
                          <div className="ai-overall-right">
                            <span
                              className={`ai-status-badge ${
                                analysis.needsStatus
                                  ? analysis.needsStatus.replace(/\s+/g, "-").toLowerCase()
                                  : ""
                              }`}
                            >
                              {analysis.needsStatus || "—"}
                            </span>
                          </div>
                        </div>

                        {/* Sections (translation/problem/suggestion) */}
                        <div className="ai-sections">
                          {Array.isArray(analysis.sections) &&
                          analysis.sections.length > 0 ? (
                            analysis.sections.map((sec) => (
                              <div key={sec.id} className="ai-section">
                                <div className="ai-section-head">
                                  <span className="tm-chip">{sec.title}</span>
                                  <div className="ai-section-score">
                                    <span>{sec.score ?? "--"}/100</span>
                                  </div>
                                </div>

                                {Array.isArray(sec.issues) &&
                                  sec.issues.map((issue, idx) => (
                                    <div key={idx} className="ai-issue-card">
                                      <div className="ai-issue-meta">
                                        <span className="ai-issue-priority">
                                          {issue.priority?.toUpperCase()} PRIORITY ISSUE
                                        </span>
                                      </div>

                                      <div className="ai-issue-block">
                                        <div className="ai-issue-label">Translation:</div>
                                        <div className="ai-issue-content">
                                          {issue.translation?.trim()?.length
                                            ? issue.translation
                                            : selectedResolved?.translated?.trim()?.length
                                            ? selectedResolved.translated
                                            : "— No translation provided —"}
                                        </div>
                                      </div>

                                      <div className="ai-issue-block">
                                        <div className="ai-issue-label">Problem:</div>
                                        <div className="ai-issue-content">
                                          {issue.problem || "—"}
                                        </div>
                                      </div>

                                      <div className="ai-issue-block">
                                        <div className="ai-issue-label">Suggestion</div>
                                        <div className="ai-issue-content">
                                          {issue.suggestion || "—"}
                                        </div>
                                      </div>

                                      <div className="ai-issue-actions">
                                        <button
                                          className="tm-btn primary"
                                          onClick={() =>
                                            handleAcceptSuggestion(issue.suggestion)
                                          }
                                        >
                                          Accept Suggestion
                                        </button>
                                        <button className="tm-btn outline">
                                          Flag for Review
                                        </button>
                                        <button className="tm-btn ghost">Dismiss</button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ))
                          ) : (
                            <div className="tm-light">No section details provided.</div>
                          )}
                        </div>

                        {/* Terminology Validation (shows suggestionA/B) */}
                        <TerminologyValidationPanel
                          score={analysis.overallScore}
                          altList={Array.isArray(analysis.alternatives) ? analysis.alternatives : []}
                          onApplyAlt={(text) => handleApplyAlternative(text)}
                          selectedMap={segChipSelections}
                          onSelectChip={(termId, val) => setChipSelectionForSeg(termId, val)}
                        />

                        {/* Modal actions */}
                        <div className="ai-footer-actions">
                          <button
                            className="tm-btn primary outline"
                            onClick={() => setIsAnalysisOpen(false)}
                          >
                            Close
                          </button>
                          <button className="tm-btn primary" onClick={handleReanalyze}>
                            Re-analyze
                          </button>
                          <button
                            className="tm-btn primary"
                            onClick={handleModalReviewedAndContinue}
                          >
                            Mark as Reviewed &amp; Continue
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

/* Sidebar phases */
const SIDEBAR_PHASES = [
  {
    id: 1,
    name: "Global Context Capture",
    sub: "Source content analysis",
    status: "done",
    iconClass: "icon-context",
  },
  {
    id: 2,
    name: "Smart TM Translation",
    sub: "AI-powered translation",
    status: "done",
    iconClass: "icon-translation",
  },
  {
    id: 3,
    name: "Cultural Intelligence",
    sub: "Cultural adaptation",
    status: "active",
    iconClass: "icon-culture",
  },
  {
    id: 4,
    name: "Regulatory Compliance",
    sub: "Compliance validation",
    status: "todo",
    iconClass: "icon-compliance",
  },
  {
    id: 5,
    name: "Quality Intelligence",
    sub: "Quality assurance",
    status: "todo",
    iconClass: "icon-quality",
  },
  {
    id: 6,
    name: "DAM Integration",
    sub: "Asset packaging",
    status: "todo",
    iconClass: "icon-dam",
  },
  {
    id: 7,
    name: "Integration Lineage",
    sub: "System integration",
    status: "todo",
    iconClass: "icon-integration",
  },
];

/** ========= Simple Reusable Modal ========= */
function Modal({ open, onClose, children, ariaLabel = "Dialog" }) {
  if (!open) return null;
  return (
    <div
      className="tm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="tm-modal">
        <div className="tm-modal-body">{children}</div>
        <div className="tm-modal-footer">
          <button className="tm-btn outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** ================= Panels ================= */

/**
 * TerminologyValidationPanel
 * - Renders A/B alternatives as "term cards", each with its score and "Apply" button.
 * - Shows A/B scores in the header next to the main score.
 */
function TerminologyValidationPanel({
  score = 80,
  items = [],
  altList = [], // [{ label: "Alternative A", text: "...", score: 92 }, ...]
  selectedMap = {},
  onSelectChip,
  onApplyAlt,
}) {
  const hasAB = Array.isArray(altList) && altList.length > 0;

  return (
    <div className="ai-addon-card">
      <div className="ai-addon-head">
        <div className="ai-addon-title">
          <span className="ai-icon" aria-hidden>
            📘
          </span>
          <h3>Terminology Validation</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Main panel score */}
          <div className="ai-score-badge">
            <strong>{score}</strong>/100
          </div>
          {/* NEW: A/B small score chips in header */}
          {hasAB &&
            altList.map((alt, i) => (
              <span key={i} className="tm-chip soft" title={`${alt.label} Score`}>
                {alt.label.replace("Alternative ", "")}: {alt.score ?? "—"}/100
              </span>
            ))}
        </div>
      </div>

      {/* Approved Terms (unchanged demo row) */}
      <div className="ai-approved-wrap">
        <div className="ai-approved-bar">
          <span className="ai-approved-icon" aria-hidden>
            ✓
          </span>
          <span className="ai-approved-text">Approved Terms:</span>
          <div className="ai-approved-chips">
            <span className="tm-chip soft">艾滋病</span>
            <span className="tm-chip soft">临床</span>
            <span className="tm-chip soft">治疗</span>
          </div>
        </div>
      </div>

      <div className="ai-term-list">
        {/* ===== NEW: Render suggestionA/suggestionB as first two "terms" ===== */}
        {hasAB &&
          altList.map((alt, idx) => (
            <div key={`alt-${idx}`} className="ai-term-card">
              <div className="ai-term-badge-row">
                <span className="ai-needs-badge">⚠ NEEDS REVIEW</span>
              </div>

              {/* Treat label as "Term" display to match the screenshot structure */}
              <div
                className="ai-term-label"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <strong>Term:</strong>
                <span>{alt.label}</span>
                {/* Show score next to term label */}
                <span className="tm-chip soft" title="Cultural fit score">
                  Score: {alt.score ?? "—"}/100
                </span>
              </div>

              {/* Show the suggestion text itself */}
              <div className="ai-term-issue" style={{ marginTop: 8 }}>
                <strong>Suggestion:</strong>&nbsp;{alt.text || "—"}
              </div>

              {/* Actions: Apply this alternative */}
              <div className="ai-term-actions">
                <button
                  className="tm-btn primary"
                  onClick={() => onApplyAlt?.(alt.text)}
                  disabled={!alt.text}
                  title={alt.text ? `Apply ${alt.label}` : "No text to apply"}
                >
                  Apply {alt.label}
                </button>
                <button className="tm-btn outline">Flag for Review</button>
                <button className="tm-btn ghost">Dismiss</button>
              </div>
            </div>
          ))}

        {/* ===== Keep your original demo terms/cards below ===== */}
        {items.map((t) => {
          const selected = selectedMap?.[t.id] || "";
          return (
            <div key={t.id} className="ai-term-card">
              <div className="ai-term-badge-row">
                <span className="ai-needs-badge">⚠ NEEDS REVIEW</span>
              </div>

              <div className="ai-term-label">
                <strong>Term:</strong>&nbsp;{t.termLabel}
              </div>

              <div className="ai-term-issue">
                <strong>Issue:</strong>&nbsp;{t.issue}
              </div>

              <div className="ai-alt-block">
                <div className="ai-small-label">Approved Alternatives:</div>
                <div className="ai-alt-chips">
                  {t.alternatives.map((opt) => {
                    const isSel = selected === opt;
                    return (
                      <button
                        key={opt}
                        className={`tm-chip ${isSel ? "success is-selected" : "soft"}`}
                        onClick={() => onSelectChip?.(t.id, isSel ? "" : opt)}
                        aria-pressed={isSel}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ai-term-actions">
                <button
                  className="tm-btn primary"
                  onClick={() => onApplyAlt?.(selected)}
                  disabled={!selected}
                  title={selected ? `Apply "${selected}"` : "Select an alternative to enable"}
                >
                  Apply Selected Alternative
                </button>
                <button className="tm-btn primary outline">Flag for Review</button>
                <button className="tm-btn primary ghost">Dismiss All</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Visual & Color Guidance (unchanged) */
function VisualColorGuidancePanel({ data }) {
  const score = data?.score ?? 95;
  const imageGuidance = data?.imageGuidance || [];
  const designRecommendations = data?.designRecommendations || [];

  return (
    <div className="ai-addon-card">
      <div className="ai-addon-head">
        <div className="ai-addon-title">
          <span className="ai-icon" aria-hidden>
            🎨
          </span>
          <h3>Visual &amp; Color Guidance</h3>
        </div>
        <div className="ai-score-badge">
          <strong>{score}</strong>/100
        </div>
      </div>

      <div className="ai-subsection">
        <div className="ai-subtitle">
          <span className="ai-bullet-icon" aria-hidden>
            💡
          </span>
          Image Guidance:
        </div>
        <ul className="ai-bullets">
          {imageGuidance.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>

      <div className="ai-subsection">
        <div className="ai-subtitle">
          <span className="ai-bullet-icon" aria-hidden>
            📐
          </span>
          Design Recommendations:
        </div>
        <ul className="ai-bullets">
          {designRecommendations.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

