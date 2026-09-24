from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from alembic import context

from app.database import Base
from app.models import User  # Ensures models are registered for autogenerate
from app.config import settings

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Strip async drivers for Alembic's synchronous runner
db_url = str(settings.database_url).replace("+asyncpg", "").replace("+aiosqlite", "")

# Option A: Escape '%' -> '%%' so ConfigParser doesn't crash on encoded passwords
config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))

# Set metadata target for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Create the synchronous engine directly using our clean db_url
    connectable = create_engine(
        db_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()