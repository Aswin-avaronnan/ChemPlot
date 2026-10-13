import os
import pytest
from app.services.parser import parse_mpr_file, detect_technique, downsample_series
from app.core.exceptions import ParseException

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "Fixtures")
CV_FIXTURE = os.path.join(FIXTURES_DIR, "CV", "CVs 2_5_10_20_50_100 mVs-1_PEIS_01_CVA_C08.mpr")
GCPL_FIXTURE = os.path.join(FIXTURES_DIR, "GCPL(GCD)", "GCPL 0p25_0p5_1_2_2p5_5_10_0p25 Ag-1_PEIS_01_GCPL_C08.mpr")
PEIS_FIXTURE = os.path.join(FIXTURES_DIR, "PEIS", "CVs 2_5_10_20_50_100 mVs-1_PEIS_07_PEIS_C08.mpr")

# Unit tests that always run in CI without binary fixtures
def test_detect_technique_signatures():
    assert detect_technique(["time/s", "control/V", "cycle number", "<I>/mA"]) == "CV"
    assert detect_technique(["time/s", "half cycle", "control/V/mA"]) == "GCPL"
    assert detect_technique(["freq/Hz", "Re(Z)/Ohm", "-Im(Z)/Ohm"]) == "PEIS"

def test_detect_technique_unsupported_raises():
    with pytest.raises(ParseException) as exc:
        detect_technique(["2theta", "intensity"])
    assert exc.value.code == "PARSE_UNSUPPORTED_TECHNIQUE"

def test_downsample_series():
    x = list(range(10000))
    y = [float(i) for i in x]
    x_sub, y_sub = downsample_series(x, y, max_pts=2000)
    assert len(x_sub) <= 2005
    assert x_sub[0] == 0
    assert x_sub[-1] == 9999

def test_corrupt_file_raises_parse_exception(tmp_path):
    corrupt_file = tmp_path / "corrupt.mpr"
    corrupt_file.write_bytes(b"INVALID_HEADER_GARBAGE_BINARY_CONTENT")
    
    with pytest.raises(ParseException) as exc_info:
        parse_mpr_file(str(corrupt_file))
        
    assert exc_info.value.code == "PARSE_CORRUPT_FILE"

# Real binary fixture tests (run locally when private Fixtures/ directory is present)
@pytest.mark.skipif(not os.path.exists(CV_FIXTURE), reason="Binary .mpr fixture kept local/private")
def test_parse_real_cv_fixture():
    result = parse_mpr_file(CV_FIXTURE)
    assert result["technique"] == "CV"
    assert result["scan_rate_mv_s"] == 2.0
    assert len(result["segments"]) == 7 # 7 cycles
    
    first_seg = result["segments"][0]
    assert first_seg["segment_index"] == 1
    assert "potential_v" in first_seg["data"]
    assert "current_ma" in first_seg["data"]
    assert len(first_seg["data"]["potential_v"]) > 500

@pytest.mark.skipif(not os.path.exists(GCPL_FIXTURE), reason="Binary .mpr fixture kept local/private")
def test_parse_real_gcpl_fixture():
    result = parse_mpr_file(GCPL_FIXTURE)
    assert result["technique"] == "GCPL"
    assert len(result["segments"]) == 12 # 12 half cycles
    
    first_seg = result["segments"][0]
    assert first_seg["segment_index"] == 0
    assert "potential_v" in first_seg["data"]
    assert "mode" in first_seg["data"]

@pytest.mark.skipif(not os.path.exists(PEIS_FIXTURE), reason="Binary .mpr fixture kept local/private")
def test_parse_real_peis_fixture():
    result = parse_mpr_file(PEIS_FIXTURE)
    assert result["technique"] == "PEIS"
    assert len(result["segments"]) == 1
    
    seg = result["segments"][0]
    data = seg["data"]
    assert "frequency_hz" in data
    assert "re_z_ohm" in data
    assert "neg_im_z_ohm" in data
    assert len(data["frequency_hz"]) == 43
