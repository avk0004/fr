// ════════════════════════════════════════════════════════════════
//  INSTITUTIONS PAGE  —  Colleges & Organizations, ONE single phase
//  No tabs. Colleges (fetched from the backend) and Organizations
//  (platform partners) are merged into one unified list, one stat
//  row, one search/filter bar, one "+ Add Institution" flow, and
//  one "+ Add College Admin" flow — hard-locked to roleType="org"
//  so this phase can never create a Restricted or Vendor Admin.
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import {
  StatCard,
  SectionCard,
  SearchBar,
  Table,
  TD,
  statusBadge,
  categoryBadge,
} from "./SharedUI";
import CreateAdminModal from "./CreateAdminModal";

// ── Create Institution Modal (merged College + Organization) ───
//  Single modal, single button. The user picks the institution
//  type first; the form fields adapt to what that type needs.
function CreateInstitutionModal({ onClose, onCreated }) {
  const isDark = useTheme().palette.mode === "dark";
  const [type, setType] = useState("College"); // "College" | "Organization"
  const [form, setForm] = useState({
    name: "", code: "", orgType: "", plan: "Institutional",
    email: "", phone: "", address: "", password: "",
  });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (type === "College") {
      if (!form.name || !form.code || !form.email || !form.password) {
        toast.error("College name, code, email and password are required.");
        return;
      }
    } else {
      if (!form.name || !form.orgType || !form.email || !form.password) {
        toast.error("Organization name, type and email/password are required.");
        return;
      }
    }

    setLoading(true);
    try {
      if (type === "College") {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/superadmin/create-college`, {
          collegeName: form.name, collegeCode: form.code, email: form.email,
          phone: form.phone, address: form.address, password: form.password,
        });
        toast.success("College created successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/superadmin/create-organization`, {
          name: form.name, type: form.orgType, plan: form.plan, email: form.email,
          phone: form.phone, address: form.address, password: form.password,
        });
        toast.success("Organization created successfully!");
      }
      onCreated(type);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${type.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" };
  const box = { background: isDark ? "#1E0A3C" : "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, border: "1px solid rgba(155,117,201,0.3)" };
  const input = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(155,117,201,0.4)", background: isDark ? "rgba(255,255,255,0.06)" : "#F8F4FF", color: isDark ? "#fff" : "#1a1a1a", fontSize: 13, outline: "none", boxSizing: "border-box", marginTop: 4 };
  const selectStyle = { ...input, cursor: "pointer" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: isDark ? "#CBB6E6" : "#623E98" };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, color: isDark ? "#fff" : "#1a1a1a", fontSize: 17, fontWeight: 800 }}>+ Add Institution</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9B75C9", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Type toggle — this is what replaces the old two-tab layout */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["College", "Organization"].map(opt => (
            <button
              key={opt}
              onClick={() => setType(opt)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                border: type === opt ? "1.5px solid #623E98" : "1px solid rgba(155,117,201,0.3)",
                background: type === opt ? "linear-gradient(90deg,#623E98,#9B75C9)" : "none",
                color: type === opt ? "#fff" : (isDark ? "#CBB6E6" : "#623E98"),
              }}
            >
              {opt === "College" ? "🏫 College" : "🏢 Organization"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>{type} Name *</label>
            <input name="name" placeholder={type === "College" ? "e.g. MIT College" : "e.g. Harvard Online"} value={form.name} onChange={handle} style={input} />
          </div>

          {type === "College" ? (
            <div>
              <label style={labelStyle}>College Code *</label>
              <input name="code" placeholder="e.g. MIT001" value={form.code} onChange={handle} style={input} />
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Type *</label>
              <input name="orgType" placeholder="e.g. University, Platform" value={form.orgType} onChange={handle} style={input} />
            </div>
          )}

          {type === "Organization" && (
            <div>
              <label style={labelStyle}>Plan</label>
              <select name="plan" value={form.plan} onChange={handle} style={selectStyle}>
                <option value="Institutional">Institutional</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Email *</label>
            <input name="email" placeholder={type === "College" ? "college@email.com" : "org@email.com"} value={form.email} onChange={handle} style={input} />
          </div>

          <div>
            <label style={labelStyle}>Phone</label>
            <input name="phone" placeholder="10-digit number" value={form.phone} onChange={handle} style={input} />
          </div>

          <div>
            <label style={labelStyle}>Password *</label>
            <input name="password" type="password" placeholder="Login password" value={form.password} onChange={handle} style={input} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Address</label>
            <input name="address" placeholder="City, State" value={form.address} onChange={handle} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid rgba(155,117,201,0.4)", background: "none", color: "#9B75C9", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#623E98,#9B75C9)", color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating..." : `Create ${type}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────
export default function InstitutionsPage() {
  const isDark = useTheme().palette.mode === "dark";
  const { organizations, onAdminCreated } = useOutletContext();

  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All"); // All | College | Organization
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchColleges = async () => {
    setCollegesLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/superadmin/colleges`);
      setColleges(res.data.colleges || []);
    } catch {
      toast.error("Failed to load colleges.");
    } finally {
      setCollegesLoading(false);
    }
  };

  useEffect(() => { fetchColleges(); }, []);

  // ── Merge colleges + organizations into ONE unified row shape ──
  const institutions = useMemo(() => {
    const collegeRows = colleges.map(c => ({
      id: `col-${c.id}`,
      category: "College",
      name: c.college_name,
      code: c.college_code,
      email: c.company_email || c.email || "—",
      phone: c.phone || "—",
      students: c.students_enrolled ?? c.studentsEnrolled ?? 0,
      admins: c.admins_count ?? 0,
      status: c.status || "Active",
      joined: c.created_at ? new Date(c.created_at).toLocaleDateString() : "—",
    }));

    const orgRows = (organizations || []).map(o => ({
      id: `org-${o.id}`,
      category: "Organization",
      name: o.name,
      code: o.type || "—",
      email: o.email || "—",
      phone: o.phone || "—",
      students: o.students || 0,
      admins: o.admins || 0,
      status: o.status || "Active",
      joined: o.joined || "—",
    }));

    return [...collegeRows, ...orgRows];
  }, [colleges, organizations]);

  const filtered = institutions.filter(i =>
    (categoryFilter === "All" || i.category === categoryFilter) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || String(i.code).toLowerCase().includes(search.toLowerCase()))
  );

  // Live institution names for the College Admin "Assign to Institution" selector.
  const institutionOptions = institutions.map(i => i.name);

  const totalStudents = institutions.reduce((s, i) => s + (i.students || 0), 0);
  const activeCount = institutions.filter(i => i.status === "Active" || i.status === "ACTIVE").length;
  const collegeCount = institutions.filter(i => i.category === "College").length;
  const orgCount = institutions.filter(i => i.category === "Organization").length;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="🏛" label="Total Institutions" value={institutions.length} change="colleges + orgs" color="#623E98" />
        <StatCard icon="🏫" label="Colleges"            value={collegeCount}        change="registered"    color="#3B6CF4" />
        <StatCard icon="🏢" label="Organizations"       value={orgCount}            change="registered"    color="#0891B2" />
        <StatCard icon="🟢" label="Active"              value={activeCount}         change="active tenants" color="#22C55E" />
        <StatCard icon="👥" label="Total Students"      value={totalStudents.toLocaleString()} change="across all" color="#8B5CF6" />
      </div>

      <SectionCard title="All Institutions">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search institution name or code..." />
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "College", "Organization"].map(opt => (
                <button
                  key={opt}
                  onClick={() => setCategoryFilter(opt)}
                  style={{ padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: categoryFilter === opt ? "#623E98" : "#F1F5F9", color: categoryFilter === opt ? "#fff" : "#475569" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {/* Locked to College Admin only — cannot create Restricted or Vendor admins from here */}
            <button
              onClick={() => setShowAdminModal(true)}
              style={{ background: "linear-gradient(90deg,#3B6CF4,#623E98)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
            >
              + Add College Admin
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ background: "linear-gradient(90deg,#623E98,#9B75C9)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
            >
              + Add Institution
            </button>
          </div>
        </div>

        {collegesLoading ? (
          <p style={{ color: "#9B75C9", textAlign: "center", padding: 20 }}>Loading institutions...</p>
        ) : (
          <Table
            cols={["#", "Institution", "Type", "Code / Category", "Email", "Phone", "Students", "Admins", "Joined", "Status"]}
            rows={filtered.length === 0
              ? [<tr key="empty"><td colSpan={10} style={{ textAlign: "center", padding: 20, color: "#94A3B8" }}>No institutions found</td></tr>]
              : filtered.map((inst, i) => (
                <tr key={inst.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <TD>{i + 1}</TD>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: inst.category === "College" ? "#3B6CF4" : "#0891B2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {inst.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 12, color: isDark ? "#fff" : "#0F172A" }}>{inst.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px" }}>{categoryBadge(inst.category)}</td>
                  <TD color="#9B75C9">{inst.code}</TD>
                  <TD>{inst.email}</TD>
                  <TD>{inst.phone}</TD>
                  <TD color="#3B6CF4">{inst.students.toLocaleString()}</TD>
                  <TD color="#22C55E">{inst.admins}</TD>
                  <TD>{inst.joined}</TD>
                  <td style={{ padding: "10px 10px" }}>{statusBadge(inst.status)}</td>
                </tr>
              ))
            }
          />
        )}
      </SectionCard>

      {showAddModal && (
        <CreateInstitutionModal
          onClose={() => setShowAddModal(false)}
          onCreated={(type) => { if (type === "College") fetchColleges(); }}
        />
      )}

      {showAdminModal && (
        <CreateAdminModal
          roleType="org"
          orgOptions={institutionOptions}
          onClose={() => setShowAdminModal(false)}
          onCreated={(newAdmin) => { onAdminCreated(newAdmin); setShowAdminModal(false); toast.success("College admin created!"); }}
        />
      )}
    </>
  );
}