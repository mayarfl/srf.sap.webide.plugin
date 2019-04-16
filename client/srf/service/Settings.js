/*
 *     (c) Copyright 2019 Micro Focus company, L.P.
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */
 
define(
	[
		"sap/watt/common/plugin/platform/service/ui/AbstractConfig",
		"../utils/common"
	],
	function(AbstractConfig, oCommon) {
		"use strict";
		return AbstractConfig.extend("srf.service.Settings", {

			_oUserPreferenceView: null,

			_fetchDestinations: function(sKey) {
				var that = this;
				return oCommon.getSRFDestinations(this.context, sKey)
					.then(function(aDestinations) {
						if (aDestinations) {
							return aDestinations;
						}
						oCommon.trace("SRF", that.context.i18n.getText("settings_FetchDestinationsFailed"), that.context, "error");
						return [{
							destination: null
						}];
					});
			},

			// ====================================================================================
			// Interface methods: sap.watt.common.service.ui.Config
			// ====================================================================================
			getUserPreferenceContent: function() {
				//return a view for the user preference UI
				var that = this;
				if (this._oUserPreferenceView === null) {
					this._oUserPreferenceView = sap.ui.view({
						viewName: "srf.view.settings.Settings",
						type: sap.ui.core.mvc.ViewType.XML,
						viewData: {
							context: this.context
						}
					});
				}
				return Q.spread([this._fetchDestinations("SRF"), oCommon.fetchSrfDestinationName(this.context)], function(aDestinations,
					sSrfDestinationName) {
					that._oUserPreferenceView.getController().initDestinationsModel(sSrfDestinationName, aDestinations);
					return that._oUserPreferenceView;
				});
			},

			saveUserPreference: function() {
				var that = this;
				var sSelectedDestination = this._oUserPreferenceView.getModel("srfSettings").getProperty("/_sSrfDestinationName");
				// oCommon propagates the string to  service.preferences.set method
				return oCommon.setSrfPreferences(this.context, {
					name: sSelectedDestination
				}).then(function() {
					return that.context.service.rightpane.onSrfPreferencesChanged({
						name: sSelectedDestination
					});
				});
			}
		});
	});