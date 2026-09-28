import time
import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Dell\.gemini\antigravity\brain\5beaea1e-43f8-44ba-86e5-6029b29bb171"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_test():
    print(">>> Starting Playwright Browser Combat & Color Verification...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"[PAGE ERROR] {err}"))

        # 1. Navigate to Home / Lobby
        print("Navigating to http://localhost:5173/ ...")
        page.goto("http://localhost:5173/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        lobby_shot = os.path.join(SCREENSHOT_DIR, "1_lobby_page.png")
        page.screenshot(path=lobby_shot)
        print(f"Saved lobby screenshot: {lobby_shot}")

        # 2. Look for Practice / Bot Match button
        print("Starting Bot Practice Match...")
        # Check buttons
        buttons = page.locator("button").all()
        print(f"Found {len(buttons)} buttons on page: {[b.inner_text() for b in buttons]}")

        # Click Solo Practice or vs Bot
        practice_btn = None
        for b in buttons:
            txt = b.inner_text().lower()
            if "practice" in txt or "bot" in txt or "solo" in txt or "play" in txt:
                practice_btn = b
                break
        
        if practice_btn:
            print(f"Clicking button: {practice_btn.inner_text()}")
            practice_btn.click()
        else:
            print("No explicit practice button found, checking links/inputs...")

        time.sleep(2)
        page.wait_for_load_state("networkidle")

        match_shot1 = os.path.join(SCREENSHOT_DIR, "2_match_loading.png")
        page.screenshot(path=match_shot1)
        print(f"Saved match screenshot: {match_shot1}")

        # 3. Check if we are on match page (or if we need to select arena or enter name)
        current_url = page.url
        print(f"Current page URL: {current_url}")

        # If on character/arena select or modal, check options
        buttons = page.locator("button").all()
        print(f"Buttons on match page: {[b.inner_text() for b in buttons]}")

        for b in buttons:
            txt = b.inner_text().lower()
            if "start" in txt or "ready" in txt or "fight" in txt:
                print(f"Clicking: {b.inner_text()}")
                b.click()
                time.sleep(1)
                break

        # Wait for 3D canvas
        time.sleep(2)
        canvas = page.locator("canvas")
        print(f"Canvas count: {canvas.count()}")

        # Take entrance showcase screenshot
        time.sleep(2.5)
        entrance_shot = os.path.join(SCREENSHOT_DIR, "3_entrance_showcase.png")
        page.screenshot(path=entrance_shot)
        print(f"Saved entrance screenshot: {entrance_shot}")

        # Skip intro if skip button or keypress
        page.keyboard.press("Space")
        time.sleep(1)

        # Wait for combat active state
        combat_shot = os.path.join(SCREENSHOT_DIR, "4_active_combat_ready.png")
        page.screenshot(path=combat_shot)
        print(f"Saved combat ready screenshot: {combat_shot}")

        # 4. Simulate Typing to trigger attacks and articulated movements
        print("Simulating typing to trigger attacks...")
        # Get active word to type from HUD or word elements
        word_spans = page.locator("span").all()
        print(f"Page text elements count: {len(word_spans)}")

        # Focus typing input and type keys
        input_elem = page.locator("input[name='combat_keystroke_input']")
        if input_elem.count() > 0:
            print("Found combat typing input, focusing...")
            input_elem.focus()

        # Type various keys to trigger keystroke responsiveness
        for ch in "quick brown fox jumps over lazy dog":
            page.keyboard.type(ch, delay=60)
            time.sleep(0.04)

        time.sleep(0.5)
        attack_shot = os.path.join(SCREENSHOT_DIR, "5_combat_attack_execution.png")
        page.screenshot(path=attack_shot)
        print(f"Saved combat attack screenshot: {attack_shot}")

        # Type more to trigger heavier attack / combo
        for ch in "warrior strike victory blade lightning":
            page.keyboard.type(ch, delay=50)
            time.sleep(0.03)

        time.sleep(0.6)
        combo_shot = os.path.join(SCREENSHOT_DIR, "6_combat_heavy_reaction.png")
        page.screenshot(path=combo_shot)
        print(f"Saved combo reaction screenshot: {combo_shot}")

        print("\n--- BROWSER CONSOLE LOGS ---")
        for l in logs[-30:]:
            print(l)

        browser.close()
        print("\n>>> Verification Complete!")

if __name__ == "__main__":
    run_test()
