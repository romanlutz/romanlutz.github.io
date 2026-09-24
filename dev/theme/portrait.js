(function () {
  'use strict';

  var portrait = document.querySelector('[data-portrait]');
  if (!portrait) return;

  var image = portrait.querySelector('[data-portrait-image]');
  var trigger = portrait.querySelector('.portrait-trigger');
  var base = portrait.getAttribute('data-portrait-base');
  if (!image || !trigger || !base) {
    console.warn('Portrait animation unavailable: incomplete portrait markup.');
    return;
  }

  var original = image.getAttribute('src');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  var directions = ['up-left', 'up', 'up-right', 'left', 'right', 'down-left', 'down', 'down-right'];
  var frames = Object.create(null);
  var started = { wink: false, directions: false };
  var ready = { wink: false, directions: false };
  var pointer = null;
  var axisX = 0;
  var axisY = 0;
  var currentPose = 'neutral';
  var frameId = 0;
  var winkTimer = 0;
  var winking = false;
  var focused = true;
  var visible = false;
  var failed = false;

  function display(pose) {
    if (pose === currentPose) return;
    image.src = pose === 'neutral' ? original : frames[pose].src;
    currentPose = pose;
  }

  function reset() {
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(winkTimer);
    frameId = 0;
    winkTimer = 0;
    winking = false;
    pointer = null;
    axisX = 0;
    axisY = 0;
    display('neutral');
  }

  function active() {
    return !failed && !reducedMotion.matches && !document.hidden && focused && visible;
  }

  function fail(error) {
    if (failed) return;
    failed = true;
    trigger.hidden = true;
    reset();
    console.warn('Portrait animation unavailable; keeping the original photo.', error);
  }

  function loadFrame(name) {
    return new Promise(function (resolve, reject) {
      var frame = new Image();
      var url = base + name + '.webp';
      frame.decoding = 'async';
      frame.fetchPriority = 'low';
      function unavailable() {
        reject(new Error('Unable to load or decode portrait frame: ' + url));
      }
      function decoded() {
        if (!frame.naturalWidth || frame.naturalWidth !== frame.naturalHeight) {
          unavailable();
          return;
        }
        frames[name] = frame;
        resolve();
      }
      frame.onerror = unavailable;
      frame.onload = function () {
        if (typeof frame.decode === 'function') {
          frame.decode().then(decoded, unavailable);
        } else {
          decoded();
        }
      };
      frame.src = url;
    });
  }

  function prepare(kind, names) {
    if (started[kind]) return;
    started[kind] = true;
    Promise.all(names.map(loadFrame)).then(function () {
      ready[kind] = true;
      sync();
    }, fail);
  }

  function direction(value, previous) {
    if (value >= 0.35) return 1;
    if (value <= -0.35) return -1;
    if (previous === 1 && value > 0.22) return 1;
    if (previous === -1 && value < -0.22) return -1;
    return 0;
  }

  function sync() {
    var rect = portrait.getBoundingClientRect();
    visible = rect.width > 0 && rect.height > 0 &&
      rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
    trigger.hidden = failed || reducedMotion.matches || !ready.wink;
    if (!active()) {
      reset();
      return;
    }

    prepare('wink', ['wink-half', 'wink']);
    if (finePointer.matches) {
      prepare('directions', directions);
    } else {
      pointer = null;
      axisX = 0;
      axisY = 0;
      if (!winking) display('neutral');
    }
    if (!ready.directions || !pointer || winking) return;

    var x = (pointer.x - rect.left - rect.width / 2) / Math.max(rect.width, window.innerWidth * 0.2);
    var y = (pointer.y - rect.top - rect.height / 2) / Math.max(rect.height, window.innerHeight * 0.2);
    axisX = direction(x, axisX);
    axisY = direction(y, axisY);
    var horizontal = ['left', '', 'right'][axisX + 1];
    var vertical = ['up', '', 'down'][axisY + 1];
    display((vertical + (vertical && horizontal ? '-' : '') + horizontal) || 'neutral');
  }

  function requestUpdate() {
    if (failed || reducedMotion.matches || frameId) return;
    frameId = window.requestAnimationFrame(function () {
      frameId = 0;
      sync();
    });
  }

  function wink() {
    if (!active() || !ready.wink || winking) return;
    winking = true;
    var steps = [['neutral', 60], ['wink-half', 90], ['wink', 140], ['wink-half', 90], ['neutral', 60]];
    var index = 0;
    function next() {
      winkTimer = 0;
      if (!active()) {
        reset();
        return;
      }
      if (index === steps.length) {
        winking = false;
        requestUpdate();
        return;
      }
      var step = steps[index++];
      display(step[0]);
      winkTimer = window.setTimeout(next, step[1]);
    }
    next();
  }

  window.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') {
      pointer = null;
      axisX = 0;
      axisY = 0;
      if (!winking) display('neutral');
      return;
    }
    if (failed || reducedMotion.matches || document.hidden || !focused || !finePointer.matches) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (visible) requestUpdate();
  }, { passive: true });
  window.addEventListener('pointerout', function (event) {
    if (event.pointerType !== 'touch' && !event.relatedTarget) reset();
  });
  window.addEventListener('pointercancel', reset);
  window.addEventListener('blur', function () {
    focused = false;
    sync();
  });
  window.addEventListener('focus', function () {
    focused = true;
    sync();
  });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  document.addEventListener('visibilitychange', sync);
  trigger.addEventListener('click', wink);

  [reducedMotion, finePointer].forEach(function (query) {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', sync);
    } else if (typeof query.addListener === 'function') {
      query.addListener(sync);
    }
  });
  sync();
})();
