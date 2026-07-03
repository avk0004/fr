// ════════════════════════════════════════════════════════════════
//  PAGE: ADMINS  (Restricted Admin phase)
//  Master registry of every admin across the platform, but the
//  "+ Add Restricted Admin" action here can ONLY create a
//  Restricted Admin — College Admins live in Institutions, Vendor
//  Admins live in Vendors.
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { StatCard, SectionCard, SearchBar, Table, TD, statusBadge, Badge } from "./SharedUI";
import CreateAdminModal from "./CreateAdminModal";

const roleFilters = ["All", "Restricted Admin", "College Admin", "Vendor Admin"];

const roleColor = {
  "Restricted Admin": { color: "#623E98", bg: "#F3EEFF" },
  "College Admin":    { color: "#0891B2", bg: "#ECFEFF" },
  "Vendor Admin":     { color: "#B45309", bg: "#FEF3C7" },
};

function roleBadge(role) {
  const s = roleColor[role] || { color: "#64748B", bg: "#F1F5F9" };
  return <Badge label={role} color={s.color} bg={s.bg} />;
}

export default function AdminsPage() {
  const { admins, onAdminCreated } = useOutletContext();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  const filtered = admins.filter(a =>
    (roleFilter === "All" || a.role === roleFilter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const countByRole = (role) => admins.filter(a => a.role === role).length;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard icon="👤" label="Total Admins"      value={admins.length}                        change="registered"      color="#3B6CF4" />
        <StatCard icon="🎓" label="Restricted Admins" value={countByRole("Restricted Admin")}       change="platform-level"  color="#623E98" />
        <StatCard icon="🏫" label="College Admins"    value={countByRole("College Admin")}          change="institution-level" color="#0891B2" />
        <StatCard icon="🛒" label="Vendor Admins"     value={countByRole("Vendor Admin")}           change="vendor-level"    color="#B45309" />
      </div>

      <SectionCard title="All Platform Admins">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search admin..." />
            <div style={{ display: "flex", gap: 6 }}>
              {roleFilters.map(opt => (
                <button
                  key={opt}
                  onClick={() => setRoleFilter(opt)}
                  style={{ padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: roleFilter === opt ? "#623E98" : "#F1F5F9", color: roleFilter === opt ? "#fff" : "#475569" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* This button ONLY ever creates a Restricted Admin — roleType is hard-locked to "super" */}
          <button
            onClick={() => setShowModal(true)}
            style={{ background: "linear-gradient(90deg,#623E98,#9B75C9)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
          >
            + Add Restricted Admin
          </button>
        </div>

        <Table
          cols={["#", "Name", "Email", "Organization / Scope", "Role", "Status"]}
          rows={filtered.length === 0
            ? [<tr key="empty"><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#94A3B8" }}>No admins found</td></tr>]
            : filtered.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <TD>{i + 1}</TD>
                <TD bold>{a.name}</TD>
                <TD>{a.email}</TD>
                <TD>{a.org}</TD>
                <td style={{ padding: "10px 10px" }}>{roleBadge(a.role)}</td>
                <td style={{ padding: "10px 10px" }}>{statusBadge(a.status)}</td>
              </tr>
            ))
          }
        />
      </SectionCard>

      {/* Locked to Restricted Admin only — cannot create any other admin type from this phase */}
      {showModal && (
        <CreateAdminModal
          roleType="super"
          onClose={() => setShowModal(false)}
          onCreated={(newAdmin) => { onAdminCreated(newAdmin); setShowModal(false); }}
        />
      )}
    </>
  );
}