function Analytics() {
  return <section><h1>Analytics</h1></section>
}
export default Analytics


// import { useState, useEffect } from 'react'
// import {
//   getDashboardSummary, getCashFlow, getExpenseBreakdown,
//   getIncomeBreakdown, getNetWorth, getBudgetVsActual,
//   getYearlySummary, getSavingsProgress, getInvestmentPerformance,
// } from '../api'
// import { AreaChart, BarChart, PieChart, LineChart } from './Charts'

// /* ── helpers ─────────────────────────────────── */
// const fmt = (n) =>
//   new Intl.NumberFormat('en-IN', {
//     style: 'currency', currency: 'INR', maximumFractionDigits: 0,
//   }).format(n || 0)

// const now       = new Date()
// const CUR_MONTH = now.getMonth() + 1
// const CUR_YEAR  = now.getFullYear()
// const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// const PIE_COLORS = [
//   '#4f7fff','#22c55e','#f59e0b','#a78bfa',
//   '#2dd4bf','#f43f5e','#fb923c','#38bdf8','#e879f9',
// ]

// /* ── Sub-components ──────────────────────────── */
// function ChartCard({ title, subtitle, children, action }) {
//   return (
//     <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
//         <div>
//           <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{title}</p>
//           {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
//         </div>
//         {action}
//       </div>
//       {children}
//     </div>
//   )
// }

// function EmptyChart({ height = 200, msg = 'No data yet' }) {
//   return (
//     <div style={{
//       height, display: 'flex', flexDirection: 'column',
//       alignItems: 'center', justifyContent: 'center',
//       background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
//       color: 'var(--text-muted)', gap: 8,
//     }}>
//       <span style={{ fontSize: 28 }}>📊</span>
//       <span style={{ fontSize: 13 }}>{msg}</span>
//     </div>
//   )
// }

// function Tabs({ tabs, active, onChange }) {
//   return (
//     <div style={{
//       display: 'flex', gap: 4, background: 'var(--bg-elevated)',
//       borderRadius: 'var(--radius-md)', padding: 4, flexWrap: 'wrap',
//     }}>
//       {tabs.map((t) => (
//         <button
//           key={t.value} onClick={() => onChange(t.value)}
//           className={`btn btn-sm ${active === t.value ? 'btn-primary' : 'btn-ghost'}`}
//           style={{ border: 'none' }}
//         >
//           {t.label}
//         </button>
//       ))}
//     </div>
//   )
// }

// function StatCard({ label, value, color, icon }) {
//   return (
//     <div className={`stat-card ${color}`}>
//       <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
//         <span className="stat-label">{label}</span>
//         <div className={`stat-icon ${color}`}>{icon}</div>
//       </div>
//       <div className="stat-value">{value}</div>
//     </div>
//   )
// }

// /* ══════════════════════════════════════════════
//    MAIN COMPONENT
// ══════════════════════════════════════════════ */
// function Analytics() {
//   const [tab, setTab] = useState('overview')

//   const [summary,     setSummary]     = useState(null)
//   const [cashflow,    setCashflow]    = useState([])
//   const [expBreak,    setExpBreak]    = useState(null)
//   const [incBreak,    setIncBreak]    = useState(null)
//   const [netWorth,    setNetWorth]    = useState(null)
//   const [budgetVsAct, setBudgetVsAct] = useState(null)
//   const [yearly,      setYearly]      = useState(null)
//   const [savProg,     setSavProg]     = useState([])
//   const [invPerf,     setInvPerf]     = useState(null)

//   const [loading,    setLoading]    = useState(true)
//   const [error,      setError]      = useState('')
//   const [selMonth,   setSelMonth]   = useState(CUR_MONTH)
//   const [selYear,    setSelYear]    = useState(CUR_YEAR)
//   const [cashMonths, setCashMonths] = useState(6)

//   const loadAll = async () => {
//     setLoading(true); setError('')
//     try {
//       const [s, c, eb, ib, nw, bva, yr, sp, ip] = await Promise.all([
//         getDashboardSummary({ month: selMonth, year: selYear }),
//         getCashFlow({ months: cashMonths }),
//         getExpenseBreakdown({ month: selMonth, year: selYear }),
//         getIncomeBreakdown({ month: selMonth, year: selYear }),
//         getNetWorth(),
//         getBudgetVsActual({ month: selMonth, year: selYear }),
//         getYearlySummary(selYear),
//         getSavingsProgress(),
//         getInvestmentPerformance(),
//       ])
//       setSummary(s.data);    setCashflow(c.data || [])
//       setExpBreak(eb.data);  setIncBreak(ib.data)
//       setNetWorth(nw.data);  setBudgetVsAct(bva.data)
//       setYearly(yr.data);    setSavProg(sp.data || [])
//       setInvPerf(ip.data)
//     } catch (e) {
//       if (!e.isSessionExpired) setError(e.message)
//     } finally { setLoading(false) }
//   }

//   useEffect(() => { loadAll() }, [selMonth, selYear, cashMonths])

//   const s            = summary || {}
//   const nw           = netWorth || {}
//   const ip           = invPerf  || {}
//   const expBreakdown = expBreak?.breakdown || []
//   const incBreakdown = incBreak?.breakdown || []
//   const budgetRows   = budgetVsAct?.breakdown || []
//   const yearlyMonths = (yearly?.monthly_breakdown || []).filter((m) => m.income > 0 || m.expense > 0)

//   /* reshape cashflow for charts */
//   const cashflowChart = cashflow.map((r) => ({
//     label:   r.month_label,
//     income:  r.income,
//     expense: r.expense,
//     net:     r.net,
//   }))

//   const expPieData = expBreakdown.map((r) => ({ name: r.category, total: r.total }))
//   const incPieData = incBreakdown.map((r) => ({ name: r.category, total: r.total }))
//   const budgetChartData = budgetRows.map((r) => ({
//     label: r.category, Budget: r.limit, Spent: r.spent,
//   }))
//   const yearlyChartData = yearlyMonths.map((r) => ({
//     label: r.month_label, income: r.income, expense: r.expense,
//   }))
//   const netLineData = yearlyMonths.map((r) => ({ label: r.month_label, net: r.net }))

//   if (loading) return (
//     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
//       <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
//         <div className="spinner" style={{ margin: '0 auto 16px' }} />
//         <p>Loading analytics…</p>
//       </div>
//     </div>
//   )

//   return (
//     <div className="page-content">

//       {/* ── Header ── */}
//       <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
//         <div>
//           <h1 className="page-title">Analytics</h1>
//           <p className="page-subtitle">Deep insights into your financial health</p>
//         </div>
//         <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
//           <select className="form-select" style={{ width: 'auto' }} value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}>
//             {MONTHS_SHORT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
//           </select>
//           <select className="form-select" style={{ width: 'auto' }} value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}>
//             {[CUR_YEAR - 2, CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map((y) => <option key={y} value={y}>{y}</option>)}
//           </select>
//           <button className="btn btn-ghost btn-sm" onClick={loadAll}>↺ Refresh</button>
//         </div>
//       </div>

//       {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

//       {/* ── Tabs ── */}
//       <div style={{ marginBottom: 28 }}>
//         <Tabs active={tab} onChange={setTab} tabs={[
//           { value: 'overview',  label: '📊 Overview'  },
//           { value: 'cashflow',  label: '💹 Cash Flow' },
//           { value: 'breakdown', label: '🥧 Breakdown' },
//           { value: 'budget',    label: '🎯 Budget'    },
//           { value: 'networth',  label: '📈 Net Worth' },
//           { value: 'yearly',    label: '📅 Yearly'    },
//         ]} />
//       </div>

//       {/* ════ OVERVIEW ════ */}
//       {tab === 'overview' && (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
//           <div className="grid-4">
//             <StatCard label="Total Income"   value={fmt(s.total_income)}   color="green"  icon="💰" />
//             <StatCard label="Total Expenses" value={fmt(s.total_expense)}  color="red"    icon="💸" />
//             <StatCard label="Net Savings"    value={fmt(s.net_savings)}    color={s.net_savings >= 0 ? 'accent' : 'red'} icon="🏦" />
//             <StatCard label="Savings Rate"   value={`${Number(s.savings_rate_percentage || 0).toFixed(1)}%`} color="purple" icon="📊" />
//           </div>
//           <div className="grid-4">
//             <StatCard label="EMI Outflow"   value={fmt(s.total_emi)}         color="amber"  icon="🏠" />
//             <StatCard label="Investments"   value={fmt(s.total_investments)}  color="purple" icon="📈" />
//             <StatCard label="Savings Goals" value={fmt(s.total_savings)}      color="teal"   icon="🎯" />
//             <StatCard label="Emergency"     value={fmt(s.total_emergency)}    color="red"    icon="🚨" />
//           </div>

//           <ChartCard title="Monthly Outflow Breakdown" subtitle={`${MONTHS_SHORT[selMonth - 1]} ${selYear}`}>
//             {s.total_outflow > 0 ? (
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                 {[
//                   { label: 'Expenses',    value: s.total_expense,    color: 'var(--red)'    },
//                   { label: 'EMI',         value: s.total_emi,        color: 'var(--amber)'  },
//                   { label: 'Investments', value: s.total_investments, color: 'var(--purple)' },
//                   { label: 'Savings',     value: s.total_savings,    color: 'var(--teal)'   },
//                   { label: 'Emergency',   value: s.total_emergency,  color: 'var(--red)'    },
//                 ].filter((r) => parseFloat(r.value) > 0).map(({ label, value, color }) => {
//                   const pct = ((parseFloat(value) / parseFloat(s.total_outflow)) * 100).toFixed(1)
//                   return (
//                     <div key={label}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
//                         <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
//                         <div style={{ display: 'flex', gap: 12 }}>
//                           <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
//                           <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, textAlign: 'right' }}>{fmt(value)}</span>
//                         </div>
//                       </div>
//                       <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
//                         <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
//                       </div>
//                     </div>
//                   )
//                 })}
//               </div>
//             ) : <EmptyChart msg="No outflow data for this month" />}
//           </ChartCard>
//         </div>
//       )}

//       {/* ════ CASH FLOW ════ */}
//       {tab === 'cashflow' && (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
//           <ChartCard
//             title="Income vs Expense Trend"
//             subtitle="Monthly comparison"
//             action={
//               <Tabs active={String(cashMonths)} onChange={(v) => setCashMonths(Number(v))} tabs={[
//                 { value: '3', label: '3M' }, { value: '6', label: '6M' }, { value: '12', label: '12M' },
//               ]} />
//             }
//           >
//             {cashflowChart.length > 0
//               ? <AreaChart data={cashflowChart} keys={['income','expense','net']} colors={['#22c55e','#f43f5e','#4f7fff']} labelKey="label" height={260} />
//               : <EmptyChart height={260} msg="Add income and expenses to see cash flow" />
//             }
//           </ChartCard>

//           {cashflow.length > 0 && (
//             <ChartCard title="Monthly Cash Flow Table">
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Month</th>
//                       <th style={{ textAlign: 'right' }}>Income</th>
//                       <th style={{ textAlign: 'right' }}>Expense</th>
//                       <th style={{ textAlign: 'right' }}>Net</th>
//                       <th style={{ textAlign: 'right' }}>Savings Rate</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {cashflow.map((row) => {
//                       const net  = row.net || 0
//                       const rate = row.income > 0 ? ((net / row.income) * 100).toFixed(1) : '—'
//                       return (
//                         <tr key={row.month_label}>
//                           <td style={{ fontWeight: 600 }}>{row.month_label}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--green)',  fontWeight: 600 }}>{fmt(row.income)}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--red)',    fontWeight: 600 }}>{fmt(row.expense)}</td>
//                           <td style={{ textAlign: 'right', color: net >= 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 700 }}>
//                             {net >= 0 ? '+' : ''}{fmt(net)}
//                           </td>
//                           <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
//                             {rate !== '—' ? `${rate}%` : '—'}
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </ChartCard>
//           )}
//         </div>
//       )}

//       {/* ════ BREAKDOWN ════ */}
//       {tab === 'breakdown' && (
//         <div className="grid-2" style={{ gap: 28 }}>
//           <ChartCard title="Expense by Category" subtitle={`${MONTHS_SHORT[selMonth - 1]} ${selYear} · ${fmt(expBreak?.total_expense)}`}>
//             {expPieData.length > 0
//               ? <PieChart data={expPieData} dataKey="total" nameKey="name" colors={PIE_COLORS} height={240} innerRadius={55} />
//               : <EmptyChart msg="No expenses this month" />}
//           </ChartCard>
//           <ChartCard title="Income by Category" subtitle={`${MONTHS_SHORT[selMonth - 1]} ${selYear} · ${fmt(incBreak?.total_income)}`}>
//             {incPieData.length > 0
//               ? <PieChart data={incPieData} dataKey="total" nameKey="name" colors={PIE_COLORS} height={240} innerRadius={55} />
//               : <EmptyChart msg="No income this month" />}
//           </ChartCard>
//         </div>
//       )}

//       {/* ════ BUDGET ════ */}
//       {tab === 'budget' && (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
//           {budgetVsAct && (
//             <div className="grid-3">
//               <StatCard label="Total Budget"    value={fmt(budgetVsAct.total_limit)}     color="accent" icon="🎯" />
//               <StatCard label="Total Spent"     value={fmt(budgetVsAct.total_spent)}     color="red"    icon="💸" />
//               <StatCard label="Total Remaining" value={fmt(budgetVsAct.total_remaining)} color="green"  icon="✅" />
//             </div>
//           )}

//           <ChartCard title="Budget vs Actual" subtitle={`${MONTHS_SHORT[selMonth - 1]} ${selYear}`}>
//             {budgetChartData.length > 0
//               ? <BarChart data={budgetChartData} keys={['Budget','Spent']} colors={['#4f7fff','#f43f5e']} labelKey="label" height={280} />
//               : <EmptyChart height={280} msg="No budgets set for this month" />}
//           </ChartCard>

//           {budgetRows.length > 0 && (
//             <ChartCard title="Category Detail">
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Category</th>
//                       <th style={{ textAlign: 'right' }}>Budget</th>
//                       <th style={{ textAlign: 'right' }}>Spent</th>
//                       <th style={{ textAlign: 'right' }}>Remaining</th>
//                       <th>Usage</th>
//                       <th>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {budgetRows.map((row) => {
//                       const pct   = row.usage_percentage || 0
//                       const color = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'
//                       return (
//                         <tr key={row.category}>
//                           <td style={{ fontWeight: 600 }}>{row.category}</td>
//                           <td style={{ textAlign: 'right' }}>{fmt(row.limit)}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>{fmt(row.spent)}</td>
//                           <td style={{ textAlign: 'right', color: row.remaining < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{fmt(row.remaining)}</td>
//                           <td style={{ minWidth: 100 }}>
//                             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                               <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
//                                 <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
//                               </div>
//                               <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 36 }}>{pct.toFixed(0)}%</span>
//                             </div>
//                           </td>
//                           <td>
//                             {row.is_exceeded
//                               ? <span className="badge badge-red" style={{ fontSize: 10 }}>Exceeded</span>
//                               : row.is_alert_triggered
//                               ? <span className="badge badge-amber" style={{ fontSize: 10 }}>⚠️ Near</span>
//                               : <span className="badge badge-green" style={{ fontSize: 10 }}>✅ OK</span>}
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </ChartCard>
//           )}
//         </div>
//       )}

//       {/* ════ NET WORTH ════ */}
//       {tab === 'networth' && (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
//           <div className="grid-4">
//             <StatCard label="Total Assets"      value={fmt(nw.total_assets)}      color="green"  icon="💼" />
//             <StatCard label="Investments Value" value={fmt(nw.total_invested)}    color="accent" icon="📈" />
//             <StatCard label="Savings"           value={fmt(nw.total_savings)}     color="teal"   icon="🏦" />
//             <StatCard label="Total Liabilities" value={fmt(nw.total_liabilities)} color="red"    icon="💳" />
//           </div>

//           <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
//             <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>NET WORTH</p>
//             <p style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: (nw.net_worth || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
//               {fmt(nw.net_worth)}
//             </p>
//             <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
//               Assets {fmt(nw.total_assets)} − Liabilities {fmt(nw.total_liabilities)}
//             </p>
//           </div>

//           <div className="grid-2">
//             <ChartCard title="Investment Portfolio">
//               {(nw.investment_breakdown?.length || 0) > 0 ? (
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                   {nw.investment_breakdown.map(({ investment_type, total }) => {
//                     const pct = nw.total_invested > 0 ? ((total / nw.total_invested) * 100) : 0
//                     return (
//                       <div key={investment_type}>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
//                           <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
//                             {investment_type.replace('_', ' ')}
//                           </span>
//                           <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{fmt(total)}</span>
//                         </div>
//                         <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
//                           <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: 99 }} />
//                         </div>
//                       </div>
//                     )
//                   })}
//                 </div>
//               ) : <EmptyChart msg="No investments tracked" />}
//             </ChartCard>

//             <ChartCard title="Savings Goals Progress">
//               {savProg.length > 0 ? (
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                   {savProg.map((g) => {
//                     const pct = g.progress_percentage || 0
//                     return (
//                       <div key={g.id}>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
//                           <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.name}</span>
//                           <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--teal)' }}>
//                             {fmt(g.current_amount)} / {fmt(g.target_amount)}
//                           </span>
//                         </div>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                           <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
//                             <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'var(--teal)', borderRadius: 99 }} />
//                           </div>
//                           <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36 }}>{pct.toFixed(0)}%</span>
//                         </div>
//                       </div>
//                     )
//                   })}
//                 </div>
//               ) : <EmptyChart msg="No savings goals" />}
//             </ChartCard>
//           </div>

//           {(ip.investments?.length || 0) > 0 && (
//             <ChartCard
//               title="Investment Performance"
//               subtitle={`Overall return: ${ip.overall_return_percentage?.toFixed(2)}% · P&L: ${ip.overall_gain_loss >= 0 ? '+' : ''}${fmt(ip.overall_gain_loss)}`}
//             >
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Name</th><th>Type</th>
//                       <th style={{ textAlign: 'right' }}>Invested</th>
//                       <th style={{ textAlign: 'right' }}>Current</th>
//                       <th style={{ textAlign: 'right' }}>Gain/Loss</th>
//                       <th style={{ textAlign: 'right' }}>Return %</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {ip.investments.map((inv) => {
//                       const isGain = inv.gain_loss >= 0
//                       return (
//                         <tr key={inv.id}>
//                           <td style={{ fontWeight: 600 }}>{inv.name}</td>
//                           <td><span className="badge badge-muted" style={{ fontSize: 10 }}>{inv.investment_type}</span></td>
//                           <td style={{ textAlign: 'right' }}>{fmt(inv.invested_amount)}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{fmt(inv.current_value)}</td>
//                           <td style={{ textAlign: 'right', color: isGain ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
//                             {isGain ? '+' : ''}{fmt(inv.gain_loss)}
//                           </td>
//                           <td style={{ textAlign: 'right', color: isGain ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
//                             {isGain ? '+' : ''}{inv.return_percentage?.toFixed(2)}%
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </ChartCard>
//           )}
//         </div>
//       )}

//       {/* ════ YEARLY ════ */}
//       {tab === 'yearly' && (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
//           {yearly && (
//             <div className="grid-3">
//               <StatCard label={`Annual Income ${selYear}`}  value={fmt(yearly.annual_income)}  color="green"  icon="💰" />
//               <StatCard label={`Annual Expense ${selYear}`} value={fmt(yearly.annual_expense)} color="red"    icon="💸" />
//               <StatCard label={`Annual Net ${selYear}`}     value={fmt(yearly.annual_net)}     color={yearly.annual_net >= 0 ? 'accent' : 'red'} icon="📊" />
//             </div>
//           )}

//           <ChartCard title={`Monthly Income vs Expense — ${selYear}`}>
//             {yearlyChartData.length > 0
//               ? <BarChart data={yearlyChartData} keys={['income','expense']} colors={['#22c55e','#f43f5e']} labelKey="label" height={280} />
//               : <EmptyChart height={280} msg="No data for this year" />}
//           </ChartCard>

//           <ChartCard title={`Net Savings Trend — ${selYear}`}>
//             {netLineData.some((m) => m.net !== 0)
//               ? <LineChart data={netLineData} keys={['net']} colors={['#4f7fff']} labelKey="label" height={200} />
//               : <EmptyChart height={200} msg="No net savings data" />}
//           </ChartCard>

//           {yearlyMonths.length > 0 && (
//             <ChartCard title={`Full Year Breakdown — ${selYear}`}>
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       <th>Month</th>
//                       <th style={{ textAlign: 'right' }}>Income</th>
//                       <th style={{ textAlign: 'right' }}>Expense</th>
//                       <th style={{ textAlign: 'right' }}>Net</th>
//                       <th style={{ textAlign: 'right' }}>Savings Rate</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {yearlyMonths.map((row) => {
//                       const rate = row.income > 0 ? ((row.net / row.income) * 100).toFixed(1) : '—'
//                       return (
//                         <tr key={row.month}>
//                           <td style={{ fontWeight: 600 }}>{row.month_label} {selYear}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--green)',  fontWeight: 600 }}>{fmt(row.income)}</td>
//                           <td style={{ textAlign: 'right', color: 'var(--red)',    fontWeight: 600 }}>{fmt(row.expense)}</td>
//                           <td style={{ textAlign: 'right', color: row.net >= 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 700 }}>
//                             {row.net >= 0 ? '+' : ''}{fmt(row.net)}
//                           </td>
//                           <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
//                             {rate !== '—' ? `${rate}%` : '—'}
//                           </td>
//                         </tr>
//                       )
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr>
//                       <td style={{ fontWeight: 700, color: 'var(--text-primary)', padding: '12px 16px' }}>Total</td>
//                       <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--green)' }}>{fmt(yearly?.annual_income)}</td>
//                       <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--red)' }}>{fmt(yearly?.annual_expense)}</td>
//                       <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: (yearly?.annual_net || 0) >= 0 ? 'var(--accent)' : 'var(--red)' }}>
//                         {(yearly?.annual_net || 0) >= 0 ? '+' : ''}{fmt(yearly?.annual_net)}
//                       </td>
//                       <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)' }}>
//                         {yearly?.annual_income > 0 ? `${((yearly.annual_net / yearly.annual_income) * 100).toFixed(1)}%` : '—'}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             </ChartCard>
//           )}
//         </div>
//       )}

//     </div>
//   )
// }

// export default Analytics