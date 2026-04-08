import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: string;
}

export default function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border ${accent ? "border-sky-200" : "border-slate-100"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${accent ? "text-sky-600" : "text-slate-800"}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
