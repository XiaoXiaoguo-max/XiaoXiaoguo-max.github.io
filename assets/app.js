/* 博客页面逻辑：首页列表 / 文章详情 / TOC / 代码复制 */
(function (global) {
  'use strict';

  var doc = global.document;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 文件名白名单：仅允许中英文、数字、下划线、短横线，杜绝路径穿越
  var SAFE_NAME = /^[A-Za-z0-9_\-\u4e00-\u9fa5]{1,80}$/;

  // 只放行安全协议，防 javascript: 伪协议注入
  function safeUrl(u) {
    return /^(https?:\/\/|mailto:|\/|\.\/|#)/i.test(String(u || '')) ? u : '#';
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + url);
      return r.text();
    });
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + url);
      return r.json();
    });
  }

  function showError(el, msg) {
    el.innerHTML = '<div class="error">' + esc(msg) + '</div>';
  }

  function fileProtocolNotice(host) {
    host.innerHTML =
      '<div class="notice"><h3>需要通过本地服务访问</h3>' +
      '<p>浏览器禁止 <code>file://</code> 下读取文章文件，请任选一种方式启动：</p>' +
      '<ol><li>双击项目根目录的 <code>start.bat</code>（推荐）</li>' +
      '<li>在本目录执行 <code>python -m http.server 8000</code>，再访问 ' +
      '<code>http://localhost:8000</code></li></ol></div>';
  }

  function copyText(text) {
    if (navigator.clipboard && global.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // file:// 或 http 下的兜底方案
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  // 站点名 / 导航 / 页脚，首页与详情页共用
  function applySiteConfig(cfg) {
    var logo = doc.getElementById('site-logo');
    if (logo && cfg.title) logo.textContent = cfg.title;

    var navEl = doc.getElementById('site-nav');
    if (navEl && Array.isArray(cfg.links)) {
      navEl.innerHTML = cfg.links.map(function (l) {
        return '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener noreferrer">' +
          esc(l.text) + '</a>';
      }).join('');
    }

    if (cfg.author) {
      var f = doc.getElementById('site-footer');
      if (f) f.textContent = '© ' + new Date().getFullYear() + ' ' + cfg.author;
    }
  }

  /* ============ 首页 ============ */
  function initHome() {
    var listEl = doc.getElementById('post-list');
    var filterEl = doc.getElementById('filters');
    var heroEl = doc.getElementById('hero');

    if (location.protocol === 'file:') {
      fileProtocolNotice(listEl);
      return;
    }

    fetchJson('posts/index.json').then(function (data) {
      var cfg = data.site || {};
      doc.title = cfg.title || '个人博客';
      if (heroEl) {
        heroEl.innerHTML =
          '<h1>' + esc(cfg.title || '个人博客') + '</h1>' +
          '<p>' + esc(cfg.desc || '') + '</p>';
      }
      applySiteConfig(cfg);

      var posts = (data.posts || []).slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });

      // 标签筛选条
      var tags = [];
      posts.forEach(function (p) {
        (p.tags || []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
      });

      var active = '全部';
      function renderFilters() {
        filterEl.innerHTML = ['全部'].concat(tags).map(function (t) {
          return '<button type="button" class="chip' + (t === active ? ' active' : '') +
            '" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('');
      }

      function renderList() {
        var shown = active === '全部' ? posts : posts.filter(function (p) {
          return (p.tags || []).indexOf(active) >= 0;
        });
        if (!shown.length) {
          listEl.innerHTML = '<div class="empty">该分类下暂无文章</div>';
          return;
        }
        listEl.innerHTML = shown.map(function (p) {
          var tagHtml = (p.tags || []).map(function (t) {
            return '<span class="tag">' + esc(t) + '</span>';
          }).join('');
          return '<a class="post-card" href="post.html?p=' + encodeURIComponent(p.file) + '">' +
            '<h2>' + esc(p.title) + '</h2>' +
            '<p class="summary">' + esc(p.summary || '') + '</p>' +
            '<div class="meta"><span class="date">' + esc(p.date) + '</span>' + tagHtml + '</div>' +
            '</a>';
        }).join('');
      }

      filterEl.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        active = chip.getAttribute('data-tag');
        renderFilters();
        renderList();
      });

      renderFilters();
      renderList();
    }).catch(function (err) {
      showError(listEl, '文章索引加载失败：' + err.message);
    });
  }

  /* ============ 文章详情 ============ */
  function initPost() {
    var articleEl = doc.getElementById('article');
    var tocEl = doc.getElementById('toc');

    if (location.protocol === 'file:') {
      fileProtocolNotice(articleEl);
      return;
    }

    var name = new URLSearchParams(location.search).get('p') || '';
    if (!SAFE_NAME.test(name)) {
      showError(articleEl, '文章参数不合法：' + name);
      return;
    }

    Promise.all([
      fetchText('posts/' + name + '.md'),
      fetchJson('posts/index.json').catch(function () { return { posts: [] }; })
    ]).then(function (res) {
      var text = res[0];
      var index = res[1] || {};
      var cfg = index.site || {};
      applySiteConfig(cfg);

      var rendered = global.MD.render(text);
      var meta = rendered.meta || {};
      var info = (index.posts || []).filter(function (p) { return p.file === name; })[0] || {};

      var title = meta.title || info.title || name;
      doc.title = title + ' — ' + ((index.site && index.site.title) || '个人博客');

      var tags = meta.tags || info.tags || [];
      if (!Array.isArray(tags)) tags = [tags];
      var date = meta.date || info.date || '';

      var sub = '<div class="post-sub"><span class="date">' + esc(date) + '</span>' +
        tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '</div>';

      articleEl.innerHTML =
        '<a class="back-link" href="index.html">← 返回文章列表</a>' +
        '<h1 class="post-title">' + esc(title) + '</h1>' +
        sub +
        '<div class="article-body">' + rendered.html + '</div>';

      buildToc(articleEl, tocEl, rendered.headings);
      bindCopy();
    }).catch(function (err) {
      showError(articleEl, '文章加载失败：' + err.message + '（确认 posts/' + name + '.md 存在且已登记到 index.json）');
    });
  }

  /* ============ 目录 ============ */
  function buildToc(articleEl, tocEl, headings) {
    if (!tocEl || !headings || headings.length < 2) {
      if (tocEl) tocEl.innerHTML = '';
      return;
    }

    tocEl.innerHTML = '<div class="toc-title">目录</div>' + headings.map(function (h) {
      return '<a href="#' + h.id + '" class="lv' + h.level + '" data-id="' + h.id + '">' +
        esc(h.text) + '</a>';
    }).join('');

    var links = Array.prototype.slice.call(tocEl.querySelectorAll('a'));
    var targets = links.map(function (a) { return doc.getElementById(a.getAttribute('data-id')); });

    function onScroll() {
      var y = global.scrollY + 110;
      var cur = 0;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].offsetTop <= y) cur = i;
      }
      // 滚到底部时高亮最后一项
      if (global.innerHeight + global.scrollY >= doc.body.scrollHeight - 4) {
        cur = targets.length - 1;
      }
      links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    }

    var ticking = false;
    global.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });

    onScroll();
  }

  /* ============ 代码复制 ============ */
  function bindCopy() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('.code-copy');
      if (!btn) return;
      var block = btn.closest('.code-block');
      if (!block) return;
      var codeEl = block.querySelector('code');
      if (!codeEl) return;

      copyText(codeEl.innerText).then(function () {
        btn.textContent = '已复制';
        btn.classList.add('ok');
      }).catch(function () {
        btn.textContent = '复制失败';
      }).then(function () {
        global.setTimeout(function () {
          btn.textContent = '复制';
          btn.classList.remove('ok');
        }, 1600);
      });
    });
  }

  global.Blog = { initHome: initHome, initPost: initPost };
})(window);
