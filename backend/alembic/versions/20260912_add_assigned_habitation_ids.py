"""Add assigned habitation scope to users.

Revision ID: 20260912_assigned_habitation_ids
Revises:
"""

from alembic import op
import sqlalchemy as sa


revision = "20260912_assigned_habitation_ids"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("assigned_habitation_ids", sa.JSON(), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE users "
            "SET assigned_habitation_ids = :empty_list "
            "WHERE assigned_habitation_ids IS NULL"
        ).bindparams(empty_list="[]")
    )
    op.alter_column(
        "users",
        "assigned_habitation_ids",
        existing_type=sa.JSON(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("users", "assigned_habitation_ids")