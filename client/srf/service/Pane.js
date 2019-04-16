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
		"sap/watt/platform/plugin/platform/service/ui/AbstractPart",
		"sap/watt/platform/plugin/filesystem/document/FileFolderEntity",
		"../utils/common"
	],
	function(AbstractPart, FileFolderEntity, Common) {
		"use strict";

		var Pane = AbstractPart.extend("srf.service.Pane", {
			_oAuxModel: null,
			_oCommon: Common,
			_oUserPreference: {
				_sSrfDestinationName: null
			}, // user preference settings

			set destination(sValue) {
				this._oUserPreference._sSrfDestinationName = sValue;
			},

			get destination() {
				return this._oUserPreference._sSrfDestinationName;
			},

			init: function() {

				Common.log("SRF", this.context.i18n.getText("initializing"), this.context, "log");

				var that = this;
				// pass this service context to common to provide access to plugin services
				Common.context = this.context;
				this._oContainerPromise = Q.spread([this.initDestination(), this.initUser()], 
					function() {

					var oComponent = sap.ui.getCore().createComponent({
						name: "srf",
						id: "srf.Component"
					});

					var oComponentContainer = new sap.ui.core.ComponentContainer("srf-root", {
						component: oComponent,
						height: "100%"
					});

					Common.srfDestinationName = that.destination;
					
					// auxiliary ComponentContainer' model
					// used to pass common data between component views
					// context, selected project name, selected document
					if (!that._oAuxModel) {
						that._oAuxModel = new sap.ui.model.json.JSONModel({
							"srf_common": that._oCommon,
							"srf_context": that.context,							
							"srf_controller": null,
							"srf_destination": that.destination,
							"srf_document": null,
							"srf_FileFolderEntity": FileFolderEntity,
							"srf_newtest": "", // flag used while test creation via right click
							"srf_projectName": "",
							// login state aux properties
							"srf_username" : "",
							"srf_user": that.user,
							"srf_loginFailed" : "",
							"srf_loggedIn" : true,
							"srf_workspace" : "",
							"user" : { "name" : "", "password" : ""}
						});
					} else {
						that._oAuxModel.setProperty("/srf_common", that._oCommon);
						that._oAuxModel.setProperty("/srf_context", that.context);
						that._oAuxModel.setProperty("/srf_destination", that.destination);
						that._oAuxModel.setProperty("/srf_FileFolderEntity", FileFolderEntity);
						// login state aux properties
						that._oAuxModel.setProperty("/srf_username", "");
						that._oAuxModel.setProperty("/srf_user", that.user);
						that._oAuxModel.setProperty("/srf_loginFailed", "");
						that._oAuxModel.setProperty("/srf_loggedIn", true);
						that._oAuxModel.setProperty("/user/name", "");
						that._oAuxModel.setProperty("/user/password", "");
						//that._oAuxModel.setProperty("/srf_newtest", "");
					}
					oComponent.setModel(that._oAuxModel, "srf");

					// running/pending/finished tests models to be visible for all controllers
					oComponent.setModel(new sap.ui.model.json.JSONModel({
						total: 0,
						aData: [],
						pageNumber: 0, // no paginator
						pageSize: 100,
						sortBy: "start",
						orderBy: "desc"
					}), "runningTests");
					oComponent.setModel(new sap.ui.model.json.JSONModel({
						total: 0,
						aData: [],
						pageNumber: 0, // no paginator
						pageSize: 100,
						sortBy: "start",
						orderBy: "desc"
					}), "pendingTests");
					oComponent.setModel(new sap.ui.model.json.JSONModel({
						pageNumber: 0, // no paginator
						pageSize: 100,
						sortBy: "start",
						orderBy: "desc",
						total: 0,
						aData: [],
						today: [],
						yesterday: [],
						older: []
					}), "finishedTests");

					oComponentContainer.setPropagateModel(true);

					return oComponentContainer;
				});
			},

			onSrfPreferencesChanged: function(oUserPreferences) {
				Common.log("SRF", this.context.i18n.getText("initializeDestinationDone", [oUserPreferences.name]), this.context, "log");
				if (this._oAuxModel) {
					this._oAuxModel.setProperty("/srf_destination", oUserPreferences.name);
					this._oAuxModel.getProperty("/srf_common").srfDestinationName = oUserPreferences.name;
					this._oAuxModel.setProperty("/srf_loggedIn",  this._oAuxModel.getProperty("/srf_common").getSrfToken() !== "");
					this._oAuxModel.setProperty("/srf_loginFailed", "");
				}
				// propagate the data to controllers
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.publish("SRF_Channel", "UserPreferenceChanged", {
					_sSrfDestinationName: oUserPreferences.name
				});
			},

			initDestination: function() {
				var that = this;
				Common.log("SRF", this.context.i18n.getText("initializingDestination"), this.context, "log");

				return Common.fetchSrfDestinationName(this.context)
					.then(function(sSelectedDestination) {
						that.destination = sSelectedDestination;
						Common.log("SRF", that.context.i18n.getText("initializeDestinationDone", [that.destination]), that.context, "log");
					})
					.fail(function(error) {
						Common.log("SRF", that.context.i18n.getText("initializeDestinationFailed", [(error && error.message)]), that.context, "error");
						that.destination = Common.srfDestinationName;
						Common.log("SRF", that.context.i18n.getText("initializeDestinationDone", [that.destination]), that.context, "log");
					})
					.finally(function() {
						return that.destination;
					});
			},			
			
			initUser: function() {
				var that = this;
				Common.log("SRF", this.context.i18n.getText("initializingDestination"), this.context, "log");

				return Common.getUserPreferences(this.context, "srf_user")
					.then(function(oUser) {
						that.user = oUser;
						Common.log("SRF", that.context.i18n.getText("last user", [that.user]), that.context, "log");
					})
					.fail(function(error) {
						Common.log("SRF", that.context.i18n.getText("get last user failed", [(error && error.message)]), that.context, "error");
						that.user = {};
						Common.log("SRF", that.context.i18n.getText("getLastUser done", [that.destination]), that.context, "log");
					})
					.finally(function() {
						return that.user;
					});
			},

			// use auxiliary model to pass the "new test" event and not message bus
			// when routing to "tests" target ->TestView.controller.js onAfterRendering
			// API method called for the new test creation on right click
			navigateTo: function(oTarget) {
				var sTarget = oTarget.target || "details";
				var sReason = oTarget.reason || "newtest";
				var sType = oTarget.type || this.context.i18n.getText("webPlatf");
				if (this._oAuxModel && sReason === "newtest") {
					this._oAuxModel.setProperty("/srf_newtest", sTarget);
					// publish new test creation event for subscribers
					var oEventBus = sap.ui.getCore().getEventBus();
					oEventBus.publish("SRF_Channel", "NavigateTo", {
						target: sTarget,
						reason: sReason,
						type: sType
					});
				}
			},
			isLoggedIn: function() {
				return this._oAuxModel ? this._oAuxModel.getProperty("/srf_loggedIn") : false;
			},
			
			configure: function(mConfig) {
				// include style sheet resources
				this.context.service.resource.includeStyles(mConfig.styles).done();
			},

			getContent: function() {
				return this._oContainerPromise;
			},

			// called on any selection changed due to "selection:changed" subscription
			onSelectionChanged: function(oEvent) {
				if (oEvent.params.owner && oEvent.params.owner._sName === "repositorybrowser") {
					var oSelectionArr = oEvent.params.selection;
					var oDocument = null;
					if ($.isArray(oSelectionArr) && oSelectionArr.length) {
						oDocument = oSelectionArr[0].document ? oSelectionArr[0].document : oSelectionArr[0];
					}
					if ( oDocument) {
						this._setSelectedProject(oDocument).done();
					}
				}
			},

			// called on any document saved event due to subscription "document:saved": ["rightpane:onDocumentSaved"]
			onDocumentSaved: function(oEvent) {
				var oSavedDocument = oEvent.params.document,
					extInfo = oSavedDocument.getExtInfo(),
					srfExtInfo = extInfo ? extInfo.srfScriptFileExtInfo : null;
				if (srfExtInfo && srfExtInfo.newFileScript) {
					// update ui
					// publish new script creation event for subscribers and pass script id and test id to be linked
					var oEventBus = sap.ui.getCore().getEventBus();
					oEventBus.publish("SRF_Channel", "NewScriptCreated", {
						testId: srfExtInfo.testId,
						oScript: srfExtInfo.oScript
					});
					srfExtInfo.newFileScript = false;
				}
			},

			// returns true, if project changed
			// false otherwise
			_setSelectedProject: function(oDocument) {
				var that = this;
				var sProjectName = "";
				var rc = false;
				var model = that._oAuxModel;
				if (!oDocument) {
					return Q();
				}
				// if opened script file - Micro Focus DAO 
				if (oDocument && oDocument.getExtInfo() && oDocument.getExtInfo().origin === "HPE") {
					return Q();
				}

				// update common._oSelectedDocument with the selected document info
				// used while new test creation
				Common.setSelectedDocument(oDocument);
				// update Aux model - selected document MUST be updated in the aux_model!
				if (! model) {
					that._oAuxModel = new sap.ui.model.json.JSONModel({
						"srf_common": that._oCommon,
						"srf_context": that.context,
						"srf_destination": that.destination,
						"srf_document": null,
						"srf_FileFolderEntity": FileFolderEntity,
						"srf_newtest": "", // flag used while test creation via right click
						"srf_projectName": "",
						"srf_controller": null,
						// login state aux properties
						"srf_username" : "",
						"srf_loginFailed" : "",
						"srf_loggedIn" : ( Common.getSrfToken() !== ""),
						"user" : { "name" : "", "password" : ""}
					});
					model = that._oAuxModel;
				}
				model.setProperty("/srf_document", oDocument);
				return Common.getAUTData(that.context, oDocument).then(function(autData) {
					sProjectName = autData.projectName;

					if (model && sProjectName !== "") {
						var tmp = model.getProperty("/srf_projectName");
						rc = !(tmp === sProjectName);
						if (rc) {
							Common.log("SRF", that.context.i18n.getText("selectedProjectName", [sProjectName]), that.context, "log");
						}
					}
					if (rc === true && sProjectName) {
						// update Aux model
						model.setProperty("/srf_projectName", sProjectName);
						// inform subscribers
						var oEventBus = sap.ui.getCore().getEventBus();
						oEventBus.publish("SRF_Channel", "ProjectChanged", {
							project: sProjectName
						});
					}
				});
			}
		});

		return Pane;
	});