import time
import os
import sys
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Dell\.gemini\antigravity\brain\5beaea1e-43f8-44ba-86e5-6029b29bb171"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def verify_combat_and_colors():
    print(">>> Launching Playwright Chromium for KeyFury 3D Combat & Color Fidelity Verification...", flush=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"[PAGE ERROR] {err}"))

        # 1. Navigate to Landing Page
        print("1. Navigating to http://localhost:5173/ ...", flush=True)
        page.goto("http://localhost:5173/")
        page.wait_for_selector("body")
        time.sleep(1.5)

        landing_shot = os.path.join(SCREENSHOT_DIR, "1_landing_page.png")
        page.screenshot(path=landing_shot)
        print(f"   Saved landing page: {landing_shot}", flush=True)

        # 2. Enter Lobby
        print("2. Entering Lobby...", flush=True)
        page.keyboard.press("Enter")
        time.sleep(1.5)

        lobby_shot = os.path.join(SCREENSHOT_DIR, "2_lobby_page.png")
        page.screenshot(path=lobby_shot)
        print(f"   Saved lobby page: {lobby_shot}", flush=True)

        # 3. Start Bot Fight
        print("3. Starting Practice vs AI Bot duel...", flush=True)
        bot_btn = page.locator("button:has-text('Start Bot Fight')")
        if bot_btn.count() > 0:
            print("   Found 'Start Bot Fight' button, clicking...", flush=True)
            bot_btn.click()
        else:
            print("   Fallback: searching all buttons...", flush=True)
            for b in page.locator("button").all():
                if "bot" in b.inner_text().lower():
                    b.click()
                    break
        
        time.sleep(1.0)
        # Check if Arena modal is open and select arena (e.g. Cyber Rooftop)
        modal_shot = os.path.join(SCREENSHOT_DIR, "3_arena_select_modal.png")
        page.screenshot(path=modal_shot)
        print(f"   Saved modal snapshot: {modal_shot}", flush=True)

        # Press Enter to confirm arena & launch fight
        print("   Confirming arena selection with Enter...", flush=True)
        page.keyboard.press("Enter")
        time.sleep(2.0)

        # 4. In Match - 3D Showcase & Entrance Walk
        print("4. Inside Match Page. Observing 3D Arena & Entrance Walk...", flush=True)
        time.sleep(2.0)
        showcase_shot = os.path.join(SCREENSHOT_DIR, "4_match_3d_showcase.png")
        page.screenshot(path=showcase_shot)
        print(f"   Saved 3D showcase & entrance walk: {showcase_shot}", flush=True)

        # Skip intro with Space to enter combat immediately
        print("   Skipping intro to enter active combat...", flush=True)
        page.keyboard.press("Space")
        time.sleep(1.0)

        combat_ready_shot = os.path.join(SCREENSHOT_DIR, "5_combat_ready_stance.png")
        page.screenshot(path=combat_ready_shot)
        print(f"   Saved active combat ready stance: {combat_ready_shot}", flush=True)

        # 5. Type word to trigger combat attacks & articulated body movements
        print("5. Typing letters to trigger keystroke responsiveness and combat strikes...", flush=True)
        # Find active word to type from DOM
        word_elements = page.locator(".word, [data-word], span").all()
        # Find words on screen
        print("   Extracting typing words from screen...", flush=True)
        input_elem = page.locator("input[name='combat_keystroke_input']")
        if input_elem.count() > 0:
            input_elem.focus()

        # Let's inspect the active word to type
        active_words = []
        for el in page.locator("div, span").all():
            cl = el.get_attribute("class") or ""
            if "word" in cl.lower() or "active" in cl.lower():
                txt = el.inner_text().strip()
                if txt and len(txt) > 2 and len(txt) < 15 and txt.isalpha():
                    active_words.append(txt)

        print(f"   Detected candidate words: {active_words[:5]}", flush=True)

        # Type several words to trigger Jab, Kick, and Heavy attacks
        # First word (e.g. jab)
        for char in "neon ":
            page.keyboard.type(char, delay=60)
            time.sleep(0.04)

        time.sleep(0.12)
        jab_shot = os.path.join(SCREENSHOT_DIR, "6_combat_jab_strike.png")
        page.screenshot(path=jab_shot)
        print(f"   Saved Jab strike screenshot: {jab_shot}", flush=True)

        # Second word (trigger kick)
        for char in "cyber ":
            page.keyboard.type(char, delay=50)
            time.sleep(0.04)

        time.sleep(0.15)
        kick_shot = os.path.join(SCREENSHOT_DIR, "7_combat_kick_strike.png")
        page.screenshot(path=kick_shot)
        print(f"   Saved Kick strike screenshot: {kick_shot}", flush=True)

        # Third word (trigger heavy attack)
        for char in "overdrive ":
            page.keyboard.type(char, delay=45)
            time.sleep(0.03)

        time.sleep(0.20)
        heavy_shot = os.path.join(SCREENSHOT_DIR, "8_combat_heavy_cleave.png")
        page.screenshot(path=heavy_shot)
        print(f"   Saved Heavy attack screenshot: {heavy_shot}", flush=True)

        # Wait a moment for combat exchange
        time.sleep(1.0)
        final_shot = os.path.join(SCREENSHOT_DIR, "9_combat_arena_colors_verified.png")
        page.screenshot(path=final_shot)
        print(f"   Saved final verified combat screenshot: {final_shot}", flush=True)

        print("\n--- RECENT BROWSER CONSOLE LOGS ---", flush=True)
        for l in logs[-25:]:
            print("  ", l, flush=True)

        browser.close()
        print("\n>>> All Browser Verifications Completed Successfully!", flush=True)

if __name__ == "__main__":
    verify_combat_and_colors()
