import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { SectionCard, FormField } from "./SharedUI";

// NOTE: your backend currently only exposes GET /api/college/me — there is
// no update/PUT endpoint on collegeController yet. This page is read-only
// until that's added. See the comment block at the bottom of this file for
// exactly what the backend needs before "Save Changes" can be wired up.
export default function InstitutionPage({ t }) {
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCollege = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/college/me`);
      setCollege(res.data.college || res.data.data || res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load institution profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollege(); }, []);

  if (loading) {
    return <div style={{ padding: "32px 0", color: t.textSecondary, fontSize: 13, textAlign: "center" }}>Loading…</div>;
  }

  if (!college) {
    return <div style={{ padding: "32px 0", color: t.textSecondary, fontSize: 13, textAlign: "center" }}>No institution data available.</div>;
  }

  return (
    <SectionCard t={t} title="Institution Profile" style={{ maxWidth: 560 }}>
      <FormField t={t} label="College / Institution Name" name="collegeName" value={college.college_name || college.collegeName || ""} readOnly disabled />
      <FormField t={t} label="College Code" name="collegeCode" value={college.college_code || college.collegeCode || ""} readOnly disabled />
      <FormField t={t} label="Email" name="email" value={college.company_email || college.email || ""} readOnly disabled />
      <FormField t={t} label="Phone" name="phone" value={college.phone || ""} readOnly disabled />
      <FormField t={t} label="Address" name="address" value={college.address || ""} readOnly disabled />
      <p style={{ fontSize: 12, color: t.textSecondary, marginTop: 12, lineHeight: 1.5 }}>
        Editing isn't available yet — the backend doesn't have an update endpoint for
        college profiles. See the comment at the bottom of this file for what's needed.
      </p>
    </SectionCard>
  );
}

/*
  TO MAKE THIS EDITABLE, add to collegeController.js:

    exports.updateMyCollege = async (req, res) => {
      const { address, phone, website } = req.body; // whitelist only safe fields
      // update the college row belonging to req.user.collegeId / req.user.id
      // ...
      res.json({ success: true, college: updated });
    };

  And to collegeRoutes.js:

    router.put('/me', collegeController.updateMyCollege);

  Once that exists, swap the read-only fields above back to controlled
  inputs with onChange, and add a PUT call to /api/college/me on save —
  same pattern as MentorsPage.jsx's handleCreate.
*/