console.log("Script loaded.");

var map = L.map('map').setView([50.8503, 15.3122], 4);  // Centre la carte sur l'Europe

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var markers = [];

// Requête SPARQL à DBpedia
var endpoint = "https://dbpedia.org/sparql";

function addMarkersToMap() {
    markers.forEach(function(marker) {
        marker.addTo(map);
    });
}

function removeMarkersFromMap() {
    markers.forEach(function(marker) {
        map.removeLayer(marker);
    });
}

function filterMarkers(inputCountry) {
    var normalizedCountry = inputCountry.trim().toLowerCase();
    if (normalizedCountry === '') {
        // Réinitialiser la carte lorsque le champ est vide
        addMarkersToMap();
    } else {
        // Filtrer et afficher/masquer les marqueurs en fonction du pays saisi
        markers.forEach(function(marker) {
            var label = marker.getPopup().getContent().toLowerCase();
            var isVisible = label.includes(normalizedCountry);
            isVisible ? marker.addTo(map) : map.removeLayer(marker);
        });
    }
}

var sparqlQuery = `
    PREFIX dbo: <http://dbpedia.org/ontology/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>

    SELECT ?monument ?label ?lat ?long ?description ?image ?shortDescription WHERE {
        ?monument a dbo:HistoricPlace ;
                rdfs:label ?label ;
                geo:lat ?lat ;
                geo:long ?long ;
                dbo:abstract ?description .
        OPTIONAL { ?monument dbo:thumbnail ?image }
        OPTIONAL { ?monument dbo:shortDescription ?shortDescription }
        FILTER(langMatches(lang(?label),"FR"))
        FILTER(langMatches(lang(?description),"FR"))
        FILTER(?lat > 35 && ?lat < 70)  # latitude approximative pour l'Europe
        FILTER(?long > -25 && ?long < 40)  # longitude approximative pour l'Europe
    }
`;

$.ajax({
    url: endpoint + "?query=" + encodeURIComponent(sparqlQuery) + "&format=json",
    success: function(data) {
        var results = data.results.bindings;
        for (var i = 0; i < results.length; i++) {
            var monument = results[i].monument.value;
            var label = results[i].label.value;
            var lat = parseFloat(results[i].lat.value);
            var long = parseFloat(results[i].long.value);
            var description = results[i].description.value;
            var image = results[i].image ? results[i].image.value : '';
            var shortDescription = results[i].shortDescription ? results[i].shortDescription.value : '';

            var popupContent = `<strong>${label}</strong><br>`;
            if (image) {
                popupContent += `<img src="${image}" alt="${label}" style="max-width: 100px;"><br>`;
            }
            popupContent += shortDescription ? shortDescription : description;

            var marker = L.marker([lat, long]);
            marker.bindPopup(popupContent);
            markers.push(marker);
        }

        addMarkersToMap();

        // Gérer le clic sur le bouton de filtrage
        $('#applyFilter').click(function() {
            var inputCountry = $('#countryInput').val();
            filterMarkers(inputCountry);
        });
    }
});
