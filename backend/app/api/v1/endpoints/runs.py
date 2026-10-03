import os
import uuid
import sqlite3
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status, Query

from app.core.database import get_db, get_connection
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException, ParseException
from app.models import repository
from app.schemas.run import RunResponse, RunStatusResponse, RunUpdate
from app.schemas.segment import SegmentResponse, SegmentListResponse
from app.services.storage import storage_service
from app.services.parser import parse_mpr_file

router = APIRouter()

def process_run_in_background(run_id: str, file_path: str, declared_technique: Optional[str] = None):
    conn = get_connection()
    try:
        run = repository.get_technique_run(conn, run_id)
        if not run:
            return
            
        repository.update_technique_run(conn, run_id, {"parse_status": "parsing"})
        
        parsed = parse_mpr_file(file_path, declared_technique)
        
        repository.update_technique_run(conn, run_id, {
            "technique": parsed["technique"],
            "scan_rate_mv_s": parsed.get("scan_rate_mv_s"),
            "instrument_metadata": parsed.get("metadata"),
            "parse_status": "parsed"
        })
        
        # Save segments
        repository.save_segments_batch(conn, run_id, parsed.get("segments", []))
    except ParseException as pe:
        repository.update_technique_run(conn, run_id, {
            "parse_status": "failed",
            "parse_error_code": pe.code
        })
    except Exception as ex:
        repository.update_technique_run(conn, run_id, {
            "parse_status": "failed",
            "parse_error_code": "PARSE_CORRUPT_FILE"
        })
    finally:
        conn.close()

@router.post("/experiments/{experiment_id}/runs", response_model=List[RunStatusResponse], status_code=status.HTTP_202_ACCEPTED)
async def upload_technique_runs(
    experiment_id: str,
    files: List[UploadFile] = File(...),
    technique: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.get_experiment(conn, experiment_id)
    if not exp:
        raise NotFoundException(message=f"Experiment '{experiment_id}' not found", code="EXPERIMENT_NOT_FOUND")
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this experiment", code="NOT_OWNER")
        
    responses = []
    
    for upload in files:
        filename = upload.filename or "unknown.mpr"
        if not filename.lower().endswith(".mpr") and not filename.lower().endswith(".mpt"):
            raise ValidationException(
                message=f"File '{filename}' is not a valid BioLogic file.",
                detail="Supported formats in v0 are BioLogic binary .mpr files.",
                code="INVALID_FILE_TYPE"
            )
            
        content = await upload.read()
        file_key = f"{current_user['id']}/{exp['id']}/{uuid.uuid4()}_{filename}"
        local_path = storage_service.save_file(content, file_key)
        
        run = repository.create_technique_run(conn, exp["id"], {
            "technique": technique.upper() if technique else "CV",
            "original_filename": filename,
            "raw_file_key": file_key,
            "parse_status": "pending",
        })
        
        # Enqueue parse job (or run immediately)
        background_tasks.add_task(process_run_in_background, run["id"], local_path, technique)
        
        responses.append(RunStatusResponse(
            run_id=run["id"],
            parse_status=run["parse_status"],
            technique=run["technique"],
            original_filename=run["original_filename"]
        ))
        
    return responses

@router.get("/runs/{run_id}", response_model=RunResponse)
def get_run(
    run_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    run = repository.get_technique_run(conn, run_id)
    if not run:
        raise NotFoundException(message=f"Run '{run_id}' not found", code="RUN_NOT_FOUND")
    exp = repository.get_experiment(conn, run["experiment_id"])
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this run", code="NOT_OWNER")
    return run

@router.patch("/runs/{run_id}", response_model=RunResponse)
def update_run(
    run_id: str,
    data: RunUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    run = repository.get_technique_run(conn, run_id)
    if not run:
        raise NotFoundException(message=f"Run '{run_id}' not found", code="RUN_NOT_FOUND")
    exp = repository.get_experiment(conn, run["experiment_id"])
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this run", code="NOT_OWNER")
        
    updated = repository.update_technique_run(conn, run_id, data.model_dump(exclude_unset=True))
    return updated

@router.get("/runs/{run_id}/segments", response_model=SegmentListResponse)
def get_run_segments(
    run_id: str,
    limit: Optional[int] = Query(None, description="Max segments to return"),
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    run = repository.get_technique_run(conn, run_id)
    if not run:
        raise NotFoundException(message=f"Run '{run_id}' not found", code="RUN_NOT_FOUND")
    exp = repository.get_experiment(conn, run["experiment_id"])
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this run", code="NOT_OWNER")
        
    segments = repository.list_segments_for_run(conn, run["id"], limit=limit)
    return SegmentListResponse(
        technique_run_id=run["id"],
        technique=run["technique"],
        total_segments=len(segments),
        segments=segments
    )

@router.get("/experiments/{experiment_id}/overlay")
def get_experiment_overlay(
    experiment_id: str,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.get_experiment(conn, experiment_id)
    if not exp:
        raise NotFoundException(message=f"Experiment '{experiment_id}' not found", code="EXPERIMENT_NOT_FOUND")
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this experiment", code="NOT_OWNER")
        
    runs = [r for r in exp.get("technique_runs", []) if r["parse_status"] == "parsed"]
    
    overlay_runs = []
    for r in runs:
        run_detail = repository.get_technique_run(conn, r["id"])
        segs = repository.list_segments_for_run(conn, r["id"])
        overlay_runs.append({
            "run_id": r["id"],
            "filename": r["original_filename"],
            "technique": r["technique"],
            "scan_rate_mv_s": r["scan_rate_mv_s"],
            "mass_mg": run_detail.get("mass_mg_override") or exp.get("mass_mg"),
            "area_cm2": run_detail.get("area_cm2_override") or exp.get("area_cm2"),
            "active_material_pct": exp.get("active_material_pct") or 100.0,
            "segments": segs
        })
        
    return {
        "experiment_id": exp["id"],
        "name": exp["name"],
        "sample_parameters": {
            "mass_mg": exp.get("mass_mg"),
            "area_cm2": exp.get("area_cm2"),
            "active_material_pct": exp.get("active_material_pct"),
            "reference_electrode": exp.get("reference_electrode"),
            "electrolyte": exp.get("electrolyte"),
        },
        "runs": overlay_runs
    }
