import bpy
import traceback

print(">>> STARTING BLENDER MCP SERVER VIA PYTHON ARGUMENT <<<")
try:
    import addon
    addon.register()
except Exception as e:
    print("Addon register:", e)

try:
    bpy.ops.blendermcp.start_server()
    print(">>> BLENDER MCP SERVER STARTED ON PORT 9876! <<<")
except Exception as e:
    print("Error starting blendermcp:", traceback.format_exc())
