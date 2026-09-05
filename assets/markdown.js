/* 零依赖 Markdown 解析器：标题/段落/列表/表格/引用/代码块/链接图片/行内样式/任务列表 */
(function (global) {
  'use strict';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- Front Matter ---------- */
  function parseFrontMatter(src) {
    var meta = {}, body = src;
    var m = /^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
    if (m) {
      m[1].split(/\r?\n/).forEach(function (line) {
        var kv = /^([A-Za-z_][\w.-]*)[ \t]*:[ \t]*(.*)$/.exec(line);
        if (!kv) return;
        var val = kv[2].trim().replace(/^["']|["']$/g, '');
        if (val.charAt(0) === '[') {
          val = val.slice(1, -1).split(',').map(function (s) {
            return s.trim().replace(/^["']|["']$/g, '');
          }).filter(Boolean);
        }
        meta[kv[1]] = val;
      });
      body = src.slice(m[0].length);
    }
    return { meta: meta, body: body };
  }

  /* ---------- 行内 ---------- */
  function inline(text) {
    text = esc(text);
    // 图片必须在链接之前处理
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (m, alt, url, title) {
        return '<img src="' + url + '" alt="' + alt + '"' +
          (title ? ' title="' + title + '"' : '') + ' loading="lazy">';
      });
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (m, label, url, title) {
        var external = /^(https?:)?\/\//i.test(url);
        return '<a href="' + url + '"' +
          (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
          (title ? ' title="' + title + '"' : '') + '>' + label + '</a>';
      });
    text = text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return text;
  }

  /* ---------- 表格 ---------- */
  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
  }

  function alignOf(cell) {
    var c = cell.trim();
    if (/^:-+:$/.test(c)) return 'center';
    if (/^-+:$/.test(c)) return 'right';
    if (/^:-+$/.test(c)) return 'left';
    return '';
  }

  /* ---------- 列表 ---------- */
  function buildList(infos) {
    var pos = 0;

    function level(base) {
      var isOl = infos[pos].ordered;
      var open = isOl ? '<ol>' : '<ul>';
      var close = isOl ? '</ol>' : '</ul>';
      var html = open;

      while (pos < infos.length && infos[pos].indent === base) {
        var it = infos[pos++];
        var body = it.task !== null
          ? '<span class="task' + (it.task ? ' done' : '') + '">' + (it.task ? '✓' : '') + '</span> ' + it.text
          : it.text;
        html += '<li>' + body;
        if (pos < infos.length && infos[pos].indent > base) {
          html += level(infos[pos].indent);
        }
        html += '</li>';
      }
      // 缩进跳级等异常输入，兜底收进最后一个 li
      if (pos < infos.length && infos[pos].indent > base) {
        html = html.replace(/<\/li>$/, level(infos[pos].indent) + '</li>');
      }
      return html + close;
    }

    return level(infos[0].indent);
  }

  /* ---------- 主渲染 ---------- */
  function render(raw) {
    var fm = parseFrontMatter(raw.replace(/\r\n?/g, '\n'));
    var src = fm.body;
    var codeBlocks = [];
    var inlineStore = [];
    var headings = [];
    var seq = 0;

    // 1) 抽出围栏代码块
    src = src.replace(/```([\w+#.-]*)[ \t]*\n([\s\S]*?)\n?```/g, function (m, lang, code) {
      codeBlocks.push({ lang: lang, code: code });
      return '\u0000C' + (codeBlocks.length - 1) + '\u0000';
    });

    // 2) 抽出行内代码，避免其内部被当作 Markdown 语法
    src = src.replace(/`([^`\n]+)`/g, function (m, c) {
      inlineStore.push('<code class="md-inline">' + esc(c) + '</code>');
      return '\u0000I' + (inlineStore.length - 1) + '\u0000';
    });

    function slot(text) {
      return text
        .replace(/\u0000C(\d+)\u0000/g, function (m, i) { return flushCode(codeBlocks[+i]); })
        .replace(/\u0000I(\d+)\u0000/g, function (m, i) { return inlineStore[+i]; });
    }

    function flushCode(b) {
      var lang = String(b.lang || '').toLowerCase();
      var body = global.HL ? global.HL.highlight(b.code, lang) : esc(b.code);
      return '<div class="code-block">' +
        '<div class="code-head"><span class="code-lang">' + (lang || 'text') + '</span>' +
        '<button type="button" class="code-copy">复制</button></div>' +
        '<pre><code>' + body + '</code></pre></div>';
    }

    var lines = src.split('\n');
    var out = [];
    var i = 0;

    function isBlockStart(line) {
      return /^#{1,6}\s/.test(line) ||
        /^\u0000C\d+\u0000$/.test(line.trim()) ||
        /^(-{3,}|\*{3,}|_{3,})[ \t]*$/.test(line) ||
        /^>\s?/.test(line) ||
        /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
    }

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) { i++; continue; }

      // 代码块
      var cm = /^\u0000C(\d+)\u0000$/.exec(trimmed);
      if (cm) { out.push(flushCode(codeBlocks[+cm[1]])); i++; continue; }

      // 标题
      var hm = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);
      if (hm) {
        var lv = hm[1].length;
        var id = 'sec-' + (seq++);
        var text = inline(hm[2]);
        headings.push({ level: lv, text: hm[2].replace(/[*`_]/g, ''), id: id });
        out.push('<h' + lv + ' id="' + id + '">' + text + '</h' + lv + '>');
        i++;
        continue;
      }

      // 分割线
      if (/^(-{3,}|\*{3,}|_{3,})[ \t]*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // 引用
      if (/^>\s?/.test(line)) {
        var qbuf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          qbuf.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + inline(qbuf.join(' ')) + '</blockquote>');
        continue;
      }

      // 表格
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var head = splitRow(lines[i]);
        var aligns = splitRow(lines[i + 1]).map(alignOf);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var th = head.map(function (c, k) {
          var a = aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '';
          return '<th' + a + '>' + inline(c) + '</th>';
        }).join('');
        var tb = rows.map(function (r) {
          return '<tr>' + r.map(function (c, k) {
            var a = aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '';
            return '<td' + a + '>' + inline(c) + '</td>';
          }).join('') + '</tr>';
        }).join('');
        out.push('<div class="table-wrap"><table><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>');
        continue;
      }

      // 列表
      if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
        var infos = [];
        while (i < lines.length) {
          var l = lines[i];
          var im = /^(\s*)(?:([-*+])|(\d+)\.)[ \t]+(.*)$/.exec(l);
          if (im) {
            var ordered = !!im[3];
            var indent = im[1].length;
            // 有序/无序类型切换且回到顶层缩进时，另起一个新列表
            if (infos.length && ordered !== infos[0].ordered && indent <= infos[0].indent) break;
            var task = null;
            var content = im[4];
            var tm = /^\[([ xX])\]\s+(.*)$/.exec(content);
            if (tm) { task = tm[1].toLowerCase() === 'x'; content = tm[2]; }
            infos.push({ indent: indent, ordered: ordered, text: inline(content), task: task });
            i++;
          } else if (/^\s+\S/.test(l) && infos.length) {
            // 缩进续行并入上一个 item
            var last = infos[infos.length - 1];
            last.text += ' ' + inline(l.trim());
            i++;
          } else {
            break;
          }
        }
        out.push(buildList(infos));
        continue;
      }

      // 段落
      var para = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      if (para.length) out.push('<p>' + inline(para.join('\n')) + '</p>');
    }

    return { html: slot(out.join('\n')), headings: headings, meta: fm.meta };
  }

  global.MD = { render: render, parseFrontMatter: parseFrontMatter, esc: esc };
})(window);
