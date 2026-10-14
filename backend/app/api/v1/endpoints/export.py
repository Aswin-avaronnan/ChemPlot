import sqlite3
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models import repository
from app.services.export_service import render_figure

router = APIRouter()

@router.get("/runs/{run_id}/export")
def export_run_figure(
    run_id: str,
    format: str = Query("png", pattern="^(png|svg|pdf)$"),
    template: str = Query("acs", pattern="^(nature|acs|default)$"),
    title: Optional[str] = None,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    x_min: Optional[float] = None,
    x_max: Optional[float] = None,
    y_min: Optional[float] = None,
    y_max: Optional[float] = None,
    stroke_width: Optional[float] = None,
    axis_linewidth: Optional[float] = None,
    palette: Optional[str] = None,
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
        raise NotFoundException(message="No segments found to render", code="NO_SEGMENTS")
        
    mass_mg = run.get("mass_mg_override") or exp.get("mass_mg")
    area_cm2 = run.get("area_cm2_override") or exp.get("area_cm2")
    
    fig_title = title or f"{exp['name']} — {run['technique']}"
    buf = render_figure(
        technique=run["technique"],
        segments=segments,
        template=template,
        fmt=format,
        mass_mg=mass_mg,
        area_cm2=area_cm2,
        title=fig_title,
        custom_x_label=x_label,
        custom_y_label=y_label,
        x_min=x_min,
        x_max=x_max,
        y_min=y_min,
        y_max=y_max,
        stroke_width=stroke_width,
        axis_linewidth=axis_linewidth,
        palette_name=palette,
    )
    
    media_types = {
        "png": "image/png",
        "svg": "image/svg+xml",
        "pdf": "application/pdf"
    }
    
    filename = f"{run['technique']}_{run['id'][:8]}_{template}.{format}"
    return StreamingResponse(
        buf,
        media_type=media_types[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
