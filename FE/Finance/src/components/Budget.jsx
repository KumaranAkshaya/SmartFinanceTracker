import { useState, useEffect } from 'react'
import {
  getBudgets, createBudget, updateBudget, deleteBudget,
  getBudgetSummary, getBudgetAlerts, markBudgetAlert,
  getExpenseCategories,
} from '../api'

/* ── helpers ─────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n || 0)

const now        = new Date()
const thisMonth  = now.getMonth() + 1
const thisYear   = now.getFullYear()

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const EMPTY_FORM = {
  category:        '',
  month:           thisMonth,
  year:            thisYear,
  limit_amount:    '',
  alert_threshold: 80,
}

/* ── progress colour ────────────────────────── */
function progressColor(pct) {
  if (pct >= 100) return 'var(--red)'
  if (pct >= 80)  return 'var(--amber)'
  return 'var(--green)'
}

/* ── Modal shell ─────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 500 }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── Budget form ─────────────────────────────── */
function BudgetForm({ form, setForm, categories, onSubmit, onClose, loading, error, isEdit }) {
  const handle = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Expense Category *</label>
        <select name="category" className="form-select" value={form.category} onChange={handle} required disabled={isEdit}>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.category_type})</option>
          ))}
        </select>
        {isEdit && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category cannot be changed after creation</span>
        )}
      </div>

      {/* Month + Year */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Month *</label>
          <select name="month" className="form-select" value={form.month} onChange={handle} required disabled={isEdit}>
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Year *</label>
          <select name="year" className="form-select" value={form.year} onChange={handle} required disabled={isEdit}>
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Limit amount */}
      <div className="form-group">
        <label className="form-label">Budget Limit (₹) *</label>
        <input
          name="limit_amount" type="number" min="1" step="0.01"
          className="form-input" placeholder="e.g. 5000"
          value={form.limit_amount} onChange={handle} required
        />
      </div>

      {/* Alert threshold */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="form-label" style={{ margin: 0 }}>Alert Threshold</label>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{form.alert_threshold}%</span>
        </div>
        <input
          name="alert_threshold" type="range" min="10" max="100" step="5"
          value={form.alert_threshold} onChange={handle}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          <span>10%</span>
          <span>Alert fires when spending reaches this %</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Budget' : 'Create Budget'}
        </button>
      </div>
    </form>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ budget, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Budget" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Delete the budget for{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {budget.category_name}
          </strong>{' '}
          ({MONTHS[budget.month - 1]} {budget.year})?
          Spending data will not be affected.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Budget card ─────────────────────────────── */
function BudgetCard({ budget, onEdit, onDelete }) {
  const pct       = budget.usage_percentage || 0
  const color     = progressColor(pct)
  const remaining = parseFloat(budget.remaining_amount || 0)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}>

      {/* Top colour strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: '14px 14px 0 0',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
            {budget.category_name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {MONTHS[budget.month - 1]} {budget.year}
            {' · '}
            <span style={{ color: 'var(--text-secondary)' }}>{budget.category_type}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {budget.is_exceeded && (
            <span className="badge badge-red" style={{ fontSize: 10 }}>Exceeded</span>
          )}
          {!budget.is_exceeded && budget.is_alert_triggered && (
            <span className="badge badge-amber" style={{ fontSize: 10 }}>⚠️ Alert</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {fmt(budget.spent_amount)} spent
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.6s ease',
            boxShadow: pct >= 80 ? `0 0 8px ${color}60` : 'none',
          }} />
        </div>
      </div>

      {/* Amount row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Limit',     value: fmt(budget.limit_amount),  color: 'var(--text-primary)'   },
          { label: 'Spent',     value: fmt(budget.spent_amount),  color: 'var(--red)'            },
          { label: 'Remaining', value: fmt(Math.abs(remaining)),  color: remaining < 0 ? 'var(--red)' : 'var(--green)' },
        ].map(({ label, value, color: c }) => (
          <div key={label} style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Alert threshold tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          🔔 Alert at {budget.alert_threshold}%
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(budget)} title="Edit">✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(budget)} title="Delete">🗑️</button>
        </div>
      </div>

    </div>
  )
}

/* ── Alerts panel ────────────────────────────── */
function AlertsPanel({ alerts, onMarkRead, onMarkAll }) {
  if (alerts.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
            Budget Alerts
          </span>
          <span className="badge badge-amber">{alerts.length}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onMarkAll}>Mark all read</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((alert) => (
          <div key={alert.id} style={{
            background: alert.alert_type === 'exceeded' ? 'var(--red-dim)' : 'var(--amber-dim)',
            border: `1px solid ${alert.alert_type === 'exceeded' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>
                {alert.budget_category} — {MONTHS[(alert.budget_month || 1) - 1]} {alert.budget_year}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {alert.message}
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flexShrink: 0, padding: '4px 8px', fontSize: 11 }}
              onClick={() => onMarkRead(alert.id)}
            >
              ✓ Read
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Budget() {
  const [budgets,     setBudgets]     = useState([])
  const [summary,     setSummary]     = useState(null)
  const [alerts,      setAlerts]      = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pageError,   setPageError]   = useState('')

  /* month/year filter */
  const [selMonth,  setSelMonth]  = useState(thisMonth)
  const [selYear,   setSelYear]   = useState(thisYear)

  /* modals */
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* form */
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  /* ── load ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const [b, s, a, cats] = await Promise.all([
        getBudgets({ month: selMonth, year: selYear }),
        getBudgetSummary({ month: selMonth, year: selYear }),
        getBudgetAlerts(),
        getExpenseCategories(),
      ])
      setBudgets(b.data  || [])
      setSummary(s.data  || null)
      setAlerts(a.data   || [])
      setCategories(cats.data || [])
    } catch (e) {
      if (!e.isSessionExpired) setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selMonth, selYear])

  /* ── open add ── */
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, month: selMonth, year: selYear })
    setFormErr('')
    setShowAdd(true)
  }

  /* ── open edit ── */
  const openEdit = (b) => {
    setForm({
      category:        b.category,
      month:           b.month,
      year:            b.year,
      limit_amount:    b.limit_amount,
      alert_threshold: b.alert_threshold,
    })
    setFormErr('')
    setEditTarget(b)
  }

  /* ── submit add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await createBudget({
        ...form,
        limit_amount:    parseFloat(form.limit_amount),
        alert_threshold: parseInt(form.alert_threshold),
      })
      setShowAdd(false)
      loadData()
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setFormLoad(false)
    }
  }

  /* ── submit edit ── */
  const handleEdit = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await updateBudget(editTarget.id, {
        limit_amount:    parseFloat(form.limit_amount),
        alert_threshold: parseInt(form.alert_threshold),
      })
      setEditTarget(null)
      loadData()
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setFormLoad(false)
    }
  }

  /* ── delete ── */
  const handleDelete = async () => {
    setDeleteLoad(true)
    try {
      await deleteBudget(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── mark alert read ── */
  const markRead = async (id) => {
    try {
      await markBudgetAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await markBudgetAlert()
      setAlerts([])
    } catch {}
  }

  /* ── summary numbers ── */
  const s              = summary || {}
  const overallPct     = s.total_limit > 0 ? (s.total_spent / s.total_limit) * 100 : 0
  const exceededCount  = budgets.filter((b) => b.is_exceeded).length
  const onTrackCount   = budgets.filter((b) => !b.is_exceeded && !b.is_alert_triggered).length
  const warningCount   = budgets.filter((b) => b.is_alert_triggered && !b.is_exceeded).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading budgets…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-subtitle">Set limits and track spending per category</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month selector */}
          <select
            className="form-select" style={{ width: 'auto' }}
            value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select
            className="form-select" style={{ width: 'auto' }}
            value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}
          >
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={openAdd}>+ Set Budget</button>
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Unread alerts ── */}
      <AlertsPanel alerts={alerts} onMarkRead={markRead} onMarkAll={markAllRead} />

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Limit</span>
            <div className="stat-icon accent">🎯</div>
          </div>
          <div className="stat-value">{fmt(s.total_limit)}</div>
          <div className="stat-change neutral">{budgets.length} categories</div>
        </div>
        <div className="stat-card red">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Spent</span>
            <div className="stat-icon red">💸</div>
          </div>
          <div className="stat-value">{fmt(s.total_spent)}</div>
          <div className="stat-change neutral">{overallPct.toFixed(1)}% of limit used</div>
        </div>
        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Remaining</span>
            <div className="stat-icon green">✅</div>
          </div>
          <div className="stat-value">{fmt(s.total_remaining)}</div>
          <div className="stat-change neutral">{onTrackCount} on track</div>
        </div>
        <div className={`stat-card ${exceededCount > 0 ? 'red' : warningCount > 0 ? 'amber' : 'green'}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Status</span>
            <div className={`stat-icon ${exceededCount > 0 ? 'red' : warningCount > 0 ? 'amber' : 'green'}`}>
              {exceededCount > 0 ? '🚨' : warningCount > 0 ? '⚠️' : '✅'}
            </div>
          </div>
          <div className="stat-value">{exceededCount}</div>
          <div className="stat-change neutral">
            {exceededCount > 0
              ? `${exceededCount} exceeded · ${warningCount} warning`
              : warningCount > 0
              ? `${warningCount} near limit`
              : 'All within budget'}
          </div>
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      {budgets.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Overall Budget Usage — {MONTHS[selMonth - 1]} {selYear}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: progressColor(overallPct) }}>
              {overallPct.toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 12, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(overallPct, 100)}%`,
              background: progressColor(overallPct),
              borderRadius: 99,
              transition: 'width 0.6s ease',
              boxShadow: overallPct >= 80 ? `0 0 12px ${progressColor(overallPct)}50` : 'none',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {fmt(s.total_spent)} spent of {fmt(s.total_limit)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--green)' }}>
              {fmt(s.total_remaining)} remaining
            </span>
          </div>
        </div>
      )}

      {/* ── Budget cards grid ── */}
      {budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <p className="empty-state-title">No budgets for {MONTHS[selMonth - 1]} {selYear}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Set spending limits per category to track your budget.
            </p>
            <button className="btn btn-primary" onClick={openAdd}>+ Set Budget</button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <Modal title="Set Budget" onClose={() => setShowAdd(false)}>
          <BudgetForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            loading={formLoad} error={formErr}
            isEdit={false}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Budget" onClose={() => setEditTarget(null)}>
          <BudgetForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
            loading={formLoad} error={formErr}
            isEdit={true}
          />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal
          budget={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

    </div>
  )
}

export default Budget