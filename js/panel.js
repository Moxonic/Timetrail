/* Draggable panel.
 *
 * The panel is a left sidebar on a wide screen and a bottom sheet on a narrow
 * one, so "get it out of the way" means two different gestures:
 *
 *   sidebar  – drag the handle left/right; snaps to open or hidden.
 *   sheet    – drag the handle up/down; snaps to peek, half or full.
 *
 * Either way you can put the whole screen on the map or the whole screen on the
 * panel, and stop anywhere in between. A tap without a drag cycles to the next
 * sensible position, so the handle still works as a button.
 *
 * The rest of the chrome (top bar, status, player) follows the panel via the
 * --panel-visible and --sheet-h custom properties rather than assuming the
 * panel is always its full size.
 */
window.TT = window.TT || {};

TT.panel = (function () {
  var panel, handle, onChange;
  var mode = null;            // 'side' | 'sheet'
  var value = 0;              // side: px hidden. sheet: px tall.
  var snaps = [];             // [{ name, value }]
  var drag = null;
  var HANDLE_PEEK = 18;       // how much of the sidebar stays grabbable
  var SHEET_PEEK = 88;        // enough of the sheet to keep the tabs reachable

  function isSheet() {
    return window.matchMedia('(max-width: 860px)').matches;
  }

  function panelWidth() {
    // The CSS variable is the source of truth for the sidebar width.
    var w = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--panel-w'), 10);
    return isNaN(w) ? 400 : w;
  }

  function computeSnaps() {
    if (mode === 'sheet') {
      var h = window.innerHeight;
      snaps = [
        { name: 'peek', value: SHEET_PEEK },
        { name: 'half', value: Math.round(h * 0.52) },
        { name: 'full', value: Math.round(h * 0.92) }
      ];
    } else {
      var w = panelWidth();
      snaps = [
        { name: 'open', value: 0 },
        { name: 'hidden', value: w - HANDLE_PEEK }
      ];
    }
  }

  function bounds() {
    return {
      min: snaps[0].value,
      max: snaps[snaps.length - 1].value
    };
  }

  /* Push the current geometry into CSS so overlays can position against it. */
  function paint() {
    var root = document.documentElement.style;
    if (mode === 'sheet') {
      panel.style.transform = '';
      panel.style.height = value + 'px';
      root.setProperty('--sheet-h', value + 'px');
      root.setProperty('--panel-visible', '0px');
    } else {
      panel.style.height = '';
      panel.style.transform = 'translateX(' + (-value) + 'px)';
      root.setProperty('--panel-visible', (panelWidth() - value) + 'px');
      root.setProperty('--sheet-h', '0px');
    }
    var st = nearestSnap(value);
    panel.dataset.snap = st.name;
    handle.setAttribute('aria-expanded', st.name === 'hidden' || st.name === 'peek' ? 'false' : 'true');
  }

  function nearestSnap(v) {
    var best = snaps[0], bestD = Infinity;
    snaps.forEach(function (s) {
      var d = Math.abs(s.value - v);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function setValue(v, animate) {
    var b = bounds();
    value = TT.clamp(v, b.min, b.max);
    panel.classList.toggle('animating', !!animate);
    paint();
    if (animate) {
      clearTimeout(setValue._t);
      setValue._t = setTimeout(function () {
        panel.classList.remove('animating');
        if (onChange) onChange(nearestSnap(value).name);
      }, 300);
    } else if (onChange) {
      onChange(nearestSnap(value).name);
    }
  }

  function snapTo(name, animate) {
    var s = snaps.find(function (x) { return x.name === name; });
    if (s) setValue(s.value, animate !== false);
  }

  /* Release: go to the nearest snap, unless the gesture was a decisive flick. */
  function settle(velocity) {
    var target;
    if (Math.abs(velocity) > 0.45) {
      // Travelling fast — take the next snap in the direction of travel.
      var ordered = snaps.slice().sort(function (a, b) { return a.value - b.value; });
      var forward = mode === 'sheet' ? velocity > 0 : velocity > 0;
      var idx = ordered.findIndex(function (s) { return s.name === nearestSnap(value).name; });
      var nextIdx = TT.clamp(idx + (forward ? 1 : -1), 0, ordered.length - 1);
      // Only jump onward if we are actually heading past the current snap.
      target = (forward ? value > ordered[idx].value : value < ordered[idx].value)
        ? ordered[nextIdx] : ordered[idx];
    } else {
      target = nearestSnap(value);
    }
    setValue(target.value, true);
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    computeSnaps();
    drag = {
      startX: e.clientX,
      startY: e.clientY,
      startValue: value,
      moved: 0,
      lastPos: mode === 'sheet' ? e.clientY : e.clientX,
      lastTime: performance.now(),
      velocity: 0
    };
    panel.classList.remove('animating');
    panel.classList.add('dragging');
    document.documentElement.dataset.panelDragging = '1';
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var now = performance.now();
    var pos = mode === 'sheet' ? e.clientY : e.clientX;
    var dt = Math.max(1, now - drag.lastTime);

    // Sheet grows as you drag up; sidebar hides as you drag left.
    var delta = mode === 'sheet'
      ? (drag.startY - e.clientY)
      : (drag.startX - e.clientX);

    drag.moved = Math.max(drag.moved, Math.abs(mode === 'sheet'
      ? e.clientY - drag.startY : e.clientX - drag.startX));
    drag.velocity = ((drag.lastPos - pos) / dt) * (mode === 'sheet' ? 1 : 1);
    drag.lastPos = pos;
    drag.lastTime = now;

    setValue(drag.startValue + delta, false);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!drag) return;
    var wasDrag = drag.moved > 6;
    var v = drag.velocity;
    panel.classList.remove('dragging');
    delete document.documentElement.dataset.panelDragging;
    try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
    drag = null;

    if (wasDrag) settle(v);
    else cycle();
  }

  /* A plain tap: open it if it is out of the way, otherwise put it away. */
  function cycle() {
    var here = nearestSnap(value).name;
    if (mode === 'sheet') {
      snapTo(here === 'peek' ? 'half' : (here === 'half' ? 'full' : 'peek'));
    } else {
      snapTo(here === 'open' ? 'hidden' : 'open');
    }
  }

  function onKeyDown(e) {
    var k = e.key;
    var ordered = snaps.slice().sort(function (a, b) { return a.value - b.value; });
    var idx = ordered.findIndex(function (s) { return s.name === nearestSnap(value).name; });
    var grow = (mode === 'sheet' && k === 'ArrowUp') || (mode === 'side' && k === 'ArrowLeft');
    var shrink = (mode === 'sheet' && k === 'ArrowDown') || (mode === 'side' && k === 'ArrowRight');

    // On the sidebar, "more panel" is a smaller hidden value, so invert.
    if (mode === 'side') { var t = grow; grow = shrink; shrink = t; }

    if (grow || shrink) {
      e.preventDefault();
      snapTo(ordered[TT.clamp(idx + (grow ? 1 : -1), 0, ordered.length - 1)].name);
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      cycle();
    }
  }

  function applyMode(initial) {
    var next = isSheet() ? 'sheet' : 'side';
    if (next === mode && !initial) { computeSnaps(); setValue(value, false); return; }
    mode = next;
    computeSnaps();
    // Coming from the other layout, start from a sensible default.
    var saved = TT.store.get().panelSnap;
    var known = snaps.some(function (s) { return s.name === saved; });
    var start = known ? saved : (mode === 'sheet' ? 'half' : 'open');
    panel.dataset.mode = mode;
    handle.setAttribute('aria-label', mode === 'sheet'
      ? 'Drag up or down to resize the panel'
      : 'Drag left or right to hide or show the panel');
    snapTo(start, false);
  }

  function init(opts) {
    opts = opts || {};
    panel = document.getElementById('panel');
    handle = document.getElementById('panel-handle');
    onChange = opts.onChange;
    if (!panel || !handle) return;

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
    handle.addEventListener('keydown', onKeyDown);
    // Double-click jumps straight to fully open / fully out of the way.
    handle.addEventListener('dblclick', function (e) {
      e.preventDefault();
      var here = nearestSnap(value).name;
      if (mode === 'sheet') snapTo(here === 'full' ? 'peek' : 'full');
      else snapTo(here === 'open' ? 'hidden' : 'open');
    });

    window.addEventListener('resize', TT.debounce(function () { applyMode(false); }, 150));
    applyMode(true);
  }

  return {
    init: init,
    snapTo: snapTo,
    cycle: cycle,
    state: function () { return snaps.length ? nearestSnap(value).name : null; },
    mode: function () { return mode; }
  };
})();
