// ==UserScript==
// @name         Stash Gallery URL Opener
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add open buttons to gallery URLs in Stash
// @author       ferret-terref
// @license      MIT
// @homepageURL  https://github.com/ferret-terref/ferret-userscripts
// @updateURL    https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/stash/stash-gallery-url-opener.user.js
// @downloadURL  https://github.com/ferret-terref/ferret-userscripts/raw/refs/heads/main/stash/stash-gallery-url-opener.user.js
// @match        http://localhost:9999/galleries/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Extract gallery ID from URL
  const pathParts = window.location.pathname.split('/galleries/')[1];
  const galleryId = pathParts?.split('/')[0];
  if (!galleryId) {
    console.log('[URL Opener] No gallery ID found in URL');
    return;
  }

  console.log(`[URL Opener] Gallery ID: ${galleryId}`);

  // Function to add buttons to URL inputs
  function addOpenButtons() {
    const detailsContainer = document.querySelector('#gallery-edit-details');
    if (!detailsContainer) {
      console.log('[URL Opener] Gallery details container not found');
      return;
    }

    const stringListInput = detailsContainer.querySelector('.string-list-input');
    if (!stringListInput) {
      console.log('[URL Opener] String list input not found');
      return;
    }

    const inputGroups = stringListInput.querySelectorAll('.input-group');
    console.log(`[URL Opener] Found ${inputGroups.length} input groups`);

    inputGroups.forEach((inputGroup, index) => {
      // Check if button already exists
      const appendDiv = inputGroup.querySelector('.input-group-append');
      if (!appendDiv) return;

      // Skip if we already added a button
      if (appendDiv.querySelector('.url-opener-btn')) return;

      const input = inputGroup.querySelector('input');
      if (!input) return;

      // Create the open button
      const openBtn = document.createElement('button');
      openBtn.className = 'btn btn-primary url-opener-btn';
      openBtn.type = 'button';
      openBtn.innerText = 'Open';
      openBtn.style.marginLeft = '5px';

      openBtn.addEventListener('click', () => {
        const url = input.value.trim();
        if (!url) {
          alert('URL is empty');
          return;
        }

        // Build the new URL with gallery ID as query param
        let newUrl;
        try {
          const urlObj = new URL(url);
          // Check if URL already has query params
          if (urlObj.search) {
            // Has existing params, use &
            newUrl = `${url}&stashGalleryId=${galleryId}`;
          } else {
            // No existing params, use ?
            newUrl = `${url}?stashGalleryId=${galleryId}`;
          }
        } catch (e) {
          // If URL parsing fails, just append as if no params exist
          newUrl = `${url}?stashGalleryId=${galleryId}`;
        }

        console.log(`[URL Opener] Opening: ${newUrl}`);
        window.open(newUrl, '_blank');
      });

      // Add button to the append div
      appendDiv.appendChild(openBtn);
    });
  }

  // Initial run
  setTimeout(addOpenButtons, 500);

  // Watch for changes (in case URLs are added dynamically)
  const observer = new MutationObserver(() => {
    addOpenButtons();
  });

  // Start observing when the details container appears
  const checkForContainer = setInterval(() => {
    const detailsContainer = document.querySelector('#gallery-edit-details');
    if (detailsContainer) {
      observer.observe(detailsContainer, {
        childList: true,
        subtree: true
      });
      clearInterval(checkForContainer);
      console.log('[URL Opener] Started observing for changes');
    }
  }, 500);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkForContainer), 10000);

})();