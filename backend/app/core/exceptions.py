from fastapi import HTTPException
from typing import Optional

class ChemPlotException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        detail: Optional[str] = None,
        retryable: bool = False,
    ):
        self.code = code
        self.message = message
        self.detail_str = detail
        self.retryable = retryable
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "detail": detail,
                "retryable": retryable,
            }
        )

class ValidationException(ChemPlotException):
    def __init__(self, message: str, detail: Optional[str] = None, code: str = "VALIDATION_ERROR"):
        super().__init__(status_code=400, code=code, message=message, detail=detail, retryable=False)

class AuthException(ChemPlotException):
    def __init__(self, message: str, detail: Optional[str] = None, code: str = "TOKEN_INVALID"):
        super().__init__(status_code=401, code=code, message=message, detail=detail, retryable=False)

class ForbiddenException(ChemPlotException):
    def __init__(self, message: str, detail: Optional[str] = None, code: str = "NOT_OWNER"):
        super().__init__(status_code=403, code=code, message=message, detail=detail, retryable=False)

class NotFoundException(ChemPlotException):
    def __init__(self, message: str, detail: Optional[str] = None, code: str = "NOT_FOUND"):
        super().__init__(status_code=404, code=code, message=message, detail=detail, retryable=False)

class ParseException(ChemPlotException):
    def __init__(self, code: str, message: str, detail: Optional[str] = None):
        super().__init__(status_code=422, code=code, message=message, detail=detail, retryable=False)

class AnalysisException(ChemPlotException):
    def __init__(self, code: str, message: str, detail: Optional[str] = None):
        super().__init__(status_code=422, code=code, message=message, detail=detail, retryable=False)

class ConflictException(ChemPlotException):
    def __init__(self, message: str, detail: Optional[str] = None, code: str = "DUPLICATE_FILE_HASH"):
        super().__init__(status_code=409, code=code, message=message, detail=detail, retryable=False)
