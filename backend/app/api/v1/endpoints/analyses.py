import sqlite3
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, AnalysisException
from app.models import repository
from app.schemas.analysis import AnalysisCreate, AnalysisResponse, AnalysisListResponse
from app.services.analysis_service import (
    compute_cv_capacitance,
    compute_gcd_capacitance,
    compute_coulombic_efficiency,
    compute_peis_metrics,
)

router = APIRouter()

@router.post("/runs/{run_id}/analyses", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
def run_analysis(
    run_id: str,
    data: AnalysisCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    run = repository.get_technique_run(conn, run_id)
    if not run:
        raise NotFoundException(message=f"Run '{run_id}' not found", code="RUN_NOT_FOUND")
    exp = repository.get_experiment(conn, run["experiment_id"])
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this run", code="NOT_OWNER")
        
    segments = repository.list_segments_for_run(conn, run_id)
    if not segments:
        raise AnalysisException(code="ANALYSIS_NO_SEGMENTS", message="Run has no parsed segments available.")
        
    params = data.params or {}
    mass_mg = params.get("mass_mg") or run.get("mass_mg_override") or exp.get("mass_mg")
    area_cm2 = params.get("area_cm2") or run.get("area_cm2_override") or exp.get("area_cm2")
    active_pct = params.get("active_material_pct") or exp.get("active_material_pct") or 100.0
    convention = data.convention or "full_window"
    
    result = {}
    
    if data.analysis_type == "cv_capacitance":
        target_cycle = params.get("cycle_index")
        target_seg = None
        if target_cycle is not None:
            target_seg = next((s for s in segments if s["segment_index"] == int(target_cycle)), None)
        if not target_seg:
            target_seg = segments[-1]
            
        scan_rate = params.get("scan_rate_mv_s") or target_seg.get("scan_rate_mv_s") or run.get("scan_rate_mv_s")
        if not scan_rate:
            raise AnalysisException(code="ANALYSIS_MISSING_SCAN_RATE", message="Scan rate is required for CV capacitance calculation.")
            
        result = compute_cv_capacitance(
            segment_data=target_seg["data"],
            scan_rate_mv_s=float(scan_rate),
            mass_mg=mass_mg,
            area_cm2=area_cm2,
            active_material_pct=active_pct,
            convention=convention
        )
        result["analyzed_cycle"] = target_seg["segment_index"]
        
    elif data.analysis_type == "gcd_specific_capacitance":
        target_idx = params.get("segment_index")
        target_seg = None
        if target_idx is not None:
            target_seg = next((s for s in segments if s["segment_index"] == int(target_idx)), None)
        if not target_seg:
            target_seg = next((s for s in reversed(segments) if s["data"].get("mode") == "discharge"), segments[-1])
            
        applied_i = params.get("applied_current_a") or target_seg.get("applied_current_a")
        result = compute_gcd_capacitance(
            segment_data=target_seg["data"],
            applied_current_a=applied_i,
            mass_mg=mass_mg,
            area_cm2=area_cm2,
            active_material_pct=active_pct,
            convention=convention
        )
        result["analyzed_half_cycle"] = target_seg["segment_index"]
        
    elif data.analysis_type == "coulombic_efficiency":
        ch_seg = next((s for s in reversed(segments) if s["data"].get("mode") == "charge"), None)
        dis_seg = next((s for s in reversed(segments) if s["data"].get("mode") == "discharge"), None)
        if not ch_seg or not dis_seg:
            raise AnalysisException(code="ANALYSIS_INSUFFICIENT_CYCLES", message="Could not identify both charge and discharge half-cycles.")
        result = compute_coulombic_efficiency(ch_seg["data"], dis_seg["data"])
        
    elif data.analysis_type == "peis_rs":
        first_seg = segments[0]
        result = compute_peis_metrics(first_seg["data"], area_cm2=area_cm2)
        
    else:
        raise AnalysisException(code="ANALYSIS_INVALID_TYPE", message=f"Unknown analysis type: {data.analysis_type}")
        
    saved = repository.save_analysis(conn, run_id, data.analysis_type, convention, result)
    return saved

@router.get("/runs/{run_id}/analyses", response_model=AnalysisListResponse)
def list_run_analyses(
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
        
    analyses = repository.list_analyses_for_run(conn, run_id)
    return AnalysisListResponse(technique_run_id=run_id, analyses=analyses)
