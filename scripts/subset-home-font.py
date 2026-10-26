"""Build the landing page's font from the official Pretendard v1.3.9 variable WOFF2.

Usage: python scripts/subset-home-font.py /path/to/PretendardVariable.woff2
Requires fonttools[woff]==4.60.1 (build utility only, not a product dependency).
Rescan after changing landing-page copy. Missing glyphs fall back to Noto Sans KR.
"""
from pathlib import Path
import hashlib
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1]
scene = root / "src/features/home/scroll-story"
source = Path(sys.argv[1])
font = TTFont(source, recalcTimestamp=False)
font = instantiateVariableFont(font, {"wght": (400, 700)}, inplace=True)
text = "".join(path.read_text() for path in scene.iterdir() if path.suffix in (".ts", ".tsx"))
codepoints = {ord(char) for char in text} | set(range(32, 127)) | {0xA0, 0xB7, 0x2026, 0x2192, 0x2193}
options = subset.Options()
options.flavor = "woff2"
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
# A subset is a modified font: replace the Reserved Font Name, keep attribution.
for record in font["name"].names:
    if record.nameID not in (0, 13, 14):
        value = record.toUnicode().replace("Pretendard", "Pangyeori Home")
        if record.nameID in (6, 25):
            value = value.replace(" ", "")
        record.string = value.encode(record.getEncoding())
font.flavor = "woff2"
output = scene / "fonts/pangyeori-home.woff2"
font.save(output)
print(f"{output.relative_to(root)}: {output.stat().st_size:,} bytes")
print(f"Source SHA256: {hashlib.sha256(source.read_bytes()).hexdigest()}")
