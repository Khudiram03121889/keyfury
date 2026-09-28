import sys
for m in ['scipy', 'numpy', 'PIL', 'cv2', 'mathutils']:
    try:
        __import__(m)
        print(f'{m}: AVAILABLE')
    except ImportError:
        print(f'{m}: NOT AVAILABLE')
