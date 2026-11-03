// Quiet choropleth maps with flags revealed in a detail strip on interaction.
// All listed places, including stopovers, stay highlighted.
// d3 and topojson are loaded synchronously before this script.
(function () {
  var DETAIL_HINT = 'Hover or tap a highlighted place to see its flag.';

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
    var g = svg.append('g');
    var detail = document.getElementById(scope + '_map_detail');
    var activeRegion = null;

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
      name.textContent = feature.properties.name;
      var status = document.createElement('span');
      status.textContent = placeStatus(place);
      text.appendChild(name);
      text.appendChild(status);
      detail.appendChild(text);
    }

    features.forEach(function (feature) {
      var place = byId[feature.id];
      var region = g.append('path')
        .datum(feature)
        .attr('class', 'choropleth' + (place ? ' is-visited' : ''))
        .attr('d', path(feature))
        .attr('vector-effect', 'non-scaling-stroke')
        .on('pointerenter', function (event, d) {
          if (event.pointerType !== 'touch') showPlace(this, d);
        });
      if (place) {
        region.attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', feature.properties.name + ', ' + placeStatus(place) + '. Show flag.')
          .on('focus', function (event, d) { showPlace(this, d); })
          .on('click', function (event, d) { showPlace(this, d); })
          .on('keydown', function (event, d) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              showPlace(this, d);
            }
          });
      } else {
        region.attr('aria-hidden', 'true');
      }
    });

    svg.on('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
      }
    });
    clearSelection();
  }

  window.initDatamap = function (config) {
    var container = document.getElementById(config.scope + '_map');
    if (!container) return;
    var url = TOPOJSON[config.scope];
    if (!url) return;
    return d3.json(url).then(function (topology) {
      render(config.scope, container, topology, config.places || []);
    });
  };
})();
