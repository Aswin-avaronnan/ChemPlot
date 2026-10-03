import uuid
import json
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def get_or_create_user(conn: sqlite3.Connection, user_id: str, email: str, display_name: Optional[str] = None) -> Dict[str, Any]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    if row:
        return row
    now = utc_now_iso()
    cur.execute(
        "INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)",
        (user_id, email, display_name or "Researcher", now)
    )
    conn.commit()
    return {"id": user_id, "email": email, "display_name": display_name or "Researcher", "created_at": now}

def create_experiment(conn: sqlite3.Connection, owner_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    exp_id = generate_uuid()
    now = utc_now_iso()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO experiments (
            id, owner_id, name, sample_label, notes,
            mass_mg, area_cm2, active_material_pct, reference_electrode, electrolyte,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            exp_id,
            owner_id,
            data["name"],
            data.get("sample_label"),
            data.get("notes"),
            data.get("mass_mg"),
            data.get("area_cm2"),
            data.get("active_material_pct", 100.0),
            data.get("reference_electrode", "Ag/AgCl (3M KCl)"),
            data.get("electrolyte", "1M KOH"),
            now,
            now
        )
    )
    conn.commit()
    return get_experiment(conn, exp_id)

def get_experiment(conn: sqlite3.Connection, exp_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM experiments WHERE id = ?", (exp_id,))
    exp = cur.fetchone()
    if not exp:
        return None
    # Attach technique_runs
    cur.execute("SELECT id, technique, original_filename, parse_status, scan_rate_mv_s, created_at FROM technique_runs WHERE experiment_id = ? ORDER BY created_at ASC", (exp_id,))
    exp["technique_runs"] = cur.fetchall()
    return exp

def list_experiments(conn: sqlite3.Connection, owner_id: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM experiments WHERE owner_id = ? ORDER BY updated_at DESC", (owner_id,))
    exps = cur.fetchall()
    for exp in exps:
        cur.execute("SELECT id, technique, original_filename, parse_status, scan_rate_mv_s, created_at FROM technique_runs WHERE experiment_id = ? ORDER BY created_at ASC", (exp["id"],))
        exp["technique_runs"] = cur.fetchall()
    return exps

def update_experiment(conn: sqlite3.Connection, exp_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if v is not None:
            fields.append(f"{k} = ?")
            values.append(v)
    if not fields:
        return get_experiment(conn, exp_id)
        
    fields.append("updated_at = ?")
    values.append(utc_now_iso())
    values.append(exp_id)
    
    cur.execute(f"UPDATE experiments SET {', '.join(fields)} WHERE id = ?", tuple(values))
    conn.commit()
    return get_experiment(conn, exp_id)

def delete_experiment(conn: sqlite3.Connection, exp_id: str) -> bool:
    cur = conn.cursor()
    cur.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
    conn.commit()
    return cur.rowcount > 0

def create_technique_run(conn: sqlite3.Connection, exp_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    run_id = generate_uuid()
    now = utc_now_iso()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO technique_runs (
            id, experiment_id, technique, original_filename, raw_file_key,
            parse_status, parse_error_code, instrument_metadata, scan_rate_mv_s,
            mass_mg_override, area_cm2_override, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run_id,
            exp_id,
            data.get("technique", "CV"),
            data["original_filename"],
            data["raw_file_key"],
            data.get("parse_status", "pending"),
            data.get("parse_error_code"),
            json.dumps(data.get("instrument_metadata")) if data.get("instrument_metadata") else None,
            data.get("scan_rate_mv_s"),
            data.get("mass_mg_override"),
            data.get("area_cm2_override"),
            now
        )
    )
    conn.commit()
    return get_technique_run(conn, run_id)

def get_technique_run(conn: sqlite3.Connection, run_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM technique_runs WHERE id = ?", (run_id,))
    run = cur.fetchone()
    if not run:
        return None
    if run.get("instrument_metadata") and isinstance(run["instrument_metadata"], str):
        try:
            run["instrument_metadata"] = json.loads(run["instrument_metadata"])
        except Exception:
            pass
    return run

def update_technique_run(conn: sqlite3.Connection, run_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    cur = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if k == "instrument_metadata" and isinstance(v, (dict, list)):
            fields.append(f"{k} = ?")
            values.append(json.dumps(v))
        else:
            fields.append(f"{k} = ?")
            values.append(v)
            
    if not fields:
        return get_technique_run(conn, run_id)
        
    values.append(run_id)
    cur.execute(f"UPDATE technique_runs SET {', '.join(fields)} WHERE id = ?", tuple(values))
    conn.commit()
    return get_technique_run(conn, run_id)

def save_segments_batch(conn: sqlite3.Connection, run_id: str, segments: List[Dict[str, Any]]):
    cur = conn.cursor()
    for s in segments:
        seg_id = generate_uuid()
        cur.execute(
            """
            INSERT INTO segments (id, technique_run_id, segment_index, scan_rate_mv_s, applied_current_a, data)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                seg_id,
                run_id,
                s["segment_index"],
                s.get("scan_rate_mv_s"),
                s.get("applied_current_a"),
                json.dumps(s["data"])
            )
        )
    conn.commit()

def list_segments_for_run(conn: sqlite3.Connection, run_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    query = "SELECT * FROM segments WHERE technique_run_id = ? ORDER BY segment_index ASC"
    if limit:
        query += f" LIMIT {limit}"
    cur.execute(query, (run_id,))
    rows = cur.fetchall()
    for r in rows:
        if isinstance(r.get("data"), str):
            r["data"] = json.loads(r["data"])
    return rows

def save_analysis(conn: sqlite3.Connection, run_id: str, analysis_type: str, convention: str, result: Dict[str, Any]) -> Dict[str, Any]:
    cur = conn.cursor()
    cur.execute("SELECT id FROM analyses WHERE technique_run_id = ? AND analysis_type = ? AND convention = ?", (run_id, analysis_type, convention))
    existing = cur.fetchone()
    now = utc_now_iso()
    result_json = json.dumps(result)
    
    if existing:
        an_id = existing["id"]
        cur.execute("UPDATE analyses SET result = ?, computed_at = ? WHERE id = ?", (result_json, now, an_id))
    else:
        an_id = generate_uuid()
        cur.execute(
            "INSERT INTO analyses (id, technique_run_id, analysis_type, convention, result, computed_at) VALUES (?, ?, ?, ?, ?, ?)",
            (an_id, run_id, analysis_type, convention, result_json, now)
        )
    conn.commit()
    return {
        "id": an_id,
        "technique_run_id": run_id,
        "analysis_type": analysis_type,
        "convention": convention,
        "result": result,
        "computed_at": now
    }

def list_analyses_for_run(conn: sqlite3.Connection, run_id: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM analyses WHERE technique_run_id = ? ORDER BY computed_at DESC", (run_id,))
    rows = cur.fetchall()
    for r in rows:
        if isinstance(r.get("result"), str):
            r["result"] = json.loads(r["result"])
    return rows
