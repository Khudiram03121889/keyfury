import bpy
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name != 'Cyber_Valkyrie':
        mats = [m.name for m in o.data.materials if m]
        print(o.name, 'loc:', list(o.location), 'mats:', mats)
