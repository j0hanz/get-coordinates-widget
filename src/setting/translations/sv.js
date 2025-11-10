System.register([], function (e) {
  return {
    execute: function () {
      e({
        settingsTitle: "Koordinater – widgetinställningar",
        mapSection: "Kartvy",
        noView: "Ingen kartvy är vald",
        noFormats: "Inga koordinatformat har valts",
        availableOutputs: "Tillgängliga koordinatformat",
        includeExtendedSystems: "Visa utökade koordinatsystem",
        precision: "Antal decimaler",
        precisionHelper:
          "Ange antal decimaler. 0–3 för meterprecision, 4–6 för centimeternivå. Geodetiska format använder minst 5 decimaler",
        showExportButton: "Visa knappen 'Exportera'",
        enablePin: "Aktivera markör i kartan",
        copyOnClick: "Kopiera koordinater vid klick i kartan",
        pinColor: "Färg på kartmarkör",
        pinIcon: "Symbol för kartmarkör",
        systemLabelSweref99: "SWEREF 99",
        systemLabelRt90: "RT 90",
        systemLabelWgs84: "WGS 84",
        systemLabelEtrs89: "ETRS 89",
        systemLabelItrf: "ITRF 2014",
        pinIconClassicPin: "Klassisk kartnål",
        pinIconTargetCircle: "Måltavla",
        pinIconDropMarker: "Droppformad markör",
        pinIconBeaconPin: "Fyrsymbol",
        pinIconRingPin: "Ringformad markör",
        settingStyleVariant: "Stilvariant",
        styleVariantDefault: "Standard",
        styleVariantLinear: "Linjär",
      });
    },
  };
});
