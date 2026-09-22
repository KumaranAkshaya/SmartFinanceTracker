import { useEffect, useState } from 'react'
import { getDashboardSummary, getCashFlow, getExpenseBreakdown } from '../api'

const ResponsiveContainer = ({ children, height }) => (
  <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 13 }}>
    Chart loading...
  </div>
)
const AreaChart = () => null
const Area = () => null
const PieChart = () => null
const Pie = () => null
const Cell = () => null
const XAxis = () => null
const YAxis = () => null
const CartesianGrid = () => null
const Tooltip = () => null
const Legend = () => null


/* ── helpers ─────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const pct = (n) => `${Number(n || 0).toFixed(1)}%`

const PIE_COLORS = ['#4f7fff','#22c55e','#f59e0b','#a78bfa','#2dd4bf','#f43f5e','#fb923c']

/* ── sub-components ─────────────────────────── */
function StatCard({ label, value, change, changeLabel, color, icon }) {
  const isUp = change >= 0
  return (
    <div className={`stat-card ${color}`}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      {changeLabel && (
        <div className={`stat-change ${isUp ? 'up' : 'down'}`}>
          <span>{isUp ? '↑' : '↓'}</span>
          <span>{changeLabel}</span>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="section-title">
      <span>{title}</span>
      {action}
    </div>
  )
}

/* ── custom tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#1e2a3a', border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:10, padding:'10px 14px', fontSize:13,
    }}>
      <p style={{ color:'#8b9ab5', marginBottom:6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight:600 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ── main component ─────────────────────────── */
function Dashboard() {
  const [summary,    setSummary]    = useState(null)
  const [cashflow,   setCashflow]   = useState([])
  const [breakdown,  setBreakdown]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  const today = new Date()
  const month = today.getMonth() + 1
  const year  = today.getFullYear()

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c, b] = await Promise.all([
          getDashboardSummary({ month, year }),
          getCashFlow({ months: 6 }),
          getExpenseBreakdown({ month, year }),
        ])
        setSummary(s.data)
        setCashflow(c.data || [])
        setBreakdown(b.data?.breakdown || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ textAlign:'center', color:'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin:'0 auto 16px' }} />
        <p>Loading your dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="alert alert-error">{error}</div>
    </div>
  )

  const d = summary || {}
  const monthName = today.toLocaleString('default', { month: 'long' })

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {monthName} {year} · Your financial overview at a glance
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard
          label="Total Income"
          value={fmt(d.total_income)}
          color="green"
          icon="↑"
          changeLabel="this month"
          change={1}
        />
        <StatCard
          label="Total Expenses"
          value={fmt(d.total_expense)}
          color="red"
          icon="↓"
          changeLabel="this month"
          change={-1}
        />
        <StatCard
          label="Net Savings"
          value={fmt(d.net_savings)}
          color={d.net_savings >= 0 ? 'accent' : 'red'}
          icon="◈"
          changeLabel={`${pct(d.savings_rate_percentage)} savings rate`}
          change={d.net_savings >= 0 ? 1 : -1}
        />
        <StatCard
          label="EMI Outflow"
          value={fmt(d.total_emi)}
          color="amber"
          icon="⟳"
          changeLabel="monthly commitment"
          change={0}
        />
      </div>

      {/* ── Second row stats ── */}
      <div className="grid-4" style={{ marginBottom: 40 }}>
        <StatCard
          label="Investments"
          value={fmt(d.total_investments)}
          color="purple"
          icon="↗"
          changeLabel="monthly SIP"
          change={1}
        />
        <StatCard
          label="Savings Goals"
          value={fmt(d.total_savings)}
          color="teal"
          icon="◎"
          changeLabel="contributed"
          change={1}
        />
        <StatCard
          label="Emergency Spend"
          value={fmt(d.total_emergency)}
          color="red"
          icon="⚡"
          changeLabel="this month"
          change={-1}
        />
        <StatCard
          label="Budget Alerts"
          value={d.unread_budget_alerts ?? 0}
          color="amber"
          icon="🔔"
          changeLabel="unread alerts"
          change={0}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid-2" style={{ marginBottom: 40 }}>

        {/* Cash flow area chart */}
        <div className="card">
          <SectionHeader title="Cash Flow — Last 6 Months" />
          {cashflow.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p className="empty-state-title">No data yet</p>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Add income and expenses to see your cash flow.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashflow} margin={{ top:5, right:5, left:5, bottom:5 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month_label" tick={{ fill:'#8b9ab5', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#8b9ab5', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize:12, color:'#8b9ab5' }} />
                <Area type="monotone" dataKey="income"  name="Income"  stroke="#22c55e" strokeWidth={2} fill="url(#incGrad)" dot={false} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense breakdown pie */}
        <div className="card">
          <SectionHeader title={`Expense Breakdown — ${monthName}`} />
          {breakdown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🥧</div>
              <p className="empty-state-title">No expenses yet</p>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Add expenses to see your category breakdown.</p>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [fmt(v), n]}
                    contentStyle={{ background:'#1e2a3a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                {breakdown.slice(0,6).map((item, i) => (
                  <div key={item.category} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                      {pct(item.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Outflow summary bar ── */}
      <div className="card" style={{ marginBottom: 40 }}>
        <SectionHeader title="Monthly Outflow Breakdown" />
        <div style={{ display:'flex', gap: 32, flexWrap:'wrap' }}>
          {[
            { label:'Expenses',    value: d.total_expense,     color:'var(--red)' },
            { label:'EMI',         value: d.total_emi,         color:'var(--amber)' },
            { label:'Savings',     value: d.total_savings,     color:'var(--teal)' },
            { label:'Investments', value: d.total_investments, color:'var(--purple)' },
            { label:'Emergency',   value: d.total_emergency,   color:'var(--red)' },
          ].map(({ label, value, color }) => {
            const total = d.total_outflow || 1
            const width = Math.min(100, ((value || 0) / total) * 100)
            return (
              <div key={label} style={{ flex:'1 1 160px', minWidth:140 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{fmt(value)}</span>
                </div>
                <div style={{ height:6, background:'var(--bg-elevated)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${width}%`, background:color, borderRadius:99, transition:'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default Dashboard