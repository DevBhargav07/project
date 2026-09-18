# alembic
Trying to update the models with a structure

uv add alembic

## initialize alembic

uv run alembic init alembic


## Connect Alembic to Your Database

Edit alembic.ini. Find this line:

sqlalchemy.url = driver://user:pass@localhost/dbname

replace with

sqlalchemy.url = sqlite+aiosqlite:///./test.db

## Connect Alembic to Your Models

Edit alembic/env.py. Find the section near the top and change it to:

from app.database import Base, DATABASE_URL  # import your Base
from app.models import Project, Task          # import all models so Alembic sees them

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("+aiosqlite", ""))
target_metadata = Base.metadata

## Create Your First Migration (Initial Tables)

uv run alembic revision --autogenerate -m "initial tables"

Alembic scans your models.py, compares it to the actual database, and writes a migration file in alembic/versions/. It looks like:

"""initial tables

Revision ID: abc123
Revises: 
Create Date: 2026-09-10 10:00:00

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        ...
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('tasks', ...)

def downgrade():
    op.drop_table('tasks')
    op.drop_table('projects')


## Apply the Migration to the Database

uv run alembic upgrade head

## Check Current Status

uv run alembic current

## Add a New Column Later

Say you add a priority column to Project:

# models.py
class User(Base):
    ...
    address: Mapped[str] = mapped_column(String(50), default="medium")


Generate a new migration:

uv run alembic revision --autogenerate -m "add project priority"

Apply it:

uv run alembic upgrade head



## Oops — Roll Back

uv run alembic downgrade -1




## Password adding in the .env for the special characters

Character,Special Meaning in Connection URL,Encoded Replacement
$,  Variable / Syntax,                  %24
0,  Standard Number,                    0 (No replacement needed)
@,  User / Host Separator,              %40
!,  Delimiter / Special Character,      %21



## example .env file for db connection

DB_USER=username
DB_PASSWORD=strong_password
DB_HOST=127.0.0.1
DB_PORT=6432 #pgbouncer
DB_NAME=db_name
DATABASE_URL=postgresql+asyncpg://username:passwoed@127.0.0.1:6432/db_name