/* Small helpers. No dependencies. */
window.TT = window.TT || {};

TT.$ = function (sel, root) { return (root || document).querySelector(sel); };
TT.$$ = function (sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
};

/* el('div.card', { onclick: fn }, ['text', elChild]) */
TT.el = function (spec, props, children) {
  var parts = spec.split(/(?=[.#])/);
  var node = document.createElement(parts[0] || 'div');
  parts.slice(1).forEach(function (p) {
    if (p[0] === '.') node.classList.add(p.slice(1));
    else if (p[0] === '#') node.id = p.slice(1);
  });
  props = props || {};
  Object.keys(props).forEach(function (k) {
    var v = props[k];
    if (v === null || v === undefined || v === false) return;
    if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  });
  (Array.isArray(children) ? children : children ? [children] : []).forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c)) : c);
  });
  return node;
};

TT.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); return node; };

TT.escapeHtml = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

/* Great-circle distance in metres. */
TT.distance = function (a, b) {
  var R = 6371000;
  var toRad = Math.PI / 180;
  var dLat = (b.lat - a.lat) * toRad;
  var dLng = (b.lng - a.lng) * toRad;
  var la1 = a.lat * toRad, la2 = b.lat * toRad;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

TT.fmtDist = function (m) {
  if (m == null) return '';
  if (m < 950) return Math.round(m / 10) * 10 + ' m';
  return (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
};

/* Rough walking time at 4.5 km/h, plus nothing for traffic lights. */
TT.fmtWalk = function (m) {
  var mins = Math.round(m / 75);
  if (mins < 1) return 'right here';
  if (mins < 60) return mins + ' min walk';
  return Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min walk';
};

TT.fmtYear = function (y) {
  if (y == null) return '';
  if (y < 0) return Math.abs(y) + ' BC';
  return String(y);
};

TT.fmtSpan = function (from, to) {
  if (from == null && to == null) return '';
  if (to == null || to >= 2025) return TT.fmtYear(from) + ' – today';
  if (from === to) return TT.fmtYear(from);
  return TT.fmtYear(from) + ' – ' + TT.fmtYear(to);
};

TT.debounce = function (fn, ms) {
  var t;
  return function () {
    var args = arguments, self = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
  };
};

TT.uniq = function (arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); };

/* How much two string arrays have in common. */
TT.overlap = function (a, b) {
  if (!a || !b) return 0;
  return a.filter(function (v) { return b.indexOf(v) !== -1; }).length;
};

TT.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
