import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import StatCard from "../../components/StatCard";

export default function AdminOverview() {
  const [overview, setOverview] = useState<any>(null);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminOverview(),
      api.adminRetailers(),
      api.adminLogs(),
    ]).then(([ov, ret, lg]) => {
      setOverview(ov);
      setRetailers(ret.slice(0, 5));
      setLogs(lg.slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading admin overview...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Platform Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time view of all retailers and campaigns on Reclaim</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Retailers" value={overview?.total_retailers ?? 0} icon="🏪" accent />
        <StatCard label="Total Customers" value={overview?.total_customers ?? 0} icon="👥" />
        <StatCard label="Emails Sent" value={overview?.total_emails_sent ?? 0} icon="✉️" />
        <StatCard label="Platform Open Rate" value={`${overview?.open_rate ?? 0}%`} icon="👁️" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="SMS Sent" value={overview?.total_sms_sent ?? 0} icon="📱" />
        <StatCard label="Active Campaigns" value={overview?.active_campaigns ?? 0} icon="🚀" />
        <StatCard label="New Retailers (30d)" value={overview?.new_retailers_this_month ?? 0} icon="✨" />
        <StatCard label="Total Opens" value={overview?.total_opens ?? 0} icon="📬" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Retailers */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Recent Retailers</h2>
            <Link to="/admin/retailers" className="text-sm font-medium" style={{ color: "#0EA5E9" }}>View all →</Link>
          </div>
          {retailers.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No retailers yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {retailers.map((r) => (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.store_name}</p>
                    <p className="text-xs text-slate-400">{r.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{r.customer_count} customers</p>
                    <p className="text-xs text-slate-400">{r.emails_sent} emails sent</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
            <Link to="/admin/logs" className="text-sm font-medium" style={{ color: "#0EA5E9" }}>View all →</Link>
          </div>
          {logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No activity yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => (
                <div key={log.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{log.customer_name}</p>
                    <p className="text-xs text-slate-400">{log.store_name} · {log.touchpoint_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.status === "sent" ? "bg-green-100 text-green-700" :
                      log.status === "demo" ? "bg-sky-100 text-sky-700" :
                      "bg-red-100 text-red-700"
                    }`}>{log.status}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(log.sent_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
