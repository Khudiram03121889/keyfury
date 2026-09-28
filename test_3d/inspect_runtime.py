import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:5173/")
    page.wait_for_selector("button:has-text('Play a Duel')")
    page.locator("button:has-text('Play a Duel')").first.click(force=True)
    page.wait_for_selector("button:has-text('Start Bot Fight')")
    page.locator("button:has-text('Start Bot Fight')").first.click(force=True)
    page.wait_for_selector(".arena-modal-dialog")
    page.keyboard.press("2")
    time.sleep(0.5)
    page.locator("button:has-text('START FIGHT')").first.click(force=True)
    ready_btn = page.locator("button:has-text('Ready Up')")
    ready_btn.wait_for(state="visible", timeout=15000)
    ready_btn.first.click(force=True)
    page.wait_for_selector("canvas", timeout=20000)
    time.sleep(3.0)

    # Evaluate Three.js scene from browser window
    diag = page.evaluate("""() => {
        const p1 = window.__p1;
        const p2 = window.__p2;
        const scene = window.__threeScene;

        const info = {
            p1Exists: !!p1,
            p2Exists: !!p2,
            sceneExists: !!scene,
            p1BonesKeys: p1 ? Object.keys(p1.bones || {}) : [],
            p1State: p1 ? p1.state : null,
            p1Pos: p1 ? { x: p1.group.position.x, y: p1.group.position.y, z: p1.group.position.z } : null,
            p1MeshPos: p1 && p1.meshObject ? { x: p1.meshObject.position.x, y: p1.meshObject.position.y, z: p1.meshObject.position.z } : null,
            p1MeshRot: p1 && p1.meshObject ? { x: p1.meshObject.rotation.x, y: p1.meshObject.rotation.y, z: p1.meshObject.rotation.z } : null,
        };

        // Check SkinnedMeshes and bones in scene
        const meshes = [];
        if (scene) {
            scene.traverse((obj) => {
                if (obj.isSkinnedMesh) {
                    meshes.push({
                        name: obj.name,
                        type: 'SkinnedMesh',
                        skeletonBonesCount: obj.skeleton ? obj.skeleton.bones.length : 0,
                        materialName: obj.material ? (Array.isArray(obj.material) ? obj.material.map(m=>m.name) : obj.material.name) : null,
                        emissive: obj.material && !Array.isArray(obj.material) && obj.material.emissive ? obj.material.emissive.getHexString() : null,
                        emissiveIntensity: obj.material && !Array.isArray(obj.material) ? obj.material.emissiveIntensity : null,
                        baseColor: obj.material && !Array.isArray(obj.material) && obj.material.color ? obj.material.color.getHexString() : null,
                    });
                } else if (obj.isMesh) {
                    meshes.push({
                        name: obj.name,
                        type: 'Mesh',
                        materialName: obj.material ? (Array.isArray(obj.material) ? obj.material.map(m=>m.name) : obj.material.name) : null,
                        emissive: obj.material && !Array.isArray(obj.material) && obj.material.emissive ? obj.material.emissive.getHexString() : null,
                        baseColor: obj.material && !Array.isArray(obj.material) && obj.material.color ? obj.material.color.getHexString() : null,
                    });
                }
            });
        }
        info.meshes = meshes.slice(0, 15);
        return info;
    }""")

    import pprint
    print("\n--- DIAGNOSTIC RUNTIME DUMP ---")
    pprint.pprint(diag)

    print("\n--- RELEVANT CONSOLE LOGS ---")
    for l in console_logs:
        if "3D Fighter" in l or "Bones" in l or "Mesh Child" in l or "[log]" in l:
            print(l)

    browser.close()
