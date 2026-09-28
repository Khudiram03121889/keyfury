import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from math import radians

scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

cam_data = bpy.data.cameras.new('TestCam3')
cam_data.lens = 30.0
cam_obj = bpy.data.objects.new('TestCam3', cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (0.0, -8.0, 2.2)
cam_obj.rotation_euler = (radians(83.1), 0, 0)
bpy.context.view_layer.update()

pts = {
    'Mount_Dominant_Peak_14': Vector((10.0, 55.0, 14.0)),
    'Mount_Dominant_Peak_13': Vector((10.0, 55.0, 13.0)),
    'Castle_Keep_Top': Vector((-15.0, 36.0, 10.5)),
    'Castle_Wall_Top': Vector((-15.0, 36.0, 7.8)),
    'Waterfall_Top': Vector((16.5, 30.0, 4.2)),
    'Waterfall_Pool': Vector((15.5, 26.0, 0.4)),
    'Lake_Center': Vector((4.0, 32.0, -1.2)),
    'Deck_Center': Vector((0.0, 0.0, 0.0)),
    'Front_Parapet': Vector((0.0, -2.4, 0.35)),
    'Rear_Parapet': Vector((0.0, 2.4, 0.45)),
}

with open(r"d:\Keyboard stickman warrior\test_3d\cam_calc_results.txt", "w") as f:
    for k, v in pts.items():
        co = world_to_camera_view(scene, cam_obj, v)
        y_top = 1.0 - co.y
        f.write(f"{k:25s}: x={co.x:.3f}, y_from_top={y_top:.3f}\n")

print("VISTA PROJECTIONS WRITTEN")
