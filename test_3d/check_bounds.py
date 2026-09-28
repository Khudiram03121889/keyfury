from PIL import Image
import numpy as np
import os

imgs = [
    r'd:\Keyboard stickman warrior\test_3d\valk_clean_front_perfect.png',
    r'd:\Keyboard stickman warrior\test_3d\valk_clean_back_perfect.png',
    r'd:\Keyboard stickman warrior\test_3d\valk_clean_side.png',
    r'd:\Keyboard stickman warrior\test_3d\valk_clean_front.png',
    r'd:\Keyboard stickman warrior\test_3d\clean_ronin_slice_front.png',
    r'd:\Keyboard stickman warrior\test_3d\clean_ronin_slice_back.png',
    r'd:\Keyboard stickman warrior\test_3d\clean_ronin_slice_side.png',
    r'd:\Keyboard stickman warrior\test_3d\shinobi_turnaround_front_master.png',
    r'd:\Keyboard stickman warrior\test_3d\void_turnaround_front_master.png'
]

for p in imgs:
    if not os.path.exists(p):
        print("Missing:", p)
        continue
    im = Image.open(p)
    arr = np.array(im)
    if arr.ndim == 3 and arr.shape[2] == 4:
        alpha = arr[:, :, 3]
        rows = np.where(np.any(alpha > 20, axis=1))[0]
        cols = np.where(np.any(alpha > 20, axis=0))[0]
        name = os.path.basename(p)
        print(f"{name:<35} size={im.size} ymin={rows[0]} ymax={rows[-1]} xmin={cols[0]} xmax={cols[-1]}")
    else:
        print(f"{os.path.basename(p):<35} size={im.size} NO ALPHA")
