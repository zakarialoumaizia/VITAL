"""Remove subscription_plan column from members table.

Revision ID: 002_remove_subscription_plan
Revises: 001_initial
Create Date: 2026-04-15 23:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002_remove_subscription_plan"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop subscription_plan column from members table."""
    op.drop_column("members", "subscription_plan")


def downgrade() -> None:
    """Add subscription_plan column back to members table."""
    op.add_column(
        "members",
        sa.Column(
            "subscription_plan",
            sa.String(length=50),
            nullable=False,
            server_default="free",
        ),
    )
