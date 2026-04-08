import React from "react";

const TP_COLORS: Record<number, string> = {
  0: "bg-slate-100 text-slate-500",
  1: "bg-blue-100 text-blue-700",
  2: "bg-indigo-100 text-indigo-700",
  3: "bg-violet-100 text-violet-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-amber-100 text-amber-700",
  6: "bg-rose-100 text-rose-700",
};

export function TouchpointBadge({ number, name }: { number: number; name?: string }) {
  const color = TP_COLORS[number] || "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {number > 0 ? `TP${number}` : "—"}
      {name && <span className="hidden sm:inline">· {name}</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-500",
    paused: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    demo: "bg-sky-100 text-sky-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      channel === "sms" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
    }`}>
      {channel === "sms" ? "📱 SMS" : "✉️ Email"}
    </span>
  );
}
