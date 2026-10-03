import bpy
import bmesh
import mathutils
import os

SOURCE_BLEND = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"
bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)

fighters = ["Shadow_Ronin", "Cyber_Valkyrie", "Volt_Shinobi", "Void_Assassin"]
out_log = r"d:\Keyboard stickman warrior\test_3d\deep_char_inspect.txt"

with open(out_log, "w", encoding="utf-8") as out:
    for name in fighters:
        out.write(f"\n==================== {name} ====================\n")
        obj = bpy.data.objects.get(name)
        if not obj:
            out.write(f"Object {name} not found!\n")
            continue
        mesh = obj.data
        verts = mesh.vertices
        out.write(f"Mesh: {mesh.name} | Vertices: {len(verts)} | Polygons: {len(mesh.polygons)} | Materials: {[m.name for m in mesh.materials if m]}\n")
        
        # Bounding box
        min_x = min(v.co.x for v in verts)
        max_x = max(v.co.x for v in verts)
        min_y = min(v.co.y for v in verts)
        max_y = max(v.co.y for v in verts)
        min_z = min(v.co.z for v in verts)
        max_z = max(v.co.z for v in verts)
        
        out.write(f"  Bounds X: [{min_x:.4f}, {max_x:.4f}] (center: {(min_x+max_x)/2:.4f}, width: {max_x-min_x:.4f})\n")
        out.write(f"  Bounds Y: [{min_y:.4f}, {max_y:.4f}] (center: {(min_y+max_y)/2:.4f}, depth: {max_y-min_y:.4f})\n")
        out.write(f"  Bounds Z: [{min_z:.4f}, {max_z:.4f}] (height: {max_z-min_z:.4f})\n")
        
        # Check symmetry across X=0 for various Z slices (Torso, Shoulders, Hips, Hands, Feet)
        height = max_z - min_z
        slices = [
            ("Head", 0.88 * height, 1.0 * height),
            ("Shoulders/Chest", 0.70 * height, 0.88 * height),
            ("Torso/Spine", 0.55 * height, 0.70 * height),
            ("Hips", 0.45 * height, 0.55 * height),
            ("Thighs", 0.25 * height, 0.45 * height),
            ("Feet/Boots", 0.0 * height, 0.25 * height),
        ]
        out.write("  --- Anatomy Z-Slices & Side/Front Balance ---\n")
        for slice_name, z_low, z_high in slices:
            sv = [v for v in verts if z_low <= (v.co.z - min_z) <= z_high]
            if sv:
                s_min_x = min(v.co.x for v in sv)
                s_max_x = max(v.co.x for v in sv)
                s_min_y = min(v.co.y for v in sv)
                s_max_y = max(v.co.y for v in sv)
                s_avg_y = sum(v.co.y for v in sv) / len(sv)
                out.write(f"    {slice_name:<16}: X=[{s_min_x:.3f}, {s_max_x:.3f}] (mid: {(s_min_x+s_max_x)/2:.3f}), Y=[{s_min_y:.3f}, {s_max_y:.3f}] (avg Y: {s_avg_y:.3f})\n")
        
        # Check hands / weapons clusters (vertices with |x| > 0.35 * width or far out)
        left_extremes = [v for v in verts if v.co.x < (min_x + 0.15 * (max_x - min_x))]
        right_extremes = [v for v in verts if v.co.x > (max_x - 0.15 * (max_x - min_x))]
        out.write(f"  Extreme Left Verts count: {len(left_extremes)} (avg Z: {sum(v.co.z for v in left_extremes)/len(left_extremes):.3f}, avg Y: {sum(v.co.y for v in left_extremes)/len(left_extremes):.3f})\n")
        out.write(f"  Extreme Right Verts count: {len(right_extremes)} (avg Z: {sum(v.co.z for v in right_extremes)/len(right_extremes):.3f}, avg Y: {sum(v.co.y for v in right_extremes)/len(right_extremes):.3f})\n")

print(">>> DEEP INSPECTION WRITTEN!")


