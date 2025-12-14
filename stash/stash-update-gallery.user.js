// ==UserScript==
// @name         Gallery → Stash Updater (Multi-Site)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Update galleries in Stash with metadata for nhentai, e-hentai, exhentai, and more
// @author       ferret-terref
// @license      MIT
// @homepageURL  https://github.com/ferret-terref/ferret-userscripts
// @updateURL    https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/stash/stash-update-gallery.user.js
// @downloadURL  https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/stash/stash-update-gallery.user.js
// @match        *://nhentai.net/g/*
// @match        *://nhentai.to/g/*
// @match        *://e-hentai.org/g/*/*
// @match        *://exhentai.org/g/*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STASH_GRAPHQL_URL = 'http://localhost:9999/graphql';
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJhZG1pbiIsInN1YiI6IkFQSUtleSIsImlhdCI6MTc2NTE1ODQyMX0.Lh1BOdMuGOlbeT4LZh8KaBDrlsQinXtmhmV14tRm4aM';
  const STASH_GALLERY_ID_PARAM = 'stashGalleryId';

  // === Site Configuration System ===

  const SITE_CONFIGS = {
    'nhentai.net': {
      name: 'nhentai.net',
      getTags: function () {
        const sectionMap = {
          'Tags:': '',
          'Artists:': 'Artist: ',
          'Groups:': 'Group: ',
          'Languages:': 'Language: ',
          'Categories:': 'Category: ',
          'Parodies:': 'Parody: ',
          'Characters:': 'Character: '
        };
        const tags = [];
        const section = document.querySelector('#tags');
        if (!section) return tags;
        section.querySelectorAll('.tag-container').forEach(container => {
          const text = container.innerText.trim();
          const prefix = Object.entries(sectionMap).find(([key]) => text.startsWith(key))?. [1];
          if (prefix === undefined) return;
          container.querySelectorAll('span span.name').forEach(nameSpan => {
            const name = nameSpan.innerText.trim();
            if (name) tags.push(prefix + name);
          });
        });
        return tags;
      },
      getTitle: function () {
        const h1 = document.querySelector('h1.title');
        return h1 ? h1.innerText.trim() : '';
      },
      getDescription: function () {
        // nhentai.net has Japanese title in h2.title
        const h2 = document.querySelector('h2.title');
        return h2 ? h2.innerText.trim() : '';
      }
    },

    'nhentai.to': {
      name: 'nhentai.to',
      getTags: function () {
        const sectionMap = {
          'Tags': '',
          'Artists': 'Artist: ',
          'Groups': 'Group: ',
          'Languages': 'Language: ',
          'Categories': 'Category: ',
          'Parodies': 'Parody: ',
          'Characters': 'Character: '
        };
        const tags = [];
        const section = document.querySelector('#tags');
        if (!section) return tags;
        section.querySelectorAll('.tag-container.field-name').forEach(container => {
          const sectionName = container.childNodes[0]?.textContent?.trim();
          const prefix = sectionMap[sectionName];
          if (prefix === undefined) return;
          container.querySelectorAll('span.tags a.tag span.name').forEach(nameSpan => {
            const name = nameSpan.innerText.trim();
            if (name) tags.push(prefix + name);
          });
        });
        return tags;
      },
      getTitle: function () {
        const h1 = document.querySelector('#info > h1');
        return h1 ? h1.innerText.trim() : '';
      },
      getDescription: function () {
        // nhentai.to has Japanese title in h2
        const h2 = document.querySelector('#info > h2');
        return h2 ? h2.innerText.trim() : '';
      }
    },

    'e-hentai.org': {
      name: 'e-hentai.org',
      getTags: function () {
        const tags = [];
        const taglistDiv = document.querySelector('#taglist');
        if (!taglistDiv) return tags;

        // E-Hentai has rows like: <tr><td class="tc">artist:</td><td>...</td></tr>
        taglistDiv.querySelectorAll('tr').forEach(row => {
          const categoryCell = row.querySelector('td.tc');
          if (!categoryCell) return;

          const category = categoryCell.textContent.trim().replace(':', '');
          let prefix = '';

          // Map e-hentai categories to prefixes
          const categoryMap = {
            'artist': 'Artist: ',
            'group': 'Group: ',
            'parody': 'Parody: ',
            'character': 'Character: ',
            'male': 'Male: ',
            'female': 'Female: ',
            'mixed': 'Mixed: ',
            'other': 'Other: ',
            'language': 'Language: ',
            'reclass': 'Category: ',
            'temp': ''
          };

          prefix = categoryMap[category] || '';

          // Get all tag links in the second cell
          const tagsCell = row.querySelectorAll('td')[1];
          if (tagsCell) {
            tagsCell.querySelectorAll('a').forEach(link => {
              const tagText = link.textContent.trim();
              if (tagText) tags.push(prefix + tagText);
            });
          }
        });
        return tags;
      },
      getTitle: function () {
        const h1 = document.querySelector('#gn');
        return h1 ? h1.innerText.trim() : '';
      },
      getDescription: function () {
        // e-hentai has Japanese title in #gj
        const gj = document.querySelector('#gj');
        return gj ? gj.innerText.trim() : '';
      }
    },

    'exhentai.org': {
      name: 'exhentai.org',
      getTags: function () {
        // ExHentai uses the same structure as E-Hentai
        const tags = [];
        const taglistDiv = document.querySelector('#taglist');
        if (!taglistDiv) return tags;

        taglistDiv.querySelectorAll('tr').forEach(row => {
          const categoryCell = row.querySelector('td.tc');
          if (!categoryCell) return;

          const category = categoryCell.textContent.trim().replace(':', '');
          let prefix = '';

          const categoryMap = {
            'artist': 'Artist: ',
            'group': 'Group: ',
            'parody': 'Parody: ',
            'character': 'Character: ',
            'male': 'Male: ',
            'female': 'Female: ',
            'mixed': 'Mixed: ',
            'other': 'Other: ',
            'language': 'Language: ',
            'reclass': 'Category: ',
            'temp': ''
          };

          prefix = categoryMap[category] || '';

          const tagsCell = row.querySelectorAll('td')[1];
          if (tagsCell) {
            tagsCell.querySelectorAll('a').forEach(link => {
              const tagText = link.textContent.trim();
              if (tagText) tags.push(prefix + tagText);
            });
          }
        });
        return tags;
      },
      getTitle: function () {
        const h1 = document.querySelector('#gn');
        return h1 ? h1.innerText.trim() : '';
      },
      getDescription: function () {
        // exhentai has Japanese title in #gj
        const gj = document.querySelector('#gj');
        return gj ? gj.innerText.trim() : '';
      }
    }
  };

  // === Detect current site ===
  const hostname = window.location.hostname;
  const currentSiteConfig = SITE_CONFIGS[hostname];

  if (!currentSiteConfig) {
    console.error(`[Stash Updater] No configuration found for site: ${hostname}`);
    return;
  }

  console.log(`[Stash Updater] Loaded configuration for: ${currentSiteConfig.name}`);

  // === Utility functions ===

  // Get current URL without the stashGalleryId query parameter
  function getCleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(STASH_GALLERY_ID_PARAM);
    return url.toString();
  }

  async function fetchAllTags() {
    const query = `
            query {
                findTags(
                    filter: { q: "", page: 1, per_page: 10000, sort: "name", direction: ASC }
                    tag_filter: {}
                ) {
                    tags { id name }
                }
            }
        `;
    const resp = await fetch(STASH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        query
      })
    });
    const data = await resp.json();
    if (!data?.data?.findTags?.tags) return {};
    const map = {};
    data.data.findTags.tags.forEach(tag => map[tag.name.toLowerCase()] = tag.id);
    return map;
  }

  async function createTag(name) {
    const mutation = `
            mutation TagCreate($input: TagCreateInput!) {
                tagCreate(input: $input) { id name }
            }
        `;
    const variables = {
      input: {
        name,
        sort_name: "",
        aliases: [],
        description: "",
        parent_ids: [],
        child_ids: [],
        ignore_auto_tag: false
      }
    };
    const resp = await fetch(STASH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });
    const data = await resp.json();
    if (data?.errors) {
      if (data.errors.find(e => e.message.includes('already exists'))) {
        const tagMap = await fetchAllTags();
        return tagMap[name.toLowerCase()];
      }
      console.error('Failed to create tag:', data.errors);
      return null;
    }
    return data?.data?.tagCreate?.id || null;
  }

  async function getOrCreateTag(tagName, tagMap) {
    const key = tagName.toLowerCase();
    if (tagMap[key]) return tagMap[key];
    const id = await createTag(tagName);
    if (id) tagMap[key] = id;
    return id;
  }

  async function fetchGalleryInfo(galleryId) {
    const query = `
            query FindGallery($id: ID!) {
                findGallery(id: $id) {
                    id
                    title
                    details
                    urls
                    tags {
                        id
                        name
                    }
                }
            }
        `;
    const resp = await fetch(STASH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        query,
        variables: {
          id: galleryId
        }
      })
    });
    const data = await resp.json();
    if (data?.errors) {
      throw new Error(data.errors[0]?.message || 'Failed to fetch gallery');
    }
    return data?.data?.findGallery || null;
  }

  async function searchGalleriesByTitle(searchTitle) {
    const query = `
            query FindGalleries($filter: FindFilterType) {
                findGalleries(filter: $filter) {
                    count
                    galleries {
                        id
                        title
                        details
                    }
                }
            }
        `;
    const variables = {
      filter: {
        q: searchTitle,
        page: 1,
        per_page: 100,
        sort: "title",
        direction: "ASC"
      }
    };
    const resp = await fetch(STASH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    const data = await resp.json();
    return data?.data?.findGalleries?.galleries || [];
  }

  // Simple similarity check for titles
  function calculateTitleSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple word overlap check
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  async function findMatchingGallery(scrapedTitle) {
    const galleries = await searchGalleriesByTitle(scrapedTitle);

    if (galleries.length === 0) return null;

    // Find gallery with highest title similarity
    let bestMatch = null;
    let bestScore = 0;

    for (const gallery of galleries) {
      const similarity = calculateTitleSimilarity(scrapedTitle, gallery.title);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = gallery;
      }
    }

    // Only auto-populate if similarity is high enough (> 0.8)
    if (bestScore > 0.8) {
      return bestMatch;
    }

    return null;
  }

  // === Main update function ===
  async function updateGallery(galleryId) {
    const scrapedTags = currentSiteConfig.getTags();
    const title = currentSiteConfig.getTitle();
    const description = currentSiteConfig.getDescription ? currentSiteConfig.getDescription() : '';
    if (!scrapedTags.length && !title) throw new Error('No tags or title found.');

    const tagMap = await fetchAllTags();
    const tagIds = [];
    for (const tagName of scrapedTags) {
      const id = await getOrCreateTag(tagName, tagMap);
      if (id) tagIds.push(id);
    }
    if (!tagIds.length && !title) throw new Error('No valid tags or title to update.');

    // Build URLs array - include existing URLs plus current page URL (without stashGalleryId param)
    const currentUrl = getCleanUrl();
    const existingUrls = currentGalleryInfo?.urls || [];
    const urlsSet = new Set(existingUrls);
    urlsSet.add(currentUrl);
    const urls = Array.from(urlsSet);

    const mutation = `
            mutation GalleryUpdate($input: GalleryUpdateInput!) {
                galleryUpdate(input: $input) {
                    id title details tags { id name } urls
                }
            }
        `;
    const variables = {
      input: {
        id: galleryId,
        title: title || undefined,
        details: description || undefined,
        tag_ids: tagIds,
        urls: urls
      }
    };
    const resp = await fetch(STASH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': API_KEY
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });
    const data = await resp.json();
    if (data?.errors) throw new Error(JSON.stringify(data.errors));
    return data.data.galleryUpdate;
  }

  // === Persistent UI Panel ===
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.top = '10px';
  panel.style.right = '10px';
  panel.style.zIndex = 9999;
  panel.style.background = '#222';
  panel.style.color = '#fff';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
  panel.style.fontFamily = 'sans-serif';
  panel.style.width = '300px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '5px';

  const expandedIcon = '▲';
  const collapsedIcon = '▼';

  // Top bar with input and toggle
  const topBar = document.createElement('div');
  topBar.style.display = 'flex';
  topBar.style.flexDirection = 'row';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'center';
  topBar.style.gap = '1em';
  panel.appendChild(topBar);

  const galleryInput = document.createElement('input');
  galleryInput.type = 'number';
  galleryInput.placeholder = 'Gallery ID';
  galleryInput.style.width = 'auto';
  galleryInput.style.padding = '5px';
  galleryInput.style.borderRadius = '3px';
  galleryInput.style.border = '1px solid #555';
  galleryInput.style.flexGrow = '1';

  // Check for stashGalleryId in URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const galleryIdFromUrl = urlParams.get(STASH_GALLERY_ID_PARAM);
  galleryInput.value = galleryIdFromUrl || '';

  topBar.appendChild(galleryInput);

  const labelSpacer = document.createElement('div');
  labelSpacer.style.width = 'auto';
  labelSpacer.innerText = 'Stash Updater';
  galleryInput.style.flexGrow = '1';
  topBar.appendChild(labelSpacer);

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = expandedIcon;
  toggleBtn.style.padding = '5px';
  toggleBtn.style.border = 'none';
  toggleBtn.style.borderRadius = '3px';
  toggleBtn.style.background = '#333';
  toggleBtn.style.color = '#fff';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.fontSize = '12px';
  toggleBtn.style.width = '30px';
  toggleBtn.style.alignSelf = 'flex-end';
  toggleBtn.style.width = '30px';
  topBar.appendChild(toggleBtn);

  // Append top bar to panel
  panel.appendChild(topBar);

  // Everything else goes in main content area
  const mainContent = document.createElement('div');

  // Info display area
  const infoArea = document.createElement('div');
  infoArea.style.fontSize = '11px';
  infoArea.style.maxHeight = '300px';
  infoArea.style.overflowY = 'auto';
  infoArea.style.background = '#333';
  infoArea.style.padding = '5px';
  infoArea.style.borderRadius = '3px';
  infoArea.style.display = 'none';
  infoArea.style.marginBottom = '5px';
  mainContent.appendChild(infoArea);

  const updateBtn = document.createElement('button');
  updateBtn.innerText = 'Update Stash';
  updateBtn.style.padding = '5px';
  updateBtn.style.border = 'none';
  updateBtn.style.borderRadius = '3px';
  updateBtn.style.background = '#4CAF50';
  updateBtn.style.color = '#fff';
  updateBtn.style.cursor = 'pointer';
  updateBtn.style.width = '100%';
  mainContent.appendChild(updateBtn);

  const status = document.createElement('div');
  status.style.fontSize = '12px';
  status.style.minHeight = '18px';
  mainContent.appendChild(status);

  panel.appendChild(mainContent);

  function toggleElements(showHide) {
    labelSpacer.style.display = showHide ? 'none' : 'block';
    galleryInput.style.visibility = showHide ? 'visible' : 'hidden';
    mainContent.style.display = showHide ? 'block' : 'none';
  }

  // Toggle functionality with state persistence
  let isExpanded = localStorage.getItem('stashUpdaterExpanded') !== 'false';

  toggleBtn.innerText = isExpanded ? expandedIcon : collapsedIcon;

  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    toggleElements(isExpanded);
    toggleBtn.innerText = isExpanded ? expandedIcon : collapsedIcon;
    localStorage.setItem('stashUpdaterExpanded', isExpanded);
  });

  document.body.appendChild(panel);
  toggleElements(isExpanded);

  // Store the current gallery info for comparison
  let currentGalleryInfo = null;

  // Generate warning HTML for title mismatches
  function getTitleWarningHtml(scrapedTitle, existingTitle) {
    if (!existingTitle || !scrapedTitle) return '';

    const similarity = calculateTitleSimilarity(scrapedTitle, existingTitle);

    if (similarity < 0.5) {
      return `
        <div style="background: #f44336; color: #fff; padding: 5px; border-radius: 3px; margin-bottom: 5px;">
          <strong>⚠️ WARNING: Title Mismatch!</strong><br>
          <span style="font-size: 10px;">Existing: ${existingTitle}</span><br>
          <span style="font-size: 10px;">Scraped: ${scrapedTitle}</span>
        </div>
      `;
    } else if (similarity < 0.8) {
      return `
        <div style="background: #ff9800; color: #fff; padding: 5px; border-radius: 3px; margin-bottom: 5px;">
          <strong>⚠️ CAUTION: Title may not match</strong><br>
          <span style="font-size: 10px;">Existing: ${existingTitle}</span><br>
          <span style="font-size: 10px;">Scraped: ${scrapedTitle}</span>
        </div>
      `;
    }

    return '';
  }

  // Check if title mismatch requires confirmation
  function checkTitleMismatch(scrapedTitle, existingTitle) {
    if (!existingTitle || !scrapedTitle) return true;

    const similarity = calculateTitleSimilarity(scrapedTitle, existingTitle);

    if (similarity < 0.5) {
      return confirm(
        `⚠️ TITLE MISMATCH WARNING!\n\n` +
        `Existing: ${existingTitle}\n` +
        `Scraped: ${scrapedTitle}\n\n` +
        `These titles appear to be for different galleries. Continue anyway?`
      );
    }

    return true;
  }

  // Unified helper to display fields with diff highlighting
  // Accepts arrays for existingValues and scrapedValues to handle single or multiple items
  function createFieldDisplay(label, existingValues, scrapedValues, isComparison = true) {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    div.style.textAlign = 'left';
    div.style.padding = '5px';
    div.style.border = '1px solid #444';
    div.style.borderRadius = '3px';

    // Normalize inputs to arrays
    const existing = Array.isArray(existingValues) ? existingValues : [existingValues || ''];
    const scraped = Array.isArray(scrapedValues) ? scrapedValues : [scrapedValues || ''];

    // Filter out empty values
    const existingFiltered = existing.filter(v => v && v.toString().trim());
    const scrapedFiltered = scraped.filter(v => v && v.toString().trim());

    // For comparison, normalize to lowercase for case-insensitive matching
    const existingLower = existingFiltered.map(v => v.toString().toLowerCase());
    const scrapedLower = scrapedFiltered.map(v => v.toString().toLowerCase());

    if (!isComparison) {
      // Not comparing - show scraped values in white
      if (scrapedFiltered.length === 0) {
        div.innerHTML = `
          <div style="text-align: left;"><strong>${label}:</strong></div>
          <div style="font-size: 10px; color: #fff; margin-left: 5px; text-align: left;">(none)</div>
        `;
      } else if (scrapedFiltered.length === 1) {
        div.innerHTML = `
          <div style="text-align: left;"><strong>${label}:</strong></div>
          <div style="font-size: 10px; color: #fff; margin-left: 5px; text-align: left;">${scrapedFiltered[0]}</div>
        `;
      } else {
        const itemsHtml = scrapedFiltered.map(item => `<div style="color: #fff;">${item}</div>`).join('');
        div.innerHTML = `
          <div style="text-align: left;"><strong>${label}:</strong></div>
          <div style="font-size: 10px; margin-left: 5px; text-align: left;">${itemsHtml}</div>
        `;
      }
    } else if (existingFiltered.length === 0 && scrapedFiltered.length === 0) {
      // No values at all
      div.innerHTML = `
        <div style="text-align: left;"><strong>${label}:</strong></div>
        <div style="font-size: 10px; color: #ccc; margin-left: 5px; text-align: left;">(none)</div>
      `;
    } else if (existingFiltered.length === 1 && scrapedFiltered.length === 1) {
      // Single value comparison
      const isDifferent = existingLower[0] !== scrapedLower[0];
      if (!isDifferent) {
        div.innerHTML = `
          <div style="text-align: left;"><strong>${label}:</strong></div>
          <div style="font-size: 10px; color: #ccc; margin-left: 5px; text-align: left;">${existingFiltered[0]}</div>
        `;
      } else {
        div.innerHTML = `
          <div style="text-align: left;"><strong>${label}:</strong></div>
          <div style="font-size: 10px; margin-left: 5px; text-align: left;">
            <div style="color: #ff6b6b;">− ${existingFiltered[0]}</div>
            <div style="color: #69db7c;">+ ${scrapedFiltered[0]}</div>
          </div>
        `;
      }
    } else {
      // Multiple values - show existing items and mark new scraped items with +
      const itemsHtml = [];

      // Show existing items in gray
      existingFiltered.forEach(item => {
        itemsHtml.push(`<div style="color: #ccc;">${item}</div>`);
      });

      // Show new scraped items with + marker
      scrapedFiltered.forEach(item => {
        const itemLower = item.toString().toLowerCase();
        if (!existingLower.includes(itemLower)) {
          itemsHtml.push(`<div style="color: #69db7c;">+ ${item}</div>`);
        }
      });

      div.innerHTML = `
        <div style="text-align: left;"><strong>${label}:</strong></div>
        <div style="font-size: 10px; margin-left: 5px; text-align: left;">${itemsHtml.join('')}</div>
      `;
    }

    return div;
  }

  // Fetch and display gallery info when ID changes
  let debounceTimer;
  galleryInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const galleryId = galleryInput.value.trim();

    if (!galleryId) {
      infoArea.style.display = 'none';
      galleryInput.style.borderColor = '#555';
      currentGalleryInfo = null;
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        status.innerText = '⏳ Fetching gallery info...';
        const gallery = await fetchGalleryInfo(galleryId);

        if (gallery) {
          currentGalleryInfo = gallery;
          galleryInput.style.borderColor = '#4CAF50';
          renderGalleryDisplay(gallery);
        } else {
          currentGalleryInfo = null;
          galleryInput.style.borderColor = '#f44336';
          infoArea.style.display = 'none';
          status.innerText = '❌ Gallery not found';
        }
      } catch (err) {
        console.error(err);
        currentGalleryInfo = null;
        galleryInput.style.borderColor = '#f44336';
        infoArea.style.display = 'none';
        status.innerText = '❌ ' + (err.message || 'Error fetching gallery');
      }
    }, 500);
  });

  // Unified render function for displaying gallery data
  function renderGalleryDisplay(galleryInfo = null, showWarning = true) {
    try {
      const scrapedTags = currentSiteConfig.getTags();
      const scrapedTitle = currentSiteConfig.getTitle();
      const scrapedDescription = currentSiteConfig.getDescription ? currentSiteConfig.getDescription() : '';
      const scrapedUrl = getCleanUrl();

      const isComparison = galleryInfo !== null;

      infoArea.style.display = 'block';
      infoArea.innerHTML = '';

      // Show title warning if comparing and requested
      if (isComparison && showWarning) {
        const warningHtml = getTitleWarningHtml(scrapedTitle, galleryInfo.title);
        if (warningHtml) {
          infoArea.innerHTML = warningHtml;
          const hr = document.createElement('hr');
          hr.style.border = 'none';
          hr.style.borderTop = '1px solid #555';
          hr.style.margin = '5px 0';
          infoArea.appendChild(hr);
        }
      }

      // Render fields
      const existingTitle = galleryInfo?.title || '';
      const existingDescription = galleryInfo?.details || '';
      const existingUrls = galleryInfo?.urls || [];
      const existingTagNames = galleryInfo?.tags?.map(t => t.name) || [];

      infoArea.appendChild(createFieldDisplay('Title', existingTitle, scrapedTitle, isComparison));
      infoArea.appendChild(createFieldDisplay('Description', existingDescription, scrapedDescription, isComparison));
      infoArea.appendChild(createFieldDisplay('URL(s)', existingUrls, scrapedUrl, isComparison));
      infoArea.appendChild(createFieldDisplay('Tags', existingTagNames, scrapedTags, isComparison));

      // Update status
      if (isComparison) {
        status.innerText = '✅ Gallery found';
      } else {
        status.innerText = `📋 Found ${scrapedTags.length} tags on page`;
      }
    } catch (err) {
      console.error(err);
      status.innerText = '❌ Error: ' + (err.message || err);
    }
  }

  // Show scraped data immediately on load, or load comparison if galleryId present
  if (galleryIdFromUrl) {
    // Trigger the input event to load the gallery comparison
    galleryInput.dispatchEvent(new Event('input'));
  } else {
    // Try to auto-populate gallery ID by searching for matching title
    (async function autoPopulateGalleryId() {
      const scrapedTitle = currentSiteConfig.getTitle();
      if (!scrapedTitle) {
        renderGalleryDisplay();
        return;
      }

      status.innerText = '🔍 Searching for matching gallery...';
      try {
        const match = await findMatchingGallery(scrapedTitle);

        if (match) {
          galleryInput.value = match.id;
          galleryInput.dispatchEvent(new Event('input'));
        } else {
          renderGalleryDisplay();
        }
      } catch (err) {
        console.error('Auto-search error:', err);
        renderGalleryDisplay();
      }
    })();
  }

  // Update button
  updateBtn.addEventListener('click', async () => {
    const galleryId = galleryInput.value.trim();
    if (!galleryId) {
      status.innerText = '❌ Please enter a gallery ID.';
      return;
    }

    // Check for title mismatch before updating
    const scrapedTitle = currentSiteConfig.getTitle();
    if (!checkTitleMismatch(scrapedTitle, currentGalleryInfo?.title)) {
      status.innerText = '❌ Update cancelled - title mismatch';
      return;
    }

    // Confirmation dialog
    if (!confirm(`Update gallery ${galleryId} with scraped data from this page?`)) {
      status.innerText = '❌ Update cancelled';
      return;
    }

    status.innerText = '⏳ Updating...';
    try {
      const result = await updateGallery(galleryId);

      // Clear the input and show the updated gallery data
      galleryInput.value = '';
      currentGalleryInfo = result;
      galleryInput.style.borderColor = '#555';

      // Display the updated gallery data (no warning needed post-update)
      renderGalleryDisplay(result, false);
      status.innerText = `✅ Updated gallery ${result.id} with ${result.tags.length} tags.`;
      console.log('Updated gallery data:', result);
    } catch (err) {
      console.error(err);
      status.innerText = '❌ Error: ' + (err.message || err);
    }
  });

})();