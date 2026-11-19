import json
import numpy as np
from PIL import Image

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return np.array([int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)

def generate_colors():
    print("Loading raw mesh from public/models/hanuman_white_mesh_50k.glb...")
    with open('public/models/hanuman_white_mesh_50k.glb', 'rb') as f:
        buf = f.read()

    json_len = int.from_bytes(buf[12:16], 'little')
    json_data = json.loads(buf[20:20+json_len].decode('utf-8'))
    bin_offset = 20 + json_len + 8
    
    pos_acc = json_data['accessors'][1]
    pos_bv = json_data['bufferViews'][pos_acc['bufferView']]
    offset = bin_offset + pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
    count = pos_acc['count']
    pos_data = np.frombuffer(buf[offset:offset+count*12], dtype=np.float32).reshape((count, 3))

    idx_acc = json_data['accessors'][0]
    idx_bv = json_data['bufferViews'][idx_acc['bufferView']]
    idx_offset = bin_offset + idx_bv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)
    indices = np.frombuffer(buf[idx_offset:idx_offset+idx_acc['count']*4], dtype=np.uint32)

    # Compute vertex normals
    normals = np.zeros_like(pos_data)
    tri_p0 = pos_data[indices[0::3]]
    tri_p1 = pos_data[indices[1::3]]
    tri_p2 = pos_data[indices[2::3]]
    tri_normals = np.cross(tri_p1 - tri_p0, tri_p2 - tri_p0)
    for k in range(3):
        np.add.at(normals, indices[k::3], tri_normals)
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normals /= norms

    # Normalize geometry: 1.45m tall, feet at y=0, centered on X and Z
    orig_min = pos_data.min(axis=0)
    orig_max = pos_data.max(axis=0)
    orig_center = (orig_min + orig_max) * 0.5
    orig_min_y = orig_min[1]
    orig_size_y = orig_max[1] - orig_min[1]
    scale = 1.45 / orig_size_y

    norm_pos = pos_data.copy()
    norm_pos[:, 0] = (norm_pos[:, 0] - orig_center[0]) * scale
    norm_pos[:, 1] = (norm_pos[:, 1] - orig_min_y) * scale
    norm_pos[:, 2] = (norm_pos[:, 2] - orig_center[2]) * scale

    # Load Reference Images
    im_front = Image.open('reference/Hanuman_TPose_Front.png').convert('RGB')
    arr_front = np.array(im_front)
    im_back = Image.open('reference/Hanuman_TPose_Back.png').convert('RGB')
    arr_back = np.array(im_back)
    im_side = Image.open('reference/Hanuman_TPose_Side.png').convert('RGB')
    arr_side = np.array(im_side)

    # Color Palette definitions
    c_skin = hex_to_rgb('#e8a87c')
    c_skin_shadow = hex_to_rgb('#d18e62')
    c_hair = hex_to_rgb('#331c15')
    c_hair_highlight = hex_to_rgb('#4a2b20')
    c_gold = hex_to_rgb('#eca73e')
    c_gold_shadow = hex_to_rgb('#cb8926')
    c_orange_sash = hex_to_rgb('#e86626')
    c_orange_sash_shadow = hex_to_rgb('#cb5216')
    c_navy_belt = hex_to_rgb('#384e66')
    c_navy_pleats = hex_to_rgb('#425c75')
    c_dhoti = hex_to_rgb('#f5ede0')
    c_dhoti_shadow = hex_to_rgb('#dfd4c3')
    c_dhoti_gold = hex_to_rgb('#e0a838')
    c_tilak_white = hex_to_rgb('#ffffff')
    c_tilak_red = hex_to_rgb('#d32f2f')
    c_eye_white = hex_to_rgb('#faf8f5')
    c_eye_brown = hex_to_rgb('#543218')
    c_eye_pupil = hex_to_rgb('#1e110b')

    # Front projection coords
    y_front = np.clip(np.round(559.0 - (norm_pos[:, 1] / 1.45) * (559.0 - 20.0)).astype(int), 0, arr_front.shape[0]-1)
    x_front = np.clip(np.round(225.5 + (norm_pos[:, 0] / 0.56955) * (427.0 / 2.0)).astype(int), 0, arr_front.shape[1]-1)
    col_front = arr_front[y_front, x_front].astype(np.float32) / 255.0

    # Back projection coords
    y_back = np.clip(np.round(557.0 - (norm_pos[:, 1] / 1.45) * (557.0 - 15.0)).astype(int), 0, arr_back.shape[0]-1)
    x_back = np.clip(np.round(191.5 - (norm_pos[:, 0] / 0.56955) * (383.0 / 2.0)).astype(int), 0, arr_back.shape[1]-1)
    col_back = arr_back[y_back, x_back].astype(np.float32) / 255.0

    # Background detection
    bg = np.array([239, 227, 211]) / 255.0
    bg_diff_front = np.linalg.norm(col_front - bg, axis=1)
    bg_diff_back = np.linalg.norm(col_back - bg, axis=1)

    # Base blend from front/back projection
    # Front-facing vs Back-facing weight based on normal Nz
    nz = normals[:, 2]
    w_front = np.clip(nz * 0.5 + 0.5, 0.0, 1.0)
    w_back = 1.0 - w_front

    # Mask out background samples
    w_front_clean = w_front * (bg_diff_front > 0.08)
    w_back_clean = w_back * (bg_diff_back > 0.08)
    w_total = w_front_clean + w_back_clean + 1e-6

    base_proj_color = (col_front * w_front_clean[:, None] + col_back * w_back_clean[:, None]) / w_total[:, None]
    
    # Initialize final vertex colors array
    colors = np.zeros((count, 3), dtype=np.float32)

    # Apply anatomical features and clean palette rules
    for i in range(count):
        x, y, z = norm_pos[i]
        nx, ny, nz_i = normals[i]
        is_front = nz_i > 0
        proj_c = base_proj_color[i]

        # 1. FEET & TOES (y < 0.09)
        if y < 0.09:
            colors[i] = c_skin

        # 2. ANKLETS (0.09 <= y < 0.13, circling lower legs)
        elif y < 0.13:
            # Gold anklets
            colors[i] = c_gold

        # 3. LOWER LEGS (0.13 <= y < 0.44)
        elif y < 0.44:
            colors[i] = c_skin

        # 4. DHOTI GOLD BORDER HEM (0.44 <= y < 0.48, bottom edge of shorts)
        elif y < 0.48:
            # If part of loincloth front flap:
            if abs(x) < 0.055 and z > 0.12 and is_front:
                colors[i] = c_navy_pleats
            else:
                colors[i] = c_dhoti_gold

        # 5. DHOTI SHORTS & FRONT LOINCLOTH FLAP (0.48 <= y < 0.72)
        elif y < 0.72:
            # Check if this is the tail
            if z < -0.15 and x < -0.05:
                # Tail
                if y > 0.55 and x < -0.15 and z < -0.23:
                    colors[i] = c_hair # Tail tip fur tuft!
                else:
                    colors[i] = c_skin # Tail body
            elif abs(x) < 0.055 and z > 0.10 and is_front:
                # Slate navy front pleated loincloth flap
                colors[i] = c_navy_pleats
            else:
                # Cream dhoti shorts
                # Subtle ambient occlusion / crease shading
                colors[i] = c_dhoti

        # 6. WAISTBAND & BUCKLE (0.72 <= y < 0.80)
        elif y < 0.80:
            # Check tail
            if z < -0.15 and x < -0.05:
                if y > 0.55 and x < -0.15 and z < -0.23:
                    colors[i] = c_hair
                else:
                    colors[i] = c_skin
            # Center circular buckle / medallion
            elif abs(x) < 0.045 and y > 0.73 and y < 0.78 and z > 0.12:
                colors[i] = c_gold
            else:
                # Slate navy waistband
                colors[i] = c_navy_belt

        # 7. TORSO & ARMS (0.80 <= y < 1.05)
        elif y < 1.05:
            # Tail check if any high tail vertices
            if z < -0.18 and x < -0.10 and y < 0.75:
                colors[i] = c_skin
            # Hands
            elif abs(x) > 0.49:
                colors[i] = c_skin
            # Wrist Kadas (gold bangles)
            elif abs(x) > 0.43:
                colors[i] = c_gold
            # Forearms
            elif abs(x) > 0.28:
                colors[i] = c_skin
            # Armlets (Bajuband)
            elif abs(x) > 0.21:
                colors[i] = c_gold
            # Torso: Saffron Orange Sash vs Bare Skin
            else:
                # Diagonal sash from left shoulder (x > 0) to right waist (x < 0)
                # Left shoulder is at x ~ +0.16, y ~ 1.05
                # Right waist is at x ~ -0.06, y ~ 0.80
                sash_center_x = -0.06 + (y - 0.80) * 0.88
                dist_to_sash = abs(x - sash_center_x)
                if dist_to_sash < 0.085:
                    colors[i] = c_orange_sash
                else:
                    colors[i] = c_skin

        # 8. NECK & MALA (1.05 <= y < 1.13)
        elif y < 1.13:
            # Golden beaded mala around neck
            if y < 1.09 and (abs(x) < 0.10 and abs(z - 0.18) < 0.12):
                colors[i] = c_gold
            else:
                colors[i] = c_skin

        # 9. HEAD & TOPKNOT (y >= 1.13)
        else:
            # Topknot bun top (y >= 1.35)
            if y >= 1.35:
                colors[i] = c_hair
            # Gold hair ring at bun base (1.32 <= y < 1.35, around center x/z)
            elif y >= 1.32 and abs(x) < 0.07 and abs(z - 0.18) < 0.10:
                colors[i] = c_gold
            # Hair on top / back of head
            elif y >= 1.28 and (z < 0.25 or abs(x) > 0.06):
                colors[i] = c_hair
            elif z < 0.18:
                # Back of head hair
                colors[i] = c_hair
            elif abs(x) > 0.09:
                # Side hair curls or ears
                if z < 0.22:
                    colors[i] = c_hair
                else:
                    colors[i] = c_skin # Ears
            else:
                # Face region (forehead, eyes, nose, cheeks, mouth)
                # Tilak: sacred white U-shape + red center streak
                is_tilak_zone = (y >= 1.22 and y <= 1.28 and z > 0.26 and abs(x) < 0.035)
                if is_tilak_zone:
                    if abs(x) < 0.012 and y <= 1.27:
                        # Red center streak
                        colors[i] = c_tilak_red
                    else:
                        # White Chandan U-shape
                        colors[i] = c_tilak_white
                # Eyes
                elif (y >= 1.18 and y <= 1.23 and z > 0.25 and abs(x) >= 0.03 and abs(x) <= 0.08):
                    # Eye details
                    if abs(x) >= 0.045 and abs(x) <= 0.065 and y >= 1.19 and y <= 1.22:
                        colors[i] = c_eye_pupil
                    else:
                        colors[i] = c_eye_white
                # Eyebrows
                elif (y >= 1.23 and y <= 1.25 and z > 0.255 and abs(x) >= 0.035 and abs(x) <= 0.075):
                    colors[i] = c_hair
                else:
                    colors[i] = c_skin

        # Tail fallback: ensure any tail vertex is correctly colored
        if z < -0.15 and x < -0.05 and y < 0.8:
            if y > 0.55 and x < -0.15 and z < -0.23:
                colors[i] = c_hair # Tuft
            else:
                colors[i] = c_skin # Body

    print("Colors successfully generated for", count, "vertices!")
    # Save colors as JSON array of [r, g, b]
    colors_list = colors.tolist()
    with open('public/models/vertex_colors.json', 'w') as f:
        json.dump(colors_list, f)
    print("Saved public/models/vertex_colors.json")

if __name__ == '__main__':
    generate_colors()
