import os
from PIL import Image, ImageOps

def convert_images_to_pdf(image_paths: list[str], output_pdf_path: str) -> bool:
    """
    Converts a list of image file paths into a single clean PDF document.
    Handles EXIF orientation and RGB conversion for optimal quality.
    """
    if not image_paths:
        raise ValueError("No images provided for PDF conversion.")

    processed_images = []
    
    for path in image_paths:
        if not os.path.exists(path):
            continue
        try:
            with Image.open(path) as img:
                # Handle EXIF rotation automatically
                img = ImageOps.exif_transpose(img)
                # Convert to RGB if needed (handles RGBA, P, etc.)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                processed_images.append(img.copy())
        except Exception as e:
            print(f"Error processing image {path} for PDF: {e}")

    if not processed_images:
        raise ValueError("Failed to load any valid images for PDF conversion.")

    # Save images into PDF
    first_image = processed_images[0]
    additional_images = processed_images[1:] if len(processed_images) > 1 else []

    first_image.save(
        output_pdf_path,
        "PDF",
        save_all=True,
        append_images=additional_images,
        quality=95,
        resolution=100.0
    )
    
    return os.path.exists(output_pdf_path)

