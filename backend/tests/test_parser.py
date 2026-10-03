import os
import pytest
from app.services.parser import parse_mpr_file
from app.core.exceptions import ParseException

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "Fixtures")

def test_parse_real_cv_fixture():
    cv_file = os.path.join(FIXTURES_DIR, "CV", "CVs 2_5_10_20_50_100 mVs-1_PEIS_01_CVA_C08.mpr")
    assert os.path.exists(cv_file), f"Fixture not found at {cv_file}"
    
    result = parse_mpr_file(cv_file)
    assert result["technique"] == "CV"
    assert result["scan_rate_mv_s"] == 2.0
    assert len(result["segments"]) == 7 # 7 cycles
    
    first_seg = result["segments"][0]
    assert first_seg["segment_index"] == 1
    assert "potential_v" in first_seg["data"]
    assert "current_ma" in first_seg["data"]
    assert len(first_seg["data"]["potential_v"]) > 500

def test_parse_real_gcpl_fixture():
    gcpl_file = os.path.join(FIXTURES_DIR, "GCPL(GCD)", "GCPL 0p25_0p5_1_2_2p5_5_10_0p25 Ag-1_PEIS_01_GCPL_C08.mpr")
    assert os.path.exists(gcpl_file)
    
    result = parse_mpr_file(gcpl_file)
    assert result["technique"] == "GCPL"
    assert len(result["segments"]) == 12 # 12 half cycles
    
    first_seg = result["segments"][0]
    assert first_seg["segment_index"] == 0
    assert "potential_v" in first_seg["data"]
    assert "mode" in first_seg["data"]

def test_parse_real_peis_fixture():
    peis_file = os.path.join(FIXTURES_DIR, "PEIS", "CVs 2_5_10_20_50_100 mVs-1_PEIS_07_PEIS_C08.mpr")
    assert os.path.exists(peis_file)
    
    result = parse_mpr_file(peis_file)
    assert result["technique"] == "PEIS"
    assert len(result["segments"]) == 1
    
    seg = result["segments"][0]
    data = seg["data"]
    assert "frequency_hz" in data
    assert "re_z_ohm" in data
    assert "neg_im_z_ohm" in data
    assert len(data["frequency_hz"]) == 43

def test_corrupt_file_raises_parse_exception(tmp_path):
    corrupt_file = tmp_path / "corrupt.mpr"
    corrupt_file.write_bytes(b"INVALID_HEADER_GARBAGE_BINARY_CONTENT")
    
    with pytest.raises(ParseException) as exc_info:
        parse_mpr_file(str(corrupt_file))
        
    assert exc_info.value.code == "PARSE_CORRUPT_FILE"
