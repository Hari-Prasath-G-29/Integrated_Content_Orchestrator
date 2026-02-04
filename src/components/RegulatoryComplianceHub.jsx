import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

/**
 * Regulatory Compliance Workspace
 * - Run Compliance Check: posts adapted text to n8n and DISPLAYS returned items under Critical Issues.
 * - Critical Issues show ONLY n8n results.
 * - Recommended Changes show ONLY recommendation1 and recommendation2 from n8n.
 * - All other UI/sections/buttons remain unchanged.
 */
export default function RegulatoryComplianceWorkspace({
  projectName: projectNameProp = "No project name to display",
  therapyArea = "Respiratory · DE",
  segments: segmentsProp = [],
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  const projectName = state?.projectName ?? projectNameProp;

  // ===== n8n Endpoint (configure via env) =====
  const N8N_COMPLIANCE_URL =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_N8N_COMPLIANCE_URL) ||
    process.env.REACT_APP_N8N_COMPLIANCE_URL ||
    "http://172.16.4.237:8010/webhook/regulatory";

  /* ================= LANGUAGE HELPERS ================= */
  const getTargetLang = (therapyAreaStr) => {
    const m = String(therapyAreaStr || "").match(/·\s*([A-Za-z-]+)/);
    return m?.[1] || "DE";
  };

  /* ================= SEGMENTS NORMALIZATION ================= */
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
        const adapted = String(seg.adapted ?? ""); // from Phase 3
        const title =
          seg.title ||
          seg.assetTitle ||
          source.split(/\r?\n/)[0] ||
          `Segment ${index}`;
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
          lang: seg.lang ?? targetFromTherapy ?? "EN",
          status: seg.status ?? "Pending", // Pending | Approved | Flagged
        };
      })
      .filter((s) => s.source.trim().length > 0)
      .sort((a, b) => a.index - b.index);
  }, [state?.segments, segmentsProp, therapyArea]);

  /* ================= SELECTION ================= */
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && segments.length) setSelectedId(segments[0].id);
  }, [segments, selectedId]);

  const selected = useMemo(
    () => segments.find((s) => s.id === selectedId) || null,
    [segments, selectedId]
  );

  /* ================= PER-SEGMENT OVERRIDES ================= */
  const [segOverrides, setSegOverrides] = useState({});
  const selectedResolved = useMemo(() => {
    if (!selected) return null;
    return { ...selected, ...(segOverrides[selected.id] || {}) };
  }, [selected, segOverrides]);

  const currentSegOverride = segOverrides[selectedResolved?.id] || {};

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

  /* ================= Render ================= */
  return (
    <div className="rc-shell">
      {/* LEFT WIZARD RAIL */}
      <aside className="rc-rail" aria-label="Overall progress and workflow">
        <div className="rc-rail-progress">
          <div className="rc-rail-title">Overall Progress</div>
          <div className="rc-rail-sub">
            {Math.max(approvedCount, 0)} / {Math.max(totalCount, 0)} pieces completed
          </div>
          <div
            className="rc-rail-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="rc-rail-fill" style={{ width: `${progressPct}%` }} />
            <span className="rc-rail-pct">{progressPct}%</span>
          </div>
        </div>

        <nav className="rc-rail-steps">
          {[
            "Global Content Capture",
            "Smart TM Translation",
            "Cultural Intelligence",
            "Regulatory Compliance",
            "Quality Intelligence",
            "DRM Integration",
            "Integration Lineage",
          ].map((label, idx) => {
            const active = label === "Regulatory Compliance";
            const done = idx < 3; // cosmetic
            return (
              <button
                key={label}
                className={`rc-rail-step ${active ? "is-active" : ""} ${
                  done ? "is-done" : ""
                }`}
                type="button"
                title={label}
              >
                <span className="rc-rail-dot" aria-hidden />
                <span className="rc-rail-label">{label}</span>
                {done && (
                  <span className="rc-rail-check" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN WORKSPACE COLUMN */}
      <div className="rc-workspace">
        {/* TOP BAR */}
        <div className="rc-topbar">
          <div className="rc-topbar-row">
            <div className="rc-breadcrumbs">
              <button className="rc-link" onClick={goBack}>
                Main Hub
              </button>
              <span className="rc-bc-sep">›</span>
              <button className="rc-link">Globalization Hub</button>
              <span className="rc-bc-sep">›</span>
              <span className="rc-project">{projectName}</span>
              <span className="rc-tag">{therapyArea}</span>
            </div>
            <div className="rc-top-actions">
              <button className="rc-btn ghost">Save</button>
              <button className="rc-btn ghost">Focus</button>
            </div>
          </div>

          <div className="rc-subtabs">
            <button
              className={mainTab === "review" ? "active" : ""}
              onClick={() => setMainTab("review")}
            >
              Compliance Review
            </button>
            <button
              className={mainTab === "report" ? "active" : ""}
              onClick={() => setMainTab("report")}
            >
              Compliance Report
            </button>
            <button
              className={mainTab === "intel" ? "active" : ""}
              onClick={() => setMainTab("intel")}
            >
              Regulatory Intelligence
            </button>
          </div>
        </div>

        {/* HEADER (title + progress) */}
        <header className="rc-header rc-header--screen">
          <div className="rc-header-left">
            <h2 className="rc-title">Regulatory Compliance Workspace</h2>
            <span className="rc-sub">
              Review culturally adapted content for regulatory compliance and market
              requirements
            </span>
          </div>
          <div className="rc-header-right">
            <div className="rc-progress-wrap">
              <span className="rc-progress-label">
                Progress: {approvedCount} / {totalCount} approved
              </span>
              <div
                className="rc-progressbar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
              >
                <div
                  className="rc-progressbar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT: TABS */}
        {mainTab === "review" && (
          <div className="rc-main">
            {/* LEFT: Content Segments */}
            <aside className="rc-left">
              <div className="rc-left-head">
                <div className="rc-left-title">Content Segments</div>
                <div className="rc-left-sub">{segments.length} segments to review</div>
              </div>

              <div className="rc-seg-list">
                {segments.map((seg) => {
                  const isSelected = seg.id === selectedId;
                  const o = segOverrides[seg.id] || {};
                  const st = String(o.status ?? seg.status ?? "Pending").toLowerCase();
                  const approved = st === "approved";
                  return (
                    <button
                      key={seg.id}
                      className={`rc-seg-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedId(seg.id)}
                    >
                      <div className="rc-seg-top">
                        <div className="rc-seg-index">Segment {seg.index}</div>
                        {approved && <span className="rc-check">✓</span>}
                      </div>

                      <div className="rc-seg-title" title={seg.title}>
                        {seg.title}
                      </div>

                      <div className="rc-seg-bottom">
                        <span className="rc-chip low">low</span>
                        <span className="rc-lang-chip" title="Target language">
                          {seg.lang || getTargetLang(therapyArea)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {segments.length === 0 && (
                  <div className="rc-empty">No segments to display.</div>
                )}
              </div>
            </aside>

            {/* RIGHT: Details */}
            <section className="rc-right">
              {!selectedResolved ? (
                <div className="rc-empty large">
                  Select a segment to view and run compliance checks.
                </div>
              ) : (
                <>
                  {/* Source Text */}
                  <div className="rc-card">
                    <div className="rc-card-head">
                      <div className="rc-card-title">Source Text</div>
                    </div>
                    <div className="rc-box rc-muted">
                      <pre className="rc-pre">{selectedResolved.source}</pre>
                    </div>
                  </div>

                  {/* Culturally Adapted Text (Phase 3) */}
                  <div className="rc-card">
                    <div className="rc-card-head">
                      <div className="rc-card-title">Culturally Adapted Text (Phase 3)</div>
                      <div className="rc-card-actions">
                        <div className="rc-score">
                          <span className="rc-score-label">Score</span>{" "}
                          <span className="rc-score-value">—</span>
                        </div>
                        <button
                          className="rc-btn primary"
                          onClick={openAnalysisModal}
                          disabled={!selectedResolved.adapted?.trim() || isAnalyzing}
                          title={
                            selectedResolved.adapted?.trim()
                              ? "Open Compliance Analysis"
                              : "No adapted text to check"
                          }
                        >
                          {isAnalyzing ? "Analyzing…" : "Run Compliance Check"}
                        </button>
                      </div>
                    </div>

                    <div className="rc-box rc-blue">
                      <pre className="rc-pre">
                        {selectedResolved.adapted?.trim()
                          ? selectedResolved.adapted
                          : "— No adapted text —"}
                      </pre>
                    </div>
                  </div>

                  {/* Regulatory Compliant Text */}
                  <div className="rc-card">
                    <div className="rc-card-head">
                      <div className="rc-card-title">Regulatory Compliant Text</div>
                      <div className="rc-card-actions">
                        <button className="rc-btn ghost" onClick={handleFlag}>
                          Flag for Review
                        </button>
                        <button className="rc-btn success" onClick={handleApprove}>
                          Approve
                        </button>
                      </div>
                    </div>
                    <div className="rc-textarea-wrap">
                      <textarea
                        className="rc-textarea"
                        placeholder="Enter or edit the final compliant text here…"
                        value={compliantEditorValue}
                        onChange={(e) => setCompliantEditorValue(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
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
