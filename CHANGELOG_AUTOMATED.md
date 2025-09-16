
# Changes applied
- Removed Flask-Migrate usage from `app/__init__.py` and project dependencies; now the app uses `db.create_all()` on startup.
- Added seeding of default admin user:
  - email: `jose12345@gmail.com`
  - password: `joseneto0303`
  - is_admin: True
- Added Monthly Sales report at `/admin/reports/monthly-sales` (requires admin login).
- Registered new `reports` blueprint and added template `app/templates/admin/monthly_sales.html`.
- Kept existing admin CRUD for products and orders.
