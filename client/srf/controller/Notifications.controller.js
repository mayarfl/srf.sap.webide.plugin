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
 
sap.ui.define([
		"../controller/BaseTestDetailsController",
		"sap/ui/core/routing/History",
		"sap/ui/model/json/JSONModel",
		"../formatter/formatter",
		"../model/models"
],
function(BaseController, History, JSONModel, formatter, models) {
	"use strict";

	return BaseController.extend("srf.controller.Notifications", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf srf.view.TestDetails
		 */
		onInit: function() {
			this.init();
			this.getRouter().getRoute("notifications").attachPatternMatched(this._onObjectMatched, this);
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass()).addStyleClass("sapUiSizeCompact");
			
			this.setModel(new JSONModel({
				total: 0,
				aData: []
			}), "runningTests");
			
			this._oNotifictionsList = this.byId("notifictionsList");
		},

		onNavBack: function(oEvent) {
			var oHistory, sPreviousHash,
				oViewModel = this.getModel("testDetails");
				
			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				
				var id = sPreviousHash.split("/");
				if(id.length === 2) {
					this.getRouter().navTo("details", {
						testId: id[1]
					});
				} else if (id.length < 2) {
					this.getRouter().navTo("tests", {}, true);
				} else {
					this.getRouter().navTo("runs", {
						testId: id[1],
						oData: oViewModel.getProperty("/testRuns")
					});
				}
				
			} else {
				this.getRouter().navTo("tests", {}, true);
			}
		},
		
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
	
		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			this._onBindingChange();
		},
			
		_onBindingChange : function () {
			return this._loadRunningModel().then( function() {
				this._oNotifictionsList.getBinding("items").refresh();
			});
		}


	});

});