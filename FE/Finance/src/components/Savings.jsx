import { useState, useEffect } from 'react'
import {
  getSavings, createSaving, updateSaving, deleteSaving,
} from '../api'

/* ── helpers ─────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '—'

const SAVING_TYPES = [
  { value: 'emergency_fund', label: 'Emergency Fund', emoji: '🚨', color: 'badge-red'    },
  { value: 'goal_based',     label: 'Goal Based',     emoji: '🎯', color: 'badge-accent' },
  { value: 'retirement',     label: 'Retirement',     emoji: '🏖️', color: 'badge-purple' },
  { value: 'education',      label: 'Education',      emoji: '🎓', color: 'badge-green'  },
  { value: 'other',          label: 'Other',          emoji: '💰', color: 'badge-muted'  },
]

const getSavingType = (val) =>
  SAVING_TYPES.find((t) => t.value === val) || SAVING_TYPES[4]

const EMPTY_FORM = {
  name:                 '',
  saving_type:          'goal_based',
  target_amount:        '',
  monthly_contribution: '',
  yearly_contribution:  '',
  current_amount:       '',
  target_date:          '',
  is_active:            true,
}

/* ── progress colour ─────────────────────────── */
function progressColor(pct) {
  if (pct >= 100) return 'var(--green)'
  if (pct >= 60)  return 'var(--accent)'
  if (pct >= 30)  return 'var(--amber)'
  return 'var(--red)'
}

/* ── days remaining ──────────────────────────── */
function daysRemaining(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

/* ── Modal shell ─────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 520 }) {
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

/* ── Saving form ─────────────────────────────── */
function SavingForm({ form, setForm, onSubmit, onClose, loading, error, isEdit }) {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const yearlyFromMonthly = form.monthly_contribution
    ? (parseFloat(form.monthly_contribution) * 12).toLocaleString('en-IN')
    : null

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Name */}
      <div className="form-group">
        <label className="form-label">Goal Name *</label>
        <input
          name="name" type="text" className="form-input"
          placeholder="e.g. Europe Trip, Emergency Fund, New Car"
          value={form.name} onChange={handle} required autoFocus
        />
      </div>

      {/* Type */}
      <div className="form-group">
        <label className="form-label">Saving Type *</label>
        <select name="saving_type" className="form-select" value={form.saving_type} onChange={handle}>
          {SAVING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
          ))}
        </select>
      </div>

      {/* Target + Current */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Target Amount (₹) *</label>
          <input
            name="target_amount" type="number" min="1" step="0.01"
            className="form-input" placeholder="e.g. 100000"
            value={form.target_amount} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Current Amount (₹)</label>
          <input
            name="current_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.current_amount} onChange={handle}
          />
        </div>
      </div>

      {/* Monthly + Yearly contribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Monthly Contribution (₹)</label>
          <input
            name="monthly_contribution" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.monthly_contribution} onChange={handle}
          />
          {yearlyFromMonthly && (
            <span style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>
              ≈ ₹{yearlyFromMonthly} / year
            </span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Yearly Contribution (₹)</label>
          <input
            name="yearly_contribution" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.yearly_contribution} onChange={handle}
          />
        </div>
      </div>

      {/* Target date */}
      <div className="form-group">
        <label className="form-label">Target Date</label>
        <input
          name="target_date" type="date"
          className="form-input"
          value={form.target_date} onChange={handle}
        />
      </div>

      {/* Active toggle */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
      }}>
        <input
          name="is_active" type="checkbox"
          checked={form.is_active} onChange={handle}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        Goal is active
      </label>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ saving, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Saving Goal" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Delete the saving goal{' '}
          <strong style={{ color: 'var(--text-primary)' }}>"{saving.name}"</strong>?
          All progress data will be lost permanently.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete Goal'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Saving card ─────────────────────────────── */
function SavingCard({ saving, onEdit, onDelete }) {
  const target  = parseFloat(saving.target_amount  || 0)
  const current = parseFloat(saving.current_amount || 0)
  const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const color   = progressColor(pct)
  const type    = getSavingType(saving.saving_type)
  const days    = daysRemaining(saving.target_date)
  const isGoalReached = current >= target && target > 0

  /* months to goal at current monthly rate */
  const monthlyContrib = parseFloat(saving.monthly_contribution || 0)
  const remaining      = Math.max(target - current, 0)
  const monthsToGoal   = monthlyContrib > 0
    ? Math.ceil(remaining / monthlyContrib)
    : null

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative', overflow: 'hidden',
      opacity: saving.is_active ? 1 : 0.6,
    }}>

      {/* Top accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isGoalReached ? 'var(--green)' : color,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {isGoalReached ? '🎉' : type.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.3 }}>
              {saving.name}
            </p>
            <span className={`badge ${type.color}`} style={{ fontSize: 10, marginTop: 3 }}>
              {type.label}
            </span>
          </div>
        </div>
        {!saving.is_active && (
          <span className="badge badge-muted" style={{ fontSize: 10 }}>Inactive</span>
        )}
        {isGoalReached && (
          <span className="badge badge-green" style={{ fontSize: 10 }}>🎉 Goal Reached!</span>
        )}
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {fmt(current)} saved
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: isGoalReached
              ? 'linear-gradient(90deg, var(--green), var(--teal))'
              : color,
            borderRadius: 99,
            transition: 'width 0.6s ease',
            boxShadow: pct >= 60 ? `0 0 10px ${color}50` : 'none',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹0</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: {fmt(target)}</span>
        </div>
      </div>

      {/* Amount grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Target',    value: fmt(target),                  col: 'var(--text-primary)' },
          { label: 'Saved',     value: fmt(current),                 col: 'var(--green)'        },
          { label: 'Remaining', value: fmt(Math.max(remaining, 0)),  col: remaining > 0 ? 'var(--amber)' : 'var(--green)' },
        ].map(({ label, value, col }) => (
          <div key={label} style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: col }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contribution row */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly contribution</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 1 }}>
            {monthlyContrib > 0 ? fmt(monthlyContrib) : '—'}
          </p>
        </div>
        {monthsToGoal !== null && !isGoalReached && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Est. completion</span>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
              ~{monthsToGoal} month{monthsToGoal !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Target date + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {saving.target_date ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              📅 {fmtDate(saving.target_date)}
              {days !== null && !isGoalReached && (
                <span style={{
                  marginLeft: 6,
                  color: days < 0 ? 'var(--red)' : days < 30 ? 'var(--amber)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No target date</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(saving)} title="Edit">✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(saving)} title="Delete">🗑️</button>
        </div>
      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Savings() {
  const [savings,     setSavings]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pageError,   setPageError]   = useState('')

  /* modals */
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* form */
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  /* filter */
  const [filterType,   setFilterType]   = useState('')
  const [filterActive, setFilterActive] = useState('')

  /* ── load ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const res = await getSavings()
      setSavings(res.data || [])
    } catch (e) {
      if (!e.isSessionExpired) setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  /* ── open add ── */
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormErr('')
    setShowAdd(true)
  }

  /* ── open edit ── */
  const openEdit = (s) => {
    setForm({
      name:                 s.name,
      saving_type:          s.saving_type,
      target_amount:        s.target_amount,
      monthly_contribution: s.monthly_contribution || '',
      yearly_contribution:  s.yearly_contribution  || '',
      current_amount:       s.current_amount       || '',
      target_date:          s.target_date          || '',
      is_active:            s.is_active,
    })
    setFormErr('')
    setEditTarget(s)
  }

  /* ── submit add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await createSaving({
        ...form,
        target_amount:        parseFloat(form.target_amount        || 0),
        current_amount:       parseFloat(form.current_amount       || 0),
        monthly_contribution: parseFloat(form.monthly_contribution || 0),
        yearly_contribution:  parseFloat(form.yearly_contribution  || 0),
        target_date:          form.target_date || null,
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
      await updateSaving(editTarget.id, {
        ...form,
        target_amount:        parseFloat(form.target_amount        || 0),
        current_amount:       parseFloat(form.current_amount       || 0),
        monthly_contribution: parseFloat(form.monthly_contribution || 0),
        yearly_contribution:  parseFloat(form.yearly_contribution  || 0),
        target_date:          form.target_date || null,
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
      await deleteSaving(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── filtered + sorted ── */
  const filtered = savings
    .filter((s) => filterType   ? s.saving_type === filterType            : true)
    .filter((s) => filterActive === 'active'   ? s.is_active              :
                   filterActive === 'inactive' ? !s.is_active             : true)
    .sort((a, b) => {
      // goals reached go to bottom, active on top
      const aDone = parseFloat(a.current_amount) >= parseFloat(a.target_amount)
      const bDone = parseFloat(b.current_amount) >= parseFloat(b.target_amount)
      if (aDone && !bDone) return 1
      if (!aDone && bDone) return -1
      return 0
    })

  /* ── summary numbers ── */
  const activeSavings   = savings.filter((s) => s.is_active)
  const totalTarget     = activeSavings.reduce((s, g) => s + parseFloat(g.target_amount  || 0), 0)
  const totalSaved      = activeSavings.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const totalMonthly    = activeSavings.reduce((s, g) => s + parseFloat(g.monthly_contribution || 0), 0)
  const goalsReached    = activeSavings.filter((g) =>
    parseFloat(g.current_amount) >= parseFloat(g.target_amount) && parseFloat(g.target_amount) > 0
  ).length
  const overallPct      = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading savings goals…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header" style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Track progress towards your financial goals</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Goal</button>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card teal">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Saved</span>
            <div className="stat-icon teal">🏦</div>
          </div>
          <div className="stat-value">{fmt(totalSaved)}</div>
          <div className="stat-change neutral">{activeSavings.length} active goals</div>
        </div>

        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Target</span>
            <div className="stat-icon accent">🎯</div>
          </div>
          <div className="stat-value">{fmt(totalTarget)}</div>
          <div className="stat-change neutral">{overallPct.toFixed(1)}% achieved</div>
        </div>

        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Monthly Saving</span>
            <div className="stat-icon purple">📅</div>
          </div>
          <div className="stat-value">{fmt(totalMonthly)}</div>
          <div className="stat-change neutral">combined contribution</div>
        </div>

        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Goals Reached</span>
            <div className="stat-icon green">🎉</div>
          </div>
          <div className="stat-value">{goalsReached}</div>
          <div className="stat-change neutral">of {activeSavings.length} goals</div>
        </div>
      </div>

      {/* ── Overall progress ── */}
      {activeSavings.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Overall Savings Progress
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: progressColor(overallPct) }}>
              {overallPct.toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(overallPct, 100)}%`,
              background: overallPct >= 100
                ? 'linear-gradient(90deg, var(--green), var(--teal))'
                : progressColor(overallPct),
              borderRadius: 99, transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(totalSaved)} saved</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(totalTarget)} target</span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType}
              onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {SAVING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {(filterType || filterActive) && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
              onClick={() => { setFilterType(''); setFilterActive('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Goals grid ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏦</div>
            <p className="empty-state-title">
              {savings.length === 0 ? 'No savings goals yet' : 'No goals match your filters'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {savings.length === 0
                ? 'Create your first goal — vacation, emergency fund, retirement, or anything you are saving for.'
                : 'Try adjusting your filters.'}
            </p>
            {savings.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}>+ New Goal</button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((s) => (
            <SavingCard
              key={s.id}
              saving={s}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <Modal title="New Saving Goal" onClose={() => setShowAdd(false)}>
          <SavingForm
            form={form} setForm={setForm}
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            loading={formLoad} error={formErr}
            isEdit={false}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Saving Goal" onClose={() => setEditTarget(null)}>
          <SavingForm
            form={form} setForm={setForm}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
            loading={formLoad} error={formErr}
            isEdit={true}
          />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal
          saving={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

    </div>
  )
}

export default Savings