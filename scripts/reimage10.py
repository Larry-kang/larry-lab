#!/usr/bin/env python3
"""Script to re-crop and resize image10.webp from .oc-input/clean/image10.png source."""

from PIL import Image
import os

def main():
    # Source and target paths
    source_path = '/workspace/larry-lab-articles/.oc-input/clean/image10.png'
    target_path = '/workspace/larry-lab-articles/public/images/articles/etherfi/image10.webp'
    
    # Load source image
    with Image.open(source_path) as img:
        print(f'Source image: {img.size}')
        
        # Get image dimensions
        width, height = img.size
        
        # Crop a LARGER region focused on relevant UI content
        # The source image is only 281px tall.
        # Instead of cropping just 159px, we crop a larger region to capture more UI content
        # but still focus on the main UI area (not the bottom navigation)
        target_height = 220  # Much larger than 159px, capturing more UI content
        
        # Center the crop to focus on the main UI content
        start_y = max(0, (height - target_height) // 2)
        end_y = min(height, start_y + target_height)
        
        print(f'Cropping from y={start_y} to y={end_y} (region height: {end_y - start_y}px)')
        
        # Crop to the larger region, preserving full width
        cropped_img = img.crop((0, start_y, width, end_y))
        print(f'Cropped image size: {cropped_img.size}')
        
        # Resize proportionally (preserving aspect ratio)
        # Scale up to make text more readable while maintaining aspect ratio
        # Use a reasonable target size
        target_width = 1185
        target_height = 400
        
        # Calculate proportional scaling
        cropped_width, cropped_height = cropped_img.size
        width_ratio = target_width / cropped_width
        height_ratio = target_height / cropped_height
        ratio = min(width_ratio, height_ratio)
        
        new_width = int(cropped_width * ratio)
        new_height = int(cropped_height * ratio)
        
        resized_img = cropped_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        print(f'Resized image size: {resized_img.size}')
        
        # Convert to RGB if needed (for webp)
        if resized_img.mode != 'RGB':
            resized_img = resized_img.convert('RGB')
        
        # Save as webp (quality 85 is a good balance)
        resized_img.save(target_path, 'WEBP', quality=85)
        print(f'Saved to: {target_path}')
        
        # Verify the saved image
        with Image.open(target_path) as saved_img:
            print(f'Saved image info: {saved_img.size}, {saved_img.mode}, {saved_img.format}')
        
        print('Image processing complete!')

if __name__ == '__main__':
    main()
