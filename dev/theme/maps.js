// Green-tinted flag maps reveal full color on hover, focus, or tap.
// All listed places, including stopovers, stay highlighted.
// Dependencies and atlas data load only when a map approaches the viewport.
(function () {
  var DETAIL_HINT = 'Hover, focus, or tap a flag to see it in full color.';

  // Map country alpha-3 codes to atlas IDs and flag filenames.
  var COUNTRY_NUM = {
    AUT: '040', BHS: '044', CAN: '124', CHE: '756', DEU: '276',
    ESP: '724', FIN: '246', FRA: '250', GBR: '826', HUN: '348',
    IND: '356', ITA: '380', MEX: '484', MLT: '470', NLD: '528',
    POL: '616', SMR: '674', USA: '840', VAT: '336',
    ARE: '784', BEL: '056', ISL: '352',
    ABW: '533', CUW: '531'
  };
  var COUNTRY_ALPHA2 = {
    AUT: 'at', BHS: 'bs', CAN: 'ca', CHE: 'ch', DEU: 'de',
    ESP: 'es', FIN: 'fi', FRA: 'fr', GBR: 'gb', HUN: 'hu',
    IND: 'in', ITA: 'it', MEX: 'mx', MLT: 'mt', NLD: 'nl',
    POL: 'pl', SMR: 'sm', USA: 'us', VAT: 'va',
    ARE: 'ae', BEL: 'be', ISL: 'is',
    ABW: 'aw', CUW: 'cw'
  };
  // US postal code to atlas FIPS state code.
  var US_FIPS = {
    AK: '02', AZ: '04', CA: '06', CO: '08', CT: '09',
    DC: '11', DE: '10', FL: '12', ID: '16', IL: '17',
    MA: '25', MD: '24', ME: '23', MN: '27', MT: '30',
    NH: '33', NJ: '34', NY: '36', OR: '41', PA: '42',
    RI: '44', SD: '46', UT: '49', VT: '50', WA: '53', WY: '56'
  };
  var TOPOJSON = {
    usa: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    world: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
  };
  var ZOOM_OVERRIDE = { USA: 2.0, CAN: 2.0, IND: 2.0, ISL: 2.0 };

  function flagUrl(scope, placeName) {
    var prefix = window.MAPS_FLAG_BASE || 'images/flags/';
    if (scope === 'usa') {
      return prefix + 'us-states/' + placeName.toLowerCase() + '.png';
    }
    var alpha2 = COUNTRY_ALPHA2[placeName];
    return alpha2 ? prefix + 'countries/' + alpha2 + '.svg' : null;
  }

  function buildPlacesByFeatureId(scope, places) {
    var byId = {};
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      var id = scope === 'usa' ? US_FIPS[place.name] : COUNTRY_NUM[place.name];
      if (id) byId[id] = place;
    }
    return byId;
  }

  function placeStatus(place) {
    return place ? (place.visited ? 'Visited' : 'Stopover') : 'Not visited';
  }

  function eachPolygon(feature) {
    var geometry = feature.geometry;
    var polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    return polygons.map(function (coordinates) {
      return {
        type: 'Feature', id: feature.id, properties: feature.properties,
        geometry: { type: 'Polygon', coordinates: coordinates }
      };
    });
  }

  function render(scope, container, topology, places) {
    var objectKey = scope === 'usa' ? 'states' : 'countries';
    var features = topojson.feature(topology, topology.objects[objectKey]).features;
    var byId = buildPlacesByFeatureId(scope, places);
    var path, viewBox;
    if (scope === 'usa') {
      var width = 975;
      var height = 610;
      var usaProj = d3.geoAlbersUsa();
      usaProj.fitSize([width, height], { type: 'FeatureCollection', features: features });
      path = d3.geoPath(usaProj);
      viewBox = [0, 0, width, height];
    } else {
      // Use the sphere's bounds to avoid an empty band around the world map.
      var projection = d3.geoEqualEarth().fitWidth(975, { type: 'Sphere' });
      path = d3.geoPath(projection);
      var bounds = path.bounds({ type: 'Sphere' });
      viewBox = [bounds[0][0], bounds[0][1], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]];
    }

    container.innerHTML = '';
    var svg = d3.select(container).append('svg')
      .attr('viewBox', viewBox.join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'group')
      .attr('aria-label', (scope === 'usa' ? 'US states' : 'Countries') + ' visited or passed through');
    var defs = svg.append('defs');
    var filterId = 'flag-tint-' + scope;
    // Map flag luminance to a dark-to-light green range, retaining opaque detail.
    defs.append('filter').attr('id', filterId)
      .attr('color-interpolation-filters', 'sRGB')
      .append('feColorMatrix').attr('type', 'matrix')
      .attr('values', '0.065 0.219 0.022 0 0.102 0.087 0.292 0.029 0 0.251 0.066 0.222 0.022 0 0.169 0 0 0 1 0');
    var g = svg.append('g');
    var detail = document.getElementById(scope + '_map_detail');
    var activeRegion = null;
    var hoveredRegion = null;
    var focusedRegion = null;
    var pinnedRegion = null;

    function clearSelection() {
      if (activeRegion) activeRegion.classList.remove('is-active');
      activeRegion = null;
      detail.textContent = DETAIL_HINT;
    }

    function showPlace(region, feature) {
      if (activeRegion === region) return;
      clearSelection();
      activeRegion = region;
      region.classList.add('is-active');
      var place = byId[feature.id];
      var href = place && flagUrl(scope, place.name);
      detail.textContent = '';
      if (href) {
        var image = document.createElement('img');
        image.className = 'map-detail__flag';
        image.alt = '';
        image.width = 48;
        image.height = 32;
        image.addEventListener('error', function () {
          image.hidden = true;
          console.warn('Unable to load map flag:', href);
        });
        image.src = href;
        detail.appendChild(image);
      }
      var text = document.createElement('div');
      var name = document.createElement('strong');
      name.textContent = place && place.label || feature.properties.name;
      var status = document.createElement('span');
      status.textContent = placeStatus(place);
      text.appendChild(name);
      text.appendChild(status);
      detail.appendChild(text);
    }

    function updateSelection() {
      var region = hoveredRegion || focusedRegion || pinnedRegion;
      if (region) showPlace(region, region.__data__);
      else clearSelection();
    }

    features.forEach(function (feature) {
      var place = byId[feature.id];
      var region = g.append('g')
        .datum(feature)
        .attr('class', 'map-region' + (place ? ' is-visited' : ''))
        .on('pointerenter', function (event) {
          if (event.pointerType !== 'touch') {
            hoveredRegion = this;
            updateSelection();
          }
        })
        .on('pointerleave', function (event) {
          if (event.pointerType !== 'touch') {
            hoveredRegion = null;
            updateSelection();
          }
        });
      if (place) {
        region.attr('tabindex', 0)
          .attr('role', 'button')
          .attr('filter', 'url(#' + filterId + ')')
          .attr('aria-controls', scope + '_map_detail')
          .attr('aria-label', (place.label || feature.properties.name) + ', ' + placeStatus(place) + '. Show flag colors.')
          .on('focus', function () { focusedRegion = this; updateSelection(); })
          .on('blur', function () { focusedRegion = null; updateSelection(); })
          .on('click', function (event) {
            if (event.pointerType !== 'mouse') {
              pinnedRegion = pinnedRegion === this ? null : this;
              hoveredRegion = focusedRegion = null;
            }
            updateSelection();
          })
          .on('keydown', function (event, d) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              showPlace(this, d);
            }
          });
      } else {
        region.attr('aria-hidden', 'true');
      }

      var href = place && flagUrl(scope, place.name);
      var polygons = place ? eachPolygon(feature) : [feature];
      polygons.forEach(function (polygon, index) {
        var polygonPath = region.append('path')
          .attr('class', 'choropleth')
          .attr('d', path(polygon))
          .attr('vector-effect', 'non-scaling-stroke');
        if (!href) return;
        var bounds = path.bounds(polygon);
        var x = bounds[0][0], y = bounds[0][1];
        var width = bounds[1][0] - x, height = bounds[1][1] - y;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
        // Fit a full flag to each island, rather than stretching one across oceans.
        var patternId = 'flag-' + scope + '-' + place.name + '-' + index;
        var zoom = (scope === 'world' && ZOOM_OVERRIDE[place.name]) || 1;
        var pattern = defs.append('pattern')
          .attr('id', patternId)
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('x', x).attr('y', y)
          .attr('width', width).attr('height', height);
        pattern.append('rect')
          .attr('width', width).attr('height', height)
          .attr('class', 'map-flag-fallback');
        pattern.append('image')
          .attr('href', href)
          .attr('x', width * (1 - zoom) / 2).attr('y', height * (1 - zoom) / 2)
          .attr('width', width * zoom).attr('height', height * zoom)
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .on('error', function () {
            this.setAttribute('visibility', 'hidden');
            console.warn('Unable to load map flag:', href);
          });
        polygonPath.attr('fill', 'url(#' + patternId + ')');
      });
    });

    svg.on('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        hoveredRegion = focusedRegion = pinnedRegion = null;
        clearSelection();
      }
    });
    clearSelection();
  }

  var libraryPromises = {};

  function loadLibrary(name, url) {
    if (window[name]) return Promise.resolve();
    if (!libraryPromises[name]) {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;
      libraryPromises[name] = new Promise(function (resolve, reject) {
        script.addEventListener('load', function () {
          if (window[name]) resolve();
          else reject(new Error('Map library did not initialize: ' + url));
        });
        script.addEventListener('error', function () {
          reject(new Error('Unable to load map library: ' + url));
        });
        document.head.appendChild(script);
      }).catch(function (error) {
        script.remove();
        delete libraryPromises[name];
        throw error;
      });
    }
    return libraryPromises[name];
  }

  function loadDependencies() {
    return Promise.all([
      loadLibrary('d3', 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'),
      loadLibrary('topojson', 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js')
    ]);
  }

  window.initDatamap = function (config) {
    var container = document.getElementById(config.scope + '_map');
    if (!container) return;
    var url = TOPOJSON[config.scope];
    if (!url) return;
    container.hidden = false;
    document.getElementById(config.scope + '_map_detail').hidden = false;
    container.classList.remove('map-container--error');
    container.classList.add('map-container--loading');
    container.setAttribute('aria-busy', 'true');
    container.textContent = 'Loading map...';
    return loadDependencies().then(function () {
      return d3.json(url);
    }).then(function (topology) {
      render(config.scope, container, topology, config.places || []);
    }).catch(function (error) {
      container.textContent = 'The map could not be loaded.';
      container.classList.add('map-container--error');
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'map-retry';
      retry.textContent = 'Retry map';
      retry.addEventListener('click', function () {
        var restoreFocus = document.activeElement === retry;
        return window.initDatamap(config).then(function () {
          if (restoreFocus) {
            var target = container.querySelector('[tabindex="0"], button');
            if (target) target.focus();
          }
        });
      });
      container.appendChild(retry);
      document.getElementById(config.scope + '_map_detail').textContent =
        'Check your connection and retry, or use the place list below.';
      var list = document.getElementById(config.scope + '_map_places');
      if (list) list.open = true;
      console.error('Unable to load ' + config.scope + ' map:', error);
    }).finally(function () {
      container.classList.remove('map-container--loading');
      container.setAttribute('aria-busy', 'false');
    });
  };

  function startMap(container) {
    if (container.dataset.mapStarted) return;
    container.dataset.mapStarted = 'true';
    var config;
    try {
      config = JSON.parse(container.dataset.mapConfig);
      if (!TOPOJSON[config.scope] || !Array.isArray(config.places) ||
          container.id !== config.scope + '_map') {
        throw new Error('Unsupported map configuration');
      }
    } catch (error) {
      container.classList.add('map-container--error');
      container.textContent = 'Map settings could not be read. The place list is still available below.';
      console.error('Unable to read map configuration:', error);
      return;
    }
    window.initDatamap(config);
  }

  var observer = window.IntersectionObserver && new window.IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        startMap(entry.target);
      }
    });
  }, { rootMargin: '300px' });

  document.querySelectorAll('[data-map-config]').forEach(function (container) {
    container.hidden = false;
    document.getElementById(container.id + '_detail').hidden = false;
    container.textContent = 'The map loads as you approach this section.';
    if (observer) observer.observe(container);
    else startMap(container);
  });
})();
