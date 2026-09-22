import { useState, useEffect } from 'react'
import {
  getInvestments, createInvestment, updateInvestment, deleteInvestment,
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

const INVESTMENT_TYPES = [
  { value: 'sip',         label: 'SIP',            emoji: '📈', color: 'badge-green'  },
  { value: 'lumpsum',     label: 'Lump Sum',        emoji: '💵', color: 'badge-accent' },
  { value: 'stocks',      label: 'Stocks',          emoji: '📊', color: 'badge-purple' },
  { value: 'fd',          label: 'Fixed Deposit',   emoji: '🏦', color: 'badge-amber'  },
  { value: 'rd',          label: 'Recurring Dep.',  emoji: '🔁', color: 'badge-teal'   },
  { value: 'ppf',         label: 'PPF',             emoji: '🏛️', color: 'badge-green'  },
  { value: 'nps',         label: 'NPS',             emoji: '🧓', color: 'badge-purple' },
  { value: 'gold',        label: 'Gold',            emoji: '🥇', color: 'badge-amber'  },
  { value: 'real_estate', label: 'Real Estate',     emoji: '🏠', color: 'badge-red'    },
  { value: 'crypto',      label: 'Crypto',          emoji: '₿',  color: 'badge-accent' },
  { value: 'other',       label: 'Other',           emoji: '💼', color: 'badge-muted'  },
]

const getInvType = (val) =>
  INVESTMENT_TYPES.find((t) => t.value === val) || INVESTMENT_TYPES[10]

const EMPTY_FORM = {
  name:                 '',
  investment_type:      'sip',
  platform:             '',
  monthly_amount:       '',
  yearly_amount:        '',
  invested_amount:      '',
  current_value:        '',
  expected_return_rate: '',
  start_date:           '',
  maturity_date:        '',
  is_active:            true,
}

/* ── Modal shell ─────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 560 }) {
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

/* ── Investment form ─────────────────────────── */
function InvestmentForm({ form, setForm, onSubmit, onClose, loading, error, isEdit }) {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const gainLoss   = parseFloat(form.current_value || 0) - parseFloat(form.invested_amount || 0)
  const returnPct  = parseFloat(form.invested_amount) > 0
    ? ((gainLoss / parseFloat(form.invested_amount)) * 100).toFixed(2)
    : null

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Name + Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Investment Name *</label>
          <input
            name="name" type="text" className="form-input" autoFocus
            placeholder="e.g. HDFC Mid Cap SIP, Reliance Stocks"
            value={form.name} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type *</label>
          <select name="investment_type" className="form-select"
            value={form.investment_type} onChange={handle}>
            {INVESTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Platform / Broker</label>
          <input
            name="platform" type="text" className="form-input"
            placeholder="e.g. Zerodha, Groww, SBI"
            value={form.platform} onChange={handle}
          />
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Monthly Amount (₹)</label>
          <input
            name="monthly_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.monthly_amount} onChange={handle}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Yearly Amount (₹)</label>
          <input
            name="yearly_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.yearly_amount} onChange={handle}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Total Invested (₹) *</label>
          <input
            name="invested_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.invested_amount} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Current Value (₹) *</label>
          <input
            name="current_value" type="number" min="0" step="0.01"
            className="form-input" placeholder="0"
            value={form.current_value} onChange={handle} required
          />
        </div>
      </div>

      {/* Live gain/loss preview */}
      {form.invested_amount && form.current_value && (
        <div style={{
          background: gainLoss >= 0 ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${gainLoss >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {gainLoss >= 0 ? '📈 Unrealised Gain' : '📉 Unrealised Loss'}
          </span>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: gainLoss >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)}
            </span>
            {returnPct && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                ({returnPct}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Return rate + dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Expected Return %</label>
          <input
            name="expected_return_rate" type="number" min="0" max="100" step="0.01"
            className="form-input" placeholder="e.g. 12"
            value={form.expected_return_rate} onChange={handle}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input
            name="start_date" type="date"
            className="form-input"
            value={form.start_date} onChange={handle}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Maturity Date</label>
          <input
            name="maturity_date" type="date"
            className="form-input"
            value={form.maturity_date} onChange={handle}
          />
        </div>
      </div>

      {/* Active */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
      }}>
        <input
          name="is_active" type="checkbox"
          checked={form.is_active} onChange={handle}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        Investment is active
      </label>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Investment' : 'Add Investment'}
        </button>
      </div>
    </form>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ inv, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Investment" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>"{inv.name}"</strong>?
          All investment data will be permanently removed.
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

/* ── Investment card ─────────────────────────── */
function InvestmentCard({ inv, onEdit, onDelete }) {
  const invested  = parseFloat(inv.invested_amount || 0)
  const current   = parseFloat(inv.current_value   || 0)
  const gainLoss  = current - invested
  const returnPct = invested > 0 ? ((gainLoss / invested) * 100) : 0
  const isGain    = gainLoss >= 0
  const type      = getInvType(inv.investment_type)

  /* maturity countdown */
  const matDays = inv.maturity_date
    ? Math.ceil((new Date(inv.maturity_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
      opacity: inv.is_active ? 1 : 0.6,
    }}>

      {/* Top strip — green for gain, red for loss */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isGain ? 'var(--green)' : 'var(--red)',
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {type.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.3 }}>
              {inv.name}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={`badge ${type.color}`} style={{ fontSize: 10 }}>{type.label}</span>
              {inv.platform && (
                <span className="badge badge-muted" style={{ fontSize: 10 }}>🏢 {inv.platform}</span>
              )}
              {!inv.is_active && (
                <span className="badge badge-muted" style={{ fontSize: 10 }}>Inactive</span>
              )}
            </div>
          </div>
        </div>

        {/* Return badge */}
        <div style={{
          background: isGain ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${isGain ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
          borderRadius: 'var(--radius-md)', padding: '6px 10px', textAlign: 'right', flexShrink: 0,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 1 }}>Return</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: isGain ? 'var(--green)' : 'var(--red)' }}>
            {isGain ? '+' : ''}{returnPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Value row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Invested',      value: fmt(invested), color: 'var(--text-primary)' },
          { label: 'Current Value', value: fmt(current),  color: 'var(--accent)'       },
          { label: isGain ? 'Gain' : 'Loss',
            value: `${isGain ? '+' : ''}${fmt(gainLoss)}`,
            color: isGain ? 'var(--green)' : 'var(--red)',
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Gain/loss mini bar */}
      <div>
        <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(Math.abs(returnPct), 100)}%`,
            background: isGain
              ? 'linear-gradient(90deg, var(--green), var(--teal))'
              : 'linear-gradient(90deg, var(--red), var(--amber))',
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Monthly + Expected return row */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 1 }}>
            {parseFloat(inv.monthly_amount) > 0 ? fmt(inv.monthly_amount) : '—'}
          </p>
        </div>
        {parseFloat(inv.expected_return_rate) > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expected p.a.</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginTop: 1 }}>
              {inv.expected_return_rate}%
            </p>
          </div>
        )}
      </div>

      {/* Dates + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {inv.start_date && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              🗓 Start: {fmtDate(inv.start_date)}
            </span>
          )}
          {inv.maturity_date && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: matDays !== null && matDays < 30
                ? (matDays < 0 ? 'var(--red)' : 'var(--amber)')
                : 'var(--text-muted)',
            }}>
              🏁 {fmtDate(inv.maturity_date)}
              {matDays !== null && (
                <span style={{ marginLeft: 4 }}>
                  {matDays < 0 ? `(matured)` : `(${matDays}d)`}
                </span>
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(inv)} title="Edit">✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(inv)} title="Delete">🗑️</button>
        </div>
      </div>

    </div>
  )
}

/* ── Type filter pills ───────────────────────── */
function TypePills({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
      <button
        className={`btn btn-sm ${!active ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => onChange('')}
      >All</button>
      {INVESTMENT_TYPES.map((t) => (
        <button
          key={t.value}
          className={`btn btn-sm ${active === t.value ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(t.value)}
        >
          {t.emoji} {t.label}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Investments() {
  const [investments, setInvestments] = useState([])
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

  /* filters */
  const [filterType,   setFilterType]   = useState('')
  const [filterActive, setFilterActive] = useState('active')
  const [sortBy,       setSortBy]       = useState('gain')   // gain | invested | name

  /* ── load ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const res = await getInvestments()
      setInvestments(res.data || [])
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
  const openEdit = (inv) => {
    setForm({
      name:                 inv.name,
      investment_type:      inv.investment_type,
      platform:             inv.platform             || '',
      monthly_amount:       inv.monthly_amount       || '',
      yearly_amount:        inv.yearly_amount        || '',
      invested_amount:      inv.invested_amount      || '',
      current_value:        inv.current_value        || '',
      expected_return_rate: inv.expected_return_rate || '',
      start_date:           inv.start_date           || '',
      maturity_date:        inv.maturity_date        || '',
      is_active:            inv.is_active,
    })
    setFormErr('')
    setEditTarget(inv)
  }

  /* ── submit add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await createInvestment({
        ...form,
        monthly_amount:       parseFloat(form.monthly_amount       || 0),
        yearly_amount:        parseFloat(form.yearly_amount        || 0),
        invested_amount:      parseFloat(form.invested_amount      || 0),
        current_value:        parseFloat(form.current_value        || 0),
        expected_return_rate: parseFloat(form.expected_return_rate || 0),
        start_date:           form.start_date    || null,
        maturity_date:        form.maturity_date || null,
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
      await updateInvestment(editTarget.id, {
        ...form,
        monthly_amount:       parseFloat(form.monthly_amount       || 0),
        yearly_amount:        parseFloat(form.yearly_amount        || 0),
        invested_amount:      parseFloat(form.invested_amount      || 0),
        current_value:        parseFloat(form.current_value        || 0),
        expected_return_rate: parseFloat(form.expected_return_rate || 0),
        start_date:           form.start_date    || null,
        maturity_date:        form.maturity_date || null,
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
      await deleteInvestment(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── derived numbers ── */
  const active = investments.filter((i) => i.is_active)

  const totalInvested = active.reduce((s, i) => s + parseFloat(i.invested_amount || 0), 0)
  const totalCurrent  = active.reduce((s, i) => s + parseFloat(i.current_value   || 0), 0)
  const totalGainLoss = totalCurrent - totalInvested
  const overallReturn = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0
  const totalMonthly  = active.reduce((s, i) => s + parseFloat(i.monthly_amount  || 0), 0)

  const gainers = active.filter((i) => parseFloat(i.current_value) > parseFloat(i.invested_amount)).length
  const losers  = active.filter((i) => parseFloat(i.current_value) < parseFloat(i.invested_amount)).length

  /* ── type breakdown for mini chart ── */
  const typeBreakdown = INVESTMENT_TYPES.map((t) => ({
    ...t,
    total: active
      .filter((i) => i.investment_type === t.value)
      .reduce((s, i) => s + parseFloat(i.current_value || 0), 0),
  })).filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)

  /* ── filtered + sorted list ── */
  const filtered = investments
    .filter((i) => filterType   ? i.investment_type === filterType              : true)
    .filter((i) => filterActive === 'active'   ? i.is_active                   :
                   filterActive === 'inactive' ? !i.is_active                  : true)
    .sort((a, b) => {
      if (sortBy === 'gain') {
        const ga = parseFloat(a.current_value || 0) - parseFloat(a.invested_amount || 0)
        const gb = parseFloat(b.current_value || 0) - parseFloat(b.invested_amount || 0)
        return gb - ga
      }
      if (sortBy === 'invested') return parseFloat(b.invested_amount || 0) - parseFloat(a.invested_amount || 0)
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      return 0
    })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading investments…</p>
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
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">Portfolio performance and tracking</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Investment</button>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Invested</span>
            <div className="stat-icon accent">💼</div>
          </div>
          <div className="stat-value">{fmt(totalInvested)}</div>
          <div className="stat-change neutral">{active.length} active investments</div>
        </div>

        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Current Value</span>
            <div className="stat-icon purple">📊</div>
          </div>
          <div className="stat-value">{fmt(totalCurrent)}</div>
          <div className="stat-change neutral">portfolio valuation</div>
        </div>

        <div className={`stat-card ${totalGainLoss >= 0 ? 'green' : 'red'}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total {totalGainLoss >= 0 ? 'Gain' : 'Loss'}</span>
            <div className={`stat-icon ${totalGainLoss >= 0 ? 'green' : 'red'}`}>
              {totalGainLoss >= 0 ? '📈' : '📉'}
            </div>
          </div>
          <div className="stat-value">{totalGainLoss >= 0 ? '+' : ''}{fmt(totalGainLoss)}</div>
          <div className={`stat-change ${totalGainLoss >= 0 ? 'up' : 'down'}`}>
            {totalGainLoss >= 0 ? '↑' : '↓'} {Math.abs(overallReturn).toFixed(2)}% overall return
          </div>
        </div>

        <div className="stat-card amber">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Monthly SIP</span>
            <div className="stat-icon amber">🔄</div>
          </div>
          <div className="stat-value">{fmt(totalMonthly)}</div>
          <div className="stat-change neutral">
            {gainers} gainers · {losers} losers
          </div>
        </div>
      </div>

      {/* ── Portfolio breakdown ── */}
      {typeBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>Portfolio Breakdown by Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {typeBreakdown.map(({ value, label, emoji, total }) => {
              const pct = totalCurrent > 0 ? (total / totalCurrent) * 100 : 0
              return (
                <div key={value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {emoji} {label}
                    </span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {pct.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, textAlign: 'right' }}>
                        {fmt(total)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--accent), var(--purple))',
                      borderRadius: 99, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        {/* Status filter */}
        <select className="form-select" style={{ width: 'auto' }}
          value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">All investments</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>

        {/* Sort */}
        <select className="form-select" style={{ width: 'auto' }}
          value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="gain">Sort by Gain/Loss</option>
          <option value="invested">Sort by Amount Invested</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* ── Type pills ── */}
      <TypePills active={filterType} onChange={setFilterType} />

      {/* ── Cards grid ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📉</div>
            <p className="empty-state-title">
              {investments.length === 0 ? 'No investments yet' : 'No investments match your filters'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {investments.length === 0
                ? 'Start tracking your SIPs, stocks, FDs, and more.'
                : 'Try adjusting your filters.'}
            </p>
            {investments.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}>+ Add Investment</button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((inv) => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <Modal title="Add Investment" onClose={() => setShowAdd(false)}>
          <InvestmentForm
            form={form} setForm={setForm}
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            loading={formLoad} error={formErr}
            isEdit={false}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Investment" onClose={() => setEditTarget(null)}>
          <InvestmentForm
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
          inv={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

    </div>
  )
}

export default Investments