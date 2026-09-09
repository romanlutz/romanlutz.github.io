(function () {
  'use strict';

  var layer = document.querySelector('.hexagon-pulse-layer');
  if (!layer) return;

  var svgNamespace = 'http://www.w3.org/2000/svg';
  var centers = [
    [25.98, -45], [181.87, -45], [285.79, -45], [649.52, -45],
    [467.65, 0],
    [25.98, 45], [181.87, 45], [285.79, 45], [649.52, 45],
    [519.62, 90],
    [-25.98, 135], [181.87, 135], [285.79, 135], [389.71, 135], [597.56, 135],
    [103.92, 180], [519.62, 180],
    [233.83, 225], [389.71, 225],
    [103.92, 270], [467.65, 270],
    [25.98, 315], [181.87, 315], [389.71, 315], [545.60, 315], [649.52, 315],
    [103.92, 360], [467.65, 360],
    [25.98, 405], [181.87, 405], [285.79, 405], [649.52, 405],
    [467.65, 450]
  ];

  function svgElement(name, attributes) {
    var element = document.createElementNS(svgNamespace, name);
    Object.keys(attributes || {}).forEach(function (attribute) {
      element.setAttribute(attribute, attributes[attribute]);
    });
    return element;
  }

  var svg = svgElement('svg', {
    width: '100%',
    height: '100%',
    'aria-hidden': 'true',
    focusable: 'false'
  });
  var defs = svgElement('defs');
  var shape = svgElement('path', {
    id: 'hexagon-pulse-shape',
    d: 'M0 -30 L25.98 -15 L25.98 15 L0 30 L-25.98 15 L-25.98 -15 Z'
  });
  var pattern = svgElement('pattern', {
    id: 'hexagon-pulse-pattern',
    width: '623.54',
    height: '450',
    patternUnits: 'userSpaceOnUse'
  });

  centers.forEach(function (center, index) {
    var hexagon = svgElement('use', {
      href: '#hexagon-pulse-shape',
      x: center[0],
      y: center[1],
      'class': 'hexagon-pulse'
    });
    var duration = 8.8 + ((index * 47) % 91) / 10;
    var delay = -((index * 73) % 181) / 10;
    var peakOpacity = 0.08 + ((index * 31) % 11) / 100;

    hexagon.style.setProperty('--pulse-duration', duration.toFixed(1) + 's');
    hexagon.style.setProperty('--pulse-delay', delay.toFixed(1) + 's');
    hexagon.style.setProperty('--pulse-opacity', peakOpacity.toFixed(2));
    pattern.appendChild(hexagon);
  });

  defs.appendChild(shape);
  defs.appendChild(pattern);
  svg.appendChild(defs);
  svg.appendChild(svgElement('rect', {
    width: '100%',
    height: '100%',
    fill: 'url(#hexagon-pulse-pattern)'
  }));
  layer.appendChild(svg);

  var isVisible = true;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateAnimationState() {
    layer.classList.toggle(
      'is-active',
      isVisible && !document.hidden && !reducedMotion.matches
    );
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      updateAnimationState();
    }).observe(layer);
  }

  document.addEventListener('visibilitychange', updateAnimationState);
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', updateAnimationState);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(updateAnimationState);
  }
  updateAnimationState();
})();
