
from collections import defaultdict
from datetime import datetime
from flask import Blueprint, render_template
from flask_login import login_required
from ..auth_utils import admin_required
from ..models import Order

reports_bp = Blueprint('reports', __name__, template_folder='../templates')

@reports_bp.get('/admin/reports/monthly-sales')
@login_required
@admin_required
def monthly_sales():
    # Group paid orders by YYYY-MM and sum totals
    buckets = defaultdict(lambda: {'orders': 0, 'revenue_cents': 0})
    orders = Order.query.filter_by(status='paid').all()
    for o in orders:
        key = o.created_at.strftime('%Y-%m')
        buckets[key]['orders'] += 1
        buckets[key]['revenue_cents'] += int(o.total_cents or 0)

    # Convert to sorted list newest first
    rows = []
    for ym, stats in buckets.items():
        year, month = map(int, ym.split('-'))
        rows.append({
            'year': year,
            'month': month,
            'label': datetime(year, month, 1).strftime('%b/%Y'),
            'orders': stats['orders'],
            'revenue_cents': stats['revenue_cents'],
            'revenue': stats['revenue_cents'] / 100.0
        })
    rows.sort(key=lambda r: (r['year'], r['month']), reverse=True)

    totals = {
        'orders': sum(r['orders'] for r in rows),
        'revenue_cents': sum(r['revenue_cents'] for r in rows),
        'revenue': sum(r['revenue'] for r in rows),
    }

    return render_template('admin/monthly_sales.html', rows=rows, totals=totals)
