import sqlite3
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models import repository
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentResponse,
    ExperimentListResponse,
)

router = APIRouter()

@router.post("", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
def create_experiment(
    data: ExperimentCreate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.create_experiment(conn, current_user["id"], data.model_dump())
    return exp

@router.get("", response_model=ExperimentListResponse)
def list_experiments(
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exps = repository.list_experiments(conn, current_user["id"])
    return ExperimentListResponse(experiments=exps, total=len(exps))

@router.get("/{id}", response_model=ExperimentResponse)
def get_experiment(
    id: str,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.get_experiment(conn, id)
    if not exp:
        raise NotFoundException(message=f"Experiment '{id}' not found", code="EXPERIMENT_NOT_FOUND")
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this experiment", code="NOT_OWNER")
    return exp

@router.patch("/{id}", response_model=ExperimentResponse)
def update_experiment(
    id: str,
    data: ExperimentUpdate,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.get_experiment(conn, id)
    if not exp:
        raise NotFoundException(message=f"Experiment '{id}' not found", code="EXPERIMENT_NOT_FOUND")
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this experiment", code="NOT_OWNER")
        
    updated = repository.update_experiment(conn, id, data.model_dump(exclude_unset=True))
    return updated

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experiment(
    id: str,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    exp = repository.get_experiment(conn, id)
    if not exp:
        raise NotFoundException(message=f"Experiment '{id}' not found", code="EXPERIMENT_NOT_FOUND")
    if exp["owner_id"] != current_user["id"]:
        raise ForbiddenException(message="Access denied to this experiment", code="NOT_OWNER")
        
    repository.delete_experiment(conn, id)
    return None
