import React, { useEffect, useState } from "react";
import { api } from "../../utils/api";
import { StatusBadge, ChannelBadge, TouchpointBadge } from "../../components/Badges";

export default function CampaignLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) =>
    (l.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.touchpoint_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Campaign Log</h1>
        <p className="text-slate-500 text-sm mt-1">Every message sent to your customers</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by customer or touchpoint..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading campaign log...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {search ? "No results found." : "No messages sent yet. Run the campaign engine to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Touchpoint</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Opened</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{log.customer_name}</p>
                      <p className="text-xs text-slate-400">{log.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TouchpointBadge number={log.touchpoint_number} name={log.touchpoint_name} />
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={log.channel} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(log.sent_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.opened ? (
                        <span className="text-xs text-green-600 font-medium">✓ Opened</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(log)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selected.touchpoint_name}</h3>
                <p className="text-sm text-slate-500">Sent to {selected.customer_name} · {new Date(selected.sent_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <ChannelBadge channel={selected.channel} />
                <StatusBadge status={selected.status} />
              </div>
              {selected.subject && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</label>
                  <p className="mt-1 text-sm font-medium text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{selected.subject}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Message</label>
                <div className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 whitespace-pre-wrap leading-relaxed">
                  {selected.message_body}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
