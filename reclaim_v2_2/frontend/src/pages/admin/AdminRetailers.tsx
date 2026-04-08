import React, { useEffect, useState } from "react";
import { api } from "../../utils/api";

export default function AdminRetailers() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.adminRetailers().then(setRetailers).finally(() => setLoading(false));
  }, []);

  const filtered = retailers.filter((r) =>
    r.store_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">All Retailers</h1>
        <p className="text-slate-500 text-sm mt-1">{retailers.length} retailers on the platform</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by store name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading retailers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No retailers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Store</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customers</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Emails Sent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Integrations</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.store_name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{r.customer_count}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{r.emails_sent}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.has_brevo && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Email</span>}
                        {r.has_twilio && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">SMS</span>}
                        {r.has_anthropic && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">AI</span>}
                        {!r.has_brevo && !r.has_twilio && !r.has_anthropic && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Demo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
