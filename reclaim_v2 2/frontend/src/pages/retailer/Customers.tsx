import React, { useEffect, useState, useRef } from "react";
import { api } from "../../utils/api";
import { TouchpointBadge, StatusBadge } from "../../components/Badges";

const TOUCHPOINT_NAMES: Record<number, string> = {
  1: "Thank You + Review",
  2: "Care & Style Tips",
  3: "Cross-Sell",
  4: "Complete the Room",
  5: "Anniversary",
  6: "Win-Back",
};

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.getCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.uploadCustomers(file);
      setUploadResult(result);
      load();
    } catch (e: any) {
      setUploadResult({ error: e.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePreview = async (customer: any) => {
    const nextTp = customer.current_touchpoint + 1;
    if (nextTp > 6) return;
    setPreviewLoading(true);
    setPreview({ customer, loading: true });
    setSendResult(null);
    try {
      const msg = await api.previewMessage({
        customer_id: customer.id,
        touchpoint_number: nextTp,
        channel: "email",
      });
      setPreview({ customer, msg, touchpoint_number: nextTp });
    } catch (e: any) {
      setPreview({ customer, error: e.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    setSending(true);
    setSendResult(null);
    try {
      const result = await api.sendMessage({
        customer_id: preview.customer.id,
        touchpoint_number: preview.touchpoint_number,
        channel: "email",
        subject: preview.msg?.subject,
        body: preview.msg?.body,
      });
      setSendResult(result);
      load();
    } catch (e: any) {
      setSendResult({ error: e.message });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer and all their campaign history?")) return;
    await api.deleteCustomer(id);
    load();
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.item_purchased.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} total customers</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {uploading ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </div>

      {uploadResult && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${uploadResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {uploadResult.error ? `Error: ${uploadResult.error}` : `Imported ${uploadResult.imported} customers. ${uploadResult.skipped} skipped.`}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {search ? "No customers match your search." : "No customers yet. Import a CSV to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Purchased</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Purchase Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Touchpoint</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.item_purchased}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(c.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.campaign_status} />
                    </td>
                    <td className="px-4 py-3">
                      <TouchpointBadge number={c.current_touchpoint} name={TOUCHPOINT_NAMES[c.current_touchpoint]} />
                    </td>
                    <td className="px-4 py-3">
                      {c.next_touchpoint_name ? (
                        <div>
                          <p className="text-xs text-slate-600">{c.next_touchpoint_name}</p>
                          {c.days_until_next !== null && (
                            <p className={`text-xs mt-0.5 ${c.next_is_overdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                              {c.next_is_overdue ? `${Math.abs(c.days_until_next)}d overdue` : `in ${c.days_until_next}d`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.current_touchpoint < 6 && c.campaign_status === "active" && (
                          <button
                            onClick={() => handlePreview(c)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                            style={{ background: "#0EA5E9" }}
                          >
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Message Preview</h3>
                <p className="text-sm text-slate-500">
                  Touchpoint {preview.touchpoint_number} for {preview.customer.name}
                </p>
              </div>
              <button onClick={() => { setPreview(null); setSendResult(null); }} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              {preview.loading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Generating message...</div>
              ) : preview.error ? (
                <div className="text-red-600 text-sm">{preview.error}</div>
              ) : (
                <>
                  {preview.msg?.subject && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</label>
                      <p className="mt-1 text-sm font-medium text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{preview.msg.subject}</p>
                    </div>
                  )}
                  <div className="mb-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Message Body</label>
                    <div className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg px-4 py-3 whitespace-pre-wrap leading-relaxed">
                      {preview.msg?.body}
                    </div>
                  </div>

                  {sendResult ? (
                    <div className={`p-3 rounded-lg text-sm ${sendResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                      {sendResult.error ? `Error: ${sendResult.error}` : `Message ${sendResult.status === "demo" ? "logged (demo mode)" : "sent successfully"}!`}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSend}
                        disabled={sending}
                        className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                        style={{ background: "#0EA5E9" }}
                      >
                        {sending ? "Sending..." : "Send This Message"}
                      </button>
                      <button
                        onClick={() => { setPreview(null); setSendResult(null); }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
