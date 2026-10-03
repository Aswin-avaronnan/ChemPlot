import pytest
import numpy as np
from app.services.analysis_service import (
    compute_cv_capacitance,
    compute_gcd_capacitance,
    compute_coulombic_efficiency,
    compute_peis_metrics,
)

def test_compute_cv_capacitance():
    # Synthetic ideal capacitor CV: rectangular loop with current +/- 1 mA, window 0 to 1 V, 10 mV/s
    # Charge Q = C * V -> I = C * (dV/dt) -> C = I / (scan_rate) = 1e-3 / 0.010 = 0.1 F
    n_pts = 100
    v_forward = np.linspace(0.0, 1.0, n_pts).tolist()
    v_backward = np.linspace(1.0, 0.0, n_pts).tolist()
    i_forward = [1.0] * n_pts # 1 mA
    i_backward = [-1.0] * n_pts # -1 mA
    
    seg_data = {
        "potential_v": v_forward + v_backward,
        "current_ma": i_forward + i_backward,
    }
    
    # Mass = 2.0 mg -> 0.002 g
    res = compute_cv_capacitance(
        segment_data=seg_data,
        scan_rate_mv_s=10.0,
        mass_mg=2.0,
        area_cm2=1.0,
        convention="full_window"
    )
    
    assert "total_capacitance_f" in res
    assert pytest.approx(res["total_capacitance_f"], rel=0.05) == 0.1
    # Specific capacitance: 0.1 F / 0.002 g = 50 F/g
    assert pytest.approx(res["specific_capacitance_f_g"], rel=0.05) == 50.0
    # Areal capacitance: 0.1 F / 1.0 cm² = 0.1 F/cm² = 100 mF/cm²
    assert pytest.approx(res["areal_capacitance_mf_cm2"], rel=0.05) == 100.0

def test_compute_gcd_capacitance():
    # Ideal discharge curve: linear decrease from 1.0V to 0.0V in 100s at 1 mA (0.001 A)
    # C = I * Δt / ΔV = 0.001 * 100 / 1.0 = 0.1 F
    # Mass = 1.0 mg = 0.001 g -> Cs = 0.1 / 0.001 = 100 F/g
    t = np.linspace(0, 100, 100).tolist()
    v = np.linspace(1.0, 0.0, 100).tolist()
    i = [-1.0] * 100
    
    seg_data = {
        "time_s": t,
        "potential_v": v,
        "current_ma": i,
    }
    
    res = compute_gcd_capacitance(
        segment_data=seg_data,
        applied_current_a=0.001,
        mass_mg=1.0,
        area_cm2=1.0,
        convention="nominal_window"
    )
    
    assert pytest.approx(res["capacitance_f"], rel=0.01) == 0.1
    assert pytest.approx(res["specific_capacitance_f_g"], rel=0.01) == 100.0
    assert "specific_capacity_mah_g" in res

def test_compute_coulombic_efficiency():
    ch_data = {"q_cd_mah": [0.0, 5.0]}
    dis_data = {"q_cd_mah": [0.0, 4.8]}
    
    res = compute_coulombic_efficiency(ch_data, dis_data)
    assert res["coulombic_efficiency_pct"] == 96.0

def test_compute_peis_metrics():
    freq = [100000, 50000, 10000, 1000, 100, 10, 1]
    re_z = [13.2, 13.5, 14.0, 18.0, 25.0, 30.0, 35.0]
    im_z = [0.2, 1.0, 3.5, 4.0, 2.0, 1.0, 0.5]
    
    seg_data = {
        "frequency_hz": freq,
        "re_z_ohm": re_z,
        "neg_im_z_ohm": im_z
    }
    
    res = compute_peis_metrics(seg_data, area_cm2=1.5)
    assert res["series_resistance_rs_ohm"] == 13.2
    assert pytest.approx(res["rs_area_normalized_ohm_cm2"], rel=0.01) == 13.2 * 1.5
