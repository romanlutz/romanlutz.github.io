// Visited-places choropleth helper for Datamaps.
//
// Usage from the mkdocs template (one call per map):
//   initDatamap({scope: "usa", labels: true, places: [{name: "AK", visited: true}, ...]});
//
// The helper assumes a wrapper element exists with id `${scope}_map`, and
// that `datamaps.${scope}.min.js` (which defines window.Datamap and the
// topology for the given scope) has already been loaded synchronously above.
(function () {
  var FILLS = {
    defaultFill: '#21262d',
    authorHasTraveledTo: '#2da44e',
    authorHasTraveledThrough: '#7ee787'
  };

  function popupTemplate(geography) {
    return '<div class="hoverinfo">' + geography.properties.name + '</div>';
  }

  function labelColor(datum) {
    return (datum && datum.fillKey) ? '#0d1117' : '#8b949e';
  }

  function buildData(places) {
    var data = {};
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      data[place.name] = {
        fillKey: place.visited ? 'authorHasTraveledTo' : 'authorHasTraveledThrough'
      };
    }
    return data;
  }

  window.initDatamap = function (config) {
    var map = new Datamap({
      scope: config.scope,
      element: document.getElementById(config.scope + '_map'),
      geographyConfig: {
        highlightOnHover: false,
        popupOnHover: true,
        popupTemplate: popupTemplate
      },
      fills: FILLS,
      data: buildData(config.places)
    });

    if (config.labels) {
      map.labels({ labelColor: labelColor });
    }

    return map;
  };
})();
