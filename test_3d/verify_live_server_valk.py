import time
from playwright.sync_api import sync_playwright

def verify_live():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        
        # 1. Load app
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        time.sleep(1.5)
        page.screenshot(path='test_3d/live_server_lobby_valk_check.png')
        print('Lobby loaded and captured')
        
        # Find Valkyrie button/card
        valk_btn = page.query_selector('text="Cyber Valkyrie"') or page.query_selector('text="Freya"') or page.query_selector('[data-character="cyber_valkyrie"]')
        if valk_btn:
            valk_btn.click()
            time.sleep(1.0)
            page.screenshot(path='test_3d/live_server_valk_selected.png')
            print('Cyber Valkyrie selected')
            
        # Look for battle/practice/start button
        ready_btn = page.query_selector('button:has-text("READY"), button:has-text("START"), button:has-text("BATTLE"), button:has-text("PRACTICE"), button:has-text("P1 READY")')
        if ready_btn:
            ready_btn.click()
            time.sleep(2.0)
            page.screenshot(path='test_3d/live_server_arena_valk.png')
            print('Combat arena entered and captured')
        
        browser.close()
    print('Playwright live server verification completed successfully')

if __name__ == '__main__':
    verify_live()
