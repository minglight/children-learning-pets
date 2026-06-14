// bank.js — 可編輯題庫載入器(讀取 questions/*.xml,前端隨機抽題)
// 家長/老師只要改 questions/ 裡的 XML,就能換題目,不用動程式。
(function () {
  const UNITS = ['unit6', 'unit7', 'unit8', 'unit9'];
  const data = {};   // unitId -> [{ text, say, options:[...], answer }]

  function txt(parent, tag) {
    const e = parent.getElementsByTagName(tag)[0];
    return e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function attr(elm, names) {
    for (let i = 0; i < names.length; i++) {
      const v = elm.getAttribute(names[i]);
      if (v != null && v !== '') return v.trim();
    }
    return '';
  }

  function detectOp(s) {
    const noNum = s.replace(/\d/g, '');
    if (/[-−－減]/.test(noNum) && !/[+＋加]/.test(noNum)) return '−';
    return '+';
  }

  // 解析 <圖> → 視覺題模板(數數 / 錢 / 月曆 / 直式 / 分類)
  function parseVisual(q) {
    const v = q.getElementsByTagName('圖')[0];
    if (!v) return null;
    const kind = attr(v, ['種類', 'type', '類型']);
    const ask = txt(q, '問');
    const nums = (ask.match(/\d+/g) || []).map(Number);

    if (/數數|數一數|水果|count/i.test(kind)) {
      const content = attr(v, ['內容', '數量', 'nums']);
      const list = content
        ? content.split(/[,，、 ]+/).map(function (s) { return parseInt(s, 10); }).filter(function (n) { return n > 0; })
        : nums.slice(0, 3);
      return { kind: 'count', numbers: list, op: detectOp(ask) };
    }
    if (/錢|coin|money/i.test(kind)) {
      const coins = [];
      const content = attr(v, ['內容', 'coins']);
      const amount = attr(v, ['金額', 'amount']);
      if (content) {
        content.split(/[,，、]+/).forEach(function (part) {
          const m = part.trim().match(/(\d+)\s*[x×*ｘ個枚]\s*(\d+)/);
          if (m) coins.push({ d: parseInt(m[1], 10), n: parseInt(m[2], 10) });
        });
      } else if (amount) {
        let rem = parseInt(amount, 10);
        [50, 10, 5, 1].forEach(function (d) {
          const c = Math.floor(rem / d); if (c > 0) { coins.push({ d: d, n: c }); rem -= c * d; }
        });
      }
      const mei = v.getElementsByTagName('枚');
      for (let i = 0; i < mei.length; i++) {
        coins.push({ d: parseInt(attr(mei[i], ['面額', 'd']), 10), n: parseInt(attr(mei[i], ['數量', 'n']) || '1', 10) });
      }
      return { kind: 'money', coins: coins };
    }
    if (/月曆|calendar/i.test(kind)) {
      const mMonth = attr(v, ['月', 'month']);
      const mMatch = ask.match(/(\d+)\s*月/);
      return {
        kind: 'calendar',
        month: parseInt(mMonth || (mMatch ? mMatch[1] : '6'), 10),
        circle: parseInt(attr(v, ['圈', '日', 'day']) || '0', 10),
        weekday: attr(v, ['星期', 'weekday'])
      };
    }
    if (/直式|vertical/i.test(kind)) {
      return { kind: 'vertical', numbers: nums.slice(0, 2), op: detectOp(ask) };
    }
    if (/分類|group/i.test(kind)) {
      const groups = [];
      const gs = v.getElementsByTagName('組');
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        groups.push({
          icon: attr(g, ['圖案', 'icon']) || '方',
          color: attr(g, ['顏色', 'color']) || '紅',
          n: parseInt(attr(g, ['數量', 'n']) || '1', 10)
        });
      }
      return { kind: 'groups', groups: groups };
    }
    return null;
  }

  function parseXml(unit, xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('XML 格式有誤(' + unit + ')');
    }
    const items = [];
    const qs = doc.getElementsByTagName('題目');
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const optEls = q.getElementsByTagName('選項');
      const options = [];
      let answer = '';
      for (let j = 0; j < optEls.length; j++) {
        const o = optEls[j];
        const label = o.textContent.replace(/\s+/g, ' ').trim();
        options.push(label);
        const mark = (o.getAttribute('答案') || o.getAttribute('correct') || '').trim();
        if (/^(是|對|true|yes|y|1)$/i.test(mark)) answer = label;
      }
      const text = txt(q, '問');
      if (!answer && options.length) answer = options[0];
      if (text && options.length >= 2) {
        items.push({ text: text, say: txt(q, '唸') || text, options: options, answer: answer, visual: parseVisual(q) });
      }
    }
    return items;
  }

  const ready = Promise.all(UNITS.map(function (u) {
    return fetch('questions/' + u + '.xml', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { data[u] = parseXml(u, t); })
      .catch(function (e) { console.warn('題庫載入失敗:' + u, e); data[u] = data[u] || []; });
  })).then(function () { return data; });

  window.PLS_BANK = {
    ready: ready,
    list: function (unit) { return data[unit] || []; },
    has: function (unit) { return (data[unit] || []).length > 0; }
  };
})();
