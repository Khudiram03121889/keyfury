import bpy

def check_file(path):
    print("CHECKING:", path)
    try:
        bpy.ops.wm.open_mainfile(filepath=path)
        print(f"File {path}: {len(bpy.data.objects)} objects")
        for o in bpy.data.objects:
            print(f"  {o.name} ({o.type}) loc={o.location}")
    except Exception as e:
        print("Error:", e)

with open(r"D:\Keyboard stickman warrior\test_3d\check_blend_files.txt", "w") as out:
    import sys
    sys.stdout = out
    check_file(r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend")
    check_file(r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend1")

