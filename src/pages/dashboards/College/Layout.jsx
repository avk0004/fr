import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getTokens } from "./SharedUI";
import { navItems, pageMeta, pageActions } from "./constants";
import OverviewPage from "./OverviewPage";
import MentorsPage from "./MentorsPage";
import InstitutionPage from "./InstitutionPage";

// ════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════
function Sidebar({ active, setActive, t, collegeName }) {
  return (
    <aside style={{ width: 200, height: "100vh", background: t.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, borderRight: `1px solid ${t.sidebarBorder}` }}>
      <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>E</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>EduPlatform</span>
        </div>
        <div style={{ marginTop: 10, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 10px" }}>
          <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Logged in as</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginTop: 2 }}>College</div>
        </div>
      </div>
      <div style={{ padding: "10px 14px 4px" }}>
        <span style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", color: "#94A3B8", fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, letterSpacing: 0.5 }}>🏛 College</span>
      </div>
      <nav style={{ marginTop: 6, flex: 1, overflowY: "auto" }}>
        {navItems.map(({ icon, label }) => (
          <button key={label} onClick={() => setActive(label)} style={{
            display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px",
            background: active === label ? t.navActiveBg : "none",
            border: "none", cursor: "pointer",
            color: active === label ? "#fff" : t.navInactive,
            fontWeight: active === label ? 700 : 400,
            fontSize: 13, textAlign: "left",
            borderLeft: active === label ? `3px solid ${t.navActiveBorder}` : "3px solid transparent",
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>{label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
//  TOP BAR
// ════════════════════════════════════════════════════════════════
function TopBar({ active, actionLabel, onActionClick, t, isDark, onToggleTheme, onLogout, collegeName, email }) {
  const meta = pageMeta[active] || { title: active, subtitle: "" };
  return (
    <div style={{ background: t.topBarBg, borderBottom: t.topBarBorder, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", position: "sticky", top: 0, zIndex: 10, boxSizing: "border-box", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.textPrimary, letterSpacing: -0.5, lineHeight: 1.2 }}>{meta.title}</h1>
          <p style={{ margin: 0, color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{meta.subtitle}</p>
        </div>
        {actionLabel && (
          <button onClick={onActionClick} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{actionLabel}</button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onToggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ width: 34, height: 34, borderRadius: "50%", background: t.inputBg, border: t.inputBorder, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <button
          onClick={onLogout}
          style={{ background: isDark ? "rgba(255,255,255,0.07)" : "#FEE2E2", border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #FCA5A5", borderRadius: 8, padding: "7px 14px", color: isDark ? "#CBB6E6" : "#B91C1C", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Sign out
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3B6CF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {(collegeName || "C").charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2 }}>{collegeName || "College"}</div>
            <div style={{ fontSize: 10, color: t.textSecondary }}>{email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ROOT — CollegeDashboard
// ════════════════════════════════════════════════════════════════
export default function CollegeDashboard() {
  const [active, setActive] = useState("Overview");
  const [isDark, setIsDark] = useState(false);
  const [openAddMentor, setOpenAddMentor] = useState(false);
  const { user, logout } = useAuth();

  const t = getTokens(isDark);

  const pages = {
    Overview:    <OverviewPage t={t} />,
    Mentors:     <MentorsPage t={t} openAdd={openAddMentor} setOpenAdd={setOpenAddMentor} />,
    Institution: <InstitutionPage t={t} />,
  };

  const actionHandlers = {
    Mentors: () => setOpenAddMentor(true),
  };

  return (
    <div style={{ display: "flex", fontFamily: "'Inter','Segoe UI',sans-serif", background: t.pageBg, height: "100vh", width: "100%", overflow: "hidden" }}>
      <Sidebar active={active} setActive={setActive} t={t} collegeName={user?.collegeName || user?.name} />
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", height: "100vh", padding: "0 0", boxSizing: "border-box", minWidth: 0 }}>
        <TopBar
          active={active}
          actionLabel={pageActions[active]}
          onActionClick={actionHandlers[active]}
          t={t}
          isDark={isDark}
          onToggleTheme={() => setIsDark(prev => !prev)}
          onLogout={logout}
          collegeName={user?.collegeName || user?.name}
          email={user?.email}
        />
        <div style={{ padding: "20px 22px", boxSizing: "border-box" }}>
          {pages[active] || <OverviewPage t={t} />}
        </div>
      </main>
    </div>
  );
}
