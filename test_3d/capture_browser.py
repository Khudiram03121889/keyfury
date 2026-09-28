import time
import subprocess
import sys
from playwright.sync_api import sync_playwright

print('>>> Starting local server for Three.js WebGL runtime testing...')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '3333'], cwd=r'd:\Keyboard stickman warrior\test_3d')
time.sleep(2.5)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('http://localhost:3333/')
        
        # Wait for loading overlay to disappear
        page.wait_for_selector('#loading-overlay', state='hidden', timeout=30000)
        time.sleep(2)
        
        # 1. Main 4-Fighter Combat Camera
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_combat.png')
        print('Captured web_view_combat.png')
        
        # 2. Click Void Front
        page.click("text=Void Front")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_void_front.png')
        print('Captured web_view_void_front.png')
        
        # 3. Click Void Profile
        page.click("text=Void Profile")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_void_profile.png')
        print('Captured web_view_void_profile.png')
        
        # 4. Click Void Back
        page.click("text=Void Back")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_void_back.png')
        print('Captured web_view_void_back.png')
        
        # 5. Click Shinobi Front
        page.click("text=Shinobi Front")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_shinobi_front.png')
        print('Captured web_view_shinobi_front.png')
        
        # 3. Click Shinobi Profile
        page.click("text=Shinobi Profile")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_shinobi_profile.png')
        print('Captured web_view_shinobi_profile.png')
        
        # 4. Click Shinobi Back
        page.click("text=Shinobi Back")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_shinobi_back.png')
        print('Captured web_view_shinobi_back.png')
        
        # 8. Click Ronin Front
        page.click("text=Ronin Front")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_ronin_front.png')
        print('Captured web_view_ronin_front.png')

        # 9. Click Ronin Profile
        page.click("text=Ronin Profile")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_ronin_profile.png')
        print('Captured web_view_ronin_profile.png')

        # 10. Click Ronin Back
        page.click("text=Ronin Back")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_ronin_back.png')
        print('Captured web_view_ronin_back.png')

        # 11. Click Valkyrie Front
        page.click("text=Valkyrie Front")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_valk_front.png')
        print('Captured web_view_valk_front.png')

        # 12. Click Valkyrie Profile
        page.click("text=Valkyrie Profile")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_valk_profile.png')
        print('Captured web_view_valk_profile.png')

        # 13. Click Valkyrie Back
        page.click("text=Valkyrie Back")
        time.sleep(2)
        page.screenshot(path='d:/Keyboard stickman warrior/test_3d/web_view_valk_back.png')
        print('Captured web_view_valk_back.png')
        
        browser.close()
    print('>>> All WebGL browser screenshots captured successfully!')
finally:
    srv.terminate()
    print('>>> Local server terminated.')
