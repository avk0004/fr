import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { StatCard, SectionCard, TD, Table, SearchBar, Modal, FormField, statusBadge } from "./SharedUI";

const emptyForm = { mentorName: "", email: "", password: "", mobile: "", department: "" };

export default function MentorsPage({ t, openAdd, setOpenAdd }) {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/college/mentors`);
      setMentors(res.data.mentors || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load mentors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMentors(); }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleClose = () => {
    setOpenAdd(false);
    setForm(emptyForm);
  };

  const handleCreate = async () => {
    if (!form.mentorName || !form.email || !form.password) {
      toast.error("Mentor name, email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/college/create-mentor`, form);
      toast.success("Mentor created successfully.");
      handleClose();
      fetchMentors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create mentor.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = mentors.filter(m =>
    (m.mentor_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = mentors.filter(m => m.status === "ACTIVE").length;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        <StatCard t={t} icon="🧑‍🏫" label="Total Mentors"  value={mentors.length} change="all time"    color="#3B6CF4" />
        <StatCard t={t} icon="🟢"    label="Active"         value={activeCount}     change="currently"   color="#22C55E" />
        <StatCard t={t} icon="🏢"    label="Departments"    value={new Set(mentors.map(m => m.department).filter(Boolean)).size} change="distinct" color="#8B5CF6" />
      </div>

      <SectionCard t={t} title="All Mentors" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <SearchBar t={t} value={search} onChange={setSearch} placeholder="Search mentor..." />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0", color: t.textSecondary, fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px 0", color: t.textSecondary, fontSize: 13, textAlign: "center" }}>No mentors found.</div>
        ) : (
          <Table
            t={t}
            cols={["Mentor Name", "Email", "Mobile", "Department", "Status"]}
            rows={filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: t.rowBorder }}>
                <TD t={t} bold>{m.mentor_name}</TD>
                <TD t={t}>{m.email}</TD>
                <TD t={t}>{m.mobile || "—"}</TD>
                <TD t={t}>{m.department || "—"}</TD>
                <td style={{ padding: "10px 10px" }}>{statusBadge(m.status)}</td>
              </tr>
            ))}
          />
        )}
      </SectionCard>

      <Modal open={openAdd} title="Create Mentor" onClose={handleClose} t={t}>
        <FormField t={t} label="Mentor Name" name="mentorName" value={form.mentorName} onChange={handleChange} />
        <FormField t={t} label="Department" name="department" value={form.department} onChange={handleChange} />
        <FormField t={t} label="Login Email" name="email" type="email" value={form.email} onChange={handleChange} />
        <FormField t={t} label="Login Password" name="password" type="password" value={form.password} onChange={handleChange} />
        <FormField t={t} label="Mobile" name="mobile" value={form.mobile} onChange={handleChange} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: t.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 14px" }}>Cancel</button>
          <button onClick={handleCreate} disabled={submitting} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Creating…" : "Create Mentor"}
          </button>
        </div>
      </Modal>
    </>
  );
}
