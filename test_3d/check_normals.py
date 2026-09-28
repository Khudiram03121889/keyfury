import bpy
from mathutils import Vector

blend_path = r"d:\Keyboard stickman warrior\test_3d\keyfury_stage_volcanic_caldera.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

obj = bpy.data.objects.get('Mount_Fury')
mesh = obj.data

inward_count = 0
outward_count = 0
center = Vector((15.0, 56.0, 0.0))

for f in mesh.polygons:
    # Vector from center to face center
    to_face = (f.center - center)
    to_face.z = 0.0 # horizontal
    dot = f.normal.dot(to_face)
    if dot > 0:
        outward_count += 1
    else:
        inward_count += 1

print(f"Mount_Fury: {outward_count} outward faces, {inward_count} INWARD faces!")
with open(r"d:\Keyboard stickman warrior\test_3d\normals_check.txt", "w") as f:
    f.write(f"Mount_Fury: {outward_count} outward faces, {inward_count} INWARD faces!\n")
    # Also check Z bounds of Mount_Fury
    min_z = min(v.co.z for v in mesh.vertices)
    max_z = max(v.co.z for v in mesh.vertices)
    f.write(f"Z bounds: min_z={min_z}, max_z={max_z}\n")
