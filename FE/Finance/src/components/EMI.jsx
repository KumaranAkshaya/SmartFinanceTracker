import { useState, useEffect } from 'react'
import { getEMILoans, createEMILoan, updateEMILoan, deleteEMILoan } from '../api'

/* ── helpers ─────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '—'

const LOAN_TYPES = [
  { value: 'home_loan',       label: 'Home Loan',       emoji: '🏠', color: 'badge-accent'  },
  { value: 'car_loan',        label: 'Car Loan',        emoji: '🚗', color: 'badge-purple'  },
  { value: 'personal_loan',   label: 'Personal Loan',   emoji: '👤', color: 'badge-amber'   },
  { value: 'education_loan',  label: 'Education Loan',  emoji: '🎓', color: 'badge-green'   },
  { value: 'credit_card',     label: 'Credit Card',     emoji: '💳', color: 'badge-red'     },
  { value: 'other',           label: 'Other',           emoji: '💼', color: 'badge-muted'   },
]

const getLoanType = (val) => LOAN_TYPES.find((t) => t.value === val) || LOAN_TYPES[5]

const EMPTY_FORM = {
  loan_type:          'personal_loan',
  lender_name:        '',
  principal_amount:   '',
  emi_amount:         '',
  interest_rate:      '',
  tenure_months:      '',
  emi_start_date:     '',
  emi_end_date:       '',
  outstanding_amount: '',
  is_active:          true,
}

/* ── auto-calc EMI (flat) ────────────────────── */
function calcEMI(principal, rate, tenure) {
  if (!principal || !rate || !tenure) return null
  const p = parseFloat(principal)
  const r = parseFloat(rate)  / 100 / 12
  const n = parseInt(tenure)
  if (r === 0) return p / n
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/* ── Modal shell ─────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 540 }) {
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

/* ── EMI form ────────────────────────────────── */
function EMIForm({ form, setForm, onSubmit, onClose, loading, error, isEdit }) {
  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const autoEMI = calcEMI(form.principal_amount, form.interest_rate, form.tenure_months)

  /* auto-fill end date from start + tenure */
  const autoEndDate = () => {
    if (!form.emi_start_date || !form.tenure_months) return
    const d = new Date(form.emi_start_date)
    d.setMonth(d.getMonth() + parseInt(form.tenure_months))
    setForm((p) => ({ ...p, emi_end_date: d.toISOString().split('T')[0] }))
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Loan type + Lender */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Loan Type *</label>
          <select name="loan_type" className="form-select" value={form.loan_type} onChange={handle}>
            {LOAN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Lender / Bank *</label>
          <input
            name="lender_name" type="text" className="form-input" autoFocus
            placeholder="e.g. HDFC Bank, SBI"
            value={form.lender_name} onChange={handle} required
          />
        </div>
      </div>

      {/* Principal + Interest + Tenure */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Principal (₹) *</label>
          <input
            name="principal_amount" type="number" min="1" step="0.01"
            className="form-input" placeholder="e.g. 500000"
            value={form.principal_amount} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate % p.a.</label>
          <input
            name="interest_rate" type="number" min="0" max="100" step="0.01"
            className="form-input" placeholder="e.g. 8.5"
            value={form.interest_rate} onChange={handle}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tenure (months) *</label>
          <input
            name="tenure_months" type="number" min="1"
            className="form-input" placeholder="e.g. 60"
            value={form.tenure_months} onChange={handle}
            onBlur={autoEndDate} required
          />
        </div>
      </div>

      {/* Auto EMI suggestion */}
      {autoEMI && !form.emi_amount && (
        <div className="alert alert-info" style={{ fontSize: 12 }}>
          <span>💡</span>
          <span>
            Calculated EMI: <strong>{fmt(autoEMI)}</strong> / month
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 10, padding: '2px 8px', fontSize: 11 }}
              onClick={() => setForm((p) => ({ ...p, emi_amount: autoEMI.toFixed(2) }))}
            >
              Use this
            </button>
          </span>
        </div>
      )}

      {/* EMI amount + Outstanding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">EMI Amount (₹) *</label>
          <input
            name="emi_amount" type="number" min="1" step="0.01"
            className="form-input" placeholder="Monthly EMI"
            value={form.emi_amount} onChange={handle} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Outstanding (₹)</label>
          <input
            name="outstanding_amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="Remaining principal"
            value={form.outstanding_amount} onChange={handle}
          />
        </div>
      </div>

      {/* Start + End date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">EMI Start Date *</label>
          <input
            name="emi_start_date" type="date"
            className="form-input"
            value={form.emi_start_date} onChange={handle}
            onBlur={autoEndDate} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">EMI End Date *</label>
          <input
            name="emi_end_date" type="date"
            className="form-input"
            value={form.emi_end_date} onChange={handle} required
          />
        </div>
      </div>

      {/* Active */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
        <input
          name="is_active" type="checkbox"
          checked={form.is_active} onChange={handle}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        Loan is active
      </label>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Loan' : 'Add Loan'}
        </button>
      </div>
    </form>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ loan, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Loan" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {getLoanType(loan.loan_type).label} — {loan.lender_name}
          </strong>?
          All loan data will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete Loan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── EMI card ────────────────────────────────── */
function EMICard({ loan, onEdit, onDelete }) {
  const type        = getLoanType(loan.loan_type)
  const principal   = parseFloat(loan.principal_amount   || 0)
  const outstanding = parseFloat(loan.outstanding_amount || 0)
  const emi         = parseFloat(loan.emi_amount         || 0)
  const paidPct     = principal > 0
    ? Math.min(((principal - outstanding) / principal) * 100, 100)
    : 0

  /* days until next EMI (same day of month) */
  const today     = new Date()
  const startDay  = loan.emi_start_date ? new Date(loan.emi_start_date).getDate() : null
  let nextEMI     = null
  if (startDay) {
    nextEMI = new Date(today.getFullYear(), today.getMonth(), startDay)
    if (nextEMI <= today) nextEMI.setMonth(nextEMI.getMonth() + 1)
  }
  const daysToEMI = nextEMI
    ? Math.ceil((nextEMI - today) / (1000 * 60 * 60 * 24))
    : null

  /* months remaining */
  const endDate        = loan.emi_end_date ? new Date(loan.emi_end_date) : null
  const monthsLeft     = endDate
    ? Math.max(0, (endDate.getFullYear() - today.getFullYear()) * 12 +
        (endDate.getMonth() - today.getMonth()))
    : null
  const totalInterest  = emi * parseInt(loan.tenure_months || 0) - principal

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
      opacity: loan.is_active ? 1 : 0.6,
    }}>

      {/* Top strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: loan.is_active ? 'var(--red)' : 'var(--text-muted)',
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
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
              {loan.lender_name}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span className={`badge ${type.color}`} style={{ fontSize: 10 }}>{type.label}</span>
              {!loan.is_active && (
                <span className="badge badge-muted" style={{ fontSize: 10 }}>Closed</span>
              )}
            </div>
          </div>
        </div>
        {/* Next EMI badge */}
        {daysToEMI !== null && loan.is_active && (
          <div style={{
            background: daysToEMI <= 3 ? 'var(--red-dim)' : daysToEMI <= 7 ? 'var(--amber-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${daysToEMI <= 3 ? 'rgba(244,63,94,0.25)' : daysToEMI <= 7 ? 'rgba(245,158,11,0.25)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)', padding: '6px 10px', textAlign: 'right', flexShrink: 0,
          }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Next EMI</p>
            <p style={{
              fontSize: 13, fontWeight: 700,
              color: daysToEMI <= 3 ? 'var(--red)' : daysToEMI <= 7 ? 'var(--amber)' : 'var(--text-primary)',
            }}>
              {daysToEMI === 0 ? 'Today!' : `${daysToEMI}d`}
            </p>
          </div>
        )}
      </div>

      {/* Repayment progress */}
      {outstanding > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {paidPct.toFixed(1)}% repaid
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {monthsLeft !== null ? `${monthsLeft} months left` : ''}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${paidPct}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--green))',
              borderRadius: 99, transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Amount grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Principal',    value: fmt(principal),            col: 'var(--text-primary)' },
          { label: 'EMI / Month', value: fmt(emi),                  col: 'var(--red)'           },
          { label: 'Outstanding', value: fmt(outstanding),           col: 'var(--amber)'         },
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

      {/* Interest + rate row */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
        padding: '10px 12px', display: 'flex', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Interest Rate</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginTop: 1 }}>
            {loan.interest_rate ? `${loan.interest_rate}% p.a.` : '—'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tenure</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1 }}>
            {loan.tenure_months} months
          </p>
        </div>
        {totalInterest > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Interest</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginTop: 1 }}>
              {fmt(totalInterest)}
            </p>
          </div>
        )}
      </div>

      {/* Dates + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            📅 {fmtDate(loan.emi_start_date)} → {fmtDate(loan.emi_end_date)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(loan)}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(loan)}>🗑️</button>
        </div>
      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function EMI() {
  const [loans,      setLoans]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pageError,  setPageError]  = useState('')

  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  const [filterType,   setFilterType]   = useState('')
  const [filterActive, setFilterActive] = useState('active')

  /* ── load ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const res = await getEMILoans()
      setLoans(res.data || [])
    } catch (e) {
      if (!e.isSessionExpired) setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const openAdd = () => { setForm(EMPTY_FORM); setFormErr(''); setShowAdd(true) }

  const openEdit = (l) => {
    setForm({
      loan_type:          l.loan_type,
      lender_name:        l.lender_name,
      principal_amount:   l.principal_amount,
      emi_amount:         l.emi_amount,
      interest_rate:      l.interest_rate      || '',
      tenure_months:      l.tenure_months,
      emi_start_date:     l.emi_start_date,
      emi_end_date:       l.emi_end_date,
      outstanding_amount: l.outstanding_amount || '',
      is_active:          l.is_active,
    })
    setFormErr('')
    setEditTarget(l)
  }

  const handleAdd = async (e) => {
    e.preventDefault(); setFormLoad(true); setFormErr('')
    try {
      await createEMILoan({
        ...form,
        principal_amount:   parseFloat(form.principal_amount),
        emi_amount:         parseFloat(form.emi_amount),
        interest_rate:      parseFloat(form.interest_rate      || 0),
        tenure_months:      parseInt(form.tenure_months),
        outstanding_amount: parseFloat(form.outstanding_amount || 0),
      })
      setShowAdd(false); loadData()
    } catch (err) { setFormErr(err.message) }
    finally { setFormLoad(false) }
  }

  const handleEdit = async (e) => {
    e.preventDefault(); setFormLoad(true); setFormErr('')
    try {
      await updateEMILoan(editTarget.id, {
        ...form,
        principal_amount:   parseFloat(form.principal_amount),
        emi_amount:         parseFloat(form.emi_amount),
        interest_rate:      parseFloat(form.interest_rate      || 0),
        tenure_months:      parseInt(form.tenure_months),
        outstanding_amount: parseFloat(form.outstanding_amount || 0),
      })
      setEditTarget(null); loadData()
    } catch (err) { setFormErr(err.message) }
    finally { setFormLoad(false) }
  }

  const handleDelete = async () => {
    setDeleteLoad(true)
    try { await deleteEMILoan(deleteTarget.id); setDeleteTarget(null); loadData() }
    catch (err) { setPageError(err.message) }
    finally { setDeleteLoad(false) }
  }

  /* ── summary ── */
  const active         = loans.filter((l) => l.is_active)
  const totalEMI       = active.reduce((s, l) => s + parseFloat(l.emi_amount         || 0), 0)
  const totalPrincipal = active.reduce((s, l) => s + parseFloat(l.principal_amount   || 0), 0)
  const totalOutstanding = active.reduce((s, l) => s + parseFloat(l.outstanding_amount || 0), 0)
  const today          = new Date()
  const dueSoon        = active.filter((l) => {
    if (!l.emi_start_date) return false
    const day  = new Date(l.emi_start_date).getDate()
    let next   = new Date(today.getFullYear(), today.getMonth(), day)
    if (next <= today) next.setMonth(next.getMonth() + 1)
    return Math.ceil((next - today) / (1000 * 60 * 60 * 24)) <= 7
  }).length

  const filtered = loans
    .filter((l) => filterType   ? l.loan_type === filterType : true)
    .filter((l) => filterActive === 'active'   ? l.is_active  :
                   filterActive === 'inactive' ? !l.is_active : true)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading EMI & Loans…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">EMI & Loans</h1>
          <p className="page-subtitle">Track all your loans, EMIs and repayment schedules</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Loan</button>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* EMI due soon alert */}
      {dueSoon > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <span>⏰</span>
          <span><strong>{dueSoon} EMI{dueSoon > 1 ? 's' : ''}</strong> due within the next 7 days. Check your accounts.</span>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card red">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Monthly EMI</span>
            <div className="stat-icon red">💸</div>
          </div>
          <div className="stat-value">{fmt(totalEMI)}</div>
          <div className="stat-change neutral">{active.length} active loans</div>
        </div>
        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Borrowed</span>
            <div className="stat-icon accent">🏦</div>
          </div>
          <div className="stat-value">{fmt(totalPrincipal)}</div>
          <div className="stat-change neutral">combined principal</div>
        </div>
        <div className="stat-card amber">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Outstanding</span>
            <div className="stat-icon amber">⏳</div>
          </div>
          <div className="stat-value">{fmt(totalOutstanding)}</div>
          <div className="stat-change neutral">total remaining debt</div>
        </div>
        <div className={`stat-card ${dueSoon > 0 ? 'red' : 'green'}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Due This Week</span>
            <div className={`stat-icon ${dueSoon > 0 ? 'red' : 'green'}`}>
              {dueSoon > 0 ? '⏰' : '✅'}
            </div>
          </div>
          <div className="stat-value">{dueSoon}</div>
          <div className="stat-change neutral">
            {dueSoon > 0 ? 'EMIs due within 7 days' : 'No EMIs due soon'}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Loan Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {LOAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Closed</option>
            </select>
          </div>
          {(filterType || filterActive) && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
              onClick={() => { setFilterType(''); setFilterActive('') }}>Clear</button>
          )}
        </div>
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏦</div>
            <p className="empty-state-title">
              {loans.length === 0 ? 'No loans added yet' : 'No loans match your filters'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {loans.length === 0 ? 'Track your home loan, car loan, personal loans and credit card EMIs.' : 'Try adjusting your filters.'}
            </p>
            {loans.length === 0 && <button className="btn btn-primary" onClick={openAdd}>+ Add Loan</button>}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((l) => (
            <EMICard key={l.id} loan={l} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add EMI / Loan" onClose={() => setShowAdd(false)}>
          <EMIForm form={form} setForm={setForm} onSubmit={handleAdd}
            onClose={() => setShowAdd(false)} loading={formLoad} error={formErr} isEdit={false} />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit EMI / Loan" onClose={() => setEditTarget(null)}>
          <EMIForm form={form} setForm={setForm} onSubmit={handleEdit}
            onClose={() => setEditTarget(null)} loading={formLoad} error={formErr} isEdit={true} />
        </Modal>
      )}
      {deleteTarget && (
        <DeleteModal loan={deleteTarget} onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete} loading={deleteLoad} />
      )}

    </div>
  )
}

export default EMI