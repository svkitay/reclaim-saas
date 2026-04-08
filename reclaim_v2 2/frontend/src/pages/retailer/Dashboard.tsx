import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import StatCard from "../../components/StatCard";

const TOUCHPOINTS = [
  { num: 1, name: "Thank You + Review", day: "Day 7", color: "#0EA5E9" },
  { num: 2, name: "Care & Style Tips", day: "Day 30", color: "#6366F1" },
  { num: 3, name: "Cross-Sell", day: "Month 3", color: "#8B5CF6" },
  { num: 4, name: "Complete the Room", day: "Month 6", color: "#A855F7" },
  { num: 5, name: "Anniversary", day: "Month 12", color: "#F59E0B" },
  { num: 6, name: "Win-Back", day: "Month 18+", color: "#EF4444" },
];

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch(console.error);
    api.getCustomers().then((c) => setCustomers(c.slice(0, 5))).catch(console.error);
  }, []);

  const handleRunCampaign = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await api.runCampaign();
      setRunResult(result);
      api.getAnalytics().then(setAnalytics);
      refreshUser();
    } catch (e: any) {
      setRunResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.uploadCustomers(file);
      setUploadResult(result);
      api.getCustomers().then((c) => setCustomers(c.slice(0, 5)));
      api.getAnalytics().then(setAnalytics);
      refreshUser();
    } catch (e: any) {
      setUploadResult({ error: e.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.store_name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your post-purchase campaigns are running automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {uploading ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={handleRunCampaign}
            disabled={running}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: "#0EA5E9" }}
          >
            {running ? "Running..." : "Run Campaign Engine"}
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${uploadResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {uploadResult.error
            ? `Import failed: ${uploadResult.error}`
            : `Imported ${uploadResult.imported} customers. ${uploadResult.skipped} skipped (duplicates or invalid).`}
        </div>
      )}

      {/* Run Result */}
      {runResult && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${runResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-sky-50 border-sky-200 text-sky-700"}`}>
          {runResult.error
            ? `Error: ${runResult.error}`
            : `Campaign engine ran. Processed ${runResult.processed} touchpoints out of ${runResult.total_active} active customers.`}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Customers" value={analytics?.total_customers ?? 0} icon="👥" />
        <StatCard label="Active Campaigns" value={analytics?.active_campaigns ?? 0} icon="🚀" accent />
        <StatCard label="Emails Sent" value={analytics?.total_emails_sent ?? 0} icon="✉️" />
        <StatCard label="Open Rate" value={`${analytics?.open_rate ?? 0}%`} icon="👁️" />
      </div>

      {/* Setup Warning */}
      {!user?.has_brevo && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Running in Demo Mode</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Messages are being generated and logged, but not actually sent. Add your{" "}
              <Link to="/settings" className="underline font-medium">Brevo API key in Settings</Link> to start sending real emails.
            </p>
          </div>
        </div>
      )}

      {/* Campaign Sequence */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-8">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Your 6-Touchpoint Campaign Sequence</h2>
        <div className="flex flex-wrap gap-3">
          {TOUCHPOINTS.map((tp, i) => (
            <div key={tp.num} className="flex items-center gap-2">
              <div
                className="flex flex-col items-center justify-center rounded-xl p-3 text-white text-center min-w-[90px]"
                style={{ background: tp.color }}
              >
                <span className="text-xs font-medium opacity-80">{tp.day}</span>
                <span className="text-xs font-semibold mt-0.5 leading-tight">{tp.name}</span>
              </div>
              {i < TOUCHPOINTS.length - 1 && (
                <span className="text-slate-300 text-lg">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Recent Customers</h2>
          <Link to="/customers" className="text-sm font-medium" style={{ color: "#0EA5E9" }}>
            View all →
          </Link>
        </div>
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">No customers yet. Import a CSV to get started.</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: "#0EA5E9" }}
            >
              Import CSV
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {customers.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.item_purchased}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.campaign_status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.campaign_status}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">TP {c.current_touchpoint}/6</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
