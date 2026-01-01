#!/bin/bash

# Hide desktop icons
echo "Hiding desktop icons..."
defaults write com.apple.finder CreateDesktop false
killall Finder

# Hide all other apps to clean the screen
echo "Hiding other apps..."
osascript -e 'tell application "System Events" to set visible of every process whose visible is true to false'

# Download and set wallpaper for consistent background
echo "Setting wallpaper..."
curl -L -o /tmp/silent-wallpaper.jpg "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80"

# Build the app (make)
echo "Building app..."
pnpm make

# Start the app
echo "Starting app..."
open -a "$(pwd)/out/Silent-darwin-arm64/Silent.app"

# Wait for app to launch
sleep 5

# Capture full screen (PNG first, then convert for quality control)
echo "Capturing full screen screenshot..."
screencapture -x assets/screenshot.png

# Convert to High Quality JPEG
# JPEG is MUCH smaller than PNG for screenshots with wallpapers
# We resize to 1200px and set quality to 85%
echo "Converting to high-quality JPEG and resizing..."
sips -s format jpeg -s formatOptions 85 --resampleWidth 1200 assets/screenshot.png --out assets/screenshot.jpg

# Clean up temporary PNG
rm assets/screenshot.png

echo "Screenshot saved and optimized: assets/screenshot.jpg"

sleep 1

# Kill the app
APP_PID=$(pgrep -f "Silent")
if [ ! -z "$APP_PID" ]; then
    kill $APP_PID
fi
rm -f /tmp/silent-wallpaper.jpg

# Restore apps (Show all)
echo "Restoring apps..."
osascript -e 'tell application "System Events" to set visible of every process to true'

# Restore desktop icons
echo "Restoring desktop icons..."
defaults write com.apple.finder CreateDesktop true
killall Finder

exit 0
