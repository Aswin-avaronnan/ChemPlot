from typing import Optional, Dict, List, Any
from pydantic import BaseModel, ConfigDict

class SegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    technique_run_id: str
    segment_index: int
    scan_rate_mv_s: Optional[float] = None
    applied_current_a: Optional[float] = None
    data: Dict[str, Any] # Columnar arrays and segment metadata like mode

class SegmentListResponse(BaseModel):
    technique_run_id: str
    technique: str
    total_segments: int
    segments: List[SegmentResponse]
