import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import Dict, Any, List, Optional

OKABE_ITO = [
    "#000000", # Black
    "#E69F00", # Orange
    "#56B4E9", # Sky Blue
    "#009E73", # Bluish Green
    "#F0E442", # Yellow
    "#0072B2", # Blue
    "#D55E00", # Vermilion
    "#CC79A7", # Reddish Purple
]

STYLE_CONFIGS = {
    "nature": {
        "font.family": "sans-serif",
        "font.size": 8,
        "axes.linewidth": 0.8,
        "lines.linewidth": 1.2,
        "xtick.direction": "in",
        "ytick.direction": "in",
        "xtick.major.size": 3,
        "ytick.major.size": 3,
    },
    "acs": {
        "font.family": "serif",
        "font.size": 9,
        "axes.linewidth": 1.0,
        "lines.linewidth": 1.5,
        "xtick.direction": "out",
        "ytick.direction": "out",
    },
    "default": {
        "font.family": "sans-serif",
        "font.size": 10,
        "axes.linewidth": 1.0,
        "lines.linewidth": 1.5,
    }
}

def render_figure(
    technique: str,
    segments: List[Dict[str, Any]],
    template: str = "nature",
    fmt: str = "png",
    mass_mg: Optional[float] = None,
    area_cm2: Optional[float] = None,
    title: Optional[str] = None
) -> io.BytesIO:
    style = STYLE_CONFIGS.get(template.lower(), STYLE_CONFIGS["default"])
    
    with plt.rc_context(style):
        fig, ax = plt.subplots(figsize=(4.5, 3.5), dpi=300)
        
        if technique == "CV":
            for idx, seg in enumerate(segments[:8]): # max 8 cycles overlay
                data = seg.get("data", {})
                v = data.get("potential_v", [])
                i_ma = data.get("current_ma", [])
                color = OKABE_ITO[idx % len(OKABE_ITO)]
                label = f"Cycle {seg.get('segment_index')}"
                if seg.get("scan_rate_mv_s"):
                    label += f" ({seg.get('scan_rate_mv_s')} mV/s)"
                    
                y_vals = i_ma
                y_label = "Current (mA)"
                if mass_mg and mass_mg > 0:
                    y_vals = [val / (mass_mg / 1000.0) for val in i_ma] # in mA/g -> A/g if /1000
                    y_vals = [val / 1000.0 for val in y_vals]
                    y_label = "Specific Current (A g⁻¹)"
                elif area_cm2 and area_cm2 > 0:
                    y_vals = [val / area_cm2 for val in i_ma]
                    y_label = "Current Density (mA cm⁻²)"
                    
                ax.plot(v, y_vals, label=label, color=color)
                
            ax.set_xlabel("Potential vs Ref (V)")
            ax.set_ylabel(y_label)
            if len(segments) > 1:
                ax.legend(frameon=False, fontsize="small")
                
        elif technique in ["GCPL", "CYCLING"]:
            for idx, seg in enumerate(segments[:10]):
                data = seg.get("data", {})
                t = data.get("time_s", [])
                v = data.get("potential_v", [])
                color = OKABE_ITO[idx % len(OKABE_ITO)]
                mode = data.get("mode", "segment")
                ax.plot(t, v, label=f"Half-cycle {seg.get('segment_index')} ({mode})", color=color)
            ax.set_xlabel("Time (s)")
            ax.set_ylabel("Potential vs Ref (V)")
            
        elif technique in ["PEIS", "SPEIS"]:
            for idx, seg in enumerate(segments[:4]):
                data = seg.get("data", {})
                re_z = data.get("re_z_ohm", [])
                neg_im = data.get("neg_im_z_ohm", [])
                color = OKABE_ITO[idx % len(OKABE_ITO)]
                ax.plot(re_z, neg_im, "o-", markersize=3, label=f"Sweep {seg.get('segment_index')}", color=color)
            ax.set_xlabel("Z' (Ω)")
            ax.set_ylabel("-Z'' (Ω)")
            ax.set_aspect("equal", adjustable="datalim")
            
        if title:
            ax.set_title(title, fontsize="medium")
            
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        fig.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format=fmt, dpi=300, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf
