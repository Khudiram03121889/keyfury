import bpy

blend_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_True3D.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

out_txt = r"d:\Keyboard stickman warrior\test_3d\scene_objects.txt"
with open(out_txt, "w") as f:
    f.write("=== ALL MESH OBJECTS WITH MATERIALS ===\n")
    for o in bpy.data.objects:
        if o.type == 'MESH':
            mats = [m.name for m in o.data.materials if m]
            bbox_min = [min(v.co[i] for v in o.data.vertices) for i in range(3)] if o.data.vertices else [0,0,0]
            bbox_max = [max(v.co[i] for v in o.data.vertices) for i in range(3)] if o.data.vertices else [0,0,0]
            world_min = [round(bbox_min[i] + o.location[i], 2) for i in range(3)]
            world_max = [round(bbox_max[i] + o.location[i], 2) for i in range(3)]
            f.write(f"OBJ: {o.name:32} | MATS: {str(mats):35} | X:[{world_min[0]}, {world_max[0]}] Y:[{world_min[1]}, {world_max[1]}] Z:[{world_min[2]}, {world_max[2]}]\n")

print("Wrote scene_objects.txt")
