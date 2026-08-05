import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, X, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

const ACCENT = "#754F5B";
const ACCENT_TINT = "#F9E0D9";
const ACCENT_DARK = "#5D4954";
const INK = "#5D4954";
const MUTED = "#7D6167";
const BORDER = "#E6DBD0";
const BORDER_STRONG = "#d8c4bb";
const SURFACE_TINT = "#FBF2EE";

const STATUS = {
  upcoming: { label: "Upcoming", color: "#d98e04", bg: "#fbf1de" },
  awaiting: { label: "Awaiting result", color: "#0f7173", bg: "#e3f1f0" },
  cleared: { label: "Cleared", color: "#2563a8", bg: "#e6eff8" },
  offer: { label: "Offer", color: "#1f7a4d", bg: "#e6f2ea" },
  rejected: { label: "Rejected", color: "#b3401f", bg: "#f8e8e3" },
};

const ROUND_SUGGESTIONS = [
  "Online Assessment",
  "Aptitude Test",
  "Technical Interview 1",
  "Technical Interview 2",
  "HR Interview",
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function companyStatus(rounds) {
  if (!rounds.length) return null;
  if (rounds.some((r) => r.status === "rejected")) return "rejected";
  if (rounds.some((r) => r.status === "offer")) return "offer";
  return "active";
}

export default function PlacementTracker() {
  const [companies, setCompanies] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("companies");
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [addingRoundFor, setAddingRoundFor] = useState(null);
  const [roundDraft, setRoundDraft] = useState({ type: "", date: "" });
  const [clearPrompt, setClearPrompt] = useState({});
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("companies", false);
        if (res && res.value) setCompanies(JSON.parse(res.value));
      } catch (e) {
        // no saved data yet
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("companies", JSON.stringify(companies), false);
      } catch (e) {
        console.error("save failed", e);
      }
    })();
  }, [companies, loaded]);

  function addCompany() {
    const name = newCompanyName.trim();
    if (!name) return;
    setCompanies((cs) => [...cs, { id: uid(), name, rounds: [] }]);
    setNewCompanyName("");
    setAddingCompany(false);
  }

  function deleteCompany(id) {
    setCompanies((cs) => cs.filter((c) => c.id !== id));
    setConfirmDeleteCompany(null);
  }

  function startAddRound(companyId) {
    setAddingRoundFor(companyId);
    setRoundDraft({ type: "", date: "" });
  }

  function addRound(companyId) {
    if (!roundDraft.type.trim() || !roundDraft.date) return;
    setCompanies((cs) =>
      cs.map((c) =>
        c.id === companyId
          ? {
              ...c,
              rounds: [
                ...c.rounds,
                { id: uid(), type: roundDraft.type.trim(), date: roundDraft.date, status: "upcoming" },
              ].sort((a, b) => a.date.localeCompare(b.date)),
            }
          : c
      )
    );
    setAddingRoundFor(null);
    setRoundDraft({ type: "", date: "" });
  }

  function deleteRound(companyId, roundId) {
    setCompanies((cs) =>
      cs.map((c) => (c.id === companyId ? { ...c, rounds: c.rounds.filter((r) => r.id !== roundId) } : c))
    );
  }

  function setRoundStatus(companyId, roundId, status) {
    setCompanies((cs) =>
      cs.map((c) => {
        if (c.id !== companyId) return c;
        return { ...c, rounds: c.rounds.map((r) => (r.id === roundId ? { ...r, status } : r)) };
      })
    );
    if (status === "rejected") {
      const company = companies.find((c) => c.id === companyId);
      const hasPending = company && company.rounds.some((r) => r.id !== roundId && ["upcoming", "awaiting"].includes(r.status));
      if (hasPending) setClearPrompt((p) => ({ ...p, [companyId]: true }));
    }
  }

  function clearPendingRounds(companyId) {
    setCompanies((cs) =>
      cs.map((c) =>
        c.id === companyId
          ? { ...c, rounds: c.rounds.filter((r) => !["upcoming", "awaiting"].includes(r.status)) }
          : c
      )
    );
    setClearPrompt((p) => ({ ...p, [companyId]: false }));
  }

  const roundsByDate = useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      c.rounds.forEach((r) => {
        if (!map[r.date]) map[r.date] = [];
        map[r.date].push({ ...r, companyName: c.name, companyId: c.id });
      });
    });
    return map;
  }, [companies]);

  function jumpToCompany(companyId) {
    setView("companies");
    setHighlightId(companyId);
    setTimeout(() => {
      cardRefs.current[companyId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setHighlightId(null), 2000);
  }

  const monthLabel = month.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const gridCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(iso);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const totalRounds = companies.reduce((n, c) => n + c.rounds.length, 0);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .pt-mono { font-family: 'IBM Plex Mono', monospace; }
        .pt-display { font-family: 'Space Grotesk', sans-serif; }
        .pt-select { font-family: 'Inter', sans-serif; }
        input, select, button { font-family: inherit; }
        ::placeholder { color: #a8888f; }
      `}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title} className="pt-display">
            <span style={styles.logoMark} />
            Placement tracker
          </h1>
          <p style={styles.subtitle} className="pt-mono">
            {companies.length} {companies.length === 1 ? "company" : "companies"} · {totalRounds} {totalRounds === 1 ? "round" : "rounds"} logged
          </p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.tabGroup}>
            <button
              onClick={() => setView("companies")}
              style={{ ...styles.tabBtn, ...(view === "companies" ? styles.tabBtnActive : {}) }}
            >
              <List size={14} style={{ marginRight: 6 }} /> Companies
            </button>
            <button
              onClick={() => setView("calendar")}
              style={{ ...styles.tabBtn, ...(view === "calendar" ? styles.tabBtnActive : {}) }}
            >
              <CalendarIcon size={14} style={{ marginRight: 6 }} /> Calendar
            </button>
          </div>
          <button style={styles.primaryBtn} onClick={() => setAddingCompany(true)}>
            <Plus size={15} style={{ marginRight: 5 }} /> Add company
          </button>
        </div>
      </div>

      {addingCompany && (
        <div style={styles.inlineForm}>
          <input
            autoFocus
            style={styles.input}
            placeholder="Company name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCompany()}
          />
          <button style={styles.primaryBtnSm} onClick={addCompany}>Add</button>
          <button style={styles.ghostBtnSm} onClick={() => { setAddingCompany(false); setNewCompanyName(""); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {view === "companies" ? (
        <div style={styles.companyList}>
          {companies.length === 0 && !addingCompany && (
            <div style={styles.emptyState}>
              <p className="pt-display" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>No companies yet</p>
              <p style={{ fontSize: 13.5, color: "#6b7280", margin: 0 }}>Add a company to start logging its rounds.</p>
            </div>
          )}
          {companies.map((c) => {
            const status = companyStatus(c.rounds);
            const sorted = [...c.rounds].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div
                key={c.id}
                ref={(el) => (cardRefs.current[c.id] = el)}
                style={{
                  ...styles.card,
                  ...(highlightId === c.id ? styles.cardHighlight : {}),
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 className="pt-display" style={styles.companyName}>{c.name}</h3>
                    {status === "rejected" && <span style={{ ...styles.statusPill, background: STATUS.rejected.bg, color: STATUS.rejected.color }}>Out</span>}
                    {status === "offer" && <span style={{ ...styles.statusPill, background: STATUS.offer.bg, color: STATUS.offer.color }}>Offer</span>}
                    {status === "active" && <span style={{ ...styles.statusPill, background: "#FBF2EE", color: MUTED }}>In progress</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={styles.ghostBtnSm} onClick={() => startAddRound(c.id)} title="Add round">
                      <Plus size={15} />
                    </button>
                    <button
                      style={{ ...styles.ghostBtnSm, color: confirmDeleteCompany === c.id ? STATUS.rejected.color : undefined }}
                      onClick={() =>
                        confirmDeleteCompany === c.id ? deleteCompany(c.id) : setConfirmDeleteCompany(c.id)
                      }
                      onBlur={() => setTimeout(() => setConfirmDeleteCompany((id) => (id === c.id ? null : id)), 150)}
                      title="Delete company"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {confirmDeleteCompany === c.id && (
                  <div style={styles.confirmBanner}>
                    <AlertCircle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                    Deleting {c.name} removes all {c.rounds.length} of its rounds too. Click delete again to confirm.
                  </div>
                )}

                {clearPrompt[c.id] && (
                  <div style={styles.clearBanner}>
                    <span>Marked as rejected. Clear the remaining pending rounds for {c.name}?</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button style={styles.primaryBtnSm} onClick={() => clearPendingRounds(c.id)}>Clear pending rounds</button>
                      <button style={styles.ghostBtnSm2} onClick={() => setClearPrompt((p) => ({ ...p, [c.id]: false }))}>Keep them</button>
                    </div>
                  </div>
                )}

                <div style={styles.roundList}>
                  {sorted.map((r) => (
                    <div key={r.id} style={styles.ticket}>
                      <div style={styles.ticketPunch} />
                      <div style={styles.ticketMain}>
                        <div>
                          <div style={styles.ticketType}>{r.type}</div>
                          <div className="pt-mono" style={styles.ticketDate}>{fmtDate(r.date)}</div>
                        </div>
                        <select
                          className="pt-select"
                          value={r.status}
                          onChange={(e) => setRoundStatus(c.id, r.id, e.target.value)}
                          style={{ ...styles.statusSelect, background: STATUS[r.status].bg, color: STATUS[r.status].color }}
                        >
                          {Object.entries(STATUS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <button style={styles.ticketDelete} onClick={() => deleteRound(c.id, r.id)} title="Delete round">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {sorted.length === 0 && addingRoundFor !== c.id && (
                    <p style={{ fontSize: 13, color: MUTED, margin: "4px 0 0" }}>No rounds added yet.</p>
                  )}
                </div>

                {addingRoundFor === c.id && (
                  <div style={styles.roundForm}>
                    <input
                      list="round-types"
                      autoFocus
                      style={{ ...styles.input, flex: "1 1 200px" }}
                      placeholder="Round name (e.g. Online Assessment)"
                      value={roundDraft.type}
                      onChange={(e) => setRoundDraft((d) => ({ ...d, type: e.target.value }))}
                    />
                    <input
                      type="date"
                      style={{ ...styles.input, width: 150 }}
                      value={roundDraft.date}
                      onChange={(e) => setRoundDraft((d) => ({ ...d, date: e.target.value }))}
                    />
                    <button style={styles.primaryBtnSm} onClick={() => addRound(c.id)}>Add</button>
                    <button style={styles.ghostBtnSm} onClick={() => setAddingRoundFor(null)}><X size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
          <datalist id="round-types">
            {ROUND_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      ) : (
        <div style={styles.calendarWrap}>
          <div style={styles.calNav}>
            <button style={styles.ghostBtnSm} onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="pt-display" style={{ fontSize: 15, fontWeight: 600 }}>{monthLabel}</span>
            <button style={styles.ghostBtnSm} onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={styles.calGrid}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={styles.calDow} className="pt-mono">{d}</div>
            ))}
            {gridCells.map((iso, i) => {
              const rounds = iso ? roundsByDate[iso] || [] : [];
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <div key={i} style={{ ...styles.calCell, ...(iso ? {} : styles.calCellBlank) }}>
                  {iso && (
                    <>
                      <div className="pt-mono" style={{ ...styles.calDate, ...(isToday ? styles.calDateToday : {}) }}>
                        {Number(iso.slice(-2))}
                      </div>
                      <div style={styles.calChips}>
                        {rounds.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            onClick={() => jumpToCompany(r.companyId)}
                            style={{ ...styles.calChip, background: STATUS[r.status].bg, color: STATUS[r.status].color }}
                            title={`${r.companyName} — ${r.type}`}
                          >
                            {r.companyName}
                          </div>
                        ))}
                        {rounds.length > 3 && (
                          <div className="pt-mono" style={styles.calMore}>+{rounds.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div style={styles.legend}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: v.color }} />
                <span style={{ fontSize: 12, color: MUTED }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "#FBF2EE",
    minHeight: "100vh",
    padding: "28px 24px 60px",
    color: INK,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    maxWidth: 760,
    margin: "0 auto 22px",
  },
  title: { fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 10, height: 10, borderRadius: 3, background: ACCENT, display: "inline-block", flexShrink: 0 },
  subtitle: { fontSize: 12.5, color: MUTED, margin: "4px 0 0" },
  headerActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  tabGroup: { display: "flex", background: SURFACE_TINT, borderRadius: 8, padding: 3 },
  tabBtn: {
    display: "flex", alignItems: "center", border: "none", background: "transparent",
    padding: "7px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: MUTED, cursor: "pointer",
  },
  tabBtnActive: { background: ACCENT_TINT, color: ACCENT_DARK, boxShadow: "0 1px 2px rgba(93,73,84,0.06)" },
  primaryBtn: {
    display: "flex", alignItems: "center", background: ACCENT, color: "#fff", border: "none",
    padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer",
  },
  primaryBtnSm: {
    background: ACCENT, color: "#fff", border: "none", padding: "7px 12px",
    borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
  },
  ghostBtnSm: {
    display: "flex", alignItems: "center", justifyContent: "center", background: "transparent",
    border: `1px solid ${BORDER}`, color: MUTED, padding: "7px 9px", borderRadius: 6, cursor: "pointer",
  },
  ghostBtnSm2: {
    background: "#fff", border: `1px solid ${BORDER}`, color: MUTED, padding: "7px 12px",
    borderRadius: 6, fontSize: 12.5, cursor: "pointer",
  },
  inlineForm: {
    display: "flex", gap: 8, maxWidth: 760, margin: "0 auto 18px", alignItems: "center",
  },
  input: {
    border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", fontSize: 13.5,
    background: "#fff", color: INK, outline: "none",
  },
  companyList: { display: "flex", flexDirection: "column", gap: 14, maxWidth: 760, margin: "0 auto" },
  emptyState: {
    border: `1px dashed ${BORDER_STRONG}`, borderRadius: 10, padding: "34px 20px", textAlign: "center", background: SURFACE_TINT,
  },
  card: {
    background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}`,
    borderRadius: 10, padding: "16px 18px",
    transition: "box-shadow 0.4s ease, border-color 0.4s ease",
  },
  cardHighlight: { borderColor: INK, boxShadow: "0 0 0 3px rgba(93,73,84,0.12)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  companyName: { fontSize: 16.5, fontWeight: 600, margin: 0 },
  statusPill: {
    fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, letterSpacing: "0.01em",
  },
  confirmBanner: {
    display: "flex", alignItems: "center", background: "#f8e8e3", color: "#8a3218", fontSize: 12.5,
    padding: "8px 10px", borderRadius: 6, marginTop: 10,
  },
  clearBanner: {
    background: "#fbf1de", color: "#7a520a", fontSize: 12.5, padding: "10px 12px", borderRadius: 6, marginTop: 10,
  },
  roundList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  ticket: {
    position: "relative", display: "flex", alignItems: "center", gap: 8,
    background: SURFACE_TINT, border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "9px 12px",
  },
  ticketPunch: {
    width: 8, height: 8, borderRadius: "50%", background: ACCENT_TINT, border: `1px dashed ${ACCENT}`, flexShrink: 0,
  },
  ticketMain: { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  ticketType: { fontSize: 13.5, fontWeight: 500 },
  ticketDate: { fontSize: 11.5, color: MUTED, marginTop: 2 },
  statusSelect: {
    border: "none", borderRadius: 20, padding: "5px 10px", fontSize: 11.5, fontWeight: 500, cursor: "pointer", outline: "none",
  },
  ticketDelete: {
    border: "none", background: "transparent", color: MUTED, cursor: "pointer", padding: 4, flexShrink: 0,
  },
  roundForm: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" },
  calendarWrap: { maxWidth: 760, margin: "0 auto" },
  calNav: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14,
  },
  calGrid: {
    display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4,
    background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden",
  },
  calDow: {
    background: SURFACE_TINT, textAlign: "center", fontSize: 10.5, color: MUTED, padding: "6px 0", fontWeight: 500,
  },
  calCell: { background: "#fff", minHeight: 78, padding: "6px 6px 4px" },
  calCellBlank: { background: SURFACE_TINT },
  calDate: { fontSize: 11.5, color: MUTED, marginBottom: 4 },
  calDateToday: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18,
    background: ACCENT, color: "#fff", borderRadius: "50%", fontSize: 10.5,
  },
  calChips: { display: "flex", flexDirection: "column", gap: 2 },
  calChip: {
    fontSize: 9.5, fontWeight: 500, padding: "2px 5px", borderRadius: 4, cursor: "pointer",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  calMore: { fontSize: 9, color: MUTED, padding: "1px 5px" },
  legend: { display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16, justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: "50%" },
};
