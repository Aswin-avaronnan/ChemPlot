from typing import Optional
from pydantic import BaseModel, Field

class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: Optional[str] = None
    retryable: bool = False

class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: Optional[str] = None
