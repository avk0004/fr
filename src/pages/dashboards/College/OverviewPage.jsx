import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { StatCard, SectionCard } from "./SharedUI";

export default function OverviewPage({ t }) {
  const { user } = useAuth();
  const [mentorCount, setMentorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/college/mentors`);
        setMentorCount((res.data.mentors || []).length);
      } catch {
        // stat card falls back to 0 silently — mentors page surfaces the real error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        <StatCard t={t} icon="🧑‍🏫" label="Mentors"  value={loading ? "…" : mentorCount} change="onboarded" color="#3B6CF4" />
        <StatCard t={t} icon="🏛"   label="Institution" value={user?.collegeName || user?.name || "—"} color="#8B5CF6" />
        <StatCard t={t} icon="✉️"  label="Contact Email" value={user?.email || "—"} color="#06B6D4" />
      </div>
      <SectionCard t={t} title="Welcome">
        <p style={{ margin: 0, fontSize: 13, color: t.textBody, lineHeight: 1.6 }}>
          Use the <strong>Mentors</strong> tab to onboard and manage mentor logins for your college,
          and the <strong>Institution</strong> tab to update your college profile and contact details.
        </p>
      </SectionCard>
    </>
  );
}
