from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class RunUpdate(BaseModel):
    mass_mg_override: Optional[float] = None
    area_cm2_override: Optional[float] = None
    scan_rate_mv_s: Optional[float] = None

class RunStatusResponse(BaseModel):
    run_id: str
    parse_status: str # pending, parsing, parsed, failed
    parse_error_code: Optional[str] = None
    technique: Optional[str] = None
    original_filename: str

class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    experiment_id: str
    technique: str
    original_filename: str
    raw_file_key: str
    parse_status: str
    parse_error_code: Optional[str] = None
    instrument_metadata: Optional[Dict[str, Any]] = None
    scan_rate_mv_s: Optional[float] = None
    mass_mg_override: Optional[float] = None
    area_cm2_override: Optional[float] = None
    created_at: datetime
