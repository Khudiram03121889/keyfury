import bpy

print("=== FIGHTER OBJECTS IN CURRENT BLENDER SCENE ===")
for o in bpy.data.objects:
    if any(k in o.name for k in ['Ronin', 'Valk', 'Shinobi', 'Void']):
        loc = tuple(round(v, 3) for v in o.location)
        world_loc = tuple(round(v, 3) for v in o.matrix_world.translation)
        dim = tuple(round(v, 3) for v in o.dimensions)
        parent = o.parent.name if o.parent else "None"
        print(f"Name: {o.name:<25} Loc: {loc} World: {world_loc} Dim: {dim} Parent: {parent}")
