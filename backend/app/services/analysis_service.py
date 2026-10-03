import numpy as np
from typing import Dict, Any, List, Optional
from scipy.integrate import trapezoid

from app.core.exceptions import AnalysisException

def compute_cv_capacitance(
    segment_data: Dict[str, List[float]],
    scan_rate_mv_s: float,
    mass_mg: Optional[float] = None,
    area_cm2: Optional[float] = None,
    active_material_pct: float = 100.0,
    convention: str = "full_window"
) -> Dict[str, Any]:
    v = np.array(segment_data.get("potential_v", []))
    i_ma = np.array(segment_data.get("current_ma", []))
    
    if len(v) < 10 or len(i_ma) < 10:
        raise AnalysisException("ANALYSIS_INSUFFICIENT_DATA", "Segment has insufficient data points for CV integration.")
        
    if not scan_rate_mv_s or scan_rate_mv_s <= 0:
        raise AnalysisException("ANALYSIS_INVALID_SCAN_RATE", "Scan rate must be positive for capacitance calculation.")
        
    i_a = i_ma / 1000.0
    scan_rate_v_s = scan_rate_mv_s / 1000.0
    
    v_max = float(np.max(v))
    v_min = float(np.min(v))
    delta_v = v_max - v_min
    
    if delta_v <= 0.001:
        raise AnalysisException("ANALYSIS_INVALID_WINDOW", "Potential window ΔV is too small.")
        
    ir_drop_v = 0.0
    if convention == "exclude_ir_drop":
        # Estimate IR drop from initial current step / turnover if present
        ir_drop_v = float(np.abs(i_a[0] - i_a[-1]) * 0.05) # conservative default
        delta_v = max(delta_v - ir_drop_v, 0.01)

    # Integrated closed loop area: ∮ I dV = ∫ I dt * (dV/dt) or using polygon/trapezoid
    # For closed loop, integral of I dt is total charge, or Area = 0.5 * |∑ (x_i * y_{i+1} - x_{i+1} * y_i)|
    # Shoelace formula for closed polygon in (V, I) plane gives integral:
    area_closed = 0.5 * np.abs(np.dot(v, np.roll(i_a, 1)) - np.dot(i_a, np.roll(v, 1)))
    
    # Capacitance C = Area / (2 * scan_rate * delta_v)
    total_capacitance_f = float(area_closed / (2.0 * scan_rate_v_s * delta_v))
    
    res: Dict[str, Any] = {
        "total_capacitance_f": total_capacitance_f,
        "delta_v": delta_v,
        "scan_rate_mv_s": scan_rate_mv_s,
        "loop_area_w": float(area_closed),
        "convention": convention,
        "ir_drop_v": ir_drop_v,
    }
    
    # Gravimetric specific capacitance:
    if mass_mg and mass_mg > 0:
        active_fraction = (active_material_pct or 100.0) / 100.0
        m_g = (mass_mg / 1000.0) * active_fraction
        res["mass_g_used"] = m_g
        res["specific_capacitance_f_g"] = float(total_capacitance_f / m_g)
    else:
        res["specific_capacitance_f_g"] = None
        
    # Areal capacitance:
    if area_cm2 and area_cm2 > 0:
        res["area_cm2_used"] = area_cm2
        res["areal_capacitance_f_cm2"] = float(total_capacitance_f / area_cm2)
        res["areal_capacitance_mf_cm2"] = float((total_capacitance_f / area_cm2) * 1000.0)
    else:
        res["areal_capacitance_f_cm2"] = None
        
    return res

def compute_gcd_capacitance(
    segment_data: Dict[str, List[float]],
    applied_current_a: Optional[float] = None,
    mass_mg: Optional[float] = None,
    area_cm2: Optional[float] = None,
    active_material_pct: float = 100.0,
    convention: str = "nominal_window"
) -> Dict[str, Any]:
    t = np.array(segment_data.get("time_s", []))
    v = np.array(segment_data.get("potential_v", []))
    i_ma = np.array(segment_data.get("current_ma", []))
    
    if len(t) < 5 or len(v) < 5:
        raise AnalysisException("ANALYSIS_INSUFFICIENT_DATA", "Segment has insufficient data points for GCD analysis.")
        
    # Determine discharge current
    i_val = applied_current_a
    if i_val is None or i_val <= 0:
        if len(i_ma) > 0:
            median_ma = float(np.median(np.abs(i_ma)))
            i_val = median_ma / 1000.0
            
    if not i_val or i_val <= 0:
        raise AnalysisException("ANALYSIS_MISSING_CURRENT", "Applied discharge current is required.")

    # Calculate discharge duration
    delta_t = float(t[-1] - t[0]) if len(t) > 1 else 0.0
    if delta_t <= 0:
        delta_t = float(len(t)) # fallback if time is normalized
        
    v_start = float(v[0])
    v_end = float(v[-1])
    nominal_delta_v = float(abs(v_start - v_end))
    
    # Calculate IR drop at the onset of discharge
    ir_drop_v = 0.0
    if len(v) > 2:
        ir_drop_v = float(abs(v[0] - v[1]))
        
    effective_delta_v = nominal_delta_v
    if convention == "exclude_ir_drop":
        effective_delta_v = max(nominal_delta_v - ir_drop_v, 0.01)
        
    # C = I * Δt / ΔV
    capacitance_f = float((i_val * delta_t) / effective_delta_v)
    # ESR = IR_drop / (2 * I)
    esr_ohm = float(ir_drop_v / (2.0 * i_val)) if i_val > 0 else 0.0
    
    res: Dict[str, Any] = {
        "capacitance_f": capacitance_f,
        "discharge_time_s": delta_t,
        "delta_v": effective_delta_v,
        "nominal_delta_v": nominal_delta_v,
        "ir_drop_v": ir_drop_v,
        "esr_ohm": esr_ohm,
        "applied_current_a": i_val,
        "convention": convention,
    }
    
    if mass_mg and mass_mg > 0:
        active_fraction = (active_material_pct or 100.0) / 100.0
        m_g = (mass_mg / 1000.0) * active_fraction
        res["mass_g_used"] = m_g
        res["specific_capacitance_f_g"] = float(capacitance_f / m_g)
        # Specific capacity: Q = I * Δt / (3600 * m_g) in mAh/g
        res["specific_capacity_mah_g"] = float((i_val * delta_t * 1000.0) / (3600.0 * m_g))
        res["specific_capacity_c_g"] = float((i_val * delta_t) / m_g)
    else:
        res["specific_capacitance_f_g"] = None
        res["specific_capacity_mah_g"] = None
        
    if area_cm2 and area_cm2 > 0:
        res["area_cm2_used"] = area_cm2
        res["areal_capacitance_f_cm2"] = float(capacitance_f / area_cm2)
        res["areal_capacitance_mf_cm2"] = float((capacitance_f / area_cm2) * 1000.0)
    else:
        res["areal_capacitance_f_cm2"] = None
        
    return res

def compute_coulombic_efficiency(
    charge_segment: Dict[str, List[float]],
    discharge_segment: Dict[str, List[float]]
) -> Dict[str, Any]:
    # Extract capacity or calculate ∫ I dt
    q_charge = None
    q_discharge = None
    
    if "q_cd_mah" in charge_segment and len(charge_segment["q_cd_mah"]) > 0:
        q_charge = abs(charge_segment["q_cd_mah"][-1] - charge_segment["q_cd_mah"][0])
    elif "capacity_mah" in charge_segment and len(charge_segment["capacity_mah"]) > 0:
        q_charge = abs(charge_segment["capacity_mah"][-1] - charge_segment["capacity_mah"][0])
        
    if "q_cd_mah" in discharge_segment and len(discharge_segment["q_cd_mah"]) > 0:
        q_discharge = abs(discharge_segment["q_cd_mah"][-1] - discharge_segment["q_cd_mah"][0])
    elif "capacity_mah" in discharge_segment and len(discharge_segment["capacity_mah"]) > 0:
        q_discharge = abs(discharge_segment["capacity_mah"][-1] - discharge_segment["capacity_mah"][0])
        
    if q_charge is None or q_discharge is None or q_charge <= 0:
        # Calculate from current * time
        t_ch = np.array(charge_segment.get("time_s", [0, 1]))
        i_ch = np.array(charge_segment.get("current_ma", [1, 1]))
        t_dis = np.array(discharge_segment.get("time_s", [0, 1]))
        i_dis = np.array(discharge_segment.get("current_ma", [1, 1]))
        
        q_charge = float(np.abs(np.mean(i_ch)) * (t_ch[-1] - t_ch[0]) / 3600.0)
        q_discharge = float(np.abs(np.mean(i_dis)) * (t_dis[-1] - t_dis[0]) / 3600.0)
        
    eta_pct = float((q_discharge / q_charge) * 100.0) if q_charge > 0 else 0.0
    
    return {
        "charge_capacity_mah": float(q_charge),
        "discharge_capacity_mah": float(q_discharge),
        "coulombic_efficiency_pct": round(eta_pct, 2)
    }

def compute_peis_metrics(
    segment_data: Dict[str, List[float]],
    area_cm2: Optional[float] = None
) -> Dict[str, Any]:
    freq = np.array(segment_data.get("frequency_hz", []))
    re_z = np.array(segment_data.get("re_z_ohm", []))
    neg_im_z = np.array(segment_data.get("neg_im_z_ohm", []))
    
    if len(re_z) < 3:
        raise AnalysisException("ANALYSIS_INSUFFICIENT_DATA", "Insufficient EIS frequency data points.")
        
    # High frequency is at the start (100kHz down to 0.01Hz)
    # Series resistance Rs is the real intercept at high frequency
    # We find the min Re(Z) at high frequencies
    high_f_mask = freq >= 1000.0 if np.any(freq >= 1000.0) else np.ones(len(freq), dtype=bool)
    rs_ohm = float(np.min(re_z[high_f_mask]))
    
    # Charge transfer resistance Rct: diameter of high-frequency semicircle
    # Local peak in -Im(Z)
    rct_est = None
    if len(neg_im_z) > 5:
        peak_idx = int(np.argmax(neg_im_z[:len(neg_im_z)//2]))
        peak_f = float(freq[peak_idx])
        peak_im = float(neg_im_z[peak_idx])
        # Approx semicircle diameter: 2 * peak_im
        rct_est = float(2.0 * peak_im)
    else:
        peak_f = float(freq[0])
        peak_im = float(neg_im_z[0])
        
    res: Dict[str, Any] = {
        "series_resistance_rs_ohm": round(rs_ohm, 3),
        "estimated_rct_ohm": round(rct_est, 3) if rct_est else None,
        "peak_frequency_hz": round(peak_f, 2),
        "max_neg_im_z_ohm": round(peak_im, 3),
        "frequency_min_hz": float(np.min(freq)),
        "frequency_max_hz": float(np.max(freq)),
    }
    
    if area_cm2 and area_cm2 > 0:
        res["rs_area_normalized_ohm_cm2"] = round(rs_ohm * area_cm2, 3)
        if rct_est:
            res["rct_area_normalized_ohm_cm2"] = round(rct_est * area_cm2, 3)
            
    return res
