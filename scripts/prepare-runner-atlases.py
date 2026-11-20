"""Extract original GIF frames losslessly; never generate/interpolate motion.
Optional asset preparation only: npm start/build use the committed PNG atlases.
Requires Python 3 + Pillow.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public/assets/launch"
metadata = {}
assets = []
animations = []
for name in ["player", "obstacle", "bolt"]:
    original = OUTPUT / "originals" / (name + ".gif")
    with Image.open(original) as image:
        assert image.format == "GIF" and image.n_frames > 1
        loop = image.info.get("loop")
        frames, durations, bounds = [], [], []
        for index in range(image.n_frames):
            image.seek(index)
            frame = image.convert("RGBA")
            frames.append(frame)
            durations.append(max(10, image.info.get("duration", 100)))
            if box := frame.getchannel("A").getbbox():
                bounds.append(box)
        assert bounds
        x0 = max(0, min(box[0] for box in bounds) - 2)
        y0 = max(0, min(box[1] for box in bounds) - 2)
        x1 = min(image.width, max(box[2] for box in bounds) + 2)
        y1 = min(image.height, max(box[3] for box in bounds) + 2)
        crop = (x0, y0, x1, y1)
        width, height = x1 - x0, y1 - y0
        atlas = Image.new("RGBA", (width * len(frames), height))
        for index, frame in enumerate(frames):
            atlas.paste(frame.crop(crop), (width * index, 0))
        output = OUTPUT / (name + "-atlas.png")
        atlas.save(output, optimize=True)
        first = bounds[0]
        metadata[name] = {
            "src": "assets/launch/" + output.name,
            "frameWidth": width,
            "frameHeight": height,
            "frameDurationsMs": durations,
            "anchor": [(first[0] + first[2]) / 2 - x0, (first[1] + first[3]) / 2 - y0],
            "referenceHeight": first[3] - first[1],
        }
        # Reopen the saved atlas and verify every decoded source pixel in its crop.
        with Image.open(output) as saved:
            for index, frame in enumerate(frames):
                assert saved.crop((index * width, 0, (index + 1) * width, height)).convert("RGBA").tobytes() == frame.crop(crop).tobytes()
        animations.append({
            "id": name, "frames": len(frames), "durations_ms": durations,
            "loop": loop, "source_crop": list(crop), "decoded_pixels_verified": True,
        })
        for path, kind in [(original, "original_gif"), (output, "lossless_frame_atlas")]:
            assets.append({
                "id": name, "kind": kind, "destination": path.relative_to(ROOT).as_posix(),
                "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            })

data_file = ROOT / "src/app/core/config/runner-assets.generated.json"
manifest_file = ROOT / "docs/launch-animation-manifest.json"
data_file.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf8")
manifest_file.write_text(json.dumps({
    "policy": "Original GIF bytes preserved; nine original RGBA frames per asset, no invented frames. Fixed union crop preserves all animation pixels. Atlas pixel round-trip verified.",
    "animations": animations, "assets": assets,
}, indent=2) + "\n", encoding="utf8")
prettier = ROOT / "node_modules/prettier/bin/prettier.cjs"
if prettier.exists():
    subprocess.run(["node", str(prettier), "--write", str(data_file), str(manifest_file)], check=True)
for name, asset in metadata.items():
    print(name, len(asset["frameDurationsMs"]), "frames", asset["frameWidth"], asset["frameHeight"])
