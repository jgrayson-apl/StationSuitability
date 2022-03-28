/*
 Copyright 2020 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SuitabilityWeight from './Suitability/SuitabilityWeight.js';
import SuitabilitySource from './Suitability/SuitabilitySource.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // APP TITLE //
        this.title = this.title || map?.portalItem?.title || 'Application';
        // APP DESCRIPTION //
        this.description = this.description || map?.portalItem?.description || group?.description || '...';

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {
    if (this.oauthappid || this.portal?.user) {

      const signIn = document.getElementById('sign-in');
      signIn && (signIn.portal = this.portal);

    }
  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/LayerList',
          'esri/widgets/Legend',
          "esri/widgets/Compass"
        ], (Home, Search, LayerList, Legend, Compass) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            }
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // LEGEND //
          const legend = new Legend({view: view});
          view.ui.add(legend, {position: 'bottom-left', index: 0});

          // COMPASS //
          const compass = new Compass({view: view});
          view.ui.add(compass, {position: 'top-left'});
          this._watchUtils.init(view, 'rotation', rotation => {
            compass.visible = (rotation !== 0);
          });

          // SEARCH /
          /*
           const search = new Search({ view: view});
           view.ui.add(legend, {position: 'top-right', index: 0});
           */

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layer-list-container',
            view: view,
            listItemCreatedFunction: (event) => {
              event.item.open = (event.item.layer.type === 'group');
            },
            visibleElements: {statusIndicators: true}
          });

          // VIEW UPDATING //
          this.disableViewUpdating = false;
          const viewUpdating = document.getElementById('view-updating');
          view.ui.add(viewUpdating, 'bottom-right');
          this._watchUtils.init(view, 'updating', updating => {
            (!this.disableViewUpdating) && viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        if (this.suitability) {

          this.initializeSuitabilityLayer({view}).then(suitabilityLayer => {
            this.displayFeatureList({view, suitabilityLayer});
            this.displayFeatureTable({view, suitabilityLayer});
            this.initializeSuitabilityAnalysis({view, suitabilityLayer});
          });
          resolve();
        } else {
          reject(new Error("Missing 'suitability' configuration..."));
        }
      }).catch(reject);
    });
  }

  /**
   *
   * @param {MapView} view
   * @returns {Promise<FeatureLayer>}
   */
  initializeSuitabilityLayer({view}) {
    return new Promise((resolve, reject) => {
      const suitabilityLayer = view.map.layers.find(layer => { return (layer.title === this.suitability.layerTitle); });
      suitabilityLayer.load().then(() => {

        suitabilityLayer.set({
          outFields: ["*"]
        });

        resolve(suitabilityLayer);
      }).catch(reject);
    });
  }

  /**
   *
   * @param {MapView} view
   * @param {FeatureLayer} suitabilityLayer
   */
  displayFeatureList({view, suitabilityLayer}) {
    require(['esri/core/promiseUtils'], (promiseUtils) => {

      const scoreFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 3, maximumFractionDigits: 3});

      const layerInfo = {
        filter: '1=1',
        queryParams: {
          returnGeometry: true,
          outFields: this.suitability.featureList.outFields,
          orderByFields: this.suitability.featureList.orderByFields
        },
        itemInfos: {
          label: f => `${ f.attributes[this.suitability.featureList.labelField] }`,
          description: f => `Score: ${ scoreFormatter.format(f.attributes[this.suitability.featureList.descriptionField]) }`
        }
      };

      // LAYER TITLE //
      document.getElementById('features-title').innerHTML = suitabilityLayer.title;

      // OBJECTID FIELD //
      const objectIdField = suitabilityLayer.objectIdField;

      const featureSelected = (featureOID) => {
        view.popup.close();
        if (featureOID) {
          const feature = featuresByOID.get(featureOID);
          const zoomTarget = (feature.geometry.type === 'point') ? feature : feature.geometry.extent.clone().expand(1.5);
          view.goTo({target: zoomTarget}).then(() => {
            view.popup.open({features: [feature]});
          });
        }
      };

      // VIEW CLICK //
      /*view.on('click', clickEvt => {
       view.hitTest(clickEvt, {include: [suitabilityLayer]}).then(hitResponse => {
       if (hitResponse.results.length) {
       const featureOID = hitResponse.results[0].graphic.attributes[objectIdField];
       featureSelected(featureOID);
       } else {
       featureSelected();
       }
       });
       });*/

      // ENABLE TOGGLE ACTION //
      document.querySelector('calcite-action[data-toggle="features-list"]').removeAttribute('hidden');

      // LIST OF FEATURES //
      const featuresList = document.getElementById('features-list');
      featuresList.addEventListener('calciteListChange', (evt) => {
        const featureOID = evt.detail.size ? Number(Array.from(evt.detail.keys())[0]) : null;
        featureSelected(featureOID);
      });

      // UPDATE LIST SELECTION //
      const updateListSelection = (featureOID) => {
        if (featureOID) {
          const featureItem = featuresList.querySelector(`calcite-pick-list-item[value="${ featureOID }"]`);
          featureItem && (featureItem.selected = true);
        } else {
          featuresList.getSelectedItems().then((selectedItems) => {
            selectedItems.forEach(item => { item.selected = false; });
          });
        }
      };

      let featuresByOID = new Map();
      const updateFeaturesList = features => {
        featuresByOID = features.reduce((list, feature) => {
          return list.set(feature.attributes[objectIdField], feature);
        }, new Map());

        // GET CURRENT SELECTED ITEM //
        const selectedItem = featuresList.querySelector(`calcite-pick-list-item[selected]`);
        const selectedOID = selectedItem ? selectedItem.value : null;

        // CREATE AND ADD FEATURE ITEMS //
        featuresList.replaceChildren(...features.map(createFeatureItemNodes));
        //updateFeatureActions();

        selectedOID && updateListSelection(selectedOID);
      };

      /*const updateFeatureActions = () => {
       featuresList.querySelectorAll('calcite-action').forEach(actionNode => {
       actionNode.addEventListener('click', () => {
       const feature = featuresByOID.get(Number(actionNode.parentNode.value));
       view.popup.open({features: [feature]});
       });
       });
       };*/

      // CLEAR LIST SELECTION //
      const clearListSelectionAction = document.getElementById('clear-list-selection-action');
      clearListSelectionAction.addEventListener('click', () => {
        updateListSelection();
      });

      // FEATURE ITEM TEMPLATE //
      const featureItemTemplate = document.getElementById('feature-item-template');
      // CREATE ITEM NODE //
      const createFeatureItemNodes = (feature) => {
        const templateNode = featureItemTemplate.content.cloneNode(true);
        const itemNode = templateNode.querySelector('calcite-pick-list-item');
        itemNode.setAttribute('label', layerInfo.itemInfos.label(feature));
        itemNode.setAttribute('description', layerInfo.itemInfos.description(feature));
        itemNode.setAttribute('value', feature.attributes[objectIdField]);
        return itemNode;
      };

      // GET FEATURES BASED ON FILTER //
      const getFeatures = (filter) => {
        return promiseUtils.create((resolve, reject) => {
          const featuresQuery = suitabilityLayer.createQuery();
          featuresQuery.set({where: filter || '1=1', ...layerInfo.queryParams});
          suitabilityLayer.queryFeatures(featuresQuery).then(featuresFS => {
            resolve(featuresFS.features);
          }).catch(reject);
        });
      };

      // GET ALL FEATURES //
      const updateFeatureList = () => {
        featuresList.loading = true;
        getFeatures(layerInfo.filter).then((features) => {
          updateFeaturesList(features);
          featuresList.loading = false;
        });
      };
      updateFeatureList();

      this._evented.on('final-score-change', () => {
        updateFeatureList();
      });

    });
  }

  /**
   *
   * @param view
   * @param suitabilityLayer
   */
  displayFeatureTable({view, suitabilityLayer}) {
    require(['esri/widgets/FeatureTable'], (FeatureTable) => {

      const featureTable = new FeatureTable({
        container: "table-container",
        view: view,
        layer: suitabilityLayer,
        fieldConfigs: this.suitability.tableFieldsConfig
      });

      this._evented.on('final-score-change', () => {
        featureTable.refresh();
      });

    });
  }

  /**
   *
   * @param {MapView} view
   * @param {FeatureLayer} suitabilityLayer
   */
  initializeSuitabilityAnalysis({view, suitabilityLayer}) {

    //
    // CREATE SUITABILITY UI //
    //
    const scoreExpression = document.getElementById('score-expression');
    const suitabilityExpression = document.getElementById('suitability-expression');
    const suitabilityContainer = document.getElementById('suitability-container');

    // SUITABILITY SOURCE //
    const suitabilitySource = new SuitabilitySource({
      layer: suitabilityLayer,
      analysis: this.suitability.analysis
    });
    suitabilityContainer.append(suitabilitySource);

    suitabilitySource.addEventListener('ready', () => {
      scoreExpression.innerHTML = suitabilitySource.getStaticScoreExpression();
      updateSuitabilityScore(suitabilitySource.getDynamicScoreExpression());
    });
    suitabilitySource.addEventListener('weight-change', ({detail: {scoreExpression}}) => {
      updateSuitabilityScore(scoreExpression);
    });

    /**
     *
     */
    const updateSuitabilityScore = (scoreExpression) => {

      suitabilityExpression.innerHTML = scoreExpression;

      updateScoreRenderer(scoreExpression);
      updateScoreLabel(scoreExpression);
    };

    // SCORE RENDERER //
    const sizeVV = suitabilityLayer.renderer.visualVariables.find(vv => vv.type === 'size');
    const updateScoreRenderer = scoreExpression => {
      const renderer = suitabilityLayer.renderer.clone();
      renderer.expression = scoreExpression;
      sizeVV.valueExpression = scoreExpression;
      renderer.visualVariables = [sizeVV];
      suitabilityLayer.renderer = renderer;
    };

    // SCORE LABEL //
    const unitLabel = suitabilityLayer.labelingInfo[0].clone();
    const scoreLabel = suitabilityLayer.labelingInfo[1].clone();
    const updateScoreLabel = (scoreExpression) => {
      scoreLabel.labelExpressionInfo.expression = `Text(${ scoreExpression },"0.000");`;
      suitabilityLayer.labelingInfo = [unitLabel, scoreLabel];
    };

    //
    // SAVE WEIGHTS AND SCORES //
    //
    const suitabilitySaveBtn = document.getElementById('suitability-save-btn');
    suitabilitySaveBtn.addEventListener('click', () => {
      suitabilitySaveBtn.loading = true;
      suitabilitySource.calculateFeatureScores().then(() => {
        suitabilitySaveBtn.loading = false;
        this._evented.emit('final-score-change', {});
      }).catch((error) => {
        console.warn(error);
      });
    });

  }

}

export default new Application();
