import React, { useEffect, useState } from "react";
import { api } from "../../utils/api";
import StatCard from "../../components/StatCard";

const TP_COLORS = ["#0EA5E9", "#6366F1", "#8B5CF6", "#A855F7", "#F59E0B", "#EF4444"];

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading analytics...</div>;
  if (!data) return null;

  const maxSent = Math.max(...(data.touchpoint_breakdown?.map((t: any) => t.sent) || [1]), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Campaign performance across all touchpoints</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Customers" value={data.total_customers} icon="👥" />
        <StatCard label="Emails Sent" value={data.total_emails_sent} icon="✉️" accent />
        <StatCard label="SMS Sent" value={data.total_sms_sent} icon="📱" />
        <StatCard label="Open Rate" value={`${data.open_rate}%`} icon="👁️" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Campaigns" value={data.active_campaigns} sub="Customers in sequence" />
        <StatCard label="Completed Campaigns" value={data.completed_campaigns} sub="All 6 touchpoints done" />
        <StatCard label="Click Rate" value={`${data.click_rate}%`} sub="Of total messages sent" />
      </div>

      {/* Touchpoint Breakdown */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-6">Messages Sent by Touchpoint</h2>
        <div className="space-y-4">
          {data.touchpoint_breakdown?.map((tp: any, i: number) => (
            <div key={tp.touchpoint_number}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: TP_COLORS[i] }}
                  >
                    {tp.touchpoint_number}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{tp.touchpoint_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{tp.sent} sent</span>
                  <span>{tp.opens} opens</span>
                  <span className="font-medium" style={{ color: TP_COLORS[i] }}>{tp.open_rate}% open rate</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${maxSent > 0 ? (tp.sent / maxSent) * 100 : 0}%`,
                    background: TP_COLORS[i],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Rate by Touchpoint */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-6">Open Rate by Touchpoint</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.touchpoint_breakdown?.map((tp: any, i: number) => (
            <div key={tp.touchpoint_number} className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2"
                style={{ background: TP_COLORS[i] }}
              >
                {tp.open_rate}%
              </div>
              <p className="text-xs text-slate-500 leading-tight">{tp.touchpoint_name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
