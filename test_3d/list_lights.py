import bpy
for o in bpy.data.objects:
    if o.type == 'LIGHT':
        print(o.name, o.data.type, o.data.color, o.data.energy, o.location)
