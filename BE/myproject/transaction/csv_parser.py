import csv
import io
import datetime
from decimal import Decimal, InvalidOperation

from .models import Transaction, CSVUpload
from expenses.models import Expense, ExpenseCategory
from income.models import Income, IncomeCategory
from budget.utils import update_budget_spent

# ── Column name aliases ──────────────────────────────────────────────────────
# Maps common bank CSV headers → our internal keys
DATE_ALIASES        = ["date", "transaction date", "txn date", "value date"]
DESCRIPTION_ALIASES = ["description", "narration", "details", "particulars", "remarks"]
DEBIT_ALIASES       = ["debit", "withdrawal", "dr", "debit amount"]
CREDIT_ALIASES      = ["credit", "deposit", "cr", "credit amount"]
AMOUNT_ALIASES      = ["amount"]
TYPE_ALIASES        = ["type", "transaction type", "txn type"]


def _normalize_headers(headers):
    """Lower-case + strip all header names."""
    return [h.strip().lower() for h in headers]


def _find_col(headers, aliases):
    """Return the first alias that exists in headers, else None."""
    for alias in aliases:
        if alias in headers:
            return alias
    return None


def _parse_amount(value):
    """Strip currency symbols / commas and return Decimal."""
    cleaned = str(value).replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        val = Decimal(cleaned)
        return abs(val)
    except InvalidOperation:
        return None


def _parse_date(value):
    """Try common date formats and return a date object."""
    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d-%b-%Y"]
    value = str(value).strip()
    for fmt in formats:
        try:
            return datetime.datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _auto_categorize(description, user, transaction_type):
    """
    Naive keyword → category matcher.
    Returns (category_obj, category_name_str).
    """
    keywords = {
        # Expense keywords
        "swiggy": "Food", "zomato": "Food", "restaurant": "Food",
        "amazon": "Shopping", "flipkart": "Shopping",
        "uber": "Transport", "ola": "Transport", "petrol": "Transport",
        "electricity": "Utilities", "airtel": "Utilities", "jio": "Utilities",
        "netflix": "Subscriptions", "spotify": "Subscriptions",
        "emi": "EMI", "loan": "EMI",
        "hospital": "Medical", "pharmacy": "Medical", "apollo": "Medical",
        "school": "Education", "college": "Education", "udemy": "Education",
        # Income keywords
        "salary": "Salary", "payroll": "Salary",
        "freelance": "Freelance", "consulting": "Freelance",
        "interest": "Interest", "dividend": "Dividend",
        "refund": "Refund",
    }

    desc_lower = description.lower()
    matched_name = "Others"

    for keyword, cat_name in keywords.items():
        if keyword in desc_lower:
            matched_name = cat_name
            break

    # Try to find or create the matching category
    if transaction_type == "expense":
        category, _ = ExpenseCategory.objects.get_or_create(
            user=user,
            name=matched_name,
            defaults={"category_type": "variable"}
        )
    else:
        category, _ = IncomeCategory.objects.get_or_create(
            user=user,
            name=matched_name
        )

    return category, matched_name


def process_csv(csv_upload_obj, user):
    """
    Main entry point. Reads the uploaded CSV file, creates
    Income / Expense + Transaction records for each valid row.
    Updates csv_upload_obj with results.
    """
    csv_upload_obj.status = "processing"
    csv_upload_obj.save()

    errors = []
    imported = 0
    total = 0

    try:
        file = csv_upload_obj.file
        file.seek(0)
        content = file.read().decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(content))

        raw_headers = reader.fieldnames or []
        headers = _normalize_headers(raw_headers)

        # Map internal keys to actual CSV column names
        col_date   = _find_col(headers, DATE_ALIASES)
        col_desc   = _find_col(headers, DESCRIPTION_ALIASES)
        col_debit  = _find_col(headers, DEBIT_ALIASES)
        col_credit = _find_col(headers, CREDIT_ALIASES)
        col_amount = _find_col(headers, AMOUNT_ALIASES)
        col_type   = _find_col(headers, TYPE_ALIASES)

        if not col_date:
            raise ValueError("No date column found in CSV.")
        if not col_desc:
            raise ValueError("No description column found in CSV.")
        if not col_debit and not col_credit and not col_amount:
            raise ValueError("No amount column found in CSV.")

        # Rebuild reader with normalized header map
        file.seek(0)
        raw_reader = csv.DictReader(io.StringIO(content))
        header_map = {
            raw: norm
            for raw, norm in zip(raw_headers, headers)
        }

        for row_num, raw_row in enumerate(raw_reader, start=2):
            row = {header_map.get(k, k): v for k, v in raw_row.items()}
            total += 1

            # ── Parse date ──────────────────────────────
            txn_date = _parse_date(row.get(col_date, ""))
            if not txn_date:
                errors.append({"row": row_num, "reason": f"Invalid date: {row.get(col_date)}"})
                continue

            # ── Parse description ────────────────────────
            description = str(row.get(col_desc, "")).strip()

            # ── Determine type + amount ──────────────────
            transaction_type = None
            amount = None

            if col_debit and col_credit:
                # Separate debit/credit columns (most Indian bank formats)
                debit_val  = row.get(col_debit,  "").strip()
                credit_val = row.get(col_credit, "").strip()

                if debit_val and debit_val not in ("", "0", "0.00"):
                    transaction_type = "expense"
                    amount = _parse_amount(debit_val)
                elif credit_val and credit_val not in ("", "0", "0.00"):
                    transaction_type = "income"
                    amount = _parse_amount(credit_val)

            elif col_amount and col_type:
                # Single amount column + type column
                raw_type = str(row.get(col_type, "")).strip().lower()
                transaction_type = "income" if raw_type in ("credit", "cr", "income") else "expense"
                amount = _parse_amount(row.get(col_amount, ""))

            elif col_amount:
                # Single amount column — negative = expense, positive = income
                raw_amount = row.get(col_amount, "").strip()
                parsed = _parse_amount(raw_amount)
                if str(raw_amount).startswith("-"):
                    transaction_type = "expense"
                else:
                    transaction_type = "income"
                amount = parsed

            if not amount or amount <= 0:
                errors.append({"row": row_num, "reason": f"Invalid or zero amount at row {row_num}"})
                continue

            if not transaction_type:
                errors.append({"row": row_num, "reason": f"Cannot determine transaction type at row {row_num}"})
                continue

            # ── Auto-categorize ──────────────────────────
            category, category_name = _auto_categorize(description, user, transaction_type)

            # ── Create Income / Expense record ───────────
            try:
                if transaction_type == "income":
                    record = Income.objects.create(
                        user=user,
                        category=category,
                        amount=amount,
                        income_date=txn_date,
                        description=description,
                        is_recurring=False,
                    )
                    income_ref, expense_ref = record, None

                else:
                    record = Expense.objects.create(
                        user=user,
                        category=category,
                        amount=amount,
                        expense_date=txn_date,
                        description=description,
                        is_recurring=False,
                    )
                    income_ref, expense_ref = None, record

                    # Keep budget spent_amount in sync
                    update_budget_spent(
                        user=user,
                        category=category,
                        month=txn_date.month,
                        year=txn_date.year,
                        amount=amount,
                        operation="add"
                    )

                # ── Create unified Transaction record ─────
                Transaction.objects.create(
                    user=user,
                    transaction_type=transaction_type,
                    amount=amount,
                    date=txn_date,
                    description=description,
                    source="csv_upload",
                    income=income_ref,
                    expense=expense_ref,
                    category_name=category_name,
                    raw_description=description,
                )

                imported += 1

            except Exception as e:
                errors.append({"row": row_num, "reason": str(e)})

    except Exception as e:
        csv_upload_obj.status = "failed"
        csv_upload_obj.error_log = [{"row": 0, "reason": str(e)}]
        csv_upload_obj.save()
        return

    csv_upload_obj.status = "completed"
    csv_upload_obj.total_rows = total
    csv_upload_obj.imported_rows = imported
    csv_upload_obj.failed_rows = len(errors)
    csv_upload_obj.error_log = errors
    csv_upload_obj.save()