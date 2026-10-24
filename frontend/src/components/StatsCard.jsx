export default function StatsCard({ label, value, icon: Icon, tone = 'slate', hint }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="card flex items-start gap-4 p-5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
