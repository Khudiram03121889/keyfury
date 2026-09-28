import bpy

log_path = r"d:\Keyboard stickman warrior\test_3d\blender_inspect_out.txt"
with open(log_path, "w") as f:
    f.write(">>> BLENDER SCRIPT RUNNING!\n")
    f.write(f"Scene: {bpy.context.scene.name}\n")
    f.write("Objects in scene:\n")
    for obj in bpy.data.objects:
        f.write(f" - {obj.name} ({obj.type}) loc={obj.location} dims={obj.dimensions}\n")
        if obj.type == 'MESH':
            f.write(f"   verts={len(obj.data.vertices)} faces={len(obj.data.polygons)}\n")
            for m in obj.data.materials:
                if m:
                    f.write(f"   mat={m.name}\n")

print(">>> WROTE INSPECT OUTPUT SUCCESSFULLY!")
