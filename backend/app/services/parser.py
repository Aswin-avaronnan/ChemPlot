import os
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from galvani import BioLogic

from app.core.exceptions import ParseException

TECHNIQUE_COLUMNS = {
    "PEIS": ["freq/Hz", "Re(Z)/Ohm"],
    "CV": ["cycle number", "control/V"],
    "GCPL": ["half cycle"],
    "CYCLING": ["half cycle"],
}

def detect_technique(columns: List[str], declared_technique: Optional[str] = None) -> str:
    if declared_technique and declared_technique.upper() in ["CV", "GCPL", "CYCLING", "PEIS", "SPEIS"]:
        return declared_technique.upper()
        
    cols_set = set(columns)
    
    if "freq/Hz" in cols_set and ("Re(Z)/Ohm" in cols_set or "-Im(Z)/Ohm" in cols_set):
        # Check if stepped potential (SPEIS)
        if "step" in cols_set or "<Ewe>/V" in cols_set:
            return "PEIS"
        return "PEIS"
        
    if "half cycle" in cols_set or "dq/mA.h" in cols_set:
        return "GCPL"
        
    if "cycle number" in cols_set and ("control/V" in cols_set or "Ewe/V" in cols_set):
        return "CV"
        
    # Check for unsupported techniques e.g. XRD
    if "2theta" in cols_set or "two_theta" in cols_set:
        raise ParseException(
            code="PARSE_UNSUPPORTED_TECHNIQUE",
            message="This file's technique isn't supported yet.",
            detail=f"Detected XRD diffraction columns: {list(cols_set)[:5]}. v0 supports CV, GCPL, CYCLING, PEIS, SPEIS only."
        )
        
    raise ParseException(
        code="PARSE_UNKNOWN_FORMAT",
        message="Could not recognize potentiostat data signature.",
        detail=f"Columns found: {list(cols_set)}"
    )

def downsample_series(x: List[float], y: List[float], max_pts: int = 2500) -> Tuple[List[float], List[float]]:
    """Downsample time series while preserving first, last, and trend if points exceed max_pts"""
    n = len(x)
    if n <= max_pts:
        return x, y
    step = int(math.ceil(n / max_pts))
    sampled_indices = list(range(0, n, step))
    if sampled_indices[-1] != n - 1:
        sampled_indices.append(n - 1)
    return [x[i] for i in sampled_indices], [y[i] for i in sampled_indices]

def parse_mpr_file(file_path: str, declared_technique: Optional[str] = None) -> Dict[str, Any]:
    if not os.path.exists(file_path):
        raise ParseException(
            code="PARSE_CORRUPT_FILE",
            message="Uploaded file could not be found on storage.",
            detail=file_path
        )
        
    try:
        mpr = BioLogic.MPRfile(file_path)
    except Exception as e:
        # Read first 200 bytes for debugging/audit log as per §8.2
        header_snippet = b""
        try:
            with open(file_path, "rb") as f:
                header_snippet = f.read(200)
        except Exception:
            pass
        header_hex = header_snippet.hex()[:100]
        raise ParseException(
            code="PARSE_CORRUPT_FILE",
            message="Failed to parse Bio-Logic MPR binary file.",
            detail=f"Error: {str(e)}. Header snippet: {header_hex}"
        )
        
    try:
        df = pd.DataFrame(mpr.data)
    except Exception as e:
        raise ParseException(
            code="PARSE_CORRUPT_FILE",
            message="Corrupted data record block in MPR file.",
            detail=str(e)
        )
        
    if df.empty:
        raise ParseException(
            code="PARSE_CORRUPT_FILE",
            message="MPR file contains no data points.",
            detail="Zero rows found."
        )
        
    technique = detect_technique(df.columns.tolist(), declared_technique)
    
    # Extract metadata
    metadata = {}
    if hasattr(mpr, "timestamp"):
        metadata["timestamp"] = str(mpr.timestamp)
    if hasattr(mpr, "startdate"):
        metadata["startdate"] = str(mpr.startdate)
    metadata["total_rows"] = len(df)
    metadata["columns"] = df.columns.tolist()
    
    segments_data: List[Dict[str, Any]] = []
    run_scan_rate: Optional[float] = None
    
    if technique == "CV":
        # Group by cycle number
        if "cycle number" in df.columns:
            cycle_col = "cycle number"
        else:
            cycle_col = None
            
        # Determine scan rate across the run
        if "time/s" in df.columns and "Ewe/V" in df.columns:
            dt = np.diff(df["time/s"].to_numpy())
            dE = np.diff(df["Ewe/V"].to_numpy())
            valid = dt > 0.001
            if np.any(valid):
                calc_rates = np.abs(dE[valid] / dt[valid]) * 1000.0 # in mV/s
                median_rate = float(np.median(calc_rates))
                # Round to standard scan rates if close (e.g. 2.0, 5.0, 10.0, 20.0, 50.0, 100.0)
                run_scan_rate = round(median_rate, 2)
                
        if cycle_col:
            unique_cycles = sorted(df[cycle_col].unique())
            for cyc in unique_cycles:
                cyc_df = df[df[cycle_col] == cyc].copy()
                if cyc_df.empty:
                    continue
                    
                time_arr = cyc_df["time/s"].tolist() if "time/s" in cyc_df.columns else []
                v_arr = cyc_df["Ewe/V"].tolist() if "Ewe/V" in cyc_df.columns else cyc_df["control/V"].tolist()
                i_arr = cyc_df["<I>/mA"].tolist() if "<I>/mA" in cyc_df.columns else []
                q_arr = cyc_df["(Q-Qo)/C"].tolist() if "(Q-Qo)/C" in cyc_df.columns else []
                
                # Clean NaNs
                v_clean = [0.0 if math.isnan(x) else float(x) for x in v_arr]
                i_clean = [0.0 if math.isnan(x) else float(x) for x in i_arr]
                t_clean = [0.0 if math.isnan(x) else float(x) for x in time_arr]
                q_clean = [0.0 if math.isnan(x) else float(x) for x in q_arr]
                
                segments_data.append({
                    "segment_index": int(cyc),
                    "scan_rate_mv_s": run_scan_rate,
                    "applied_current_a": None,
                    "data": {
                        "time_s": t_clean,
                        "potential_v": v_clean,
                        "current_ma": i_clean,
                        "charge_c": q_clean,
                    }
                })
        else:
            # Single cycle fallback
            segments_data.append({
                "segment_index": 1,
                "scan_rate_mv_s": run_scan_rate,
                "applied_current_a": None,
                "data": {
                    "time_s": df["time/s"].tolist() if "time/s" in df.columns else [],
                    "potential_v": df["Ewe/V"].tolist() if "Ewe/V" in df.columns else [],
                    "current_ma": df["<I>/mA"].tolist() if "<I>/mA" in df.columns else [],
                }
            })
            
    elif technique in ["GCPL", "CYCLING"]:
        # Group by half cycle
        half_col = "half cycle" if "half cycle" in df.columns else None
        
        # Determine applied current
        applied_i_a = None
        if "control/V/mA" in df.columns:
            non_zero_i = df["control/V/mA"][df["control/V/mA"].abs() > 1e-6]
            if not non_zero_i.empty:
                # Value is in mA, convert to A
                applied_i_a = float(non_zero_i.abs().median()) / 1000.0
                
        if half_col:
            unique_halves = sorted(df[half_col].unique())
            for h in unique_halves:
                h_df = df[df[half_col] == h].copy()
                if h_df.empty:
                    continue
                    
                time_arr = h_df["time/s"].tolist() if "time/s" in h_df.columns else []
                v_arr = h_df["Ewe/V"].tolist() if "Ewe/V" in h_df.columns else []
                i_arr = h_df["control/V/mA"].tolist() if "control/V/mA" in h_df.columns else []
                q_arr = h_df["(Q-Qo)/mA.h"].tolist() if "(Q-Qo)/mA.h" in h_df.columns else []
                q_cd = h_df["Q charge/discharge/mA.h"].tolist() if "Q charge/discharge/mA.h" in h_df.columns else []
                
                # Check direction (charge vs discharge)
                median_i = float(np.median(i_arr)) if i_arr else 0.0
                mode = "charge" if median_i > 0 else "discharge"
                
                segments_data.append({
                    "segment_index": int(h),
                    "scan_rate_mv_s": None,
                    "applied_current_a": applied_i_a,
                    "data": {
                        "mode": mode,
                        "time_s": [float(x) for x in time_arr],
                        "potential_v": [float(x) for x in v_arr],
                        "current_ma": [float(x) for x in i_arr],
                        "capacity_mah": [float(x) for x in q_arr],
                        "q_cd_mah": [float(x) for x in q_cd],
                    }
                })
        else:
            segments_data.append({
                "segment_index": 0,
                "scan_rate_mv_s": None,
                "applied_current_a": applied_i_a,
                "data": {
                    "time_s": df["time/s"].tolist() if "time/s" in df.columns else [],
                    "potential_v": df["Ewe/V"].tolist() if "Ewe/V" in df.columns else [],
                    "current_ma": df["control/V/mA"].tolist() if "control/V/mA" in df.columns else [],
                }
            })
            
    elif technique in ["PEIS", "SPEIS"]:
        # Nyquist & Bode data
        freq = df["freq/Hz"].tolist() if "freq/Hz" in df.columns else []
        re_z = df["Re(Z)/Ohm"].tolist() if "Re(Z)/Ohm" in df.columns else []
        im_z = df["-Im(Z)/Ohm"].tolist() if "-Im(Z)/Ohm" in df.columns else []
        mag_z = df["|Z|/Ohm"].tolist() if "|Z|/Ohm" in df.columns else []
        phase = df["Phase(Z)/deg"].tolist() if "Phase(Z)/deg" in df.columns else []
        ewe = df["<Ewe>/V"].tolist() if "<Ewe>/V" in df.columns else []
        
        segments_data.append({
            "segment_index": 1,
            "scan_rate_mv_s": None,
            "applied_current_a": None,
            "data": {
                "frequency_hz": [float(x) for x in freq],
                "re_z_ohm": [float(x) for x in re_z],
                "neg_im_z_ohm": [float(x) for x in im_z],
                "mag_z_ohm": [float(x) for x in mag_z],
                "phase_deg": [float(x) for x in phase],
                "ewe_v": [float(x) for x in ewe],
            }
        })

    return {
        "technique": technique,
        "scan_rate_mv_s": run_scan_rate,
        "metadata": metadata,
        "segments": segments_data
    }
