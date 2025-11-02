# Booru Search Extended

A powerful userscript that enhances tag searching on multiple booru image boards with an advanced tag builder interface.

<img width="315" height="863" alt="image" src="https://github.com/user-attachments/assets/67870f05-fa05-4c8b-8d12-2ada07c3828d" />

## Features

- **Visual Tag Builder** - Build complex search queries using an intuitive tree-based UI
- **Multi-Site Support** - Works seamlessly across 7+ major booru sites
- **Advanced Query Operators** - Support for AND, OR, NOT, fuzzy search, and wildcards
- **Favorites System** - Save and manage your frequently used search queries
- **Drag & Drop** - Reorder tags easily with drag and drop functionality
- **Query Parsing** - Import existing search queries and edit them visually
- **Persistent Storage** - Your tags and favorites are saved per-site using localStorage
- **Dark Theme** - Clean, modern dark interface that integrates with booru sites

## Supported Sites

- Rule34
- Gelbooru
- Danbooru
- Safebooru
- TBIB
- Xbooru
- Realbooru

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)

2. Click here to install: [booru-search-extended.user.js](https://github.com/ferret-terref/booru-search-extended/raw/refs/heads/main/booru-search-extended.user.js)

3. Your userscript manager will prompt you to install - click "Install"

## Usage

### Basic Tag Building

1. Navigate to any supported booru site's search page
2. The tag builder will appear in the sidebar
3. Enter a tag name and click "Add" to add it to your query
4. Use the dropdown to select different operators (AND, OR, NOT, etc.)
5. Click "📤 Paste to input" to apply your query to the site's search

### Creating OR Groups

1. Select "OR group" from the dropdown
2. Enter multiple tags separated by spaces (e.g., `cat dog bird`)
3. This creates a group that matches any of those tags: `( cat ~ dog ~ bird )`

### Using Advanced Operators

- **NOT** - Exclude tags from results (adds `-` prefix)
- **FUZZY** - Approximate matching (adds `~` suffix)
- **WILDCARD** - Pattern matching (e.g., `cat*` matches `cat`, `catgirl`, etc.)

### Managing Favorites

1. Build a complex query you want to reuse
2. Click "💾 Save Current" and give it a name
3. Access saved queries via "⭐ View Favorites"
4. Click any favorite to instantly load that query

### Importing Existing Queries

1. Copy a complex query from the site's search box
2. Click "📋 Copy from input"
3. The query will be parsed and displayed in the tree view
4. Edit individual tags or reorder them as needed

### Drag and Drop Reordering

- Click and drag any tag to reorder it within the query
- Drop it on another tag to swap positions
- Useful for fine-tuning search priority

## Examples

### Example 1: Simple Multi-Tag Search

**Goal**: Find images with both `cat` and `sitting` tags

**Steps**:
1. Add tag: `cat`
2. Add tag: `sitting`
3. Result: `cat sitting`

### Example 2: OR Group Search

**Goal**: Find images with either `cat`, `dog`, or `bird`

**Steps**:
1. Select "OR group" from dropdown
2. Enter: `cat dog bird`
3. Result: `( cat ~ dog ~ bird )`

### Example 3: Complex Query with Exclusions

**Goal**: Find cats or dogs, but exclude anything with "sleeping"

**Steps**:
1. Create OR group: `cat dog`
2. Add NOT tag: `sleeping`
3. Result: `( cat ~ dog ) -sleeping`

### Example 4: Fuzzy Search with Wildcards

**Goal**: Find variations of "anime" and anything starting with "girl"

**Steps**:
1. Select "FUZZY" and add: `anime`
2. Select "WILDCARD" and add: `girl*`
3. Result: `anime~ girl*`

### Example 5: Saving a Complex Search

**Goal**: Save a detailed character search for later use

**Steps**:
1. Build query: `( original_character ~ oc ) rating:safe -photo`
2. Click "💾 Save Current"
3. Name it: "Safe OC Art"
4. Load anytime from favorites

## Keyboard Shortcuts

- **Enter** - Add tag (when focused on tag input field)

## Tips & Tricks

- Use the toggle button to hide/show the builder when not needed
- Favorites are saved per-site, so organize differently for each booru
- The preview always shows exactly what will be searched
- Edit tags in-place by clicking the ✏️ button
- Use the search filter in favorites to quickly find saved queries
- Tags can be moved up/down with ↑/↓ buttons for precise ordering

## Troubleshooting

**Builder not appearing?**
- Check that you're on a supported site
- Try refreshing the page
- Verify your userscript manager is enabled

**Query not copying to search?**
- Make sure you clicked "📤 Paste to input"
- Some sites may require you to press Enter after pasting

**Tags not saving?**
- Check that localStorage is enabled in your browser
- Some privacy extensions may block storage

## Contributing

Issues and pull requests are welcome! Please check the [issues page](https://github.com/ferret-terref/booru-search-extended/issues) before submitting.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Created by ferret-terref
