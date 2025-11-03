// ==UserScript==
// @name         Booru Search Extended
// @version      1.3
// @description  Advanced tag builder with tree-based UI and robust parsing - works on multiple booru sites
// @author       ferret-terref
// @homepageURL  https://github.com/ferret-terref/booru-search-extended
// @updateURL    https://github.com/ferret-terref/booru-search-extended/raw/refs/heads/main/booru-search-extended.user.js
// @downloadURL  https://github.com/ferret-terref/booru-search-extended/raw/refs/heads/main/booru-search-extended.user.js
// @license      MIT
// @match        https://rule34.xxx/index.php?page=post&s=list*
// @match        https://gelbooru.com/index.php?page=post&s=list*
// @match        https://danbooru.donmai.us/posts?*
// @match        https://danbooru.donmai.us
// @match        https://safebooru.org/index.php?page=post&s=list*
// @match        https://tbib.org/index.php?page=post&s=list*
// @match        https://xbooru.com/index.php?page=post&s=list*
// @match        https://realbooru.com/index.php?page=post&s=list*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const STORAGE_KEY = 'tqb-tags';
  const VISIBILITY_KEY = 'tqb-visibility';
  const THEME_KEY = 'tqb-theme';
  const COMPACT_KEY = 'tqb-compact';
  const AUTO_SUBMIT_KEY = 'tqb-auto-submit';
  const SHOW_PREVIEW_KEY = 'tqb-show-preview';

  // Site configuration for different booru sites
  const SITE_CONFIGS = {
    'rule34.xxx': {
      name: 'Rule34',
      containerSelector: '.tag-search',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        .content-post { max-width: calc(100% - 320px) !important; }
        #tag-sidebar { min-width: 300px !important; width: 300px !important; }
        .tag-search { min-width: 280px !important; }
      `
    },
    'gelbooru.com': {
      name: 'Gelbooru',
      containerSelector: 'span.sm-hidden',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        .content { max-width: calc(100% - 320px) !important; }
        .sidebar { min-width: 300px !important; width: 300px !important; }
        .sm-hidden { min-width: 280px !important; }
      `
    },
    'danbooru.donmai.us': {
      name: 'Danbooru',
      containerSelector: '#search-box',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.ui-autocomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        #content { margin-right: 320px !important; }
        #sidebar { width: 300px !important; min-width: 300px !important; }
        #search-box { min-width: 280px !important; }
      `
    },
    'safebooru.org': {
      name: 'Safebooru',
      containerSelector: '.tag-search',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        .sidebar, .tag-search {
          min-width: 280px !important;
        }
      `
    },
    'tbib.org': {
      name: 'TBIB',
      containerSelector: 'div.sidebar > div',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        .sidebar { min-width: 280px !important; }
      `
    },
    'xbooru.com': {
      name: 'Xbooru',
      containerSelector: '.tag-search',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: true, // true = append to end, false = prepend to start
      sidebarCSS: `
        .content-post { max-width: calc(100% - 320px) !important; }
        #tag-sidebar { min-width: 300px !important; width: 300px !important; }
        .sidebar, .tag-search {
          min-width: 280px !important;
        }
      `
    },
    'realbooru.com': {
      name: 'Realbooru',
      containerSelector: '#tag-sidebar',
      inputSelector: 'input[name="tags"]',
      autocompleteContainer: '.awesomplete',
      appendToContainer: false, // true = append to end, false = prepend to start
      sidebarCSS: `
        .content-post { max-width: calc(100% - 320px) !important; }
        #tag-sidebar, .flex_side_items { min-width: 300px !important; width: 300px !important; }
        .tag-search { min-width: 280px !important; }
        .flex_side_items { padding: unset !important; }
      `
    }
  };

  /**
   * Get configuration for the current booru site
   * @returns {Object|null} Site configuration object or null if unsupported
   */
  function getCurrentSiteConfig() {
    const hostname = window.location.hostname;
    const config = SITE_CONFIGS[hostname];

    if (!config) {
      console.warn(`Tag Builder: Unsupported site ${hostname}`);
      return null;
    }

    return {
      ...config,
      hostname
    };
  }

  /**
   * Create site-specific storage key by appending hostname
   * @param {string} baseKey - Base storage key
   * @returns {string} Site-specific storage key
   */
  function getSiteStorageKey(baseKey) {
    const config = getCurrentSiteConfig();
    if (!config) return baseKey;
    return `${baseKey}-${config.hostname}`;
  }

  /**
   * Inject CSS to widen sidebar for better tag builder display
   * @param {Object} config - Site configuration object
   */
  function injectSiteCSS(config) {
    if (!config.sidebarCSS) return;

    const style = document.createElement('style');
    style.id = 'tqb-site-styles';
    style.textContent = config.sidebarCSS;
    document.head.appendChild(style);

    console.log(`Tag Builder: Injected sidebar CSS for ${config.name}`);
  }

  /**
   * Wait for multiple DOM elements to exist before executing callback
   * @param {string[]} selectors - Array of CSS selectors
   * @param {Function} callback - Function to call with found elements
   */
  const waitForElements = (selectors, callback) => {
    const found = selectors.map(s => document.querySelector(s));
    if (found.every(Boolean)) return callback(...found);
    const obs = new MutationObserver(() => {
      const els = selectors.map(s => document.querySelector(s));
      if (els.every(Boolean)) {
        obs.disconnect();
        callback(...els);
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  /**
   * Generate CSS styles for the tag builder
   * @returns {string} CSS stylesheet content
   */
  function generateCSS() {
    return `
        :root {
          --tqb-bg-primary: #1e293b;
          --tqb-bg-secondary: #0f172a;
          --tqb-bg-tertiary: #374151;
          --tqb-bg-input: #1f2937;
          --tqb-bg-hover: #4b5563;
          --tqb-text-primary: #f8fafc;
          --tqb-text-secondary: #9ca3af;
          --tqb-text-tertiary: #6b7280;
          --tqb-accent-green: #10b981;
          --tqb-accent-green-hover: #059669;
          --tqb-accent-amber: #fbbf24;
          --tqb-accent-amber-hover: #f59e0b;
          --tqb-accent-blue: #60a5fa;
          --tqb-accent-blue-dark: #1e40af;
          --tqb-accent-red: #dc2626;
          --tqb-accent-red-hover: #b91c1c;
          --tqb-border-color: #374151;
          --tqb-border-color-alt: #475569;
          --tqb-radius-sm: .3rem;
          --tqb-radius-md: .5rem;
          --tqb-radius-lg: .8rem;
          --tqb-font-sm: .8rem;
          --tqb-font-md: .9rem;
          --tqb-font-lg: 1.1rem;
          --tqb-spacing-sm: .3rem;
          --tqb-spacing-md: .5rem;
          --tqb-spacing-lg: 1rem;
        }
        /* Light theme */
        [data-tqb-theme="light"] {
          --tqb-bg-primary: #ffffff;
          --tqb-bg-secondary: #f3f4f6;
          --tqb-bg-tertiary: #e5e7eb;
          --tqb-bg-input: #ffffff;
          --tqb-bg-hover: #d1d5db;
          --tqb-text-primary: #111827;
          --tqb-text-secondary: #6b7280;
          --tqb-text-tertiary: #9ca3af;
          --tqb-border-color: #d1d5db;
          --tqb-border-color-alt: #9ca3af;
        }
        /* Compact mode */
        [data-tqb-compact="true"] {
          --tqb-spacing-sm: .2rem;
          --tqb-spacing-md: .35rem;
          --tqb-spacing-lg: .65rem;
          --tqb-font-sm: .75rem;
          --tqb-font-md: .85rem;
          --tqb-font-lg: 1rem;
        }
        /* Global */
        button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--tqb-accent-blue); outline-offset: 2px; }
        .tqb-favorites-list::-webkit-scrollbar, .tqb-modal::-webkit-scrollbar { width: 8px; }
        .tqb-favorites-list::-webkit-scrollbar-track, .tqb-modal::-webkit-scrollbar-track { background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-sm); }
        .tqb-favorites-list::-webkit-scrollbar-thumb, .tqb-modal::-webkit-scrollbar-thumb { background: var(--tqb-bg-tertiary); border-radius: var(--tqb-radius-sm); }
        .tqb-favorites-list::-webkit-scrollbar-thumb:hover, .tqb-modal::-webkit-scrollbar-thumb:hover { background: var(--tqb-bg-hover); }
        /* Builder */
        .tqb-toggle-btn { background: var(--tqb-bg-primary); color: var(--tqb-text-primary); border: none; border-radius: 6px; padding: 8px 14px; font-size: var(--tqb-font-lg); cursor: pointer; box-shadow: 0 2px 8px #0003; margin: var(--tqb-spacing-lg) 0 8px; display: block; width: 100%; }
        .tqb-builder { background: var(--tqb-bg-primary); color: var(--tqb-text-primary); padding: var(--tqb-spacing-lg); border-radius: var(--tqb-radius-lg); font-family: system-ui; font-size: var(--tqb-font-md); margin-bottom: var(--tqb-spacing-lg); transition: opacity 0.2s, visibility 0.2s; opacity: 1; visibility: visible; }
        .tqb-builder.tqb-hidden { opacity: 0; visibility: hidden; pointer-events: none; }
        /* Buttons */
        .tqb-header { display: grid; grid-template-columns: 1fr 1fr; gap: var(--tqb-spacing-sm); margin-bottom: var(--tqb-spacing-md); background: var(--tqb-bg-secondary); padding: var(--tqb-spacing-md); border-radius: var(--tqb-radius-md); }
        .tqb-header button { width: 100%; }
        .tqb-sync-btn, .tqb-clear-btn, .tqb-view-favorites-btn { border: none; border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md) var(--tqb-spacing-md); cursor: pointer; font-size: var(--tqb-font-sm); display: flex; align-items: center; justify-content: center; gap: var(--tqb-spacing-sm); color: white; }
        .tqb-sync-btn { background: var(--tqb-accent-green); }
        .tqb-sync-btn:hover { background: var(--tqb-accent-green-hover); }
        .tqb-save-btn { background: var(--tqb-accent-amber); color: var(--tqb-bg-primary); }
        .tqb-save-btn:hover { background: var(--tqb-accent-amber-hover); }
        .tqb-clear-btn { background: var(--tqb-accent-red); }
        .tqb-clear-btn:hover { background: var(--tqb-accent-red-hover); }
        .tqb-view-favorites-btn { background: var(--tqb-accent-amber); color: var(--tqb-bg-primary); font-weight: 500; }
        .tqb-view-favorites-btn:hover { background: var(--tqb-accent-amber-hover); }
        /* Input */
        .tqb-input-row { display: flex; gap: var(--tqb-spacing-sm); margin-bottom: var(--tqb-spacing-md); flex-wrap: wrap; justify-content: space-between; background: var(--tqb-bg-secondary); padding: var(--tqb-spacing-md); border-radius: var(--tqb-radius-md); }
        .tqb-input-row input, .tqb-input-row select { border: none; border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-sm); font-size: var(--tqb-font-md); background: var(--tqb-bg-input); color: var(--tqb-text-primary); }
        .tqb-input-row input { flex: 1; }
        .tqb-input-row input:focus { background: var(--tqb-bg-input) !important; }
        .tqb-input-row select { min-width: 120px; }
        .tqb-input-row button { background: #3b82f6; color: white; border: none; border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md) var(--tqb-spacing-md); cursor: pointer; }
        .tqb-input-row button:hover { background: #2563eb; }
        /* Tree */
        .tqb-tree { background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md); margin-bottom: var(--tqb-spacing-md); }
        .tqb-tree-item { margin: var(--tqb-spacing-sm) 0; background: transparent; }
        .tqb-tree-group { border-left: 2px solid var(--tqb-border-color-alt); padding-left: var(--tqb-spacing-md); margin-left: var(--tqb-spacing-sm); }
        .tqb-tag-item { background: var(--tqb-bg-tertiary); padding: var(--tqb-spacing-sm) .6rem; border-radius: var(--tqb-radius-sm); display: inline-flex; align-items: flex-start; gap: var(--tqb-spacing-sm); margin: var(--tqb-spacing-sm); cursor: grab; max-width: 100%; min-width: 0; }
        .tqb-tag-item:active { cursor: grabbing; }
        .tqb-tag-item.tqb-dragging { opacity: 0.5; transform: rotate(5deg); }
        .tqb-tag-item.tqb-drag-over { border: 2px dashed var(--tqb-accent-blue); background: var(--tqb-accent-blue-dark); }
        .tqb-tag-label { font-size: var(--tqb-font-sm); color: var(--tqb-text-primary); word-break: break-word; line-height: 1.3; flex: 1; min-width: 0; }
        .tqb-tag-btn { background: transparent; border: none; color: var(--tqb-text-secondary); cursor: pointer; padding: var(--tqb-spacing-sm); border-radius: var(--tqb-spacing-sm); font-size: var(--tqb-font-sm); }
        .tqb-tag-btn:hover { background: var(--tqb-bg-hover); color: var(--tqb-text-primary); }
        .tqb-move-btn { color: var(--tqb-accent-blue); }
        .tqb-move-btn:hover { background: var(--tqb-accent-blue-dark); color: white; }
        .tqb-group-header { color: var(--tqb-accent-blue); font-weight: 500; margin-bottom: var(--tqb-spacing-sm); font-size: var(--tqb-font-sm); }
        .tqb-empty { color: var(--tqb-text-secondary); font-style: italic; text-align: center; padding: var(--tqb-spacing-lg); background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-md); border: 1px solid var(--tqb-border-color); }
        /* Preview */
        .tqb-preview-section { background: var(--tqb-bg-primary); border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md); border: 1px solid var(--tqb-border-color); }
        .tqb-preview-label { color: var(--tqb-text-primary); font-size: var(--tqb-font-md); margin-bottom: var(--tqb-spacing-sm); background: var(--tqb-bg-tertiary); padding: var(--tqb-spacing-md) var(--tqb-spacing-md); border-radius: var(--tqb-radius-md); font-weight: 500; }
        .tqb-preview { background: var(--tqb-bg-secondary); border: 1px solid var(--tqb-border-color); border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md); font-family: monospace; font-size: var(--tqb-font-sm); white-space: pre-wrap; word-break: break-all; }
        /* Favorites */
        .tqb-favorites-section { background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-md); padding: var(--tqb-spacing-md); margin-bottom: var(--tqb-spacing-md); }
        .tqb-favorites-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--tqb-spacing-md); background: transparent; }
        .tqb-favorites-title { color: var(--tqb-accent-amber); margin: 0; font-size: var(--tqb-font-lg); font-weight: 600; background: transparent; }
        .tqb-favorites-search { margin-bottom: var(--tqb-spacing-md); background: transparent; margin-right: var(--tqb-spacing-lg); }
        .tqb-favorites-search input { width: 100%; padding: var(--tqb-spacing-sm); border: none; border-radius: var(--tqb-radius-sm); background: var(--tqb-bg-input); color: var(--tqb-text-primary); font-size: var(--tqb-font-md); }
        .tqb-favorites-search input:focus { background: var(--tqb-bg-input) !important; }
        .tqb-favorites-list { max-height: 200px; overflow-y: auto; background: transparent; }
        .tqb-favorite-item { background: var(--tqb-bg-tertiary); border-radius: var(--tqb-radius-sm); padding: var(--tqb-spacing-md); margin: var(--tqb-spacing-sm) 0; cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; transition: background .2s; }
        .tqb-favorite-item:hover { background: var(--tqb-bg-hover); }
        .tqb-favorite-info { flex: 1; min-width: 0; margin-right: var(--tqb-spacing-sm); background: transparent; }
        .tqb-favorite-info > * { background: transparent; }
        .tqb-favorite-name { color: var(--tqb-text-primary); font-weight: 500; font-size: var(--tqb-font-md); }
        .tqb-favorite-query { color: var(--tqb-text-secondary); font-size: var(--tqb-font-sm); font-family: monospace; margin-top: var(--tqb-spacing-sm); word-break: break-word; line-height: 1.3; }
        .tqb-favorite-date { color: var(--tqb-text-tertiary); font-size: var(--tqb-font-sm); margin-top: var(--tqb-spacing-sm); }
        .tqb-favorite-actions { display: flex; gap: var(--tqb-spacing-sm); background: transparent; }
        .tqb-favorite-edit { background: var(--tqb-accent-blue); color: white; border: none; border-radius: var(--tqb-spacing-sm); padding: var(--tqb-spacing-sm) var(--tqb-spacing-sm); font-size: var(--tqb-font-sm); cursor: pointer; }
        .tqb-favorite-edit:hover { background: var(--tqb-accent-blue-dark); }
        .tqb-favorite-delete { background: var(--tqb-accent-red); color: white; border: none; border-radius: var(--tqb-spacing-sm); padding: var(--tqb-spacing-sm) var(--tqb-spacing-sm); font-size: var(--tqb-font-sm); cursor: pointer; }
        .tqb-favorite-delete:hover { background: var(--tqb-accent-red-hover); }
        /* Toggle switch checked state */
        #tqb-theme-toggle:checked + span {
          background-color: var(--tqb-accent-blue);
        }
        #tqb-theme-toggle:checked + span + span {
          transform: translateX(20px);
        }
        #tqb-compact-toggle:checked + span {
          background-color: var(--tqb-accent-blue);
        }
        #tqb-compact-toggle:checked + span + span {
          transform: translateX(20px);
        }
        #tqb-auto-submit-toggle:checked + span {
          background-color: var(--tqb-accent-blue);
        }
        #tqb-auto-submit-toggle:checked + span + span {
          transform: translateX(20px);
        }
        #tqb-show-preview-toggle:checked + span {
          background-color: var(--tqb-accent-blue);
        }
        #tqb-show-preview-toggle:checked + span + span {
          transform: translateX(20px);
        }
        /* Modal */
        .tqb-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: none; justify-content: center; align-items: center; }
        .tqb-modal { background: var(--tqb-bg-primary); color: var(--tqb-text-primary); border-radius: var(--tqb-radius-lg); padding: var(--tqb-spacing-lg); max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative; }
        .tqb-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--tqb-spacing-lg); border-bottom: 1px solid var(--tqb-border-color); padding-bottom: var(--tqb-spacing-lg); background: transparent; }
        .tqb-modal-title { font-size: var(--tqb-font-lg); font-weight: 600; color: var(--tqb-accent-amber); margin: 0; background: transparent; }
        .tqb-modal-close { background: var(--tqb-text-tertiary); color: white; border: none; border-radius: var(--tqb-radius-sm); padding: var(--tqb-spacing-sm); cursor: pointer; font-size: var(--tqb-font-lg); width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; }
        .tqb-modal-close:hover { background: var(--tqb-bg-hover); }
        /* Help modal */
        .tqb-help-content { background: transparent; }
        .tqb-help-content h4 { background: transparent; }
        .tqb-help-content > div { background: transparent; }
        .tqb-shortcut-item { display: flex; justify-content: space-between; align-items: center; padding: var(--tqb-spacing-md); margin-bottom: var(--tqb-spacing-sm); background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-sm); }
        .tqb-shortcut-item strong { color: var(--tqb-accent-blue); font-family: monospace; min-width: 140px; }
        .tqb-shortcut-item span { color: var(--tqb-text-secondary); flex: 1; }
        /* Dialog */
        .tqb-dialog { background: var(--tqb-bg-primary); color: var(--tqb-text-primary); border-radius: var(--tqb-radius-lg); padding: var(--tqb-spacing-lg); max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .tqb-dialog-title { font-size: var(--tqb-font-lg); font-weight: 600; margin-bottom: var(--tqb-spacing-md); color: var(--tqb-text-primary); }
        .tqb-dialog-message { font-size: var(--tqb-font-md); margin-bottom: var(--tqb-spacing-lg); color: var(--tqb-text-secondary); line-height: 1.5; }
        .tqb-dialog-input { width: 100%; padding: var(--tqb-spacing-sm); border: none; border-radius: var(--tqb-radius-sm); background: var(--tqb-bg-input); color: var(--tqb-text-primary); font-size: var(--tqb-font-md); margin-bottom: var(--tqb-spacing-lg); }
        .tqb-dialog-input:focus { background: var(--tqb-bg-input) !important; }
        .tqb-dialog-buttons { display: flex; gap: var(--tqb-spacing-sm); justify-content: flex-end; }
        .tqb-dialog-btn { border: none; border-radius: var(--tqb-radius-sm); padding: var(--tqb-spacing-sm) var(--tqb-spacing-lg); cursor: pointer; font-size: var(--tqb-font-md); font-weight: 500; }
        .tqb-dialog-btn-primary { background: var(--tqb-accent-blue); color: white; }
        .tqb-dialog-btn-primary:hover { background: var(--tqb-accent-blue-dark); }
        .tqb-dialog-btn-danger { background: var(--tqb-accent-red); color: white; }
        .tqb-dialog-btn-danger:hover { background: var(--tqb-accent-red-hover); }
        .tqb-dialog-btn-secondary { background: var(--tqb-bg-tertiary); color: var(--tqb-text-primary); }
        .tqb-dialog-btn-secondary:hover { background: var(--tqb-bg-hover); }
    `;
  }

  // Initialize for current site
  const siteConfig = getCurrentSiteConfig();
  if (!siteConfig) {
    console.log('Tag Builder: Site not supported, exiting');
    return;
  }

  console.log(`Tag Builder: Initializing for ${siteConfig.name}`);

  // Inject site-specific CSS for wider sidebars
  injectSiteCSS(siteConfig);

  /**
   * Generate HTML for a settings toggle option
   * @param {string} label - Display label for the setting (e.g., "🎨 Theme")
   * @param {string} id - ID for the checkbox input
   * @param {string} leftLabel - Label for unchecked state (e.g., "Dark")
   * @param {string} rightLabel - Label for checked state (e.g., "Light")
   * @returns {string} HTML string for the setting row
   */
  function generateSettingToggle(label, id, leftLabel, rightLabel) {
    return `
      <div class="tqb-shortcut-item">
        <span style="color: var(--tqb-text-primary); min-width: 200px;">${label}</span>
        <div style="display:flex;align-items:center;gap:var(--tqb-spacing-md); min-width: 200px;">
          <span style="color:var(--tqb-text-secondary);font-size:var(--tqb-font-sm);">${leftLabel}</span>
          <label style="display:inline-flex;align-items:center;cursor:pointer;position:relative;width:40px;height:20px;">
            <input type="checkbox" id="${id}" style="opacity:0;width:0;height:0;">
            <span style="position:absolute;top:0;left:0;right:0;bottom:0;background-color:var(--tqb-bg-tertiary);border-radius:20px;transition:0.3s;"></span>
            <span style="position:absolute;height:14px;width:14px;left:3px;bottom:3px;background-color:white;border-radius:50%;transition:0.3s;"></span>
          </label>
          <span style="color:var(--tqb-text-secondary);font-size:var(--tqb-font-sm);">${rightLabel}</span>
        </div>
      </div>
    `;
  }

  waitForElements([siteConfig.containerSelector, siteConfig.inputSelector], (container, inputEl) => {
    console.log(`Tag Builder: Found container and input elements`);

    // Toggle button (inline above builder)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tqb-toggle-btn';
    toggleBtn.textContent = `🟥 Hide ${siteConfig.name} Tag Builder`;

    // Builder panel
    const builder = document.createElement('div');
    builder.className = 'tqb-builder';
    builder.innerHTML = `
        <style>${generateCSS()}</style>

        <!-- Sync buttons -->
        <div class="tqb-header">
            <button id="tqb-copy-from" class="tqb-sync-btn" aria-label="Copy tags from page input">📋 Copy from input</button>
            <button id="tqb-paste-to" class="tqb-sync-btn" aria-label="Paste tags to page input">📤 Paste to input</button>
            <button id="tqb-save-favorite" class="tqb-sync-btn tqb-save-btn" aria-label="Save current tags as favorite">💾 Save Current</button>
            <button id="tqb-clear-all" class="tqb-clear-btn" aria-label="Clear all tags">🗑️ Clear All</button>
            <button id="tqb-preferences" class="tqb-sync-btn" aria-label="Open preferences" style="background: var(--tqb-text-tertiary); grid-column: 1 / -1;">⚙️ Preferences</button>
        </div>

        <!-- Input row -->
        <div class="tqb-input-row">
            <input id="tqb-input" placeholder="Enter tag name" aria-label="Tag name input">
            <select id="tqb-op" aria-label="Tag operator">
                <option value="and">AND</option>
                <option value="or">OR group</option>
                <option value="not">NOT (-tag)</option>
                <option value="fuzzy">FUZZY (~)</option>
                <option value="wildcard">WILDCARD (*)</option>
            </select>
            <button id="tqb-add" aria-label="Add tag">Add</button>
        </div>

        <!-- Tree view -->
        <div class="tqb-tree" id="tqb-tree">
            <div class="tqb-empty">No tags added yet</div>
        </div>

        <!-- Favorites section -->
        <div class="tqb-favorites-section">
            <div class="tqb-favorites-header">
                <span class="tqb-favorites-title">⭐ Favorites</span>
                <button id="tqb-view-favorites" class="tqb-view-favorites-btn" aria-label="View all favorites">View All</button>
            </div>
            <div class="tqb-favorites-search">
                <input id="tqb-favorites-filter" placeholder="🔍 Search favorites..." type="text" aria-label="Search favorites">
            </div>
            <div class="tqb-favorites-list" id="tqb-favorites-list">
                <div class="tqb-empty">No favorites saved yet</div>
            </div>
        </div>

        <!-- Live preview -->
        <div class="tqb-preview-section">
            <div class="tqb-preview-label">Generated Query:</div>
            <div class="tqb-preview" id="tqb-preview">(empty)</div>
        </div>
        `;

    // Add toggle button and builder to container based on site configuration
    if (siteConfig.appendToContainer) {
      container.appendChild(toggleBtn);
      container.appendChild(builder);
    } else {
      container.insertBefore(toggleBtn, container.firstChild);
      container.insertBefore(builder, toggleBtn.nextSibling);
    }

    // Create modal overlay and content
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'tqb-modal-overlay';
    modalOverlay.setAttribute('role', 'dialog');
    modalOverlay.setAttribute('aria-modal', 'true');
    modalOverlay.setAttribute('aria-labelledby', 'tqb-modal-title');
    modalOverlay.innerHTML = `
        <div class="tqb-modal" id="tqb-favorites-modal">
            <div class="tqb-modal-header">
                <h3 class="tqb-modal-title" id="tqb-modal-title">⭐ Saved Favorites</h3>
                <button class="tqb-modal-close" id="tqb-modal-close" aria-label="Close favorites modal">✕</button>
            </div>
            <div style="display:flex;gap:var(--tqb-spacing-sm);margin-bottom:var(--tqb-spacing-md);">
                <div class="tqb-favorites-search" style="flex:1;margin-bottom:0;">
                    <input id="tqb-modal-favorites-filter" placeholder="🔍 Search favorites..." type="text" aria-label="Search favorites">
                </div>
                <select id="tqb-favorites-sort" aria-label="Sort favorites" style="border:none;border-radius:var(--tqb-radius-sm);padding:var(--tqb-spacing-sm);font-size:var(--tqb-font-md);background:var(--tqb-bg-input);color:var(--tqb-text-primary);">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                </select>
            </div>
            <div style="display:flex;gap:var(--tqb-spacing-sm);margin-bottom:var(--tqb-spacing-md);">
                <button id="tqb-export-favorites" style="flex:1;background:var(--tqb-accent-blue);color:white;border:none;border-radius:var(--tqb-radius-sm);padding:var(--tqb-spacing-sm);font-size:var(--tqb-font-md);cursor:pointer;">📤 Export</button>
                <button id="tqb-import-favorites" style="flex:1;background:var(--tqb-accent-amber);color:white;border:none;border-radius:var(--tqb-radius-sm);padding:var(--tqb-spacing-sm);font-size:var(--tqb-font-md);cursor:pointer;">📥 Import</button>
            </div>
            <div class="tqb-favorites-list" id="tqb-modal-favorites-list" style="max-height:60vh;">
                <div class="tqb-empty">No favorites saved yet</div>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    // Create help modal
    const helpModalOverlay = document.createElement('div');
    helpModalOverlay.className = 'tqb-modal-overlay';
    helpModalOverlay.setAttribute('role', 'dialog');
    helpModalOverlay.setAttribute('aria-modal', 'true');
    helpModalOverlay.setAttribute('aria-labelledby', 'tqb-help-modal-title');
    helpModalOverlay.innerHTML = `
        <div class="tqb-modal" id="tqb-help-modal" style="max-width: 500px;">
            <div class="tqb-modal-header">
                <h3 class="tqb-modal-title" id="tqb-help-modal-title">⚙️ Preferences</h3>
                <button class="tqb-modal-close" id="tqb-help-modal-close" aria-label="Close preferences modal">✕</button>
            </div>
            <div class="tqb-help-content" style="padding: 1rem;">
                <h4 style="color: var(--tqb-accent-blue); margin-top: 0; margin-bottom: var(--tqb-spacing-md); font-size: var(--tqb-font-md);">⚙️ Settings</h4>
                ${generateSettingToggle('🎨 Theme', 'tqb-theme-toggle', 'Dark', 'Light')}
                ${generateSettingToggle('📐 Spacing', 'tqb-compact-toggle', 'Regular', 'Compact')}
                ${generateSettingToggle('🚀 Auto-Submit', 'tqb-auto-submit-toggle', 'Off', 'On')}
                ${generateSettingToggle('👁️ Show Preview', 'tqb-show-preview-toggle', 'Hidden', 'Visible')}
                <h4 style="color: var(--tqb-accent-blue); margin-top: var(--tqb-spacing-lg); margin-bottom: var(--tqb-spacing-md); font-size: var(--tqb-font-md);">⌨️ Keyboard Shortcuts</h4>
                <div class="tqb-shortcut-item">
                    <strong>Ctrl + Enter</strong>
                    <span>Paste tags to page search input</span>
                </div>
                <div class="tqb-shortcut-item">
                    <strong>Ctrl + S</strong>
                    <span>Save current tags as favorite</span>
                </div>
                <div class="tqb-shortcut-item">
                    <strong>Ctrl + Shift + X</strong>
                    <span>Copy tags from page search input to builder</span>
                </div>
            </div>
        </div>
    `;
    helpModalOverlay.style.display = 'none';
    document.body.appendChild(helpModalOverlay);

    const input = builder.querySelector('#tqb-input');
    const opSelect = builder.querySelector('#tqb-op');
    const addBtn = builder.querySelector('#tqb-add');
    const treeArea = builder.querySelector('#tqb-tree');
    const preview = builder.querySelector('#tqb-preview');
    const previewSection = builder.querySelector('.tqb-preview-section');
    const copyFromBtn = builder.querySelector('#tqb-copy-from');
    const pasteToBtn = builder.querySelector('#tqb-paste-to');
    const viewFavoritesBtn = builder.querySelector('#tqb-view-favorites');
    const clearAllBtn = builder.querySelector('#tqb-clear-all');
    const preferencesBtn = builder.querySelector('#tqb-preferences');
    const saveFavoriteBtn = builder.querySelector('#tqb-save-favorite');
    const favoritesFilter = builder.querySelector('#tqb-favorites-filter');
    const favoritesList = builder.querySelector('#tqb-favorites-list');

    // Modal elements
    const modalCloseBtn = modalOverlay.querySelector('#tqb-modal-close');
    const modalFavoritesFilter = modalOverlay.querySelector('#tqb-modal-favorites-filter');
    const modalFavoritesList = modalOverlay.querySelector('#tqb-modal-favorites-list');
    const favoritesSort = modalOverlay.querySelector('#tqb-favorites-sort');
    const exportFavoritesBtn = modalOverlay.querySelector('#tqb-export-favorites');
    const importFavoritesBtn = modalOverlay.querySelector('#tqb-import-favorites');

    let tags = [];

    /**
     * Debounce function to limit how often a function can be called
     * @param {Function} func - The function to debounce
     * @param {number} wait - The delay in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // --- Custom Dialogs ---
    /**
     * Show custom alert dialog
     * @param {string} message - Message to display
     * @returns {Promise<void>}
     */
    function showAlert(message) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'tqb-modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
          <div class="tqb-dialog">
            <div class="tqb-dialog-message">${escapeHtml(message)}</div>
            <div class="tqb-dialog-buttons">
              <button class="tqb-dialog-btn tqb-dialog-btn-primary">OK</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const okBtn = overlay.querySelector('.tqb-dialog-btn-primary');
        const close = () => {
          overlay.remove();
          resolve();
        };

        okBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });
        document.addEventListener('keydown', function escHandler(e) {
          if (e.key === 'Escape') {
            document.removeEventListener('keydown', escHandler);
            close();
          }
        });
      });
    }

    /**
     * Show custom confirm dialog
     * @param {string} message - Message to display
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    function showConfirm(message) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'tqb-modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
          <div class="tqb-dialog">
            <div class="tqb-dialog-message">${escapeHtml(message)}</div>
            <div class="tqb-dialog-buttons">
              <button class="tqb-dialog-btn tqb-dialog-btn-secondary">Cancel</button>
              <button class="tqb-dialog-btn tqb-dialog-btn-danger">Confirm</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const cancelBtn = overlay.querySelector('.tqb-dialog-btn-secondary');
        const confirmBtn = overlay.querySelector('.tqb-dialog-btn-danger');

        const close = (result) => {
          overlay.remove();
          resolve(result);
        };

        cancelBtn.addEventListener('click', () => close(false));
        confirmBtn.addEventListener('click', () => close(true));
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close(false);
        });
        document.addEventListener('keydown', function escHandler(e) {
          if (e.key === 'Escape') {
            document.removeEventListener('keydown', escHandler);
            close(false);
          }
        });
      });
    }

    /**
     * Show custom prompt dialog
     * @param {string} message - Message to display
     * @param {string} defaultValue - Default input value
     * @returns {Promise<string|null>} Input value or null if cancelled
     */
    function showPrompt(message, defaultValue = '') {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'tqb-modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
          <div class="tqb-dialog">
            <div class="tqb-dialog-title">${escapeHtml(message)}</div>
            <input type="text" class="tqb-dialog-input" value="${escapeHtml(defaultValue)}">
            <div class="tqb-dialog-buttons">
              <button class="tqb-dialog-btn tqb-dialog-btn-secondary">Cancel</button>
              <button class="tqb-dialog-btn tqb-dialog-btn-primary">OK</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('.tqb-dialog-input');
        const cancelBtn = overlay.querySelector('.tqb-dialog-btn-secondary');
        const okBtn = overlay.querySelector('.tqb-dialog-btn-primary');

        input.focus();
        input.select();

        const close = (result) => {
          overlay.remove();
          resolve(result);
        };

        cancelBtn.addEventListener('click', () => close(null));
        okBtn.addEventListener('click', () => close(input.value));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') close(input.value);
          if (e.key === 'Escape') close(null);
        });
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close(null);
        });
      });
    }

    // --- Storage ---
    const siteStorageKey = getSiteStorageKey(STORAGE_KEY);
    const siteVisibilityKey = getSiteStorageKey(VISIBILITY_KEY);
    const siteFavoritesKey = getSiteStorageKey('tqb-favorites');
    const siteThemeKey = getSiteStorageKey(THEME_KEY);
    const siteCompactKey = getSiteStorageKey(COMPACT_KEY);
    const siteAutoSubmitKey = getSiteStorageKey(AUTO_SUBMIT_KEY);
    const siteShowPreviewKey = getSiteStorageKey(SHOW_PREVIEW_KEY);

    /**
     * Apply theme by setting data attribute on document
     * @param {string} theme - 'dark' or 'light'
     */
    function applyTheme(theme) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-tqb-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-tqb-theme');
      }
    }

    /**
     * Load theme preference from storage
     * @returns {string} 'dark' or 'light'
     */
    function loadTheme() {
      const stored = localStorage.getItem(siteThemeKey);
      return stored || 'dark';
    }

    /**
     * Save theme preference to storage
     * @param {string} theme - 'dark' or 'light'
     */
    function saveTheme(theme) {
      localStorage.setItem(siteThemeKey, theme);
    }

    /**
     * Apply compact mode by setting data attribute on document
     * @param {boolean} compact - true for compact mode, false for regular
     */
    function applyCompact(compact) {
      if (compact) {
        document.documentElement.setAttribute('data-tqb-compact', 'true');
      } else {
        document.documentElement.removeAttribute('data-tqb-compact');
      }
    }

    /**
     * Load compact mode preference from storage
     * @returns {boolean} true if compact mode enabled
     */
    function loadCompact() {
      const stored = localStorage.getItem(siteCompactKey);
      return stored === 'true';
    }

    /**
     * Save compact mode preference to storage
     * @param {boolean} compact - true for compact mode, false for regular
     */
    function saveCompact(compact) {
      localStorage.setItem(siteCompactKey, compact.toString());
    }

    /**
     * Load auto-submit preference from storage
     * @returns {boolean} true if auto-submit enabled
     */
    function loadAutoSubmit() {
      const stored = localStorage.getItem(siteAutoSubmitKey);
      return stored === 'true';
    }

    /**
     * Save auto-submit preference to storage
     * @param {boolean} autoSubmit - true to submit form after pasting, false otherwise
     */
    function saveAutoSubmit(autoSubmit) {
      localStorage.setItem(siteAutoSubmitKey, autoSubmit.toString());
    }

    /**
     * Load show preview preference from storage
     * @returns {boolean} true if preview should be shown
     */
    function loadShowPreview() {
      const stored = localStorage.getItem(siteShowPreviewKey);
      return stored === 'true'; // Default to false (hidden)
    }

    /**
     * Save show preview preference to storage
     * @param {boolean} showPreview - true to show preview, false to hide
     */
    function saveShowPreview(showPreview) {
      localStorage.setItem(siteShowPreviewKey, showPreview.toString());
    }

    /**
     * Apply preview visibility
     * @param {boolean} show - true to show preview, false to hide
     */
    function applyPreviewVisibility(show) {
      if (show) {
        previewSection.style.display = 'block';
      } else {
        previewSection.style.display = 'none';
      }
    }

    /**
     * Save current tags to localStorage
     */
    function saveStorage() {
      localStorage.setItem(siteStorageKey, JSON.stringify(tags));
    }

    /**
     * Load tags from localStorage or initialize from page input
     */
    function loadStorage() {
      const stored = localStorage.getItem(siteStorageKey);
      if (stored) {
        try {
          tags = JSON.parse(stored);
          render();
          return;
        } catch (e) {
          console.error(e);
        }
      }
      initFromInput();
    }

    // --- Favorites Storage ---
    let favorites = [];

    /**
     * Load favorites from localStorage
     */
    function loadFavorites() {
      const stored = localStorage.getItem(siteFavoritesKey);
      if (stored) {
        try {
          favorites = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to load favorites:', e);
          favorites = [];
        }
      }
    }

    /**
     * Save favorites to localStorage
     */
    function saveFavorites() {
      localStorage.setItem(siteFavoritesKey, JSON.stringify(favorites));
    }

    /**
     * Add a new favorite to the collection
     * @param {string} name - Display name for the favorite
     * @param {Array} tagData - Tag structure to save
     */
    function addFavorite(name, tagData) {
      const favorite = {
        id: Date.now(),
        name: name.trim(),
        tags: JSON.parse(JSON.stringify(tagData)), // Deep clone
        query: buildQuery(),
        createdAt: new Date().toISOString()
      };
      favorites.unshift(favorite); // Add to beginning
      saveFavorites();
      renderAllFavorites();
    }

    /**
     * Delete a favorite by ID
     * @param {number} id - Favorite ID to delete
     */
    function deleteFavorite(id) {
      favorites = favorites.filter(fav => fav.id !== id);
      saveFavorites();
      renderAllFavorites();
    }

    /**
     * Edit a favorite's name
     * @param {number} id - Favorite ID to edit
     */
    async function editFavorite(id) {
      const favorite = favorites.find(fav => fav.id === id);
      if (!favorite) return;

      const newName = await showPrompt('Edit favorite name:', favorite.name);
      if (newName !== null && newName.trim() && newName.trim() !== favorite.name) {
        favorite.name = newName.trim();
        saveFavorites();
        renderAllFavorites();
      }
    }

    /**
     * Export favorites to a JSON file
     */
    function exportFavorites() {
      if (favorites.length === 0) {
        showAlert('No favorites to export!');
        return;
      }

      const dataStr = JSON.stringify(favorites, null, 2);
      const blob = new Blob([dataStr], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booru-favorites-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showAlert(`Exported ${favorites.length} favorite(s)! 📤`);
    }

    /**
     * Import favorites from a JSON file
     */
    async function importFavorites() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const imported = JSON.parse(text);

          if (!Array.isArray(imported)) {
            showAlert('Invalid file format: Expected an array of favorites');
            return;
          }

          // Validate structure
          const valid = imported.every(fav =>
            fav.hasOwnProperty('id') &&
            fav.hasOwnProperty('name') &&
            fav.hasOwnProperty('tags') &&
            Array.isArray(fav.tags)
          );

          if (!valid) {
            showAlert('Invalid file format: Missing required fields');
            return;
          }

          // Ask user how to handle import
          const merge = await showConfirm(
            `Import ${imported.length} favorite(s)?\n\n` +
            `OK = Merge with existing\n` +
            `Cancel = Replace all favorites`
          );

          if (merge) {
            // Merge: Add imported favorites, renumber IDs to avoid conflicts
            const maxId = favorites.length > 0 ? Math.max(...favorites.map(f => f.id)) : 0;
            const renumbered = imported.map((fav, idx) => ({
              ...fav,
              id: maxId + idx + 1
            }));
            favorites = [...favorites, ...renumbered];
          } else {
            // Replace all
            favorites = imported;
          }

          saveFavorites();
          renderAllFavorites();
          showAlert(`Imported ${imported.length} favorite(s)! 📥`);
        } catch (err) {
          console.error('Import error:', err);
          showAlert('Error importing file: ' + err.message);
        }
      };

      input.click();
    }

    /**
     * Load a favorite's tags into the builder
     * @param {Object} favorite - Favorite object with tags property
     */
    function loadFavorite(favorite) {
      tags = JSON.parse(JSON.stringify(favorite.tags)); // Deep clone
      saveStorage();
      render();
    }

    /**
     * Render favorites list with optional filtering
     * @param {HTMLElement} targetList - Container element for favorites
     * @param {HTMLInputElement} targetFilter - Filter input element
     */
    function renderFavorites(targetList = favoritesList, targetFilter = favoritesFilter) {
      const filterText = targetFilter.value.toLowerCase();
      let filteredFavorites = favorites.filter(fav =>
        fav.name.toLowerCase().includes(filterText) ||
        fav.query.toLowerCase().includes(filterText)
      );

      // Apply sorting (only for modal view which has the sort dropdown)
      if (targetList === modalFavoritesList && favoritesSort) {
        const sortValue = favoritesSort.value;
        filteredFavorites = [...filteredFavorites].sort((a, b) => {
          switch (sortValue) {
            case 'date-desc':
              return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date-asc':
              return new Date(a.createdAt) - new Date(b.createdAt);
            case 'name-asc':
              return a.name.localeCompare(b.name);
            case 'name-desc':
              return b.name.localeCompare(a.name);
            default:
              return 0;
          }
        });
      }

      if (filteredFavorites.length === 0) {
        targetList.innerHTML = '<div class="tqb-empty">No favorites found</div>';
        return;
      }

      targetList.innerHTML = filteredFavorites.map(fav => {
        const date = new Date(fav.createdAt).toLocaleDateString();
        return `
          <div class="tqb-favorite-item" data-id="${fav.id}" role="button" tabindex="0" aria-label="Load favorite: ${escapeHtml(fav.name)}">
            <div class="tqb-favorite-info">
              <div class="tqb-favorite-name">${escapeHtml(fav.name)}</div>
              <div class="tqb-favorite-query">${escapeHtml(fav.query)}</div>
              <div class="tqb-favorite-date">Saved ${date}</div>
            </div>
            <div class="tqb-favorite-actions">
              <button class="tqb-favorite-edit" data-id="${fav.id}" aria-label="Edit favorite: ${escapeHtml(fav.name)}">✏️</button>
              <button class="tqb-favorite-delete" data-id="${fav.id}" aria-label="Delete favorite: ${escapeHtml(fav.name)}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      // Add click handlers for loading and deleting favorites
      targetList.querySelectorAll('.tqb-favorite-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // Don't trigger load if clicking action buttons
          if (e.target.classList.contains('tqb-favorite-delete') || e.target.classList.contains('tqb-favorite-edit')) return;

          const id = parseInt(item.dataset.id);
          const favorite = favorites.find(fav => fav.id === id);
          if (favorite) {
            loadFavorite(favorite);
            showAlert(`Loaded: ${favorite.name} ✅`);
            // Close modal if we're in modal view
            if (targetList === modalFavoritesList) {
              modalOverlay.style.display = 'none';
            }
          }
        });
      });

      targetList.querySelectorAll('.tqb-favorite-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          editFavorite(id);
        });
      });

      targetList.querySelectorAll('.tqb-favorite-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const favorite = favorites.find(fav => fav.id === id);
          if (favorite && await showConfirm(`Delete favorite "${favorite.name}"?`)) {
            deleteFavorite(id);
          }
        });
      });
    }

    /**
     * Render all favorites in both modal and sidebar
     */
    function renderAllFavorites() {
      renderFavorites(favoritesList, favoritesFilter);
      renderFavorites(modalFavoritesList, modalFavoritesFilter);
    }

    // Debounced version for search filtering (typing)
    const debouncedRenderFavorites = debounce((targetList, targetFilter) => {
      renderFavorites(targetList, targetFilter);
    }, 150);

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Build query string for a single tag item (recursive)
     * @param {Object} item - Tag item object
     * @returns {string} Query string representation
     */
    function buildQueryItem(item) {
      if (item.op === 'or') {
        // Ensure items is an array before mapping
        if (!Array.isArray(item.items)) {
          console.warn('OR group items is not an array, treating as empty');
          return '( )';
        }
        return `( ${item.items.map(buildQueryItem).join(' ~ ')} )`;
      }
      if (item.op === 'not') return `-${item.tagValue}`;
      if (item.op === 'fuzzy') return `${item.tagValue}~`;
      if (item.op === 'wildcard') return `${item.tagValue}`;
      return item.tagValue;
    }

    /**
     * Build complete query string from all tags
     * @returns {string} Complete query string
     */
    function buildQuery() {
      // Ensure tags is always an array
      if (!Array.isArray(tags)) {
        console.warn('tags is not an array, initializing as empty array');
        tags = [];
      }

      return tags.map(buildQueryItem).join(' ').trim();
    }

    /**
     * Render the tag tree and preview
     */
    function render() {
      // Update preview
      const query = buildQuery();
      preview.textContent = query || '(empty)';

      // Clear tree
      treeArea.innerHTML = '';

      if (tags.length === 0) {
        treeArea.innerHTML = '<div class="tqb-empty">No tags added yet</div>';
        return;
      }

      // Render each top-level item
      tags.forEach((tag, index) => {
        const itemEl = renderTreeItem(tag, [index]);
        treeArea.appendChild(itemEl);
      });

      // Add drag and drop handlers after rendering
      addDragHandlers();
    }

    /**
     * Render a single tree item (tag or OR group)
     * @param {Object} item - Tag item to render
     * @param {number[]} path - Array index path to this item
     * @returns {HTMLElement} Rendered tree item element
     */
    function renderTreeItem(item, path) {
      const div = document.createElement('div');
      div.className = 'tqb-tree-item';

      if (item.op === 'or') {
        // OR group
        div.innerHTML = `
          <div class="tqb-tag-item" draggable="true" data-path="${path.join(',')}">
            <span class="tqb-tag-label">OR Group (${item.items.length} items)</span>
            <button class="tqb-tag-btn tqb-move-btn" title="Move up" aria-label="Move OR group up">↑</button>
            <button class="tqb-tag-btn tqb-move-btn" title="Move down" aria-label="Move OR group down">↓</button>
            <button class="tqb-tag-btn" title="Add item to group" aria-label="Add item to OR group">+</button>
            <button class="tqb-tag-btn" title="Delete group" aria-label="Delete OR group">❌</button>
          </div>
        `;

        const [moveUpBtn, moveDownBtn, addBtn, deleteBtn] = div.querySelectorAll('.tqb-tag-btn');

        moveUpBtn.onclick = (e) => {
          e.stopPropagation();
          moveItem(path, -1);
        };
        moveDownBtn.onclick = (e) => {
          e.stopPropagation();
          moveItem(path, 1);
        };
        addBtn.onclick = async () => {
          const tagName = await showPrompt('Add tag to OR group:');
          if (tagName && tagName.trim()) {
            item.items.push({
              op: 'and',
              tagValue: tagName.trim()
            });
            saveStorage();
            render();
          }
        };

        deleteBtn.onclick = async () => {
          if (await showConfirm('Delete this OR group?')) {
            deleteItemAtPath(path);
            saveStorage();
            render();
          }
        };

        // Render group items
        const groupDiv = document.createElement('div');
        groupDiv.className = 'tqb-tree-group';

        item.items.forEach((subItem, subIndex) => {
          const subPath = [...path, 'items', subIndex];
          const subEl = renderTreeItem(subItem, subPath);
          groupDiv.appendChild(subEl);
        });

        div.appendChild(groupDiv);

      } else {
        // Single tag
        const opLabels = {
          'and': '',
          'not': 'NOT: ',
          'fuzzy': 'FUZZY: ',
          'wildcard': 'WILDCARD: '
        };

        div.innerHTML = `
          <div class="tqb-tag-item" draggable="true" data-path="${path.join(',')}">
            <span class="tqb-tag-label">${opLabels[item.op]}${item.tagValue}</span>
            <button class="tqb-tag-btn tqb-move-btn" title="Move up" aria-label="Move tag up">↑</button>
            <button class="tqb-tag-btn tqb-move-btn" title="Move down" aria-label="Move tag down">↓</button>
            <button class="tqb-tag-btn" title="Edit tag" aria-label="Edit tag ${item.tagValue}">✏️</button>
            <button class="tqb-tag-btn" title="Delete tag" aria-label="Delete tag ${item.tagValue}">❌</button>
          </div>
        `;

        const [moveUpBtn, moveDownBtn, editBtn, deleteBtn] = div.querySelectorAll('.tqb-tag-btn');

        moveUpBtn.onclick = (e) => {
          e.stopPropagation();
          moveItem(path, -1);
        };
        moveDownBtn.onclick = (e) => {
          e.stopPropagation();
          moveItem(path, 1);
        };
        editBtn.onclick = async () => {
          const newValue = await showPrompt(`Edit tag (${item.op.toUpperCase()}):`, item.tagValue);
          if (newValue !== null) {
            item.tagValue = newValue.trim();
            saveStorage();
            render();
          }
        };

        deleteBtn.onclick = () => {
          deleteItemAtPath(path);
          saveStorage();
          render();
        };
      }

      return div;
    }

    /**
     * Move an item up or down within its parent array
     * @param {number[]} path - Path to the item
     * @param {number} direction - -1 for up, 1 for down
     */
    function moveItem(path, direction) {
      if (path.length < 1) return; // Need at least one index

      const itemIndex = parseInt(path[path.length - 1]);
      let parent;

      if (path.length === 1) {
        // Top-level item
        parent = tags;
      } else if (path.length === 3 && path[1] === 'items') {
        // Item in OR group
        const groupIndex = parseInt(path[0]);
        parent = tags[groupIndex].items;
      } else {
        return; // Unsupported path
      }

      if (!parent || !Array.isArray(parent)) return;

      const newIndex = itemIndex + direction;
      if (newIndex < 0 || newIndex >= parent.length) return; // Out of bounds

      // Swap the items
      const temp = parent[itemIndex];
      parent[itemIndex] = parent[newIndex];
      parent[newIndex] = temp;

      saveStorage();
      render();
    }

    /**
     * Add drag and drop event handlers to tree items
     */
    function addDragHandlers() {
      let draggedElement = null;
      let draggedPath = null;

      // Helper function to find the draggable element
      function findDraggableElement(element) {
        while (element && !element.hasAttribute('draggable')) {
          element = element.parentElement;
        }
        return element;
      }

      // Add event listeners to all draggable items
      document.querySelectorAll('.tqb-tag-item[draggable="true"]').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          const draggableEl = findDraggableElement(e.target);
          if (!draggableEl || !draggableEl.dataset.path) return;

          draggedElement = draggableEl;
          draggedPath = draggableEl.dataset.path.split(',');
          draggableEl.classList.add('tqb-dragging');

          // Set drag data
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggableEl.dataset.path);
        });

        item.addEventListener('dragend', (e) => {
          const draggableEl = findDraggableElement(e.target);
          if (draggableEl) {
            draggableEl.classList.remove('tqb-dragging');
          }
          draggedElement = null;
          draggedPath = null;

          // Remove all drag-over classes
          document.querySelectorAll('.tqb-drag-over').forEach(el => {
            el.classList.remove('tqb-drag-over');
          });
        });

        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          const draggableEl = findDraggableElement(e.target);
          if (draggableEl && draggableEl !== draggedElement) {
            draggableEl.classList.add('tqb-drag-over');
          }
        });

        item.addEventListener('dragleave', (e) => {
          const draggableEl = findDraggableElement(e.target);
          if (draggableEl) {
            draggableEl.classList.remove('tqb-drag-over');
          }
        });

        item.addEventListener('drop', (e) => {
          e.preventDefault();
          const draggableEl = findDraggableElement(e.target);
          if (draggableEl) {
            draggableEl.classList.remove('tqb-drag-over');
          }

          if (!draggedPath || !draggableEl || !draggableEl.dataset.path || draggableEl === draggedElement) return;

          const targetPath = draggableEl.dataset.path.split(',');

          // Perform the reorder by moving the dragged item to target position
          reorderItems(draggedPath, targetPath);
        });
      });
    }

    /**
     * Reorder items by moving source to target position
     * @param {string[]} sourcePath - Path of item being moved
     * @param {string[]} targetPath - Path of drop target
     */
    function reorderItems(sourcePath, targetPath) {
      // Convert paths to numbers
      const sourceIndices = sourcePath.map(p => parseInt(p));
      const targetIndices = targetPath.map(p => parseInt(p));

      // For simplicity, only handle top-level reordering for now
      if (sourceIndices.length === 1 && targetIndices.length === 1) {
        const sourceIndex = sourceIndices[0];
        const targetIndex = targetIndices[0];

        if (sourceIndex !== targetIndex) {
          // Remove item from source position
          const movedItem = tags.splice(sourceIndex, 1)[0];

          // Calculate correct insertion index
          // When dragging to a target, we want to insert after that target
          let insertIndex;
          if (sourceIndex < targetIndex) {
            // Item is moving forward (A->B), insert after target
            // After removing source, target has moved left by 1
            insertIndex = targetIndex;
          } else {
            // Item is moving backward (B->A), insert before target  
            insertIndex = targetIndex;
          }

          tags.splice(insertIndex, 0, movedItem);

          saveStorage();
          render();
        }
      }
    }

    /**
     * Delete tag item at specified path
     * @param {number[]} path - Path to the item to delete
     */
    function deleteItemAtPath(path) {
      if (path.length === 1) {
        // Top-level item
        tags.splice(path[0], 1);
      } else if (path.length === 3 && path[1] === 'items') {
        // Item in OR group
        const groupIndex = path[0];
        const itemIndex = path[2];
        tags[groupIndex].items.splice(itemIndex, 1);

        // If OR group becomes empty or has only one item, simplify
        if (tags[groupIndex].items.length === 0) {
          tags.splice(groupIndex, 1);
        } else if (tags[groupIndex].items.length === 1) {
          tags[groupIndex] = tags[groupIndex].items[0];
        }
      }
    }

    /**
     * Check if a tag already exists at the top level (same level check only)
     * @param {string} tagValue - The tag value to check
     * @param {string} op - The operation type (and, not, fuzzy, wildcard)
     * @returns {boolean} True if duplicate found at top level
     */
    function isDuplicateTag(tagValue, op) {
      // Only check top-level tags, not nested OR groups
      return tags.some(item => {
        // Skip OR groups - we don't check inside them
        if (item.op === 'or') return false;
        // Check if this top-level tag matches
        return item.tagValue === tagValue && item.op === op;
      });
    }

    // --- Add tag ---
    addBtn.addEventListener('click', async () => {
      const val = input.value.trim();
      const op = opSelect.value;
      if (!val) return;

      if (op === 'or') {
        // Create OR group from space-separated tags
        const items = val.split(/\s+/).filter(Boolean).map(x => ({
          op: 'and',
          tagValue: x
        }));

        // Check for duplicates in the OR group
        const duplicates = items.filter(item => isDuplicateTag(item.tagValue, item.op));
        if (duplicates.length > 0) {
          const dupNames = duplicates.map(d => d.tagValue).join(', ');
          if (!await showConfirm(`Duplicate tag(s) found: ${dupNames}\n\nAdd anyway?`)) {
            return;
          }
        }

        if (items.length > 0) {
          tags.push({
            op: 'or',
            items
          });
        }
      } else {
        // Check for duplicate single tag
        if (isDuplicateTag(val, op)) {
          if (!await showConfirm(`Tag "${val}" with operation "${op.toUpperCase()}" already exists.\n\nAdd duplicate anyway?`)) {
            return;
          }
        }

        // Add single tag
        tags.push({
          op,
          tagValue: val
        });
      }

      input.value = '';
      saveStorage();
      render();
    });

    // --- Copy from page input ---
    copyFromBtn.addEventListener('click', () => {
      const val = inputEl.value.trim();
      if (val) {
        try {
          tags = parseQuery(val);
          saveStorage();
          render();
        } catch (e) {
          console.error('Parse error:', e);
          showAlert('Error parsing query: ' + e.message);
        }
      }
    });

    // --- Paste to page input ---
    pasteToBtn.addEventListener('click', () => {
      const query = buildQuery();
      if (query) {
        inputEl.value = query;

        // Trigger events so page notices the update
        inputEl.dispatchEvent(new Event('input', {
          bubbles: true
        }));
        inputEl.dispatchEvent(new Event('change', {
          bubbles: true
        }));

        // Auto-submit if enabled
        if (loadAutoSubmit()) {
          const form = inputEl.closest('form');
          if (form) {
            form.submit();
          }
        }
      }
    });

    // --- Clear All Tags ---
    clearAllBtn.addEventListener('click', async () => {
      if (tags.length === 0) {
        showAlert('No tags to clear!');
        return;
      }

      if (await showConfirm('Clear all tags? This cannot be undone.')) {
        tags = [];
        saveStorage();
        render();
        showAlert('All tags cleared! 🗑️');
      }
    });

    // --- Save Favorite ---
    saveFavoriteBtn.addEventListener('click', async () => {
      if (tags.length === 0) {
        showAlert('No tags to save! Add some tags first.');
        return;
      }

      const name = await showPrompt('Enter a name for this favorite search:');
      if (name && name.trim()) {
        addFavorite(name.trim(), tags);
        showAlert('Favorite saved! 💾');
      }
    });

    // --- View Favorites Modal ---
    viewFavoritesBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'flex';
      modalFavoritesFilter.value = ''; // Reset filter
      renderFavorites(modalFavoritesList, modalFavoritesFilter);
    });

    // --- Modal Close ---
    modalCloseBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
    });

    // Close modal when clicking overlay (not the modal content)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
      }
    });

    // Close modal when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
        modalOverlay.style.display = 'none';
      }
      if (e.key === 'Escape' && helpModalOverlay.style.display === 'flex') {
        helpModalOverlay.style.display = 'none';
      }
    });

    // --- Help Modal ---
    preferencesBtn.addEventListener('click', () => {
      helpModalOverlay.style.display = 'flex';
      // Update theme toggle state
      const themeToggle = helpModalOverlay.querySelector('#tqb-theme-toggle');
      const currentTheme = loadTheme();
      themeToggle.checked = currentTheme === 'light';
      // Update compact toggle state
      const compactToggle = helpModalOverlay.querySelector('#tqb-compact-toggle');
      const currentCompact = loadCompact();
      compactToggle.checked = currentCompact;
      // Update auto-submit toggle state
      const autoSubmitToggle = helpModalOverlay.querySelector('#tqb-auto-submit-toggle');
      const currentAutoSubmit = loadAutoSubmit();
      autoSubmitToggle.checked = currentAutoSubmit;
      // Update show preview toggle state
      const showPreviewToggle = helpModalOverlay.querySelector('#tqb-show-preview-toggle');
      const currentShowPreview = loadShowPreview();
      showPreviewToggle.checked = currentShowPreview;
    });

    const helpModalClose = helpModalOverlay.querySelector('#tqb-help-modal-close');
    helpModalClose.addEventListener('click', () => {
      helpModalOverlay.style.display = 'none';
    });

    helpModalOverlay.addEventListener('click', (e) => {
      if (e.target === helpModalOverlay) {
        helpModalOverlay.style.display = 'none';
      }
    });

    // --- Theme Toggle ---
    const themeToggle = helpModalOverlay.querySelector('#tqb-theme-toggle');
    themeToggle.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'light' : 'dark';
      saveTheme(theme);
      applyTheme(theme);
    });

    // --- Compact Mode Toggle ---
    const compactToggle = helpModalOverlay.querySelector('#tqb-compact-toggle');
    compactToggle.addEventListener('change', (e) => {
      const compact = e.target.checked;
      saveCompact(compact);
      applyCompact(compact);
    });

    // --- Auto-Submit Toggle ---
    const autoSubmitToggle = helpModalOverlay.querySelector('#tqb-auto-submit-toggle');
    autoSubmitToggle.addEventListener('change', (e) => {
      const autoSubmit = e.target.checked;
      saveAutoSubmit(autoSubmit);
    });

    // --- Show Preview Toggle ---
    const showPreviewToggle = helpModalOverlay.querySelector('#tqb-show-preview-toggle');
    showPreviewToggle.addEventListener('change', (e) => {
      const showPreview = e.target.checked;
      saveShowPreview(showPreview);
      applyPreviewVisibility(showPreview);
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter - Paste tags to page input
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        pasteToBtn.click();
        return;
      }

      // Ctrl+S - Save current tags as favorite
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveFavoriteBtn.click();
        return;
      }

      // Ctrl+Shift+X - Copy tags from page input to builder
      if (e.ctrlKey && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        copyFromBtn.click();
        return;
      }
    });

    // --- Favorites Filters ---
    favoritesFilter.addEventListener('input', () => {
      debouncedRenderFavorites(favoritesList, favoritesFilter);
    });

    modalFavoritesFilter.addEventListener('input', () => {
      debouncedRenderFavorites(modalFavoritesList, modalFavoritesFilter);
    });

    // --- Favorites Sort ---
    favoritesSort.addEventListener('change', () => {
      renderFavorites(modalFavoritesList, modalFavoritesFilter);
    });

    // --- Export Favorites ---
    exportFavoritesBtn.addEventListener('click', () => {
      exportFavorites();
    });

    // --- Import Favorites ---
    importFavoritesBtn.addEventListener('click', () => {
      importFavorites();
    });

    /**
     * Parse query string into tag tree structure
     * @param {string} queryString - Query string to parse
     * @returns {Array} Array of tag objects
     */
    function parseQuery(queryString) {
      const result = [];
      let pos = 0;

      function peek() {
        return pos < queryString.length ? queryString[pos] : null;
      }

      function advance() {
        pos++;
      }

      function skipWhitespace() {
        while (peek() && /\s/.test(peek())) {
          advance();
        }
      }

      function parseToken() {
        skipWhitespace();
        if (!peek()) return null;

        let token = '';

        // Read until we hit whitespace or standalone ~
        // Parentheses are only special when surrounded by spaces
        while (peek() && !/\s/.test(peek())) {
          const char = peek();

          // Check if this is a standalone ~ (OR separator)
          if (char === '~') {
            // Look ahead to see if there's whitespace after
            let nextPos = pos + 1;
            if (nextPos >= queryString.length || /\s/.test(queryString[nextPos])) {
              // This might be a standalone ~ OR the end of a fuzzy tag
              // If we already have a token, include this ~ as part of it (fuzzy tag)
              if (token.length > 0) {
                token += char;
                advance();
                break; // End of fuzzy tag
              } else {
                break; // This is a standalone ~, stop parsing token
              }
            }
          } // Check if this is a standalone ( or ) (group delimiter)
          if (char === '(' || char === ')') {
            // Look around to see if this is surrounded by spaces or at string boundaries
            const prevChar = pos > 0 ? queryString[pos - 1] : ' ';
            let nextPos = pos + 1;
            const nextChar = nextPos < queryString.length ? queryString[nextPos] : ' ';

            if (/\s/.test(prevChar) && (/\s/.test(nextChar) || nextPos >= queryString.length)) {
              break; // This is a standalone paren, stop parsing token
            }
          }

          token += char;
          advance();
        }

        if (!token) return null;

        // Determine token type
        if (token.startsWith('-')) {
          return {
            op: 'not',
            tagValue: token.slice(1)
          };
        } else if (token.endsWith('~')) {
          return {
            op: 'fuzzy',
            tagValue: token.slice(0, -1)
          };
        } else if (token.includes('*')) {
          return {
            op: 'wildcard',
            tagValue: token
          };
        } else {
          return {
            op: 'and',
            tagValue: token
          };
        }
      }

      function parseGroup() {
        const items = [];
        skipWhitespace();

        // Skip opening parenthesis
        if (peek() === '(') {
          advance();
        }

        while (peek() && peek() !== ')') {
          skipWhitespace();

          if (peek() === '(') {
            // Nested group
            const nestedGroup = parseGroup();
            if (nestedGroup.length > 0) {
              items.push({
                op: 'or',
                items: nestedGroup
              });
            }
          } else if (peek() === '~') {
            // Skip OR operator
            advance();
          } else {
            // Regular token
            const token = parseToken();
            if (token) {
              items.push(token);
            }
          }

          skipWhitespace();
        }

        // Skip closing parenthesis
        if (peek() === ')') {
          advance();
        }

        return items;
      }

      // Main parsing loop
      while (pos < queryString.length) {
        skipWhitespace();
        if (!peek()) break;

        if (peek() === '(') {
          // Parse a group
          const groupItems = parseGroup();
          if (groupItems.length === 1) {
            result.push(groupItems[0]);
          } else if (groupItems.length > 1) {
            result.push({
              op: 'or',
              items: groupItems
            });
          }
        } else if (peek() === '~') {
          // Skip standalone ~ operator (shouldn't occur at top level, but handle it)
          advance();
        } else {
          // Parse a single token
          const token = parseToken();
          if (token) {
            result.push(token);
          } else {
            // If parseToken returns null but we still have a character, advance to prevent infinite loop
            advance();
          }
        }
      }

      return result;
    }

    /**
     * Initialize tags from page search input
     */
    function initFromInput() {
      const val = inputEl.value.trim();
      if (val) {
        try {
          tags = parseQuery(val);
          saveStorage();
          render();
        } catch (e) {
          console.error('Parse error:', e);
          tags = [];
          render();
        }
      } else {
        render();
      }
    }

    // Load saved state or initialize from page input
    loadStorage();

    // Load and apply theme
    const initialTheme = loadTheme();
    applyTheme(initialTheme);

    // Load and apply compact mode
    const initialCompact = loadCompact();
    applyCompact(initialCompact);

    // Load and apply preview visibility
    const initialShowPreview = loadShowPreview();
    applyPreviewVisibility(initialShowPreview);

    // Load and render favorites
    loadFavorites();
    renderAllFavorites();

    // Add keyboard shortcut for adding tags
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    // Watch for autocomplete dropdown and blur input when it appears
    // TODO: This doesn't really work, need to find a better way
    const autocompleteContainer = siteConfig.autocompleteContainer ? inputEl.closest(siteConfig.autocompleteContainer) : null;
    if (autocompleteContainer) {
      const autocompleteObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'UL') {
              // Autocomplete dropdown appeared, blur the input
              setTimeout(() => {
                inputEl.blur();
              }, 200);
            }
          });

          // Also check for style changes that make the UL visible
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target;
            if (target.tagName === 'UL' && target.style.display !== 'none' && !target.hidden) {
              setTimeout(() => {
                inputEl.blur();
              }, 200);
            }
          }
        });
      });

      autocompleteObserver.observe(autocompleteContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'hidden']
      });
    }

    /**
     * Load builder visibility state from localStorage
     * @returns {boolean} Visibility state (default: true)
     */
    function loadVisibilityState() {
      const saved = localStorage.getItem(siteVisibilityKey);
      return saved !== null ? JSON.parse(saved) : true; // Default to visible
    }

    /**
     * Save builder visibility state to localStorage
     * @param {boolean} visible - Visibility state
     */
    function saveVisibilityState(visible) {
      localStorage.setItem(siteVisibilityKey, JSON.stringify(visible));
    }

    let builderVisible = loadVisibilityState();

    /**
     * Set builder visibility and update UI
     * @param {boolean} visible - Whether builder should be visible
     */
    function setBuilderVisible(visible) {
      builderVisible = visible;
      saveVisibilityState(visible);

      if (visible) {
        builder.style.opacity = '1';
        builder.style.display = 'block';
        toggleBtn.textContent = `🟥 Hide ${siteConfig.name} Tag Builder`;
      } else {
        builder.style.opacity = '0';
        builder.style.display = 'none';
        toggleBtn.textContent = `🟦 Show ${siteConfig.name} Tag Builder`;
      }
    }

    // Initialize with saved state
    setBuilderVisible(builderVisible);

    toggleBtn.addEventListener('click', () => {
      setBuilderVisible(!builderVisible);
    });
  });
})();