# convert.py
import sys
from pdf2image import convert_from_path

pdf_path = sys.argv[1]
output_filename = sys.argv[2]

images = convert_from_path(pdf_path, dpi=300)

for i, image in enumerate(images):
    output_path = f"images/{output_filename}_{i+1}.png"
    image.save(output_path, "PNG")
    print(output_path)
