import bpy
import json

report = {
    "filepath": bpy.data.filepath,
    "all_objects": [o.name for o in bpy.data.objects],
    "collections": [c.name for c in bpy.data.collections]
}

with open(r"D:\Keyboard stickman warrior\test_3d\deep_inspect_all_objs.json", "w") as f:
    json.dump(report, f, indent=2)

print("Saved all objs to deep_inspect_all_objs.json")
