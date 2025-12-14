# Gallery → Stash Updater (Multi-Site)

Update galleries in Stash with metadata from nhentai, e-hentai, exhentai, and more. Automatically extracts title, tags, date, and other metadata to keep your Stash library organized.

## Features

- **Visual Settings Panel** - Configure Stash URL and API key without editing code
- **Automatic Gallery Detection** - Three ways to identify galleries: URL parameter, title matching, or manual entry
- **Smart Title Matching** - Auto-searches Stash library and suggests matching galleries
- **Stash Script Integration** - Works seamlessly with Stash Gallery URL Opener for one-click workflow
- **Persistent Configuration** - Settings saved in browser localStorage
- **Secure API Key Storage** - Password-masked input with show/hide toggle
- **Collapsible UI** - Minimize the panel when not in use
- **Diff Highlighting** - Shows what will be added/changed before updating
- **Multi-Site Support** - Works across nhentai, e-hentai, and exhentai
- **Complete Metadata** - Imports title, tags, date, studio/organization info
- **Artist & Character Tags** - Properly prefixes artist, character, parody, and other special tags
- **One-Click Updates** - Single button to update gallery in Stash
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

### Automatic Gallery Detection

The script automatically detects and matches Stash galleries in three ways:

#### 1. Auto-Append from Stash Gallery URL Opener (Recommended)

If you use the [Stash Gallery URL Opener](stash-gallery-url-opener.md) script:
1. Open a gallery in Stash
2. Click the "Open" button next to a gallery URL
3. The gallery ID is automatically appended to the URL (`?stashGalleryId=123`)
4. The Stash Updater panel auto-populates with the gallery ID
5. Review the metadata and click "Update Stash"

#### 2. Auto-Match by Title

If you visit a gallery page without a gallery ID in the URL:
1. Visit any supported gallery site (nhentai, e-hentai, etc.)
2. The script scrapes the title from the page
3. It searches your Stash library for matching galleries by title
4. If a match is found (>80% similarity), the gallery ID field auto-populates
5. Review the comparison and click "Update Stash"

#### 3. Manual Gallery ID Entry

You can always manually specify which gallery to update:
1. Visit any supported gallery site
2. Enter the Stash gallery ID in the input field
3. The script loads the existing gallery data for comparison
4. Review the changes and click "Update Stash"

### Workflow Examples

**Example 1: Using Both Stash Scripts**
1. In Stash, open gallery #456
2. Click "Open" next to the nhentai URL
3. Browser opens `https://nhentai.net/g/123456/?stashGalleryId=456`
4. Stash Updater panel shows gallery ID 456 pre-filled
5. Click "Update Stash" to import metadata

**Example 2: Auto-Match by Title**
1. Browse to `https://nhentai.net/g/123456/`
2. Script searches Stash for a gallery with matching title
3. Finds gallery #456 with similar title (e.g., "My Gallery Title")
4. Gallery ID field auto-populates with 456
5. Click "Update Stash" to import metadata

**Example 3: Manual Entry**
1. Browse to `https://e-hentai.org/g/12345/abcdef/`
2. Type `789` in the Gallery ID field
3. Script loads gallery #789 data for comparison
4. Review the diff and click "Update Stash"

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

## Advanced Configuration

### Custom Stash URL

Use the Settings panel to configure different Stash instances:

- Local custom port: `http://localhost:8080/graphql`
- Remote server: `http://192.168.1.100:9999/graphql`
- HTTPS: `https://mystash.example.com/graphql`

### Adding New Sites

The script uses a site configuration system. To add support for a new site:

1. Add a new configuration object in `SITE_CONFIGS`
2. Implement `getTags()`, `getTitle()`, `getDate()`, `getStudio()` functions
3. Add the site to the `@match` directive

### Security Considerations

- The API key is stored in your browser's localStorage
- Use the password-masked input to prevent shoulder-surfing
- Only install this script from trusted sources
- Your API key grants full access to your Stash instance

## Troubleshooting

**Gallery ID not auto-populating?**
- Check that your Stash instance is running and accessible
- Verify the Stash URL in Settings is correct
- Ensure your API key is valid
- The title matching requires >80% similarity to auto-populate

**Button not appearing?**
- Check that you're on a supported site's gallery page
- Ensure your userscript manager is enabled

**Update failing?**
- Verify your Stash instance is running
- Check that the Stash GraphQL URL is correct in Settings
- Confirm the API key is valid in Settings
- Verify the gallery ID exists in Stash
- Check browser console for error messages

**Settings not saving?**
- Ensure localStorage is enabled in your browser
- Check that cookies/storage aren't being blocked for the site
- Try disabling strict tracking protection

**Tags not importing correctly?**
- Some sites may have different tag formats
- Check the browser console for parsing errors
- Tags may need manual review after import

**CORS errors?**
- Ensure Stash CORS settings allow requests from the source domains
- Check Stash security settings

## Security Note

Your Stash API key is stored in your browser's localStorage. Keep your API key secure and only install this script from trusted sources.

## License

MIT License - see [LICENSE](../LICENSE) file for details

## Author

Created by ferret-terref
