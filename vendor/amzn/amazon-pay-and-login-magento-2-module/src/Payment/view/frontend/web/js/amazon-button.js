/**
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
define([
    'jquery',
    'Magento_Customer/js/customer-data',
    'Magento_Customer/js/section-config',
    'Amazon_Payment/js/model/amazonPaymentConfig',
    'amazonCsrf',
    'modernizr/modernizr',
    'amazonCore',
    'jquery/ui'
], function ($, customerData, sectionConfig, amazonPaymentConfig, amazonCsrf) {
    'use strict';

    var _this,
        $button;

    $.widget('amazon.AmazonButton', {
        options: {
            merchantId: null,
            buttonType: 'LwA',
            buttonColor: 'Gold',
            buttonSize: 'medium',
            redirectUrl: null,
            loginPostUrl: null
        },

        /**
         * Create button
         */
        _create: function () {
            _this = this;
            $button = this.element;
            this._verifyAmazonConfig();
            //window.setTimeout( _this._renderAmazonButton, 1000 );
            _this._renderAmazonButton();
        },

        /**
         * Verify if checkout config is available
         * @private
         */
        _verifyAmazonConfig: function () {
            if (amazonPaymentConfig.isDefined()) {
                _this.options.merchantId = amazonPaymentConfig.getValue('merchantId');
                _this.options.buttonType = _this.options.buttonType === 'LwA' ?
                    amazonPaymentConfig.getValue('buttonTypeLwa') : amazonPaymentConfig.getValue('buttonTypePwa');
                _this.options.buttonColor = amazonPaymentConfig.getValue('buttonColor');
                _this.options.buttonSize = amazonPaymentConfig.getValue('buttonSize');
                _this.options.redirectUrl = amazonPaymentConfig.getValue('redirectUrl');
                _this.options.loginPostUrl = amazonPaymentConfig.getValue('loginPostUrl');
                _this.options.loginScope = amazonPaymentConfig.getValue('loginScope');
                _this.options.buttonLanguage = amazonPaymentConfig.getValue('displayLanguage');
            }
        },

        /**
         * Validate CSRF cookie and redirect to HTTPS
         */
        secureHttpsCallback: function (event) {
            var sections = sectionConfig.getAffectedSections(_this.options.loginPostUrl);

            if (!event.state || !amazonCsrf.isValid(event.state)) {
                window.location = amazonPaymentConfig.getValue('customerLoginPageUrl');

                return window.location;
            }

            // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
            if (!event.access_token || !!event.error) {
                window.location = amazonPaymentConfig.getValue('customerLoginPageUrl');

                return window.location;
            }

            if (sections) {
                customerData.invalidate(sections);
            }
            window.location = _this.options.redirectUrl + '?access_token=' + event.access_token;
            // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        },

        /**
         * Use popup or redirect URI
         *
         * @return {String}
         */
        _popupCallback: function () {
            return _this.usePopUp() ? _this.secureHttpsCallback : amazonPaymentConfig.getValue('oAuthHashRedirectUrl');
        },

        /**
         * Are touch events available
         * (Supports both v2 and v3 Modernizr)
         * @returns {Boolean}
         * @private
         */
        _touchSupported: function () {
            //eslint-disable-next-line no-undef
            return Modernizr.touch !== undefined ? Modernizr.touch : Modernizr.touchevents;
        },

        /**
         * Should we use the pop up login flow?
         *  - are we on an HTTPS page (required for popup)
         *  - confirm we are not on the product detail page (items are added asynchronously to the cart,
         *    hence popups will be blocked)
         *  - confirm we are not using a touch device (redirect provides a better mobile experience)
         * @returns {Boolean}
         * @public
         */
        usePopUp: function () {
            return window.location.protocol === 'https:' && !$('body').hasClass('catalog-product-view') &&
                !_this._touchSupported();
        },

        /**
         * onAmazonPaymentsReady
         * @private
         */
        _renderAmazonButton: function () {
            OffAmazonPayments.Button($button.attr('id'), _this.options.merchantId, { //eslint-disable-line no-undef
                type: _this.options.buttonType,
                color: _this.options.buttonColor,
                size: _this.options.buttonSize,
                language: _this.options.buttonLanguage,

                /**
                 * Authorization callback
                 */
                authorization: function () {
                    //eslint-disable-next-line no-undef
                    amazon.Login.authorize(_this._getLoginOptions(), _this._popupCallback());
                }
            });
            $('.amazon-button-container .field-tooltip').fadeIn();
        },

        /**
         * Build login options
         * @returns {{scope: *, popup: *, state: *}}
         * @private
         */
        _getLoginOptions: function () {
            return {
                scope: _this.options.loginScope,
                popup: _this.usePopUp(),
                state: amazonCsrf.generateNewValue()
            };
        }
    });

    return $.amazon.AmazonButton;
});
