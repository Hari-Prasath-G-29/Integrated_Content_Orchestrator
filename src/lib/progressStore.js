
// src/lib/progressStore.js
const STORAGE_KEY = 'glocal_progress_v1';

export const PHASES = [
  { id: 'P1', label: 'P1', display: 'Global Context Capture', route: '/globalAssetCapture' },
  { id: 'P2', label: 'P2', display: 'Smart TM Translation', route: '/smartTMTranslationHub' },
  { id: 'P3', label: 'P3', display: 'Cultural Intelligence', route: '/culturalAdaptationWorkspace' },
  { id: 'P4', label: 'P4', display: 'Regulatory Compliance', route: '/regulatoryCompliance' },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function emitProgressUpdated() {
  try {
    queueMicrotask(() => {
      window.dispatchEvent(new Event('glocal_progress_updated'));
    });
  } catch {
    setTimeout(() => {
      try { window.dispatchEvent(new Event('glocal_progress_updated')); } catch {}
    }, 0);
  }
}

function save(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
  emitProgressUpdated(); // ✅ notify same-tab UI
}

function normPhaseId(id) {
  return String(id || '').trim().toUpperCase();
}

/**
 * Shape in storage:
 * { [projectId]: { id, meta: {...}, completed: ['P1','P2',...], startedAt, lastUpdated } }
 */
export function upsertProject(project) {
  const db = load();
  const existing = db[project.id];
  db[project.id] = {
    id: project.id,
    meta: { ...(existing?.meta || {}), ...(project.meta || {}) },
    completed: existing?.completed || [],
    startedAt: existing?.startedAt || Date.now(),
    lastUpdated: Date.now(),
  };
  save(db);
}

export function updateProjectMeta(projectId, metaPatch) {
  const db = load();
  if (!db[projectId]) return;
  db[projectId].meta = { ...(db[projectId].meta || {}), ...(metaPatch || {}) };
  db[projectId].lastUpdated = Date.now();
  save(db);
}

export function markPhaseComplete(projectId, phaseId) {
  const db = load();
  if (!db[projectId]) return;
  const set = new Set((db[projectId].completed || []).map(normPhaseId));
  set.add(normPhaseId(phaseId));
  db[projectId].completed = Array.from(set);
  db[projectId].lastUpdated = Date.now();
  save(db);
}

export function markPhaseIncomplete(projectId, phaseId) {
  const db = load();
  if (!db[projectId]) return;
  const norm = normPhaseId(phaseId);
  db[projectId].completed = (db[projectId].completed || [])
    .map(normPhaseId)
    .filter(p => p !== norm);
  db[projectId].lastUpdated = Date.now();
  save(db);
}

export function deleteProject(projectId) {
  const db = load();
  if (db[projectId]) {
    delete db[projectId];
    save(db);
  }
}

export function getProject(projectId) {
  const db = load();
  return db[projectId] || null;
}
export function getAllProjects() {
  const db = load();
  return Object.values(db);
}

export function computeProgress(record) {
  const total = PHASES.length;
  const completedSet = new Set((record?.completed || []).map(normPhaseId));
  const doneCount = completedSet.size;
  const nextPhase = PHASES.find(p => !completedSet.has(normPhaseId(p.id))) || null;
  return { completedSet, doneCount, total, nextPhase };
}


/**
 * Mark (or unmark) that the P2 draft was generated for this project.
 * Optionally store segmentsP2 in the same update to keep things consistent.
 */
export function setP2DraftGenerated(projectId, generated = true, { segmentsP2 } = {}) {
  const patch = {
    p2DraftGenerated: !!generated,
    p2DraftGeneratedAt: generated ? new Date().toISOString() : null,
  };
  if (Array.isArray(segmentsP2)) patch.segmentsP2 = segmentsP2;
  updateProjectMeta(projectId, patch);
}

/**
 * Reset P2 draft state for a brand-new asset flow (called right after P1 completes).
 * This makes the banner eligible to show again for the new project/asset.
 */
export function resetP2DraftState(projectId) {
  updateProjectMeta(projectId, {
    p2DraftGenerated: false,
    p2DraftGeneratedAt: null,
    p2BannerDismissed: false, // optional if you add a "Dismiss" button later
  });

  // If you had a localStorage fallback key, clear it here too:
  try { localStorage.removeItem(`p2_draft_generated_${projectId}`); } catch {}
}

/**
 * Read-only convenience to check current P2 draft state.
 */
export function readP2DraftState(projectId) {
  const rec = getProject(projectId);
  return {
    generated: !!rec?.meta?.p2DraftGenerated,
    generatedAt: rec?.meta?.p2DraftGeneratedAt || null,
  };
}

/**
 * Optional: ensure a project record exists (useful if you sometimes arrive with an ID but no record yet)
 */
export function ensureProject(projectId, initialMeta = {}) {
  const db = load();
  if (!db[projectId]) {
    db[projectId] = {
      id: projectId,
      meta: initialMeta,
      completed: [],
      startedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    save(db);
  }
  return db[projectId];
}
