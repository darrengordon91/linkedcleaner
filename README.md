# LinkedInCleaner Chrome Extension

A Chrome extension that enhances your LinkedIn feed by allowing you to vote on posts as either "Hot Take 🔥" or "Hot Turd 💩". Posts marked as "Hot Turd" will be overlaid with a poop GIF to help you identify low-quality content.

## Features

- Vote on LinkedIn posts as either "Hot Take 🔥" or "Hot Turd 💩"
- Visual poop GIF overlay on posts marked as "Hot Turd"
- Persistent voting state (votes are saved between sessions)
- Clean and unobtrusive UI that integrates with LinkedIn's design
- Works on images and video content

## Installation

1. Clone this repository:
```bash
git clone git@github.com:darrengordon91/linkedcleaner.git
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the cloned repository folder

5. The extension should now be installed and active

## Usage

1. Navigate to LinkedIn
2. For each post, you'll see two voting buttons:
   - "Hot Take 🔥" for quality content
   - "Hot Turd 💩" for low-quality content
3. Click either button to vote
4. Posts marked as "Hot Turd" will display a poop GIF overlay on their media content

## Development

### Project Structure
```
linkedcleaner/
├── manifest.json        # Extension configuration
├── content.js          # Main content script
├── content.css         # Styles for the content script
├── popup.html         # Extension popup HTML
├── popup.js          # Popup functionality
├── popup.css        # Popup styles
└── gifs/            # Directory containing GIF assets
    └── mr_hanky.gif  # Poop GIF overlay
```

### Local Development

1. Make your changes to the relevant files
2. Reload the extension in Chrome (`chrome://extensions/`)
3. Refresh LinkedIn to see your changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 