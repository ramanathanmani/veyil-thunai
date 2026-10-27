import json
import random
import numpy as np
import pandas as pd
import pywbgt
from metpy.units import units as ureg

Q = ureg.Quantity
lat, lon = 12.9675, 79.9418  # Sriperumbudur, TN

def td_from_rh(T, RH):
    a, b = 17.62, 243.12
    g = np.log(RH / 100) + a * T / (b + T)
    return b * g / (a - g)

# Fixed seed for reproducibility
random.seed(42)
np.random.seed(42)

grid = []
# 200 random points: T 24–42, RH 30–95, solar 0–1000, wind 0.5–5, daytime hours (08:00 to 17:00 IST)
hours = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00"]
dates = ["2026-03-15", "2026-05-10", "2026-07-20", "2026-10-27"]

for i in range(200):
    t_date = random.choice(dates)
    t_hour = random.choice(hours)
    t_str = f"{t_date} {t_hour}"
    T = round(random.uniform(24.0, 42.0), 1)
    RH = round(random.uniform(30.0, 95.0), 1)
    S = round(random.uniform(0.0, 1000.0), 1)
    w10 = round(random.uniform(0.5, 5.0), 1)
    
    dt = pd.DatetimeIndex([pd.Timestamp(t_str, tz="Asia/Kolkata").tz_convert("UTC").tz_localize(None)])
    Td = float(td_from_rh(T, RH))
    w2 = w10 * 0.6
    
    Tg, Tpsy, Tnwb, Twbg, sol, spd, minspd = pywbgt.wbgt(
        dt, np.array([lat]), np.array([lon]),
        Q(np.array([float(S)]), "W/m**2"), Q(np.array([1005.0]), "hPa"),
        Q(np.array([float(T)]), "degC"), Q(np.array([Td]), "degC"),
        Q(np.array([w2]), "m/s"), method="liljegren"
    )
    f = lambda q: float(np.ravel(q.to("degC").magnitude if hasattr(q, "to") and q.check("[temperature]")
                                 else getattr(q, "magnitude", q))[0])
    grid.append({
        "id": i + 1,
        "time_ist": t_str,
        "lat": lat,
        "lon": lon,
        "temp_c": T,
        "rh_pct": RH,
        "solar_wm2": S,
        "wind10_ms": w10,
        "wind2_ms": round(w2, 2),
        "pressure_hpa": 1005.0,
        "dewpoint_c": round(Td, 2),
        "wbgt_liljegren_c": round(f(Twbg), 2),
        "globe_c": round(f(Tg), 2),
        "nat_wetbulb_c": round(f(Tnwb), 2)
    })

with open("tests/fixtures/wbgt_grid_200.json", "w") as f_out:
    json.dump(grid, f_out, indent=2)

print(f"Generated 200 grid vectors in tests/fixtures/wbgt_grid_200.json")
