/* All DOM rendering. app.js decides *what* to show; this file decides how. */
window.TT = window.TT || {};

TT.ui = (function () {
  var el = TT.el, $ = TT.$, clear = TT.clear;
  var H = {};   // handlers, injected by app.js
  var dom = {};

  function init(handlers) {
    H = handlers || {};
    dom = {
      panel: $('#panel'),
      tabs: $('#tabs'),
      views: {
        discover: $('#view-discover'),
        trails: $('#view-trails'),
        detail: $('#view-detail')
      },
      eraChips: $('#era-chips'),
      themeChips: $('#theme-chips'),
      list: $('#place-list'),
      listCount: $('#list-count'),
      trailList: $('#trail-list'),
      detail: $('#view-detail'),
      toast: $('#toast'),
      yearFrom: $('#year-from'),
      yearTo: $('#year-to'),
      yearLabel: $('#year-label'),
      yearTrack: $('#year-track'),
      activeTrail: $('#active-trail'),
      walkBtn: $('#walk-btn'),
      langBtn: $('#lang-btn'),
      themeBtn: $('#theme-btn'),
      wikiToggle: $('#wiki-toggle'),
      unvisitedToggle: $('#unvisited-toggle'),
      triviaToggle: $('#trivia-toggle'),
      narrateToggle: $('#narrate-toggle'),
      playerVoice: $('#player-voice'),
      voiceMenu: $('#voice-menu'),
      player: $('#player'),
      playerTitle: $('#player-title'),
      playerSub: $('#player-sub'),
      playerFill: $('#player-fill'),
      playerToggle: $('#player-toggle'),
      playerNext: $('#player-next'),
      playerChapters: $('#player-chapters'),
      chapterMenu: $('#chapter-menu'),

      playerStop: $('#player-stop'),
      search: $('#search'),
      searchResults: $('#search-results'),
      status: $('#status')
    };
    bindStatic();
    renderEraChips();
    renderThemeChips();
    syncTimeline();
    return dom;
  }

  function bindStatic() {
    TT.$$('#tabs button').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.dataset.tab); });
    });

    dom.yearFrom.addEventListener('input', onYearInput);
    dom.yearTo.addEventListener('input', onYearInput);

    dom.walkBtn.addEventListener('click', function () { H.onWalkToggle && H.onWalkToggle(); });
    dom.langBtn.addEventListener('click', function () { H.onLangToggle && H.onLangToggle(); });
    dom.themeBtn.addEventListener('click', function () { H.onThemeToggle && H.onThemeToggle(); });
    dom.wikiToggle.addEventListener('change', function () {
      H.onWikiToggle && H.onWikiToggle(dom.wikiToggle.checked);
    });
    dom.unvisitedToggle.addEventListener('change', function () {
      TT.store.set({ onlyUnvisited: dom.unvisitedToggle.checked }, 'filters');
    });
    dom.triviaToggle.addEventListener('change', function () {
      TT.store.set({ trivia: dom.triviaToggle.checked }, 'trivia');
    });
    dom.narrateToggle.addEventListener('change', function () {
      H.onNarrateToggle && H.onNarrateToggle(dom.narrateToggle.checked);
    });
    // One button for the whole of play/pause: it starts the selected place when
    // nothing is being read, and pauses or resumes when something is.
    dom.playerToggle.addEventListener('click', function () {
      if (TT.audio.status().playing) TT.audio.toggle();
      else H.onListen && H.onListen();
    });
    dom.playerVoice.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleVoiceMenu();
    });
    dom.playerChapters.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleChapterMenu();
    });
    document.addEventListener('click', function (e) {
      if (dom.player.contains(e.target)) return;
      if (!dom.voiceMenu.hidden) closeVoiceMenu();
      if (!dom.chapterMenu.hidden) closeChapterMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!dom.voiceMenu.hidden) { closeVoiceMenu(); dom.playerVoice.focus(); }
      if (!dom.chapterMenu.hidden) { closeChapterMenu(); dom.playerChapters.focus(); }
    });

    // Inside an article, skipping means the next chapter; the queue of other
    // places is only reached once the article has run out of them.
    dom.playerNext.addEventListener('click', function () {
      if (TT.audio.hasNextChapter()) TT.audio.nextChapter();
      else TT.audio.next();
    });

    dom.playerStop.addEventListener('click', function () { TT.audio.stop(); });
    $('#reset-filters').addEventListener('click', function () {
      TT.store.resetFilters();
      renderEraChips(); renderThemeChips(); syncTimeline();
    });
    $('#reset-progress').addEventListener('click', function () {
      if (confirm('Clear everywhere you have been marked as visiting, and leave the current walk?')) {
        TT.store.resetProgress();
        toast('Progress cleared.');
      }
    });

    dom.search.addEventListener('input', TT.debounce(function () {
      H.onSearch && H.onSearch(dom.search.value.trim());
    }, 220));
    dom.search.addEventListener('focus', function () {
      if (dom.search.value.trim()) H.onSearch && H.onSearch(dom.search.value.trim());
    });
    document.addEventListener('click', function (e) {
      if (!dom.searchResults.contains(e.target) && e.target !== dom.search) {
        dom.searchResults.hidden = true;
      }
    });

    // The handle itself is owned by TT.panel — it is a drag surface, not a button.

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dom.views.detail.classList.contains('active')) {
        setTab('discover');
      }
      if (e.key === '/' && document.activeElement !== dom.search) {
        e.preventDefault(); dom.search.focus();
      }
    });
  }

  /* ---------- tabs ---------- */
  function setTab(name) {
    Object.keys(dom.views).forEach(function (k) {
      dom.views[k].classList.toggle('active', k === name);
    });
    TT.$$('#tabs button').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // Switching tab implies wanting to read something, so make sure the panel
    // is not tucked away — but never shrink it if it is already fully open.
    var snap = TT.panel.state();
    if (snap === 'peek') TT.panel.snapTo('half');
    else if (snap === 'hidden') TT.panel.snapTo('open');
    dom.panel.scrollTop = 0;
    var body = dom.views[name];
    if (body) body.scrollTop = 0;
    // The offer to read a place belongs to the place you have open. Leaving the
    // detail view withdraws it; anything already being read carries on.
    if (name !== 'detail') setListenTarget(null);
  }

  /* ---------- filters ---------- */
  function renderEraChips() {
    var state = TT.store.get();
    clear(dom.eraChips);
    TT.ERAS.forEach(function (era) {
      var on = state.eras.indexOf(era.id) !== -1;
      dom.eraChips.appendChild(el('button.chip' + (on ? '.on' : ''), {
        style: { '--chip': era.color },
        title: era.blurb + ' (' + TT.fmtSpan(era.from, era.to) + ')',
        'aria-pressed': on ? 'true' : 'false',
        onclick: function () {
          TT.store.toggleIn('eras', era.id);
          renderEraChips();
        }
      }, [
        el('span.chip-glyph', { text: era.glyph }),
        el('span.chip-name', { text: era.name }),
        el('span.chip-years', { text: TT.fmtSpan(era.from, era.to).replace(' – ', '–') })
      ]));
    });
  }

  function renderThemeChips() {
    var state = TT.store.get();
    clear(dom.themeChips);
    TT.THEMES.forEach(function (t) {
      var on = state.themes.indexOf(t.id) !== -1;
      dom.themeChips.appendChild(el('button.chip.chip-sm' + (on ? '.on' : ''), {
        'aria-pressed': on ? 'true' : 'false',
        onclick: function () {
          TT.store.toggleIn('themes', t.id);
          renderThemeChips();
        }
      }, [
        el('span.chip-glyph', { text: t.glyph }),
        el('span.chip-name', { text: t.name })
      ]));
    });
  }

  /* Dual-handle year range built from two overlapping sliders. */
  function onYearInput() {
    var a = parseInt(dom.yearFrom.value, 10);
    var b = parseInt(dom.yearTo.value, 10);
    if (a > b - 20) {
      if (this === dom.yearFrom) a = b - 20; else b = a + 20;
      dom.yearFrom.value = a; dom.yearTo.value = b;
    }
    TT.store.set({ years: [a, b] }, 'filters');
    paintTimeline(a, b);
  }

  function syncTimeline() {
    var y = TT.store.get().years;
    dom.yearFrom.value = y[0];
    dom.yearTo.value = y[1];
    paintTimeline(y[0], y[1]);
  }

  function paintTimeline(a, b) {
    var lo = parseInt(dom.yearFrom.min, 10), hi = parseInt(dom.yearFrom.max, 10);
    var p1 = 100 * (a - lo) / (hi - lo);
    var p2 = 100 * (b - lo) / (hi - lo);
    dom.yearTrack.style.setProperty('--a', p1 + '%');
    dom.yearTrack.style.setProperty('--b', p2 + '%');
    // At either end the range is open, so say so rather than showing the stop value.
    dom.yearLabel.textContent =
      (a <= TT.TIMELINE.min ? 'earliest' : TT.fmtYear(a)) + ' – ' +
      (b >= TT.TIMELINE.max ? 'today' : TT.fmtYear(b));
  }

  /* ---------- the browse list ---------- */
  function placeRow(place, meta) {
    meta = meta || {};
    var era = TT.primaryEra(place);
    var visited = TT.store.isVisited(place.id);
    return el('button.row' + (visited ? '.visited' : ''), {
      style: { '--accent': era.color },
      onclick: function () { H.onSelect && H.onSelect(place.id, 'list'); }
    }, [
      el('span.row-bar'),
      el('div.row-body', {}, [
        el('div.row-top', {}, [
          el('span.row-name', { text: place.name }),
          meta.dist != null ? el('span.row-dist', { text: TT.fmtDist(meta.dist) }) : null
        ]),
        el('div.row-meta', {}, [
          el('span.row-era', { text: era.name }),
          el('span.dot', { text: '·' }),
          el('span.row-span', { text: TT.fmtSpan(place.from, place.to) }),
          visited ? el('span.badge-seen', { text: 'seen' }) : null
        ]),
        meta.reasons && meta.reasons.length
          ? el('div.row-why', { text: meta.reasons.slice(0, 2).join(' · ') })
          : null
      ])
    ]);
  }

  function renderList(items, opts) {
    opts = opts || {};
    clear(dom.list);
    dom.listCount.textContent = items.length + (items.length === 1 ? ' place' : ' places');

    if (!items.length) {
      dom.list.appendChild(el('p.empty', {}, [
        'Nothing matches those filters. ',
        el('button.link', {
          text: 'Clear them',
          onclick: function () {
            TT.store.resetFilters();
            renderEraChips(); renderThemeChips(); syncTimeline();
          }
        })
      ]));
      return;
    }

    // Group by era when browsing, but keep a flat distance order in walk mode.
    if (opts.groupByEra) {
      var groups = {};
      items.forEach(function (it) {
        var e = it.place.eras[0];
        (groups[e] = groups[e] || []).push(it);
      });
      TT.ERAS.forEach(function (era) {
        var g = groups[era.id];
        if (!g || !g.length) return;
        dom.list.appendChild(el('h4.group', { style: { '--accent': era.color } }, [
          el('span.chip-glyph', { text: era.glyph }),
          era.name,
          el('span.group-count', { text: g.length })
        ]));
        g.forEach(function (it) { dom.list.appendChild(placeRow(it.place, it)); });
      });
    } else {
      items.forEach(function (it) { dom.list.appendChild(placeRow(it.place, it)); });
    }
  }

  /* ---------- trails ---------- */
  function renderTrails(activeId) {
    clear(dom.trailList);
    TT.TRAILS.forEach(function (t) {
      var prog = TT.trailProgress(t.id);
      var era = t.era ? TT.eraById(t.era) : null;
      var active = t.id === activeId;
      dom.trailList.appendChild(el('div.trail-card' + (active ? '.active' : ''), {
        style: { '--accent': era ? era.color : '#8d8d8d' }
      }, [
        el('div.trail-head', {}, [
          el('h3', { text: t.name }),
          el('span.trail-sub', { text: t.subtitle })
        ]),
        el('p.trail-blurb', { text: t.blurb }),
        el('div.trail-progress', {}, [
          el('div.bar', {}, [el('div.fill', { style: { width: prog.pct + '%' } })]),
          el('span.trail-count', { text: prog.done + ' / ' + prog.total })
        ]),
        el('div.trail-actions', {}, [
          el('button.btn' + (active ? '.btn-ghost' : '.btn-primary'), {
            text: active ? 'Leave this walk' : (prog.done ? 'Resume' : 'Start walk'),
            onclick: function () { H.onTrailToggle && H.onTrailToggle(t.id); }
          }),
          el('button.btn.btn-ghost', {
            text: 'Show on map',
            onclick: function () { H.onTrailPreview && H.onTrailPreview(t.id); }
          })
        ])
      ]));
    });
  }

  /* The persistent strip at the top of the panel when a walk is active.
   * `info` carries the real routed numbers once they arrive. */
  function renderActiveTrail(progress, nextPlace, info) {
    info = info || {};
    var box = dom.activeTrail;
    clear(box);
    if (!progress) { box.hidden = true; return; }
    box.hidden = false;
    var era = progress.trail.era ? TT.eraById(progress.trail.era) : null;
    box.style.setProperty('--accent', era ? era.color : '#e0b25c');

    box.appendChild(el('div.at-top', {}, [
      el('span.at-label', { text: 'On the walk' }),
      el('span.at-name', { text: progress.trail.name }),
      el('button.at-exit', {
        text: '×', title: 'Leave this walk',
        onclick: function () { H.onTrailToggle && H.onTrailToggle(progress.trail.id); }
      })
    ]));
    box.appendChild(el('div.bar', {}, [
      el('div.fill', { style: { width: progress.pct + '%' } })
    ]));

    if (info.route) {
      box.appendChild(el('div.at-route', {}, [
        el('span', { text: TT.fmtDist(info.route.distance) }),
        el('span.dot', { text: '·' }),
        el('span', { text: TT.route.fmtTime(info.route.time) + ' walking' }),
        info.route.estimated
          ? el('span.at-est', { title: 'Routing service unavailable — straight-line estimate', text: 'estimated' })
          : null,
        info.spots ? el('span.at-spots', { text: info.spots + ' to see on the way' }) : null
      ]));
    }

    if (nextPlace) {
      box.appendChild(el('button.at-next', {
        onclick: function () { H.onSelect && H.onSelect(nextPlace.id, 'trail'); }
      }, [
        el('span.at-next-label', { text: 'Next stop' }),
        el('span.at-next-name', { text: nextPlace.name }),
        info.legTime != null
          ? el('span.at-next-dist', { text: TT.route.fmtTime(info.legTime) })
          : (info.dist != null ? el('span.at-next-dist', { text: TT.fmtWalk(info.dist) }) : null)
      ]));
    } else {
      box.appendChild(el('div.at-done', {
        text: 'Walk complete — ' + progress.total + ' stops. Pick another thread whenever you like.'
      }));
    }
  }

  /* Full itinerary with real per-leg walking times, shown in the Walks tab.
   * `stops` is [{ place, leg, spots, fromHere }] — already aligned by app.js,
   * so nothing here has to reason about leg index offsets. */
  function renderItinerary(trail, stops, route) {
    var box = $('#itinerary');
    clear(box);
    if (!trail || !stops || !stops.length) { box.hidden = true; return; }
    box.hidden = false;

    var era = trail.era ? TT.eraById(trail.era) : null;
    box.style.setProperty('--accent', era ? era.color : '#e0b25c');

    box.appendChild(el('div.itin-head', {}, [
      el('h4', { text: 'Your route' }),
      el('span.itin-total', {
        text: route
          ? TT.fmtDist(route.distance) + ' · ' + TT.route.fmtTime(route.time) +
            (route.estimated ? ' (estimated)' : '')
          : 'working out the route…'
      })
    ]));

    stops.forEach(function (s, i) {
      if (s.transport) {
        box.appendChild(el('div.itin-leg.itin-leg-transport', {}, [
          el('span.itin-line'),
          el('span.itin-leg-text', {
            text: s.transport === 'ferry'
              ? 'ferry' + (s.transportFrom ? ' from ' + s.transportFrom : '') + ' — not walkable'
              : 'by ' + s.transport
          })
        ]));
      } else if (s.leg) {
        box.appendChild(el('div.itin-leg', {}, [
          el('span.itin-line'),
          el('span.itin-leg-text', {
            text: (s.fromHere ? 'from where you are: ' : '') +
                  TT.route.fmtTime(s.leg.time) + ' · ' + TT.fmtDist(s.leg.distance)
          }),
          (s.spots && s.spots.length)
            ? el('span.itin-leg-spots', {
                text: 'passing ' + s.spots.slice(0, 2).map(function (x) {
                  return x.place.name;
                }).join(', ') + (s.spots.length > 2 ? ' +' + (s.spots.length - 2) : '')
              })
            : null
        ]));
      }
      var visited = TT.store.isVisited(s.place.id);
      box.appendChild(el('button.itin-stop' + (visited ? '.done' : ''), {
        onclick: function () { H.onSelect && H.onSelect(s.place.id, 'itinerary'); }
      }, [
        el('span.itin-num', { text: visited ? '✓' : String(i + 1) }),
        el('span.itin-name', { text: s.place.name })
      ]));
    });
  }

  /* ---------- detail view ---------- */

  /* A small square of the article's lead image. Plenty of Wikipedia pages have
   * none, so the placeholder has to look deliberate rather than broken — and a
   * thumbnail whose URL fails to load falls back to it too. */
  function wikiThumb(src) {
    var box = el('span.wn-thumb');
    function placeholder() {
      clear(box);
      box.classList.add('is-empty');
      box.appendChild(el('i', { text: 'w' }));
    }
    if (!src) { placeholder(); return box; }
    box.appendChild(el('img', {
      src: src, alt: '', loading: 'lazy', decoding: 'async',
      onerror: placeholder
    }));
    return box;
  }

  function recCard(rec, kind) {
    var p = rec.place;
    var era = TT.primaryEra(p);
    return el('button.rec' + (kind === 'switch' ? '.rec-switch' : ''), {
      style: { '--accent': era.color },
      onclick: function () { H.onSelect && H.onSelect(p.id, 'rec'); }
    }, [
      el('div.rec-top', {}, [
        el('span.rec-glyph', { text: era.glyph }),
        el('span.rec-name', { text: p.name }),
        rec.dist != null ? el('span.rec-dist', { text: TT.fmtDist(rec.dist) }) : null
      ]),
      el('div.rec-why', { text: rec.reasons.slice(0, 2).join(' · ') }),
      rec.switchTo
        ? el('span.rec-switch-tag', { text: '↗ ' + rec.switchTo.name })
        : null
    ]);
  }

  function renderDetail(model) {
    var v = dom.detail;
    clear(v);
    chapterChips = null;      // the buttons about to be discarded by clear()

    var p = model.place;
    var isWiki = model.kind === 'wiki';
    var era = isWiki ? null : TT.primaryEra(p);

    v.appendChild(el('div.detail-nav', {}, [
      el('button.btn.btn-ghost.btn-sm', {
        text: '‹ Back', onclick: function () { setTab('discover'); }
      }),
      el('div.spacer'),
      // No Listen button here: the player owns starting narration, so that there
      // is exactly one play control rather than two that can disagree.
      !isWiki ? el('button.btn.btn-sm' + (TT.store.isVisited(p.id) ? '.btn-ghost' : '.btn-primary'), {
        text: TT.store.isVisited(p.id) ? '✓ Been here' : 'Mark as seen',
        onclick: function () { H.onVisit && H.onVisit(p.id); }
      }) : null
    ]));

    if (model.wiki && model.wiki.thumb) {
      v.appendChild(el('div.detail-img', {
        style: { backgroundImage: 'url("' + model.wiki.thumb.replace(/"/g, '') + '")' }
      }));
    }

    v.appendChild(el('h2.detail-title', { text: p.name }));
    if (!isWiki && p.nameLocal && p.nameLocal !== p.name) {
      v.appendChild(el('div.detail-local', { text: p.nameLocal }));
    }
    if (isWiki && model.wiki && model.wiki.description) {
      v.appendChild(el('div.detail-local', { text: model.wiki.description }));
    }

    if (!isWiki) {
      var tags = el('div.detail-tags');
      tags.appendChild(el('span.tag.tag-era', {
        style: { '--accent': era.color },
        text: TT.fmtSpan(p.from, p.to)
      }));
      p.eras.forEach(function (id) {
        var e = TT.eraById(id);
        if (!e) return;
        tags.appendChild(el('button.tag', {
          style: { '--accent': e.color },
          title: 'Show everything from ' + e.name,
          onclick: function () { H.onEraJump && H.onEraJump(id); }
        }, [e.glyph + ' ' + e.name]));
      });
      p.themes.forEach(function (id) {
        var t = TT.themeById(id);
        if (!t) return;
        tags.appendChild(el('button.tag.tag-theme', {
          title: 'Follow this subject instead',
          onclick: function () { H.onThemeJump && H.onThemeJump(id); }
        }, [t.glyph + ' ' + t.name]));
      });
      v.appendChild(tags);

      v.appendChild(el('p.detail-blurb', { text: p.blurb }));
      if (p.tips) {
        v.appendChild(el('div.detail-tip', {}, [
          el('span.tip-label', { text: 'On the ground' }),
          el('span', { text: p.tips })
        ]));
      }
    }

    /* Wikipedia body */
    var wikiBox = el('div.wiki-box');
    if (model.wikiLoading) {
      wikiBox.appendChild(el('div.skeleton'));
      wikiBox.appendChild(el('div.skeleton.short'));
    } else if (model.wiki && model.wiki.extract) {
      wikiBox.appendChild(el('h4.wiki-head', {}, [
        'From Wikipedia',
        el('span.wiki-lang', { text: model.wiki.lang === 'no' ? 'norsk' : 'english' })
      ]));
      wikiBox.appendChild(el('p.wiki-extract', { text: model.wiki.extract }));
      wikiBox.appendChild(el('a.wiki-link', {
        href: model.wiki.url, target: '_blank', rel: 'noopener noreferrer'
      }, ['Read the full article ↗']));
      if (model.wiki.viaSearch) {
        wikiBox.appendChild(el('div.wiki-note', {
          text: 'Matched by search — this may not be the exact article.'
        }));
      }
    } else {
      wikiBox.appendChild(el('div.wiki-note', {
        text: 'No Wikipedia article found for this one' +
              (TT.store.get().lang === 'no' ? ' in Norwegian.' : ' in English.')
      }));
    }
    v.appendChild(wikiBox);

    /* Chapters, so a long article can be listened to a part at a time. */
    if (model.article && model.article.sections && model.article.sections.length) {
      v.appendChild(renderChapterList(model));
    }

    /* The small details — only when curiosity mode is on. */
    if (!isWiki && p.trivia && p.trivia.length && TT.store.get().trivia) {
      v.appendChild(el('h4.sec.sec-trivia', {}, [
        'Worth knowing',
        el('span.sec-hint', { text: p.trivia.length + ' detail' + (p.trivia.length > 1 ? 's' : '') })
      ]));
      var tv = el('div.trivia');
      p.trivia.forEach(function (t, i) {
        var lang = TT.store.get().lang;
        var srcTitle = t.source && (t.source[lang] || t.source.en || t.source.no);
        tv.appendChild(el('div.trivia-item', {}, [
          el('span.trivia-num', { text: String(i + 1) }),
          el('div.trivia-body', {}, [
            el('p.trivia-text', { text: t.text }),
            srcTitle ? el('a.trivia-src', {
              href: 'https://' + (t.source[lang] ? lang : (t.source.en ? 'en' : 'no')) +
                    '.wikipedia.org/wiki/' + encodeURIComponent(srcTitle.replace(/ /g, '_')),
              target: '_blank', rel: 'noopener noreferrer'
            }, ['source ↗']) : null
          ])
        ]));
      });
      v.appendChild(tv);
    }

    /* Which curated walks this belongs to — the switching surface. */
    if (!isWiki) {
      var trails = TT.trailsFor(p.id);
      if (trails.length) {
        v.appendChild(el('h4.sec', { text: trails.length > 1 ? 'Part of these walks' : 'Part of this walk' }));
        var tl = el('div.trail-chips');
        trails.forEach(function (t) {
          var active = TT.store.get().trail === t.id;
          var e = t.era ? TT.eraById(t.era) : null;
          tl.appendChild(el('button.trail-chip' + (active ? '.on' : ''), {
            style: { '--accent': e ? e.color : '#8d8d8d' },
            onclick: function () { H.onTrailToggle && H.onTrailToggle(t.id, p.id); }
          }, [t.name, el('span.tc-hint', { text: active ? 'following' : 'follow' })]));
        });
        v.appendChild(tl);
      }
    }

    /* Recommendations */
    if (model.next && model.next.length) {
      v.appendChild(el('h4.sec', { text: 'Where to go next' }));
      var nx = el('div.recs');
      model.next.forEach(function (r) { nx.appendChild(recCard(r, 'next')); });
      v.appendChild(nx);
    }

    if (model.switches && model.switches.length) {
      v.appendChild(el('h4.sec.sec-alt', {}, [
        'Or change the subject',
        el('span.sec-hint', { text: 'nearby, but a different story' })
      ]));
      var sw = el('div.recs');
      model.switches.forEach(function (r) { sw.appendChild(recCard(r, 'switch')); });
      v.appendChild(sw);
    }

    if (model.wikiNearby && model.wikiNearby.length) {
      v.appendChild(el('h4.sec', {}, [
        'Also right here',
        el('span.sec-hint', { text: 'from Wikipedia, not curated' })
      ]));
      var wn = el('div.wiki-near');
      model.wikiNearby.slice(0, 6).forEach(function (r) {
        wn.appendChild(el('button.wiki-near-item', {
          onclick: function () { H.onSelect && H.onSelect(r.id, 'rec', r); }
        }, [
          wikiThumb(r.thumb),
          el('span.wn-text', {}, [
            el('span.wn-name', { text: r.title }),
            el('span.wn-desc', { text: r.description || '' })
          ]),
          el('span.wn-dist', { text: TT.fmtDist(r.dist) })
        ]));
      });
      v.appendChild(wn);
    }

    v.appendChild(el('div.detail-foot', {}, [
      el('button.btn.btn-ghost.btn-sm', {
        text: 'Centre map here',
        onclick: function () { TT.map.focus({ lat: p.lat, lng: p.lng }, 17); }
      }),
      el('a.btn.btn-ghost.btn-sm', {
        href: 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng,
        target: '_blank', rel: 'noopener noreferrer'
      }, ['Directions ↗'])
    ]));

    setTab('detail');
  }

  /* The article's own headings as buttons. Pressing one reads from there to the
   * end of the article rather than stopping at the end of that chapter, so this
   * is a way into a long page as much as it is a table of contents. */
  function renderChapterList(model) {
    var sections = model.article.sections;
    var lang = TT.store.get().lang;
    var box = el('div.chapters');

    box.appendChild(el('h4.sec.sec-chapters', {}, [
      'Listen by chapter',
      el('span.sec-hint', { text: sections.length + ' in this article' })
    ]));

    var row = el('div.chapter-row');
    var buttons = [];
    // Chapter 0 is the opening the guide writes itself, ahead of the headings.
    var labels = [{ title: lang === 'no' ? 'Innledning' : 'Introduction', level: 2 }]
      .concat(sections);
    // And curiosity mode adds one of ours at the end, so it needs a button too —
    // these have to stay in step with what TT.narrationParts builds.
    var p = model.place;
    if (model.kind === 'curated' && p.trivia && p.trivia.length && TT.store.get().trivia) {
      labels.push({ title: lang === 'no' ? 'Verdt å vite' : 'Worth knowing', level: 2 });
    }


    labels.forEach(function (sec, i) {
      var b = el('button.chapter-chip' + (sec.level > 2 ? '.is-sub' : ''), {
        title: 'Read from here to the end of the article',
        onclick: function () { H.onListenChapter && H.onListenChapter(i); }
      }, [sec.title]);
      buttons.push(b);
      row.appendChild(b);
    });

    box.appendChild(row);
    chapterChips = { id: model.place.id, buttons: buttons };
    syncChapterChips(TT.audio.status());
    return box;
  }

  /* ---------- spoken guide player ----------

   *
   * The player is the only narration control in the app. It has two states:
   * reading something, or offering to read the place you have open. That is why
   * it appears on selecting a place rather than only once audio starts — the
   * play button is the "listen" button, so it has to be there before you listen.
   */
  var listenTarget = null;   // the selected place, i.e. what play would read

  function setListenTarget(place) {
    listenTarget = place ? (place.name || place.title || null) : null;
    renderPlayer(TT.audio.status());
  }

  function renderPlayer(s) {
    var busy = s.playing || !!s.title;
    // With nothing to read and no voice to read it, the player has no purpose.
    if (!busy && (!listenTarget || !s.supported)) {
      dom.player.hidden = true;
      closeVoiceMenu();
      closeChapterMenu();
      return;
    }

    dom.player.hidden = false;
    dom.player.classList.toggle('is-idle', !busy);
    dom.player.classList.toggle('is-paused', !!s.paused);

    if (busy) {
      dom.playerTitle.textContent = s.title || '';
      dom.playerToggle.textContent = s.paused ? '▶' : '❚❚';
      dom.playerToggle.title = s.paused ? 'Resume' : 'Pause';
      var bits = [];
      // Which chapter, before how far in: in a long article the heading is what
      // tells you where you are, and "part 34 of 61" on its own does not.
      if (s.chapterTitle) bits.push(s.chapterTitle);
      if (s.total) bits.push('part ' + s.progress + ' of ' + s.total);
      if (s.queued) bits.push(s.queued + ' more waiting');
      dom.playerSub.textContent = bits.join(' · ');

      dom.playerFill.style.width = s.total
        ? Math.round(100 * s.progress / s.total) + '%' : '0%';
    } else {
      dom.playerTitle.textContent = listenTarget;
      dom.playerToggle.textContent = '▶';
      dom.playerToggle.title = 'Read this aloud';
      dom.playerSub.textContent = 'Read this place aloud';
      dom.playerFill.style.width = '0%';
    }

    // Skip needs somewhere to skip to: another chapter, or another place.
    dom.playerNext.hidden = !busy || (!s.queued && !s.moreChapters);
    dom.playerNext.title = s.moreChapters ? 'Skip to the next chapter' : 'Skip to the next one';
    dom.playerStop.hidden = !busy;
    dom.playerVoice.hidden = !s.supported;

    // One chapter is the whole reading, so the menu would offer nothing.
    var hasChapters = busy && s.chapters && s.chapters.length > 1;
    dom.playerChapters.hidden = !hasChapters;
    if (!hasChapters) closeChapterMenu();
    else if (!dom.chapterMenu.hidden) markChapterMenu(s);

    syncChapterChips(s);
  }

  /* ---------- chapters ----------
   *
   * A Wikipedia article is read straight through, so the chapter controls are
   * for getting to the part you want: the buttons under the article in the
   * panel, and this menu for doing it one-handed while walking. Both start the
   * reading at that chapter and let it run on to the end of the article. */
  function toggleChapterMenu() {
    if (dom.chapterMenu.hidden) buildChapterMenu(); else closeChapterMenu();
  }

  function closeChapterMenu() {
    dom.chapterMenu.hidden = true;
    dom.playerChapters.setAttribute('aria-expanded', 'false');
  }

  function buildChapterMenu() {
    var s = TT.audio.status();
    clear(dom.chapterMenu);
    dom.chapterMenu.appendChild(el('div.voice-menu-head', { text: 'Chapters' }));
    (s.chapters || []).forEach(function (c, i) {
      dom.chapterMenu.appendChild(el('button.voice-opt' + (c.level > 2 ? '.is-sub' : ''), {
        role: 'menuitemradio',
        'data-chapter': String(i),
        onclick: function () {
          closeChapterMenu();
          H.onListenChapter && H.onListenChapter(i);
        }
      }, [
        el('span.vo-tick', { text: '' }),
        el('span.vo-name', { text: c.label || ('Part ' + (i + 1)) })
      ]));
    });
    markChapterMenu(s);
    dom.chapterMenu.hidden = false;
    dom.playerChapters.setAttribute('aria-expanded', 'true');
  }

  /* Tick the chapter being read. Kept apart from building the menu so it can
   * follow along while the menu is open, without rebuilding under a finger. */
  function markChapterMenu(s) {
    TT.$$('#chapter-menu .voice-opt').forEach(function (b) {
      var on = Number(b.getAttribute('data-chapter')) === s.chapter;
      b.classList.toggle('is-active', on);
      var tick = b.querySelector('.vo-tick');
      if (tick) tick.textContent = on ? '▶' : '';
    });
  }

  /* The chapter buttons rendered under the article, if that place is on screen. */
  var chapterChips = null;   // { id, buttons: [] }

  function syncChapterChips(s) {
    if (!chapterChips) return;
    var live = s.id === chapterChips.id;
    chapterChips.buttons.forEach(function (b, i) {
      b.classList.toggle('is-active', live && s.chapter === i);
    });
  }

  /* ---------- search results dropdown ---------- */
  function renderSearch(results) {
    clear(dom.searchResults);
    if (!results.length) { dom.searchResults.hidden = true; return; }
    results.forEach(function (r) {
      dom.searchResults.appendChild(el('button.sr', {
        onclick: function () {
          dom.searchResults.hidden = true;
          dom.search.value = '';
          r.onPick();
        }
      }, [
        el('span.sr-name', { text: r.name }),
        el('span.sr-kind', { text: r.kind })
      ]));
    });
    dom.searchResults.hidden = false;
  }

  /* ---------- chrome ---------- */
  function setWalkState(on, info) {
    dom.walkBtn.classList.toggle('on', on);
    dom.walkBtn.textContent = on ? '◉ Walking' : '◎ Walk mode';
    dom.walkBtn.title = on
      ? 'Following your position — click to stop'
      : 'Use your location to sort places by how far you have to walk';
    setStatus(info || '');
  }

  function setStatus(text) {
    dom.status.textContent = text || '';
    dom.status.hidden = !text;
  }

  /* The voice menu, opened from the player.
   *
   * It exists because the device's voice list is wildly uneven between browsers,
   * and which of the good ones sounds pleasant is taste. Built on open rather
   * than on every audio tick, so the list can never shift under a pointer. */
  var voiceState = { lang: 'en', chosen: '' };

  function setVoiceState(lang, chosen) {
    voiceState = { lang: lang, chosen: chosen || '' };
    if (!dom.voiceMenu.hidden) buildVoiceMenu();
  }

  function toggleVoiceMenu() {
    if (dom.voiceMenu.hidden) buildVoiceMenu(); else closeVoiceMenu();
  }

  function closeVoiceMenu() {
    dom.voiceMenu.hidden = true;
    dom.playerVoice.setAttribute('aria-expanded', 'false');
  }

  function buildVoiceMenu() {
    var list = TT.audio.listVoices(voiceState.lang);
    clear(dom.voiceMenu);

    if (!list.length) {
      dom.voiceMenu.appendChild(el('div.voice-menu-head', {
        text: voiceState.lang === 'no'
          ? 'No Norwegian voice on this device'
          : 'No voice on this device'
      }));
    } else {
      dom.voiceMenu.appendChild(el('div.voice-menu-head', { text: 'Voice' }));
      // The automatic row names its pick, but without the locale — the row is
      // the longest in the menu and that is the part it can afford to lose.
      dom.voiceMenu.appendChild(voiceOption(
        '', 'Best available — ' + voiceLabel(list[0], true), !voiceState.chosen));
      list.forEach(function (v) {
        dom.voiceMenu.appendChild(voiceOption(
          v.voiceURI, voiceLabel(v), voiceState.chosen === v.voiceURI));
      });
    }
    dom.voiceMenu.hidden = false;
    dom.playerVoice.setAttribute('aria-expanded', 'true');
  }

  function voiceOption(uri, label, active) {
    return el('button.voice-opt' + (active ? '.is-active' : ''), {
      role: 'menuitemradio',
      onclick: function () {
        closeVoiceMenu();
        H.onVoicePick && H.onVoicePick(uri);
      }
    }, [
      el('span.vo-tick', { text: active ? '✓' : '' }),
      el('span.vo-name', { text: label })
    ]);
  }

  /* Names range from "Daniel" to "Microsoft Sonia Online (Natural) - English
   * (United Kingdom)". Trim the noise, keep the locale, flag the good ones. */
  function voiceLabel(v, noLocale) {
    // Drop the vendor and the trailing language gloss, but keep words like
    // "Enhanced" — they are often all that separates two voices called Daniel.
    var name = (v.name || 'Voice')
      .replace(/^(Microsoft|Google|Apple)\s+/i, '')
      .replace(/\s*-\s*[^-]+\([^)]*\)\s*$/, '')
      .trim();
    var tag = noLocale ? '' : (v.lang || '').replace('_', '-');
    var nice = /natural|neural|premium|enhanced|siri/i.test(v.name + ' ' + v.voiceURI)
      || v.localService === false;
    return name + (tag ? ' · ' + tag : '') + (nice ? ' ✦' : '');
  }

  function setLang(lang) {
    dom.langBtn.textContent = lang === 'no' ? 'NO' : 'EN';
    dom.langBtn.title = lang === 'no'
      ? 'Reading Norwegian Wikipedia — click for English'
      : 'Reading English Wikipedia — click for Norwegian';
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    dom.themeBtn.textContent = theme === 'dark' ? '☾' : '☀';
  }

  var toastTimer = null;
  function toast(msg, ms) {
    dom.toast.textContent = msg;
    dom.toast.hidden = false;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('show');
      setTimeout(function () { dom.toast.hidden = true; }, 300);
    }, ms || 3600);
  }

  /* A bigger, dismissible prompt for "you are standing on top of something". */
  function arrival(place, onOpen) {
    var box = $('#arrival');
    clear(box);
    var era = TT.primaryEra(place);
    box.style.setProperty('--accent', era.color);
    box.appendChild(el('div.arr-label', { text: 'You are here' }));
    box.appendChild(el('div.arr-name', { text: place.name }));
    box.appendChild(el('div.arr-blurb', { text: place.blurb }));
    box.appendChild(el('div.arr-actions', {}, [
      el('button.btn.btn-primary.btn-sm', { text: 'Tell me more', onclick: function () {
        box.hidden = true; onOpen();
      } }),
      el('button.btn.btn-ghost.btn-sm', { text: 'Not now', onclick: function () {
        box.hidden = true;
      } })
    ]));
    box.hidden = false;
  }

  return {
    init: init, setTab: setTab,
    renderEraChips: renderEraChips, renderThemeChips: renderThemeChips, syncTimeline: syncTimeline,
    renderList: renderList, renderTrails: renderTrails, renderActiveTrail: renderActiveTrail,
    renderItinerary: renderItinerary, renderPlayer: renderPlayer,
    setListenTarget: setListenTarget, setVoiceState: setVoiceState,
    renderDetail: renderDetail, renderSearch: renderSearch,
    setWalkState: setWalkState, setStatus: setStatus, setLang: setLang, setTheme: setTheme,
    toast: toast, arrival: arrival,
    dom: function () { return dom; }
  };
})();
