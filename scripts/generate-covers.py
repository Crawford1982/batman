#!/usr/bin/env python3
"""
Generate placeholder cover images for portal submission using PIL
"""

from PIL import Image, ImageDraw, ImageFont
import os

output_dir = "portal/submission/images"
os.makedirs(output_dir, exist_ok=True)

# Color scheme: dark blue and orange
BG_COLOR = (15, 25, 45)  # Dark blue
ACCENT_COLOR = (255, 140, 0)  # Orange
TEXT_COLOR = (255, 255, 255)  # White

def create_cover(width, height, filename):
    """Create a cover image with game title and visual elements"""
    img = Image.new('RGB', (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Add gradient effect (simple approximation)
    for y in range(height):
        alpha = y / height
        color = tuple(int(BG_COLOR[i] + (ACCENT_COLOR[i] - BG_COLOR[i]) * alpha * 0.3) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    
    # Add geometric shapes for visual interest (representing aircraft/city)
    # Draw stylized aircraft shape
    aircraft_y = int(height * 0.4)
    aircraft_points = [
        (int(width * 0.5), aircraft_y),
        (int(width * 0.45), aircraft_y + 20),
        (int(width * 0.3), aircraft_y + 15),
        (int(width * 0.3), aircraft_y + 25),
        (int(width * 0.5), aircraft_y + 40),
        (int(width * 0.7), aircraft_y + 25),
        (int(width * 0.7), aircraft_y + 15),
        (int(width * 0.55), aircraft_y + 20),
    ]
    draw.polygon(aircraft_points, fill=ACCENT_COLOR)
    
    # Draw city skyline at bottom
    buildings = [
        (int(width * 0.1), int(height * 0.7), int(width * 0.2), height),
        (int(width * 0.22), int(height * 0.6), int(width * 0.3), height),
        (int(width * 0.32), int(height * 0.75), int(width * 0.4), height),
        (int(width * 0.6), int(height * 0.65), int(width * 0.7), height),
        (int(width * 0.72), int(height * 0.8), int(width * 0.8), height),
        (int(width * 0.82), int(height * 0.55), int(width * 0.9), height),
    ]
    
    for building in buildings:
        draw.rectangle(building, fill=(30, 45, 65))
        # Add windows
        for y in range(building[1] + 10, building[3] - 10, 20):
            for x in range(building[0] + 5, building[2] - 5, 15):
                if (x + y) % 2 == 0:  # Random window pattern
                    draw.rectangle([x, y, x+8, y+8], fill=ACCENT_COLOR)
    
    # Add title text
    title_y = int(height * 0.15)
    
    # Try to use a font, fall back to default
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(height * 0.12))
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(height * 0.05))
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Draw title with shadow
    title = "SHADOW STRIKER"
    subtitle = "Steel City Night Patrol"
    
    # Get text size
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = bbox[2] - bbox[0]
    title_x = (width - title_width) // 2
    
    # Shadow
    draw.text((title_x + 3, title_y + 3), title, fill=(0, 0, 0), font=title_font)
    # Main text
    draw.text((title_x, title_y), title, fill=ACCENT_COLOR, font=title_font)
    
    # Subtitle
    bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = bbox[2] - bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    subtitle_y = title_y + int(height * 0.13)
    draw.text((subtitle_x, subtitle_y), subtitle, fill=TEXT_COLOR, font=subtitle_font)
    
    # Save
    filepath = os.path.join(output_dir, filename)
    img.save(filepath)
    print(f"✅ Created {filename} ({width}×{height})")

# CrazyGames requirements
create_cover(1920, 1080, "crazygames-landscape-1920x1080.png")
create_cover(800, 1200, "crazygames-portrait-800x1200.png")
create_cover(800, 800, "crazygames-square-800x800.png")

# GameDistribution requirements
create_cover(512, 512, "gamedistribution-512x512.png")
create_cover(512, 384, "gamedistribution-512x384.png")
create_cover(200, 120, "gamedistribution-200x120.png")
create_cover(1280, 720, "gamedistribution-landscape-1280x720.png")

# itch.io requirements
create_cover(630, 500, "itchio-cover-630x500.png")

print("\n✅ All cover images generated successfully!")
print(f"   Location: {output_dir}/")
