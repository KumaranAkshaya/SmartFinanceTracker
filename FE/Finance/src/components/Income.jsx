import { useState, useEffect } from 'react'
import {
  getIncomes, createIncome, updateIncome, deleteIncome,
  getIncomeCategories, createIncomeCategory,
} from '../api'

/* ── helpers ────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const today = () => new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  category: '',
  amount: '',
  income_date: today(),
  description: '',
  is_recurring: false,
}

/* ── Modal ───────────────────────────────────── */
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

/* ── Income form ─────────────────────────────── */
function IncomeForm({ form, setForm, categories, onSubmit, onClose, loading, error, isEdit }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Category *</label>
        <select name="category" className="form-select" value={form.category} onChange={handleChange} required>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

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
          name="income_date" type="date"
          className="form-input"
          value={form.income_date} onChange={handleChange} required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          name="description" type="text"
          className="form-input" placeholder="Optional note"
          value={form.description} onChange={handleChange}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
        <input
          name="is_recurring" type="checkbox"
          checked={form.is_recurring} onChange={handleChange}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        Recurring income
      </label>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Income' : 'Add Income'}
        </button>
      </div>
    </form>
  )
}

/* ── Category form (inline quick-add) ────────── */
function CategoryModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await createIncomeCategory({ name: name.trim() })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="New Category" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Category Name *</label>
          <input
            type="text" className="form-input" placeholder="e.g. Salary, Freelance"
            value={name} onChange={(e) => setName(e.target.value)} autoFocus required
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ income, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Income" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Are you sure you want to delete this income entry of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{fmt(income.amount)}</strong>?
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
function Income() {
  const [incomes,     setIncomes]     = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pageError,   setPageError]   = useState('')

  /* modal state */
  const [showAdd,      setShowAdd]      = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)   // income obj being edited
  const [deleteTarget, setDeleteTarget] = useState(null)   // income obj to delete

  /* form state */
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')
  const [formLoad,   setFormLoad]   = useState(false)
  const [deleteLoad, setDeleteLoad] = useState(false)

  /* filters */
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCat,   setFilterCat]   = useState('')
  const [search,      setSearch]      = useState('')

  /* ── load data ── */
  const loadData = async () => {
    setLoading(true)
    setPageError('')
    try {
      const [inc, cats] = await Promise.all([
        getIncomes(),
        getIncomeCategories(),
      ])
      setIncomes(inc.data || [])
      setCategories(cats.data || [])
    } catch (e) {
      setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  /* ── open add modal ── */
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormErr('')
    setShowAdd(true)
  }

  /* ── open edit modal ── */
  const openEdit = (inc) => {
    setForm({
      category:    inc.category,
      amount:      inc.amount,
      income_date: inc.income_date,
      description: inc.description || '',
      is_recurring: inc.is_recurring,
    })
    setFormErr('')
    setEditTarget(inc)
  }

  /* ── submit add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    setFormLoad(true)
    setFormErr('')
    try {
      await createIncome({ ...form, amount: parseFloat(form.amount) })
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
      await updateIncome(editTarget.id, { ...form, amount: parseFloat(form.amount) })
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
      await deleteIncome(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── category created callback ── */
  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat])
    setForm((prev) => ({ ...prev, category: newCat.id }))
  }

  /* ── derived / filtered list ── */
  const filtered = incomes.filter((inc) => {
    const matchMonth = filterMonth
      ? inc.income_date?.slice(0, 7) === filterMonth
      : true
    const matchCat = filterCat
      ? String(inc.category) === String(filterCat)
      : true
    const matchSearch = search
      ? inc.description?.toLowerCase().includes(search.toLowerCase()) ||
        inc.category_name?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchMonth && matchCat && matchSearch
  })

  const totalFiltered = filtered.reduce((s, i) => s + parseFloat(i.amount || 0), 0)

  /* ── summary ── */
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonth = incomes.filter((i) => i.income_date?.slice(0, 7) === currentMonth)
  const thisMonthTotal = thisMonth.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const recurringTotal = incomes
    .filter((i) => i.is_recurring && i.income_date?.slice(0, 7) === currentMonth)
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0)

  /* ── unique months for filter ── */
  const months = [...new Set(incomes.map((i) => i.income_date?.slice(0, 7)))].sort().reverse()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading income…</p>
      </div>
    </div>
  )

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">Track all your income sources in one place</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCatModal(true)}>
            + Category
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Income
          </button>
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">This Month</span>
            <div className="stat-icon green">💰</div>
          </div>
          <div className="stat-value">{fmt(thisMonthTotal)}</div>
          <div className="stat-change neutral">{thisMonth.length} entries</div>
        </div>
        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Recurring</span>
            <div className="stat-icon accent">🔄</div>
          </div>
          <div className="stat-value">{fmt(recurringTotal)}</div>
          <div className="stat-change neutral">monthly fixed income</div>
        </div>
        <div className="stat-card purple">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Showing</span>
            <div className="stat-icon purple">📋</div>
          </div>
          <div className="stat-value">{fmt(totalFiltered)}</div>
          <div className="stat-change neutral">{filtered.length} entries filtered</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 180px' }}>
            <label className="form-label">Search</label>
            <input
              type="text" className="form-input" placeholder="Search description or category…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Category</label>
            <select className="form-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {(filterMonth || filterCat || search) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 2 }}
              onClick={() => { setFilterMonth(''); setFilterCat(''); setSearch('') }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <p className="empty-state-title">No income entries found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {incomes.length === 0 ? 'Add your first income entry to get started.' : 'Try adjusting your filters.'}
            </p>
            {incomes.length === 0 && (
              <button className="btn btn-primary" onClick={openAdd}>+ Add Income</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Recurring</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(inc.income_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className="badge badge-green">{inc.category_name || '—'}</span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {inc.is_recurring
                        ? <span className="badge badge-accent">🔄 Yes</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {fmt(inc.amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(inc)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(inc)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                    Total ({filtered.length} entries)
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>
                    {fmt(totalFiltered)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Add modal ── */}
      {showAdd && (
        <Modal title="Add Income" onClose={() => setShowAdd(false)}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCatModal(true)}>
              + New category
            </button>
          </div>
          <IncomeForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            loading={formLoad}
            error={formErr}
            isEdit={false}
          />
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {editTarget && (
        <Modal title="Edit Income" onClose={() => setEditTarget(null)}>
          <IncomeForm
            form={form} setForm={setForm}
            categories={categories}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
            loading={formLoad}
            error={formErr}
            isEdit={true}
          />
        </Modal>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          income={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

      {/* ── New category modal ── */}
      {showCatModal && (
        <CategoryModal
          onClose={() => setShowCatModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}

    </div>
  )
}

export default Income