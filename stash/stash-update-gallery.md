# Gallery → Stash Updater (Multi-Site)

Update galleries in Stash with metadata from nhentai, e-hentai, exhentai, and more. Automatically extracts title, tags, date, and other metadata to keep your Stash library organized.

## Features

- **Multi-Site Support** - Works with nhentai, nhentai.to, e-hentai, and exhentai
- **Complete Metadata** - Imports title, tags, date, studio/organization info
- **Artist & Character Tags** - Properly prefixes artist, character, parody, and other special tags
- **One-Click Updates** - Single button to update gallery in Stash
- **Stash Gallery ID** - Links galleries via URL parameter for easy tracking
- **Direct GraphQL Integration** - Communicates directly with Stash's API

## Supported Sites

- [nhentai.net](https://nhentai.net)
- [nhentai.to](https://nhentai.to)
- [e-hentai.org](https://e-hentai.org)
- [exhentai.org](https://exhentai.org)

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)

2. Click here to install: [stash-update-gallery.user.js](https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/stash/stash-update-gallery.user.js)

3. Your userscript manager will prompt you to install - click "Install"

## Setup

### Configure Stash Connection

The script includes a built-in settings panel for easy configuration:

1. **Open the Settings Panel**: Click the "⚙️ Settings" button in the Stash Updater panel
2. **Configure Stash GraphQL URL**: 
   - Default: `http://localhost:9999/graphql`
   - Update if your Stash instance uses a different port or is on a remote server
3. **Enter API Key**:
   - Open Stash settings → Security → API Keys
   - Create a new API key or copy an existing one
   - Paste it into the API Key field (password-masked for security)
   - Use the "Show API Key" checkbox to verify if needed
4. **Save Settings**: Click "Save Settings" to persist your configuration

Settings are stored in your browser's localStorage and will persist across sessions.

**Manual Configuration** (if needed):
You can also edit the script directly to set default values:

```javascript
const DEFAULT_STASH_GRAPHQL_URL = 'http://localhost:9999/graphql';
const DEFAULT_API_KEY = 'your-api-key-here';
```

## Usage

### Basic Workflow

1. **In Stash**: Create a new gallery or find an existing one
2. **Get the gallery ID** from the URL (e.g., `/galleries/123`)
3. **Visit the source site** (e.g., nhentai) with the content you want to import
4. **Add Stash Gallery ID to URL**: Append `?stashGalleryId=123` to the URL
5. **Click "Update Stash Gallery"** button that appears on the page
6. **Return to Stash** to see the updated metadata

### Example

1. You have a gallery in Stash at `http://localhost:9999/galleries/456`
2. Visit nhentai gallery at `https://nhentai.net/g/123456/`
3. Modify URL to: `https://nhentai.net/g/123456/?stashGalleryId=456`
4. Click the floating "Update Stash Gallery" button
5. Metadata is automatically imported to gallery #456

## What Gets Updated

- **Title** - Gallery title from the source site
- **Date** - Upload or published date
- **Tags** - All tags, properly categorized:
  - Artist tags (prefixed with "Artist: ")
  - Character tags (prefixed with "Character: ")
  - Parody tags (prefixed with "Parody: ")
  - Language tags (prefixed with "Language: ")
  - Category tags (prefixed with "Category: ")
  - Regular content tags
- **Studio** - Group/circle information (if available)
- **URL** - Source URL is added to gallery URLs

## Site-Specific Notes

### nhentai & nhentai.to
- Extracts tags by section (Artists, Groups, Parodies, Characters, Tags, Languages, Categories)
- Properly formats tag prefixes
- Imports upload date

### e-hentai & exhentai
- Supports both sites with identical functionality
- Parses tag categories from the tag list
- Extracts posted date
- Handles uploader as studio information
Stash GraphQL URL is correct in Settings
- Confirm the API key is valid in Settings
- Check the gallery ID exists in Stash
- Check browser console for error messages

**Settings not saving?**
- Ensure localStorage is enabled in your browser
- Check that cookies/storage aren't being blocked for the site
- Try disabling strict tracking protection
- Verify you added `?stashGalleryId=XXX` to the URL
- Check that you're on a supported site's gallery page
- Ensure your userscript manager is enabled

**Update failing?**
- Verify your Stash instance is running
- Check that the API key is correct
- Confirm the gallery ID exists in Stash
- Check browser console for error messages
- Verify the GraphQL URL is correct for your setup

**Tags not importing correctly?**
- Some sites may have different tag formats
- Check the browser console for parsing errors
- Tags may need manual review after import

**CORS errors?**
- Ensure Stash CORS settings allow requests from the source domains
- Check Stash security settings
, use the Settings panel to update the GraphQL URL:

- Local custom port: `http://localhost:8080/graphql`
- Remote server: `http://192.168.1.100:9999/graphql`
- HTTPS: `https://mystash.example.com/graphql`

### Security Considerations

- The API key is stored in your browser's localStorage
- Use the password-masked input to prevent shoulder-surfing
- Only install this script from trusted sources
- Your API key grants full access to your Stash instance
If your Stash instance is on a different port or remote server:

```javascript
const STASH_GRAPHQL_URL = 'http://your-stash-server:port/graphql';
```

### Adding New Sites
Features

- **Visual Settings Panel** - Configure Stash URL and API key without editing code
- **Persistent Configuration** - Settings saved in browser localStorage
- **Secure API Key Storage** - Password-masked input with show/hide toggle
- **Collapsible UI** - Minimize the panel when not in use
- **Title Matching** - Auto-detects matching galleries by title
- **Diff Highlighting** - Shows what will be added/changed before updating
- **Multi-Site Support** - Works across nhentai, e-hentai, and exhentai

## Security Note

Your Stash API key is stored in your browser's localStorage. Keep your API key secure and only install this script from trusted source
1. Add a new configuration object in `SITE_CONFIGS`
2. Implement `getTags()`, `getTitle()`, `getDate()`, `getStudio()` functions
3. Add the site to the `@match` directive

## Security Note

The script requires your Stash API key. Keep this secure and don't share your modified script with others.

## License

MIT License - see [LICENSE](../LICENSE) file for details

## Author

Created by ferret-terref
