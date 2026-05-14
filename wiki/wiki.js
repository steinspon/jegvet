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


  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function humanizeFolderName(segment) {
    return segment
      .split('-')
      .map(function (part) {
        if (!part) {
          return '';
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
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
      var base = text
        .toLowerCase()
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

  function normalizeManifestFromLegacyNav(navData) {
    var pages = [];
    navData.sections.forEach(function (section) {
      section.pages.forEach(function (page) {
        pages.push({
          file: page.file,
          title: page.title,
          folder: section.label.toLowerCase().replace(/\s+/g, '-')
        });
      });
    });

    return {
      title: navData.title || 'Veterinary Reference Wiki',
      pages: pages
    };
  }

  function humanizeFileName(fileName) {
    return fileName
      .replace(/\.md$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (part) {
        if (!part) {
          return '';
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function getGitHubRepoContext() {
    if (window.WIKI_GITHUB_REPO && window.WIKI_GITHUB_REPO.owner && window.WIKI_GITHUB_REPO.repo) {
      return {
        owner: window.WIKI_GITHUB_REPO.owner,
        repo: window.WIKI_GITHUB_REPO.repo
      };
    }

    var host = window.location.hostname || '';
    if (!/\.github\.io$/i.test(host)) {
      return null;
    }

    var owner = host.split('.')[0];
    var parts = window.location.pathname.split('/').filter(Boolean);
    if (!parts.length) {
      return null;
    }

    return {
      owner: owner,
      repo: parts[0]
    };
  }

  async function loadManifestFromGitHub() {
    var repoContext = getGitHubRepoContext();
    if (!repoContext) {
      throw new Error('No GitHub repository context');
    }

    var apiBase = 'https://api.github.com/repos/' + encodeURIComponent(repoContext.owner) + '/' + encodeURIComponent(repoContext.repo);
    var repoResponse = await fetch(apiBase, { headers: { Accept: 'application/vnd.github+json' } });
    if (!repoResponse.ok) {
      throw new Error('Could not load repository metadata from GitHub API');
    }
    var repoData = await repoResponse.json();
    var branch = repoData.default_branch || 'main';

    var treeResponse = await fetch(apiBase + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1', {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!treeResponse.ok) {
      throw new Error('Could not load repository tree from GitHub API');
    }
    var treeData = await treeResponse.json();
    var items = treeData.tree || [];

    var pages = items
      .filter(function (item) {
        return item.type === 'blob' && /^wiki\/content\/.+\.md$/i.test(item.path);
      })
      .map(function (item) {
        var relative = item.path.replace(/^wiki\/content\//i, '');
        var slashIndex = relative.lastIndexOf('/');
        var folder = slashIndex === -1 ? 'General' : relative.slice(0, slashIndex);
        var fileName = slashIndex === -1 ? relative : relative.slice(slashIndex + 1);

        return {
          file: relative,
          title: humanizeFileName(fileName),
          folder: folder
        };
      })
      .sort(function (a, b) {
        return a.file.localeCompare(b.file, undefined, { sensitivity: 'base' });
      });

    return {
      title: 'Veterinary Reference Wiki',
      generatedAt: new Date().toISOString(),
      pages: pages
    };
  }

  async function loadManifestData() {
    try {
      return await loadManifestFromGitHub();
    } catch (githubError) {
      // Fall through to static manifest/fallback for local dev or API failures.
    }

    try {
      var response = await fetch('wiki/data/content-manifest.json?v=' + Date.now());
      if (!response.ok) {
        throw new Error('Could not load content-manifest.json');
      }
      return await response.json();
    } catch (error) {
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.manifest) {
        return window.WIKI_FALLBACK.manifest;
      }
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.nav) {
        return normalizeManifestFromLegacyNav(window.WIKI_FALLBACK.nav);
      }
      throw error;
    }
  }

  async function loadMarkdown(file) {
    try {
      var response = await fetch('wiki/content/' + file + '?v=' + Date.now());
      if (!response.ok) {
        throw new Error('Could not load ' + file);
      }
      return await response.text();
    } catch (error) {
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.pages && window.WIKI_FALLBACK.pages[file]) {
        return window.WIKI_FALLBACK.pages[file];
      }
      throw error;
    }
  }

  function buildTree(pages) {
    var root = { folders: {}, pages: [] };

    pages.forEach(function (page) {
      var folderPath = (page.folder || '').replace(/\\/g, '/');
      var parts = folderPath && folderPath !== 'General' ? folderPath.split('/').filter(Boolean) : [];
      var node = root;

      parts.forEach(function (part) {
        if (!node.folders[part]) {
          node.folders[part] = { folders: {}, pages: [] };
        }
        node = node.folders[part];
      });

      node.pages.push(page);
    });

    return root;
  }

  function renderTree(node, parentEl, navLinks, onClickPage, folderPrefix, activeFile) {
    var nodeHasActive = false;
    var folderNames = Object.keys(node.folders).sort();
    folderNames.forEach(function (folderName) {
      var li = document.createElement('li');
      var fullPath = folderPrefix ? folderPrefix + '/' + folderName : folderName;
      var folderButton = document.createElement('button');
      folderButton.type = 'button';
      folderButton.className = 'wiki-folder-toggle';
      folderButton.title = fullPath;
      folderButton.setAttribute('aria-expanded', 'false');
      folderButton.innerHTML =
        '<span class="wiki-folder-caret" aria-hidden="true">&#9656;</span>' +
        '<span class="wiki-folder-label">' + escapeHtml(humanizeFolderName(folderName)) + '</span>';
      li.appendChild(folderButton);

      var nested = document.createElement('ul');
      nested.className = 'wiki-folder-list';
      var childHasActive = renderTree(node.folders[folderName], nested, navLinks, onClickPage, fullPath, activeFile);
      nodeHasActive = nodeHasActive || childHasActive;
      if (!childHasActive) {
        nested.classList.add('is-collapsed');
      } else {
        folderButton.classList.add('is-expanded');
        folderButton.setAttribute('aria-expanded', 'true');
      }

      folderButton.addEventListener('click', function () {
        var expanded = folderButton.getAttribute('aria-expanded') === 'true';
        folderButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        folderButton.classList.toggle('is-expanded', !expanded);
        nested.classList.toggle('is-collapsed', expanded);
      });

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
      var pages = (manifest.pages || []).slice().sort(function (a, b) {
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

  setupFindUi();
  window.addEventListener('hashchange', highlightHashTarget);
})();





