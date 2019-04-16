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
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";
	
	return {

		_oTestsModel: null, // {tests:[], totalItemsCount:0}
		//  http://52.35.30.139:8080/rest/test-manager/tests/4474338a-47dd-46ae-b113-b886e3c44582?include=resource,test-run
		_oAssetsModel: null,		//  /rest/storage/assets
		_oEnvironmentsModel: null,	//  /rest/browser-lab/environments
		_oTestRunsModel: null,		//  /test-runs?test-id=  /test-runs/539a1ce0-f21d-4296-9089-fab570ee32fc
		_oTestRuns: null,			//	by test id: /rest/test-manager/test-runs?include=&test-id=fa3a1430-df42-44a4-81c6-886db7595767&order=desc&page=0&size=100&sortby=start
		_oTestDetailsModel: null,	//  /rest/test-manager/tests/4474338a-47dd-46ae-b113-b886e3c44582?include=resource,test-run
		_oRunningModel: null,		//  /rest/test-manager/test-runs - filter out ALL RUNNING runs in SRF
		_oSettingsModel: null,
		
		// SRF destinations:
		_sSrfDestinationName: null,
		
		get srfReplaySettings() { 
			return "srf.user.assets.replay.configuration."; 
		},
		get srfRecordSettings() { 
			return "srf.user.assets.record.configuration."; 
		},
		get srfUserSettings() { 
			return "srf.user.sap."; 
		},
		get srfOctaneUserNameKey() {
			return "srf.user.octane.username";
		},
		get srfOctaneServerUrlKey() {
			return "srf.tenant.octane.server.url";
		},
		get srfOctaneSharedSpaceIdKey() {
			return "srf.tenant.octane.shared.space.id";
		},
		get srfOctaneWorkSpaceIdKey() {
			return "srf.tenant.octane.work.space.id";
		},
		
		get srfDestinationName() {

			return this._sSrfDestinationName || "";
		},

		set srfDestinationName(sValue) {
			this._sSrfDestinationName = sValue || this.srfDestinationName;
		},

		get srfDestination() {
			return "/destinations/" + this.srfDestinationName;
		},

		get _urlTestsManager() {
			return this.srfDestination + "/rest/test-manager";	
		},
		get _urlAssets() {
			return this.srfDestination + "/rest/test-manager";
		},
		get _urlStorage() {
			return this.srfDestination + "/rest/storage"; 
		},
		get _urlSecurity() {
			return this.srfDestination + "/rest/security";		
		},
		get _urlEnvironmentsLabs() {
			return this.srfDestination + "/rest/browser-lab";		
		},
		get _urlDevices() {
			return this.srfDestination + "/rest";
		},
	
		get _urlMCEnvironments() {
			return this.srfDestination + "/rest/mobile-center";		
		},
		
		get _urlEnvironmentsLabsBeta() {
			return "/destinations/BETA_LABS/" + "content-latest.json";		
		},

		get _urlEnvironmentsLabsMC() {
			return "/destinations/BETA_LABS_GREEN"; 
		},

		get _urlRunManager() {
			return this.srfDestination + "/rest/jobmanager";
		},

		get _urlConfigurationSettings() {
			return this.srfDestination + "/rest/configuration";
		},

		fetchRecordSettings: function(oAuxModel, sPlatform) {
			var sSettingsKey = this.srfRecordSettings + (sPlatform || "web");
			return this._loadSettings(oAuxModel, sSettingsKey)
				.then( function( oModel) {
					return oModel.getProperty("/")[sSettingsKey] ? oModel.getProperty("/")[sSettingsKey] : [];
				})
				.catch( function( err) {
					window.console.error( err);
					return {};
				});
		},

		fetchReplaySettings: function(oAuxModel, sPlatform) {
			var sSettingsKey = this.srfReplaySettings + (sPlatform || "web");
			return this._loadSettings(oAuxModel, sSettingsKey)
				.then( function( oModel) {
					return oModel.getProperty("/")[sSettingsKey].environments[0];
				})
				.catch( function( err) {
					window.console.error( err);
					return {};
				});
		},
		
		saveSettings: function(oAuxModel, sKey, oValue, bDefaultWorkspace) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var oCommon = oAuxModel.getProperty("/srf_common"),
				oContext = oAuxModel.getProperty("/srf_context"),
				sUrl = this._urlConfigurationSettings + (bDefaultWorkspace ? "/v2/user/settings" : this._getWorkspacePart(oAuxModel) + "/settings" ),
				body = { settingsPairs : {}, tenantDefault : false };
				
			body.settingsPairs[this.srfUserSettings + sKey] = oValue;
//			this._deleteSettings(oCommon, oContext, sUrl, body);
			this._saveSettings(oCommon, oContext, sUrl, body);
		},
		
		_saveSettings: function(oCommon, oContext, sUrl, body) {
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				if (oContext) {
					oCommon.log("SRF", sUrlTenant, oContext, "info");
				}
				return Q.sap.ajax( sUrlTenant, {
					type: "POST",
					data: JSON.stringify(body),
					contentType: "application/json",
					dataType: "json"
				}).then( function( oResponse) {
					if ( oResponse && oResponse.length) {
						return oResponse[0];
					}
					return {};
				});
			});
		},
		
		_deleteSettings: function(oCommon, oContext, sUrl, body) {
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				if (oContext) {
					oCommon.log("SRF", sUrlTenant, oContext, "info");
				}
				return Q.sap.ajax( sUrlTenant, {
					type: "DELETE",
					data: JSON.stringify(body),
					contentType: "application/json",
					dataType: "json"
				}).then( function( oResponse) {
					if ( oResponse && oResponse.length) {
						return oResponse[0];
					}
					return {};
				});
			});
		},
		
		fetchSettings: function(oAuxModel, sKey, bDefaultWorkspace) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sSettingsKey = this.srfUserSettings + sKey;
			return this._loadSettings(oAuxModel, sSettingsKey, false, bDefaultWorkspace)
				.then( function(oModel) {
					return oModel.getProperty("/")[sSettingsKey];
				})
				.catch( function(err) {
					window.console.error( err);
					return Q.reject(err);
				});
		},
		
		_loadSettings: function( oAuxModel, sSettingsKey, bTenantDefault, bDefaultWorkspace) {
			var that = this;
			
			if (!this._oSettingsModel) {
				this._oSettingsModel = new JSONModel();
			}
		
			return this._fetchSettings(oAuxModel, sSettingsKey, bTenantDefault, bDefaultWorkspace)
			.then(function( oData) {
				that._oSettingsModel.setProperty("/"+ sSettingsKey, oData[sSettingsKey]);
				return that._oSettingsModel;
			})
			.catch( function(error) {
				return that.srfFailureHandler(error, oAuxModel).then(function() {
					return Q.reject(error);
				});
			});	
		},
	
		// fetch configuration settings
		_fetchSettings: function(oAuxModel, sSettingsKey, bTenantDefault, bDefaultWorkspace) {
			var sUrl = this._urlConfigurationSettings + 
						(bDefaultWorkspace ? "/v2/user/settings" : this._getWorkspacePart(oAuxModel) + "/settings") + 
						"?settingsKey=" +
						sSettingsKey + "&tenantDefault=" + (bTenantDefault || "false"),
				oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
						}
					}).then( function( oResponse) {
						if ( oResponse && oResponse.length) {
							if (oAuxModel && oAuxModel.getProperty("/srf_context")) {
								oCommon.log("SRF", JSON.stringify(oResponse[0]), oAuxModel.getProperty("/srf_context"), "info");
							}
							return oResponse[0];
						}
						return {};
					});
			});
		},	
		
		saveRecordSettings: function( oAuxModel, oEnvironments, sPlatform) {
			if (!this._oSettingsModel) {
				this._oSettingsModel = new JSONModel();
			}
			var that = this;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sSettingsKey = this.srfRecordSettings + sPlatform || "web";
			
			return this._saveRecordSettings(oAuxModel, sPlatform || "web", oEnvironments)
			.then(function(oData) {
				if (!$.isEmptyObject(oData)) {
					that._oSettingsModel.setData(oData);
				}

				if ( sPlatform === "web" ) {
					if(that._oSettingsModel.getProperty("/")[sSettingsKey].mobileCapabilities && that._oSettingsModel.getProperty("/")[sSettingsKey].mobileCapabilities[0]) {		
						return that._oSettingsModel.getProperty("/")[sSettingsKey];
					} else {
						return that._oSettingsModel.getProperty("/")[sSettingsKey].environments[0];
					}
				} else {
					return that._oSettingsModel.getProperty("/")[sSettingsKey];
				}
			})
			.catch( function( err) {
				window.console.log( err);
				return {};
			});			
		},
		
		// save configuration settings
		_saveRecordSettings: function(oAuxModel, sPlatform, oEnvironments) {
			if (!oAuxModel) {
				return Q();
			}
			var sUrl = this._urlConfigurationSettings + this._getWorkspacePart(oAuxModel) + "/settings";
			
			var oCommon = oAuxModel.getProperty("/srf_common");
			var body = "";
			if ( sPlatform === "web" ) {
				var settingsEnv = this._convertEnvironments(oEnvironments, sPlatform);
				body = JSON.stringify({
					settingsPairs : {
						 "srf.user.assets.record.configuration.web" : settingsEnv
					},
					tenantDefault : false
				});
			} 
			else {
				body = JSON.stringify({
					settingsPairs : {
						 "srf.user.assets.record.configuration.mobile" : oEnvironments
					},
					tenantDefault : false
				});
			}
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				if ( oAuxModel.getProperty("/srf_context")) {
					oCommon.log("SRF", sUrlTenant, oAuxModel.getProperty("/srf_context"), "info");
				}
				return Q.sap.ajax( sUrlTenant, {
					type: "POST",
					data: body,
					contentType: "application/json",
					dataType: "json"
				}).then( function( oResponse) {
					if ( oResponse && oResponse.length) {
						return oResponse[0];
					}
					return {};
				});
			});
		},	

		_convertEnvironments: function( aEnvironments, sPlatform) {
			var oRet ={
					  "environments": [],
					  "mobileCapabilities": [],
					  "mobileApps": [],
					  "runContext": {}
					};
					
			if(aEnvironments.mobileCapabilities && aEnvironments.mobileCapabilities.length > 0) {
				oRet.mobileCapabilities = aEnvironments.mobileCapabilities;
				oRet.runContext = { "install": false,
									"uninstall": false,
									"restart": false,
									"launchOnStart": {  "mobileApp": {
																"id": "MC.Browser",
																"name": "Browser",
																"version": null,
																"counter": 1,
																"dateTime": 1502280807755,
																"icon": null,
																"type": "ANY",
																"fileName": null,
																"identifier": "MC.Browser",
																"comment": null,
																"deviceFamily": "phone,tablet",
																"minimumOsVersion": null,
																"instrumented": false,
																"urlScheme": null,
																"source": "System",
																"launchActivity": null,
																"appPackage": null,
																"appActivity": null,
																"bundleId": null,
																"appUdid": "MC.Browser",
																"provisionedDevices": null,
																"appBuildVersion": null,
																"appVersion": null,
																"applicationExist": false,
																"instrumentedApplicationExist": false
															}
													} 
								};
			} else {
				if(aEnvironments.length > 0) {
					$.each(aEnvironments, function( i, env) {
						oRet.environments.push({});
						oRet.environments[i].type = sPlatform;
						oRet.environments[i].os = {};
						oRet.environments[i].os.description = env.os.description;
						oRet.environments[i].os.name = env.os.name;
						oRet.environments[i].os.order = env.os.order;
						oRet.environments[i].os.type = env.os.type;
						oRet.environments[i].os.version = env.os.version;	

						oRet.environments[i].resolution = env.resolution || "1024x768";

						oRet.environments[i].browser = {};
						oRet.environments[i].browser.description = env.browser.description;
						oRet.environments[i].browser.name = env.browser.name;
						oRet.environments[i].browser.version = env.browser.version;
					});		
				}
			}

			return oRet;
		},
		
		loadProfile: function(oAuxModel) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			var sUrl = this._urlSecurity + "/profile",
				oCommon = oAuxModel.getProperty("/srf_common"),
				that = this;

			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
						}
					})
					.then(function(oResponse) {
						return oResponse[0];
					}).catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return Q.reject();
						});
					});
			});
		},

		/* 
		oParams = oAuxModel 
					"projectName": oParams.getProperty("/srf_projectName"),
					"common":	 oParams.getProperty("/srf_common")
			
		*/
		loadTestsModel: function(oParams) {
			if(oParams) {
				this.srfDestinationName = oParams.getProperty("/srf_destination");
			}
			var that = this;
			if ( !this._loadTestsModelFailed) {
				this._loadTestsModelFailed = function(oEvent) {
					var statusCode =  oEvent.getParameter("statusCode") ;
					var error = oEvent.getParameter("statusText");	

					if (statusCode === 401 || error === "Unauthorized") {
						if ( oParams) {
							var sAutologonMsg = oParams.getProperty("/srf_context").i18n.getText("autologon", [oParams.getProperty("/srf_destination")]);
							oParams.getProperty("/srf_common").log("SRF", sAutologonMsg, oParams.getProperty("/srf_context"), "warning");						
						}
						that.srfFailureHandler({statusCode: statusCode, statusText: error}, oParams).done();
					}	
					else {
						that._oTestsModel.setProperty("/tests", []);			
						if ( oParams) {
							var sMsg = oParams.getProperty("/srf_context").i18n.getText("fetchDataFailed", [oParams.getProperty("/srf_destination"), statusCode, error]);
							oParams.getProperty("/srf_common").notification("SRF", 
								sMsg + " " + statusCode + " : " + error, 
								oParams.getProperty("/srf_context"), 
								"failure");
							oParams.getProperty("/srf_common").log("SRF", 
								sMsg + " " + statusCode + " : " + error, 
								oParams.getProperty("/srf_context"), 
								"failure");
						}				
					}
				};
			}
			
			if (!this._oTestsModel) {
				this._oTestsModel = new JSONModel();
				this._oTestsModel.detachRequestFailed(this._loadTestsModelFailed);
				this._oTestsModel.attachRequestFailed(this._loadTestsModelFailed);
			}

			this._fetchTests(oParams);
			return this._oTestsModel;
		},

		loadTestsModelSync: function(oAuxModel, oPagingParams) {
			var that = this;
			if (!this._fetchTestsSync) {
				return Q();
			}
			
			if (!this._oTestsModel) {
				this._oTestsModel = new JSONModel();
			}
			
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			return this._fetchTestsSync(oAuxModel, oPagingParams)
			.then(function( oTestsData) {

				that._oTestsModel.setData(oTestsData);
				return that._oTestsModel;
			})
			.catch( function(error) {
				that._oTestsModel.setData( {"tests": [], "totalItemsCount": 0});
				return that.srfFailureHandler(error, oAuxModel).then(function() {
					return that._oTestsModel;
				});
			});	
		},


		loadAssetsModel: function(oAuxModel, oFetchParams) {

			if (!this._oAssetsModel) {
				this._oAssetsModel = new JSONModel();
			}
			
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			var that = this;
			return this._fetchAssets(oAuxModel, oFetchParams)
			.then(function( oTestsData) {

				that._oAssetsModel.setData(oTestsData);
				return that._oAssetsModel;
			})
			.catch( function(error) {
				that._oAssetsModel.setData( {"assets": [], "totalItemsCount": 0, "pageNumber": 0});
				return that.srfFailureHandler(error, oAuxModel).then(function() {
					return that._oAssetsModel;
				});
			});	
		},

		loadScriptLog: function(oParams, sLogId) {
			if (!this._oLogModel) {
				this._oLogModel = new JSONModel();
			}
			if ( oParams) {
				this.srfDestinationName = oParams.getProperty("/srf_destination");
			}
			this._fetchScriptLog(oParams, sLogId);
			return this._oLogModel;
		},
		
		loadTagsModel: function(oParams) {

			if (!this._oTagsModel) {
				this._oTagsModel = new JSONModel();
			}
			if ( oParams) {
				this.srfDestinationName = oParams.getProperty("/srf_destination");
			}
			this._fetchTags(oParams);
			return this._oTagsModel;
		},

		loadEnvironmentsModel: function(oAuxModel, oParams) {
			if (!this._oEnvironmentsModel) {
				this._oEnvironmentsModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			this._fetchEnvironments(oAuxModel, oParams);
			return this._oEnvironmentsModel;
		},		
		
		loadEnvFromPackage: function(oAuxModel, sPackageId) {
			if (!this._oMCPackageModel) {
				this._oMCPackageModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			this._fetchPackageEnvironments(oAuxModel, sPackageId);
			return this._oMCPackageModel;
		},
		
		loadMCFavorites: function(oAuxModel) {
			if (!this._oMCFavoritesModel) {
				this._oMCFavoritesModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			this._fetchMCFavoritesModel(oAuxModel);
			return this._oMCFavoritesModel;
		},
		
		loadMCDevices: function(oAuxModel) {
			if (!this._oMCDevicesModel) {
				this._oMCDevicesModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			this._fetchMCDevicesModel(oAuxModel);
			return this._oMCDevicesModel;
		},
		
		loadMCApplications: function(oAuxModel) {
			if (!this._oMCAppModel) {
				this._oMCAppModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			this._fetchMCAppModel(oAuxModel);
			return this._oMCAppModel;
		},
		
		
		// {
		// 	var sUrl = this._urlMCEnvironments + "/rest/apps/getAplicationsLastVersion",
		// 		that = this;
				
		// 	if (oAuxModel) {
		// 		return Q.sap.ajax({
		// 			url: sUrl,
		// 			type: "GET",
		// 			responseType: "application/json",
		// 			xhrFields: {
		// 				withCredentials: false
		// 				}
		// 			})
		// 			.then(function(oResponse) {
		// 				return oResponse[0];
		// 			}).catch(function(err) {
		// 				return that.srfFailureHandler(err, oAuxModel).then(function() {
		// 					return Q.resolve({data:[], error:true});
		// 				});
		// 			});
			
		// 	} else {
		// 		window.console.error("models.loadMCApplications");
		// 		return Q.resolve({data:[], error:true});
		// 	}
		// },
		
		loadEnvironmentsModelBeta: function( oAuxModel) {
			if (!this._oMCEnvironmentsModel) {
				this._oMCEnvironmentsModel = new JSONModel();
			}

			this._fetchEnvironmentsBeta( oAuxModel);
			return this._oMCEnvironmentsModel;
		},
		
		loadTestRunsModel: function(oAuxModel, oParams) {
			if (!this._oTestRunsModel) {
				this._oTestRunsModel = new JSONModel();
			}

			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var that = this;
			return this._fetchTestRuns(oAuxModel, oParams)
			.then( function( aRun) {
				if ( aRun && aRun.length) {
					that._oTestRunsModel.setData({runData: aRun[0]});
				}
				else {
					//TODO set empty model
					that._oTestRunsModel.setData({runData: {}});
				}
				return that._oTestRunsModel;
			});
		},

		loadRunningModel: function(oParams, oFetchParamsModel) {
			var mEmpty = {
				total: 0,
				aData: [],
				pageNumber:  0,
				pageSize: 100,
				sortBy: "start",
				orderBy: "desc"
			};
			if ( oFetchParamsModel ) {
				mEmpty.pageNumber = oFetchParamsModel.getProperty("/pageNumber");
				mEmpty.pageSize = oFetchParamsModel.getProperty("/pageSize");
			 	mEmpty.sortBy = oFetchParamsModel.getProperty("/sortBy");
			 	mEmpty.orderBy = oFetchParamsModel.getProperty("/orderBy");
			}

			if (!this._oRunningModel) {
				this._oRunningModel = new JSONModel(mEmpty);
			} else {
				this._oRunningModel.setData(mEmpty);
			}
			return this._fetchRuns( oParams, "running", this._oRunningModel);
		},
		
		loadPendingModel: function(oParams, oFetchParamsModel) {
			var mEmpty = {
				total: 0,
				aData: [],
				pageNumber:  0,
				pageSize: 100,
				sortBy: "start",
				orderBy: "desc"
			};
			if ( oFetchParamsModel ) {
				mEmpty.pageNumber = oFetchParamsModel.getProperty("/pageNumber");
				mEmpty.pageSize = oFetchParamsModel.getProperty("/pageSize");
			 	mEmpty.sortBy = oFetchParamsModel.getProperty("/sortBy");
			 	mEmpty.orderBy = oFetchParamsModel.getProperty("/orderBy");
			}
			if (!this._oPendingModel) {
				this._oPendingModel = new JSONModel(mEmpty);
			} else {
				this._oPendingModel.setData(mEmpty);
			}
		
			return this._fetchRuns( oParams, "pending", this._oPendingModel);
		},
		
		loadFinishedModel: function(oParams, oFetchParamsModel) {
			var mEmpty = {
				total: 0,
				aData: [],
				pageNumber:  0,
				pageSize: 100,
				sortBy: "start",
				orderBy: "desc"
			};
			if ( oFetchParamsModel ) {
				mEmpty.pageNumber = oFetchParamsModel.getProperty("/pageNumber");
				mEmpty.pageSize = oFetchParamsModel.getProperty("/pageSize");
			 	mEmpty.sortBy = oFetchParamsModel.getProperty("/sortBy");
			 	mEmpty.orderBy = oFetchParamsModel.getProperty("/orderBy");
			}

			if (!this._oFinishedModel) {
				this._oFinishedModel = new JSONModel(mEmpty);
			} else {
				this._oFinishedModel.setData(mEmpty);
			}
			var date = new Date();
			date.setDate(date.getDate() - 3);
						
			return this._fetchRuns( oParams, "success,failed,completed,errored,cancelled&from=" + date.toISOString(), this._oFinishedModel);
		},
		
		_getWorkspacePart: function(oAuxModel) {
			return "/workspaces/" + oAuxModel.getProperty("/srf_lastSelectedWorkspaceId");
		},
		
		changeWorkspace: function(oAuxModel, wsId, userId) {
			var sUrl = this._urlSecurity + "/users/" + userId,
				oData = JSON.stringify( { "lastSelectedWorkspaceId": wsId } ),
				oCommon = oAuxModel.getProperty("/srf_common"),
				that = this;

			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax(sUrlTenant, {
					type: "PUT",
					data: oData,
					dataType: "json",
					contentType: "application/json"
				})
				.then(function(oResponse) {
					if (!oResponse || !oResponse.length || oResponse[2] !== "success") {
						return Q.reject("Change workspace failed");
					}
					
					return oResponse[0];
				}).catch(function(err) {
					return that.srfFailureHandler(err, oAuxModel).then(function() {
						return Q.reject(err);
					});
				});
			});
		},
		
		// http://beta.srf-rnd.click/rest/test-manager/test-runs?groupby=test-run-by-test&include=exec-count&order=desc&page=0&size=100&sortby=start		
		//  TODO paging { aData: [], pageNumber: pN, pageSize: pS, totalItemsCount: total}
		_fetchRuns: function(oAuxModel, sStatus, oModel) {

			var that = this;

			if (!oModel) {
				return Q();
			}
			if ( !oAuxModel) {
				return Q();
			}
			this.srfDestinationName = oAuxModel.getProperty("/srf_destination");
				
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/test-runs?include=" 
			+ "&status=" + sStatus
			+ "&page="	+ oModel.getProperty("/pageNumber") 
			+ "&size=" 	+ oModel.getProperty("/pageSize") 
			+ "&sortby=" + oModel.getProperty("/sortBy") 
			+ "&order=" + oModel.getProperty("/orderBy") ;
		
			var oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
					}
				}).then(function(aResponse) {
					return that._applyTestRunsFilter(aResponse, false, oModel);
				}).catch(function(reason) {
					//window.console.error(reason.statusText); // Error!

					return that.srfFailureHandler(reason, oAuxModel).then( function() {
						return oModel;
					});
				});
			});
		},

		_applyTestRunsFilter: function(aResponse, bMerge, oModel) {
			if (!$.isEmptyObject(aResponse)) {
				var totalItemsCount = aResponse[0].totalItemsCount;
				if ( totalItemsCount > 0) {
					var oRuningData = aResponse[0].entities.filter(this.checkValidTest);

					if( bMerge ) {
						$.merge(oModel.getProperty("/aData"), oRuningData);
					} else {
						oModel.setProperty("/aData", oRuningData);
					}
				}
				oModel.setProperty("/total", Math.max(totalItemsCount, oModel.getProperty("/aData").length));
			} 
			else {
				if( !bMerge ) {
					oModel.setData({
						total: 0,
						aData: [],
						pageNumber: 0,
						pageSize: 100,
						sortBy: "start",
						orderBy: "desc"
					});
				}
			}
			return oModel;
		},

		checkValidTest: function(runningTest) {
			return true;//runningTest.test && runningTest.test.id !== "-1";
		},

		stopRun: function(oAuxModel, sRunId) {
			
			var sUrl = this._urlRunManager + "/v1" + this._getWorkspacePart(oAuxModel) + "/execution/jobs/" + sRunId;
			var that = this;
			var oCommon = oAuxModel.getProperty("/srf_common");
			
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "DELETE",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
					}
				}).then(function(aResponse) {
					return aResponse[2];
				}).catch(function(reason) {
					return that.srfFailureHandler(reason, oAuxModel).then(function() {
						return reason.responseText;
					});
				});	
			});
		},

		deleteTest:  function(oAuxModel, sTestId) {
		
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests/" + sTestId;
			var that = this;
			var oCommon = oAuxModel.getProperty("/srf_common");
			
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "DELETE",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
					}
				}).then(function(aResponse) {
					return aResponse;
				}).catch(function(reason) {
					return that.srfFailureHandler(reason, oAuxModel).then(function() {
						return reason.responseText;
					});		
				});			
			});
		},

		loadTestDetailsModel: function(oAuxModel, oParams, bRunsOnly) {
			if (!this._oTestDetailsModel) {
				this._oTestDetailsModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			this._fetchTestDetails(oAuxModel, oParams, bRunsOnly);
			return this._oTestDetailsModel;
		},

		loadTestDetailsModelSync: function(oAuxModel, oPagingParams, bRunsOnly) {

			var that = this;
			
			if (!this._oTestDetailsModel) {
				this._oTestDetailsModel = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			if (!this._fetchTestDetailsSync) {
				return Q();
			}
			return this._fetchTestDetailsSync(oAuxModel, oPagingParams, bRunsOnly)
			.then(function( oTestDetailsData) {

				that._oTestDetailsModel.setData(oTestDetailsData);
				return that._oTestDetailsModel;
			})
			.catch( function(error) {
				that._oTestDetailsModel.setData( {});
				return that.srfFailureHandler(error, oAuxModel).then(function() {
					return that._oTestDetailsModel;
				});
			});	
		},
		
		_fetchTestDetailsSync: function( oAuxModel, oParams, bRunsOnly) {
			var sUrl = null;
			var that = this;
			if (oParams.id) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests/" +  oParams.id  + "?include=test-run";
				if (!bRunsOnly) {
					sUrl = sUrl + ",resource,tag";
				}
				//window.console.log("Fetch Test Details : " + sUrl);
				
				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax({
						url: sUrlTenant,
						type: "GET",
						responseType: "application/json"
					}).then(function(aResponse) {
						return aResponse[0];
					}).catch(function(reason) {
						//window.console.error(reason.responseText); // Error!
						return that.srfFailureHandler(reason, oAuxModel).then(function() {
							return {};
						});				
					});		
				});	
			} 
			else {
				window.console.error("Fetch Test Details  - no test id ");
				return Q();
			}
		},

		// set _oTestRuns
		loadTestRunsPage: function(oAuxModel, oFetchParams) {
			if (!this._oTestRuns) {
				this._oTestRuns = new JSONModel();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var that = this;
			return this._fetchTestRunsPage(oAuxModel, oFetchParams).then(function( oTestDetailsData) {
				//  { entities: [...], totalItemsCount: T, pageNumber: nPage, pageSize: nPageSize};
				that._oTestRuns.setData(oTestDetailsData);
				return that._oTestRuns;
			})
			.catch( function(error) {
				that._oTestRuns.setData( {"entities": [], "totalItemsCount": 0, pageNumber: oFetchParams.pageNumber, pageSize: oFetchParams.pageSize});
				return that.srfFailureHandler(error, oAuxModel).then(function() {
					 return that._oTestRuns;
				});				
			});				
		},
		
		_fetchTestRunDetailsSync: function(oAuxModel, oParams) {
			var sUrl = null;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			if (oParams && oParams.id) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/test-runs/" + oParams.id + "?include=script-runs,resource,script-steps";
	
				var that = this;
				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax({
						url: sUrlTenant,
						type: "GET",
						responseType: "application/json"
					}).then(function(aResponse) {
						return aResponse[0];
					}).catch(function(reason) {
						//window.console.error(reason.responseText); // Error!
						return that.srfFailureHandler(reason, oAuxModel).then(function() {
							return {};
						});				
					});	
				});
			} 
			else {
				window.console.error("Fetch Test Run Details - no run id ");
				return Q();
			}
		},


		saveTestDetails: function(oAuxModel, oTest) {
			var that = this;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			return this._saveTestDetails(oAuxModel, oTest)
			.then(function(oData) {
				
				if (!$.isEmptyObject(oData)) {
					if (!that._oTestDetailsModel) {
						that._oTestDetailsModel.oData.test = new JSONModel(oData[0].test);
					} else {
						that._oTestDetailsModel.oData.test = oData[0].test;
					}
				}
				return that._oTestDetailsModel.oData.test;
			});
		},
		
		saveTestPackage: function(oAuxModel, oTest, oPackage) {
			var that = this;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			return this._saveTestPackage(oAuxModel, oTest, oPackage)
				.then(function(oData) {

					if (!$.isEmptyObject(oData)) {
						if (!that._oTestDetailsModel) {
							that._oTestDetailsModel = new JSONModel(oData[0].test);
						} else {
							that._oTestDetailsModel.setData(oData[0].test);
						}
					}
					return that._oTestDetailsModel;
				});
		},

		saveTestScripts: function(oAuxModel, sTestId, oScripts) {
			if (!this._oTestDetailsModel) {
				this._oTestDetailsModel = new JSONModel();
			}
			var that = this;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			// fix for reset scripts array while test deletion workaround for old srf servers ( Frankfurt and Oregon)
			sTestId = sTestId || this._oTestDetailsModel.getProperty("/test/id");
			
			return this._saveTestScripts(oAuxModel, sTestId, oScripts)
			.then(function(oData) {
				if (!$.isEmptyObject(oData)) {
					if (!that._oTestDetailsModel) {
						that._oTestDetailsModel = new JSONModel(oData[0].test);
					} else {
						that._oTestDetailsModel.setData(oData[0].test);
					}
				}
				return that._oTestDetailsModel;
			});

		},

		saveTestEnvironments: function(oAuxModel, oTest, keyArr) {
			if (!this._oTestDetailsModel) {
				this._oTestDetailsModel = new JSONModel();
			}
			var that = this;
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			return this._saveTestEnvironments(oAuxModel, oTest, keyArr)
				.then(function(oData) {
				if (!$.isEmptyObject(oData)) {
					if (!that._oTestDetailsModel) {
						that._oTestDetailsModel = new JSONModel(oData[0].test);
					} else {
						that._oTestDetailsModel.setData(oData[0].test);
					}
				}
				return that._oTestDetailsModel;
			});
		},

		_fetchToModel: function(oAuxModel, oJsonModel, sUrl, sMockFileName, requestFailure, bFavorites) {
			var that = this;
			var oCommon = oAuxModel.getProperty("/srf_common");

			if (sUrl && sUrl.length) {
				
				if ( !this.requestFailed) {
					this.requestFailed = function(oEvent) {
						var statusCode =  oEvent.getParameter("statusCode") ;
						var error = oEvent.getParameter("statusText");	
						if (statusCode === 401 || error === "Unauthorized") {
							if ( oAuxModel) {
								var sAutologonMsg = oAuxModel.getProperty("/srf_context").i18n.getText("autologon", [oAuxModel.getProperty("/srf_destination")]);
								oCommon.log("SRF", sAutologonMsg, oAuxModel.getProperty("/srf_context"), "warning");						
							}
							that.srfFailureHandler(oEvent, oAuxModel).done();
						}	
					};
				}
				oJsonModel.detachRequestFailed(this.requestFailed);
				oJsonModel.attachRequestFailed(this.requestFailed);	

				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return oJsonModel.loadData(
							sUrlTenant, 
							null, 
							true, 
							"GET");
				});
			}
			else {
				window.console.error("SRF.Fetch Data To Model - no URL");
				return oJsonModel;
			}
		},

		srfFailureHandler: function(oError, oAuxModel) {
			var statusCode = oError.status,
				oCommon = oAuxModel.getProperty("/srf_common"),
				sMsg = "",
				srfContext = oAuxModel.getProperty("/srf_context"),
				oResourceBundle = oAuxModel.getProperty("/srf_context").i18n;
			
			switch( statusCode) {
				case 403: // forbidden
				case 401: // unauthorized
					// cleanup the recent user logon info
					this._cleanLoggedInState( oAuxModel);
					if ( oAuxModel) {						
						var errCode = oError && oError.responseJSON && oError.responseJSON.code,
							errStatusText = oError && (oError.statusText || oError.message),
							errTextByCode = errCode && oResourceBundle.getText(errCode) || errStatusText;
							
						sMsg = oResourceBundle.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, errTextByCode]);
						oCommon.log("SRF", 
							sMsg + " : " + oError.responseText, 
							srfContext, 
							"failure");
								
					//	oAuxModel.setProperty("/srf_loginFailed", errTextByCode);
					}
					break;	
				case 409: // unauthorized
					if ( oAuxModel) {	
						// reset the test data?
						var oController = oAuxModel.getProperty("/srf_controller");
							
						return oController._openAreYouSureDialog(
							{title: oResourceBundle.getText("lockDlgTitle"), message: oResourceBundle.getText("lockDlgText")});
// 						.then(function() { 
// 							sMsg = oContext.i18n.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, oError.statusText|| oError.message]);
// 								oCommon.log("SRF", 
// 									sMsg + " : " + oError.responseText, 
// 									oContext, 
// 									"failure");
// 						});
					}
					break;
				case 500: // internal server error
					if ( oAuxModel) {
						oAuxModel.setProperty("/srf_loginFailed", oError.statusText || oError.message);
						sMsg = oResourceBundle.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, oError.statusText || oError.message]);
						oCommon.log("SRF", 
							sMsg + " : " + oError.responseText, 
							srfContext, 
							"failure");
					}	
					break;			
				case 503: // service unavailable 
				case 502: // bad gateway
					//The 502 Bad Gateway error is often a network error between servers on the internet, 
					// meaning the problem wouldn't be with your computer or internet connection.
					
					// cleanup the recent user logon info
					this._cleanLoggedInState( oAuxModel);
					if ( oAuxModel) {
						oAuxModel.setProperty("/srf_loginFailed", oError.statusText|| oError.message);
						sMsg = oResourceBundle.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, oError.statusText || oError.message]);
						oCommon.notification("SRF", 
							sMsg, 
							srfContext, 
							"failure");
						oCommon.log("SRF", 
							sMsg + " : " + oError.responseText, 
							srfContext, 
							"failure");
					}					
					break;
				case 504: // gateway timeout
					if ( oAuxModel) {
						oAuxModel.setProperty("/srf_loginFailed", oError.statusText|| oError.message);
						sMsg = oResourceBundle.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, oError.statusText|| oError.message]);
						oCommon.notification("SRF", 
							sMsg, 
							srfContext, 
							"failure");
						oCommon.log("SRF", 
							sMsg + " : " + oError.responseText, 
							srfContext, 
							"failure");
					}					
					break;
				default:
					if ( oAuxModel) {
						oAuxModel.setProperty("/srf_loginFailed", oError.statusText || oError.message);
						sMsg = oResourceBundle.getText("fetchDataFailed", [oAuxModel.getProperty("/srf_destination"), statusCode, oError.statusText|| oError.messagee]);
						oCommon.log("SRF", 
							sMsg + " " + statusCode + " : " + oError.statusText || oError.message, 
							srfContext, 
							"failure");
					}					
			}
			
			return Q();
		},
		
		_cleanLoggedInState: function ( oAuxModel, failureCleanup) {
			var oCommon = oAuxModel.getProperty("/srf_common"),
				srfContext = oAuxModel.getProperty("/srf_context");
			
			if ( oAuxModel) {
				// cleanup the recent user logon info				
				oAuxModel.setProperty("/srf_username", "");
				if ( failureCleanup && failureCleanup === true) 
					oAuxModel.setProperty("/srf_loginFailed", "") ;
				oCommon.eraseSrfToken(); 
			 	oAuxModel.setProperty("/srf_loggedIn", false);	
			 	oCommon.setUserPreferences( srfContext, "srf_user", {} );

			}
		},
		
		srfCredAutologon: function(oAuxModel, cred) {
			var that = this;
		
			if ( oAuxModel) {
				this.srfDestinationName = oAuxModel.getProperty("/srf_destination");
				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function ( sTenant) {
					// tenant is the second item in WebIDEAdditionalData array
					// use tenant from destination otherwice from logon dialog input
					return that.srfLogin(cred.user, cred.pwd, sTenant || cred.tenant);
				});
			}
		
			return Q();	
		},
		
		mcCredAutologon: function(oAuxModel, cred) {
			if ( oAuxModel) {
				this.srfDestinationName = oAuxModel.getProperty("/srf_destination");
				
				return this.mcLogin(cred.user, cred.pwd, cred.tenant);
			}
		},
		
		srfLogin: function(username, password, tenantId) {

			var request = this._urlSecurity + "/login?TENANTID=" + tenantId,
				data = JSON.stringify({
					username: username,
					password: password,
					tenantId: tenantId
				});
	
			return Q.sap.ajax(request, {
					type: "POST",
					data: data,
					dataType: "json",
					contentType: "application/json"
				})
				.catch(function(err) {
					//	error
					window.console.error("SRF login failure : " + err);
					return Q.reject(err);
				});
		},

		srfLogout: function( oAuxModel) {
			if ( oAuxModel) {
				this.srfDestinationName = oAuxModel.getProperty("/srf_destination");
				var oCommon = oAuxModel.getProperty("/srf_common"),
					that = this;
				return oCommon.getSrfTenant().then( function (sTenant) {
					var request = that._urlSecurity + "/logout?TENANTID=" + sTenant;
					return Q.sap.ajax( request, 
						{
							type: "POST",
							data: {},
							dataType: "json",
							contentType: "application/json"
						}
					);
				});
			}
			return Q();	
		},

		logout: function(oAuxModel) {
			var that = this;
			return this.srfLogout(oAuxModel).then( function( oResponse) {
				if ( oResponse.length === 3) {
					oAuxModel.getProperty("/srf_common").log("SRF", 
							oResponse[0], 
							oAuxModel.getProperty("/srf_context"), 
							oResponse[2]);
				
				}
				return ( oResponse.length ? oResponse[0] /* logout successfull reply string*/: oResponse /* error*/);
			}).finally( function() {
				// cleanup the recent user logon info
				that._cleanLoggedInState( oAuxModel, true);
			})                         ;
		},
		
		// shows logout dialog 
		// returns promise
		Logout: function(oAuxModel, oEvent) {
			var that = this,
			
				oController = oAuxModel && oAuxModel.getProperty("/srf_controller");			
			if (oController && !oController._oLogoutDialog) {
				return oController.openLogoutDialog(oEvent)
				.then(function() {
					// logout the current user
				 	return that.logout(oAuxModel);
				})
				.catch(function(error) {
					// logout cancelled
					if(!error) {
						oAuxModel.setProperty("/srf_loginFailed", "");
					}
				})
				.finally( function() {
					oController.closeLogoutDialog();
				});
			} 
			
			return Q();
		},

		loginWithCredentials: function(oAuxModel, userCredentials) {
			var that = this,
				srfContext = oAuxModel.getProperty("/srf_context"),
				oCommon = oAuxModel.getProperty("/srf_common");
		
			oCommon.eraseSrfToken(); 
			return that.srfCredAutologon(oAuxModel, userCredentials).then( function(oResponse) {
				that._cleanLoggedInState( oAuxModel, true);

				if(oResponse && oResponse.length) {
					var userData = oResponse[0];
					var userName = userData.userFirstName + " " + userData.userLastName;
					var ssoToken = userData.ssoToken;
					oCommon.setSrfToken( ssoToken); // prepends with "LWMDSSO_NRM="
					oAuxModel.setProperty("/srf_username", userName);
					oAuxModel.setProperty("/srf_user", userData);
					oAuxModel.setProperty("/srf_loggedIn", true);
					oCommon.setUserPreferences( srfContext, "srf_user", userData );
					return oResponse[2];
				}
				else { 	
					// will never get here: login failed => oResponse is an error object
					oAuxModel.setProperty("/srf_loginFailed", oResponse && oResponse.statusText);
					return "failure";
				}
			
			}).catch(function(error) {
				// login failed
				that._cleanLoggedInState( oAuxModel);
				if(error.status === 500 ) {
					var errorMsg = oAuxModel.getProperty("/srf_context").i18n.getText("loginInfoInvalid");
					oAuxModel.setProperty("/srf_loginFailed", errorMsg);
				} else {
					oAuxModel.setProperty("/srf_loginFailed", error.statusText);
				}
				return "failure";
			});

		},

// http://beta.srf-rnd.click/rest/test-manager/tests?include=test-stats&order=desc&page=0&size=100&sortby=modifiedDate&subType=auto&tags=DLON16&type=web
// paging {tests: [,…], totalItemsCount: 12, pageNumber: "0", pageSize: "100", testStats: {...test runs...}}
		_fetchTests: function(oAuxModel) {
			var sUrl, sProjectNameTag;
			var sProjectPrefix = "SAP-";
			var nSrfTagMaxLength = 50;
			
			
			this._oTestsModel.setData( {});
			if (oAuxModel && oAuxModel.getProperty("/srf_projectName")) {

				sProjectNameTag = (sProjectPrefix + oAuxModel.getProperty("/srf_projectName")).substr(0, nSrfTagMaxLength ? nSrfTagMaxLength : 50);
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?subType=auto&order=desc&sortby=modifiedDate&tags=" + sProjectNameTag;

				//window.console.log("Fetch Tests: " + sUrl);
				return this._fetchToModel(oAuxModel, this._oTestsModel, sUrl, "TestDefinitions.json");
			} else {
				window.console.error("models._fetchTests into _oTestsModel - no project provided");
				return this._oTestsModel;
			}
		},
		
// http://beta.srf-rnd.click/rest/test-manager/tests?include=test-stats&order=desc&page=0&size=100&sortby=modifiedDate&subType=auto&tags=DLON16&type=web
// paging {tests: [,…], totalItemsCount: 12, pageNumber: "0", pageSize: "100", testStats: {...test runs...}}

		// fetch tests according to oAuxModel.projectName 
		_fetchTestsSync: function(oAuxModel, oFetchParams) {
			var sUrl, sProjectNameTag;
			var sProjectPrefix = "SAP-";
			var nSrfTagMaxLength = 50;
			var that = this;
			
			var nPage = oFetchParams.pageNumber || 0;
			var nPageSize = oFetchParams.pageSize || 100;
			var sOrder =oFetchParams.sortOrder || "desc";
			var sSortBy = oFetchParams.sortBy || "modifiedDate";
			
			if (oAuxModel && oAuxModel.getProperty("/srf_projectName")) {

				sProjectNameTag = (sProjectPrefix + oAuxModel.getProperty("/srf_projectName")).substr(0, nSrfTagMaxLength ? nSrfTagMaxLength : 50);
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?subType=auto&order=" + sOrder + "&sortby=" + sSortBy + "&tags=" + sProjectNameTag + "&page=" + nPage + "&size=" + nPageSize;

				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax({
						url: sUrlTenant,
						type: "GET",
						responseType: "application/json",
						xhrFields: {
							withCredentials: false
							}
						})
						.then(function(oResponse) {
							return oResponse[0];
						}).catch(function(err) {
							return that.srfFailureHandler(err, oAuxModel).then(function() {
								return Q.resolve({tests:[], totalItemsCount:0});
							});
						});
				});

			} else {
				window.console.error("models._fetchTests into _oTestsModel - no project provided");
				return Q.resolve({tests:[], totalItemsCount:0});
			}
		},

//TODO 
// 1. tags 
// 2. paging { assets: [], pageNumber: pN, pageSize: pS, totalItemsCount: total}
		//http://beta.srf-rnd.click/rest/test-manager/assets?order=desc&page=0&size=100&sortby=modificationDate&tags=DLON16
		// fetch all assets 
		_fetchAssets: function(oAuxModel, oFetchParams) {
			var that = this,
				nPage = oFetchParams.pageNumber || 0,
				nPageSize = oFetchParams.pageSize || 100,
				sOrder = oFetchParams.sortOrder || "desc",
				sSortBy = oFetchParams.sortBy || "modifiedDate",
				sType = oFetchParams.type || "web",
				sLikesearch = oFetchParams.likesearch || "";

			var sUrl = this._urlAssets + this._getWorkspacePart(oAuxModel) + "/assets?type=" + sType + "&order=" + sOrder + "&sortby=" + sSortBy + 
						"&page=" + nPage + "&size=" + nPageSize + "&likesearch=" + sLikesearch;
			//+  "&tags=" + sProjectNameTag ;
			
			window.console.log("Fetch Assets: " + sUrl);
			var oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
						}
					})
					.then(function(oResponse) {
						return oResponse[0];
					})
					.catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return {assets:[], totalItemsCount:0};
						});
					});	
			});
		},
		
		
		// fetch all environments 
		fetchEnvironmentsSync: function(oAuxModel) {
			var that = this;
			var sUrl = this._urlEnvironmentsLabs + "/v2/environments";// + this._getWorkspacePart(oAuxModel);
			window.console.log("Fetch Environmants: " + sUrl);
			var oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
						}
					})
					.then(function(oResponse) {
						return oResponse[0];
					})
					.catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return[];
						});
					});
			});
		},

		// fetch all environments 
		fetchDevicesSync: function(oAuxModel) {
			var that = this;
			var sUrl = this._urlDevices + this._getWorkspacePart(oAuxModel) + "/devices&source=MC";
			window.console.log("Fetch Devices: " + sUrl);
			var oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				return Q.sap.ajax({
					url: sUrlTenant,
					type: "GET",
					responseType: "application/json",
					xhrFields: {
						withCredentials: false
						}
					})
					.then(function(oResponse) {
						return oResponse[0];
					})
					.catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return[];
						});
					});
			});
		
		},
		
		// fetch all assets 
		_fetchScriptLog: function( oAuxModel, sLogId) {
			var sUrl = this._urlStorage + this._getWorkspacePart(oAuxModel) + "/assets-stream/" + sLogId;
			//window.console.log("Fetch Log: " + sUrl);
			this._fetchToModel( oAuxModel, this._oLogModel, sUrl, "" );
			
//			this._sScriptLog = this._oLogModel.getProperty
		},
		
		// fetch all tags 
		_fetchTags: function( oAuxModel) {

			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tags?group=test";
			//window.console.log("Fetch Tags: " + sUrl);
			return this._fetchToModel(oAuxModel, this._oTagsModel, sUrl, "Tags.json");
		},

		// fetch environments 
		_fetchEnvironments: function(oAuxModel, oParams) {
			var sUrl = this._urlEnvironmentsLabs + "/v2/environments";// + this._getWorkspacePart(oAuxModel);
			switch (oParams) {
				case "beta":
					sUrl = sUrl + "?preset-id=beta-browsers";
					break;
				case "pam":
					sUrl = sUrl + "?preset-id=my-pam";
					break;
				case "failed":
					sUrl = sUrl + "?preset-id=most-failed";
					break;
				case "recording":
					sUrl = sUrl + "?scenario=recording";
					break;				
				case "allEnv":
					sUrl = sUrl + "?scenario=execution";
					break;
			}

			//window.console.log("Fetch Environments: " + sUrl);
			return this._fetchToModel(oAuxModel, this._oEnvironmentsModel, sUrl, "Environments.json");
		},
		
		// fetch environments 
		_fetchEnvironmentsBeta: function(oAuxModel) {
			return this._fetchToModel(oAuxModel, this._oMCEnvironmentsModel, this._urlEnvironmentsLabsBeta, "Environments.json");
		},
		
		// fetch environments 
		_fetchPackageEnvironments: function(oAuxModel, sPackageId) {
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/package/" + sPackageId;
			
			return this._fetchToModel(oAuxModel, this._oMCPackageModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},	
		
		// fetch environments 
		_fetchMCFavoritesModel: function(oAuxModel) {
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/package?usageType=favorite";
			
			return this._fetchToModel(oAuxModel, this._oMCFavoritesModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},
			
		// fetch devices
		_fetchMCDevicesModel: function(oAuxModel) {
			var sUrl = this._urlEnvironmentsLabs + this._getWorkspacePart(oAuxModel) + "/devices?source=MC";
			return this._fetchToModel(oAuxModel, this._oMCDevicesModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},
		
		// fetch environments 
		_fetchMCCMModel: function(oAuxModel) {
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/cm";
			
			return this._fetchToModel(oAuxModel, this._oMCFavoritesModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},
		
		// fetch environments 
		_fetchMCTypesModel: function(oAuxModel) {
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/deviceAAS/types";
			
			return this._fetchToModel(oAuxModel, this._oMCTypesModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},
				
		// fetch environments 
		_fetchMCAppModel: function(oAuxModel) {
			var sUrl = this._urlEnvironmentsLabs + this._getWorkspacePart(oAuxModel) + "/apps-last-ver";
			
			return this._fetchToModel(oAuxModel, this._oMCAppModel, sUrl, "MCFavorites.json", this._favoritesFailure, true);
		},
		
		createMCPackage: function(oAuxModel, oPackage) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/package",
				oData = JSON.stringify(oPackage),
					that = this;

				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax(sUrlTenant, {
						type: "POST",
						data: oData,
						dataType: "json",
						contentType: "application/json"
					})
					.then(function(oResponse) {
						if (!oResponse || !oResponse.length || oResponse[2] !== "success") {
							return Q.reject("Package not created");
						}
	
						return oResponse[0];
					}).catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return Q.reject(err);
						});
					});
				});
		
		},
	
		updateMCPackage: function(oAuxModel, oPackage, sPackageId) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sUrl = this._urlMCEnvironments + this._getWorkspacePart(oAuxModel) + "/rest/v2/package/" + sPackageId,
				oData = JSON.stringify(oPackage),
					that = this;

				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax(sUrlTenant, {
						type: "PUT",
						data: oData,
						dataType: "json",
						contentType: "application/json"
					})
					.then(function(oResponse) {
						if (!oResponse || !oResponse.length || oResponse[2] !== "success") {
							return Q.reject("Package not created");
						}
	
						return oResponse[0];
					}).catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return Q.reject(err);
						});
					});
				});
		
		},
// performance improvement: for test list with runs results summary:		
//TODO http://beta.srf-rnd.click/rest/test-manager/test-runs?groupby=test-run-by-test&include=exec-count&order=desc&page=0&size=100&sortby=start

		// fetch run results for test into _oTestRunsModel
		// test-runs?test-id=
		// http://52.34.123.180:9500/test-runs?test-id=7c8bd286-a75c-4105-bdfb-3d9acdad91d4,include=script-runs,resource,script-steps
		_fetchTestRuns: function(oAuxModel, oParams) {
			//e.g. oParams = { "id" : "7c8bd286-a75c-4105-bdfb-3d9acdad91d4"};
			var sUrl = null;
			var that = this;
			if (oParams && oParams.id) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/test-runs/" + oParams.id + "?include=resource,script-runs,script-steps";		

				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					var settings = {
						url: sUrlTenant,
						type: "GET",
						contentType: "application/json"
					};

					return Q.sap.ajax(settings)
						.then(function(oResponse) {
							return oResponse[0];
						})
						.catch(function(err) {
							return that.srfFailureHandler(err, oAuxModel).then(function() {
								return {};
							});
						});
				});
			} else {
				window.console.error("Fetch Test Runs - no test id ");
				return Q();
			}
		},

		// fetch extended run results into _oTestDetails
		// test-runs?test-id=ID,include=script-steps
		// http://52.34.123.180:9500/test-runs?test-id=7c8bd286-a75c-4105-bdfb-3d9acdad91d4,include=script-runs,resource,script-steps
		_fetchAssetsForTestFromRuns: function(oAuxModel, oParams) {
			//e.g. oParams = { "id" : "7c8bd286-a75c-4105-bdfb-3d9acdad91d4"};
			var sUrl = null;
			if (oParams && oParams.id) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/test-runs?test-id=" + oParams.id + ",include=script-steps";

			//	window.console.log("Fetch Assets For Test From Runs: " + sUrl);
				return this._fetchToModel(oAuxModel, this._oTestDetails, sUrl, "TestRuns.json");
			} else {
				window.console.error("Fetch Assets For Test From Runs - no test id ");
				return null;
			}
		},

		// fetch the most extended test details by id into _oTestDetailsModel
		// "/tests/ID?include=resource,test-run
		// http://52.34.123.180:9500/tests/4474338a-47dd-46ae-b113-b886e3c44582?include=resource,test-run
		//http://beta.srf-rnd.click/rest/test-manager/test-runs?include=&order=desc&page=0&size=100&sortby=start&test-id=fa3a1430-df42-44a4-81c6-886db7595767
		//http://beta.srf-rnd.click/rest/test-manager/test-runs?include=&name=UFT+Burst+-+Online+Shopping&order=desc&page=0&size=100&sortby=start&test-id=-1
		_fetchTestDetails: function( oAuxModel, oParams, bRunsOnly) {
			//e.g. oParams = { "id" : "7c8bd286-a75c-4105-bdfb-3d9acdad91d4"};
			var sUrl = null;
			var testId = oParams.id;
			if (testId) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests/" + testId + "?include=test-run";
				if (!bRunsOnly) {
					sUrl = sUrl + ",resource,tag";
				}
				//window.console.log("Fetch Test Details : " + sUrl);
				return this._fetchToModel(oAuxModel, this._oTestDetailsModel, sUrl, "TestDetails.json");
			} else {
				window.console.error("Fetch Test Details  - no test id ");
				return null;
			}
		},

		// fetch the most extended test runs details by test id 
		// "/tests/ID?include=resource,test-run
		// http://52.34.123.180:9500/tests/4474338a-47dd-46ae-b113-b886e3c44582?include=resource,test-run
		//http://beta.srf-rnd.click/rest/test-manager/test-runs?include=&order=desc&page=0&size=100&sortby=start&test-id=fa3a1430-df42-44a4-81c6-886db7595767
	
	
		_fetchTestRunsPage: function( oAuxModel, oFetchParams) {
			var sUrl = null;
			var that = this;
			
			var nPage = oFetchParams.pageNumber || 0;
			var nPageSize = oFetchParams.pageSize || 10;
			var sOrder =oFetchParams.sortOrder || "desc";
			var sSortBy = oFetchParams.sortBy || "start";
			var testId = oFetchParams.id;
			
			if (testId) {
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/test-runs?include=&test-id=" + testId +
					"&order=" + sOrder + "&sortby=" + sSortBy + "&page=" + nPage + "&size=" + nPageSize;
				
				window.console.log("Fetch Test Details : " + sUrl);
				var oCommon = oAuxModel.getProperty("/srf_common");
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {	
					var settings = {
						url: sUrlTenant,
						type: "GET",
						contentType: "application/json"
					};
	
					return Q.sap.ajax(settings)
						.then(function(oResponse) {
							//  { entities: [...], totalItemsCount: T, pageNumber: nPage, pageSize: nPageSize};
							return oResponse[0];
						})
						.catch(function(err) {
							return that.srfFailureHandler(err, oAuxModel).then(function() {
								return { entities: [], totalItemsCount:0, pageNumber: nPage, pageSize: nPageSize};
							});
						});
				});
			} else {
				window.console.error("Fetch Test Details  - no test id ");
				return Q();
			}
		},

		_saveTestScripts: function( oAuxModel, sTestId, oScripts) {

			var testId = sTestId || this._oTestDetailsModel.getProperty("/test/id"),
				sConsistencyStamp = this._oTestDetailsModel.getProperty("/test/consistencyStamp") || "",
				oData = {
					id: testId,
					scripts: oScripts,
					consistencyStamp: sConsistencyStamp
				},
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=resource,tag";
				
			return this._saveToSRF(oAuxModel, oData, sUrl);
		},

		_saveToSRF: function( oAuxModel, oData, sUrl) {

			var that = this,
				oCommon = oAuxModel.getProperty("/srf_common");
				
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {
				var settings = {
					url: sUrlTenant,
					type: "PUT",
					data: JSON.stringify(oData),
					contentType: "application/json"
				};

				return Q.sap.ajax(settings)
					.then(function(oResponse) {
						if (!oResponse || !oResponse.length || oResponse[2] !== "success") {
							return Q.reject("SRF update failed");
						}

						return oResponse;
					})
					.catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							var oController = oAuxModel.getProperty("/srf_controller");
							oController.liteNotification( err.responseJSON.message,
														"failure");
							oController.showTests();
							return [err.responseJSON];
						});
					});
			});
		},

		convertTagsForSave: function(oTags, addedTag, deletedTag) {
			if (deletedTag) {
				$.each(oTags, function(i, oTag) {
					if (oTag && ((oTag.id === deletedTag.mProperties.key) || (!oTag.id && (oTag.name === deletedTag.mProperties.text)))) {
						// add flag or switch its value
						oTags.splice(i, 1);
						return;
					}
				});
			}

			if (addedTag) {
				var oNewTag = {
					id: (addedTag.mProperties.key || ""),
					name: addedTag.mProperties.text
				};

				// add flag or switch its value
				oTags.push(oNewTag);
			}

			return oTags;
		},

		_saveTestTags: function(oAuxModel, sTestId, addedTags, deletedTags) {

			var testId = sTestId || this._oTestDetailsModel.getProperty("/test/id") ||  this._oTestDetailsModel.getProperty("/id"),
				oTags = this._oTestDetailsModel.getProperty("/test/tags") ||  this._oTestDetailsModel.getProperty("/tags") || [],
				sConsistencyStamp = this._oTestDetailsModel.getProperty("/test/consistencyStamp") || "",
				oData = {
					id: testId,
					tags: this.convertTagsForSave(oTags, addedTags, deletedTags),
					consistencyStamp: sConsistencyStamp
				},
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=tag",
				that = this;

			if (oData.id) {
				return this._saveToSRF(oAuxModel, oData, sUrl)
				.then(function(oData) {
					if (!$.isEmptyObject(oData)) {
						if (!that._oTestDetailsModel) {
							that._oTestDetailsModel = new JSONModel(oData[0]);
						} else {
							that._oTestDetailsModel.setData(oData[0]);
						}
					}
					return oData;
				});

			} else {
				window.console.error("SRF Request ", " _saveTestTags " + sUrl + " no valid test ID");
				return Q();
			}
		},

		_saveTestDetails: function(oAuxModel, oTest) {
			var test = oTest || this._oTestDetailsModel.getProperty("/test");
			
			// more cleanup required here 
			test.name =  test.name || test.newTestName;
			test.description = test.desc || test.description;
			test.id = test.testId || test.id;

			var data = {
				id: test.id,
				name: test.name,
				description: test.description,
				consistencyStamp: test.consistencyStamp || ""
			};

			// MAYA: get scripts from updated property . may be it's  this._oTestDetailsModel.getProperty("/scripts") ?
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=tag";
			
			return this._saveToSRF(oAuxModel, data, sUrl);
		},

		_saveTestPackage: function(oAuxModel, oTest, oPackage) {

			var test = oTest || this._oTestDetailsModel.getProperty("/test");
			
			test.id = test.testId || test.id;

			var data = {
					id: test.id,
					environments: oPackage.browsers,
					mobileApps:oPackage.applications,
					mobileCapabilities: oPackage.mobileCapabilities,
					runContext: oPackage.runContext,
					consistencyStamp: test.consistencyStamp || ""
				},
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=tag";
				
			return this._saveToSRF(oAuxModel, data, sUrl);
		},


		_saveTestEnvironments: function(oAuxModel, oTest, keyArr) {
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=tag",
				data = { id: oTest.id, consistencyStamp: oTest.consistencyStamp || "" };
				
			$.each(keyArr, function(i, key) {
				data[key] = oTest[key];
			});

			return this._saveToSRF(oAuxModel, data, sUrl);
		},

		extendScriptsFromAssets: function(oScripts, oAssets, bAddNew) {
			if (!oScripts || !oAssets) {
				return;
			}
			var that = this;
			$.each(oAssets, function(i, asset) {
				for (var j = 0; j < oScripts.length; j++) {
					var script = oScripts[j];
					if (script.primaryResource.id === asset.id) {
						that.extendScript(script, asset);				
					}
				}
				if (bAddNew && j === oScripts.length) {
					var newScript = {
						primaryResource: {
							id: asset.id
						},
						parameters: []
					};
					that.extendScript(newScript, asset);
					oScripts.push(newScript);
				}
			});

		},

		// extend destination script with source script properties with no overwritting
		extendScript: function(destination, source) {
			for (var prop in source) {
				if (!destination.hasOwnProperty(prop)) {
					destination[prop] = source[prop];
				}
			}
			destination.parameters = destination.parameters || [];
			if (source.parameters) {
				for (var i = 0; i < source.parameters.length; i++) {
					if (i >= destination.parameters.length) {
						destination.parameters.push({});
					}
					var sourceParam = source.parameters[i];
					for (var j = 0; j < source.parameters.length; j++) {
						var destParam = destination.parameters[j];
						if ( (destParam.hasOwnProperty("id") && destParam.id === sourceParam.id ) || (destParam.hasOwnProperty("name") && destParam.name === sourceParam.name ))  {
							for (var paramProp in sourceParam) {
								if (!destParam.hasOwnProperty(paramProp)) {
									destParam[paramProp] = sourceParam[paramProp];
								}
							}
							break;
						}
					}
				}
			}
		},

		_convertScriptParamValues: function(paramsData, assetId, assetParams) {
			var newParams = [];
			$.each(paramsData, function(j, param) {
				var newParam = {};
				for (var paramProp in param) {
					newParam[paramProp] = param[paramProp];
				}

				newParam.hasNonDefaultValue = !newParam.value || (newParam.defaultValue === newParam.value) ? false : true; 
				newParam.assetId = assetId;

				// if some parameter was deleted and added again with the same name we should keep its ID
				if (!newParam.id) {
					$.each(assetParams, function(i, assetParam) {
						if (assetParam.name === newParam.name) {
							newParam.id = assetParam.id;

							for (var paramProp1 in assetParam) {
								if( !newParam[paramProp1] ) {
									newParam[paramProp1] = assetParam[paramProp1];
								}
							}	
						}			
					});
				}

				newParams.push(newParam);
			});
			return newParams;
		},

		_convertAssetParamValues: function(oldParamsData, paramsData) {
			var newParams = [];
			$.each(paramsData, function(j, param) {
				var newParam = {};
				
				if( !param.id ) {
					var oldParam = oldParamsData && oldParamsData.find( function getParamByName(oOldParam) {
						return oOldParam.name === param.name;
					});

					if( oldParam ) {
						param.id = oldParam.id;
					}
				}
				for (var paramProp in param) {
					newParam[paramProp] = param[paramProp];
				}

				newParams.push(newParam);
			});
			return newParams;
		},

		_createTestData: function(testData, assetParams) {
			var that = this;
			// fix scripts
			var data = {
				id: testData.testId,
				scripts: [],
				consistencyStamp: testData.test.consistencyStamp
			};
			$.each(testData.scripts, function(i, script) {
				var newScript = {},
					parameters;
				for (var prop in script) {
					newScript[prop] = script[prop];
				}
				parameters = that._convertScriptParamValues(script.parameters,
					(script.primaryResource && script.primaryResource.id) || script.id, assetParams);
				if( parameters && parameters.length ) {
					newScript.parameters = parameters;
				}
				data.scripts.push(newScript);
			});
			// set tags, name, description 
			data.tags = testData.aTags || testData.test.tags || [];
			data.description = testData.sTestDescription || testData.test.description || "";
			data.name = testData.sTestName || testData.test.name || "";
			return data;
		},

		createDefaultTags: function(applicationData, initialTags) {
			var aTags = initialTags || [];
			var sProjectPrefix = "SAP-";
			// TBD - 1) load this prefix from resource here 2) -//- in model code
			/*var sProjectPrefix = that._oResourceBundle ? that._oResourceBundle.getText("newTestProjectNamePrefix") : oContext.i18n.getText("newTestProjectNamePrefix");
			if ( sProjectPrefix ) {
				sProjectPrefix += "-";
			}
			*/
			var nTagLength = this._nSrfTagMaxLength || 50;

			aTags.push({
				name: (sProjectPrefix + applicationData.sProjectName).substr(0, nTagLength),
				id: ""
			});

			if (applicationData.sAppVersion) {
				aTags.push({
					name: applicationData.sAppVersion.substr(0, nTagLength),
					id: ""
				});
			}
			if (applicationData.sAppAccount) {
				aTags.push({
					name: applicationData.sAppAccount.substr(0, nTagLength),
					id: ""
				});
			}
			return aTags;
		},

		// V1 - fetch defects, if succeed enable defect submission
		verifyDefectsRepositoryV1: function(oAuxModel) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/defects" + "?page=0&size=10",
				that = this;

			return Q.sap.ajax(sUrl, {
					type: "GET",
					dataType: "json",
					contentType: "application/json"
				})
				.then(function(oResponse) {
					if (!oResponse || !oResponse.length) {
						var sDefectServerMsg = oAuxModel.getProperty("/srf_context").i18n.getText("NoDefectServerMsg");
						return Q.reject({ statusText: sDefectServerMsg, responseText: sDefectServerMsg});
					}
					if ( oResponse[2] !== "success") {
						return Q.reject(oResponse[0]);
					}

					return oResponse[0];
				}).catch(function(err) {
					return that.srfFailureHandler(err, oAuxModel).then(function() {
						return Q.reject(err);
					});
				});
		},

		// verify in SRF configuration four octane defect manager keys 
		verifyDefectsRepository: function(oAuxModel) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var that = this;
			
			return this._loadSettings( oAuxModel, this.srfOctaneServerUrlKey, true)
			.then( function() {
				var oModel4 = that._oSettingsModel;
				var sServerUrl = oModel4.getProperty("/")[ that.srfOctaneServerUrlKey];								
				if (!sServerUrl) {
					var sDefectServerMsg = oAuxModel.getProperty("/srf_context").i18n.getText("NoDefectServerMsg");
					return Q.reject({ statusText: sDefectServerMsg, responseText: sDefectServerMsg});
				}
			
				return oModel4;
			}).catch(function(err) {
				return that.srfFailureHandler(err, oAuxModel).then(function() {
					return Q.reject(err);
				});
			});
		},
		
		submitDefect: function(oAuxModel, defectName, defectDesc, severity, severityName) {
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");
			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/defect",
				defect = JSON.stringify({
						name: defectName,
						description: defectDesc,
						severity: {
							id: severity,
							name: severityName,
							type: "list_node"
						}
					}),
					that = this;
			
			var oCommon = oAuxModel.getProperty("/srf_common");
			return oCommon.getSrfTenant().then( function (sTenant) {
				return oCommon.addTenantToUrl( sUrl, sTenant);
			}).then( function(sUrlTenant) {

				return Q.sap.ajax(sUrlTenant, {
						type: "POST",
						data: defect,
						dataType: "json",
						contentType: "application/json"
					})
					.then(function(oResponse) {
						if (!oResponse || !oResponse.length || oResponse[2] !== "success") {
							return Q.reject("Defect submit failed");
						}

						return oResponse[0];
					}).catch(function(err) {
						return that.srfFailureHandler(err, oAuxModel).then(function() {
							return Q.reject(err);
						});
					});
			});
		},

		updateTest: function(oAuxModel, testData, scriptParams) {
			if (!testData ) {
				//window.console.error("SRF _updateTest invalid data");
				return Q.reject( { message: "Invalid test data"});
			}
			if ( !testData.testId) {
				//window.console.error("SRF _updateTest invalid data - null ID");
				return Q.reject( { message: "Invalid test data - null ID"});
			}
	
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");

			var sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/tests?include=resource,tag",
				data = this._createTestData(testData, scriptParams);
				
			return this._saveToSRF(oAuxModel, data, sUrl);
		},

		updateScript: function(oAuxModel, scriptData) {
			var data = { parameters: this._convertAssetParamValues(scriptData.backupParams, scriptData.parameters),
						 consistencyStamp: scriptData.consistencyStamp},
				sUrl = this._urlTestsManager + this._getWorkspacePart(oAuxModel) + "/assets/" + scriptData.physicalFileName;
			
			if (!scriptData) {
				//window.console.error("SRF _updateScript invalid script data");
				return Q();
			}
			this.srfDestinationName = oAuxModel && oAuxModel.getProperty("/srf_destination");

			return this._saveToSRF(oAuxModel, data, sUrl);
		},

		createDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		testsColumnsModel: function() {
			if ( this._testsColumnsModel) {
				return this._testsColumnsModel;
			}
			this._testsColumnsModel = new JSONModel();

			this._testsColumnsModel.setData({
				cols: [
				{
					name: "", 
					hAlign: "End",
					width: "20px"
				},
				{
					name: "Test Name", // "{i18n>tableNameColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "Creation Time", //{i18n>creationDateColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "User", //{i18n>ownerColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "Last Run", //{i18n>subTypeColumnTitle}"
					hAlign: "Begin",
					width: "10%" //,
						//             styleClass: "test40"
				}, {
					name: "Env", //{i18n>subTypeColumnTitle}"
					hAlign: "End",
					width: "40px",
					styleClass: "test40"
				}, {
					name: "Scripts", //{i18n>subTypeColumnTitle}"
					hAlign: "End",
					width: "40px",
					styleClass: "test40"
				}, {
					name: "", //{i18n>subTypeColumnTitle}"
					hAlign: "End",
					width: "20px"
				}],
				tests: []
			});

			return this._testsColumnsModel;
		},

		environmentsColumnsModel: function() {
			var oModel = new JSONModel();

			oModel.setData({
				cols: [{
					name: "Type", // "{i18n>tableNameColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "OS", //{i18n>creationDateColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "Browser", //{i18n>ownerColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}, {
					name: "Available", //{i18n>subTypeColumnTitle}"
					hAlign: "Begin",
					width: "auto"
				}],
				environments: []
			});

			return oModel;
		}
	};

});