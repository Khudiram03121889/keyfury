import bpy

# Reload all images
for img in bpy.data.images:
    try:
        img.reload()
        print('Reloaded:', img.name)
    except Exception as e:
        print('Error reloading', img.name, e)
