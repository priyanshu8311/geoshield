import os
from contextlib import contextmanager
from typing import Optional

# Try to import SQLAlchemy and psycopg2, but handle missing dependencies gracefully
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker, declarative_base
    from sqlalchemy.pool import NullPool
    from sqlalchemy.exc import OperationalError
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    create_engine = None
    sessionmaker = None
    declarative_base = None
    NullPool = None
    OperationalError = Exception
    text = None

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/hazard_db"
)

# Create Base at module level for models to import
if SQLALCHEMY_AVAILABLE and declarative_base:
    Base = declarative_base()
else:
    Base = None

_engine = None
_SessionLocal = None
_db_available = None


def _get_engine():
    global _engine
    if _engine is None and SQLALCHEMY_AVAILABLE:
        try:
            _engine = create_engine(
                DATABASE_URL,
                poolclass=NullPool,
                echo=os.getenv("SQL_ECHO", "false").lower() == "true"
            )
        except Exception:
            _engine = None
    return _engine


def _get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        engine = _get_engine()
        if engine and sessionmaker:
            _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


def is_database_available() -> bool:
    global _db_available
    if _db_available is not None:
        return _db_available
    
    if not SQLALCHEMY_AVAILABLE:
        _db_available = False
        return False
    
    engine = _get_engine()
    if not engine:
        _db_available = False
        return False
    
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _db_available = True
        return True
    except Exception:
        _db_available = False
        return False


def get_session_local():
    return _get_session_local()


@contextmanager
def get_db_session():
    session_local = get_session_local()
    if not session_local:
        yield None
        return
    
    db = session_local()
    try:
        yield db
    finally:
        db.close()


def get_db():
    if is_database_available():
        session_local = get_session_local()
        if session_local:
            db = session_local()
            try:
                yield db
            finally:
                db.close()
    else:
        yield None


def init_db():
    if is_database_available():
        engine = _get_engine()
        if Base and engine:
            Base.metadata.create_all(bind=engine)
    else:
        print("Database not available - running in fallback mode with sample data")


def drop_db():
    if is_database_available():
        engine = _get_engine()
        if Base and engine:
            Base.metadata.drop_all(bind=engine)