import { useState, useEffect } from 'react'
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseCategories, createExpenseCategory,
} from '../api'

/* ── helpers ─────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const today = () => new Date().toISOString().split('T')[0]

const CATEGORY_TYPES = [
  { value: 'fixed',      label: 'Fixed',      color: 'badge-accent'  },
  { value: 'variable',   label: 'Variable',   color: 'badge-purple'  },
  { value: 'investment', label: 'Investment', color: 'badge-green'   },
  { value: 'saving',     label: 'Saving',     color: 'badge-amber'   },
  { value: 'emergency',  label: 'Emergency',  color: 'badge-red'     },
]

const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One Time'  },
  { value: 'daily',    label: 'Daily'     },
  { value: 'weekly',   label: 'Weekly'    },
  { value: 'monthly',  label: 'Monthly'   },
  { value: 'yearly',   label: 'Yearly'    },
]

const EMPTY_FORM = {
  category:     '',
  amount:       '',
  expense_date: today(),
  frequency:    'one_time',
  description:  '',
  is_recurring: false,
}

const getCategoryBadge = (type) =>
  CATEGORY_TYPES.find((c) => c.value === type)?.color || 'badge-muted'

const getFrequencyLabel = (val) =>
  FREQUENCY_OPTIONS.find((f) => f.value === val)?.label || val

/* ── Modal shell ─────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── Expense form ─────────────────────────────── */
function ExpenseForm({ form, setForm, categories, onSubmit, onClose, loading, error, isEdit, onNewCategory }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Category row with quick-add */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="form-label" style={{ margin: 0 }}>Category *</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onNewCategory}
            style={{ fontSize: 11, padding: '3px 8px' }}>
            + New
          </button>
        </div>
        <select name="category" className="form-select" value={form.category} onChange={handleChange} required>
          <option value="">Select category</option>
          {CATEGORY_TYPES.map((type) => {
            const group = categories.filter((c) => c.category_type === type.value)
            if (!group.length) return null
            return (
              <optgroup key={type.value} label={type.label}>
                {group.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      {/* Amount + Date side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Amount (₹) *</label>
          <input
            name="amount" type="number" min="0" step="0.01"
            className="form-input" placeholder="0.00"
            value={form.amount} onChange={handleChange} required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            name="expense_date" type="date"
            className="form-input"
            value={form.expense_date} onChange={handleChange} required
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="form-group">
        <label className="form-label">Frequency</label>
        <select name="frequency" className="form-select" value={form.frequency} onChange={handleChange}>
          {FREQUENCY_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          name="description" type="text"
          className="form-input" placeholder="Optional note (e.g. Grocery shopping)"
          value={form.description} onChange={handleChange}
        />
      </div>

      {/* Recurring toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
        <input
          name="is_recurring" type="checkbox"
          checked={form.is_recurring} onChange={handleChange}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        This is a recurring expense
      </label>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  )
}

/* ── New category modal ───────────────────────── */
function CategoryModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', category_type: 'variable' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await createExpenseCategory({ name: form.name.trim(), category_type: form.category_type })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="New Expense Category" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Category Name *</label>
          <input
            type="text" className="form-input"
            placeholder="e.g. Groceries, Netflix, Petrol"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type *</label>
          <select
            className="form-select" value={form.category_type}
            onChange={(e) => setForm((p) => ({ ...p, category_type: e.target.value }))}
          >
            {CATEGORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {form.category_type === 'fixed'      && 'Fixed: EMI, Rent, Subscriptions — same amount every month'}
            {form.category_type === 'variable'   && 'Variable: Groceries, Fuel, Utilities — changes each month'}
            {form.category_type === 'investment' && 'Investment: SIP, FD, Stocks — wealth building'}
            {form.category_type === 'saving'     && 'Saving: Goal-based funds — vacation, emergency'}
            {form.category_type === 'emergency'  && 'Emergency: Unexpected one-off costs'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ expense, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Expense" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Are you sure you want to delete this expense of{' '}
          <strong style={{ color: 'var(--red)' }}>{fmt(expense.amount)}</strong>
          {expense.description && <> — "{expense.description}"</>}?
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

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Expenses() {
  const [expenses,    setExpenses]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pageError,   setPageError]   = useState('')

  /* modal state */
  const [showAdd,      setShowAdd]      = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* form state */
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  /* filters */
  const [filterMonth,   setFilterMonth]   = useState('')
  const [filterCat,     setFilterCat]     = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterFreq,    setFilterFreq]    = useState('')
  const [search,        setSearch]        = useState('')

  /* ── load ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const [exp, cats] = await Promise.all([
        getExpenses(),
        getExpenseCategories(),
      ])
      setExpenses(exp.data || [])
      setCategories(cats.data || [])
    } catch (e) {
      setPageError(e.message)
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
  const openEdit = (exp) => {
    setForm({
      category:     exp.category,
      amount:       exp.amount,
      expense_date: exp.expense_date,
      frequency:    exp.frequency || 'one_time',
      description:  exp.description || '',
      is_recurring: exp.is_recurring,
    })
    setFormErr('')
    setEditTarget(exp)
  }

  /* ── submit add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) })
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
      await updateExpense(editTarget.id, { ...form, amount: parseFloat(form.amount) })
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
      await deleteExpense(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── category created ── */
  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat])
    setForm((prev) => ({ ...prev, category: newCat.id }))
  }

  /* ── filtered list ── */
  const filtered = expenses.filter((exp) => {
    const matchMonth  = filterMonth ? exp.expense_date?.slice(0, 7) === filterMonth : true
    const matchCat    = filterCat   ? String(exp.category) === String(filterCat)    : true
    const matchType   = filterType  ? exp.category_type === filterType               : true
    const matchFreq   = filterFreq  ? exp.frequency === filterFreq                   : true
    const matchSearch = search
      ? exp.description?.toLowerCase().includes(search.toLowerCase()) ||
        exp.category_name?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchMonth && matchCat && matchType && matchFreq && matchSearch
  })

  const totalFiltered = filtered.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  /* ── summary numbers ── */
  const currentMonth   = new Date().toISOString().slice(0, 7)
  const thisMonth      = expenses.filter((e) => e.expense_date?.slice(0, 7) === currentMonth)
  const thisMonthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  const fixedTotal    = thisMonth.filter((e) => e.category_type === 'fixed')
                          .reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const variableTotal = thisMonth.filter((e) => e.category_type === 'variable')
                          .reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  /* category type breakdown for this month */
  const typeBreakdown = CATEGORY_TYPES.map((t) => ({
    ...t,
    total: thisMonth
      .filter((e) => e.category_type === t.value)
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0),
  })).filter((t) => t.total > 0)

  /* unique months */
  const months = [...new Set(expenses.map((e) => e.expense_date?.slice(0, 7)))].sort().reverse()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading expenses…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Monitor and manage all your spending</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCatModal(true)}>
            + Category
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Expense
          </button>
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="stat-card red">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">This Month</span>
            <div className="stat-icon red">💸</div>
          </div>
          <div className="stat-value">{fmt(thisMonthTotal)}</div>
          <div className="stat-change neutral">{thisMonth.length} entries</div>
        </div>

        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Fixed Expenses</span>
            <div className="stat-icon accent">📌</div>
          </div>
          <div className="stat-value">{fmt(fixedTotal)}</div>
          <div className="stat-change neutral">EMI, rent, subscriptions</div>
        </div>

        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Variable Expenses</span>
            <div className="stat-icon purple">🛒</div>
          </div>
          <div className="stat-value">{fmt(variableTotal)}</div>
          <div className="stat-change neutral">groceries, fuel, dining</div>
        </div>

        <div className="stat-card amber">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Showing</span>
            <div className="stat-icon amber">📋</div>
          </div>
          <div className="stat-value">{fmt(totalFiltered)}</div>
          <div className="stat-change neutral">{filtered.length} entries filtered</div>
        </div>
      </div>

      {/* ── Category type breakdown ── */}
      {typeBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>This Month by Type</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {typeBreakdown.map(({ label, total, color }) => {
              const pct = thisMonthTotal > 0 ? (total / thisMonthTotal) * 100 : 0
              return (
                <div key={label} style={{ flex: '1 1 140px', minWidth: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className={`badge ${color}`}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'var(--accent)', borderRadius: 99,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 180px' }}>
            <label className="form-label">Search</label>
            <input
              type="text" className="form-input"
              placeholder="Search description or category…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All months</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {CATEGORY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Category</label>
            <select className="form-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Frequency</label>
            <select className="form-select" value={filterFreq} onChange={(e) => setFilterFreq(e.target.value)}>
              <option value="">All frequencies</option>
              {FREQUENCY_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {(filterMonth || filterCat || filterType || filterFreq || search) && (
            <button
              className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
              onClick={() => { setFilterMonth(''); setFilterCat(''); setFilterType(''); setFilterFreq(''); setSearch('') }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <p className="empty-state-title">No expenses found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {expenses.length === 0 ? 'Add your first expense to get started.' : 'Try adjusting your filters.'}
            </p>
            {expenses.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Frequency</th>
                  <th>Recurring</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(exp.expense_date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className="badge badge-red" style={{ fontSize: 11 }}>
                        {exp.category_name || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getCategoryBadge(exp.category_type)}`} style={{ fontSize: 11 }}>
                        {exp.category_type || '—'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>
                        {getFrequencyLabel(exp.frequency)}
                      </span>
                    </td>
                    <td>
                      {exp.is_recurring
                        ? <span className="badge badge-accent" style={{ fontSize: 11 }}>🔄 Yes</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {fmt(exp.amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exp)} title="Edit">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(exp)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                    Total ({filtered.length} entries)
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--red)', fontSize: 15 }}>
                    {fmt(totalFiltered)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
          <ExpenseForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            loading={formLoad} error={formErr}
            isEdit={false}
            onNewCategory={() => setShowCatModal(true)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Expense" onClose={() => setEditTarget(null)}>
          <ExpenseForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
            loading={formLoad} error={formErr}
            isEdit={true}
            onNewCategory={() => setShowCatModal(true)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

      {showCatModal && (
        <CategoryModal
          onClose={() => setShowCatModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}

    </div>
  )
}

export default Expenses