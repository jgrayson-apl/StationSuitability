# Station Suitability

This application uses feature attributes to dynamically calculate suitability using a simple weighted sum based on several pre-configured attributes.
It's assumed that these attributes have been normalized to a consistent range before being used in this application.

### Demo
[Station Suitability](https://geoxc-apps2.bd.esri.com/Analysis/StationSuitability/index.html)

### Deploy

This demo is built as a static web application.

1 - Download and copy the root folder to a web accessible location\
2 - Update the configuration parameters in ./config/application.json

### Configure

Update the [application.json](https://github.com/jgrayson-apl/StationSuitability/blob/master/config/application.json) file in your favorite json editor:

|                  parameter | details                                                                                                                                                                                                                                                                                                     |
|---------------------------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|              **portalUrl** | Organization or Enterprise URL; example: https://www.arcgis.com                                                                                                                                                                                                                                             |
|             **oauthappid** | The client app id for the web application item.<br><br>You can create the Client ID through the https://developers.arcgis.com/ website, or via the web application item page, 'Settings' tab, 'App Registration' section.                                                                                   |
|                 **webmap** | This is the ArcGIS item ID of your Web Map.                                                                                                                                                                                                                                                        |

#### SUITABILITY ANALYSIS CONFIGURATION
The '**_suitability_**' section of the config file is used to configure the suitability analysis settings specific to your layer.

_**layerTitle**_: the title of the Feature Layer as configured in the Web Map.

_**featureList**_: settings specific to the list of features in the left panel.

_**tableFieldsConfig**_: settings specific to the table of features in the bottom panel.

_**analysis**_: settings specific to the analysis.

---

### The APIs
This application uses the ArcGIS API for JavaScript and Calcite Components.

 - [ArcGIS API for Javascript](https://developers.arcgis.com/javascript/latest/api-reference/)
 - [Calcite Components](https://developers.arcgis.com/calcite-design-system/components/)

### Contact Us
For questions about the demo web application:
> John Grayson | Prototype Specialist | Geo Experience Center\
> Esri | 380 New York St | Redlands, CA 92373 | USA\
> T 909 793 2853 x1609 | [jgrayson@esri.com](mailto:jgrayson@esri.com?subject=Suitability%20on%20GitHub&body=Hi%20John,%0A%20%20I%20have%20a%20quesiton%20about%20the%20_____%20demo.) | [GeoXC Demos](https://www.esriurl.com/GeoXCDemos) | [esri.com](https://www.esri.com)
