(function () {
  'use strict';

  function looksMojibake(text) {
    return typeof text === 'string' && /Ã.|Â.|â.|�/.test(text);
  }

  function repairMojibake(text) {
    if (!looksMojibake(text) || typeof TextDecoder === 'undefined') {
      return text;
    }

    try {
      var bytes = new Uint8Array(text.length);
      for (var i = 0; i < text.length; i += 1) {
        bytes[i] = text.charCodeAt(i) & 255;
      }

      var decoded = new TextDecoder('utf-8').decode(bytes);
      if (!decoded || decoded === text) {
        return text;
      }

      var originalNoise = (text.match(/Ã|Â|â|�/g) || []).length;
      var decodedNoise = (decoded.match(/Ã|Â|â|�/g) || []).length;
      return decodedNoise < originalNoise ? decoded : text;
    } catch (error) {
      return text;
    }
  }

  function repairManifest(manifest) {
    if (!manifest || !manifest.pages) {
      return manifest;
    }

    return {
      title: repairMojibake(manifest.title || 'Veterinary Reference Wiki'),
      generatedAt: manifest.generatedAt,
      pages: manifest.pages.map(function (page) {
        return {
          file: page.file,
          title: repairMojibake(page.title || ''),
          folder: repairMojibake(page.folder || '')
        };
      })
    };
  }

  function normalizeManifestFromLegacyNav(navData) {
    var pages = [];
    navData.sections.forEach(function (section) {
      section.pages.forEach(function (page) {
        pages.push({
          file: page.file,
          title: repairMojibake(page.title),
          folder: repairMojibake(section.label).toLowerCase().replace(/\s+/g, '-')
        });
      });
    });

    return {
      title: repairMojibake(navData.title || 'Veterinary Reference Wiki'),
      pages: pages
    };
  }

  function humanizeFileName(fileName) {
    return fileName
      .replace(/\.(md|html)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (part) {
        return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
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

  async function loadStaticManifest() {
    var response = await fetch('wiki/data/content-manifest.json');
    if (!response.ok) {
      throw new Error('Could not load content-manifest.json');
    }
    return repairManifest(await response.json());
  }

  async function loadManifestData(options) {
    options = options || {};

    try {
      return await loadStaticManifest();
    } catch (staticError) {
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.manifest) {
        return repairManifest(window.WIKI_FALLBACK.manifest);
      }
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.nav) {
        return normalizeManifestFromLegacyNav(window.WIKI_FALLBACK.nav);
      }
      if (options.allowGitHubFallback !== false) {
        return repairManifest(await loadManifestFromGitHub());
      }
      throw staticError;
    }
  }

  async function loadMarkdown(file) {
    try {
      var response = await fetch('wiki/content/' + file);
      if (!response.ok) {
        throw new Error('Could not load ' + file);
      }
      return repairMojibake(await response.text());
    } catch (error) {
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.pages && window.WIKI_FALLBACK.pages[file]) {
        return repairMojibake(window.WIKI_FALLBACK.pages[file]);
      }
      throw error;
    }
  }

  window.JegVetWikiContent = {
    getGitHubRepoContext: getGitHubRepoContext,
    humanizeFileName: humanizeFileName,
    loadManifestData: loadManifestData,
    loadManifestFromGitHub: loadManifestFromGitHub,
    loadMarkdown: loadMarkdown,
    normalizeManifestFromLegacyNav: normalizeManifestFromLegacyNav
  };
})();
