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

ACS_JEWEL = [
    "#1F4E79", # Navy
    "#C00000", # Crimson
    "#ED7D31", # Amber / Orange
    "#7030A0", # Purple
    "#00B050", # Emerald
    "#00A896", # Teal Cyan
    "#800000", # Maroon
    "#FFC000", # Rich Gold
]

NATURE_PALETTE = [
    "#0072B2", # Deep Blue
    "#D55E00", # Vermilion
    "#009E73", # Sage Green
    "#CC79A7", # Rose
    "#E69F00", # Gold
    "#56B4E9", # Sky Blue
]

STYLE_CONFIGS = {
    "acs": {
        "font.family": "sans-serif",
        "font.size": 9,
        "axes.linewidth": 1.8,
        "lines.linewidth": 2.2,
        "xtick.direction": "in",
        "ytick.direction": "in",
        "xtick.major.size": 5,
        "ytick.major.size": 5,
        "xtick.top": False,
        "ytick.right": False,
    },
    "nature": {
        "font.family": "sans-serif",
        "font.size": 8.5,
        "axes.linewidth": 1.2,
        "lines.linewidth": 2.0,
        "xtick.direction": "in",
        "ytick.direction": "in",
        "xtick.major.size": 4,
        "ytick.major.size": 4,
        "xtick.top": False,
        "ytick.right": False,
    },
    "default": {
        "font.family": "sans-serif",
        "font.size": 9.5,
        "axes.linewidth": 1.4,
        "lines.linewidth": 1.8,
        "xtick.direction": "in",
        "ytick.direction": "in",
        "xtick.major.size": 4,
        "ytick.major.size": 4,
        "xtick.top": False,
        "ytick.right": False,
    }
}

def render_figure(
    technique: str,
    segments: List[Dict[str, Any]],
    template: str = "acs",
    fmt: str = "png",
    mass_mg: Optional[float] = None,
    area_cm2: Optional[float] = None,
    title: Optional[str] = None,
    custom_x_label: Optional[str] = None,
    custom_y_label: Optional[str] = None,
    x_min: Optional[float] = None,
    x_max: Optional[float] = None,
    y_min: Optional[float] = None,
    y_max: Optional[float] = None,
    stroke_width: Optional[float] = None,
    axis_linewidth: Optional[float] = None,
    palette_name: Optional[str] = None,
    annotations: Optional[List[Dict[str, Any]]] = None,
) -> io.BytesIO:
    template_key = template.lower() if template else "acs"
    style = STYLE_CONFIGS.get(template_key, STYLE_CONFIGS["acs"]).copy()
    
    if axis_linewidth and axis_linewidth > 0:
        style["axes.linewidth"] = axis_linewidth
    if stroke_width and stroke_width > 0:
        style["lines.linewidth"] = stroke_width

    # Select color palette
    if palette_name == "okabe-ito":
        palette = OKABE_ITO
    elif palette_name == "nature":
        palette = NATURE_PALETTE
    else:
        palette = ACS_JEWEL if template_key == "acs" else OKABE_ITO

    with plt.rc_context(style):
        figsize = (4.5, 3.8) if template_key == "acs" else (4.2, 4.2)
        fig, ax = plt.subplots(figsize=figsize, dpi=300)
        
        lw = style.get("lines.linewidth", 2.2)
        
        if technique == "CV":
            for idx, seg in enumerate(segments[:8]): # max 8 cycles overlay
                data = seg.get("data", {})
                v = data.get("potential_v", [])
                i_ma = data.get("current_ma", [])
                color = palette[idx % len(palette)]
                label = f"Cycle {seg.get('segment_index')}"
                if seg.get("scan_rate_mv_s"):
                    label += f" ({seg.get('scan_rate_mv_s')} mV/s)"
                    
                y_vals = i_ma
                y_label = "Current (mA)"
                if mass_mg and mass_mg > 0:
                    y_vals = [val / (mass_mg / 1000.0) for val in i_ma]
                    y_vals = [val / 1000.0 for val in y_vals]
                    y_label = "Current density (A g⁻¹)"
                elif area_cm2 and area_cm2 > 0:
                    y_vals = [val / area_cm2 for val in i_ma]
                    y_label = "Current density (mA cm⁻²)"
                    
                ax.plot(v, y_vals, label=label, color=color, linewidth=lw)
                
            ax.set_xlabel(custom_x_label or "Potential (V vs Ref)", fontweight="bold")
            ax.set_ylabel(custom_y_label or y_label, fontweight="bold")
            if len(segments) > 1:
                ax.legend(frameon=False, fontsize="small", loc="upper right")
                
        elif technique in ["GCPL", "CYCLING"]:
            for idx, seg in enumerate(segments[:10]):
                data = seg.get("data", {})
                t = data.get("time_s", [])
                v = data.get("potential_v", [])
                color = palette[idx % len(palette)]
                mode = data.get("mode", "segment")
                ax.plot(t, v, label=f"Half-cycle {seg.get('segment_index')} ({mode})", color=color, linewidth=lw)
            ax.set_xlabel(custom_x_label or "Time (s)", fontweight="bold")
            ax.set_ylabel(custom_y_label or "Potential (V vs Ref)", fontweight="bold")
            if len(segments) > 1:
                ax.legend(frameon=False, fontsize="small", loc="upper right")
            
        elif technique in ["PEIS", "SPEIS"]:
            for idx, seg in enumerate(segments[:4]):
                data = seg.get("data", {})
                re_z = data.get("re_z_ohm", [])
                neg_im = data.get("neg_im_z_ohm", [])
                color = palette[idx % len(palette)]
                ax.plot(re_z, neg_im, "o-", markersize=4, label=f"Sweep {seg.get('segment_index')}", color=color, linewidth=lw)
            ax.set_xlabel(custom_x_label or "Z' (Ω)", fontweight="bold")
            ax.set_ylabel(custom_y_label or "-Z'' (Ω)", fontweight="bold")
            ax.set_aspect("equal", adjustable="datalim")
            if len(segments) > 1:
                ax.legend(frameon=False, fontsize="small", loc="upper right")
            
        if title:
            ax.set_title(title, fontsize="medium", fontweight="bold", pad=10)

        # Axis limits if provided
        if x_min is not None and x_max is not None and x_min < x_max:
            ax.set_xlim(x_min, x_max)
        if y_min is not None and y_max is not None and y_min < y_max:
            ax.set_ylim(y_min, y_max)
            
        # In-plot annotations (e.g. "5 mV s⁻¹", "0.25 A g⁻¹")
        if annotations:
            for ann in annotations:
                text = ann.get("text", "")
                pos = ann.get("position", "bottom-right")
                if not text:
                    continue
                if pos == "bottom-right":
                    ax.text(0.95, 0.06, text, transform=ax.transAxes, ha="right", va="bottom", fontweight="bold", fontsize=10)
                elif pos == "top-left":
                    ax.text(0.05, 0.94, text, transform=ax.transAxes, ha="left", va="top", fontweight="bold", fontsize=10)
                elif pos == "top-right":
                    ax.text(0.95, 0.94, text, transform=ax.transAxes, ha="right", va="top", fontweight="bold", fontsize=10)
                elif pos == "bottom-left":
                    ax.text(0.05, 0.06, text, transform=ax.transAxes, ha="left", va="bottom", fontweight="bold", fontsize=10)
                elif pos == "top-center":
                    ax.text(0.5, 0.94, text, transform=ax.transAxes, ha="center", va="top", fontweight="bold", fontsize=10)

        # Enforce Journal Boxed Frame (Matching Reference.png):
        # 1. Solid spines on ALL 4 sides (top, right, bottom, left)
        # 2. Ticks on LEFT and BOTTOM ONLY (no ticks on top and right!)
        ax_lw = style.get("axes.linewidth", 1.8)
        for spine_name in ["top", "right", "bottom", "left"]:
            ax.spines[spine_name].set_visible(True)
            ax.spines[spine_name].set_linewidth(ax_lw)
            ax.spines[spine_name].set_color("#000000")
            
        # Tick parameters: Inward, on bottom & left ONLY
        ax.tick_params(
            direction="in",
            top=False,
            right=False,
            left=True,
            bottom=True,
            width=ax_lw,
            colors="#000000",
            which="major"
        )
        
        # Turn off grid lines (standard scientific white)
        ax.grid(False)

        fig.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format=fmt, dpi=300, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf
