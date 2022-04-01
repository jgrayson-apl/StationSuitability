/*
 Copyright 2021 Esri

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

import SuitabilityWeight from './SuitabilityWeight.js';

/**
 *
 * SuitabilitySource
 *  - Suitability Source
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  3/25/2022 - 0.0.1 -
 * Modified:
 *
 */

class SuitabilitySource extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {FeatureLayer}
   */
  layer;

  /**
   *
   * @type {number}
   */
  defaultMin;

  /**
   *
   * @type {number}
   */
  defaultMax;

  /**
   *
   * @type {number}
   */
  defaultWeight;

  /**
   * @type {string}
   */
  scoreFieldName;

  /**
   * @type {Object[]}
   */
  weights;

  /**
   * @type {SuitabilityWeight[]}
   */
  suitabilityWeights;

  /**
   * @type {HTMLElement}
   */
  weightsPanel;

  /**
   *
   * @type {boolean}
   */
  ready = false;

  /**
   *
   * @param {FeatureLayer} layer
   * @param {Object} analysis
   * @param {number} defaultMin
   * @param {number} defaultMax
   * @param {number} defaultWeight
   * @param {SuitabilityWeight[]} weights
   * @param {string} scoreFieldName
   */
  constructor({layer, analysis: {defaultMin = 1, defaultMax = 9, defaultWeight = 5, weights, scoreFieldName}}) {
    super();

    this.layer = layer;

    this.defaultMin = defaultMin;
    this.defaultMax = defaultMax;
    this.defaultWeight = defaultWeight;

    this.weights = weights;
    this.scoreFieldName = scoreFieldName;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>      
        :host {
          display: flex;
          flex-direction: column;          
          justify-content: flex-start;                     
        }
        .suitability-source-panel{
        
        }                      
      </style>      
      <calcite-block heading="${ this.layer.title }" summary="suitability analysis" collapsible="true" open>
        <calcite-icon slot="icon" icon="widgets-source"></calcite-icon>        
        <div class="suitability-source-panel"></div>      
      </calcite-block>
    `;

  }

  /**
   *
   */
  connectedCallback() {

    this.createSuitabilityWeight = this.createSuitabilityWeight.bind(this);
    this.calculateFeatureScores = this.calculateFeatureScores.bind(this);
    this.calcFeatureScore = this.calcFeatureScore.bind(this);

    this.weightsPanel = this.shadowRoot.querySelector('.suitability-source-panel');
    this.suitabilityWeights = this.weights.map(this.createSuitabilityWeight);
    this.setDefaultWeights().then(() => {
      this.weightsPanel.append(...this.suitabilityWeights);
      this.dispatchEvent(new CustomEvent('ready', {detail: {}}));
    });

  }

  /**
   *
   * @returns {Promise<>}
   */
  setDefaultWeights() {
    return new Promise((resolve, reject) => {

      const weightFieldNames = this.suitabilityWeights.map(suitabilityWeight => suitabilityWeight.weightField.name);

      const defaultWeightsQuery = this.layer.createQuery();
      defaultWeightsQuery.set({outFields: weightFieldNames, where: '1=1', num: 1});

      this.layer.queryFeatures(defaultWeightsQuery).then(defaultWeightsFS => {
        const defaultWeights = defaultWeightsFS.features[0].attributes;
        this.suitabilityWeights.forEach(suitabilityWeight => {
          suitabilityWeight.weight = defaultWeights[suitabilityWeight.weightField.name];
        });
        resolve();
      }).catch(reject);

    });
  };

  /**
   *
   * @param {string} label
   * @param {string} valueFieldName
   * @param {string} weightFieldName
   */
  createSuitabilityWeight({label, valueFieldName, weightFieldName}) {
    const suitabilityWeight = new SuitabilityWeight({source: this, label, valueFieldName, weightFieldName});
    suitabilityWeight.addEventListener('weight-change', () => {
      this.dispatchEvent(new CustomEvent('weight-change', {detail: {scoreExpression: this.getDynamicScoreExpression()}}));
    });
    return suitabilityWeight;
  }

  /**
   *
   * @returns {string}
   */
  getStaticScoreExpression() {

    const {fieldCalcs, weights} = this.suitabilityWeights.reduce((infos, suitabilityWeight) => {
      if (!suitabilityWeight.disabled) {

        infos.fieldCalcs.push(suitabilityWeight.getStaticCalculation());
        infos.weights.push(`$feature.${ suitabilityWeight.weightField.name }`);

      }
      return infos;
    }, {fieldCalcs: [], weights: []});

    return fieldCalcs.length ? `((${ fieldCalcs.join(' + ') }) / (${ weights.join(' + ') }))` : this.defaultMin;
  }

  /**
   *
   * @returns {string}
   */
  getDynamicScoreExpression() {

    const {fieldCalcs, weights} = this.suitabilityWeights.reduce((infos, suitabilityWeight) => {
      if (!suitabilityWeight.disabled) {

        infos.fieldCalcs.push(suitabilityWeight.getDynamicCalculation());
        infos.weights += suitabilityWeight.weight;

      }
      return infos;
    }, {fieldCalcs: [], weights: 0});

    return fieldCalcs.length ? `((${ fieldCalcs.join(' + ') }) / (${ weights }))` : this.defaultMin;
  }

  /**
   *
   * @param feature
   * @returns {*}
   */
  calcFeatureScore(feature) {

    // DON'T SEND GEOMETRY TO APPLY EDITS //
    const editFeature = feature.clone();
    editFeature.geometry = null;

    // ATTRIBUTES //
    const atts = editFeature.attributes;

    const {weightedValues, totalWeights} = this.suitabilityWeights.reduce((infos, suitabilityWeight) => {
      if (!suitabilityWeight.disabled) {
        editFeature.setAttribute(suitabilityWeight.weightField.name, suitabilityWeight.weight);

        infos.weightedValues += (atts[suitabilityWeight.valueField.name] * suitabilityWeight.weight);
        infos.totalWeights += suitabilityWeight.weight;

      }
      return infos;
    }, {weightedValues: 0, totalWeights: 0});

    const finalScore = totalWeights ? (weightedValues / totalWeights) : this.defaultMin;
    editFeature.setAttribute(this.scoreFieldName, finalScore.toPrecision(4));

    return editFeature;
  }

  /**
   *
   * @returns {Promise<>}
   */
  calculateFeatureScores() {
    return new Promise((resolve, reject) => {

      const allQuery = this.layer.createQuery();
      allQuery.set({outFields: ['*'], where: '1=1'});

      this.layer.queryFeatures().then(allFS => {

        const updateFeatures = allFS.features.map(this.calcFeatureScore);

        this.layer.applyEdits({updateFeatures}).then((editsResults) => {
          const errorEditResults = editsResults.updateFeatureResults.filter(editResult => editResult.error != null);
          if (errorEditResults.length) {
            console.warn(errorEditResults);
            reject(new Error(`There were ${ errorEditResults.length } edit errors...`));
          } else {
            this.layer.refresh();
            resolve();
          }
        });
      });

    });
  };

}

customElements.define('suitability-source', SuitabilitySource);

export default SuitabilitySource;
