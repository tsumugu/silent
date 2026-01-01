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

# Capture full screen
echo "Capturing full screen screenshot..."
screencapture -x assets/screenshot.png

echo "Screenshot saved to assets/screenshot.png"

sleep 1

# Kill the app
APP_PID=$(pgrep -f "Silent")
kill $APP_PID
rm /tmp/silent-wallpaper.jpg

# Restore apps (Show all)
echo "Restoring apps..."
osascript -e 'tell application "System Events" to set visible of every process to true'

# Restore desktop icons
echo "Restoring desktop icons..."
defaults write com.apple.finder CreateDesktop true
killall Finder

exit 0
