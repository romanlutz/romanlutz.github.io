(function () {
  'use strict';

  var nav = document.querySelector('[data-site-nav]');
  if (!nav) return;

  var sectionLinks = Array.prototype.slice.call(nav.querySelectorAll('[data-nav-section]'));
  var sectionTargets = sectionLinks.map(function (link) {
    return {
      id: link.getAttribute('data-nav-section'),
      link: link,
      target: document.getElementById(link.getAttribute('data-nav-section'))
    };
  }).filter(function (item) {
    return item.target;
  });

  var rail = nav.querySelector('[data-timeline-rail]');
  var marker = nav.querySelector('[data-timeline-marker]');
  var ticks = Array.prototype.slice.call(nav.querySelectorAll('[data-timeline-tick]'));
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-timeline-chapter]'));
  var frameId = 0;

  function documentTop(element) {
    return element.getBoundingClientRect().top + window.scrollY;
  }

  function setActiveSection(probeY) {
    var activeId = sectionTargets[0] ? sectionTargets[0].id : '';

    sectionTargets.forEach(function (item) {
      if (documentTop(item.target) <= probeY) {
        activeId = item.id;
      }
    });

    sectionTargets.forEach(function (item) {
      var isActive = item.id === activeId;
      item.link.classList.toggle('is-active', isActive);
      if (isActive) {
        item.link.setAttribute('aria-current', 'location');
      } else {
        item.link.removeAttribute('aria-current');
      }
    });
  }

  function timelinePosition(probeY) {
    var anchors = chapters.map(function (chapter) {
      return documentTop(chapter) + Math.min(chapter.offsetHeight * 0.2, 160);
    });
    var lastIndex = anchors.length - 1;

    if (probeY <= anchors[0]) {
      return { progress: 0, activeIndex: 0 };
    }
    if (probeY >= anchors[lastIndex]) {
      return { progress: 1, activeIndex: lastIndex };
    }

    for (var index = 0; index < lastIndex; index += 1) {
      if (probeY < anchors[index + 1]) {
        var localProgress = (probeY - anchors[index]) / (anchors[index + 1] - anchors[index]);
        return {
          progress: (index + localProgress) / lastIndex,
          activeIndex: index
        };
      }
    }

    return { progress: 1, activeIndex: lastIndex };
  }

  function setTimelineProgress(probeY) {
    if (!rail || !marker || ticks.length < 2 || ticks.length !== chapters.length) return;

    var position = timelinePosition(probeY);
    var firstTick = ticks[0];
    var lastTick = ticks[ticks.length - 1];
    var start = firstTick.offsetTop + firstTick.offsetHeight / 2;
    var end = lastTick.offsetTop + lastTick.offsetHeight / 2;
    var markerY = start + (end - start) * position.progress - marker.offsetHeight / 2;

    marker.style.transform = 'translate3d(-50%, ' + markerY + 'px, 0)';

    ticks.forEach(function (tick, index) {
      var isActive = index === position.activeIndex;
      tick.classList.toggle('is-active', isActive);
      tick.classList.toggle('is-reached', index <= position.activeIndex);
      if (isActive) {
        tick.setAttribute('aria-current', 'step');
      } else {
        tick.removeAttribute('aria-current');
      }
    });
  }

  function updateNavigation() {
    frameId = 0;
    var probeY = window.scrollY + Math.min(window.innerHeight * 0.35, 280);
    setActiveSection(probeY);
    setTimelineProgress(probeY);
  }

  function requestUpdate() {
    if (!frameId) {
      frameId = window.requestAnimationFrame(updateNavigation);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate, { once: true });
  updateNavigation();
})();
