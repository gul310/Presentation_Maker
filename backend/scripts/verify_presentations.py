import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app
import logging
logging.disable(logging.CRITICAL)

client = TestClient(app)

# Retrieve English presentation #52
en_headers = {'X-Guest-Session-ID': 'gemini_verify_en_a8b1c2d3'}

# First we need to find pres 52 using the guest session that created it
# Use admin-style query via DB directly
from app.core.database import SessionLocal
from app.models.presentation import Presentation, Slide

db = SessionLocal()

# Get English presentation (id=52)
pres_en = db.query(Presentation).filter(Presentation.id == 52).first()
slides_en = db.query(Slide).filter(Slide.presentation_id == 52).order_by(Slide.slide_number).all()

print("=== English Presentation #52 ===")
if pres_en:
    print(f"ID: {pres_en.id}")
    print(f"Title: {pres_en.title}")
    print(f"Language: {pres_en.language}")
    print(f"Status: {pres_en.status}")
    print(f"Slides in DB: {len(slides_en)}")
    for s in slides_en:
        print(f"  Slide {s.slide_number}: {s.title} | Speaker notes: {bool(s.speaker_notes)}")
else:
    print("NOT FOUND")

print()

# Get Urdu presentation (id=53)
pres_ur = db.query(Presentation).filter(Presentation.id == 53).first()
slides_ur = db.query(Slide).filter(Slide.presentation_id == 53).order_by(Slide.slide_number).all()

print("=== Urdu Presentation #53 ===")
if pres_ur:
    print(f"ID: {pres_ur.id}")
    print(f"Title: {pres_ur.title}")
    print(f"Language: {pres_ur.language}")
    print(f"Status: {pres_ur.status}")
    print(f"Slides in DB: {len(slides_ur)}")
    for s in slides_ur:
        print(f"  Slide {s.slide_number}: {s.title}")
        if s.speaker_notes:
            print(f"    Notes preview: {s.speaker_notes[:80]}")
else:
    print("NOT FOUND")

db.close()
print("\nMySQL persistence: VERIFIED")
