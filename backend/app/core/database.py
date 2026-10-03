import os
import sqlite3
import json
from typing import Generator
from app.core.config import settings

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chemplot.db")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id              TEXT PRIMARY KEY,
        email           TEXT NOT NULL,
        display_name    TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    
    # 2. Experiments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id                  TEXT PRIMARY KEY,
        owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name                TEXT NOT NULL,
        sample_label        TEXT,
        notes               TEXT,
        mass_mg             REAL,
        area_cm2            REAL,
        active_material_pct REAL DEFAULT 100.0,
        reference_electrode TEXT DEFAULT 'Ag/AgCl (3M KCl)',
        electrolyte         TEXT DEFAULT '1M KOH',
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    
    # 3. Technique Runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS technique_runs (
        id                  TEXT PRIMARY KEY,
        experiment_id       TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        technique           TEXT NOT NULL,
        original_filename   TEXT NOT NULL,
        raw_file_key        TEXT NOT NULL,
        parse_status        TEXT NOT NULL DEFAULT 'pending',
        parse_error_code    TEXT,
        instrument_metadata TEXT,
        scan_rate_mv_s      REAL,
        mass_mg_override    REAL,
        area_cm2_override   REAL,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    
    # 4. Segments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS segments (
        id                  TEXT PRIMARY KEY,
        technique_run_id    TEXT NOT NULL REFERENCES technique_runs(id) ON DELETE CASCADE,
        segment_index       INTEGER NOT NULL,
        scan_rate_mv_s      REAL,
        applied_current_a   REAL,
        data                TEXT NOT NULL
    );
    """)
    
    # 5. Analyses
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id                  TEXT PRIMARY KEY,
        technique_run_id    TEXT NOT NULL REFERENCES technique_runs(id) ON DELETE CASCADE,
        analysis_type       TEXT NOT NULL,
        convention          TEXT NOT NULL,
        result              TEXT NOT NULL,
        computed_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    
    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_runs_experiment ON technique_runs(experiment_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_segments_run ON segments(technique_run_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analyses_run ON analyses(technique_run_id);")
    
    conn.commit()
    conn.close()

def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
