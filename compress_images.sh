#!/bin/bash

# Directory containing the image sequence
DIR="public/Public/Header Image Sequence"

echo "Starting compression of PNG sequence to WebP..."
echo "This might take a minute depending on your Mac's speed."

# Loop through all PNG files in the directory
for file in "$DIR"/*.png; do
  if [ -f "$file" ]; then
    # Get the base filename without extension
    filename=$(basename "$file" .png)
    
    # Convert to JPEG with 60% quality (good balance of size/quality)
    # macOS sips command supports writing JPEG reliably
    sips -s format jpeg -s formatOptions 60 "$file" --out "$DIR/$filename.jpg" > /dev/null 2>&1
    
    echo "Compressed: $filename.jpg"
  fi
done

echo "Compression complete!"
echo "Note: The original .png files are still there. Once you verify the .jpg files work in the browser, you can safely delete the .png files to save space."
