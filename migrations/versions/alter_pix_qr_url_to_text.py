from alembic import op
import sqlalchemy as sa

revision = 'alter_pix_qr_url_to_text'
down_revision = '0001_initial'   # <-- encadeado na base
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column(
        'order',
        'pix_qr_url',
        type_=sa.Text(),
        existing_type=sa.String(length=500)
    )

def downgrade():
    op.alter_column(
        'order',
        'pix_qr_url',
        type_=sa.String(length=500),
        existing_type=sa.Text()
    )
