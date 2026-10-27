import os
import json
import sys

# Audio generator for Veyil Thunai voice guidance (Architecture Section 7)
TEMPLATES = [
    "plan.green.today",
    "plan.green.now",
    "plan.yellow.now",
    "plan.orange.now",
    "plan.red.now",
    "plan.black.now",
    "reason.humid",
    "reason.sun",
    "reason.hot",
    "reason.still_air",
    "act.drink_now",
    "act.rest_shade",
    "act.stop_work",
    "log.started",
    "log.rest_added",
    "log.stopped",
    "learn.severe_symptoms",
    "rights.advisory"
]

LANGUAGES = ["en", "ta", "hi"]

# Try importing gTTS for genuine spoken audio generation
has_gtts = False
try:
    from gtts import gTTS
    has_gtts = True
except ImportError:
    pass

base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "audio")
i18n_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "i18n")

total_valid = 0
for lang in LANGUAGES:
    dir_path = os.path.join(base_dir, lang)
    os.makedirs(dir_path, exist_ok=True)
    json_path = os.path.join(i18n_dir, f"{lang}.json")

    text_map = {}
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as jf:
            text_map = json.load(jf)

    for tmpl in TEMPLATES:
        file_path = os.path.join(dir_path, f"{tmpl}.mp3")
        # If valid audio exists (> 1000 bytes), keep it
        if os.path.exists(file_path) and os.path.getsize(file_path) > 1000:
            total_valid += 1
            continue

        if has_gtts and tmpl in text_map:
            tts = gTTS(text=text_map[tmpl], lang=lang)
            tts.save(file_path)
            total_valid += 1
        else:
            # Fallback warning
            print(f"Warning: gTTS not available to generate audio for {lang}/{tmpl}")

print(f"Total valid spoken audio files verified: {total_valid}/54")
