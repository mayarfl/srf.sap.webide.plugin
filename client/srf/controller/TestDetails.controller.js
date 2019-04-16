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
	"sap/ui/model/json/JSONModel",
	"../model/models",
	"../utils/utils"
], function(BaseTestDetailsController, JSONModel, models, Utils) {
	"use strict";
	

	return BaseTestDetailsController.extend("srf.controller.TestDetails", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf srf.view.TestDetails
		 */
		onInit: function() {
			this.init();
			this.getRouter().getRoute("details").attachPatternMatched(this._onObjectMatched, this);
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass()).addStyleClass("sapUiSizeCompact");
		},

		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function() {
			// Otherwise we go backwards with a forward history
			var bReplace = true;
			this.getRouter().navTo("tests", {}, bReplace);
		},

		onRefresh : function( ) {
			//var	oViewModel = this.getModel("testDetails");
			//var testId = oViewModel.getProperty("/testId");
			//this._Models.loadTestDetailsModel(this.getModel("srf"), { "id" : testId});
			//this._loadAllRunningModels().done();
			this._onBindingChange();
		},
		
		onMenuItemPress: function(oEvent) {

			if(oEvent.getParameter("item").getMetadata().getName() === "sap.ui.unified.MenuTextFieldItem") {
				//this.trace("'" + oEvent.getParameter("item").getValue() + "' entered");
			}
			else {
				//this.trace("'" + oEvent.getParameter("item").getText() + "' pressed");
			}
			if (  oEvent.getParameter("item").getText() === this.getResourceBundle().getText("leanFTTemplate") ){
				return this.onNewScript(oEvent);
			}
			else {
				return this.onRecordNewScript(oEvent);
			}				
		},
		
		onRecordNewScript: function() {
			var that = this,
				oViewModel = this.getModel("testDetails"),
			 	testName = oViewModel.getProperty("/newTestName"),
			 	testId = oViewModel.getProperty("/testId");
			
			// // TODO: meanwhile we have a limitation for not "web" tests recording
			// if ( platform !== this.getResourceBundle().getText("webPlatf")) {
			// 	return Q();
			// }
			//this.trace(this.getResourceBundle().getText("scriptRecordingMsg", [testName]), this.context(), "log");
			return this._recordTest(testId)
				.then(function () {
					that.trace( that.getResourceBundle().getText("sriptRecordSuccessMsg", [testName]), "log");
					// refresh model and ui
					return that._addParamater({ "id" : testId});
				}).catch( function ( error) {
					that.trace( that.getResourceBundle().getText("scriptRecordFailureMsg", [testName, (error && error.message)]), "error");
					that.liteNotification( that.getResourceBundle().getText("scriptRecordFailureMsg", [testName, (error && error.message)]), "error");
				}).finally( function( ) {

					oViewModel.refresh(); 
					that._oScriptsList.getBinding("items").refresh();
				});
		},
		
		// adds to asset URL parameter with default value = just recorded app URL
		_addParamater: function( oParams ) {
			var oView = this.getView("details");
			var oObject = oView.getBindingContext().getObject();
			var	sTestId =  oObject ? oObject.id : ( oParams ? oParams.id : "");
			var oViewModel = this.getModel("testDetails");
			var	sAutUrl = oViewModel.getProperty("/appUrl");
			var aPrevAssets = oViewModel.getProperty("/assets");
			var that = this;
			return this._Models.loadTestDetailsModelSync( this.getModel("srf"), {"id" : sTestId}, false)
			.then( function( oTestDetails) {
				var aScripts = oTestDetails.getProperty("/test/scripts");
				var aNewAssets = oTestDetails.getProperty("/assets");
				oViewModel.setProperty("/test", oTestDetails.getProperty("/test"));
				oViewModel.setProperty("/assets", aNewAssets);
				oViewModel.setProperty("/testRuns", oTestDetails.getProperty("/testRuns"));
				models.extendScriptsFromAssets( aScripts, aNewAssets, false);  // updates aScripts
				oViewModel.setProperty("/scripts", aScripts);
				var oScript = that._findNewScriptId(aPrevAssets, aNewAssets);
				return that._addUrlParameterToScript(oScript, sAutUrl);
			})
			.then( function() {
				return that._Models.loadTestDetailsModelSync( that.getModel("srf"), {"id" : sTestId}, false);
			})
			.then( function( oTestDetails) {
				var aScripts = oTestDetails.getProperty("/test/scripts");
				var aNewAssets = oTestDetails.getProperty("/assets");
				oViewModel.setProperty("/test", oTestDetails.getProperty("/test"));
				oViewModel.setProperty("/assets", aNewAssets);
				oViewModel.setProperty("/testRuns", oTestDetails.getProperty("/testRuns"));
				models.extendScriptsFromAssets( aScripts, aNewAssets, false);  // updates aScripts
				oViewModel.setProperty("/scripts", aScripts);
			});
			
		},
		
		_addUrlParameterToScript: function( oAsset, sAutUrl) {
			if ( !oAsset || Object.keys(oAsset).length === 0 || !oAsset.id) {
				return Q();
			}

			var params = oAsset.parameters || [];
			params.push({ name: this.getResourceBundle().getText("appUrlParameterName") || "APP_URL", defaultValue: sAutUrl, assetId: oAsset.id });
			oAsset.parameters = params;
			return this._Models.updateScript(this.getModel("srf"), oAsset);
		},
		
		_findNewScriptId: function( aOldAssets, aNewAssets) {
			var oAsset = {};
			if (!aNewAssets) {
				return {};
			}
			if ( !aOldAssets ) {
				if ( aNewAssets && aNewAssets.length > 0) {
					return aNewAssets[0];
				}
				return {};
			}
			var prevLen = aOldAssets.length;
			var newLen = aNewAssets.length;
			var isNew = true;
			if ( newLen === prevLen + 1) {
				for (var i = 0; i < newLen; i++) {
					oAsset = aNewAssets[i];
					isNew = true;
					for ( var j = 0; j < prevLen; j++) {
						if (oAsset.physicalFileName === aOldAssets[j].physicalFileName) {
							isNew = false;
							break;
						}	
					}
					if ( isNew === true) {
						return oAsset;
					}
				}
				return {};
			}
			else {
				return {};
			}
		},
			
		onDeleteTest: function() {
			var	oViewModel = this.getModel("testDetails"),
				sTestId = oViewModel.getProperty("/testId"),
				sTestName = oViewModel.getProperty("/newTestName"),
 				sTestOwner = oViewModel.getProperty("/owner/id"),
 				theView = this.getView();
			
 			theView.setBusy( true);

			return this._deleteTest(sTestId, sTestName, sTestOwner)
			.finally( function() {
				theView.setBusy( false);
			});
		},

		onPageSelected: function(oEvent) {
			var targetPage = oEvent.getParameter("targetPage");
			this.getModel("testDetails").setProperty("/pageNumber", targetPage || 1 );
			return this._updateModel();
		},

		
		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 * sSelectedTabKey - backdoor to auto-select tab
		 */
		_bindView: function(sObjectPath, oParams) {
			this.getView("details").bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this, oParams)
				}
			});
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
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").testId;
			this._bindView("/tests/" + sObjectId + "/");
		},

		_onBindingChange: function( oParams) {
			var oView = this.getView("details"),
				oAuxModel = this.getModel("srf"),
				oViewModel = this.getModel("testDetails"),
				oScriptsList = this._oScriptsList,
				oElementBinding = oView.getElementBinding(),
				sPlatformRecord = this.getResourceBundle().getText("webPlatf");

			// No data for the binding
			if (!oElementBinding.getBoundContext() || !this.common()) {
				this.getRouter().navTo("tests", {}, true);
				return;
			}

			var oObject = oView.getBindingContext().getObject();
			var	sCreationDate = oObject ? oObject.creationDate : "",
				sTestId =  oObject ? oObject.id : null,
				sTestOwner =  oObject ? oObject.owner : "",
				oController = this;

			this._cleanRunTable(oViewModel);
			this._cleanStepsList(oViewModel);	
			this._cleanSelectedBrowsers();

			if( sTestId ) {
				this.getView().setBusy(true);
				
				this.common().getSrfTenant().then( function (sTenant) {
					return oController.common().addTenantToUrl( "", sTenant);
				}).then( function(sUrlTenant) {
					oController._sTenantId = sUrlTenant;
				});
				
				var oTestDetailsModel = models.loadTestDetailsModel(oAuxModel, { "id" : sTestId}, false);
				oTestDetailsModel.detachRequestCompleted(this.requestCompletedHandler);
	
				this.requestCompletedHandler = function() {
					var oScripts = this.getProperty("/test/scripts"),
						oAssets = this.getProperty("/assets"),
						oTestRuns = Utils.Array.sortByDateDesc(this.getProperty("/testRuns"), "start"),
						oEnv = this.getProperty("/test/environments") || [];
					
					oViewModel.setProperty("/assets", oAssets);
					models.extendScriptsFromAssets( oScripts, oAssets, false);
				
					oViewModel.setProperty("/scripts", oScripts); 
					oScriptsList.getBinding("items").refresh();
					
					oViewModel.setProperty("/testruns", oTestRuns); 
					oController._loadLastRunData(oTestRuns, oViewModel);
					
					oController._setSelectedTabBarKey(oParams);
					
					oViewModel.setProperty("/testId", sTestId);
					oViewModel.setProperty("/testOwner", sTestOwner);
					oViewModel.setProperty("/creationDate", sCreationDate);
					
					oViewModel.setProperty("/test", this.getProperty("/test") || {});
					oViewModel.setProperty("/subType",  this.getProperty("/test/subType") || "");
					oViewModel.setProperty("/environments", oEnv);
					oViewModel.setProperty("/newTestName", this.getProperty("/test/name") || "");
					oViewModel.setProperty("/name",  this.getProperty("/test/name") || "");
					oViewModel.setProperty("/prevTestName", this.getProperty("/test/name") || "");
					oViewModel.setProperty("/desc",  this.getProperty("/test/description") || "");
					oViewModel.setProperty("/description",  this.getProperty("/test/description") ||  "");
					oViewModel.setProperty("/platform",  this.getProperty("/test/type") || this.getProperty("/test/platform") || "");
					oViewModel.setProperty("/tags", this.getProperty("/test/tags"));
					oViewModel.setProperty("/owner", this.getProperty("/test/owner") || {id: "", name:""});
					oViewModel.setProperty("/author",  this.getProperty("/test/author") || {id: "", name:""});
					oViewModel.setProperty("/consistencyStamp",  this.getProperty("/test/consistencyStamp") || "");
	
					oViewModel.setProperty("/newTestNameError", "");
					oViewModel.setProperty("/newTestNameErrorShow", false);
					oViewModel.setProperty("/prefix", "existingTest");
			
					// TODO: meanwhile we have a limitation for not "web" tests recording
					var platform =  oViewModel.getProperty("/platform") ||  oViewModel.getProperty("/test/type");
					oViewModel.setProperty("/menuItemRecordEnabled", (platform === sPlatformRecord));
						
					// TODO: Maya, MC Lab commented
					oController.loadNewLab(oViewModel);

					oController.onBindingChange();
				};
				
				oTestDetailsModel.attachRequestCompleted(this.requestCompletedHandler);
			}
		},
	
		_loadLastRunData: function(oRuns, oViewModel) {
			this._cleanRunTable(oViewModel);
			
			if(oRuns && oRuns.length > 0) {
				this._loadRunData(oRuns[0].id, oViewModel);
			}
		},
		
		_setSelectedTabBarKey: function( oParams) {
			var sKey = (oParams && oParams.sScriptsCaption) || this._sSelectedTabKey;
			if ( !sKey) {
				return;
			}
			// reset the new created test tab selection, set by message bus "NewTestCreated" event
			this._sSelectedTabKey = null;
			var _oRunsTabBar = this.byId("srfRunsTabBar");

			var aTabItems = _oRunsTabBar.getItems();
			var sSelectedKey = _oRunsTabBar.getSelectedKey();
				
			$.each( aTabItems, function ( index, value) {
				if ( value.getProperty("text") === sKey)
				{
					sSelectedKey = value.sId;
					_oRunsTabBar.setSelectedKey( sSelectedKey );
					return false;
				}
			});
		},

		loadNewLab: function(oViewModel) {
			var sPackageId = oViewModel.getProperty("/test/packageId");
			if(sPackageId) {
				this._loadEnvFromPackage(sPackageId);
			} else {
				this._loadMCFavorites(this.getModel("mcEnv"));
			}
		}
		
	});

});