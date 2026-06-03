/* global React */

/* ============================================
   KEYBOARD SHORTCUTS
   - ⌘/Ctrl + K : recherche (focus input)
   - n          : nouvelle transaction
   - g puis d/w/p/t/l/f/c/k/o/r/g : navigation
   - ?          : cheatsheet
   - Esc        : ferme modal / cheatsheet
   ============================================ */

const SHORTCUTS = [
  { keys: ["⌘", "K"],   label: "Recherche globale" },
  { keys: ["N"],         label: "Nouvelle transaction" },
  { keys: ["G", "D"],   label: "Aller au tableau de bord" },
  { keys: ["G", "W"],   label: "Patrimoine" },
  { keys: ["G", "P"],   label: "Portefeuille" },
  { keys: ["G", "T"],   label: "Transactions" },
  { keys: ["G", "L"],   label: "Allocation" },
  { keys: ["G", "F"],   label: "Performance" },
  { keys: ["G", "C"],   label: "Calendrier" },
  { keys: ["G", "M"],   label: "Comparateur ETF" },
  { keys: ["G", "A"],   label: "Alertes" },
  { keys: ["G", "R"],   label: "Glossaire" },
  { keys: ["?"],         label: "Afficher cette aide" },
  { keys: ["Esc"],       label: "Fermer un dialogue" },
];

const NAV_MAP = {
  d: "dashboard",
  w: "wealth",
  p: "portfolio",
  t: "tx",
  l: "alloc",
  f: "perf",
  c: "calendar",
  m: "compare",
  a: "alerts",
  r: "glossary",
};

function useShortcuts({ setRoute, openTx, openShortcuts, closeAll, isModalOpen }) {
  const [gMode, setGMode] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const editing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;

      // Esc always works
      if (e.key === "Escape") { closeAll(); setGMode(false); return; }

      // ⌘K / Ctrl+K → search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const s = document.querySelector('input[data-search]');
        if (s) s.focus();
        return;
      }

      if (editing) return;

      // ? → shortcuts
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        openShortcuts();
        return;
      }

      // n → new tx
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openTx();
        return;
      }

      // g then x
      if (e.key.toLowerCase() === "g" && !gMode) {
        setGMode(true);
        setTimeout(() => setGMode(false), 1200);
        return;
      }
      if (gMode) {
        const r = NAV_MAP[e.key.toLowerCase()];
        if (r) {
          e.preventDefault();
          setRoute(r);
          setGMode(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gMode, setRoute, openTx, openShortcuts, closeAll]);

  return gMode;
}

function Kbd({ children }) {
  return (
    <kbd style={{
      display:"inline-grid", placeItems:"center",
      minWidth: 22, height: 22,
      padding: "0 7px",
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      fontWeight: 500,
      background: "var(--surface)",
      border: "1px solid var(--rule)",
      borderBottomWidth: 2,
      borderRadius: 5,
      color: "var(--ink)",
      letterSpacing: "-0.02em",
    }}>{children}</kbd>
  );
}

function GModeBadge() {
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--ink)", color: "#fff",
      padding: "10px 16px",
      borderRadius: 10,
      fontSize: 13,
      display: "flex", alignItems: "center", gap: 8,
      zIndex: 60,
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.4)",
    }}>
      <Kbd>G</Kbd>
      <span style={{color: "rgba(255,255,255,0.7)"}}>puis</span>
      <span style={{color: "rgba(255,255,255,0.7)"}}>D · W · P · T · L · F · C · M · A · R</span>
    </div>
  );
}

function ShortcutsDialog({ onClose }) {
  React.useEffect(() => {
    const ref = document.activeElement;
    document.getElementById("shortcuts-close")?.focus();
    return () => ref?.focus?.();
  }, []);

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={e => e.stopPropagation()}
        style={{maxWidth: 480}}
      >
        <div className="modal-head">
          <div>
            <div style={{fontSize:11.5, fontWeight: 500, color:"var(--ink-3)", marginBottom:4}}>
              Aide clavier
            </div>
            <div className="modal-title" id="shortcuts-title">Raccourcis</div>
          </div>
          <button
            id="shortcuts-close"
            className="btn ghost sm"
            onClick={onClose}
            style={{marginLeft:"auto"}}
            aria-label="Fermer"
          >✕</button>
        </div>
        <div className="modal-body" style={{padding: "16px 26px 22px"}}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="row" style={{padding:"8px 0", borderBottom: i < SHORTCUTS.length - 1 ? "1px solid var(--rule-soft)" : "none"}}>
              <span style={{fontSize: 13.5, flex: 1}}>{s.label}</span>
              <span style={{display:"flex", gap: 4, alignItems:"center"}}>
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span style={{color:"var(--ink-3)", fontSize: 11}}>puis</span>}
                    <Kbd>{k}</Kbd>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SHORTCUTS, NAV_MAP, useShortcuts, Kbd, GModeBadge, ShortcutsDialog });
