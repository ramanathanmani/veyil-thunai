import json
import numpy as np
import pandas as pd
import pywbgt
import thermofeel as tf
from metpy.units import units as ureg

Q = ureg.Quantity
lat, lon = 12.9675, 79.9418  # Sriperumbudur, TN

def td_from_rh(T, RH):
    a, b = 17.62, 243.12
    g = np.log(RH / 100) + a * T / (b + T)
    return b * g / (a - g)

scen = [
    ("screenshot_like_morning", "2026-10-27 09:30", 28, 71, 520, 2.0),
    ("midday_hot_dry",          "2026-05-10 12:30", 39, 40, 950, 3.0),
    ("midday_humid_coastal",    "2026-10-15 13:00", 33, 70, 800, 3.5),
    ("evening_no_sun",          "2026-10-27 18:30", 30, 75,   0, 1.5),
    ("overcast_monsoon",        "2026-07-20 12:00", 29, 85, 250, 4.0)
]

out = []
for name, t, T, RH, S, w10 in scen:
    dt = pd.DatetimeIndex([pd.Timestamp(t, tz="Asia/Kolkata").tz_convert("UTC").tz_localize(None)])
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
    simple = float(tf.calculate_wbgt_simple(np.array([T + 273.15]), np.array([float(RH)]))[0]) - 273.15
    out.append(dict(
        name=name, local_time_ist=t, temp_c=T, rh_pct=RH, shortwave_wm2=S,
        wind10_ms=w10, wind2_ms=round(w2, 2), pressure_hpa=1005,
        dewpoint_c=round(Td, 2), wbgt_liljegren_c=round(f(Twbg), 2),
        globe_c=round(f(Tg), 2), nat_wetbulb_c=round(f(Tnwb), 2),
        wbgt_simple_c=round(simple, 2)
    ))

output_path = "tests/fixtures/wbgt_vectors.json"
import os
os.makedirs("tests/fixtures", exist_ok=True)
with open(output_path, "w") as f_out:
    json.dump(out, f_out, indent=2)

print(f"Generated {len(out)} reference vectors in {output_path}:")
for r in out:
    print(f"  {r['name']}: WBGT={r['wbgt_liljegren_c']}°C, Tg={r['globe_c']}°C, Tnwb={r['nat_wetbulb_c']}°C, simple={r['wbgt_simple_c']}°C")
