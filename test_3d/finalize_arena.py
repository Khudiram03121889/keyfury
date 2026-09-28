"""
Finalizes the 3D Arena:
Delegates to finalize_with_void.py to ensure the complete 4-fighter scene is preserved and exported.
"""
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
target_script = os.path.join(script_dir, "finalize_with_void.py")

with open(target_script, 'r', encoding='utf-8') as f:
    code = f.read()

exec(compile(code, target_script, 'exec'))

