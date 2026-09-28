import time
import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Dell\.gemini\antigravity\brain\5beaea1e-43f8-44ba-86e5-6029b29bb171"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

    print("1. Going to localhost:5173")
    page.goto("http://localhost:5173/")
    time.sleep(1.0)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_1_landing.png"))

    print("2. Pressing Enter to enter Lobby")
    page.keyboard.press("Enter")
    time.sleep(1.5)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_2_lobby.png"))

    print("3. Clicking 'Start Bot Fight'")
    bot_btn = page.locator("button:has-text('Start Bot Fight')")
    print("   bot_btn count:", bot_btn.count())
    if bot_btn.count() > 0:
        bot_btn.click()
    time.sleep(1.0)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_3_modal.png"))

    print("4. Pressing '2' and Enter")
    page.keyboard.press("2")
    time.sleep(0.5)
    page.keyboard.press("Enter")
    time.sleep(1.5)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_4_after_modal.png"))

    print("5. Looking for Ready button")
    ready_btn = page.locator("button:has-text('Ready Up')")
    print("   ready_btn count:", ready_btn.count())
    if ready_btn.count() > 0:
        print("   ready_btn text:", ready_btn.first.inner_text())
        ready_btn.first.click()
    time.sleep(2.0)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_5_after_ready.png"))

    print("6. Waiting 3 more seconds...")
    time.sleep(3.0)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "diag_6_countdown.png"))

    print("\n--- HTML DUMP OF MAIN AREA ---")
    body_text = page.locator("body").inner_text()
    print(body_text[:1000].encode('ascii', errors='replace').decode('ascii'))

    print("\n--- ALL BUTTONS ON PAGE ---")
    buttons = page.locator("button").all_inner_texts()
    print(buttons)

    print("\n--- CONSOLE LOGS ---")
    for log in console_logs[-25:]:
        print(log)

    browser.close()
