import { useState, useEffect, useRef } from 'react'
import {
  getTransactions, deleteTransaction,
  uploadCSV, getCSVUploads, exportTransactionsCSV,
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

const TYPES = [
  { value: 'income',  label: 'Income',  color: 'badge-green' },
  { value: 'expense', label: 'Expense', color: 'badge-red'   },
]

const SOURCES = [
  { value: 'manual',     label: 'Manual'   },
  { value: 'csv_upload', label: 'CSV Upload' },
]

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

/* ── Delete confirm ──────────────────────────── */
function DeleteModal({ txn, onClose, onConfirm, loading }) {
  return (
    <Modal title="Delete Transaction" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Are you sure you want to delete this{' '}
          <strong style={{ color: txn.transaction_type === 'income' ? 'var(--green)' : 'var(--red)' }}>
            {fmt(txn.amount)}
          </strong>{' '}
          {txn.transaction_type} entry? This action cannot be undone.
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

/* ── CSV Upload modal ────────────────────────── */
function UploadModal({ onClose, onSuccess }) {
  const fileRef            = useRef()
  const [file,    setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f && f.name.endsWith('.csv')) { setFile(f); setError('') }
    else setError('Please select a valid .csv file')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) { setFile(f); setError('') }
    else setError('Please drop a valid .csv file')
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await uploadCSV(file)
      setResult(res.data)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Upload Bank Statement" onClose={onClose} maxWidth={500}>
      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Supported formats info */}
          <div className="alert alert-info" style={{ fontSize: 12, lineHeight: 1.6 }}>
            <span>ℹ️</span>
            <span>
              Supports HDFC, SBI, ICICI CSV formats.<br />
              Columns needed: <strong>Date, Description, Debit/Credit</strong> or <strong>Amount + Type</strong>
            </span>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? 'var(--accent)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {file ? '✅' : '📂'}
            </div>
            {file ? (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{file.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                  Drop your CSV here or click to browse
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Only .csv files are supported
                </p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary" style={{ flex: 1 }}
              onClick={handleUpload} disabled={!file || loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Processing…
                </span>
              ) : 'Upload & Import'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Result screen ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>
            {result.failed_rows === 0 ? '🎉' : '⚠️'}
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              Import {result.status === 'completed' ? 'Complete' : 'Finished with errors'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {result.file?.split('/').pop() || 'bank_statement.csv'}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Rows',    value: result.total_rows,    color: 'var(--text-primary)' },
              { label: 'Imported',      value: result.imported_rows, color: 'var(--green)'        },
              { label: 'Failed',        value: result.failed_rows,   color: result.failed_rows > 0 ? 'var(--red)' : 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                padding: '12px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Error log */}
          {result.error_log?.length > 0 && (
            <div style={{
              background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'left',
              maxHeight: 120, overflowY: 'auto',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
                Failed rows:
              </p>
              {result.error_log.slice(0, 5).map((e, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  Row {e.row}: {e.reason}
                </p>
              ))}
              {result.error_log.length > 5 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  +{result.error_log.length - 5} more…
                </p>
              )}
            </div>
          )}

          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      )}
    </Modal>
  )
}

/* ── Upload history modal ────────────────────── */
function UploadHistoryModal({ onClose }) {
  const [uploads,  setUploads]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getCSVUploads()
      .then((r) => setUploads(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statusBadge = (s) => {
    const map = {
      completed:  'badge-green',
      processing: 'badge-accent',
      pending:    'badge-amber',
      failed:     'badge-red',
    }
    return map[s] || 'badge-muted'
  }

  return (
    <Modal title="Upload History" onClose={onClose} maxWidth={600}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : uploads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <p className="empty-state-title">No uploads yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {uploads.map((u) => (
            <div key={u.id} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.file?.split('/').pop() || 'statement.csv'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtDate(u.uploaded_at)} · {u.imported_rows}/{u.total_rows} rows imported
                </p>
              </div>
              <span className={`badge ${statusBadge(u.status)}`} style={{ fontSize: 11 }}>
                {u.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
function Transactions() {
  const [transactions,  setTransactions]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [pageError,     setPageError]     = useState('')

  /* pagination */
  const [page,      setPage]      = useState(1)
  const [totalPages,setTotalPages]= useState(1)
  const [total,     setTotal]     = useState(0)
  const PAGE_SIZE = 20

  /* filters */
  const [filterType,   setFilterType]   = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterMonth,  setFilterMonth]  = useState('')
  const [minAmount,    setMinAmount]    = useState('')
  const [maxAmount,    setMaxAmount]    = useState('')
  const [search,       setSearch]       = useState('')

  /* modals */
  const [deleteTarget,     setDeleteTarget]     = useState(null)
  const [deleteLoad,       setDeleteLoad]       = useState(false)
  const [showUpload,       setShowUpload]       = useState(false)
  const [showHistory,      setShowHistory]      = useState(false)
  const [exportLoading,    setExportLoading]    = useState(false)

  /* ── load ── */
  const loadData = async (pg = page) => {
    setLoading(true)
    setPageError('')
    try {
      const params = {
        page: pg, page_size: PAGE_SIZE,
        ...(filterType   && { type:       filterType   }),
        ...(filterSource && { source:     filterSource }),
        ...(filterMonth  && { month:      filterMonth.split('-')[1], year: filterMonth.split('-')[0] }),
        ...(minAmount    && { min_amount: minAmount    }),
        ...(maxAmount    && { max_amount: maxAmount    }),
        ...(search       && { search                   }),
      }
      const res = await getTransactions(params)
      setTransactions(res.data?.results || [])
      setTotal(res.data?.total || 0)
      setTotalPages(res.data?.total_pages || 1)
    } catch (e) {
      if (!e.isSessionExpired) setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData(1); setPage(1) }, [filterType, filterSource, filterMonth, minAmount, maxAmount, search])
  useEffect(() => { loadData(page) }, [page])

  /* ── delete ── */
  const handleDelete = async () => {
    setDeleteLoad(true)
    try {
      await deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
      loadData(page)
    } catch (err) {
      setPageError(err.message)
    } finally {
      setDeleteLoad(false)
    }
  }

  /* ── export ── */
  const handleExport = async () => {
    setExportLoading(true)
    try {
      const params = {
        ...(filterType  && { type:  filterType  }),
        ...(filterMonth && { month: filterMonth.split('-')[1], year: filterMonth.split('-')[0] }),
      }
      await exportTransactionsCSV(params)
    } catch (err) {
      setPageError(err.message)
    } finally {
      setExportLoading(false)
    }
  }

  /* ── summary from current page ── */
  const incomeTotal  = transactions.filter((t) => t.transaction_type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const expenseTotal = transactions.filter((t) => t.transaction_type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)

  const clearFilters = () => {
    setFilterType(''); setFilterSource(''); setFilterMonth('')
    setMinAmount(''); setMaxAmount(''); setSearch('')
  }
  const hasFilters = filterType || filterSource || filterMonth || minAmount || maxAmount || search

  return (
    <div className="page-content">

      {/* ── Page header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Unified feed of all your income and expenses</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(true)}>
            📂 Upload History
          </button>
          <button
            className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exportLoading}
          >
            {exportLoading ? '⏳ Exporting…' : '⬇️ Export CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            ⬆️ Upload CSV
          </button>
        </div>
      </div>

      {pageError && <div className="alert alert-error" style={{ marginBottom: 24 }}>{pageError}</div>}

      {/* ── Summary cards ── */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="stat-card accent">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Total Records</span>
            <div className="stat-icon accent">🔄</div>
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-change neutral">across all time</div>
        </div>
        <div className="stat-card green">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Income (Page)</span>
            <div className="stat-icon green">↑</div>
          </div>
          <div className="stat-value">{fmt(incomeTotal)}</div>
          <div className="stat-change neutral">current page</div>
        </div>
        <div className="stat-card red">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span className="stat-label">Expenses (Page)</span>
            <div className="stat-icon red">↓</div>
          </div>
          <div className="stat-value">{fmt(expenseTotal)}</div>
          <div className="stat-change neutral">current page</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label className="form-label">Search</label>
            <input
              type="text" className="form-input"
              placeholder="Search description or category…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 130px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 130px' }}>
            <label className="form-label">Source</label>
            <select className="form-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
              <option value="">All sources</option>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Month</label>
            <input
              type="month" className="form-input"
              value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 110px' }}>
            <label className="form-label">Min ₹</label>
            <input
              type="number" className="form-input" placeholder="0"
              value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 110px' }}>
            <label className="form-label">Max ₹</label>
            <input
              type="number" className="form-input" placeholder="Any"
              value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }} onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>Loading transactions…</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔄</div>
            <p className="empty-state-title">No transactions found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {hasFilters ? 'Try adjusting your filters.' : 'Upload a bank statement CSV or add income/expenses to get started.'}
            </p>
            {!hasFilters && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                ⬆️ Upload CSV
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                        {fmtDate(txn.date)}
                      </td>
                      <td>
                        <span className={`badge ${txn.transaction_type === 'income' ? 'badge-green' : 'badge-red'}`}
                          style={{ fontSize: 11 }}>
                          {txn.transaction_type === 'income' ? '↑ Income' : '↓ Expense'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {txn.category_name
                          ? <span className="badge badge-muted" style={{ fontSize: 11 }}>{txn.category_name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                        {txn.description || txn.raw_description || (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${txn.source === 'csv_upload' ? 'badge-accent' : 'badge-muted'}`}
                          style={{ fontSize: 10 }}>
                          {txn.source === 'csv_upload' ? '📄 CSV' : '✏️ Manual'}
                        </span>
                      </td>
                      <td style={{
                        textAlign: 'right', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
                        color: txn.transaction_type === 'income' ? 'var(--green)' : 'var(--red)',
                      }}>
                        {txn.transaction_type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(txn)} title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap', gap: 12,
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} transactions
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(1)} disabled={page === 1}
                >«</button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                >‹ Prev</button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const pg    = start + i
                  return pg <= totalPages ? (
                    <button
                      key={pg}
                      className={`btn btn-sm ${pg === page ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPage(pg)}
                      style={{ minWidth: 36 }}
                    >
                      {pg}
                    </button>
                  ) : null
                })}

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
                >Next ›</button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(totalPages)} disabled={page === totalPages}
                >»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {deleteTarget && (
        <DeleteModal
          txn={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => loadData(1)}
        />
      )}

      {showHistory && (
        <UploadHistoryModal onClose={() => setShowHistory(false)} />
      )}

    </div>
  )
}

export default Transactions