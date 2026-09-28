import time
import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Dell\.gemini\antigravity\brain\5beaea1e-43f8-44ba-86e5-6029b29bb171"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_test():
    print(">>> Starting KeyFury 3D Combat & Color Verification...", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

        # -------------------------------------------------------------
        # PART 1: CYBER NEON ROOFTOP VERIFICATION
        # -------------------------------------------------------------
        print("\n========================================================", flush=True)
        print("PART 1: CYBER NEON ROOFTOP (3D TRUE)", flush=True)
        print("========================================================", flush=True)

        print("1. Navigating to http://localhost:5173/ ...", flush=True)
        page.goto("http://localhost:5173/")
        page.wait_for_selector("button:has-text('Play a Duel')", timeout=15000)
        time.sleep(1.0)

        print("2. Clicking 'Play a Duel' to enter Lobby...", flush=True)
        page.locator("button:has-text('Play a Duel')").first.click(force=True)
        page.wait_for_selector("button:has-text('Start Bot Fight')", timeout=15000)
        time.sleep(1.0)

        print("3. Opening Bot Duel Arena Selector...", flush=True)
        page.locator("button:has-text('Start Bot Fight')").first.click(force=True)
        page.wait_for_selector(".arena-modal-dialog", timeout=10000)
        time.sleep(0.8)

        print("4. Selecting 'Cyber Neon Rooftop' via key '2'...", flush=True)
        page.keyboard.press("2")
        time.sleep(0.8)

        print("5. Clicking 'START FIGHT'...", flush=True)
        page.locator("button:has-text('START FIGHT')").first.click(force=True)
        time.sleep(1.5)

        print("6. Waiting for 'Ready Up & Fight Bot!' button...", flush=True)
        ready_btn = page.locator("button:has-text('Ready Up')")
        ready_btn.wait_for(state="visible", timeout=15000)
        time.sleep(0.5)
        ready_btn.first.click(force=True)
        print("   Clicked Ready Up! Transitioning to Match...", flush=True)

        # In Match Page: Wait for 3D Canvas
        print("7. Inside Match! Waiting for 3D canvas and entrance animation...", flush=True)
        page.wait_for_selector("canvas", timeout=20000)
        time.sleep(2.0)

        shot_walk = os.path.join(SCREENSHOT_DIR, "Cyber_Rooftop_Entrance_Walk.png")
        page.screenshot(path=shot_walk)
        print(f"   [CAPTURED] Entrance Walk & Stage: {shot_walk}", flush=True)

        # Skip cinematic intro with Space to enter active combat
        print("8. Skipping intro to enter active combat guard stance...", flush=True)
        page.keyboard.press("Space")
        time.sleep(1.5)

        shot_guard = os.path.join(SCREENSHOT_DIR, "Cyber_Rooftop_Combat_Guard.png")
        page.screenshot(path=shot_guard)
        print(f"   [CAPTURED] Combat Ready Guard & Neutral Studio Colors: {shot_guard}", flush=True)

        # Focus hidden typing input and execute combat strikes
        print("9. Executing typing combat strikes...", flush=True)
        input_elem = page.locator("input[name='combat_keystroke_input']")
        if input_elem.count() > 0:
            input_elem.focus()

        # Word 1: Jab
        for ch in "blade ":
            page.keyboard.type(ch, delay=50)
            time.sleep(0.04)

        time.sleep(0.12)
        shot_jab = os.path.join(SCREENSHOT_DIR, "Cyber_Rooftop_Jab_Strike.png")
        page.screenshot(path=shot_jab)
        print(f"   [CAPTURED] Jab Strike: {shot_jab}", flush=True)

        # Word 2: Kick
        time.sleep(0.5)
        for ch in "strike ":
            page.keyboard.type(ch, delay=45)
            time.sleep(0.04)

        time.sleep(0.15)
        shot_kick = os.path.join(SCREENSHOT_DIR, "Cyber_Rooftop_Kick_Strike.png")
        page.screenshot(path=shot_kick)
        print(f"   [CAPTURED] Kick Strike: {shot_kick}", flush=True)

        # Word 3: Heavy Cleave
        time.sleep(0.6)
        for ch in "overdrive ":
            page.keyboard.type(ch, delay=40)
            time.sleep(0.03)

        time.sleep(0.2)
        shot_heavy = os.path.join(SCREENSHOT_DIR, "Cyber_Rooftop_Heavy_Cleave.png")
        page.screenshot(path=shot_heavy)
        print(f"   [CAPTURED] Heavy Cleave & Weapon Trail: {shot_heavy}", flush=True)

        # -------------------------------------------------------------
        # PART 2: CELESTIAL VOID VERIFICATION
        # -------------------------------------------------------------
        print("\n========================================================", flush=True)
        print("PART 2: CELESTIAL VOID SHRINE (3D TRUE)", flush=True)
        print("========================================================", flush=True)

        print("1. Returning to Lobby for Celestial Void test...", flush=True)
        page.goto("http://localhost:5173/")
        page.wait_for_selector("button:has-text('Play a Duel')", timeout=15000)
        time.sleep(1.0)
        page.locator("button:has-text('Play a Duel')").first.click(force=True)
        page.wait_for_selector("button:has-text('Start Bot Fight')", timeout=15000)
        time.sleep(1.0)

        print("2. Opening Bot Duel Arena Selector...", flush=True)
        page.locator("button:has-text('Start Bot Fight')").first.click(force=True)
        page.wait_for_selector(".arena-modal-dialog", timeout=10000)
        time.sleep(0.8)

        print("3. Selecting 'Celestial Void Shrine' via key '4'...", flush=True)
        page.keyboard.press("4")
        time.sleep(0.8)

        print("4. Clicking 'START FIGHT'...", flush=True)
        page.locator("button:has-text('START FIGHT')").first.click(force=True)
        time.sleep(1.5)

        print("5. Clicking 'Ready Up & Fight Bot!'...", flush=True)
        ready_btn = page.locator("button:has-text('Ready Up')")
        ready_btn.wait_for(state="visible", timeout=15000)
        time.sleep(0.5)
        ready_btn.first.click(force=True)

        print("6. Waiting for 3D Canvas in Celestial Void...", flush=True)
        page.wait_for_selector("canvas", timeout=20000)
        time.sleep(2.0)

        shot_celestial_intro = os.path.join(SCREENSHOT_DIR, "Celestial_Void_Entrance_Walk.png")
        page.screenshot(path=shot_celestial_intro)
        print(f"   [CAPTURED] Celestial Void Entrance Walk: {shot_celestial_intro}", flush=True)

        page.keyboard.press("Space")
        time.sleep(1.5)

        shot_celestial_combat = os.path.join(SCREENSHOT_DIR, "Celestial_Void_Combat_Arena.png")
        page.screenshot(path=shot_celestial_combat)
        print(f"   [CAPTURED] Celestial Void Combat Arena: {shot_celestial_combat}", flush=True)

        print("\n--- RECENT BROWSER CONSOLE LOGS ---", flush=True)
        for l in console_logs[-20:]:
            try:
                print("  ", l.encode('ascii', errors='replace').decode('ascii'), flush=True)
            except Exception:
                pass

        browser.close()
        print("\n>>> All Browser Verifications Completed Successfully!", flush=True)

if __name__ == "__main__":
    run_test()
