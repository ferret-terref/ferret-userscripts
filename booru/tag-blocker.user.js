// ==UserScript==
// @name         Booru Tag Blocker
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Block booru tags on the front-end with persistence and UI
// @author       ferret-terref
// @license      MIT
// @homepageURL  https://github.com/ferret-terref/ferret-userscripts
// @updateURL    https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/booru/tag-blocker.user.js
// @downloadURL  https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/booru/tag-blocker.user.js
// @match        https://rule34.xxx/index.php?page=post&s=list*
// @match        https://rule34.xxx/index.php?page=post&s=view*
// @match        https://gelbooru.com/index.php?page=post&s=list*
// @match        https://gelbooru.com/index.php?page=post&s=view*
// @match        https://danbooru.donmai.us/posts*
// @match        https://e621.net/posts*
// @match        https://safebooru.org/index.php?page=post&s=list*
// @match        https://safebooru.org/index.php?page=post&s=view*
// @match        https://tbib.org/index.php?page=post&s=list*
// @match        https://tbib.org/index.php?page=post&s=view*
// @match        https://rule34.xxx/index.php?page=post&s=list*
// @match        https://gelbooru.com/index.php?page=post&s=list*
// @match        https://danbooru.donmai.us/posts
// @match        https://danbooru.donmai.us/posts?*
// @match        https://danbooru.donmai.us
// @match        https://safebooru.org/index.php?page=post&s=list*
// @match        https://tbib.org/index.php?page=post&s=list*
// @match        https://xbooru.com/index.php?page=post&s=list*
// @match        https://realbooru.com/index.php?page=post&s=list*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // Storage keys
  const STORAGE_KEY_BLOCKLIST = 'tag_blocker_list';
  const STORAGE_KEY_ACTION = 'tag_blocker_action';
  const STORAGE_KEY_ENABLED = 'tag_blocker_enabled';

  // Default blocklist
  const DEFAULT_BLOCK_LIST = [
    'scat',
    'fart',
    'gore',
    'bara',
    'overweight_male',
    'obese',
    'varren',
    'musclegut'
  ];

  // Simple solid gray placeholder with better compatibility
  const BLOCK_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="500"%3E%3Crect width="500" height="500" fill="%23333"/%3E%3Ctext x="250" y="240" font-family="Arial,sans-serif" font-size="60" fill="%23666" text-anchor="middle"%3E%F0%9F%9A%AB%3C/text%3E%3Ctext x="250" y="280" font-family="Arial,sans-serif" font-size="20" fill="%23888" text-anchor="middle"%3EBlocked Content%3C/text%3E%3C/svg%3E';

  // CSS for UI (using Tag Builder design system for integration)

  const UI_CSS = `:root {
      --tqb-bg-primary: #1e293b;
      --tqb-bg-secondary: #0f172a;
      --tqb-bg-tertiary: #374151;
      --tqb-bg-input: #1f2937;
      --tqb-bg-hover: #4b5563;
      --tqb-text-primary: #f8fafc;
      --tqb-text-secondary: #9ca3af;
      --tqb-text-tertiary: #6b7280;
      --tqb-accent-blue: #60a5fa;
      --tqb-accent-blue-dark: #1e40af;
      --tqb-border-color: #374151;
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

    /* Floating settings button (only for standalone mode) */
    .tag-blocker-settings-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--tqb-accent-blue);
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 1.5rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
      z-index: 99999;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tag-blocker-settings-button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 16px rgba(96, 165, 250, 0.6);
      background: var(--tqb-accent-blue-dark);
    }
    .tag-blocker-settings-button:active {
      transform: translateY(0) scale(0.98);
    }

    .tag-blocker-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--tqb-bg-primary);
      color: var(--tqb-text-primary);
      padding: 20px;
      border-radius: var(--tqb-radius-lg);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 10000;
      max-width: 500px;
      width: 90%;
    }
    .tag-blocker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 9999;
    }
    .tag-blocker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid var(--tqb-border-color);
      padding-bottom: 10px;
    }
    .tag-blocker-close {
      background: var(--tqb-text-tertiary);
      color: white;
      border: none;
      border-radius: var(--tqb-radius-sm);
      padding: 5px 10px;
      cursor: pointer;
    }
    .tag-blocker-close:hover {
      background: var(--tqb-bg-hover);
    }
    .tag-blocker-textarea {
      width: 100%;
      min-height: 200px;
      background: var(--tqb-bg-input);
      color: var(--tqb-text-primary);
      border: 1px solid var(--tqb-border-color);
      border-radius: var(--tqb-radius-sm);
      padding: 10px;
      font-family: monospace;
      margin-bottom: 10px;
    }
    .tag-blocker-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tag-blocker-select {
      flex: 1;
      background: var(--tqb-bg-input);
      color: var(--tqb-text-primary);
      border: 1px solid var(--tqb-border-color);
      border-radius: var(--tqb-radius-sm);
      padding: 8px;
    }
    .tag-blocker-button {
      background: var(--tqb-accent-blue);
      color: white;
      border: none;
      border-radius: var(--tqb-radius-sm);
      padding: 8px 15px;
      cursor: pointer;
    }
    .tag-blocker-button:hover {
      background: var(--tqb-accent-blue-dark);
    }
    .tag-blocker-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tag-blocker-stats {
      margin-top: 10px;
      padding: 10px;
      background: var(--tqb-bg-secondary);
      border-radius: var(--tqb-radius-sm);
      font-size: var(--tqb-font-sm);
      color: var(--tqb-text-secondary);
    }

    /* Tag Builder integration styles */
    .tqb-shortcut-item { display: flex; justify-content: space-between; align-items: center; padding: var(--tqb-spacing-md); margin-bottom: var(--tqb-spacing-sm); background: var(--tqb-bg-secondary); border-radius: var(--tqb-radius-sm); }
    .tqb-setting-label { color: var(--tqb-text-primary); font-size: var(--tqb-font-md); min-width: 200px; }
    .tqb-setting-toggle-container { display: flex; align-items: center; gap: var(--tqb-spacing-md); min-width: 200px; }
    .tqb-setting-text { color: var(--tqb-text-secondary); font-size: var(--tqb-font-sm); }
    .tqb-toggle-wrapper { display: inline-flex; align-items: center; cursor: pointer; position: relative; width: 40px; height: 20px; }
    .tqb-toggle-track { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--tqb-bg-tertiary); border-radius: 20px; transition: 0.3s; }
    .tqb-toggle-thumb { position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: 0.3s; }
    .tqb-toggle-wrapper input:checked + .tqb-toggle-track { background-color: var(--tqb-accent-blue); }
    .tqb-toggle-wrapper input:checked ~ .tqb-toggle-thumb { transform: translateX(20px); }
    .tqb-section-title-spaced { color: var(--tqb-accent-blue); margin-top: var(--tqb-spacing-lg); margin-bottom: var(--tqb-spacing-md); font-size: var(--tqb-font-md); }
  `;

  // Get blocklist from storage or use default
  function getBlocklist() {
    const stored = GM_getValue(STORAGE_KEY_BLOCKLIST);
    return stored ? JSON.parse(stored) : DEFAULT_BLOCK_LIST;
  }

  // Save blocklist to storage
  function saveBlocklist(list) {
    GM_setValue(STORAGE_KEY_BLOCKLIST, JSON.stringify(list));
  }

  // Get action from storage or use default
  function getAction() {
    return GM_getValue(STORAGE_KEY_ACTION, 'remove');
  }

  // Save action to storage
  function saveAction(action) {
    GM_setValue(STORAGE_KEY_ACTION, action);
  }

  // Get enabled state
  function isEnabled() {
    return GM_getValue(STORAGE_KEY_ENABLED, true);
  }

  // Save enabled state
  function setEnabled(enabled) {
    GM_setValue(STORAGE_KEY_ENABLED, enabled);
  }

  // Inject CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = UI_CSS;
  document.head.appendChild(styleEl);

  // Stats
  let blockedCount = 0;

  // Main blocking function
  function main() {
    blockedCount = 0;
    const posts = document.querySelectorAll('.thumb img, .post-preview img');

    for (let post of posts) {
      if (!post.hasAttribute('data-tag-blocker-checked')) {
        if (postContainsBlockedTag(post)) {
          takeAction(post);
          blockedCount++;
        }
        post.setAttribute('data-tag-blocker-checked', 'true');
      }
    }
  }

  // Observe DOM changes for dynamic content
  function setupObserver() {
    const observer = new MutationObserver(() => {
      if (isEnabled()) {
        main();
        addBlockButtons(); // Also update block buttons when DOM changes
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function postContainsBlockedTag(post) {
    const tags = post.alt || post.title || '';
    const blocklist = getBlocklist();

    return blocklist.some(blockedTag => {
      // Match whole words with word boundaries
      const regex = new RegExp(`\\b${blockedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(tags);
    });
  }

  function takeAction(post) {
    const action = getAction();

    if (action === 'remove') {
      const parent = post.closest('.thumb, .post-preview, article');
      if (parent) {
        parent.style.display = 'none';
      } else {
        post.parentElement?.remove();
      }
    } else if (action === 'replace') {
      post.src = BLOCK_IMG;
    } else if (action === 'blur') {
      post.style.filter = 'blur(20px)';
      post.style.transition = 'filter 0.3s';
      post.addEventListener('click', function () {
        this.style.filter = 'none';
      }, {
        once: true
      });
    }
  }

  // UI Functions
  function showSettingsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'tag-blocker-overlay';

    const modal = document.createElement('div');
    modal.className = 'tag-blocker-modal';

    const blocklist = getBlocklist();
    const action = getAction();
    const enabled = isEnabled();
    modal.innerHTML = `
      <div class="tag-blocker-header">
        <h3>Tag Blocker Settings</h3>
        <button class="tag-blocker-close">✕</button>
      </div>
      <div class="tag-blocker-toggle">
        <label>
          <input type="checkbox" id="tag-blocker-enabled" ${enabled ? 'checked' : ''}>
          Enable Tag Blocker
        </label>
      </div>
      <br>
      <label>Blocked Tags (one per line):</label>
      <textarea class="tag-blocker-textarea" id="tag-blocker-list">${blocklist.join('\n')}</textarea>
      <div class="tag-blocker-actions">
        <select class="tag-blocker-select" id="tag-blocker-action">
          <option value="remove" ${action === 'remove' ? 'selected' : ''}>Remove posts</option>
          <option value="replace" ${action === 'replace' ? 'selected' : ''}>Replace with placeholder</option>
          <option value="blur" ${action === 'blur' ? 'selected' : ''}>Blur (click to reveal)</option>
        </select>
        <button class="tag-blocker-button" id="tag-blocker-save">Save & Apply</button>
      </div>
      <div class="tag-blocker-stats">
        Blocked ${blockedCount} post(s) on this page
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.tag-blocker-close').addEventListener('click', () => {
      overlay.remove();
      modal.remove();
    });

    overlay.addEventListener('click', () => {
      overlay.remove();
      modal.remove();
    });

    modal.querySelector('#tag-blocker-save').addEventListener('click', () => {
      const textarea = modal.querySelector('#tag-blocker-list');
      const newList = textarea.value.split('\n')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const newAction = modal.querySelector('#tag-blocker-action').value;
      const newEnabled = modal.querySelector('#tag-blocker-enabled').checked;

      saveBlocklist(newList);
      saveAction(newAction);
      setEnabled(newEnabled);

      // Reset checked state and reapply
      document.querySelectorAll('[data-tag-blocker-checked]').forEach(el => {
        el.removeAttribute('data-tag-blocker-checked');
        el.style.filter = '';
        el.closest('.thumb, .post-preview, article')?.removeAttribute('style');
      });

      main();

      overlay.remove();
      modal.remove();

      alert('Settings saved! Page will refresh to apply changes.');
      location.reload();
    });
  }

  // Initialize UI - integrate with Tag Builder if present
  function initializeUI() {
    // Check if Tag Builder is present
    const tagBuilderPreferences = document.querySelector('#tqb-help-modal .tqb-help-content');

    if (tagBuilderPreferences) {
      // Tag Builder is present - add our settings to its preferences modal
      console.log('Tag Blocker: Integrating with Tag Builder preferences');

      // Find the keyboard shortcuts section to insert before it
      const keyboardSection = tagBuilderPreferences.querySelector('.tqb-section-title-spaced');
      if (keyboardSection) {
        const blockerSettingHTML = `
          <h4 class="tqb-section-title-spaced">🚫 Tag Blocker Settings <i>(ferret tag blocker)</i></h4>
          <div class="tqb-shortcut-item">
            <span class="tqb-setting-label">Enable Tag Blocker</span>
            <div class="tqb-setting-toggle-container">
              <span class="tqb-setting-text">Off</span>
              <label class="tqb-toggle-wrapper">
                <input type="checkbox" id="tb-enabled-toggle" style="opacity:0;width:0;height:0;">
                <span class="tqb-toggle-track"></span>
                <span class="tqb-toggle-thumb"></span>
              </label>
              <span class="tqb-setting-text">On</span>
            </div>
          </div>
          <div class="tqb-shortcut-item">
            <span class="tqb-setting-label">Block Action</span>
            <select class="tag-blocker-select" id="tb-action-select" style="background: var(--tqb-bg-input); color: var(--tqb-text-primary); border: 1px solid var(--tqb-border-color); border-radius: var(--tqb-radius-sm); padding: 8px;">
              <option value="remove">Remove posts</option>
              <option value="replace">Replace with placeholder</option>
              <option value="blur">Blur (click to reveal)</option>
            </select>
          </div>
          <div class="tqb-shortcut-item" style="flex-direction: column; align-items: stretch;">
            <span class="tqb-setting-label" style="margin-bottom: 8px;">Blocked Tags (one per line)</span>
            <textarea id="tb-blocklist-textarea" style="width: 100%; min-height: 150px; background: var(--tqb-bg-input); color: var(--tqb-text-primary); border: 1px solid var(--tqb-border-color); border-radius: var(--tqb-radius-sm); padding: 10px; font-family: monospace; resize: vertical;"></textarea>
          </div>
          <div class="tqb-shortcut-item">
            <button id="tb-save-button" class="tag-blocker-button" style="width: 100%;">Save & Apply</button>
          </div>
        `;

        // Insert before the keyboard shortcuts section
        keyboardSection.insertAdjacentHTML('beforebegin', blockerSettingHTML);

        // Setup the enabled toggle
        const enabledToggle = document.querySelector('#tb-enabled-toggle');
        if (enabledToggle) {
          enabledToggle.checked = isEnabled();
          enabledToggle.addEventListener('change', (e) => {
            setEnabled(e.target.checked);
            console.log(`Tag Blocker enabled: ${e.target.checked}`);
          });
        }

        // Setup the action select
        const actionSelect = document.querySelector('#tb-action-select');
        if (actionSelect) {
          actionSelect.value = getAction();
          actionSelect.addEventListener('change', (e) => {
            saveAction(e.target.value);
            console.log(`Tag Blocker action changed to: ${e.target.value}`);
          });
        }

        // Setup the blocklist textarea
        const blocklistTextarea = document.querySelector('#tb-blocklist-textarea');
        if (blocklistTextarea) {
          blocklistTextarea.value = getBlocklist().join('\n');
        }

        // Setup the save button
        const saveButton = document.querySelector('#tb-save-button');
        if (saveButton) {
          saveButton.addEventListener('click', () => {
            const textarea = document.querySelector('#tb-blocklist-textarea');
            const newList = textarea.value.split('\n')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);

            const newAction = document.querySelector('#tb-action-select').value;
            const newEnabled = document.querySelector('#tb-enabled-toggle').checked;

            saveBlocklist(newList);
            saveAction(newAction);
            setEnabled(newEnabled);

            // Reset checked state and reapply
            document.querySelectorAll('[data-tag-blocker-checked]').forEach(el => {
              el.removeAttribute('data-tag-blocker-checked');
              el.style.filter = '';
              el.closest('.thumb, .post-preview, article')?.removeAttribute('style');
            });

            main();

            alert('Tag Blocker settings saved! Reloading page...');
            location.reload();
          });
        }
      }
    } else {
      // No Tag Builder - create standalone floating button
      console.log('Tag Blocker: Creating standalone settings button');
      const settingsButton = document.createElement('button');
      settingsButton.className = 'tag-blocker-settings-button';
      settingsButton.innerHTML = '🚫';
      settingsButton.title = 'Tag Blocker Settings';
      settingsButton.setAttribute('aria-label', 'Open Tag Blocker Settings');
      settingsButton.addEventListener('click', () => {
        console.log('Tag Blocker: Settings button clicked');
        showSettingsModal();
      });

      // Ensure body exists before appending
      if (document.body) {
        document.body.appendChild(settingsButton);
        console.log('Tag Blocker: Settings button added to page');
      } else {
        console.error('Tag Blocker: document.body not available yet');
      }

      // Also register menu command for standalone mode
      if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Tag Blocker Settings', showSettingsModal);
        console.log('Tag Blocker: Menu command registered');
      }
    }
  }
  // Add "Block" buttons to sidebar tags
  function addBlockButtons() {
    const tagList = document.querySelector('#tag-sidebar, .tag-sidebar, ul.tag-list');
    if (!tagList) return;

    const tagItems = tagList.querySelectorAll('li');

    tagItems.forEach(li => {
      // Skip if already processed
      if (li.hasAttribute('data-blocker-processed')) return;
      li.setAttribute('data-blocker-processed', 'true');

      // Find all <a> tags in this <li>
      const links = li.querySelectorAll('a');
      if (links.length === 0) return;

      // Get the last link (should be the tag link)
      const lastLink = links[links.length - 1];
      const href = lastLink.getAttribute('href');

      // Extract tag from URL
      if (href && href.includes('tags=')) {
        const match = href.match(/tags=([^&]+)/);
        if (match) {
          const tagName = decodeURIComponent(match[1]);

          // Create block button
          const blockBtn = document.createElement('span');
          blockBtn.textContent = '🚫';
          blockBtn.title = `Block tag: ${tagName}`;
          blockBtn.style.cssText = 'cursor: pointer; margin-left: 5px; opacity: 0.6; font-size: 0.9em;';
          blockBtn.addEventListener('mouseenter', () => blockBtn.style.opacity = '1');
          blockBtn.addEventListener('mouseleave', () => blockBtn.style.opacity = '0.6');

          blockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Add tag to blocklist
            const currentList = getBlocklist();
            if (!currentList.includes(tagName)) {
              currentList.push(tagName);
              saveBlocklist(currentList);

              // Visual feedback
              blockBtn.textContent = '✓';
              blockBtn.style.color = '#10b981';
              setTimeout(() => {
                li.style.opacity = '0.3';
                li.style.textDecoration = 'line-through';
              }, 200);

              // Re-run main to block posts with this tag
              document.querySelectorAll('[data-tag-blocker-checked]').forEach(el => {
                el.removeAttribute('data-tag-blocker-checked');
              });
              main();

              console.log(`Added "${tagName}" to blocklist`);
            } else {
              alert(`"${tagName}" is already in the blocklist`);
            }
          });

          // Insert button after the last link
          lastLink.parentNode.insertBefore(blockBtn, lastLink.nextSibling);
        }
      }
    });
  }

  // Wait for DOM and initialize
  window.addEventListener('load', function () {
    if (isEnabled()) {
      main();
    }
    setupObserver();
    initializeUI();
    addBlockButtons();
  }, false);
})();