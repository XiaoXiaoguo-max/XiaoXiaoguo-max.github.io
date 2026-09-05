/* 零依赖代码高亮：Python / SQL / Java / Shell / JS / HTML / JSON / YAML */
(function (global) {
  'use strict';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 每条规则用 sticky 正则，从当前位置精确匹配，避免嵌套替换错乱
  var RULES = {
    python: [
      { t: 'com', re: /#[^\n]*/y },
      { t: 'str', re: /("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfbu]{0,2}"(?:\\.|[^"\\\n])*"|[rbfbu]{0,2}'(?:\\.|[^'\\\n])*')/y },
      { t: 'deco', re: /@[A-Za-z_][\w.]*/y },
      { t: 'kw', re: /\b(?:def|class|return|yield|if|elif|else|for|while|break|continue|pass|import|from|as|try|except|finally|raise|with|lambda|global|nonlocal|assert|del|is|not|and|or|in|None|True|False|self|print|match|case)\b/y },
      { t: 'num', re: /\b\d+(?:\.\d+)?\b/y },
      { t: 'func', re: /\b[A-Za-z_]\w*(?=\s*\()/y }
    ],
    sql: [
      { t: 'com', re: /(--[^\n]*|\/\*[\s\S]*?\*\/)/y },
      { t: 'str', re: /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/y },
      { t: 'kw', re: /\b(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|UNION|ALL|DISTINCT|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|VIEW|EXTERNAL|IF\s+NOT\s+EXISTS|DROP|ALTER|ADD|COLUMN|PARTITION|PARTITIONED\s+BY|CLUSTERED\s+BY|SORTED\s+BY|STORED\s+AS|LOCATION|ROW\s+FORMAT|DELIMITED|FIELDS\s+TERMINATED\s+BY|LINES|OVER|PARTITION\s+BY|AS|WITH|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|RLIKE|IS|NULL|ASC|DESC|CAST|COALESCE|NVL|COUNT|SUM|AVG|MAX|MIN|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|NTILE|FIRST_VALUE|LAST_VALUE|STRING_AGG|COLLECT_SET|COLLECT_LIST|EXPLODE|LATERAL\s+VIEW|USING|LOAD\s+DATA|INPATH|OVERWRITE|INTO|TRUNCATE|MSCK|REPAIR)\b/iy },
      { t: 'num', re: /\b\d+(?:\.\d+)?\b/y },
      { t: 'func', re: /\b[A-Za-z_]\w*(?=\s*\()/y }
    ],
    java: [
      { t: 'com', re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y },
      { t: 'str', re: /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y },
      { t: 'deco', re: /@[A-Za-z_][\w.]*/y },
      { t: 'kw', re: /\b(?:public|private|protected|class|interface|enum|extends|implements|abstract|static|final|void|int|long|double|float|boolean|byte|char|short|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|import|package|this|super|instanceof|synchronized|volatile|transient|native|strictfp|assert|default|record|var|null|true|false|String|Integer|Long|Double|List|Map|Set|ArrayList|HashMap)\b/y },
      { t: 'num', re: /\b\d+(?:\.\d+)?[lLfFdD]?\b/y },
      { t: 'func', re: /\b[A-Za-z_]\w*(?=\s*\()/y }
    ],
    bash: [
      { t: 'com', re: /#[^\n]*/y },
      { t: 'str', re: /("(?:\\.|[^"\\])*"|'[^']*')/y },
      { t: 'var', re: /(\$\{[^}]*\}|\$[A-Za-z_]\w*|\$[0-9@#?*])/y },
      { t: 'kw', re: /\b(?:if|then|elif|else|fi|for|while|until|do|done|case|esac|function|return|export|local|source|alias|exit|sudo|echo|cd|ls|ll|mkdir|rm|cp|mv|cat|touch|chmod|chown|find|grep|sed|awk|tail|head|wc|sort|uniq|cut|xargs|tar|zip|unzip|curl|wget|ssh|scp|ps|kill|df|du|top|which|env|read|shift|test|trap|set|unset)\b/y },
      { t: 'num', re: /\b\d+\b/y },
      { t: 'func', re: /\b(?:hdfs|hadoop|hive|spark-submit|sqoop|flume-ng|kafka-topics|yarn|beeline|python3?|java|mvn|git|npm|node)\b/y },
      { t: 'opt', re: /(?:^|\s)(--?[A-Za-z][\w-]*)/y }
    ],
    javascript: [
      { t: 'com', re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y },
      { t: 'str', re: /(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y },
      { t: 'kw', re: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|default|from|as|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|delete|void|yield|static|get|set|null|undefined|true|false|NaN|Infinity)\b/y },
      { t: 'num', re: /\b\d+(?:\.\d+)?\b/y },
      { t: 'func', re: /\b[A-Za-z_$]\w*(?=\s*\()/y }
    ],
    html: [
      { t: 'com', re: /<!--[\s\S]*?-->/y },
      { t: 'tag', re: /<\/?[A-Za-z][\w-]*/y },
      { t: 'attr', re: /\s+[A-Za-z_][\w:.-]*(?=\s*=)/y },
      { t: 'str', re: /("[^"]*"|'[^']*')/y },
      { t: 'punc', re: /\/?>/y }
    ],
    json: [
      { t: 'key', re: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
      { t: 'str', re: /"(?:\\.|[^"\\])*"/y },
      { t: 'num', re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
      { t: 'kw', re: /\b(?:true|false|null)\b/y },
      { t: 'punc', re: /[{}\[\],:]/y }
    ],
    yaml: [
      { t: 'com', re: /#[^\n]*/y },
      { t: 'key', re: /[A-Za-z_][\w.-]*(?=\s*:)/y },
      { t: 'str', re: /("[^"]*"|'[^']*')/y },
      { t: 'num', re: /\b\d+(?:\.\d+)?\b/y },
      { t: 'kw', re: /\b(?:true|false|null|yes|no|on|off)\b/iy },
      { t: 'punc', re: /^\s*-\s/y }
    ]
  };

  RULES._default = [
    { t: 'com', re: /(--[^\n]*|#[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y },
    { t: 'str', re: /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y },
    { t: 'num', re: /\b\d+(?:\.\d+)?\b/y }
  ];

  var ALIAS = {
    py: 'python', python3: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
    js: 'javascript', jsx: 'javascript', ts: 'javascript', tsx: 'javascript', json5: 'json',
    yml: 'yaml', htm: 'html', xml: 'html', svg: 'html', vue: 'html',
    hiveql: 'sql', hql: 'sql', mysql: 'sql', postgres: 'sql'
  };

  function highlight(code, lang) {
    lang = String(lang || '').toLowerCase().trim();
    if (ALIAS[lang]) lang = ALIAS[lang];
    var rules = RULES[lang] || RULES._default;
    var out = '', i = 0, n = code.length;

    while (i < n) {
      var hit = false;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        rule.re.lastIndex = i;
        var m = rule.re.exec(code);
        if (m && m[0].length) {
          out += '<span class="hl-' + rule.t + '">' + esc(m[0]) + '</span>';
          i += m[0].length;
          hit = true;
          break;
        }
      }
      if (!hit) {
        out += esc(code[i]);
        i++;
      }
    }
    return out;
  }

  global.HL = { highlight: highlight, esc: esc };
})(window);
