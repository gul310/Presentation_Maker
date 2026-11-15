import requests
import json
import sys
import time

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:5000/api"

print("=" * 70)
print("RUNNING COMPREHENSIVE PRESENTMAKER TEST SUITE")
print("=" * 70)

results = {}

# -------------------------------------------------------------------
# TEST A: English Generation (6 Slides)
# -------------------------------------------------------------------
print("\n>>> TEST A: English Generation (National Incubation Center, 6 slides)")
session_a = f"test_guest_session_a_{int(time.time())}"
payload_a = {
    "source_type": "prompt",
    "prompt": "Explain what the National Incubation Center is and how it supports startups.",
    "source_content": "Explain what the National Incubation Center is and how it supports startups.",
    "title_hint": "National Incubation Center Overview",
    "language": "English",
    "audience": "Entrepreneurs & Investors",
    "presentation_type": "Informative",
    "tone": "Professional",
    "slide_count": 6
}
res_a = requests.post(f"{BASE_URL}/generate", json=payload_a, headers={"X-Guest-Session-ID": session_a})
print(f"Status: {res_a.status_code}")
if res_a.status_code == 201:
    data_a = res_a.json()
    pres_id_a = data_a.get("id")
    slides_a = data_a.get("slides", [])
    print(f"Success! ID: {pres_id_a}, Title: {data_a.get('title')}, Language: {data_a.get('language')}, Slides: {len(slides_a)}")
    for s in slides_a:
        print(f"  Slide {s.get('slide_number')}: {s.get('title')} [{s.get('layout_type')}] (Notes: {bool(s.get('speaker_notes'))})")
    
    # Verify retrieval
    res_get_a = requests.get(f"{BASE_URL}/presentations/{pres_id_a}", headers={"X-Guest-Session-ID": session_a})
    print(f"Retrieval /presentations/{pres_id_a} Status: {res_get_a.status_code}")
    results["TEST_A"] = "PASS" if (res_a.status_code == 201 and len(slides_a) >= 5 and res_get_a.status_code == 200) else "FAIL"
else:
    print(f"Failed: {res_a.text}")
    results["TEST_A"] = "FAIL"

# -------------------------------------------------------------------
# TEST B: Urdu Generation (5 Slides)
# -------------------------------------------------------------------
print("\n>>> TEST B: Urdu Generation (National Incubation Center, 5 slides)")
session_b = f"test_guest_session_b_{int(time.time())}"
payload_b = {
    "source_type": "prompt",
    "prompt": "قومی انکیوبیشن سینٹر کیا ہے اور یہ نئے کاروباروں کو کیسے سپورٹ کرتا ہے؟",
    "source_content": "قومی انکیوبیشن سینٹر کیا ہے اور یہ نئے کاروباروں کو کیسے سپورٹ کرتا ہے؟",
    "title_hint": "نیشنل انکیوبیشن سینٹر کا تعارف",
    "language": "Urdu",
    "audience": "General",
    "presentation_type": "Informative",
    "tone": "Professional",
    "slide_count": 5
}
res_b = requests.post(f"{BASE_URL}/generate", json=payload_b, headers={"X-Guest-Session-ID": session_b})
print(f"Status: {res_b.status_code}")
if res_b.status_code == 201:
    data_b = res_b.json()
    pres_id_b = data_b.get("id")
    slides_b = data_b.get("slides", [])
    print(f"Success! ID: {pres_id_b}, Title: {data_b.get('title')}, Language: {data_b.get('language')}, Slides: {len(slides_b)}")
    for s in slides_b:
        print(f"  Slide {s.get('slide_number')}: {s.get('title')} [{s.get('layout_type')}] (Notes: {bool(s.get('speaker_notes'))})")
    results["TEST_B"] = "PASS" if (res_b.status_code == 201 and len(slides_b) >= 4) else "FAIL"
else:
    print(f"Failed: {res_b.text}")
    results["TEST_B"] = "FAIL"

# -------------------------------------------------------------------
# TEST C: Chinese Generation
# -------------------------------------------------------------------
print("\n>>> TEST C: Chinese Generation (Artificial Intelligence in Modern Education, 4 slides)")
session_c = f"test_guest_session_c_{int(time.time())}"
payload_c = {
    "source_type": "prompt",
    "prompt": "人工智能在现代教育中的应用与未来展望",
    "source_content": "人工智能在现代教育中的应用与未来展望",
    "title_hint": "AI在教育领域的应用",
    "language": "Chinese",
    "audience": "Educators",
    "presentation_type": "Informative",
    "tone": "Academic",
    "slide_count": 4
}
res_c = requests.post(f"{BASE_URL}/generate", json=payload_c, headers={"X-Guest-Session-ID": session_c})
print(f"Status: {res_c.status_code}")
if res_c.status_code == 201:
    data_c = res_c.json()
    pres_id_c = data_c.get("id")
    slides_c = data_c.get("slides", [])
    print(f"Success! ID: {pres_id_c}, Title: {data_c.get('title')}, Language: {data_c.get('language')}, Slides: {len(slides_c)}")
    for s in slides_c:
        print(f"  Slide {s.get('slide_number')}: {s.get('title')} [{s.get('layout_type')}]")
    results["TEST_C"] = "PASS" if (res_c.status_code == 201 and len(slides_c) >= 3) else "FAIL"
else:
    print(f"Failed: {res_c.text}")
    results["TEST_C"] = "FAIL"

# -------------------------------------------------------------------
# TEST D: Empty Prompt Validation
# -------------------------------------------------------------------
print("\n>>> TEST D: Empty Prompt Validation")
payload_d = {
    "source_type": "prompt",
    "prompt": "   ",
    "source_content": "   ",
    "language": "English",
    "slide_count": 4
}
res_d = requests.post(f"{BASE_URL}/generate", json=payload_d, headers={"X-Guest-Session-ID": "test_guest_session_d"})
print(f"Status: {res_d.status_code}, Body: {res_d.text}")
results["TEST_D"] = "PASS" if res_d.status_code == 400 else "FAIL"

# -------------------------------------------------------------------
# TEST E: Authenticated User Generation & Credits Deduction
# -------------------------------------------------------------------
print("\n>>> TEST E: Authenticated User Generation & Credits Deduction")
import time
test_email = f"tester_{int(time.time())}@test.com"
auth_payload = {
    "name": "Integration Tester",
    "email": test_email,
    "password": "Password123!",
    "role": "professional"
}
res_signup = requests.post(f"{BASE_URL}/auth/register", json=auth_payload)
token = None
if res_signup.status_code in [200, 201]:
    token = res_signup.json().get("token")
else:
    res_login = requests.post(f"{BASE_URL}/auth/login", json={"email": test_email, "password": "Password123!"})
    token = res_login.json().get("token")

if token:
    headers_auth = {"Authorization": f"Bearer {token}"}
    res_me1 = requests.get(f"{BASE_URL}/auth/me", headers=headers_auth)
    credits_before = res_me1.json().get("ai_credits", {})
    print(f"Credits Before: {credits_before}")

    payload_e = {
        "source_type": "prompt",
        "prompt": "Cloud Computing Architecture and Microservices",
        "source_content": "Cloud Computing Architecture and Microservices",
        "title_hint": "Cloud Architecture",
        "language": "English",
        "slide_count": 4
    }
    res_e = requests.post(f"{BASE_URL}/generate", json=payload_e, headers=headers_auth)
    print(f"Auth Generate Status: {res_e.status_code}")

    res_me2 = requests.get(f"{BASE_URL}/auth/me", headers=headers_auth)
    credits_after = res_me2.json().get("ai_credits", {})
    print(f"Credits After: {credits_after}")

    deducted = (credits_after.get("used", 0) == credits_before.get("used", 0) + 1) and (credits_after.get("remaining", 0) == credits_before.get("remaining", 0) - 1)
    results["TEST_E"] = "PASS" if (res_e.status_code == 201 and deducted) else "FAIL"
else:
    print("Could not obtain auth token for user test")
    results["TEST_E"] = "FAIL"

# -------------------------------------------------------------------
# TEST F: Guest Generation Limits
# -------------------------------------------------------------------
print("\n>>> TEST F: Guest Generation Limits (Max 2 Generations)")
guest_session_id = f"guest_limit_test_{int(time.time())}_{int(time.time()*1000)%1000}"
headers_guest = {"X-Guest-Session-ID": guest_session_id}

# Gen 1
res_g1 = requests.post(f"{BASE_URL}/generate", json={"source_type": "prompt", "prompt": "Topic 1", "slide_count": 3, "language": "English"}, headers=headers_guest)
print(f"Guest Gen 1 Status: {res_g1.status_code}")

# Gen 2
res_g2 = requests.post(f"{BASE_URL}/generate", json={"source_type": "prompt", "prompt": "Topic 2", "slide_count": 3, "language": "English"}, headers=headers_guest)
print(f"Guest Gen 2 Status: {res_g2.status_code}")

# Gen 3 (Should be blocked with 403)
res_g3 = requests.post(f"{BASE_URL}/generate", json={"source_type": "prompt", "prompt": "Topic 3", "slide_count": 3, "language": "English"}, headers=headers_guest)
print(f"Guest Gen 3 Status: {res_g3.status_code}, Body: {res_g3.text[:120]}")

results["TEST_F"] = "PASS" if (res_g1.status_code == 201 and res_g2.status_code == 201 and res_g3.status_code == 403) else "FAIL"

# -------------------------------------------------------------------
# SUMMARY
# -------------------------------------------------------------------
print("\n" + "=" * 70)
print("TEST SUMMARY RESULTS")
print("=" * 70)
for k, v in results.items():
    print(f"  {k}: {v}")
print("=" * 70)
