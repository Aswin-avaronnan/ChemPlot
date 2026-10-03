from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AnalysisCreate(BaseModel):
    analysis_type: str = Field(..., description="e.g. cv_capacitance, gcd_specific_capacitance, coulombic_efficiency, peis_rs")
    convention: str = Field("full_window", description="Formula convention: full_window, exclude_ir_drop, etc.")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="e.g. mass_mg, area_cm2, cycle_index, ir_drop_v")

class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    technique_run_id: str
    analysis_type: str
    convention: str
    result: Dict[str, Any]
    computed_at: datetime

class AnalysisListResponse(BaseModel):
    technique_run_id: str
    analyses: List[AnalysisResponse]
