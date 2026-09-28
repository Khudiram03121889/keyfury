"""Subtle leg-readability polish for the four KeyFury fighters.

This script only adds a small, named detail collection.  It does not alter,
remesh, or replace any of the original character objects or their textures.
"""

import bpy
import os


WORK_DIR = r"D:\Keyboard stickman warrior\test_3d"
BLEND_PATH = os.path.join(WORK_DIR, "KeyFury_3D_CyberRooftop.blend")
PREVIEW_PATH = os.path.join(WORK_DIR, "KeyFury_3D_LegFinish_Preview.png")
COLLECTION_NAME = "LEG_FINISH_DETAILS"

FIGHTERS = {
    "Shadow_Ronin": (0.04, 0.78, 1.00, 1.0),
    "Volt_Shinobi": (1.00, 0.64, 0.10, 1.0),
    "Void_Assassin": (0.66, 0.28, 1.00, 1.0),
    "Cyber_Valkyrie": (1.00, 0.16, 0.08, 1.0),
}


def remove_old_details():
    old = bpy.data.collections.get(COLLECTION_NAME)
    if not old:
        return
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(old)


def make_material(name, color, emission=False):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    if emission:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = 0.35
        bsdf.inputs["Roughness"].default_value = 0.22
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = 1.35
    else:
        # Near-black armor ensures the details retain the original costume's
        # silhouette rather than becoming new visual elements.
        bsdf.inputs["Base Color"].default_value = (0.018, 0.024, 0.034, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.82
        bsdf.inputs["Roughness"].default_value = 0.26
    mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def add_box(collection, parent, name, location, dimensions, material, bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    obj.location = location
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("Soft armor edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def add_knee(collection, parent, name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    obj.location = location
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def local_bounds(obj):
    corners = [tuple(corner) for corner in obj.bound_box]
    return tuple(min(c[i] for c in corners) for i in range(3)), tuple(max(c[i] for c in corners) for i in range(3))


def detail_fighter(collection, fighter, color):
    low, high = local_bounds(fighter)
    width = high[0] - low[0]
    depth = high[1] - low[1]
    height = high[2] - low[2]
    center_x = (low[0] + high[0]) * 0.5
    front_y = low[1] - 0.012
    bottom = low[2]
    accent = make_material(f"LegFinish_{fighter.name}_Accent", color, emission=True)
    armor = make_material(f"LegFinish_{fighter.name}_Armor", color)

    # Two thin raised greaves, knee caps, inset lights, and grounded soles.
    # Their dimensions stay proportional to each source mesh, so the original
    # designs and poses are preserved across the four differently sized heroes.
    leg_offset = width * 0.18
    plate_width = max(width * 0.085, 0.060)
    plate_height = height * 0.170
    plate_depth = max(depth * 0.055, 0.023)
    shin_z = bottom + height * 0.255
    knee_z = bottom + height * 0.405

    for side, label in ((-1, "L"), (1, "R")):
        x = center_x + side * leg_offset
        add_box(
            collection, fighter, f"LegFinish_{fighter.name}_{label}_Greave",
            (x, front_y, shin_z),
            (plate_width, plate_depth, plate_height), armor, bevel=0.014,
        )
        add_box(
            collection, fighter, f"LegFinish_{fighter.name}_{label}_ShinLight",
            (x, front_y - plate_depth * 0.60, shin_z),
            (plate_width * 0.22, plate_depth * 0.25, plate_height * 0.62), accent, bevel=0.005,
        )
        add_knee(
            collection, fighter, f"LegFinish_{fighter.name}_{label}_KneeCap",
            (x, front_y - plate_depth * 0.22, knee_z),
            (plate_width * 0.52, plate_depth * 0.45, plate_width * 0.48), armor,
        )


def apply_and_save():
    remove_old_details()
    detail_collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(detail_collection)

    for name, color in FIGHTERS.items():
        fighter = bpy.data.objects.get(name)
        if fighter is None:
            raise RuntimeError(f"Required fighter is missing: {name}")
        detail_fighter(detail_collection, fighter, color)

    # Preserve the existing camera/render setup.  The separate preview avoids
    # changing the project's established arena render artifact.
    scene = bpy.context.scene
    original_path = scene.render.filepath
    scene.render.filepath = PREVIEW_PATH
    bpy.ops.render.render(write_still=True)
    scene.render.filepath = original_path

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print(f"Saved leg-detail pass to {BLEND_PATH}")
    print(f"Rendered verification preview to {PREVIEW_PATH}")


if __name__ == "__main__":
    apply_and_save()
