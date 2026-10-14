import pytest
from app.services.export_service import render_figure

def test_render_acs_figure_cv():
    sample_segments = [
        {
            "segment_index": 1,
            "scan_rate_mv_s": 10.0,
            "data": {
                "potential_v": [-0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.2, 0.0, -0.2, -0.4, -0.6, -0.8],
                "current_ma": [0.01, 0.05, 0.12, 0.2, 0.25, 0.28, 0.1, -0.05, -0.15, -0.22, -0.25, -0.2, 0.01]
            }
        }
    ]
    
    # Test rendering PNG with ACS boxed style, inward ticks, custom annotations, custom limits
    buf = render_figure(
        technique="CV",
        segments=sample_segments,
        template="acs",
        fmt="png",
        mass_mg=2.5,
        title="Test CV ACS Export",
        custom_x_label="Potential (V vs Ag/AgCl)",
        custom_y_label="Current density (A g⁻¹)",
        x_min=-1.0,
        x_max=0.5,
        stroke_width=2.4,
        axis_linewidth=1.8,
        palette_name="acs",
        annotations=[{"text": "10 mV s⁻¹", "position": "bottom-right"}]
    )
    
    assert buf is not None
    data = buf.getvalue()
    assert len(data) > 1000
    # PNG signature check: 89 50 4E 47
    assert data[:4] == b"\x89PNG"

def test_render_acs_figure_svg():
    sample_segments = [
        {
            "segment_index": 1,
            "data": {
                "re_z_ohm": [10.0, 20.0, 30.0, 50.0],
                "neg_im_z_ohm": [2.0, 15.0, 25.0, 10.0]
            }
        }
    ]
    
    buf = render_figure(
        technique="PEIS",
        segments=sample_segments,
        template="acs",
        fmt="svg",
        title="Test PEIS Nyquist",
        annotations=[{"text": "0.25 A g⁻¹", "position": "top-left"}]
    )
    
    assert buf is not None
    data = buf.getvalue().decode("utf-8")
    assert "<svg" in data
