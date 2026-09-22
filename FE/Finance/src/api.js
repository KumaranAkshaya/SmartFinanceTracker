const API_BASE_URL = 'http://127.0.0.1:8000/api'

// ── Session expiry callback ──────────────────────
// Set once from SessionContext so api.js can trigger the modal
let _onSessionExpired = null
export function registerSessionExpiredHandler(fn) {
  _onSessionExpired = fn
}

function getToken() {
  return localStorage.getItem('accessToken')
}

// ── Detect token errors from DRF ────────────────
function isTokenError(result) {
  const detail = result?.detail || result?.message || ''
  const code   = result?.code   || ''
  const tokenErrorPhrases = [
    'token not valid',
    'token is invalid',
    'token is expired',
    'given token not valid',
    'no active account',
    'authentication credentials were not provided',
  ]
  return (
    tokenErrorPhrases.some((p) => detail.toLowerCase().includes(p)) ||
    code === 'token_not_valid'
  )
}

async function apiRequest(path, method = 'GET', payload = null, isFormData = false) {
  const token = getToken()

  const headers = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (token)       headers['Authorization'] = `Bearer ${token}`

  const config = { method, headers }
  if (payload) config.body = isFormData ? payload : JSON.stringify(payload)

  const response = await fetch(`${API_BASE_URL}${path}`, config)

  // CSV export — return blob directly
  if (response.headers.get('Content-Type')?.includes('text/csv')) {
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `transactions_${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    return { success: true, message: 'CSV downloaded' }
  }

  let result = null
  try {
    result = await response.json()
  } catch {
    result = { message: 'Invalid server response' }
  }

  // ── Token expired / invalid → trigger session modal ──
  if (response.status === 401 && isTokenError(result)) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    if (_onSessionExpired) _onSessionExpired()
    // Throw a special error so callers know it was a session issue
    const err = new Error('SESSION_EXPIRED')
    err.isSessionExpired = true
    throw err
  }

  if (!response.ok || result?.success === false) {
    const errorMessage =
      result?.message ||
      (typeof result?.detail === 'string' ? result.detail : null) ||
      'Request failed'
    throw new Error(errorMessage)
  }

  return result
}

function buildQuery(params = {}) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return query ? `?${query}` : ''
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export function loginUser(credentials)  { return apiRequest('/login/',         'POST', credentials) }
export function registerUser(payload)   { return apiRequest('/register/',       'POST', payload) }
export function refreshToken(payload)   { return apiRequest('/token/refresh/',  'POST', payload) }

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────
export function getUserProfile()        { return apiRequest('/user/profile/', 'GET') }
export function updateUserProfile(p)    { return apiRequest('/user/profile/', 'PUT', p) }

// ─────────────────────────────────────────────
// INCOME CATEGORIES
// ─────────────────────────────────────────────
export function getIncomeCategories()             { return apiRequest('/income/categories/', 'GET') }
export function createIncomeCategory(p)           { return apiRequest('/income/categories/', 'POST', p) }
export function updateIncomeCategory(id, p)       { return apiRequest(`/income/categories/${buildQuery({ category_id: id })}`, 'PUT', p) }
export function deleteIncomeCategory(id)          { return apiRequest(`/income/categories/${buildQuery({ category_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// INCOME
// ─────────────────────────────────────────────
export function getIncomes(params = {})           { return apiRequest(`/income/${buildQuery(params)}`, 'GET') }
export function createIncome(p)                   { return apiRequest('/income/', 'POST', p) }
export function updateIncome(id, p)               { return apiRequest(`/income/${buildQuery({ income_id: id })}`, 'PUT', p) }
export function deleteIncome(id)                  { return apiRequest(`/income/${buildQuery({ income_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// SALARY STRUCTURE
// ─────────────────────────────────────────────
export function getSalaryStructures(id = null)    { return apiRequest(`/income/salary-structure/${buildQuery({ salary_id: id })}`, 'GET') }
export function createSalaryStructure(p)          { return apiRequest('/income/salary-structure/', 'POST', p) }
export function updateSalaryStructure(id, p)      { return apiRequest(`/income/salary-structure/${buildQuery({ salary_id: id })}`, 'PUT', p) }
export function deleteSalaryStructure(id)         { return apiRequest(`/income/salary-structure/${buildQuery({ salary_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// EXPENSE CATEGORIES
// ─────────────────────────────────────────────
export function getExpenseCategories()            { return apiRequest('/expenses/categories/', 'GET') }
export function createExpenseCategory(p)          { return apiRequest('/expenses/categories/', 'POST', p) }
export function updateExpenseCategory(id, p)      { return apiRequest(`/expenses/categories/${buildQuery({ category_id: id })}`, 'PUT', p) }
export function deleteExpenseCategory(id)         { return apiRequest(`/expenses/categories/${buildQuery({ category_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export function getExpenses(params = {})          { return apiRequest(`/expenses/${buildQuery(params)}`, 'GET') }
export function createExpense(p)                  { return apiRequest('/expenses/', 'POST', p) }
export function updateExpense(id, p)              { return apiRequest(`/expenses/${buildQuery({ expense_id: id })}`, 'PUT', p) }
export function deleteExpense(id)                 { return apiRequest(`/expenses/${buildQuery({ expense_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// EMI / LOANS
// ─────────────────────────────────────────────
export function getEMILoans(id = null)            { return apiRequest(`/expenses/emi-loans/${buildQuery({ loan_id: id })}`, 'GET') }
export function createEMILoan(p)                  { return apiRequest('/expenses/emi-loans/', 'POST', p) }
export function updateEMILoan(id, p)              { return apiRequest(`/expenses/emi-loans/${buildQuery({ loan_id: id })}`, 'PUT', p) }
export function deleteEMILoan(id)                 { return apiRequest(`/expenses/emi-loans/${buildQuery({ loan_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// SAVINGS
// ─────────────────────────────────────────────
export function getSavings(id = null)             { return apiRequest(`/expenses/savings/${buildQuery({ saving_id: id })}`, 'GET') }
export function createSaving(p)                   { return apiRequest('/expenses/savings/', 'POST', p) }
export function updateSaving(id, p)               { return apiRequest(`/expenses/savings/${buildQuery({ saving_id: id })}`, 'PUT', p) }
export function deleteSaving(id)                  { return apiRequest(`/expenses/savings/${buildQuery({ saving_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// INVESTMENTS
// ─────────────────────────────────────────────
export function getInvestments(id = null)         { return apiRequest(`/expenses/investments/${buildQuery({ investment_id: id })}`, 'GET') }
export function createInvestment(p)               { return apiRequest('/expenses/investments/', 'POST', p) }
export function updateInvestment(id, p)           { return apiRequest(`/expenses/investments/${buildQuery({ investment_id: id })}`, 'PUT', p) }
export function deleteInvestment(id)              { return apiRequest(`/expenses/investments/${buildQuery({ investment_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// EMERGENCY EXPENSES
// ─────────────────────────────────────────────
export function getEmergencyExpenses(id = null)   { return apiRequest(`/expenses/emergency/${buildQuery({ emergency_id: id })}`, 'GET') }
export function createEmergencyExpense(p)         { return apiRequest('/expenses/emergency/', 'POST', p) }
export function updateEmergencyExpense(id, p)     { return apiRequest(`/expenses/emergency/${buildQuery({ emergency_id: id })}`, 'PUT', p) }
export function deleteEmergencyExpense(id)        { return apiRequest(`/expenses/emergency/${buildQuery({ emergency_id: id })}`, 'DELETE') }

// ─────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────
export function getBudgets(params = {})           { return apiRequest(`/budget/${buildQuery(params)}`, 'GET') }
export function createBudget(p)                   { return apiRequest('/budget/', 'POST', p) }
export function updateBudget(id, p)               { return apiRequest(`/budget/${buildQuery({ budget_id: id })}`, 'PUT', p) }
export function deleteBudget(id)                  { return apiRequest(`/budget/${buildQuery({ budget_id: id })}`, 'DELETE') }
export function getBudgetSummary(params = {})     { return apiRequest(`/budget/summary/${buildQuery(params)}`, 'GET') }
export function getBudgetAlerts()                 { return apiRequest('/budget/alerts/', 'GET') }
export function markBudgetAlert(id = null)        { return apiRequest(`/budget/alerts/${buildQuery({ alert_id: id })}`, 'PUT') }

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────
export function getDashboardSummary(params = {})  { return apiRequest(`/analytics/dashboard/${buildQuery(params)}`, 'GET') }
export function getCashFlow(params = {})          { return apiRequest(`/analytics/cashflow/${buildQuery(params)}`, 'GET') }
export function getExpenseBreakdown(params = {})  { return apiRequest(`/analytics/expense-breakdown/${buildQuery(params)}`, 'GET') }
export function getIncomeBreakdown(params = {})   { return apiRequest(`/analytics/income-breakdown/${buildQuery(params)}`, 'GET') }
export function getNetWorth()                     { return apiRequest('/analytics/net-worth/', 'GET') }
export function getBudgetVsActual(params = {})    { return apiRequest(`/analytics/budget-vs-actual/${buildQuery(params)}`, 'GET') }
export function getYearlySummary(year = null)     { return apiRequest(`/analytics/yearly-summary/${buildQuery({ year })}`, 'GET') }
export function getSavingsProgress()              { return apiRequest('/analytics/savings-progress/', 'GET') }
export function getInvestmentPerformance()        { return apiRequest('/analytics/investment-performance/', 'GET') }

// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────
export function getTransactions(params = {})      { return apiRequest(`/transactions/${buildQuery(params)}`, 'GET') }
export function createTransaction(p)              { return apiRequest('/transactions/', 'POST', p) }
export function updateTransaction(id, p)          { return apiRequest(`/transactions/${buildQuery({ txn_id: id })}`, 'PUT', p) }
export function deleteTransaction(id)             { return apiRequest(`/transactions/${buildQuery({ txn_id: id })}`, 'DELETE') }
export function getCSVUploads()                   { return apiRequest('/transactions/upload/', 'GET') }
export function exportTransactionsCSV(params={})  { return apiRequest(`/transactions/export/${buildQuery(params)}`, 'GET') }
export function uploadCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest('/transactions/upload/', 'POST', formData, true)
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export function getNotifications(params = {})          { return apiRequest(`/notifications/${buildQuery(params)}`, 'GET') }
export function deleteNotification(id=null, all=false) { return all ? apiRequest('/notifications/?clear=all','DELETE') : apiRequest(`/notifications/${buildQuery({ notif_id: id })}`, 'DELETE') }
export function markNotificationRead(id=null, all=false){ return all ? apiRequest('/notifications/read/?mark=all','PUT') : apiRequest(`/notifications/read/${buildQuery({ notif_id: id })}`, 'PUT') }
export function getUnreadNotificationCount()           { return apiRequest('/notifications/unread-count/', 'GET') }
export function getNotificationPreferences()           { return apiRequest('/notifications/preferences/', 'GET') }
export function updateNotificationPreferences(p)       { return apiRequest('/notifications/preferences/', 'PUT', p) }