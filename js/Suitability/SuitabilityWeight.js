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

/**
 *
 * SuitabilityWeight
 *  - Suitability Weight
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  3/25/2022 - 0.0.1 -
 * Modified:
 *
 */

class SuitabilityWeight extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {SuitabilitySource}
   */
  source;

  /**
   *
   * @type {string}
   */
  label;

  /**
   *
   * @type {Field}
   */
  valueField;

  /**
   *
   * @type {Field}
   */
  weightField;

  /**
   *
   * @type {boolean}
   */
  disabled = false;

  /**
   *
   * @type {number}
   */
  min = 1;

  /**
   *
   * @type {number}
   */
  max = 9;

  /**
   *
   * @type {number}
   */
  weight = 5;

  /**
   * @type {CalciteSlider}
   */
  weightSlider;

  /**
   *
   * @param {SuitabilitySource} source
   * @param {string} label
   * @param {string} valueFieldName
   * @param {string} weightFieldName
   */
  constructor({source, label, valueFieldName, weightFieldName}) {
    super();

    this.source = source;
    this.label = label;

    this.min = this.source.defaultMin;
    this.max = this.source.defaultMax;
    this.weight = this.source.defaultWeight;

    this.valueField = this.source.layer.getField(valueFieldName);
    this.weightField = this.source.layer.getField(weightFieldName);

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>      
        :host{               
          display: flex;
          flex-direction: row;          
          justify-content: space-between;
          align-items: center; 
        }
        .suitability-weight{
          width: 100%;
        }        
        .suitability-weight-label{          
          flex-basis: calc(50% - 1.5rem);
        }        
        .suitability-weight-slider{
          flex-basis: 50%;
        }        
        .suitability-weight-slider[disabled]{
          pointer-events: none;
          opacity: 0.4;
        }      
      </style>      
      <calcite-label class="suitability-weight" layout="inline">
        <calcite-icon icon="conditional-rules-path"></calcite-icon>      
        <div class="suitability-weight-label">${ this.label }</div>
        <calcite-slider class="suitability-weight-slider" min="${ this.min }" max="${ this.max }" value="${ this.weight }" ticks="1" snap label-handles></calcite-slider>
      </calcite-label>
    `;

  }

  /**
   *
   */
  connectedCallback() {

    this.validateValueRanges().then(({valid}) => {

      this.weightSlider = this.shadowRoot.querySelector('.suitability-weight-slider');
      this.weightSlider.addEventListener('calciteSliderInput', () => {
        this.weight = this.weightSlider.value;
        this.dispatchEvent(new CustomEvent('weight-change', {}));
      });
      this.weightSlider.value = this.weight;

      this.disabled = !valid;
      this.weightSlider.toggleAttribute('disabled', this.disabled);

    });

  }

  /**
   *
   * @returns {Promise<boolean>}
   */
  validateValueRanges() {
    return new Promise((resolve, reject) => {

      const valueFieldName = this.valueField.name;

      const valueRangeQuery = this.source.layer.createQuery();
      valueRangeQuery.set({
        where: '1=1',
        outFields: valueFieldName,
        outStatistics: [
          {
            onStatisticField: valueFieldName,
            outStatisticFieldName: `${ valueFieldName }_min`,
            statisticType: "min"
          },
          {
            onStatisticField: valueFieldName,
            outStatisticFieldName: `${ valueFieldName }_max`,
            statisticType: "max"
          }
        ]
      });

      this.source.layer.queryFeatures(valueRangeQuery).then(valueRangeFS => {
        const valueRangesStats = valueRangeFS.features[0].attributes;

        const validRangeMin = (valueRangesStats[`${ valueFieldName }_min`] >= this.min);
        const validRangeMax = (valueRangesStats[`${ valueFieldName }_max`] <= this.max);

        resolve({valid: validRangeMin && validRangeMax});
      }).catch(reject);

    });
  }

  /**
   *
   * @returns {string}
   */
  getDynamicCalculation() {
    return `($feature.${ this.valueField.name } * ${ this.weight })`;
  }

  /**
   *
   * @returns {string}
   */
  getStaticCalculation() {
    return `($feature.${ this.valueField.name } * $feature.${ this.weightField.name })`;
  }

}

customElements.define('suitability-weight', SuitabilityWeight);

export default SuitabilityWeight;
