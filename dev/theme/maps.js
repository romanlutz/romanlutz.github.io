// Choropleth helper that fills each "visited" country / US state with its
// flag (via SVG <pattern>) and each "transit-only" entry with a solid
// light green. Built on D3 v7 + TopoJSON v3.
//
// Usage from the mkdocs template (one call per map):
//   initDatamap({scope: "usa",   places: [{name: "AK", visited: true}, ...]});
//   initDatamap({scope: "world", places: [{name: "DEU", visited: true}, ...]});
//
// The helper assumes a wrapper element exists with id `${scope}_map`.
// d3 and topojson are loaded synchronously above this script.
(function () {
  var FILL_DEFAULT = '#2a3038';
  var STROKE = '#484f58';

  // Visited-country alpha-3 → ISO 3166-1 numeric (used as id in
  // world-atlas) and alpha-2 (used as the flag filename).
  var COUNTRY_NUM = {
    AUT: '040', BHS: '044', CAN: '124', CHE: '756', DEU: '276',
    ESP: '724', FIN: '246', FRA: '250', GBR: '826', HUN: '348',
    IND: '356', ITA: '380', MEX: '484', MLT: '470', NLD: '528',
    POL: '616', SMR: '674', USA: '840', VAT: '336',
    ARE: '784', BEL: '056', ISL: '352'
  };
  var COUNTRY_ALPHA2 = {
    AUT: 'at', BHS: 'bs', CAN: 'ca', CHE: 'ch', DEU: 'de',
    ESP: 'es', FIN: 'fi', FRA: 'fr', GBR: 'gb', HUN: 'hu',
    IND: 'in', ITA: 'it', MEX: 'mx', MLT: 'mt', NLD: 'nl',
    POL: 'pl', SMR: 'sm', USA: 'us', VAT: 'va',
    ARE: 'ae', BEL: 'be', ISL: 'is'
  };
  // US postal code → FIPS state code (used as id in us-atlas).
  var US_FIPS = {
    AK: '02', AZ: '04', CA: '06', CO: '08', CT: '09',
    DC: '11', DE: '10', FL: '12', ID: '16', IL: '17',
    MA: '25', MD: '24', ME: '23', MN: '27', MT: '30',
    NH: '33', NJ: '34', NY: '36', OR: '41', PA: '42',
    RI: '44', SD: '46', UT: '49', VT: '50', WA: '53', WY: '56'
  };

  var TOPOJSON = {
    usa:   'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    world: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
  };

  function flagUrl(scope, placeName) {
    if (scope === 'usa') {
      var prefix = (window.MAPS_FLAG_BASE || 'images/flags/');
      return prefix + 'us-states/' + placeName.toLowerCase() + '.png';
    }
    var alpha2 = COUNTRY_ALPHA2[placeName];
    if (!alpha2) return null;
    var prefix2 = (window.MAPS_FLAG_BASE || 'images/flags/');
    return prefix2 + 'countries/' + alpha2 + '.svg';
  }

  // Build {topoFeatureId → place} so renderers can look up by feature id.
  function buildPlacesByFeatureId(scope, places) {
    var byId = {};
    for (var i = 0; i < places.length; i++) {
      var p = places[i];
      var id = scope === 'usa' ? US_FIPS[p.name] : COUNTRY_NUM[p.name];
      if (id) byId[id] = p;
    }
    return byId;
  }

  function ensurePopup() {
    var popup = document.getElementById('map-hoverinfo');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'map-hoverinfo';
    popup.className = 'hoverinfo';
    popup.style.position = 'fixed';
    popup.style.pointerEvents = 'none';
    popup.style.display = 'none';
    popup.style.zIndex = '1000';
    document.body.appendChild(popup);
    return popup;
  }

  function attachHover(svgSel, popup, byId) {
    svgSel.selectAll('path.choropleth')
      .on('pointerenter', function (event, d) {
        var name = (d.properties && d.properties.name) || '';
        var visited = !!(d && byId[d.id]);
        popup.textContent = visited ? '\u2713 ' + name : name;
        popup.classList.toggle('visited', visited);
        popup.style.display = 'block';
      })
      .on('pointermove', function (event) {
        popup.style.left = (event.clientX + 12) + 'px';
        popup.style.top  = (event.clientY + 12) + 'px';
      })
      .on('pointerleave', function () {
        popup.style.display = 'none';
      });
  }

  // Returns a copy of the feature with all interior holes removed from its
  // polygons (keep only the outer ring of each). The default TopoJSON encodes
  // interior water bodies (Hudson Bay, Great Lakes, etc.) as polygon holes,
  // so without this the page background would show through inside countries
  // and look like gray gaps in the flag fill.
  function solidGeometry(feature) {
    var geom = feature.geometry;
    if (!geom) return feature;
    var newCoords;
    if (geom.type === 'Polygon') {
      newCoords = [geom.coordinates[0]];
    } else if (geom.type === 'MultiPolygon') {
      newCoords = geom.coordinates.map(function (poly) { return [poly[0]]; });
    } else {
      return feature;
    }
    return {
      type: 'Feature', id: feature.id, properties: feature.properties,
      geometry: { type: geom.type, coordinates: newCoords }
    };
  }

  // Returns projected bounds of the largest sub-polygon of a feature. Sizing
  // the flag pattern to the mainland (not the whole feature) avoids cases
  // like USA, where Pacific territories (Guam, American Samoa) stretch the
  // bbox almost all the way around the globe and the flag becomes invisibly
  // small on continental US.
  function mainlandBounds(feature, path) {
    var geom = feature.geometry;
    if (!geom || geom.type !== 'MultiPolygon' || geom.coordinates.length <= 1) {
      return path.bounds(feature);
    }
    var bestCoords = null;
    var bestArea = -Infinity;
    for (var i = 0; i < geom.coordinates.length; i++) {
      var area = Math.abs(path.area({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: geom.coordinates[i] }
      }));
      if (area > bestArea) { bestArea = area; bestCoords = geom.coordinates[i]; }
    }
    return path.bounds({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: bestCoords }
    });
  }

  function render(scope, container, topology, places) {
    var objectKey = scope === 'usa' ? 'states' : 'countries';
    var features = topojson.feature(topology, topology.objects[objectKey]).features;
    var byId = buildPlacesByFeatureId(scope, places);

    var path, viewBox;
    if (scope === 'usa') {
      // us-atlas states-10m.json is in raw lat/long; project with AlbersUsa to a 975×610 canvas.
      var width = 975;
      var height = 610;
      var usaProj = d3.geoAlbersUsa();
      usaProj.fitSize([width, height], { type: 'FeatureCollection', features: features });
      path = d3.geoPath(usaProj);
      viewBox = [0, 0, width, height];
    } else {
      // Project the sphere and use its actual extent as the viewBox so there's no
      // empty band above/below the map.
      var targetWidth = 975;
      var projection = d3.geoEqualEarth().fitWidth(targetWidth, { type: 'Sphere' });
      path = d3.geoPath(projection);
      var bounds = path.bounds({ type: 'Sphere' });
      viewBox = [
        bounds[0][0],
        bounds[0][1],
        bounds[1][0] - bounds[0][0],
        bounds[1][1] - bounds[0][1]
      ];
    }

    container.innerHTML = '';
    var svg = d3.select(container).append('svg')
      .attr('viewBox', viewBox.join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    var defs = svg.append('defs');
    var g = svg.append('g');

    // Render each feature as a single path. Visited features get a pattern
    // sized to the MAINLAND (largest sub-polygon) and applied to the whole
    // feature. The mainland is fully covered with a properly-proportioned
    // flag; outlying territories (Alaska/Hawaii on USA, Arctic islands on
    // Canada, Andaman on India, French overseas etc.) show the slice of the
    // same flag that aligns with their geographic position, so the country
    // reads as one continuous flag drape.
    features.forEach(function (feature) {
      var place = byId[feature.id];
      var fill = FILL_DEFAULT;
      if (place) {
        var href = flagUrl(scope, place.name);
        if (href) {
          var bounds = mainlandBounds(feature, path);
          var x = bounds[0][0], y = bounds[0][1];
          var w = bounds[1][0] - x, h = bounds[1][1] - y;
          if (w > 0 && h > 0) {
            var patternId = 'flag-' + scope + '-' + place.name;
            defs.append('pattern')
              .attr('id', patternId)
              .attr('patternUnits', 'userSpaceOnUse')
              .attr('x', x).attr('y', y)
              .attr('width', w).attr('height', h)
              .append('image')
                .attr('href', href)
                .attr('width', w).attr('height', h)
                // Slice: enlarge the flag to fully COVER the mainland bbox
                // while preserving its aspect ratio. Overflow on the longer
                // axis is clipped; the country path further clips to its
                // shape. Result: every part of the country is covered with
                // flag pixels, and the flag isn't distorted — just slightly
                // zoomed and cropped at the edges when aspects don't match.
                .attr('preserveAspectRatio', 'xMidYMid slice');
            fill = 'url(#' + patternId + ')';
          }
        }
      }
      g.append('path')
        .datum(feature)
        .attr('class', 'choropleth')
        .attr('d', path(place ? solidGeometry(feature) : feature))
        .attr('stroke', STROKE)
        .attr('stroke-width', 0.5)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('fill', fill);
    });

    attachHover(svg, ensurePopup(), byId);
  }

  window.initDatamap = function (config) {
    var container = document.getElementById(config.scope + '_map');
    if (!container) return;
    var url = TOPOJSON[config.scope];
    if (!url) return;
    d3.json(url).then(function (topology) {
      render(config.scope, container, topology, config.places || []);
    });
  };
})();

