from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ExperimentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sample_label: Optional[str] = None
    notes: Optional[str] = None
    
    # Electrochemistry sample & cell parameters:
    mass_mg: Optional[float] = Field(None, ge=0, description="Active material mass in mg")
    area_cm2: Optional[float] = Field(None, ge=0, description="Electrode geometric area in cm²")
    active_material_pct: Optional[float] = Field(100.0, ge=0, le=100.0, description="Percentage of active material in electrode film (0-100%)")
    reference_electrode: Optional[str] = Field("Ag/AgCl (3M KCl)", description="Reference electrode type")
    electrolyte: Optional[str] = Field("1M KOH", description="Electrolyte solution")

class ExperimentCreate(ExperimentBase):
    pass

class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    sample_label: Optional[str] = None
    notes: Optional[str] = None
    mass_mg: Optional[float] = None
    area_cm2: Optional[float] = None
    active_material_pct: Optional[float] = None
    reference_electrode: Optional[str] = None
    electrolyte: Optional[str] = None

class TechniqueRunSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    technique: str
    original_filename: str
    parse_status: str
    scan_rate_mv_s: Optional[float] = None
    created_at: datetime

class ExperimentResponse(ExperimentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    technique_runs: List[TechniqueRunSummary] = []

class ExperimentListResponse(BaseModel):
    experiments: List[ExperimentResponse]
    total: int
