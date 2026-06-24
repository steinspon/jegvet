(function () {
  'use strict';
  var findState = {
    hits: [],
    activeIndex: -1
  };

  function t(key, fallback) {
    if (window.JegVetLang && typeof window.JegVetLang.t === 'function') {
      return window.JegVetLang.t(key, fallback);
    }
    return fallback || key;
  }

  function foldNordic(text) {
    return String(text || '')
      .replace(/[Ææ]/g, 'ae')
      .replace(/[Øø]/g, 'o')
      .replace(/[Åå]/g, 'aa');
  }

  function normalizeForSearch(text) {
    var value = foldNordic(text).toLowerCase();
    if (typeof value.normalize === 'function') {
      value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return value;
  }


  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFolderDisplayName(segment) {
    return String(segment || '');
  }

  function resolveMarkdownPath(url, currentFile) {
    if (!url || /^(https?:|mailto:|tel:|#)/i.test(url)) {
      return url;
    }

    if (url.indexOf('/') === 0) {
      return url.slice(1);
    }

    var base = 'wiki/content/';
    var parts = (base + currentFile).split('/');
    parts.pop();

    url.split('/').forEach(function (part) {
      if (!part || part === '.') {
        return;
      }
      if (part === '..') {
        if (parts.length > 1) {
          parts.pop();
        }
        return;
      }
      parts.push(part);
    });

    return parts.join('/');
  }

  function formatInline(text, currentFile) {
    var html = escapeHtml(text);
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      return '<img src="' + resolveMarkdownPath(src, currentFile) + '" alt="' + alt + '" class="md-image" />';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var resolved = resolveMarkdownPath(href, currentFile);
      var external = /^(https?:|mailto:|tel:)/i.test(href);
      var target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + resolved + '"' + target + '>' + label + '</a>';
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    return html;
  }

  function markdownToHtml(markdown, currentFile) {
    var lines = markdown.replace(/\r/g, '').split('\n');
    var html = [];
    var inList = false;
    var inOrderedList = false;
    var headingIdCounts = {};

    function slugify(text) {
      var base = normalizeForSearch(text)
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      if (!base) {
        base = 'section';
      }

      headingIdCounts[base] = (headingIdCounts[base] || 0) + 1;
      if (headingIdCounts[base] > 1) {
        return base + '-' + headingIdCounts[base];
      }
      return base;
    }

    function closeLists() {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        html.push('</ol>');
        inOrderedList = false;
      }
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) {
        closeLists();
        return;
      }

      if (trimmed.indexOf('### ') === 0) {
        closeLists();
        html.push('<h3 id="' + slugify(trimmed.slice(4)) + '">' + formatInline(trimmed.slice(4), currentFile) + '</h3>');
        return;
      }

      if (trimmed.indexOf('## ') === 0) {
        closeLists();
        html.push('<h2 id="' + slugify(trimmed.slice(3)) + '">' + formatInline(trimmed.slice(3), currentFile) + '</h2>');
        return;
      }

      if (trimmed.indexOf('# ') === 0) {
        closeLists();
        html.push('<h1 id="' + slugify(trimmed.slice(2)) + '">' + formatInline(trimmed.slice(2), currentFile) + '</h1>');
        return;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        if (inList) {
          html.push('</ul>');
          inList = false;
        }
        if (!inOrderedList) {
          html.push('<ol>');
          inOrderedList = true;
        }
        html.push('<li>' + formatInline(trimmed.replace(/^\d+\.\s+/, ''), currentFile) + '</li>');
        return;
      }

      if (trimmed.indexOf('- ') === 0) {
        if (inOrderedList) {
          html.push('</ol>');
          inOrderedList = false;
        }
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push('<li>' + formatInline(trimmed.slice(2), currentFile) + '</li>');
        return;
      }

      closeLists();

      if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
        html.push('<p>' + formatInline(trimmed, currentFile) + '</p>');
        return;
      }

      html.push('<p>' + formatInline(trimmed, currentFile) + '</p>');
    });

    closeLists();
    return html.join('\n');
  }

  async function loadManifestData() {
    return window.JegVetWikiContent.loadManifestData();
  }

  async function loadMarkdown(file) {
    return window.JegVetWikiContent.loadMarkdown(file);
  }

  function isFolderOverviewPage(page) {
    return !!(page && /(^|\/)oversikt\.md$/i.test(page.file || ''));
  }

  function buildTree(pages) {
    var root = { folders: {}, pages: [], overviewPage: null };

    pages.forEach(function (page) {
      var folderPath = (page.folder || '').replace(/\\/g, '/');
      var parts = folderPath && folderPath !== 'General' ? folderPath.split('/').filter(Boolean) : [];
      var node = root;

      parts.forEach(function (part) {
        if (!node.folders[part]) {
          node.folders[part] = { folders: {}, pages: [], overviewPage: null };
        }
        node = node.folders[part];
      });

      if (isFolderOverviewPage(page)) {
        node.overviewPage = page;
      } else {
        node.pages.push(page);
      }
    });

    return root;
  }

  function renderTree(node, parentEl, navLinks, onClickPage, folderPrefix, activeFile) {
    var nodeHasActive = false;
    var folderNames = Object.keys(node.folders).sort(function (a, b) {
      return getFolderDisplayName(a).localeCompare(getFolderDisplayName(b), undefined, { sensitivity: 'base' });
    });
    folderNames.forEach(function (folderName) {
      var childNode = node.folders[folderName];
      var li = document.createElement('li');
      var fullPath = folderPrefix ? folderPrefix + '/' + folderName : folderName;
      var hasNestedContent = Object.keys(childNode.folders).length > 0 || childNode.pages.length > 0;
      var hasOverview = !!childNode.overviewPage;

      if (!hasNestedContent && hasOverview) {
        var singleLink = document.createElement('a');
        singleLink.href = '#';
        singleLink.textContent = getFolderDisplayName(folderName);
        singleLink.className = 'wiki-folder-link wiki-folder-link-standalone';
        singleLink.setAttribute('data-file', childNode.overviewPage.file);
        singleLink.addEventListener('click', function (event) {
          event.preventDefault();
          onClickPage(childNode.overviewPage);
        });
        navLinks.push(singleLink);
        li.appendChild(singleLink);
        if (activeFile && childNode.overviewPage.file === activeFile) {
          nodeHasActive = true;
        }
        parentEl.appendChild(li);
        return;
      }

      var folderRow = document.createElement('div');
      folderRow.className = 'wiki-folder-row';

      var folderButton = document.createElement('button');
      folderButton.type = 'button';
      folderButton.className = 'wiki-folder-toggle';
      folderButton.title = fullPath;
      folderButton.setAttribute('aria-expanded', 'false');
      folderButton.innerHTML = '<span class="wiki-folder-caret" aria-hidden="true">&#9656;</span>';
      folderRow.appendChild(folderButton);

      var folderLabelEl;
      function expandFolder() {
        folderButton.setAttribute('aria-expanded', 'true');
        folderButton.classList.add('is-expanded');
        nested.classList.remove('is-collapsed');
      }

      if (hasOverview) {
        folderLabelEl = document.createElement('a');
        folderLabelEl.href = '#';
        folderLabelEl.textContent = getFolderDisplayName(folderName);
        folderLabelEl.className = 'wiki-folder-link';
        folderLabelEl.setAttribute('data-file', childNode.overviewPage.file);
        folderLabelEl.addEventListener('click', function (event) {
          event.preventDefault();
          expandFolder();
          onClickPage(childNode.overviewPage);
        });
        navLinks.push(folderLabelEl);
      } else {
        folderLabelEl = document.createElement('button');
        folderLabelEl.type = 'button';
        folderLabelEl.className = 'wiki-folder-link wiki-folder-link-button';
        folderLabelEl.textContent = getFolderDisplayName(folderName);
      }
      folderRow.appendChild(folderLabelEl);
      li.appendChild(folderRow);

      var nested = document.createElement('ul');
      nested.className = 'wiki-folder-list';
      var childHasActive = renderTree(childNode, nested, navLinks, onClickPage, fullPath, activeFile);
      if (hasOverview && activeFile && childNode.overviewPage.file === activeFile) {
        childHasActive = true;
      }
      nodeHasActive = nodeHasActive || childHasActive;
      if (!childHasActive) {
        nested.classList.add('is-collapsed');
      } else {
        expandFolder();
      }

      function toggleFolder() {
        var expanded = folderButton.getAttribute('aria-expanded') === 'true';
        folderButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        folderButton.classList.toggle('is-expanded', !expanded);
        nested.classList.toggle('is-collapsed', expanded);
      }

      folderButton.addEventListener('click', toggleFolder);
      if (!hasOverview) {
        folderLabelEl.addEventListener('click', toggleFolder);
      }

      li.appendChild(nested);
      parentEl.appendChild(li);
    });

    node.pages
      .sort(function (a, b) {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      })
      .forEach(function (page) {
        var li = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#';
        link.textContent = page.title;
        link.setAttribute('data-file', page.file);
        link.addEventListener('click', function (event) {
          event.preventDefault();
          onClickPage(page);
        });

        navLinks.push(link);
        li.appendChild(link);
        parentEl.appendChild(li);

        if (activeFile && page.file === activeFile) {
          nodeHasActive = true;
        }
      });

    return nodeHasActive;
  }

  function clearSearchHitHighlight() {
    var previous = document.querySelector('.wiki-search-hit');
    if (previous) {
      previous.classList.remove('wiki-search-hit');
    }
  }

  function highlightHashTarget() {
    var article = document.getElementById('wiki-article');
    if (!article) {
      return;
    }

    clearSearchHitHighlight();
    if (!window.location.hash) {
      return;
    }

    var rawId = window.location.hash.replace(/^#/, '');
    var targetId = '';
    try {
      targetId = decodeURIComponent(rawId);
    } catch (error) {
      targetId = rawId;
    }

    if (!targetId) {
      return;
    }

    var target = document.getElementById(targetId);
    if (!target || !article.contains(target)) {
      return;
    }

    target.classList.add('wiki-search-hit');
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 140);
    });
  }

  function clearFindHighlights() {
    var article = document.getElementById('wiki-article');
    if (!article) {
      return;
    }

    var marks = article.querySelectorAll('mark.wiki-find-hit');
    for (var i = 0; i < marks.length; i += 1) {
      var mark = marks[i];
      var textNode = document.createTextNode(mark.textContent);
      mark.parentNode.replaceChild(textNode, mark);
    }

    article.normalize();
    findState.hits = [];
    findState.activeIndex = -1;
  }

  function updateFindCount() {
    var countEl = document.getElementById('wiki-find-count');
    if (!countEl) {
      return;
    }
    if (!findState.hits.length) {
      countEl.textContent = '0/0';
      return;
    }
    countEl.textContent = (findState.activeIndex + 1) + '/' + findState.hits.length;
  }

  function getTextNodes(root) {
    var nodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        var parentTag = node.parentNode && node.parentNode.nodeName ? node.parentNode.nodeName.toUpperCase() : '';
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }
    return nodes;
  }

  function setActiveFindHit(index, shouldScroll) {
    if (!findState.hits.length) {
      findState.activeIndex = -1;
      updateFindCount();
      return;
    }

    for (var i = 0; i < findState.hits.length; i += 1) {
      findState.hits[i].classList.toggle('is-active', i === index);
    }

    findState.activeIndex = index;
    updateFindCount();

    if (shouldScroll) {
      findState.hits[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function applyFind(term) {
    clearFindHighlights();
    var article = document.getElementById('wiki-article');
    if (!article) {
      updateFindCount();
      return;
    }

    var query = (term || '').trim();
    if (!query) {
      updateFindCount();
      return;
    }

    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var pattern = new RegExp(escaped, 'gi');
    var textNodes = getTextNodes(article);

    for (var i = 0; i < textNodes.length; i += 1) {
      var node = textNodes[i];
      var text = node.nodeValue;
      pattern.lastIndex = 0;
      if (!pattern.test(text)) {
        continue;
      }

      var frag = document.createDocumentFragment();
      var lastIndex = 0;
      pattern.lastIndex = 0;
      var match = pattern.exec(text);

      while (match) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        var mark = document.createElement('mark');
        mark.className = 'wiki-find-hit';
        mark.textContent = match[0];
        frag.appendChild(mark);
        findState.hits.push(mark);
        lastIndex = match.index + match[0].length;
        match = pattern.exec(text);
      }

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      node.parentNode.replaceChild(frag, node);
    }

    if (findState.hits.length) {
      setActiveFindHit(0, true);
    } else {
      updateFindCount();
    }
  }

  function moveFind(step) {
    if (!findState.hits.length) {
      return;
    }
    var next = (findState.activeIndex + step + findState.hits.length) % findState.hits.length;
    setActiveFindHit(next, true);
  }

  function setupFindUi() {
    var input = document.getElementById('wiki-find-input');
    var prevBtn = document.getElementById('wiki-find-prev');
    var nextBtn = document.getElementById('wiki-find-next');
    if (!input || !prevBtn || !nextBtn) {
      return;
    }

    input.addEventListener('input', function () {
      applyFind(input.value);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        moveFind(event.shiftKey ? -1 : 1);
      }
    });

    prevBtn.addEventListener('click', function () {
      moveFind(-1);
    });

    nextBtn.addEventListener('click', function () {
      moveFind(1);
    });
  }
  async function loadPage(file, title, navLinks, options) {
    var article = document.getElementById('wiki-article');
    if (!article) {
      return;
    }
    var keepHash = options && options.keepHash;
    var hitQuery = options && options.hitQuery ? options.hitQuery : '';

    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-file') === file);
    });

    article.innerHTML = '<p>' + escapeHtml(t('wiki_loading_short', 'Loading...')) + '</p>';

    try {
      var markdown = await loadMarkdown(file);
      if (window.JegVetWikiContent && typeof window.JegVetWikiContent.extractLocalizedMarkdown === 'function') {
        markdown = window.JegVetWikiContent.extractLocalizedMarkdown(markdown, file);
      }
      article.innerHTML = markdownToHtml(markdown, file);
      document.title = title + ' | ' + t('wiki_title_suffix', 'Wiki') + ' | JegVet';
      var nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('page', file);
      if (hitQuery) {
        nextUrl.searchParams.set('hit', hitQuery);
      } else {
        nextUrl.searchParams.delete('hit');
      }
      if (!keepHash) {
        nextUrl.hash = '';
      }
      window.history.replaceState({}, '', nextUrl.toString());
      highlightHashTarget();
      var findInput = document.getElementById('wiki-find-input');
      if (findInput && hitQuery) {
        findInput.value = hitQuery;
        applyFind(hitQuery);
      } else if (findInput && findInput.value.trim()) {
        applyFind(findInput.value);
      } else {
        clearFindHighlights();
        updateFindCount();
      }
    } catch (error) {
      article.innerHTML = '<p>' + escapeHtml(t('wiki_load_error', 'Unable to load this entry. Check file path and try again.')) + '</p>';
    }
  }

  async function initWiki() {
    var nav = document.getElementById('wiki-nav');
    var article = document.getElementById('wiki-article');
    if (!nav || !article) {
      return;
    }

    try {
      var manifest = await loadManifestData();
      var pages = (manifest.pages || []).slice().map(function (page) {
        var nextPage = {
          file: page.file,
          title: page.title,
          folder: page.folder
        };

        if (window.JegVetWikiContent) {
          if (typeof window.JegVetWikiContent.localizePageTitle === 'function') {
            nextPage.title = window.JegVetWikiContent.localizePageTitle(nextPage.file, nextPage.title);
          }
          if (typeof window.JegVetWikiContent.humanizeFileName === 'function' && !nextPage.title) {
            nextPage.title = window.JegVetWikiContent.humanizeFileName((nextPage.file || '').split('/').pop() || '');
          }
        }

        return nextPage;
      }).sort(function (a, b) {
        return a.file.localeCompare(b.file, undefined, { sensitivity: 'base' });
      });

      var navLinks = [];
      nav.innerHTML = '';

      var tree = buildTree(pages);
      var rootList = document.createElement('ul');
      rootList.className = 'wiki-tree-root';

      function handlePageClick(page) {
        loadPage(page.file, page.title, navLinks, { keepHash: false });
      }

      var params = new URLSearchParams(window.location.search);
      var requestedFile = params.get('page');
      var hitQuery = params.get('hit') || '';
      var initialPage = null;

      if (requestedFile) {
        requestedFile = requestedFile.replace(/\\/g, '/');
      }

      if (requestedFile) {
        initialPage = pages.find(function (page) {
          return page.file === requestedFile;
        }) || null;
      }

      renderTree(tree, rootList, navLinks, handlePageClick, '', requestedFile);
      nav.appendChild(rootList);

      if (initialPage) {
        loadPage(initialPage.file, initialPage.title, navLinks, { keepHash: true, hitQuery: hitQuery });
      } else if (pages.length) {
        loadPage(pages[0].file, pages[0].title, navLinks, { keepHash: false });
      } else {
        article.innerHTML = '<p>' + escapeHtml(t('wiki_no_pages', 'No wiki pages are configured yet.')) + '</p>';
      }
    } catch (error) {
      nav.innerHTML = '<p>' + escapeHtml(t('wiki_nav_error', 'Could not load wiki navigation.')) + '</p>';
      article.innerHTML = '<p>' + escapeHtml(t('wiki_content_error', 'Could not load wiki content.')) + '</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWiki);
  } else {
    initWiki();
  }

  document.addEventListener('jegvet:langchange', function () {
    initWiki();
  });

  setupFindUi();
  window.addEventListener('hashchange', highlightHashTarget);
})();





