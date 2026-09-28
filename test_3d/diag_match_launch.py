import time
import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Dell\.gemini\antigravity\brain\5beaea1e-43f8-44ba-86e5-6029b29bb171"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    logs = []
    page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: logs.append(f"[ERR] {err}"))

    print("1. Opening app...")
    page.goto("http://localhost:5173/")
    time.sleep(1.0)
    page.keyboard.press("Enter") # enter lobby
    time.sleep(1.0)

    print("2. Starting bot duel...")
    page.locator("button:has-text('Start Bot Fight')").click()
    time.sleep(1.0)
    page.keyboard.press("2") # select Cyber Rooftop
    time.sleep(0.5)
    page.keyboard.press("Enter") # confirm arena
    time.sleep(1.5)

    shot1 = os.path.join(SCREENSHOT_DIR, "diag_1_before_ready.png")
    page.screenshot(path=shot1)
    print("Saved diag_1_before_ready.png")

    print("3. Clicking Ready button...")
    ready_btn = page.locator("button:has-text('Ready Up & Fight Bot!')")
    print(f"Ready btn count: {ready_btn.count()}")
    if ready_btn.count() > 0:
        ready_btn.click()
    else:
        print("Ready button not found!")
    
    # Wait 3 seconds and take screenshot
    for i in range(1, 6):
        time.sleep(1.0)
        shot_i = os.path.join(SCREENSHOT_DIR, f"diag_step_{i}.png")
        page.screenshot(path=shot_i)
        print(f"Step {i}: Canvas count={page.locator('canvas').count()}, URL={page.url}")

    print("\n--- BROWSER CONSOLE LOGS ---")
    for l in logs[-30:]:
        print("  ", l)

    browser.close()
