System.register([], function (e) {
  return {
    execute: function () {
      e({
        title: "Koordinater",
        noView: "Ingen kartvy är ansluten",
        noFormats: "Inga koordinatformat har valts",
        noValue: "Inga koordinater tillgängliga",
        clickMapToPlacePin: "Klicka på kartan för att placera en markör",
        format: "Koordinatformat",
        export: "Exportera",
        exportJson: "Exportera till JSON",
        exportXml: "Exportera till XML",
        exportYaml: "Exportera till YAML",
        precision: "Antal decimaler",
        copy: "Kopiera",
        copied: "Kopierat",
        loadingModules: "Laddar karttjänster",
        moduleLoadFailed: "Det gick inte att ladda ArcGIS-resurser",
        systemLabelSweref99: "SWEREF 99",
        systemLabelRt90: "RT 90",
        systemLabelWgs84: "WGS 84",
        systemLabelEtrs89: "ETRS 89",
        systemLabelItrf: "ITRF 2014",
        easting: "E",
        northing: "N",
        latitude: "Lat",
        longitude: "Lon",
        clipboardUnavailable: "Urklippstjänsten är inte tillgänglig",
        pinToggleOn: "Aktivera markör i kartan",
        pinToggleOff: "Inaktivera markör i kartan",
      });
    },
  };
});
