import os
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "Fixtures")

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_experiment_crud_flow():
    # 1. Create experiment with researcher parameters
    payload = {
        "name": "Cobalt Oxide Supercapacitor",
        "sample_label": "CoO-400C",
        "notes": "Tested in 1M KOH",
        "mass_mg": 1.45,
        "area_cm2": 1.0,
        "active_material_pct": 80.0,
        "reference_electrode": "Ag/AgCl (3M KCl)",
        "electrolyte": "1M KOH"
    }
    create_res = client.post("/api/v1/experiments", json=payload)
    assert create_res.status_code == 201
    exp_data = create_res.json()
    assert exp_data["name"] == payload["name"]
    assert exp_data["mass_mg"] == 1.45
    exp_id = exp_data["id"]
    
    # 2. Get experiment
    get_res = client.get(f"/api/v1/experiments/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["sample_label"] == "CoO-400C"
    
    # 3. Update experiment parameters (e.g. update mass after precision weighing)
    patch_res = client.patch(f"/api/v1/experiments/{exp_id}", json={"mass_mg": 1.50})
    assert patch_res.status_code == 200
    assert patch_res.json()["mass_mg"] == 1.50
    
    # 4. Upload real CV .mpr fixture
    cv_fixture = os.path.join(FIXTURES_DIR, "CV", "CVs 2_5_10_20_50_100 mVs-1_PEIS_01_CVA_C08.mpr")
    with open(cv_fixture, "rb") as f:
        file_bytes = f.read()
        
    upload_res = client.post(
        f"/api/v1/experiments/{exp_id}/runs",
        files=[("files", ("01_CVA.mpr", io.BytesIO(file_bytes), "application/octet-stream"))]
    )
    assert upload_res.status_code == 202
    runs_res = upload_res.json()
    assert len(runs_res) == 1
    run_id = runs_res[0]["run_id"]
    
    # 5. Get run details
    run_detail = client.get(f"/api/v1/runs/{run_id}")
    assert run_detail.status_code == 200
    # In TestClient, background task executed synchronously
    assert run_detail.json()["parse_status"] == "parsed"
    assert run_detail.json()["technique"] == "CV"
    
    # 6. Get segments
    seg_res = client.get(f"/api/v1/runs/{run_id}/segments")
    assert seg_res.status_code == 200
    assert seg_res.json()["total_segments"] == 7
    
    # 7. Run capacitance analysis
    analysis_res = client.post(
        f"/api/v1/runs/{run_id}/analyses",
        json={
            "analysis_type": "cv_capacitance",
            "convention": "full_window"
        }
    )
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    assert "result" in analysis_data
    assert "total_capacitance_f" in analysis_data["result"]
    assert "specific_capacitance_f_g" in analysis_data["result"]
    
    # 8. Export figure
    export_res = client.get(f"/api/v1/runs/{run_id}/export?format=png&template=nature")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "image/png"
    assert len(export_res.content) > 1000
    
    # 9. Test overlay endpoint
    overlay_res = client.get(f"/api/v1/experiments/{exp_id}/overlay")
    assert overlay_res.status_code == 200
    overlay_data = overlay_res.json()
    assert overlay_data["experiment_id"] == exp_id
    assert len(overlay_data["runs"]) >= 1

    # 10. Test error taxonomy for non-existent resource
    err_res = client.get("/api/v1/runs/non-existent-uuid")
    assert err_res.status_code == 404
    err_json = err_res.json()
    assert "error" in err_json
    assert err_json["error"]["code"] == "RUN_NOT_FOUND"
    assert "request_id" in err_json

def test_gcpl_api_flow():
    # 1. Create experiment
    exp_res = client.post("/api/v1/experiments", json={
        "name": "MXene Battery GCD",
        "sample_label": "Ti3C2Tx-1",
        "mass_mg": 2.10,
        "area_cm2": 1.2,
    })
    assert exp_res.status_code == 201
    exp_id = exp_res.json()["id"]

    # 2. Upload GCPL fixture
    gcpl_fixture = os.path.join(FIXTURES_DIR, "GCPL(GCD)", "GCPL 0p25_0p5_1_2_2p5_5_10_0p25 Ag-1_PEIS_01_GCPL_C08.mpr")
    with open(gcpl_fixture, "rb") as f:
        file_bytes = f.read()

    upload_res = client.post(
        f"/api/v1/experiments/{exp_id}/runs",
        files=[("files", ("01_GCPL.mpr", io.BytesIO(file_bytes), "application/octet-stream"))]
    )
    assert upload_res.status_code == 202
    run_id = upload_res.json()[0]["run_id"]

    # 3. Check parsed run
    run_detail = client.get(f"/api/v1/runs/{run_id}")
    assert run_detail.status_code == 200
    assert run_detail.json()["parse_status"] == "parsed"
    assert run_detail.json()["technique"] == "GCPL"

    # 4. Check segments
    seg_res = client.get(f"/api/v1/runs/{run_id}/segments")
    assert seg_res.status_code == 200
    assert seg_res.json()["total_segments"] == 12

    # 5. Run GCD capacitance analysis (nominal window)
    an_res = client.post(
        f"/api/v1/runs/{run_id}/analyses",
        json={"analysis_type": "gcd_specific_capacitance", "convention": "nominal_window"}
    )
    assert an_res.status_code == 200
    res = an_res.json()["result"]
    assert "capacitance_f" in res
    assert "specific_capacitance_f_g" in res
    assert "specific_capacity_mah_g" in res

    # 6. Run GCD capacitance analysis (exclude IR drop convention)
    an_ir_res = client.post(
        f"/api/v1/runs/{run_id}/analyses",
        json={"analysis_type": "gcd_specific_capacitance", "convention": "exclude_ir_drop"}
    )
    assert an_ir_res.status_code == 200

    # 7. Run Coulombic efficiency analysis
    ce_res = client.post(
        f"/api/v1/runs/{run_id}/analyses",
        json={"analysis_type": "coulombic_efficiency", "convention": "per_cycle"}
    )
    assert ce_res.status_code == 200
    assert "coulombic_efficiency_pct" in ce_res.json()["result"]

    # 8. Export figures in SVG and PDF formats
    svg_res = client.get(f"/api/v1/runs/{run_id}/export?format=svg&template=acs")
    assert svg_res.status_code == 200
    assert svg_res.headers["content-type"] == "image/svg+xml"

    pdf_res = client.get(f"/api/v1/runs/{run_id}/export?format=pdf&template=default")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"

def test_peis_api_flow():
    # 1. Create experiment
    exp_res = client.post("/api/v1/experiments", json={
        "name": "Impedance Study",
        "sample_label": "EIS-Electrode",
        "area_cm2": 1.0,
    })
    assert exp_res.status_code == 201
    exp_id = exp_res.json()["id"]

    # 2. Upload PEIS fixture
    peis_fixture = os.path.join(FIXTURES_DIR, "PEIS", "CVs 2_5_10_20_50_100 mVs-1_PEIS_07_PEIS_C08.mpr")
    with open(peis_fixture, "rb") as f:
        file_bytes = f.read()

    upload_res = client.post(
        f"/api/v1/experiments/{exp_id}/runs",
        files=[("files", ("07_PEIS.mpr", io.BytesIO(file_bytes), "application/octet-stream"))]
    )
    assert upload_res.status_code == 202
    run_id = upload_res.json()[0]["run_id"]

    # 3. Check parsed run
    run_detail = client.get(f"/api/v1/runs/{run_id}")
    assert run_detail.status_code == 200
    assert run_detail.json()["parse_status"] == "parsed"
    assert run_detail.json()["technique"] == "PEIS"

    # 4. Check segments
    seg_res = client.get(f"/api/v1/runs/{run_id}/segments")
    assert seg_res.status_code == 200
    assert seg_res.json()["total_segments"] == 1

    # 5. Run PEIS Rs extraction
    an_res = client.post(
        f"/api/v1/runs/{run_id}/analyses",
        json={"analysis_type": "peis_rs", "convention": "real_intercept"}
    )
    assert an_res.status_code == 200
    res = an_res.json()["result"]
    assert "series_resistance_rs_ohm" in res
    assert res["series_resistance_rs_ohm"] > 0
    assert "rs_area_normalized_ohm_cm2" in res

    # 6. Export Nyquist plot as PNG
    export_res = client.get(f"/api/v1/runs/{run_id}/export?format=png&template=nature")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "image/png"

