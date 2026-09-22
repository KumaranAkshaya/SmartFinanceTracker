import { useState, useEffect } from 'react'
import {
  getEmergencyExpenses, createEmergencyExpense,
  updateEmergencyExpense, deleteEmergencyExpense,
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

const EMERGENCY_TYPES = [
  { value: 'medical',          label: 'Medical',          emoji: '🏥', color: 'badge-red'    },
  { value: 'vehicle_repair',   label: 'Vehicle Repair',   emoji: '🔧', color: 'badge-amber'  },
  { value: 'home_repair',      label: 'Home Repair',      emoji: '🏠', color: 'badge-purple' },
  { value: 'job_loss',         label: 'Job Loss',         emoji: '💼', color: 'badge-red'    },
  { value: 'natural_disaster', label: 'Natural Disaster', emoji: '🌪️', color: 'badge-amber'  },
  { value: 'other',            label: 'Other',            emoji: '⚡', color: 'badge-muted'  },
]

const getEType = (val) => EMERGENCY_TYPES.find((t) => t.value === val) || EMERGENCY_TYPES[5]

const EMPTY_FORM = {
  emergency_type:         'other',
  title:                  '',
  amount:                 '',
  expense_date:           new Date().toISOString().split('T')[0],
  covered_by_insurance:   false,
  insurance_claim_amount: '',
  description:            '',
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

/* ── Emergency form ──────────────────────────── */
function EmergencyForm({ form, setForm, onSubmit, onClose, loading, error, isEdit }) {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const netAmount = parseFloat(form.amount || 0) - parseFloat(form.insurance_claim_amount || 0)

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Type + Title */}
      <div className="form-group">
        <label className="form-label">Emergency Type *</label>
        <select name="emergency_type" className="form-select" value={form.emergency_type} onChange={handle}>
          {EMERGENCY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Title *</label>
        <input
          name="title" type="text" className="form-input" autoFocus
          placeholder="e.g. Hospital visit, Car breakdown"
          value={form.title} onChange={handle} required
        />
      </div>

      {/* Amount + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Total Amount (₹) *</label>
          <input
            name="amount" type="number" min="1" step="0.01"
            className="form-input" placeholder="0.00"
            value={form.amount} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            name="expense_date" type="date"
            className="form-input"
            value={form.expense_date} onChange={handle} required
          />
        </div>
      </div>

      {/* Insurance toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
        <input
          name="covered_by_insurance" type="checkbox"
          checked={form.covered_by_insurance} onChange={handle}
          style={{ width: 16, height: 16, accentColor: 'var(--green)' }}
        />
        Covered (partially or fully) by insurance
      </label>

      {/* Insurance claim amount */}
      {form.covered_by_insurance && (
        <div className="form-group">
          <label className="form-label">Insurance Claim Amount (₹)</label>
          <input
            name="insurance_claim_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0.00"
            value={form.insurance_claim_amount} onChange={handle}
          />
          {form.amount && (
            <div style={{
              marginTop: 8,
              background: netAmount <= 0 ? 'var(--green-dim)' : 'var(--amber-dim)',
              border: `1px solid ${netAmount <= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 'var(--radius-md)', padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Net out-of-pocket</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: netAmount <= 0 ? 'var(--green)' : 'var(--amber)' }}>
                {fmt(Math.max(netAmount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          name="description" type="text" className="form-input"
          placeholder="Additional details (optional)"
          value={form.description} onChange={handle}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update' : 'Add Emergency'}
        </button>
      </div>
    </form>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ exp, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Emergency Expense" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Delete <strong style={{ color: 'var(--text-primary)' }}>"{exp.title}"</strong>?
          This action cannot be undone.
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

/* ── Emergency card ──────────────────────────── */
function EmergencyCard({ exp, onEdit, onDelete }) {
  const type       = getEType(exp.emergency_type)
  const amount     = parseFloat(exp.amount || 0)
  const claimed    = parseFloat(exp.insurance_claim_amount || 0)
  const net        = amount - claimed
  const isInsured  = exp.covered_by_insurance && claimed > 0

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}>

      {/* Top strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isInsured ? 'var(--green)' : 'var(--red)',
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
              {exp.title}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={`badge ${type.color}`} style={{ fontSize: 10 }}>{type.label}</span>
              {isInsured && (
                <span className="badge badge-green" style={{ fontSize: 10 }}>🛡️ Insured</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
            {fmtDate(exp.expense_date)}
          </p>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>
            {fmt(amount)}
          </p>
        </div>
      </div>

      {/* Amount breakdown */}
      {isInsured ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Total Cost',  value: fmt(amount),  col: 'var(--text-primary)' },
            { label: 'Insurance',   value: fmt(claimed), col: 'var(--green)'         },
            { label: 'Out of Pocket', value: fmt(Math.max(net, 0)), col: net <= 0 ? 'var(--green)' : 'var(--red)' },
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
      ) : (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.15)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No insurance coverage</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
            Full cost: {fmt(amount)}
          </span>
        </div>
      )}

      {/* Insurance savings bar */}
      {isInsured && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Insurance covered</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
              {amount > 0 ? ((claimed / amount) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${amount > 0 ? Math.min((claimed / amount) * 100, 100) : 0}%`,
              background: 'var(--green)', borderRadius: 99, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Description */}
      {exp.description && (
        <p style={{
          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
          padding: '8px 10px',
        }}>
          {exp.description}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(exp)}>✏️</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(exp)}>🗑️</button>
      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Emergency() {
  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pageError,  setPageError]  = useState('')

  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  const [filterType,  setFilterType]  = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterIns,   setFilterIns]   = useState('')

  /* ── load ── */
  const loadData = async () => {
    setLoading(true); setPageError('')
    try {
      const res = await getEmergencyExpenses()
      setExpenses(res.data || [])
    } catch (e) {
      if (!e.isSessionExpired) setPageError(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const openAdd = () => { setForm(EMPTY_FORM); setFormErr(''); setShowAdd(true) }

  const openEdit = (exp) => {
    setForm({
      emergency_type:         exp.emergency_type,
      title:                  exp.title,
      amount:                 exp.amount,
      expense_date:           exp.expense_date,
      covered_by_insurance:   exp.covered_by_insurance,
      insurance_claim_amount: exp.insurance_claim_amount || '',
      description:            exp.description || '',
    })
    setFormErr(''); setEditTarget(exp)
  }

  const handleAdd = async (e) => {
    e.preventDefault(); setFormLoad(true); setFormErr('')
    try {
      await createEmergencyExpense({
        ...form,
        amount:                 parseFloat(form.amount),
        insurance_claim_amount: parseFloat(form.insurance_claim_amount || 0),
      })
      setShowAdd(false); loadData()
    } catch (err) { setFormErr(err.message) }
    finally { setFormLoad(false) }
  }

  const handleEdit = async (e) => {
    e.preventDefault(); setFormLoad(true); setFormErr('')
    try {
      await updateEmergencyExpense(editTarget.id, {
        ...form,
        amount:                 parseFloat(form.amount),
        insurance_claim_amount: parseFloat(form.insurance_claim_amount || 0),
      })
      setEditTarget(null); loadData()
    } catch (err) { setFormErr(err.message) }
    finally { setFormLoad(false) }
  }

  const handleDelete = async () => {
    setDeleteLoad(true)
    try { await deleteEmergencyExpense(deleteTarget.id); setDeleteTarget(null); loadData() }
    catch (err) { setPageError(err.message) }
    finally { setDeleteLoad(false) }
  }

  /* ── filtered ── */
  const filtered = expenses
    .filter((e) => filterType  ? e.emergency_type === filterType                              : true)
    .filter((e) => filterMonth ? e.expense_date?.slice(0, 7) === filterMonth                  : true)
    .filter((e) => filterIns === 'insured'    ?  e.covered_by_insurance                       :
                   filterIns === 'not'        ? !e.covered_by_insurance                       : true)

  /* ── summary ── */
  const totalAmt      = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const totalClaimed  = expenses.reduce((s, e) => s + parseFloat(e.insurance_claim_amount || 0), 0)
  const totalNet      = totalAmt - totalClaimed
  const insuredCount  = expenses.filter((e) => e.covered_by_insurance).length

  const currentMonth  = new Date().toISOString().slice(0, 7)
  const thisMonthAmt  = expenses
    .filter((e) => e.expense_date?.slice(0, 7) === currentMonth)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  const months = [...new Set(expenses.map((e) => e.expense_date?.slice(0, 7)))].sort().reverse()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading emergency expenses…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Emergency Expenses</h1>
          <p className="page-subtitle">Track unexpected costs and insurance claims</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Emergency</button>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card red">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Emergency</span>
            <div className="stat-icon red">🚨</div>
          </div>
          <div className="stat-value">{fmt(totalAmt)}</div>
          <div className="stat-change neutral">{expenses.length} incidents</div>
        </div>
        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Insurance Claimed</span>
            <div className="stat-icon green">🛡️</div>
          </div>
          <div className="stat-value">{fmt(totalClaimed)}</div>
          <div className="stat-change neutral">{insuredCount} covered incidents</div>
        </div>
        <div className="stat-card amber">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Out of Pocket</span>
            <div className="stat-icon amber">💸</div>
          </div>
          <div className="stat-value">{fmt(totalNet)}</div>
          <div className="stat-change neutral">
            {totalAmt > 0 ? `${(100 - (totalClaimed / totalAmt) * 100).toFixed(1)}% uncovered` : 'no expenses'}
          </div>
        </div>
        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">This Month</span>
            <div className="stat-icon purple">📅</div>
          </div>
          <div className="stat-value">{fmt(thisMonthAmt)}</div>
          <div className="stat-change neutral">current month total</div>
        </div>
      </div>

      {/* ── Insurance savings bar ── */}
      {totalAmt > 0 && totalClaimed > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Insurance Coverage Overview
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
              {((totalClaimed / totalAmt) * 100).toFixed(1)}% covered
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--red-dim)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((totalClaimed / totalAmt) * 100, 100)}%`,
              background: 'linear-gradient(90deg, var(--green), var(--teal))',
              borderRadius: 99, transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--green)' }}>🛡️ Claimed: {fmt(totalClaimed)}</span>
            <span style={{ fontSize: 11, color: 'var(--red)' }}>💸 Uncovered: {fmt(totalNet)}</span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 150px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {EMERGENCY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 150px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All months</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 150px' }}>
            <label className="form-label">Insurance</label>
            <select className="form-select" value={filterIns} onChange={(e) => setFilterIns(e.target.value)}>
              <option value="">All</option>
              <option value="insured">🛡️ Insured</option>
              <option value="not">💸 Not Insured</option>
            </select>
          </div>
          {(filterType || filterMonth || filterIns) && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
              onClick={() => { setFilterType(''); setFilterMonth(''); setFilterIns('') }}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚨</div>
            <p className="empty-state-title">
              {expenses.length === 0 ? 'No emergency expenses recorded' : 'No records match your filters'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {expenses.length === 0
                ? 'Track unexpected costs like medical bills, vehicle repairs, and more.'
                : 'Try adjusting your filters.'}
            </p>
            {expenses.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}>+ Add Emergency</button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((exp) => (
            <EmergencyCard key={exp.id} exp={exp} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Emergency Expense" onClose={() => setShowAdd(false)}>
          <EmergencyForm form={form} setForm={setForm} onSubmit={handleAdd}
            onClose={() => setShowAdd(false)} loading={formLoad} error={formErr} isEdit={false} />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Emergency Expense" onClose={() => setEditTarget(null)}>
          <EmergencyForm form={form} setForm={setForm} onSubmit={handleEdit}
            onClose={() => setEditTarget(null)} loading={formLoad} error={formErr} isEdit={true} />
        </Modal>
      )}
      {deleteTarget && (
        <DeleteModal exp={deleteTarget} onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete} loading={deleteLoad} />
      )}

    </div>
  )
}

export default Emergency