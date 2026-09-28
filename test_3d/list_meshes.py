import bpy
objs = [(o.name, o.type) for o in bpy.data.objects if o.type == 'MESH']
print(objs)
