
"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2025-09-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('user',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('cep', sa.String(length=9)),
        sa.Column('avatar_url', sa.String(length=500)),
        sa.Column('is_admin', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    op.create_table('product',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=140), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('price_cents', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(length=500)),
        sa.Column('stock', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    op.create_table('order',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id')),
        sa.Column('customer_name', sa.String(length=120)),
        sa.Column('cep', sa.String(length=9)),
        sa.Column('address', sa.String(length=255)),
        sa.Column('status', sa.String(length=40), server_default='pending', nullable=False),
        sa.Column('total_cents', sa.Integer(), server_default='0', nullable=False),
        sa.Column('pix_txid', sa.String(length=35)),
        sa.Column('pix_payload', sa.Text()),
        sa.Column('pix_qr_url', sa.String(length=500)),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    op.create_table('order_item',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('order.id')),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('product.id')),
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=False),
        sa.Column('unit_price_cents', sa.Integer(), nullable=False)
    )

    op.create_table('audit_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id')),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('target_type', sa.String(length=120)),
        sa.Column('target_id', sa.String(length=64)),
        sa.Column('meta', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

def downgrade():
    op.drop_table('audit_log')
    op.drop_table('order_item')
    op.drop_table('order')
    op.drop_table('product')
    op.drop_table('user')
