from fastapi import APIRouter
from app.api.v1.endpoints import experiments, runs, analyses, export, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(experiments.router, prefix="/experiments", tags=["Experiments"])
api_router.include_router(runs.router, tags=["Technique Runs & Segments"])
api_router.include_router(analyses.router, tags=["Analyses"])
api_router.include_router(export.router, tags=["Export"])
