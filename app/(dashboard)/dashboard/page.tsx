export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Placeholder stats — we'll fill these in soon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Active Jobs', 'Scheduled Today', 'Pending Invoices', 'Customers'].map((label) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}