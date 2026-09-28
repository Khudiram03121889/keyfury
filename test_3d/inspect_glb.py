import struct
import json

def inspect_glb(path):
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        chunk_len, chunk_type = struct.unpack('<I4s', f.read(8))
        json_bytes = f.read(chunk_len)
        data = json.loads(json_bytes.decode('utf-8'))

    print(f"\n==================== {path} ====================")
    print("Nodes count:", len(data.get('nodes', [])))
    print("Meshes count:", len(data.get('meshes', [])))
    print("Skins count:", len(data.get('skins', [])))
    print("Materials count:", len(data.get('materials', [])))
    for i, m in enumerate(data.get('materials', [])):
        pbr = m.get('pbrMetallicRoughness', {})
        print(f"  Material {i} [{m.get('name')}]:")
        print(f"    baseColorFactor: {pbr.get('baseColorFactor')}")
        print(f"    roughnessFactor: {pbr.get('roughnessFactor')}")
        print(f"    metallicFactor: {pbr.get('metallicFactor')}")
        print(f"    emissiveFactor: {m.get('emissiveFactor')}")

for p in [
    'apps/web/public/assets/3d/KeyFury_3D_CyberRooftop_True3D.glb',
    'apps/web/public/assets/3d/KeyFury_3D_CelestialVoid_True3D.glb',
    'apps/web/public/assets/3d/Shadow_Ronin.glb',
    'apps/web/public/assets/3d/Volt_Shinobi.glb',
]:
    inspect_glb(p)
