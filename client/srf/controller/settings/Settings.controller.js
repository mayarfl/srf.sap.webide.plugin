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
 
jQuery.sap.require("sap.ui.model.resource.ResourceModel");  
sap.ui.define([
	"../../controller/BaseController",
	"../../formatter/formatter"
], 
function( BaseController, oFormatter) {
	"use strict";

	return BaseController.extend("srf.controller.settings.Settings", {
		formatter: oFormatter,
		oUserData: {
			_sSettingsImageFileName: "settings.png",
			_sSrfDestinationName: "",
			_aSrfDestinations: [{destination:"", tenantId : ""}],
			enabled: true
		},
	
		//methods
		onInit: function() {
	
			// create JSON model instance
			this.oUserSettingsModel = new sap.ui.model.json.JSONModel(this.oUserData);
			this.oUserSettingsModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
				
			this.oUserSettingsModel.setProperty("/_aSrfDestinations", this.oUserData._aSrfDestinations);
			this.oUserSettingsModel.setProperty("/_sSrfDestinationName", this.oUserData._sSrfDestinationName);
			
			// require the jQuery.sap.resources module     
			jQuery.sap.require("sap.ui.model.resource.ResourceModel");   
			var sModulePath = jQuery.sap.getModulePath("srf/i18n");
			// load the resource bundle
			var i18nModel = new sap.ui.model.resource.ResourceModel({  
					bundleUrl : sModulePath + "/i18n.properties",  
					locale : "en"  
			}); 
			
			// set up view	
			var oView = this.getView();
			oView.setModel(this.oUserSettingsModel, "srfSettings");
			oView.setModel(i18nModel, "i18n");
		},
		
		initDestinationsModel: function(sDestName, aDestinations) {
			var oView = this.getView(),
				oModel = oView.getModel("srfSettings");
				
			sDestName = sDestName || this.oUserData._sSrfDestinationName;	
			this.oUserData._sSrfDestinationName = ( sDestName === "" ? this.oUserData._sSrfDestinationName : sDestName);
			this.oUserData._aSrfDestinations = aDestinations || this.oUserData._aSrfDestinations;
			oModel.setProperty("/_aSrfDestinations", aDestinations);
			oModel.setProperty("/_sSrfDestinationName", sDestName);
			oModel.setProperty("/tenantError", false);
		},

		onDestinationChanged:function(oEvent) {
			var oView = this.getView(),
				oModel = oView.getModel("srfSettings"),
				sTenantId = oEvent.getParameter("selectedItem").getKey();
				
			oModel.setProperty("/tenantError", sTenantId ? false : true);
		}
	});
	
});