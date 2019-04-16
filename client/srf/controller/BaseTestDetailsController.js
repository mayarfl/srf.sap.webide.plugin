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
	"../controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"../control/EnvironmentDetails",
	"../control/Browsers",
	"../control/OS",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"../utils/utils",
	"../utils/srfEnvUtils",
	"../utils/mcEnvUtils",
	"../utils/scriptStep",
	"sap/m/GroupHeaderListItem"
], function(BaseController, History, JSONModel, EnvironmentDetails, Browsers, OS,
	Filter, FilterOperator, Utils, SrfEnvUtils, MCEnvUtils, ScriptStepUtils, GroupHeaderListItem) {

	"use strict";
	var TEST_RUNS_PAGE_SIZE = 5;
	var ASSETS_PAGE_SIZE = 20;
	
	var runContext = {"launchOnStart": {  
							"mobileApp": {
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
				
	return BaseController.extend("srf.controller.BaseTestDetailsController", {

		_inRecording: false,	// limit user to open the only one script recording session - not SRF limitation! 
		_inAttendedEdit: false,	// limit user to open the only one asset attended edit session - not SRF limitation!
		
		_sSelectedTabKey : null, // tab key - to be selected if has a value, set by "SRF_Channel", "NewTestCreated" event

		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used tomodify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf srf.view.TestDetails
		 * Maya
		 */
		init: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oScriptsList = this.byId("scriptsList"),
				oRunsList = this.byId("runsList"),	
				oComparisonTable = this.byId("comparisonTable"),
				oStepsList = this.byId("stepsList"),
				oSnapshots = this.byId("snapshots"),
				oSnapshotsWithProp = this.byId("snapshotsWithProp"),
				oScriptRunEnv = this.byId("scriptRunEnv"),
				oParamsEditor = this.byId("paramEditor"),
				oMultiInput = this.byId("multiInput"),
				oGeneralDetailsPanel = this.byId("generalDetailsPanel"),
				oSrfRunsTabBar = this.byId("srfRunsTabBar"),
				oViewModel = new JSONModel({
					_runs : {
						pageNumber: 1,		// due to binding to paginator property pageNumber which is 1-based
						pageSize: TEST_RUNS_PAGE_SIZE,
						totalPages: 1,
						growingThreshold: TEST_RUNS_PAGE_SIZE + 1,
						totalItemsCount: 0
						},
					_assets : {
						searchAssetByName: "",
						assets: [],
						pageNumber: 1,	//paginator property pageNumber which is 1-based
						pageSize: ASSETS_PAGE_SIZE,
						totalPages: 1,	// recalculated each time totalItemsCountfetched 
						growingThreshold: ASSETS_PAGE_SIZE + 1,
						totalItemsCount: 0,
						selectedItemsCount: 0
					},
					busy: true,
					delay: 0,
					scripts: undefined,
					environments: undefined,
					testId: null,
					prefix: "newTest",
					btnLogIcon: jQuery.sap.getModulePath("srf/img/") + "/log.png",
					btnRunIcon: jQuery.sap.getModulePath("srf/img/") + "/run.svg",
					btnSubmitIcon: jQuery.sap.getModulePath("srf/img/") + "/defect.png",
					btnShowStepProperties: {
							icon: jQuery.sap.getModulePath("srf/img/") + "/info.png",
							pressed: false
						},
					menuItemRecordEnabled: true,
					scriptRecordingEnvironment: {},
					runEnvironmentsSelection: true
				}),
				oMCFavoritesModel = new JSONModel({ favorites: [], "new" : true, existing : false, browsers : {}, mobiles : {}, applications : {}  }),
				oMCAddModel = new JSONModel({ favorites: [], "new" : true, existing : false, browsers : {}, mobiles : {}, applications : {}  }),
				oMCBackupFavoritesModel = new JSONModel({ favorites: [], "new" : true, existing : false, browsers : {}, mobiles : {}, applications : {}  }),
				oMCEnvironmentsModel = new JSONModel({ environments: [], noSelection : true, hasSelection : false, showApps: false,
													   rules: [{ id: 1, rule: "="},
															   { id: 2, rule: "<"},
															   { id: 3, rule: "<="},
								   							   { id: 4, rule: ">"},
								   							   { id: 5, rule: ">="}],
								   						labTypes: [{type: "MC", id: "MC"}]
													}),
				oCommon = this.common(),
				that = this;
				
			this._oScriptsList = oScriptsList;
			this._oStepsList = oStepsList;	
			this._oSnapshots = oSnapshots;
			this._oSnapshotsWithProp = oSnapshotsWithProp;
			this._oComparisonTable = oComparisonTable;
			this._oParamEditor = oParamsEditor;
			this._oScriptRunEnv = oScriptRunEnv;
			this._oRunsList = oRunsList;
			this._oMultiInput = oMultiInput;
			this._oGeneralDetailsPanel = oGeneralDetailsPanel;
			this._oSrfRunsTabBar = oSrfRunsTabBar;

			this._envMode = "allEnv";
			
			this._oOSFilter = [];
			this._oBrowserFilter = [];
			
			this.setModel(oViewModel, "testDetails");
			this.setModel(this._Models.environmentsColumnsModel(), "environments");
			this.setModel(oMCFavoritesModel, "mcEnv");
			this.setModel(oMCEnvironmentsModel, "mcEnvironments");
			this.setModel(oMCBackupFavoritesModel, "mcEnvBackup");
			this.setModel(oMCAddModel, "mcAdd");

			if( oCommon ) {
				oCommon._getRealDestinationUrl(this.context(), oCommon)
				.then( function(sUrl) {
					that._srfUrl = sUrl; 
				});
			}
			
			// subscribe on UserPreferenceChanged event
			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "UserPreferenceChanged", this.onSrfPreferencesChanged, this);
			// subscribe on ProjectChanged event  
			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "ProjectChanged", this.onProjectChanged, this);	
			// subscribe on NewTestCreated event 
			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "NewTestCreated", this.onNewTestCreated, this);	
			// subscribe on NewScriptCreated event
			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "NewScriptCreated", this.onNewScriptCreated, this);	
			
			if(oMultiInput)	{
				//*** add checkbox validator
				oMultiInput.addValidator(function(args){
						var prop = args.suggestedToken && args.suggestedToken.mProperties,
							text = prop && prop.text || args.text,
							key = prop && prop.key || "";
	
						that._edttags = true;							
						return new sap.m.Token({key: key, text: text});
				});
				
				oMultiInput.closeMultiLine(function(){
					that._edttags = true;
				});
				
				oMultiInput.openMultiLine(function(){
					that._edttags = false;
				});
			}
		},
		
		onShowStepPropertiesClick: function(oEvent) {
			var bPressed = oEvent.getParameters("pressed").pressed,
				oViewModel = this.getModel("testDetails");
			
			oViewModel.setProperty("/btnShowStepProperties/pressed", bPressed);

			this.common().setUserPreferences( this.context(), "btnShowStepPropertiesPressed", {pressed: bPressed} );

			this._oSnapshots.setProperty("visible", !bPressed);
			this._oSnapshotsWithProp.setProperty("visible", bPressed);
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		
		// real srf url should be updated due to to user preferences changed
		onSrfPreferencesChanged: function(sChannel, sEvent, oData) {
			var that = this;
			return this.common()._getRealDestinationUrl(this.context(), this.common())
				.then( function(sUrl) {
					that._srfUrl = sUrl; 
					that.getRouter().navTo("tests", {}, true);
					return;
				});
		},

		onProjectChanged: function() {
			var that = this;
			var ctx = this.context();
			if (ctx) {
				return ctx.service.rightpane.isVisible().then( function( bVisible) {
					if ( bVisible) { 
						that._navBack();
					}
					return;
				});
			}
			
			return true;
		},
		
		// select "SCRIPT" tab when navigating to test details while the new test creation 
		onNewTestCreated: function(sChannel, sEvent, oEventData) {
			var sSelectedTabKey = oEventData.sSelectedTabKey ? oEventData.sSelectedTabKey : null;
			this._sSelectedTabKey = sSelectedTabKey; 
		},
		
		showTests: function() {
			this._navBack();
		},
		
		_navBack: function() {
			this.getRouter().navTo("tests", {} , true);
		},

		


		// returns Promise
		// retrieves all necessary data from model / file system API
		_recordTest: function (testId) {
			var that = this;
			var	oViewModel = that.getModel("testDetails");			
			
			var oDocument = this.document();
			var sExecutableFilePath =  oDocument ? oDocument.getEntity().getFullPath() : "";
			var platform = oViewModel.getProperty("/platform");
			return Q.spread( [this._generateAutUrl( sExecutableFilePath), this.fetchExecutableFiles( oDocument), this._Models.fetchRecordSettings(this.getModel("srf"), platform)],
				function(sAutUrl, aExecutableFileNames, oSettingsEnv) {
					
				var oEnv = {};

				if(platform === "web") {
					if(oSettingsEnv.mobileCapabilities && oSettingsEnv.mobileCapabilities.length > 0) {
						oEnv =  oSettingsEnv;
					} else {
						oEnv = oSettingsEnv.environments && oSettingsEnv.environments[0];
					}
				} else {
					oEnv = oSettingsEnv;
				}
			
				oViewModel.setProperty("/appUrl", sAutUrl);
				oViewModel.setProperty("/runConfigurationName", "");
				oViewModel.setProperty("/executableFiles", aExecutableFileNames);
				oViewModel.setProperty("/scriptRecordingEnvironment", oEnv);
				
				that.trace( "Default recording environment: " + that.formatter.recordingEnvironment(oEnv), "info");
				
				switch( aExecutableFileNames.length) {
					case 1:
						sExecutableFilePath = aExecutableFileNames[0].sFilePath;
						oViewModel.setProperty("/runConfigurationName",  
							aExecutableFileNames[0]._metadata && aExecutableFileNames[0]._metadata.displayName ||  that.getResourceBundle().getText("urlAboutBlank"));
						// fall down
					default:
						return that._openSelectExecutableDialog()
						.then( function(sAppUrl) {
							// convert blank string to "about:blank"
							oViewModel.setProperty("/appUrl", sAppUrl || that.getResourceBundle().getText("urlAboutBlank"));
							return that._startRecordingSession(testId);
						})
						.fail( function() { // Cancelled by user
							return Q();
						});
				}
			});
		},
		
		onExecutableFileChanged: function(oEvent) {
			// retrieve file path from the oEvent
			var	item = oEvent.getParameter("selectedItem"),
				sFileFullName = item ? item.getProperty("additionalText") : undefined,
				that = this;			
	
			this.onAutUrlChanged();
			
			return this._getRunConfigurations(sFileFullName)
			.then( function(oRunConf) {
				var oCurrRunCfg = ( !oRunConf || (oRunConf && oRunConf.length < 2) ) ? 
									(oRunConf && oRunConf.length > 0 ? oRunConf[0] : null) : oRunConf[0];
			
				
				return that._generateAUTUrlFromRunConfig( sFileFullName, oCurrRunCfg)
				.then(function(appUrl) {
					var	oViewModel = that.getModel("testDetails");
					
					oViewModel.setProperty("/appUrl", appUrl);
					oViewModel.setProperty("/runConfigurationName", oCurrRunCfg ? oCurrRunCfg._metadata.displayName : "");
					that._oSelectExecutabelDialog._record._appUrlInput.setValue(appUrl);
				});
			});
		},
		
		onRunConfigurationChanged: function(oEvent) {
			var	oViewModel = this.getModel("testDetails"),
				item = oEvent.getParameter("selectedItem"),
				sPath = item.getBindingContext("testDetails").getPath(),
				oRunConfiguration = oViewModel.getObject(sPath),
				sFileFullName = oViewModel.getProperty("/sExecutableFilePath");	
				
			var that = this;
			this.onAutUrlChanged();
		
			return this._generateAUTUrlFromRunConfig( sFileFullName, oRunConfiguration)
			.then(function(appUrl) {
				oViewModel.setProperty("/appUrl", appUrl);
				that._oSelectExecutabelDialog._record._appUrlInput.setValue(appUrl);
			});
		},
		
		// change URL input/label error state
		onAutUrlChanged: function() {
			if ( this._oSelectExecutabelDialog._record._appUrlInput) {
				this._oSelectExecutabelDialog._record._appUrlInput.addStyleClass("srfInputNormal");
			}
			if ( this._oSelectExecutabelDialog._record._appUrlErrorLabel ) {
				this._oSelectExecutabelDialog._record._appUrlErrorLabel.setText("");
			}
		},
		
		onChangeRecordEnvironment: function() {
			this._selectedTestEnvs = [];
			this._currTestEnvs = [];
			this.getModel("testDetails").setProperty("/runEnvironmentsSelection", false);
			this._envMode = "recording";
			this._loadRecordingEnvironments(); 
			//this._getNewEnvDialog().open();
		},

		_verifyUrl: function( sTextUrl) {
			if (!sTextUrl) {
				return true; // to be converted to "about:blank"
			}
			if ( sTextUrl === this.getResourceBundle().getText("urlAboutBlank")) {
				return true;
			}
			var urlRegexMttfarina =
			/^([a-z][a-z0-9\*\-\.]*):\/\/(?:(?:(?:[\w\.\-\+!$&'\(\)*\+,;=]|%[0-9a-f]{2})+:)*(?:[\w\.\-\+%!$&'\(\)*\+,;=]|%[0-9a-f]{2})+@)?(?:(?:[a-z0-9\-\.]|%[0-9a-f]{2})+|(?:\[(?:[0-9a-f]{0,4}:)*(?:[0-9a-f]{0,4})\]))(?::[0-9]+)?(?:[\/|\?](?:[\w#!:\.\?\+=&@!$'~*,;\/\(\)\[\]\-]|%[0-9a-f]{2})*)?/i;
			
			var bOk = urlRegexMttfarina.test(sTextUrl);
			if ( this._oSelectExecutabelDialog._record._appUrlErrorLabel ) {
				if ( !bOk) {
					this._oSelectExecutabelDialog._record._appUrlErrorLabel.setText(this.getResourceBundle().getText("appUrlErrorLabel"));
				}
				else {
					this._oSelectExecutabelDialog._record._appUrlErrorLabel.setText("");	
				}
			}
			return bOk;
		},
		
		_generateAutUrl: function ( sFullFileName) {
			var that = this;
			return this.common().generateAUTUrl( sFullFileName)
			.then( function(sAppUrl) {
				that.trace( that.getResourceBundle().getText("newTestGenerateAppUrlDebugMsg",[sAppUrl]), "debug");
				return sAppUrl;
			});
		},		
		
		_generateAUTUrlFromRunConfig: function ( sFullFileName, oRunConfiguration) {
			var that = this;
			return this.common().generateAUTUrlFromRunConfig(sFullFileName, oRunConfiguration)
			.then( function(sAppUrl) {
				that.trace( that.getResourceBundle().getText("newTestGenerateAppUrlDebugMsg",[sAppUrl]), "debug");
				return sAppUrl;
			});
		},
				
		_getRunConfigurations: function( sFullFileName ) {
			var that = this;
			return this.common().getRunConfigurations( sFullFileName )
			.then( function( aConfigurations ) {
				var oViewModel = that.getModel("testDetails");
			//		defaultConfig = [{ _metadata : { displayName : "Default"} }],
		//			arrConfig = aConfigurations && aConfigurations.length > 0 ? aConfigurations : defaultConfig.concat(aConfigurations);
				
				oViewModel.setProperty("/runConfigurations", aConfigurations);
				that._oSelectExecutabelDialog._record._appUrlInput.setValue("about:blank");
			
				return aConfigurations;
			});
		},
		
		_openSelectExecutableDialog: function() {
			var that = this;
			var oDefpromise = Q.defer();
			// create promise resolve it in close
				
			that._oSelectExecutabelDialog = that._getSelectExecutableDialog(function(){
				
				if(that._oSelectExecutabelDialog) {
				 	if( that._oSelectExecutabelDialog.ok === true) {
				 		var sAutUrl = that._oSelectExecutabelDialog._record._appUrlInput.getProperty("value");
						if ( that._verifyUrl(sAutUrl) === true) {
							that._oSelectExecutabelDialog.destroy();
					 		that._oSelectExecutabelDialog = null;
					 		oDefpromise.resolve( $.trim(sAutUrl));

						}
						else {
							that._oSelectExecutabelDialog.open();
							that._oSelectExecutabelDialog._record._appUrlInput.addStyleClass("srfInputError");
				 		}
					 }
					 else {
						
						that._oSelectExecutabelDialog.destroy();
					 	that._oSelectExecutabelDialog = null;
					 	oDefpromise.reject();
				 	}
				}
				 
			});
			that._oSelectExecutabelDialog.open();
	
			return oDefpromise.promise;
		},	

		onCloseSelectExecutableDialog: function( ) {
			this._oSelectExecutabelDialog.ok = true;
			this._oSelectExecutabelDialog.close();
		},	
		
		onCancelSelectExecutableDialog: function() {
			this._oSelectExecutabelDialog.ok = false;
			this._oSelectExecutabelDialog.close();
		},
		// returns promise
		_startRecordingSession: function(testId) {
			
			var oViewModel = this.getModel("testDetails"),
				oTestDefinitionData = {},
				that =this;
			if ( !testId) {
				testId =  oViewModel.getProperty("/testId");
			}	
			oTestDefinitionData.test = { id: testId, platform: oViewModel.getProperty("/platform") ||  oViewModel.getProperty("/test/type")};
			oTestDefinitionData.sTestName = oViewModel.getProperty("/newTestName");
			oTestDefinitionData.sAppUrl = oViewModel.getProperty("/appUrl");

			if (testId) {
				this._inRecording = true;
				this.getView().setBusy(true);
				return 	this.common().startRecordingSession(this.context(), oTestDefinitionData )		
				.finally( function( reply) {
					that._inRecording = false;
					that.getView().setBusy(false);
					return reply;
				});
			}
			else {
				return 	Q.reject({message: "Illegal test id"});	
			}
		},
		
		_getSelectExecutableDialog: function(onClose) {
			if(this._oSelectExecutabelDialog) {
				this.onAutUrlChanged();
				this._oSelectExecutabelDialog._record._executableFileSelect.setSelectedItemId(); 
					
				return this._oSelectExecutabelDialog;
			}

			var oViewModel = this.getModel("testDetails"),
				sPrefix = oViewModel.getProperty("/prefix");
				
			// create dialog via fragment factory
			this._oSelectExecutabelDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.SelectExecutableFilesDialog", this);
			this.getView().addDependent(this._oSelectExecutabelDialog);
			//  compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oSelectExecutabelDialog);
			// attach close callback function
			this._oSelectExecutabelDialog.attachAfterClose( oViewModel, onClose, this);
	
			// add on the dialog  _record property object with DOM elements
			this._oSelectExecutabelDialog._record = {_executableFileSelect: null, _appUrlInput: null};
			this._oSelectExecutabelDialog._record._appUrlErrorLabel = sap.ui.getCore().getElementById(sPrefix + "--srfAppUrlErrorLabelId"); 
			this._oSelectExecutabelDialog._record._appUrlInput = sap.ui.getCore().getElementById(sPrefix + "--srfAppUrlInputId"); 
			this._oSelectExecutabelDialog._record._executableFileSelect = sap.ui.getCore().getElementById(sPrefix + "--srfExecutableFileSelectId"); 
			this._oSelectExecutabelDialog._record._recordingEnvironmentLabel = sap.ui.getCore().getElementById(sPrefix + "--srfScriptRecordingEnvironmentLabel"); 
			
			this._oSelectExecutabelDialog._record._executableFileSelect.setSelectedItemId(); 
			return this._oSelectExecutabelDialog;
		},
		
		_getScriptsDialog: function() {
			// create dialog lazily
			if (!this._oScriptsDialog) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
					
				// create dialog via fragment factory
				this._oScriptsDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.AddScriptsDialog", this);
				this.getView().addDependent(this._oScriptsDialog);
				//  compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oScriptsDialog);
				// attach ENTER keystroke handler after dialog open
				this._oScriptsDialog.attachAfterOpen(  
					oViewModel, 
					function() {
						var that = this;
						$("#" + this._oScriptsDialog.getId()).keydown( function(e) {
						    if (e.keyCode === 13) { 
						    	that.onAddScriptsDlgSave();
							}
						});
					}.bind(this),
					this
				);
			}
			// clean up search field
			var sSearchValue = this.getResourceBundle().getText("scriptSearchPlaceholder");
			var aHeader = this._oScriptsDialog.getSubHeader().getContent();
			$.each( aHeader, function( i, elem) {
				var placeholderProp = null;
				try {
					 placeholderProp = elem.getPlaceholder();
				}
				catch ( err) {
					return true;
				}
				if ( placeholderProp === sSearchValue && elem.getProperty("value") !== "") {
					elem.setProperty("value", "");	
					return false;
				}
			});
			
	
			if(!this._oAddScriptsList) {
				this._oAddScriptsList = sap.ui.getCore().getElementById(oViewModel.getProperty("/prefix") + "--addScriptsList");			
			}				

			return this._oScriptsDialog;
		},
		

		_getNewEnvDialog: function() {
			// create dialog lazily
			if (!this._oNewEnvDialog) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
				
				// create dialog via fragment factory
				this._oNewEnvDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.AddNewEnvDialog", this);
				this.getView().addDependent(this._oNewEnvDialog);
			}
			
			return this._oNewEnvDialog;
		},
		
		_getEnvLabDialog: function() {
			// create dialog lazily
			if (!this._oEnvLabDialog) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
				
				// create dialog via fragment factory
				this._oEnvLabDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.AddMCEnvDialog", this);
				this.getView().addDependent(this._oEnvLabDialog);
			}
			
			return this._oEnvLabDialog;
		},
		
		_getParamDialog: function() {
			// create dialog lazily
			if (!this._oParamDlg) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
				
				// create dialog via fragment factory
				this._oParamDlg = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.ParametersDialog", this);
				this.getView().addDependent(this._oParamDlg);
			}
			
			return this._oParamDlg;
		},
				
		_getSnapshotDialog: function() {
			// create dialog lazily
			if (!this._oSnapshotDialog) {
				// create dialog via fragment factory
				this._oSnapshotDialog = sap.ui.xmlfragment("srf.view.dialog.SnapshotDialog", this);
				// set compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oSnapshotDialog);

				this.getView().addDependent(this._oSnapshotDialog);
				// attach ENTER keystroke handler after dialog open
				this._oSnapshotDialog.attachAfterOpen(  
					this.getModel("testDetails"), 
					function() {
						var that = this;
						$("#" + this._oSnapshotDialog.getId()).keydown( function(e) {
						    if (e.keyCode === 13) { 
						    	that._oSnapshotDialog.close();
							}
						});
					}.bind(this),
					this
				);
			}
			return this._oSnapshotDialog;
		},
		
		_getLogDialog: function() {
			// create dialog lazily
			if (!this._oLogDialog) {
				// create dialog via fragment factory
				this._oLogDialog = sap.ui.xmlfragment("srf.view.dialog.ExecutionLogDialog", this);
				this.getView().addDependent(this._oLogDialog);
	//			this._oLogDialog.setModal(false);
			}
			
			return this._oLogDialog;
		},

//https://webide-webidedemo.dispatcher.hana.ondemand.com/destinations/SRF_NGINX_TECHED_2/rest/storage/assets?page=0&pageSize=5&order=desc&sortby=modificationDate		
		_loadAssets: function( oFetchParams) {
			var that = this;
			var oViewModel = this.getModel("testDetails");
			if ( !oFetchParams) {
				oFetchParams = {
					pageSize: oViewModel.getProperty("/_assets/pageSize") || ASSETS_PAGE_SIZE,
					pageNumber: oViewModel.getProperty("/_assets/pageNumber") || 1,
					sortOrder: "desc",
					sortBy: "modificationDate",		
					likesearch: oViewModel.getProperty("/_assets/searchAssetByName") || ""					
				};
			}

			var pageNumber = oFetchParams.pageNumber || oViewModel.getProperty("/_assets/pageNumber") || 1;
			
			// fix paginator pageNumber is 1-based, SRF - 0-based
			pageNumber -= 1;
			// update page number 0-based
			oFetchParams.pageNumber = pageNumber;
			oFetchParams.type = oViewModel.getProperty("/platform");

			return this._Models.loadAssetsModel(this.getModel("srf"), oFetchParams)
			.then( function (oAssetsData) {

				var pageInfo = that._recalculateAssetsPaginator(oViewModel, oAssetsData);
				if( pageInfo.totalItemsCount === 0 && pageInfo.pageNumber > 0 ) {
					
					oFetchParams.pageNumber = 0;
					return that._Models.loadAssetsModel(that.getModel("srf"), oFetchParams)
					.then( function (oAssetsData) {
						
						var pageInfo = that._recalculateAssetsPaginator(oViewModel, oAssetsData);
						that._updateAssetsPaginatorModel(oViewModel, pageInfo);
						
						return Q();
					});
				} else {
					that._updateAssetsPaginatorModel(oViewModel, pageInfo);
					return Q();
				}
			});
		},
		
		_recalculateAssetsPaginator: function(oViewModel, oAssetsData) {
			// sorted by "modificationDate" and ordered desc while fetch 
			oViewModel.setProperty("/_assets/assets",  oAssetsData.getProperty("/assets"));
			var pageInfo = Utils.Calc.recalcModelPaginatorData(oAssetsData);
			
			return pageInfo;
		},
		
		_updateAssetsPaginatorModel: function(oViewModel, pageInfo) {
			oViewModel.setProperty("/_assets/totalItemsCount", pageInfo.totalItemsCount);
			oViewModel.setProperty("/_assets/pageNumber",  pageInfo.pageNumber);
			oViewModel.setProperty("/_assets/pageSize",  pageInfo.pageSize);
			
			// recalculate the pages number due to totalItemsCount might be changed in SRF
			oViewModel.setProperty("/_assets/totalPages", pageInfo.totalPages);
			
			// assetsTotalPages
			var oAddScriptsList = this._oAddScriptsList;
			if(oAddScriptsList) {
				oAddScriptsList.getBinding("items").filter("", sap.ui.model.FilterType.Application);
				oAddScriptsList.getBinding("items").refresh();
			}
		},

		onAssetsPageSelected: function( oEvent) {
			var targetPage = oEvent.getParameter("targetPage");

			var oViewModel = this.getModel("testDetails");
			var oFetchParams = {
					pageSize: oViewModel.getProperty("/_assets/pageSize") || ASSETS_PAGE_SIZE,
					pageNumber: targetPage,
					sortOrder: "desc",
					sortBy: "modificationDate",		
					likesearch: oViewModel.getProperty("/_assets/searchAssetByName") || ""
				};
				
			oViewModel.setProperty("/_assets/pageNumber", targetPage || 1 );
			
			var that = this;
			if ( oViewModel.getProperty("/_assets/selectedItemsCount") === 0) {
				return this._loadAssets( oFetchParams);
			}
			else {
				return this._saveSelectedScripts().then( function() {
					return that._loadAssets( oFetchParams);
				});
			}
			
		},
		
		_saveSelectedScripts: function() {
			var	that = this,
				i18n = this.getResourceBundle(),
				sTitle = i18n.getText("addSelectedScriptsTitle"),
				sMessage = i18n.getText("addSelectedScriptsText"),
				sTooltip = i18n.getText("addSelectedScriptsTooltip"),
				yesBtn = i18n.getText("yesButton"),
				noBtn = i18n.getText("noButton"),
				oDialogInfo = {title: sTitle, message: sMessage, tooltip: sTooltip, buttons: [yesBtn, noBtn]};
			
			return this._openAreYouSureDialog(oDialogInfo)
				
				.then(function() { 
					//save scripts to the test and remove all( filtered and sorted) selections 
					return that.onSaveScripts();
				})
				
				.catch( function() {
					// stay with search value
					// remove all( filtered and sorted) selections 
					that._oAddScriptsList.removeSelections(true);
					that._oAddScriptsList.getBinding("items").refresh();
					//reset/update model's selectedItemsCount
					that.getModel("testDetails").setProperty("/_assets/selectedItemsCount", that._oAddScriptsList.getSelectedItems().length);
		
					return false;
				});
		},		
		onScriptSelectionChanged: function(oEvent) {
			var oViewModel = this.getModel("testDetails");
				
			var bSelected = oEvent.getParameter("selected");

			// due to filtered out items this._oAddScriptsList.getSelectedItems() returns the only visible items
			oViewModel.setProperty("/_assets/selectedItemsCount", oViewModel.getProperty("/_assets/selectedItemsCount") + ( bSelected ? 1 : -1));
		},
		
		_switchEnvType: function(osType) {
			switch( osType ) {
				case "Mac" :
					this.onSrfMACClick();
					break;
				case "Linux":
					this.onSrfLinuxClick();
					break;
				case "Windows":	
					this.onSrfWindowsClick();
					break;
				default:
					this.onSrfWindowsClick();
					break;	
			}
		},
		
		_setSelectedEnvsForWeb: function(oEnvLoadModel, sEnvPropertyName, oEnvModel, oTestEnvModel) {
			var oEnv = oEnvLoadModel.getProperty("/"),
				testEnvs = oTestEnvModel.getProperty(sEnvPropertyName),			
				oEnvUI = SrfEnvUtils.convertEnvToUI(oEnv),
				currTestEnvs = [];

			oEnvModel.setProperty("/srfEnv", oEnvUI);

			if(!testEnvs.mobileCapabilities) {
				SrfEnvUtils.copyEnvs( ( $.type(testEnvs) === "object" ) ? [testEnvs] : testEnvs, currTestEnvs);
			}
			
			this._loadSelectedSRFBrowsers(oEnvModel, currTestEnvs, oEnvUI);
			this._switchEnvType(testEnvs && testEnvs[0] && testEnvs[0].os.type || "Windows");
			oEnvModel.setProperty("/busy", false);
		},
		
		_setSelectedDevices: function(oSelectedPackage, sPlatform) {
			var oEnvViewModel = this.getModel("mcEnvironments"), 
				oDevicesModel = this._Models.loadMCDevices(this.getModel("srf")),
				that = this;
			
			oDevicesModel.detachRequestCompleted(this.loadDevicesModel);
			this.loadDevicesModel = function() {
				var oDevicesContent = this.getProperty("/");
				if($.type(oDevicesContent) === "object") {
					that._loadSelectedBrowsersFromPackage(oSelectedPackage);
					that._availableDevices = [];
					that._availableVersions = [];
						
					if(sPlatform !== "web") {				
						that.onAndroidClick();
					}
					
					return;
				}
				
				var	oDevices = MCEnvUtils.devicesToUI(oDevicesContent),
					oSelectedDevices = oSelectedPackage && oSelectedPackage.mobiles.devices,
					оSelectedSpecDevices = oSelectedPackage && oSelectedPackage.mobiles.specificdevices,
					oDevicesTypes = MCEnvUtils.getSelectedDevicesTypes(oSelectedDevices, оSelectedSpecDevices),
					oSortedDevices = MCEnvUtils.sortDevicesByNameAndVersion(oDevices);

				MCEnvUtils.updateDevicesAvailability(oDevices, оSelectedSpecDevices);

				that._availableDevices = oSortedDevices.availableDevices;
				that._availableVersions = oSortedDevices.availableVersions;

				$.each( oSelectedDevices, function(j, oSelectedDevice) {
					oSelectedDevice.availableDevices = that._availableDevices[oSelectedDevice.platformName.toLowerCase()];
					oSelectedDevice.availableVersions = that._availableVersions[oSelectedDevice.platformName.toLowerCase()];
				});
				
				oEnvViewModel.setProperty("/devices", oDevices);
				oEnvViewModel.setProperty("/selectedTypes", oDevicesTypes);
 				that._loadSelectedBrowsersFromPackage(oSelectedPackage);

				if(sPlatform !== "web") {				
					that.onAndroidClick();
				}
			};
			
			oDevicesModel.attachRequestCompleted(this.loadDevicesModel);
			
			this.loadDevicesFailed = function() {
				that._loadSelectedBrowsersFromPackage(oSelectedPackage);
				
				if(sPlatform !== "web") {				
					that.onAndroidClick();
				}
			};
	
			oDevicesModel.detachRequestFailed(this.loadDevicesFailed);
			oDevicesModel.attachRequestFailed(this.loadDevicesFailed);	
		},
		
		_setSelectedApps: function(oSelectedPackage) {
			var oEnvViewModel = this.getModel("mcEnvironments"), 
				oAppModel = this._Models.loadMCApplications(this.getModel("srf")),
				that = this;
				
			oAppModel.detachRequestCompleted(this.loadAppsModel);
			this.loadAppsModel = function() {
				var oApps = this.getProperty("/");
				if($.type(oApps) === "object") {
					that._loadSelectedBrowsersFromPackage(oSelectedPackage);
					
					oEnvViewModel.setProperty("/busy", false);
					return;
				}
				
				var oAppsContent = oApps.filter(MCEnvUtils.getApps);
				var oStartupAppsContent = oApps.filter(MCEnvUtils.startupApps).sort(MCEnvUtils.sortApps);
				var oSortedSelected = oSelectedPackage.applications && oSelectedPackage.applications.sort(MCEnvUtils.sortApps);
				
				$.each( oSortedSelected, function(i, oApp) {
					oStartupAppsContent.push(oApp.mobileApp);
				});
															
				oEnvViewModel.setProperty("/apps", oAppsContent);
				oEnvViewModel.setProperty("/statrupapps", oStartupAppsContent);
				that._loadSelectedBrowsersFromPackage(oSelectedPackage);
				oEnvViewModel.setProperty("/busy", false);
			};
	
			oAppModel.attachRequestCompleted(this.loadAppsModel);
			this.loadAppsFailed = function() {
				that._loadSelectedBrowsersFromPackage(oSelectedPackage);

				oEnvViewModel.setProperty("/busy", false);
			};
			
			oAppModel.detachRequestFailed(this.loadAppsFailed);
			oAppModel.attachRequestFailed(this.loadAppsFailed);	
		},
		
		_setSelectedEnvsForMobile: function(oSelectedPackage, sPlatform) {
			this._setSelectedDevices(oSelectedPackage, sPlatform);
			this._setSelectedApps(oSelectedPackage);
		},
		
		_loadRecordingEnvironments: function() {
			var oTestEnvModel = this.getModel("testDetails"),
				oEnvViewModel = this.getModel("mcEnvironments"), 
				oEnvModel = this.getModel("environments"),
				sPlatform = oTestEnvModel.getProperty("/platform"),
				recDevice = oTestEnvModel.getProperty("/scriptRecordingEnvironment"),
				that = this;
				
			oEnvViewModel.setProperty("/busy", true);
			oEnvViewModel.setProperty("/selecteddevices", []);
			this._setSelectedEnvModel(oEnvModel, []);

			switch(sPlatform) {
				case "web":
					var oEnvLoadModel = this._Models.loadEnvironmentsModel( this.getModel("srf"), this._envMode);
						
					oEnvLoadModel.detachRequestCompleted(this.envModelRequestCompletedHandler);
					this.envModelRequestCompletedHandler = function() {
						that._getNewEnvDialog().open();	
						that._setSelectedEnvsForWeb(this, "/scriptRecordingEnvironment", oEnvModel, oTestEnvModel);
						oEnvViewModel.setProperty("/busy", false);
					};
					
					oEnvLoadModel.attachRequestCompleted(this.envModelRequestCompletedHandler);
					this._setSelectedDevices(this._convertRecDeviceToSelectedDevice(recDevice), sPlatform);
					break;
				default:
					this._getNewEnvDialog().open();	
					this._showSelectionPanels(oEnvViewModel, false);
					this._setSelectedEnvsForMobile( this._convertRecDeviceToSelectedDevice(recDevice), sPlatform);
					break;
			}
		},
				
		_convertRecDeviceToSelectedDevice: function(recDevice) {
			var	oSelectedDevices = { mobiles: { specificdevices: [], devices: []}, applications: [], runContext: { launchOnStart: {mobileApp: {}}}},
				oDevices = [],
				oSpecificDevices = [];

			if( recDevice.mobileCapabilities && recDevice.mobileCapabilities.length > 0 ) {
				var device = recDevice.mobileCapabilities[0];
				if( recDevice.mobileCapabilities[0].specificDevice ) {
					oSpecificDevices.push(device.specificDevice.mobileDevice);
				} else {
					oDevices.push(device);
				}
			}

			if( recDevice.runContext ) {
				oSelectedDevices.runContext = recDevice.runContext;
			}

			if( recDevice.mobileApps ) {
				oSelectedDevices.applications = recDevice.mobileApps;

			}	

			oSelectedDevices.mobiles.specificdevices = oSpecificDevices;
			oSelectedDevices.mobiles.devices = oDevices;

			return oSelectedDevices;
		},
		
		_loadEnvironments: function() {
			var oTestEnvModel = this.getModel("testDetails"),
				oEnvViewModel = this.getModel("mcEnvironments"),
				oEnvModel = this.getModel("environments"),
				oFavModel = this.getModel("mcEnv"),
				sPlatform = oTestEnvModel.getProperty("/platform"),
				oSelectedPackage = oFavModel.getObject("/"),
				that = this;
				
			oEnvViewModel.setProperty("/selecteddevices", []);
			oEnvViewModel.setProperty("/selectedspecificdevices", []);
			this._showSelectionPanels(oEnvModel, false);
			this._showSelectionPanels(oEnvViewModel, false);
			this._setSelectedEnvModel(oEnvModel, []);

			oEnvViewModel.setProperty("/busy", true);
			
			switch(sPlatform) {
				case "web":
					var oEnvLoadModel = this._Models.loadEnvironmentsModel( this.getModel("srf"), this._envMode);
					
					oEnvLoadModel.detachRequestCompleted(this.envModelRequestCompletedHandler);
					this.envModelRequestCompletedHandler = function() {
						that._setSelectedEnvsForWeb(this, "/environments", oEnvModel, oTestEnvModel);
						oEnvViewModel.setProperty("/busy", false);
					};

					oEnvLoadModel.attachRequestCompleted(this.envModelRequestCompletedHandler);
					this._setSelectedDevices(oSelectedPackage, sPlatform);
					break;
				default:
					this._showSelectionPanels(oEnvViewModel, false);
					this._setSelectedEnvsForMobile(oSelectedPackage, sPlatform);
					break;
			}
		},		
		
		_loadSelectedSRFBrowsers: function(oEnvModel, oSelectedEnvs, oEnvironments) {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				oSelectedEnvTree = sap.ui.getCore().getElementById(sPrefix + "--srfSelectedEnvTree");
	
			$.each(oSelectedEnvs, function(i, selEnv) {
				$.each(oEnvironments, function(j, type) {
					$.each(type.osArr, function(k, os) {
						if(	SrfEnvUtils.isEqualOS(os, selEnv.os)) {
							$.each(os.browsers, function(l, envBrowser) {
								if(envBrowser.name.toLowerCase() === selEnv.browser.name.toLowerCase()) {
									selEnv.browser.versions = envBrowser.versions;	
									selEnv.os.resolutions = os.resolutions;												
									return;
								}
							});
						}
					});
				});
			});
		
			this._setSelectedEnvModel(oEnvModel, oSelectedEnvs);
			this._showSelectionPanels(oEnvModel, oSelectedEnvs.count > 0);
			oSelectedEnvTree.expandToLevel(1);
		},
		
		_setSelectedEnvModel : function(oEnvModel, oSelectedEnvs) {
			oSelectedEnvs.count = oSelectedEnvs.length;
			oEnvModel.setProperty("/srfSelectedEnv", oSelectedEnvs);
			
			var tree = SrfEnvUtils.convertSelectedEnvToTree(oSelectedEnvs);
			oEnvModel.setProperty("/srfSelectedEnvTree", tree);
		},
		
		onRBUpdateSelect: function(oEvent) {
			var oCombo = sap.ui.getCore().getElementById("envFavorites"),
				oInput = sap.ui.getCore().getElementById("newFavoriteName"),
				bSelected = oEvent.getParameter("selected");

			oCombo.setProperty("enabled", bSelected);
			oInput.setProperty("enabled", !bSelected);
		},

		_loadPackageEnv: function(sPath, sModel) {
			var	oMobilesTable =  this.byId("mobiles"),
				oSpecificTable =  this.byId("specificdevices"),
				oAppTable =  this.byId("applications"),				
				oFavModel = this.getModel(sModel),
				oPackage = oFavModel.getObject(sPath, sModel),
				browsersCount = oPackage.browsers && oPackage.browsers.length || 0,
				appCount =  oPackage.applications && oPackage.applications.length || 0,
				devicesCount = oPackage.mobiles.devices && oPackage.mobiles.devices.length || 0,
				specificDevicesCount = oPackage.mobiles.specificdevices && oPackage.mobiles.specificdevices.length || 0;
				
			oFavModel.setProperty("/new", false);
			oFavModel.setProperty("/existing", true);
 			oFavModel.setProperty("/browsers/existing", browsersCount > 0 );
 			oFavModel.setProperty("/browsers/count", oPackage.browsers && oPackage.browsers.length);
			oFavModel.setProperty("/mobiles/existing", (devicesCount + specificDevicesCount) > 0);
			oFavModel.setProperty("/mobiles/count", devicesCount + specificDevicesCount );
			oFavModel.setProperty("/mobiles/devices/existing", devicesCount > 0);
			oFavModel.setProperty("/mobiles/devices/count", devicesCount);
			oFavModel.setProperty("/mobiles/specificdevices/existing", specificDevicesCount > 0);
			oFavModel.setProperty("/mobiles/specificdevices/count", specificDevicesCount);
			oFavModel.setProperty("/applications/existing", appCount > 0 && (oPackage.type !== "web") ? true : false);
			oFavModel.setProperty("/applications/count", appCount);

			oMobilesTable.bindElement({path: sPath, model: sModel });
			oSpecificTable.bindElement({path: sPath, model: sModel });
			oAppTable.bindElement({path: sPath, model: sModel });
			
			this.getView().setBusy(false);
		},
		
		_loadMCFavorites: function(oFavModel) {
			var oTestModel = this.getModel("testDetails"),
				oBrowsers = oTestModel.getProperty("/environments"),
				oApps = oTestModel.getProperty("/test/mobileApps"),
				oMobiles = oTestModel.getProperty("/test/mobileCapabilities"),
				oRunContext = oTestModel.getProperty("/test/runContext") || $.extend(true, {}, runContext),
				oDevices = [],
				oSelectedApps = [],
				oSpecificDevices = [];
			
			this.getView().setBusy(true);
			$.each(oMobiles, function(i, oMobile) {
				if( oMobile.specificDevice ) {
					oSpecificDevices.push(oMobile.specificDevice.mobileDevice);
				} 
				else {
					oDevices.push(oMobile);
				}
			});
			
			$.each(oApps, function(i, oApp) {
				oSelectedApps.push(oApp);	
			});
			
			oFavModel.setProperty("/mobiles/specificdevices", oSpecificDevices);
			oFavModel.setProperty("/mobiles/devices", oDevices);
			oFavModel.setProperty("/applications", oSelectedApps);
			oFavModel.setProperty("/browsers", oBrowsers);
			oFavModel.setProperty("/runContext", oRunContext);
			
			this._loadPackageEnv("/", "mcEnv");
		},
		
		_loadEnvFromPackage: function(sPackageId) {
			var oAuxModel = this.getModel("srf"),
				oEnvModel =  this._Models.loadEnvFromPackage(oAuxModel, sPackageId),// sPackageId),
				oController = this;
			
			oEnvModel.detachRequestCompleted(this.loadEnvFromPackage);
			this.loadEnvFromPackage = function(oResponse) {
				var oPackage = oResponse.getSource().getProperty("/");
				oController.loadPackage(oPackage, "mcEnv");	
			};
			
			oEnvModel.attachRequestCompleted(this.loadEnvFromPackage);
		},
				
		loadPackage: function(oPackage, sModel) {
			var oFavorites = [],
				oFavModel = this.getModel(sModel),
				index = 0;

			MCEnvUtils.packageToUI(oPackage, oFavModel.getProperty("/app"));
			oFavorites.push(oPackage);
			oFavModel.setProperty("/favorites", oFavorites);

			var sPath = "/favorites/" + index;
			this._loadPackageEnv(sPath, sModel);
		},
		
		_refreshByTimerTestDetailsModel: function( sTestId, bRunsOnly ) {
		
			var oViewModel = this.getModel("testDetails"),
			
				oTestDetailsModel = this._Models.loadTestDetailsModel( this.getModel("srf"), { "id" : sTestId}, bRunsOnly);
	
			oTestDetailsModel.detachRequestCompleted(this.testDetailsRequestCompletedHandler);
			this.testDetailsRequestCompletedHandler = function() {
				oViewModel.setProperty("/testRuns", this.getProperty("/testRuns"));
			};
			
			oTestDetailsModel.attachRequestCompleted(this.testDetailsRequestCompletedHandler);
		},
		
		_loadTestDetailsModel: function( oParams ) {
			var oView = this.getView("details");

			var oObject = oView.getBindingContext().getObject();
			var	sTestId =  oObject ? oObject.id : ( oParams ? oParams.id : "");

			var oViewModel = this.getModel("testDetails"),
				oTestDetailsModel = this._Models.loadTestDetailsModel( this.getModel("srf"), {"id" : sTestId}, false),
				oList = this._oScriptsList;
				
			this._cleanRunTable(oViewModel);
			this._cleanStepsList(oViewModel);

			oTestDetailsModel.detachRequestCompleted(this.testDetailsRequestCompletedHandler);
			this.testDetailsRequestCompletedHandler = function() {
				oViewModel.setProperty("/newTestNameError", "");
				oViewModel.setProperty("/newTestNameErrorShow", false);
				oViewModel.setProperty("/prevTestName", oViewModel.getProperty("/newTestName"));
				oViewModel.setProperty("/test", this.getProperty("/test"));
				oViewModel.setProperty("/assets", this.getProperty("/assets"));
				oViewModel.setProperty("/testRuns", this.getProperty("/testRuns"));
				oViewModel.setProperty("/scripts", this.getProperty("/scripts"));
				oList.getBinding("items").refresh();
			};
			
			oTestDetailsModel.attachRequestCompleted(this.testDetailsRequestCompletedHandler);
		},

		onBindingChange: function() {
			var oViewModel = this.getModel("testDetails"),
				that = this;

			if(!this._srfUrl) {
				this.common()._getRealDestinationUrl(this.context(), this.common())
				.then( function(sUrl) {
					//that.common().log("SRF", sUrl, that.context(), "log");
					that._srfUrl = sUrl; 
				}).done();
				this.common().getUserPreferences(this.context(), "btnShowStepPropertiesPressed")
				.then( function(oData) {
					if (oData) {
						oViewModel.setProperty("/btnShowStepProperties/pressed", oData.pressed);
						that.byId("btnShowStepProperties").setProperty("pressed", oData.pressed);
						
						var bScriptRunVisible = that.byId("scriptRun").getProperty("visible");
						that._oSnapshots.setProperty("visible", bScriptRunVisible && !oData.pressed);
						that._oSnapshotsWithProp.setProperty("visible", bScriptRunVisible && oData.pressed);
					}
				}).done();
			}
			
			this._loadAllTags(oViewModel);
			
			this._oMultiInput.getBinding("tokens").refresh();
		},
		
		_loadAllTags: function(oViewModel) {
			var that = this,
			 	oTagsModel = this._Models.loadTagsModel(this.getModel("srf"));
			
			oTagsModel.detachRequestCompleted(this.oTagsModelCompletedHandler);
			this.oTagsModelCompletedHandler = function() {
				var allTags = this.getProperty("/tags"),
					testTags = oViewModel.getProperty("/tags");
					
				//remove the existing tags in test to not show them in suggestions
				$.each(testTags, function(i, testTag) {
					var tagIndex = allTags.findIndex( function isExists(oTag) {																
																	return testTag.id === oTag.id; });
					allTags.splice(tagIndex, 1);												
				});
				
				oViewModel.setProperty("/allTags", allTags);
				that._oMultiInput.getBinding("suggestionItems").refresh(); 
			};		
			oTagsModel.attachRequestCompleted(this.oTagsModelCompletedHandler);
		},
		
		onWindowsClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel"),
				oEnvViewModel = this.getModel("mcEnvironments");
				
			winBrowsersPanel.setProperty("visible", true);
			mobilesPanel.setProperty("visible", false);
			oEnvViewModel.setProperty("/showApps", false);
		},

		onSRFWinPanelExpand: function(oEvent) {
			var src = oEvent.getSource(),
				panels = src.getParent().getItems(),
				params =  oEvent.getParameters();

			if( params.expand ) {
				$.each( panels, function(i, panel) {
					if( panel.getId() !== params.id ) {
						panel.setProperty("expanded", false);
					} 
				});
			}			
		},
		
		onSrfWindowsClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				oEnvModel = this.getModel("environments"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),
				linuxPanel = sap.ui.getCore().getElementById(sPrefix + "--srfLinuxPanel"),
				macPanel = sap.ui.getCore().getElementById(sPrefix + "--srfmacPanel"),	
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel");
				
			oEnvModel.setProperty("/srfEnv/envType", "Windows");
			oEnvModel.setProperty("/srfEnv/envBrowsersExists", oEnvModel.getProperty("/srfEnv/Windows/osArr").length > 0 ? false : true);
			winBrowsersPanel.setProperty("visible", true);
			macPanel.setProperty("visible", false);				
			linuxPanel.setProperty("visible", false);
			mobilesPanel.setProperty("visible", false);	
		},
		
		onSrfMACClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				oEnvModel = this.getModel("environments"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),
				linuxPanel = sap.ui.getCore().getElementById(sPrefix + "--srfLinuxPanel"),
				macPanel = sap.ui.getCore().getElementById(sPrefix + "--srfmacPanel"),	
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel");
				
			oEnvModel.setProperty("/srfEnv/envType", "Mac");
			oEnvModel.setProperty("/srfEnv/envBrowsersExists", oEnvModel.getProperty("/srfEnv/Mac/osArr").length > 0 ? false : true);
			winBrowsersPanel.setProperty("visible", false);
			macPanel.setProperty("visible", true);				
			linuxPanel.setProperty("visible", false);
			mobilesPanel.setProperty("visible", false);	
		},
		
		onSrfLinuxClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				oEnvModel = this.getModel("environments"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),
				linuxPanel = sap.ui.getCore().getElementById(sPrefix + "--srfLinuxPanel"),
				macPanel = sap.ui.getCore().getElementById(sPrefix + "--srfmacPanel"),	
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel");
				
			oEnvModel.setProperty("/srfEnv/envType", "Linux");
			oEnvModel.setProperty("/srfEnv/envBrowsersExists", oEnvModel.getProperty("/srfEnv/Linux/osArr").length > 0 ? false : true);
			winBrowsersPanel.setProperty("visible", false);
			macPanel.setProperty("visible", false);				
			linuxPanel.setProperty("visible", true);
			mobilesPanel.setProperty("visible", false);	
		},

		deviceOsClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				oEnvViewModel = this.getModel("mcEnvironments"),
				oDevicesOS = oEnvViewModel.getProperty("/devices"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),	
				linuxPanel = sap.ui.getCore().getElementById(sPrefix + "--srfLinuxPanel"),
				macPanel = sap.ui.getCore().getElementById(sPrefix + "--srfmacPanel"),	
				specDevicesList = sap.ui.getCore().getElementById(sPrefix + "--specDevices"),
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel"),
				sPath = "",
				that = this;
			
			$.each(oDevicesOS, function(i, oDeviceOS) {
				if(oDeviceOS.name.toLowerCase() === that.envSelected.toLowerCase()) {
					sPath = "/devices/" + i;
					return;
				}
			});
			
			specDevicesList.bindElement({path: sPath, model: "mcEnvironments" });			
			oEnvViewModel.setProperty("/selectedOS", this.addBtnText);
			oEnvViewModel.setProperty("/selectedOSImage", this.addBtnImage);
			oEnvViewModel.setProperty("/showApps", false);

			winBrowsersPanel.setProperty("visible", false);
			macPanel.setProperty("visible", false);				
			linuxPanel.setProperty("visible", false);
			mobilesPanel.setProperty("visible", true);	
		},
		
		onAndroidClick: function() {
			
			this.envSelected = "Android";
			this.addBtnText = "an Android";
			this.addBtnImage = jQuery.sap.getModulePath("srf/img/os/color") + "/android_white.png";
			
			this.deviceOsClick();
		},
				
		oniOSClick: function() {
			this.envSelected = "iOS";
			this.addBtnText = "an iOS";
			this.addBtnImage = jQuery.sap.getModulePath("srf/img/os/color") + "/ios_white.png";
			
			this.deviceOsClick();
		},
				
		onAllAppsClick: function() {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				oEnvViewModel = this.getModel("mcEnvironments"),
				oSelectedDevicesTypes = oEnvViewModel.getProperty("/selectedTypes"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",
				winBrowsersPanel = sap.ui.getCore().getElementById(sPrefix + "--winBrowsersPanel"),	
				mobilesPanel = sap.ui.getCore().getElementById(sPrefix + "--mobilesPanel");
			
			oEnvViewModel.setProperty("/showApps", true);
			
			winBrowsersPanel.setProperty("visible", false);
			mobilesPanel.setProperty("visible", false);	
			
			this.getRelevantApps(oEnvViewModel, oSelectedDevicesTypes);
		},	
		
		getRelevantApps: function(oEnvViewModel, oSelectedDevicesTypes) {
			var oAllApps = oEnvViewModel.getProperty("/apps"),
				oRelevantApps = [];
		
			if(oSelectedDevicesTypes && oSelectedDevicesTypes.length > 0 && oAllApps) {
				oRelevantApps = oAllApps.filter( function fiterAppsByType(oApp) {
					return oSelectedDevicesTypes.find( function isExists(oType) {
						return oApp.type.toLowerCase() === oType;
					});
				});
			} else {
				oRelevantApps = oAllApps;
			}
			
			oEnvViewModel.setProperty("/relevantApps", oRelevantApps);
		},
		
		onMACClick: function() {

		},	
		
		onLinuxClick: function() {
	//		alert("onWindowsClick");	
		},
		
		onWindowsPhoneClick: function() {
			this.envSelected = "WP";
			this.addBtnText = "a Windows Phone";
			
			this.deviceOsClick();
		},		
		
		onLabEnvSelected: function(oSrc, osObj, oBrowser) {
			var oEnvModel = this.getModel("mcEnvironments"),
				selectedBrowsers = oEnvModel.getProperty("/selectedbrowsers") || [];
			
			selectedBrowsers.push({os:osObj, browser:oBrowser});
			selectedBrowsers.count = selectedBrowsers.length;
			oEnvModel.setProperty("/selectedbrowsers", selectedBrowsers);
		},
		
		updateDevicesModel: function(oEnvModel, ruleDevices, specDevices) {
			var oSelectedDevicesTypes = [];
					 	
			oEnvModel.setProperty("/selecteddevices", ruleDevices);
		 	oEnvModel.setProperty("/selectedspecificdevices", specDevices);
		 	oEnvModel.setProperty("/totaldevicescount", ruleDevices.length + specDevices.length);
		 	
		 	oSelectedDevicesTypes = MCEnvUtils.getSelectedDevicesTypes(ruleDevices, specDevices);
			oEnvModel.setProperty("/selectedTypes", oSelectedDevicesTypes);
		 	this.getRelevantApps(oEnvModel, oSelectedDevicesTypes);
		 	
		 	this._showSelectionPanels(oEnvModel, ruleDevices.length + specDevices.length > 0 );
		},
		
		onAddDevice: function() {
			var oEnvModel = this.getModel("mcEnvironments"),
				oOS = this.envSelected,
				specDevices = oEnvModel.getProperty("/selectedspecificdevices") || [],
				ruleDevices = oEnvModel.getProperty("/selecteddevices") || [],
				oDevice = {
							os:oOS,
							platformName:oOS,
							platformVersionOperator: "<",
							deviceName: "", 
							availableDevices: this._availableDevices[oOS.toLowerCase()], 
							availableVersions: this._availableVersions[oOS.toLowerCase()]};

			if ( this.getModel("testDetails").getProperty("/runEnvironmentsSelection") === true) {
				this._addDeviceToModel(oEnvModel, ruleDevices, specDevices, oDevice);
			}
			else {
				if(this._isDifferentOSType(ruleDevices, specDevices, oDevice))
					this._removeAllSelectedApps(oEnvModel);
					
				ruleDevices[0] = oDevice;
				specDevices.pop();

				var oBrowsersModel = this.getModel("environments"),
					selectedBrowsers = oBrowsersModel.getProperty("/srfSelectedEnv") || [];

				selectedBrowsers = [];
			
				this._setSelectedEnvModel(oBrowsersModel, selectedBrowsers);
				this._showSelectionPanels(oBrowsersModel, false);
			}
			
			this.updateDevicesModel(oEnvModel, ruleDevices, specDevices);
		},
		
		onDeleteSelectedDevice: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				ruleDevices = oEnvModel.getProperty("/selecteddevices") || [],
				specDevices = oEnvModel.getProperty("/selectedspecificdevices") || [],
				deviceIndex = oEvent.getSource().getBindingContext("mcEnvironments").getPath().split("/")[2];

			ruleDevices.splice(deviceIndex, 1);
			
		 	this.updateDevicesModel(oEnvModel, ruleDevices, specDevices);
		},
		
		onDeleteSelectedSpecificDevice: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				specDevices = oEnvModel.getProperty("/selectedspecificdevices") || [],
				ruleDevices = oEnvModel.getProperty("/selecteddevices") || [],
				deviceIndex = oEvent.getSource().getBindingContext("mcEnvironments").getPath().split("/")[2];

			specDevices.splice(deviceIndex, 1);
			
			this.updateDevicesModel(oEnvModel, ruleDevices, specDevices);
		},
		
		onStartupAppChanged: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				item = oEvent.getParameter("selectedItem"),
				sPath = item.getBindingContext("mcEnvironments").getPath(),
				oApp = oEnvModel.getObject(sPath);
				
			oEnvModel.setProperty("/selectedruncontext/launchOnStart/mobileApp", oApp);
		},
		
		onAppSelectionChange: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oSource = oEvent.getSource(),
				sPath = oSource.getSelectedItem().getBindingContext("mcEnvironments").getPath(),
				oApp = oEnvModel.getObject(sPath),
				oStartupAppsContent = oEnvModel.getProperty("/statrupapps") || [],
				oSelectedRunContext = oEnvModel.getProperty("/selectedruncontext") || {},
				selectedApps = oEnvModel.getProperty("/selectedmobileapps") || [];//,

			if( !selectedApps.find( function isExists(oStartApp) {
												return oApp.id === oStartApp.mobileApp.id; }) ) {

				selectedApps.push({mobileApp: oApp, mobileAppContext: MCEnvUtils.getApplicationContext(oApp)});
			}
			
			if( !oStartupAppsContent.find( function isExists(oStartApp) {
												return oApp.id === oStartApp.id; }) ) {

				oStartupAppsContent.push(oApp);
			}
			
			oSelectedRunContext.launchOnStart.mobileApp = oApp;
			selectedApps.count = selectedApps.length;		
			oEnvModel.setProperty("/selectedmobileapps", selectedApps);
			oEnvModel.setProperty("/statrupapps", oStartupAppsContent);
			oEnvModel.setProperty("/selectedruncontext", null);
			oEnvModel.setProperty("/selectedruncontext", oSelectedRunContext);

		 	this._showSelectionPanels(oEnvModel, selectedApps.count > 0 );	
		},

		onDeleteSelectedApp: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				selectedApps = oEnvModel.getProperty("/selectedmobileapps") || [],
				sPath = oEvent.getSource().getBindingContext("mcEnvironments").getPath(),
				oApp = oEnvModel.getObject(sPath),
				oAppId = oApp.mobileApp.id,
				appIndex = sPath.split("/")[2],
				oStartupAppsContent = oEnvModel.getProperty("/statrupapps") || [],
				startAppIndex = oStartupAppsContent.findIndex( function isExists(oStartApp) {																
																	return oAppId === oStartApp.id; }),	
				oRunContext = oEnvModel.getProperty("/selectedruncontext") ||{};

			if(oRunContext.launchOnStart.mobileApp.id === oAppId) {
				oRunContext = $.extend(true, {}, runContext);
			}

			selectedApps.splice(appIndex, 1);
			oStartupAppsContent.splice(startAppIndex, 1);
			selectedApps.count = selectedApps.length;
			oEnvModel.setProperty("/selectedmobileapps", selectedApps);
			oEnvModel.setProperty("/statrupapps", oStartupAppsContent);
			oEnvModel.setProperty("/selectedruncontext", oRunContext);
		},
		
		onDeviceSearch: function(oEvent) {
			if(!this._oSpecDevicesList) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
					
				this._oSpecDevicesList = sap.ui.getCore().getElementById(sPrefix + "--specDevices");			
			}				

			this._applySearch(oEvent.getParameter("query"), this._oSpecDevicesList, "nickName");
		},

		onDeviceLiveSearch: function(oEvent) {
			if(!this._oSpecDevicesList) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
					
				this._oSpecDevicesList = sap.ui.getCore().getElementById(sPrefix + "--specDevices");			
			}				
			
			this._applySearch(oEvent.getSource().getValue(), this._oSpecDevicesList, "nickName");
		},		
		
		onAppSearch: function(oEvent) {
			if(!this._oAppsList) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
					
				this._oAppsList = sap.ui.getCore().getElementById(sPrefix + "--appsList");			
			}				

			this._applySearch(oEvent.getParameter("query"), this._oAppsList, "name");
		},

		onAppLiveSearch: function(oEvent) {
			if(!this._oAppsList) {
				var oViewModel = this.getModel("testDetails"),
					sPrefix = oViewModel.getProperty("/prefix");
					
				this._oAppsList = sap.ui.getCore().getElementById(sPrefix + "--appsList");			
			}				
			
			this._applySearch(oEvent.getSource().getValue(), this._oAppsList, "name");
		},
		
		// /**
		//  * Internal helper method to apply both filter and search state together on the list binding
		//  * @param {object} oTableSearchState an array of filters for the search
		//  * @private
		//  */
		// _applySearch: function(sQuery) {
		// 	var oTableSearchState = [];

		// 	if (sQuery && sQuery.length > 0) {
		// 		oTableSearchState = [new Filter("name", FilterOperator.Contains, sQuery)];
		// 	}

		// 	var oViewModel = this.getModel();
		// 	this._oTable.getBinding("items").filter(oTableSearchState, sap.ui.model.FilterType.Application);
		// 	// changes the noDataText of the list in case there are no filter results
		// 	if (oTableSearchState.length !== 0) {
		// 		oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("testListNoDataWithSearchText"));
		// 	}
		// },
		
		_getDeviceOSName: function(oDevice) {
			return oDevice.os.name || oDevice.os;
		},
		
		_addDeviceToArray: function(oDevice, ruleDevices, specDevices) {
			if( oDevice.os.name ) {
				var specDeviceIndex = specDevices.findIndex( function isExists(oSpecDevice) {
												return oSpecDevice.udid === oDevice.udid; });
				if( specDeviceIndex < 0 )								
					specDevices.push(oDevice);
			}
			else 
				ruleDevices.push(oDevice);
		},	
		
		_removeAllSelectedApps: function(oEnvModel) {
			var oStartupAppsContent = oEnvModel.getProperty("/statrupapps") || [],
				oSelectedRunContext = oEnvModel.getProperty("/selectedruncontext") || {},
				selectedApps = oEnvModel.getProperty("/selectedmobileapps") || [];//,

			$.each(selectedApps, function(i, oApp) {
				var startAppIndex = oStartupAppsContent.findIndex( function isExists(oStartApp) {
												return oApp.id === oStartApp.id; });
												
				if( startAppIndex ) {
					oStartupAppsContent.splice(startAppIndex, 1);
				}
			});
			
			selectedApps = [];
			oSelectedRunContext.launchOnStart.mobileApp.id = oStartupAppsContent[0].id;
			
			oEnvModel.setProperty("/selectedmobileapps", selectedApps);
			oEnvModel.setProperty("/statrupapps", oStartupAppsContent);
			oEnvModel.setProperty("/selectedruncontext", null);
			oEnvModel.setProperty("/selectedruncontext", oSelectedRunContext);
		},
		
		_replaceDeviceBecauseOSType: function(oEnvModel, ruleDevices, specDevices, oDevice) {
				var	that = this,
					newDeviceOS = this._getDeviceOSName(oDevice),
					selectedDeviceOS =  (specDevices.length > 0 && this._getDeviceOSName(specDevices[0])) || 
										(ruleDevices.length > 0 && this._getDeviceOSName(ruleDevices[0])),
					i18n = this.getResourceBundle(),
					sTitle = i18n.getText("changeOSTypeTitle"),
					sMessage = i18n.getText("changeOSType", [selectedDeviceOS, newDeviceOS]),
					sTooltip = i18n.getText("changeOSTypeTooltip"),
					yesBtn = i18n.getText("yesButton"),
					noBtn = i18n.getText("noButton"),
					oDialogInfo = {title: sTitle, message: sMessage, tooltip: sTooltip, buttons: [yesBtn, noBtn]};


				return this._openAreYouSureDialog(oDialogInfo).then(function() { 
					that._removeAllSelectedApps(oEnvModel);
					
					specDevices = [];
					ruleDevices = [];
					
					that._addDeviceToArray(oDevice, ruleDevices, specDevices);
					that.updateDevicesModel(oEnvModel, ruleDevices, specDevices);
					return;
				});	
		},
		
		_isDifferentOSType: function(ruleDevices, specDevices, oDevice) {
			var newDeviceOS = this._getDeviceOSName(oDevice),
				selectedDeviceOS =  (specDevices.length > 0 && this._getDeviceOSName(specDevices[0])) || 
									(ruleDevices.length > 0 && this._getDeviceOSName(ruleDevices[0]));
			
			return (specDevices.length > 0 || ruleDevices.length > 0) && selectedDeviceOS !== newDeviceOS;
		},
		
		_addDeviceToModel: function(oEnvModel, ruleDevices, specDevices, oDevice ) {
			if(this._isDifferentOSType(ruleDevices, specDevices, oDevice)) {
				this._replaceDeviceBecauseOSType(oEnvModel, ruleDevices, specDevices, oDevice);
			} else {
				this._addDeviceToArray(oDevice, ruleDevices, specDevices);
			}
			
			return true;
		},
		
		onSpecificDeviceSelectionChange: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oSource = oEvent.getSource(),
				sPath = oSource.getSelectedItem().getBindingContext("mcEnvironments").getPath(),
				oDevice = oEnvModel.getObject(sPath),
				specDevices = oEnvModel.getProperty("/selectedspecificdevices") || [],
				ruleDevices = oEnvModel.getProperty("/selecteddevices") || [];

			if ( this.getModel("testDetails").getProperty("/runEnvironmentsSelection") === true) {
				this._addDeviceToModel(oEnvModel, ruleDevices, specDevices, oDevice);
			}
			else {
				if(this._isDifferentOSType(ruleDevices, specDevices, oDevice))
					this._removeAllSelectedApps(oEnvModel);
					
				specDevices[0] = oDevice;
				ruleDevices.pop();

				var oBrowsersModel = this.getModel("environments"),
					selectedBrowsers = oBrowsersModel.getProperty("/srfSelectedEnv") || [];

				selectedBrowsers = [];
			
				this._setSelectedEnvModel(oBrowsersModel, selectedBrowsers);
				this._showSelectionPanels(oBrowsersModel, false);
			}

		 	this.updateDevicesModel(oEnvModel, ruleDevices, specDevices);
		},
		
		onRuleDeviceSelectionChange: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oSource = oEvent.getSource(),
				sPath = oSource.getBindingContext("mcEnvironments").getPath(),
				oDevice = oEnvModel.getObject(sPath),
				oOS = this.envSelected,
				selectedDevices = oEnvModel.getProperty("/selecteddevices") || [];//,

			selectedDevices.push({os:oOS, platformName:oOS, deviceName: oDevice.logicName, source: "MC Lab"});
			selectedDevices.count = selectedDevices.length;
		 	oEnvModel.setProperty("/selecteddevices", selectedDevices);

		 	this._showSelectionPanels(oEnvModel, selectedDevices.count > 0 );	
		},
		
		onBrowserSelected: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oBrowsersList = oEvent.getSource().getParent(),
				oOSPanel = oBrowsersList.getParent(),
				oOS = oEnvModel.getObject(oOSPanel.getBindingContext("mcEnvironments").getPath()),
				oBrowser = oEnvModel.getObject(oBrowsersList.getBindingContext("mcEnvironments").getPath()),
				selectedBrowsers = oEnvModel.getProperty("/selectedbrowsers") || [];//,

			
			selectedBrowsers.push({os:oOS, browser:oBrowser});
			selectedBrowsers.count = selectedBrowsers.length;
		 	oEnvModel.setProperty("/selectedbrowsers", selectedBrowsers);

		 	this._showSelectionPanels(oEnvModel, selectedBrowsers.count > 0 );
		},
			
		onSRFBrowserSelected: function(oEvent) {
			var oEnvModel = this.getModel("environments"),
				oBrowsersList = oEvent.getSource().getParent(),
				oOSPanel = oBrowsersList.getParent(),
				oOS = oEnvModel.getObject(oOSPanel.getBindingContext("environments").getPath()),
				oBrowser = oEnvModel.getObject(oBrowsersList.getBindingContext("environments").getPath()),
				selectedBrowsers = oEnvModel.getProperty("/srfSelectedEnv") || [],
				oViewModel = this.getModel("testDetails"),
				sPrefix = oViewModel.getProperty("/prefix"),
				oSelectedEnvTree = sap.ui.getCore().getElementById(sPrefix + "--srfSelectedEnvTree"),
				newBrowser = {	description : oBrowser.description,
								name : oBrowser.name,
								version : oBrowser.version || oBrowser.versions[oBrowser.versions.length - 1].version,
								resolution : oBrowser.resolution || oOS.defaultResolution,
								versions : oBrowser.versions,
								visible : oBrowser.visible };

			if ( this.getModel("testDetails").getProperty("/runEnvironmentsSelection") === true) {
				selectedBrowsers.push({ os : oOS, browser : newBrowser, resolution : newBrowser.resolution});
			}
			else {
				selectedBrowsers[0] = {os : oOS, browser : newBrowser, resolution : newBrowser.resolution};

				var oDevicesModel = this.getModel("mcEnvironments"),				
					specDevices = oEnvModel.getProperty("/selectedspecificdevices") || [],
					ruleDevices = oEnvModel.getProperty("/selecteddevices") || [];
			
				specDevices.pop();
				ruleDevices.pop();

				this.updateDevicesModel(oDevicesModel, ruleDevices, specDevices);
			}

			this._setSelectedEnvModel(oEnvModel, selectedBrowsers);
		 	this._showSelectionPanels(oEnvModel, selectedBrowsers.count > 0 );
		 	
		 	oSelectedEnvTree.expandToLevel(1);
		},	
				
		onDeleteSelectedSRFBrowser: function(oEvent) {
			var oEnvModel = this.getModel("environments"),
				selectedBrowsers = oEnvModel.getProperty("/srfSelectedEnv") || [],
				sPath = oEvent.getSource().getBindingContext("environments").getPath(),	
				split = sPath.split("/"),
				browserIndex = -1,
				oOS = oEnvModel.getObject("/" + split[1] + "/" + split[2] + "/" + split[3]),
				oBrowser = oEnvModel.getObject(sPath);

			$.each(selectedBrowsers, function(i, selected) {
				var curr = { os: { name: oOS.name, version: oOS.version}, 
							browser: { name: oBrowser.name, version: oBrowser.version}, 
							resolution: oBrowser.resolution };

				if( SrfEnvUtils.isEqualEnv(selected, curr) ) {
					browserIndex = i;
					return browserIndex;
				}
			});
			
			selectedBrowsers.splice(browserIndex, 1);
			this._setSelectedEnvModel(oEnvModel, selectedBrowsers);
		},
		
		onDeleteSRFBrowser: function(oEvent) {
			var oTestModel = this.getModel("testDetails"),
				selectedBrowsers = oTestModel.getProperty("/environments") || [],
				sBRPath = oEvent.getSource().getBindingContext("testDetails").getPath(),	
				sPath = oEvent.getSource().getBindingContext().getPath(),
				browserIndex = -1,
				oEnv = oTestModel.getObject(sBRPath),
				oOS = oEnv.os,
				oBrowser = oEnv.browser,
				oTest = oTestModel.getProperty("/test"),
				that = this;

			$.each(selectedBrowsers, function(i, selected) {
				var curr = { os: { name: oOS.name, version: oOS.version}, 
							browser: { name: oBrowser.name, version: oBrowser.version}, 
							resolution: oBrowser.resolution };
				if( SrfEnvUtils.isEqualEnv(selected, curr) ) {
					browserIndex = i;
					return browserIndex;
				}
			});
			
			selectedBrowsers.splice(browserIndex, 1);

			oTest.environments = selectedBrowsers;
			oTestModel.setProperty("/environments", selectedBrowsers);
			
			return this._Models.saveTestEnvironments(this.getModel("srf"), oTest, ["environments"])
 			.then( function() {
				that._bindView(sPath);
			})
			.finally( function() {
			}); 		
		},		
		
		onDeleteDevice: function(oEvent) {
			var oTestModel = this.getModel("testDetails"),
				oFavModel = this.getModel("mcEnv"),
				selectedDevices = oTestModel.getProperty("/test/mobileCapabilities") || [],
				sBRPath = oEvent.getSource().getBindingContext("mcEnv").getPath(),	
				sPath = oEvent.getSource().getBindingContext().getPath(),
				oDeletedDevice = oFavModel.getObject(sBRPath),
				oTest = oTestModel.getProperty("/test"),
				that = this,
				deviceIndex = selectedDevices.findIndex( function isExists(oDevice) {
																var bEqual = false;
																
																bEqual = (oDevice.platformName === oDeletedDevice.platformName) &&
																		 (oDevice.platformVersionOperator === oDeletedDevice.platformVersionOperator) &&
																		 (oDevice.platformVersion === oDeletedDevice.platformVersion) &&
																		 (oDevice.source === oDeletedDevice.source) &&
																		 (oDevice.deviceName === oDeletedDevice.deviceName);
																return bEqual; });
			selectedDevices.splice(deviceIndex, 1);

			oTest.mobileCapabilities = selectedDevices;
			oTestModel.setProperty("/mobileCapabilities", selectedDevices);
			
			return this._Models.saveTestEnvironments(this.getModel("srf"), oTest, ["mobileCapabilities"])
 			.then( function() {
				that._bindView(sPath);
			})
			.finally( function() {
			}); 		
		},
		
		onDeleteSpecificDevice: function(oEvent) {
			var oTestModel = this.getModel("testDetails"),
				oFavModel = this.getModel("mcEnv"),
				selectedDevices = oTestModel.getProperty("/test/mobileCapabilities") || [],
				sBRPath = oEvent.getSource().getBindingContext("mcEnv").getPath(),	
				sPath = oEvent.getSource().getBindingContext().getPath(),
				oDeletedDevice = oFavModel.getObject(sBRPath),
				oTest = oTestModel.getProperty("/test"),
				that = this,
				deviceIndex = selectedDevices.findIndex( function isExists(oDevice) {
														var oSpecDevice = oDevice.specificDevice && oDevice.specificDevice.mobileDevice,
															bRet = false;

														if( oSpecDevice && 
															( (oSpecDevice.udid && oSpecDevice.udid === oDeletedDevice.udid) || 
															  (oSpecDevice.uiud && oSpecDevice.uiud === oDeletedDevice.uiud) ) ) {
															bRet = true;
														}
						
														return bRet;});
			selectedDevices.splice(deviceIndex, 1);

			oTest.mobileCapabilities = selectedDevices;
			oTestModel.setProperty("/mobileCapabilities", selectedDevices);
			
			return this._Models.saveTestEnvironments(this.getModel("srf"), oTest, ["mobileCapabilities"])
 			.then( function() {
				that._bindView(sPath);
			})
			.finally( function() {
			}); 	
		},
		
		onDeleteApp: function(oEvent) {
			var oTestModel = this.getModel("testDetails"),
				oFavModel = this.getModel("mcEnv"),
				selectedApps = oTestModel.getProperty("/test/mobileApps") || [],
				sBRPath = oEvent.getSource().getBindingContext("mcEnv").getPath(),	
				oDeletedApp = oFavModel.getObject(sBRPath),	
				sPath = oEvent.getSource().getBindingContext().getPath(),		
				oTest = oTestModel.getProperty("/test"),
				that = this,
				appIndex = selectedApps.findIndex( function isExists(oApp) {																
																	return oDeletedApp.mobileApp.id === oApp.mobileApp.id; }),
				oRunContext = oTestModel.getProperty("/test/runContext") ||{};

			if(oRunContext.launchOnStart.mobileApp.id === oDeletedApp.mobileApp.id) {
				oRunContext = $.extend(true, {}, runContext);
			}
			selectedApps.splice(appIndex, 1);
			oTest.mobileApps = selectedApps;
			oTest.runContext = oRunContext;
			oTestModel.setProperty("/mobileApps", selectedApps);
			oTestModel.setProperty("/runContext", oRunContext);
			
			return this._Models.saveTestEnvironments(this.getModel("srf"), oTest, ["mobileApps", "runContext"])
 			.then( function() {
				that._bindView(sPath);
			})
			.finally( function() {
			}); 	
		},
		
		onSRFBrowserVersionChanged: function(oEvent) {
// 			var oEnvModel = this.getModel("environments"),
// 				selectedBrowsers = oEnvModel.getProperty("/srfSelectedEnv") || [],
// 				browser =  oEvent.getParameter("selectedItem"),
// 				browserVersion = browser.getText(),
// 				browserPath = browser.getParent().getBindingContext("environments").getPath(),
// 				oBrowser = oEnvModel.getObject(browserPath);

// 			oBrowser.version = browserVersion;
// 			this._setSelectedEnvModel(oEnvModel, selectedBrowsers);
		},		
		
		onSRFResolutionChanged: function(oEvent) {
			var oEnvModel = this.getModel("environments"),
				selectedBrowsers = oEnvModel.getProperty("/srfSelectedEnv") || [],
				browser =  oEvent.getParameter("selectedItem"),
				browserPath = browser.getParent().getBindingContext("environments").getPath(),
				oBrowser = oEnvModel.getObject(browserPath);

			selectedBrowsers[oBrowser.arrItemId].resolution = oBrowser.resolution;
		},		
				
		onDeleteSelectedBrowser: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				selectedBrowsers = oEnvModel.getProperty("/selectedbrowsers") || [],
				browserIndex = oEvent.getSource().getBindingContext("mcEnvironments").getPath().split("/")[2];

			selectedBrowsers.splice(browserIndex, 1);
			selectedBrowsers.count = selectedBrowsers.length;
			oEnvModel.setProperty("/selectedbrowsers", selectedBrowsers);
		},
		
		onBrowserVersionChanged: function(oEvent) {
			var oEnvModel = this.getModel("mcEnvironments"),
				selectedBrowsers = oEnvModel.getProperty("/selectedbrowsers") || [],
				browserVersion = oEvent.getSource().getSelectedItem().getText(),
				browserPath = oEvent.getSource().getBindingContext("mcEnvironments").getPath(),
				oBrowser = oEnvModel.getObject(browserPath);

			oBrowser.browser.version = browserVersion;
			selectedBrowsers.count = selectedBrowsers.length;
			oEnvModel.setProperty("/selectedbrowsers", selectedBrowsers);
		},

		_loadSelectedBrowsersFromFavotes: function(sPath, sModel) {
			var	oFavModel = this.getModel(sModel),
				oSelectedPackage = oFavModel.getObject(sPath);
							
			oFavModel.setProperty("/new", false);
			oFavModel.setProperty("/existing", true);

			this._loadSelectedBrowsersFromPackage(oSelectedPackage);
			
			return oSelectedPackage;
		},
		
		_loadSelectedBrowsers: function() {
			var oBrowsersTable =  this.byId("browsers"),	
				sPath = oBrowsersTable.getBindingContext("mcEnv").getPath(),			
				oFavModel = this.getModel("mcEnv"),
				oSelectedPackage = oFavModel.getObject(sPath);
							
			oFavModel.setProperty("/new", false);
			oFavModel.setProperty("/existing", true);

			this._loadSelectedBrowsersFromPackage(oSelectedPackage);

			return oSelectedPackage;
		},
		
		_loadSelectedBrowsersFromPackage: function(oSelectedPackage) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oSelectedBrowsers = oSelectedPackage && oSelectedPackage.browsers || [],
				oSelectedDevices = oSelectedPackage && oSelectedPackage.mobiles,
				selectedDevicesCount = oSelectedDevices.devices && oSelectedDevices.devices.length || 0,
				selectedSpecificCount = oSelectedDevices.specificdevices && oSelectedDevices.specificdevices.length || 0,
				oSelectedApps = oSelectedPackage && oSelectedPackage.applications || [],
				selectedAppsCount = oSelectedApps && oSelectedApps.length || 0,
				oRunContext = $.extend(true, {}, oSelectedPackage && oSelectedPackage.runContext),
				oEnvironments = oEnvModel.getProperty("/environments");
							
			$.each(oSelectedBrowsers, function(i, browser) {
				$.each(oEnvironments, function(j, env) {
					if(MCEnvUtils.isEqualOS(env, browser.os)) {
						$.each(env.browsers, function(k, envBrowser) {
							if(envBrowser.name.toLowerCase() === browser.browser.name.toLowerCase()) {
								browser.browser.versions = envBrowser.versions;
								browser.browser.version = browser.version;
								return;
							}
						});
					}
				});
			});

			oSelectedApps.count = oSelectedApps.length;		
			oSelectedBrowsers.count = oSelectedBrowsers && oSelectedBrowsers.length;
			oEnvModel.setProperty("/selectedbrowsers", oSelectedBrowsers);
			oSelectedDevices.count = selectedDevicesCount + selectedSpecificCount;
			oEnvModel.setProperty("/selectedmobileapps", oSelectedApps);
			oEnvModel.setProperty("/selectedruncontext", oRunContext);

			this._showSelectionPanels(oEnvModel, selectedAppsCount > 0 || oSelectedDevices.count > 0 || oSelectedBrowsers.count > 0);

			this.updateDevicesModel(oEnvModel, oSelectedDevices.devices, oSelectedDevices.specificdevices);
			return oSelectedPackage;
		},
		
		_showSelectionPanels: function(oEnvModel, bHasSelection) {
			oEnvModel.setProperty("/noSelection", bHasSelection ? false : true);
			oEnvModel.setProperty("/hasSelection", bHasSelection ? true : false);
		},
		
		_backupSelectedPackage: function(oSelectedPackage) {
			var oBrowsersTable =  this.byId("browsers"),	
				sPath = oBrowsersTable.getBindingContext("mcEnv").getPath(),	
				oFavBackupModel = this.getModel("mcEnvBackup"),
				oFavModel = this.getModel("mcEnv"),
				favorites = [];

			$.each(oFavModel.getProperty("/favorites"), function(i, favorite) {
				favorites.push(favorite);
			});
			
			this._backupPackageUUID = oSelectedPackage.uuid;
			oFavBackupModel.setProperty("/favorites", favorites);
			oFavBackupModel.setProperty("/sPath", sPath); 
		},
		
		onAddEnvLabDlgCancel: function() {
			this._loadEnvFromPackage(this._backupPackageUUID);
			this._getEnvLabDialog().close(); 
		},

		onEnvSelected: function(oEvent) {
			var row = oEvent.getParameters("selectedItems").rowContext,
				sPath = row && row.getPath(),
				oModel = this.getModel("environments"),
				env = sPath && oModel.getObject(sPath),
				bFound = false,
				that = this;

			if(!env) { return; }
			
			if ( this.getModel("testDetails").getProperty("/runEnvironmentsSelection") === false) {
				this._currTestEnvs[0] = env;
				// TODO reset table selection
			}
			else {
				$.each(this._currTestEnvs, function(i, testEnv) {
					if( SrfEnvUtils.isEqualEnv(testEnv, env) ) {
						Utils.Array.removeElement(that._currTestEnvs, testEnv);
						$.each(that._selectedTestEnvs, function(j, selEnv) {
							if( SrfEnvUtils.isEqualEnv(selEnv, env) ) {
								Utils.Array.removeElement(that._selectedTestEnvs, selEnv);
								return;
							}
						});
						bFound = true;
						return;
					}
				});
	
				if( !bFound ) {
					this._currTestEnvs.push(env);
				}
			}
		/*
		
		{sap.ui.base.Event}	oControlEvent	
{sap.ui.base.EventProvider}	oControlEvent.getSource	
{object}	oControlEvent.getParameters	
{int}	oControlEvent.getParameters.rowIndex	row index which has been clicked so that the selection has been changed (either selected or deselected)
{object}	oControlEvent.getParameters.rowContext	binding context of the row which has been clicked so that selection has been changed
{int[]}	oControlEvent.getParameters.rowIndices	array of row indices which selection has been changed (either selected or deselected)
{boolean}	oControlEvent.getParameters.selectAll	indicator if "select all" function is used to select rows
{boolean}	oControlEvent.getParameters.userInteraction	indicates that the event was fired due to an explicit user interaction like clicking the row header or using the keyboard (SPACE or ENTER) to select a row or a range of rows.
*/
			
		//	window.console.log("_onEnvironmentCheckBoxSelect called" + index);
		//	this.onUpdateEnvironments(index);
		},

		onUpdateEnvironments: function (platform, index) {
			//window.console.log("onUpdateEnvironments - controller" + " platform: " + platform + " index : " + index);
			// should be implemented when run environment will be not a singleton, but environment per test
			//	this._paneController.setTestEnvironmentSelectedFlag(platform,index, this._aEnviornmentsNormalize[platform][index].browser.selected);
		},


		onOpenInSRF: function(oEvent) {

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
			var oAuxModel = this.getModel("srf");
			 
			this._Models.loadTestsModel(oAuxModel);
			// TODO debugger;
			this.getRouter().navTo("tests", {}, bReplace);
		},

		onCancel: function(oEvent) {
			this.onNavBack();
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf srf.view.TestDetails
		 */
		onBeforeRendering: function() {
			//window.console.log("onBeforeRendering");

		},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf srf.view.TestDetails
		 */
		onAfterRendering: function() {
			//window.console.log("onAfterRendering");
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf srf.view.TestDetails
		 */
		onExit: function() {
			//window.console.log("onExit");
			if (this._oPopover) {
				this._oPopover.destroy();
			}
		},

		/**
		 * Event handler for run tests button pressed event. 
		 * @public
		 */
		onRun: function(oEvent) {
			var i18n = this.getResourceBundle() || this.context().i18n,
				that = this,
				oObject = this.getModel("testDetails").oData;
				
			if ( oObject) {
				oObject.successCallback = this._updateTestRunning;
				oObject.failureCallback = this._updateTestFailedRunning;
				this.trace( i18n.getText("runTestsTotalMsg", ["1"]), "log");

				return this._runSingleTest(oObject)
				.then( function( oRunId) {
					if ( oRunId) {
						// update test list model
						that._updateTestRunning();
						
						// start polling
						that._pingRunningTests();	
					}
					
					return;
				});
			}
		},

		// callback of successful run data polling { id: oTestAux.id, runId: oRunId.id, status: "running"}
		_updateTestRunning: function() {

			var oView = this.getView("details"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				return;
			}
			var oObject = oView.getBindingContext().getObject();

			if (oObject ) {
				var	sTestId =  oObject ? oObject.id : "";
				this._refreshByTimerTestDetailsModel(sTestId, false);
			}
		},

		_updateModel : function()
		{
			return this._loadRunningModel();
		},


		
		/**
		 * Event handler for edit test list selection change event. 
		 * @public
		 */
		onRunDetails: function(oEvent) {
			var oViewModel = this.getModel("testDetails");
			var src = oEvent.getSource().oBindingContexts.testDetails.getPath();
			var runDetails = oViewModel.getObject(src);
		
		//TBD koj chego (ask Natasha)
		},
		
		/**
		 * Event handler for script selection change event - open script in Web IDE editor. 
		 * @public
		 */
		onSaveTags: function(oEvent) {
			var oViewModel = this.getModel("testDetails"),
				param = oEvent.mParameters,
				that = this,
				addedTag, deletedTag;
				
			if(this._edttags === true) {
				this._edttags = false;
				addedTag = param.addedTokens && param.addedTokens[0];
				deletedTag = param.removedTokens[0];
			}

			if( param.type === "removed") {
				deletedTag = param.removedTokens[0];
			}

			if( param.type === "tokensChanged") {
				deletedTag = param.removedTokens[0];
			}
			
			if(addedTag || deletedTag) {
				var testId = oViewModel.getProperty("/testId");
				if( testId ) {
					return this._Models._saveTestTags(this.getModel("srf"), testId, addedTag, deletedTag)
					.then(function(oTestTags) {
						oViewModel.setProperty("/tags", oTestTags[0].test.tags);
						oViewModel.setProperty("/test", oTestTags[0].test);
						oViewModel.setProperty("/consistencyStamp", oTestTags[0].test.consistencyStamp);
						that._loadAllTags(oViewModel);	
						return;
					});
				} else {
					var oTags = this._Models.convertTagsForSave(oViewModel.getProperty("/tags"), addedTag, deletedTag);
					oViewModel.setProperty("/tags", oTags);
				}
			}
		},
		
		getScriptsGroupHeader: function( oGroup) {
			return new GroupHeaderListItem( {
				title: oGroup.key,
				upperCase: false
			} );
		},
	
		onEditScript: function(oEvent) {
			var oViewModel = this.getModel("testDetails"),
				selectedItem = oEvent.getSource().getSelectedItems()[0],
				src = selectedItem.oBindingContexts.testDetails.getPath(),
				scriptDetails = oViewModel.getObject(src);

			var oModel = this.getModel("srf");
			
			this._openFile({ 
					"context": oModel.getProperty("/srf_context"), 
					"doc" : oModel.getProperty("/srf_document"), 
					"FileFolderEntity" : oModel.getProperty("/srf_FileFolderEntity")
				}, 
				scriptDetails,
				""
			).done();
			
			selectedItem.setProperty("selected", false);
		},	
		
		onNewScript: function(oEvent) {
			var that = this,
				oViewModel = this.getModel("testDetails"),
				oModel = this.getModel("srf"),
				sTestId = oViewModel.getProperty("/testId"),
				sType = oViewModel.getProperty("/platform");
			
			 // TBD:  read from event	
			var scriptSdk = "leanft",
				scriptFileNameExtension = ".js";
			
			//var sScriptName = this.common().generateNewScriptName( scriptSdk, this.getResourceBundle());	
			var oFileObject = { 
					"context": oModel.getProperty("/srf_context"), 
					"doc" : oModel.getProperty("/srf_document"), 
					"FileFolderEntity" : oModel.getProperty("/srf_FileFolderEntity")
				};
		
			return this._openNewFileNameDialog( { fileName: ""})
				.then( function( scriptName) {
					
					var oTempFileName = that._fixFileNameExtension( { sdk: scriptSdk, ext: scriptFileNameExtension}, scriptName);
					
					var oScriptObject = {	// create new script object for LEANFT template
						testId: sTestId,
						physicalFileName: "",
						description: "Web IDE template",
						editable: true,
						name:  oTempFileName.name,
						originalFileName: oTempFileName.originalFileName,
						runner: "mocha",
						sdk: scriptSdk,
						type: sType
					};

					that._openFile( oFileObject, oScriptObject, sType).done();
					return true;
				})
				
				.catch( function() {
				//	window.console.log("Creane new script file for test " + sTestId + " cancelled");
					return false;
				});
				
		
		},	
	
		_openNewFileNameDialog: function( oDialogInfo) {
			var that = this;
			return Q.promise( function(resolve, reject){
				// create promise resolve it in close
				that._oNewFileNameDialog = that._getNewFileNameDialog( function(){
					 if( that._oNewFileNameDialog.ok === true) {
					 	resolve( that._newFileName.getValue());
					 }
					 else {
					 	reject();
					 }
					 that._oNewFileNameDialog.destroy();
					 that._oNewFileNameDialog = null;
				}, oDialogInfo);
				that._oNewFileNameDialog.open();
			});
		},	
		
		// {title: sTitle, message: sMessage, tooltip: sTooltip}
		_getNewFileNameDialog: function(onClose, oDialogInfo ) {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "";
				
			if (!this._oNewFileNameDialog) {
				// create dialog via fragment factory
				this._oNewFileNameDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.NewFileNameDialog", this);
				this.getView().addDependent(this._oNewFileNameDialog);
				//  compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oNewFileNameDialog);
				
				this._okBtn = this._oNewFileNameDialog.getBeginButton();		
			
				this._newFileName = sap.ui.getCore().getElementById(sPrefix + "--idSrfNewFileNameInput");
				
				this._errorFileName = sap.ui.getCore().getElementById(sPrefix + "--idSrfNewFileNameErrorText");

				// attach close callback function
				this._oNewFileNameDialog.attachAfterClose( oViewModel, onClose, this);
				// attach open callback function
				this._oNewFileNameDialog.attachAfterOpen( oViewModel, this.onAfterNewFileNameDialogOpen, this);
			}

		
			if ( this._errorFileName) {
				this._errorFileName.setText("");
			}
			
			if ( oDialogInfo) {
				if ( oDialogInfo.title) {
					this._oNewFileNameDialog.setTitle( oDialogInfo.title);
				}
				if ( oDialogInfo.message) {
					// get inner label element andd set its "text" property
					this._oNewFileNameDialog.getContent()[0].setProperty("text",  oDialogInfo.message);
				}
				if ( oDialogInfo.tooltip) {
					this._oNewFileNameDialog.setTooltip( oDialogInfo.tooltip);
				}
				if (oDialogInfo.fileName && this._newFileName) {
					this._newFileName.setValue( oDialogInfo.fileName);
					this._okBtn.setEnabled(true);
				}
			}
			else if ( this._okBtn) {
				this._okBtn.setEnabled(false);
			}
			return this._oNewFileNameDialog;
		},
		
		onCloseNewFileNameDialog: function() {
			this._oNewFileNameDialog.ok = true;
			this._oNewFileNameDialog.close();
		},
		
		onCancelNewFileNameDialog: function() {
			this._oNewFileNameDialog.ok = false;
			this._oNewFileNameDialog.close();
			
		},
		// bind ENTER keystroke handler 
		onAfterNewFileNameDialogOpen: function() {
			var that = this;
			$("#" + this._oNewFileNameDialog.getId()).keydown( function(e) {
			    if (e.keyCode === 13) { 
				    if ( that._oNewFileNameDialog.getBeginButton().getEnabled()) {
				       	that.onCloseNewFileNameDialog();
				    }
				}
			});
		},
		
		onNewFileNameChanged: function(oEvent) {
			var oValid = this._isFileNameValid(oEvent.getParameter("newValue")); 
			var sId = oEvent.getParameter("id");
			sap.ui.getCore().getElementById(sId).setValueState( oValid.isValidFileName ? "None" : "Error");
			if ( this._okBtn) { 
				this._okBtn.setEnabled( oValid.isValidFileName);
			}
			if ( this._errorFileName) {
				this._errorFileName.setText(oValid.error);
			}
		},

		_isFileNameValid: function(sName){
			var bRet = true,
				i18n = this.getResourceBundle(),
				error = "",
				specCharExp= /(#|\*|\?|\.|,|\/|;|:|@|\$|%|\^|&|\(|\)|-|\+|=|"|'|{|}|\[|\]|\\|!|~)/g;
			// prevent empty names
			if (!sName || /^\s*$/.test(sName)) {
				bRet = false;
				error = i18n.getText("newFileNoBlank");
			} else if( sName === "" ) { 
				bRet = false;
				error = i18n.getText("newFileNoBlank");
			}
			else if( sName.length >= this.common()._nSrfResourceNameMaxLength) { 
				bRet = false;
				error = i18n.getText("newFileNameTooLong", [ this.common()._nSrfResourceNameMaxLength]);
			} else if (specCharExp.test(sName)) {         
				bRet = false;	
				error = i18n.getText("newFileNoSpecialChars");
			} 
			return { isValidFileName: bRet, error: error};
		},	
	
		//  append originalFileName extension - for intellisence needs
		// {sdk: "leanft", ext: ".js"}
		_fixFileNameExtension: function( oSdk, sFileName) {
			if (!sFileName) {
				sFileName = this.common().generateNewScriptName( oSdk.sdk, this.getResourceBundle());
			}
			var sFullName = sFileName;
			sFullName += oSdk.ext;
			
			return { originalFileName: sFullName, name: sFileName};
		},
		
		// oEventData { testId:  extInfo.testId, oScript: oScript})
		onNewScriptCreated: function(sChannel, sEvent, oEventData) {

			var oScript = oEventData.oScript || null,
				sTestId = oEventData.testId || null,
				that = this,
				oViewModel = this.getModel("testDetails"),
				sShownTestId = oViewModel.getProperty("/testId");
			
			// if this test details presented by test details pane
			if ( sShownTestId === sTestId) {
				var oExistingScripts = this.convertScriptsForSave(oViewModel.getProperty("/scripts"), false, sTestId),
				oConvertedScripts = this.convertScriptsForSave([oScript], true, sTestId),
			
				oContext = this._oStepsList.getBindingContext(),
 				sPath = oContext ? this._oStepsList.getBindingContext().getPath() : undefined;
			
				$.merge(oConvertedScripts, oExistingScripts);
 				this._Models.saveTestScripts( this.getModel("srf"), sTestId, oConvertedScripts, true)
 				.then( function() {
 					//var oScriptsList = that.byId("scriptsList");
					//oScriptsList.rerender();
					that._bindView(sPath);
				});		
			}
			
		},
		
		_getAssetDocument: function( oFileObject, oScriptObject, sTestType) {
			var fileName = oScriptObject.name || "script.js",
				scriptPhysycalFileName = oScriptObject.physicalFileName || "";
			
			var oContext = oFileObject.context, 
				FileFolderEntity = oFileObject.FileFolderEntity,
				oDoc = oFileObject.doc;
			var that = this;
			return oDoc.getProject(true).then(function(oProjectDocument) {
				
				var parentPath = oProjectDocument.getEntity().getFullPath();
				//window.console.log("Edit Script for Test " + fileName + " ID " + scriptPhysycalFileName);
				fileName = that._fixFileName(fileName, oScriptObject.originalFileName);
			
				var oEntity = new FileFolderEntity("file", fileName, parentPath, "srfFileDAO", "");
				
				return oContext.service.filesystem.documentProvider.createDocumentInternally( oEntity, oContext.service.document.context.event)  
					.then(function(oDocument) {

					var extInfo = oDocument.getExtInfo();
					if (!extInfo) {
						extInfo = {};
					}
					var oSrfExtInfo = {};
					
					// for new script creation info
					oSrfExtInfo.testId = ( scriptPhysycalFileName !== "" ? null : oScriptObject.testId); // is null when existing script editing
					oSrfExtInfo.newFileScript = ( scriptPhysycalFileName === "");
					oSrfExtInfo.physicalFileName = scriptPhysycalFileName;
					oSrfExtInfo.description = oScriptObject.description;
					oSrfExtInfo.editable = oScriptObject.editable;
					oSrfExtInfo.name = oScriptObject.name;
					oSrfExtInfo.originalFileName = oScriptObject.originalFileName;
					oSrfExtInfo.runner = oScriptObject.runner;
					oSrfExtInfo.sdk = oScriptObject.sdk;
					oSrfExtInfo.type = oScriptObject.type;
					
					extInfo.srfScriptFileExtInfo = oSrfExtInfo;
					
					extInfo.origin = "HPE";
					extInfo.external = true;
					extInfo.bBeautify = true;
					oDocument.setExtInfo(extInfo);

					// This document has no project in the workspace
					// need to assosiate it with current AUT project
					oDocument.getProject = function() {
						return Q(oProjectDocument); // returns Promise
					};
					
					oDocument.getParent = function() {
						return Q(oProjectDocument); // returns Promise
					};
					
					if (oSrfExtInfo.newFileScript) {
						var templateContent = that.common()._template(oScriptObject.sdk, sTestType) || "";
						return oDocument.setContent(templateContent).thenResolve(oDocument);
					} 
					
					return oDocument.getContent().thenResolve(oDocument);
				}).fail(function(oError) {
					that.trace( that.getResourceBundle().getText("newFileNameOpenFailed", [fileName, (oError.message || oError)]), "error");
				});
			});
		},

		_openFile: function( oFileObject, oScriptObject, sTestType) {
			if ( !this._ifFileTypeSupported( oScriptObject.originalFileName)) {
				jQuery.sap.require("sap.m.MessageBox");	
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length,
					errtext = this.getResourceBundle().getText("editAssetNotSupportedMsg", [oScriptObject.name]);

				sap.m.MessageBox.information(errtext, {
					title: "Information",                                    // default
					onClose: null,                                       // default			
					styleClass: bCompact? "sapUiSizeCompact" : ""
				});
				this.trace( errtext, "info");
				return Q();
			}
			return this._getAssetDocument( oFileObject, oScriptObject, sTestType).then(
				function(oTestDocument) {
					if ( !oTestDocument)  {
						return Q();
					}
					
					if(oTestDocument.getEntity() && oTestDocument.getEntity().oMetadata) {
						oTestDocument.getEntity().oMetadata.readOnly = !oScriptObject.editable; // oScriptObject.editable: true,
					}
		
					// close opened file with the same name if any
					return oFileObject.context.service.content.close(oTestDocument, null, true).then( function() {
						return oFileObject.context.service.document.open(oTestDocument);
					});
				});
		},

		// _ifFileTypeSupported
		_ifFileTypeSupported: function(originalFileName) {
			if (!originalFileName) {
				return false;
			}
			var aBlackList = ["zip","jar"];
			// check extension
			var orgFname = originalFileName.split(".");
			var ext = orgFname[((orgFname.length > 0) ? (orgFname.length - 1) : 0)];

			for( var i in aBlackList) {
				if ( ext === aBlackList[i]) {
					return false;
				}
			}
			return true;
		},
		
		// replace spaces and most of special chars with underscores: " "-> "_" 
		// and append originalFileName extension - for intellisence needs
		_fixFileName: function(str, originalFileName) {
			if (!originalFileName) {
				return str;
			}
			var tmp = str.split("/");
			var scriptName = tmp.join();
			// replace spaces, most of special chars with underscores
			scriptName = scriptName.replace(/\ |\(|\)|\+|\[|]|\*|\{|}|\^|\$|\?|#|,|@|!|&|-|=|>|<|:|;|\'|\/|\||\\|~|`|%|\"/g, "_");
			
			// handle extension
			var orgFname = originalFileName.split(".");
			var ext = orgFname[((orgFname.length > 0) ? (orgFname.length - 1) : 0)];

			var tmp2 = scriptName.split(".");
			var orgExt = tmp2[((tmp2.length > 0) ? (tmp2.length - 1) : 0)];
			if ( orgExt !== ext) {
				scriptName +=  "." + ext;
			}
			return scriptName;
		},
	
		
		onParamEditorOpen: function(oEvent) {
			var currScript = oEvent.getSource().oParent,
				oModel = this.getModel("testDetails"),
				sPrefix = oModel.getProperty("/prefix"),
				src = currScript.oBindingContexts.testDetails.getPath(),
				currParams = oModel.getObject(src + "/parameters"),
				backupParams = [];
					
			$.each(currParams, function(i, param) {
				backupParams.push(param);
			});
			
			oModel.setProperty(src + "/backupParams", backupParams);
			this._backupParameters = backupParams;
			this._oParamEditor = this._getParamDialog();
			this._oParamEditor.bindElement({path: src, model: "testDetails" });
			this._addParamBtn = sap.ui.getCore().getElementById(sPrefix + "--addParam");
			this._newParamName = sap.ui.getCore().getElementById(sPrefix + "--newParamName");
			this._newParamValue = sap.ui.getCore().getElementById(sPrefix + "--newParamValue");
			this._executableFileSelect = sap.ui.getCore().getElementById(sPrefix + "--executableFileSelect"); 
			
			this.fetchExecutableFiles().done();
			
			this._addParamBtn.setEnabled(false);
			this._executableFileSelect.setEnabled(false);
			this._executableFileSelect.attachChange(this.onFileParameterChanged, this); 
			this._executableFileSelect.setSelectedItemId(); 

			this._oParamEditor.open(currScript);
		},
		
		onRemoveParameter: function(oEvent) {
    		var oModel = this.getModel("testDetails");
			var currParamView = oEvent.getSource().oParent;
    		var sPath = currParamView.oBindingContexts.testDetails.getPath();
    		var currParam = oModel.getObject(sPath);
			var params = oModel.getObject(this._oParamEditor.getObjectBinding("testDetails").getPath() + "/parameters");
			
			Utils.Array.removeElement(params, currParam);
			oModel.refresh();
		},
		
		onNewParamNameChanged: function(oEvent){
			var bEnable = this._isParamNameValid(oEvent.getParameter("value")); 
			this._addParamBtn.setEnabled(bEnable);
			this._executableFileSelect.setEnabled(bEnable);
		}, 
		
		// PARAMETERS 
		onFileParameterChanged: function(oEvent) {
			var that = this;
			// retrieve file path from the oEvent
			var	item = oEvent.getParameter("selectedItem"),
				sFileFullName = item ? item.getProperty("additionalText") : undefined;			
			
			return this.common().generateAUTUrl( sFileFullName)
				.catch( function(error){
					that.trace( (error && error.message), "error");						
					return  that.getResourceBundle().getText("urlAboutBlank") || "about:blank";
				}).then(function(autUrl) {
					that._newParamValue.setValue(autUrl);
				});
		},
		
		fetchExecutableFiles: function() {
			
			var oViewModel = this.getModel("testDetails");
			var oDocument = this.document();
			var sBlank = this.getResourceBundle().getText("parametrUseBlankPage") || "Blank Page";
			var sUrlBlank = this.getResourceBundle().getText("urlAboutBlank") || "about:blank";
			// fetch all executable files regardless if selected file is execulable
			var forceAllFiles = true;
			return this.common().fetchExecutableFiles( oDocument, forceAllFiles)
				.then( function( aExecutableFileNames) {
					// add empty string at the first array item
					
					var aFiles = [ {sFileName:sBlank, sFilePath:sUrlBlank} ];
				
					aFiles.push.apply(aFiles, aExecutableFileNames);
			
					oViewModel.setProperty("/executableFiles", aFiles);
					return aFiles;
				});
		},
		
	
		_isParamNameValid: function(sName){
			var bRet = true,
				oModel = this.getModel("testDetails"),
				i18n = this.getResourceBundle(),
				error = "",
				specCharExp= /(#|\*|\?|\.|,|\/| |;|:|@|\$|%|\^|&|\(|\)|-|\+|=|"|'|{|}|\[|\]|\\|!|~)/g,
				numExp=/\d/;
			
			if( sName === "" ) {
				bRet = false;	
			} else if (specCharExp.test(sName)) {         
				bRet = false;	
				error = i18n.getText("specialChar");
			} else if (numExp.test(sName[0])) {
				bRet = false;	
				error = i18n.getText("firstNumber");
			} else {
				var binding = this._oParamEditor.getObjectBinding("testDetails"),
					params = oModel.getObject(binding.getPath() + "/parameters");
	
				$.each(params , function(i, param ) {
					if(param.name === sName) {
						bRet = false;
						error = i18n.getText("duplicatedParamName"); 
						return;
					}
				});
			}
			
			oModel.setProperty("/parametersError", error);
			
			return bRet;
		
		},
		
		onAddParameter: function() {
	
    		var oModel = this.getModel("testDetails"),
			    params = oModel.getObject(this._oParamEditor.getObjectBinding("testDetails").getPath() + "/parameters"),
			    script = oModel.getObject(this._oParamEditor.getObjectBinding("testDetails").getPath());
			    
			params.push({ name: this._newParamName.getValue(), defaultValue: this._newParamValue.getValue(), assetId: script.primaryResource.id });
			this._cleanupParamDialog();
			oModel.refresh();
		},

		onSaveParameters: function() {
			var that = this, 		
				bEnabled = this._addParamBtn.getProperty("enabled");

			if(bEnabled) {
				var i18n = this.getResourceBundle() || this.context().i18n,
					sTitle = i18n.getText("addParamTitle"),
					sMessage = i18n.getText("addParamText", ["text"]),
					sTooltip = i18n.getText("addParamTooltip");

				return this._openAreYouSureDialog({title: sTitle, message: sMessage, tooltip: sTooltip})
					.then( function() {
						return that.onAddParameter();
					})
					.finally (function() {
						that.saveTestParams();
					});
			}
			else {
				return this.saveTestParams();
			}		
		},
		
		_cleanupParamDialog: function() {
			var oModel = this.getModel("testDetails");
			
			oModel.setProperty("/parametersError", "");
			this._newParamName.setValue("");
			this._newParamValue.setValue("");
			this._addParamBtn.setEnabled(false);
			this._executableFileSelect.setEnabled(false);
		}, 

		saveTestParams: function() {
			var that = this,
				oModel = that.getModel("testDetails");
			var test = oModel.getData("/");
			var currScript = oModel.getObject(that._oParamEditor.getObjectBinding("testDetails").getPath());
			
			return that._Models.updateScript(that.getModel("srf"), currScript)
				.then(function(updatedAsseResp){
					if (!test.testId) {
						return null;
					}
					
					var updatedAsset = updatedAsseResp[0];
					if(updatedAsset) {					  	
						var params = oModel.getObject(that._oParamEditor.getObjectBinding("testDetails").getPath() + "/parameters");			
						if( updatedAsset.parameters ) {		
							for ( var i = 0; i < updatedAsset.parameters.length; i++) {
								var updatedParam =  updatedAsset.parameters[i];
								for ( var j = 0; j < params.length; j++)
								{
									if ( params[j].id === updatedParam.id || params[j].name === updatedParam.name) {
										if(params[j].value === null || params[j].value === undefined ) {
											updatedParam.value = params[j].defaultValue;
										} else {
											updatedParam.value = params[j].value;
										}	
									}				
								}
							}
						
							params = updatedAsset.parameters;
							oModel.setProperty(that._oParamEditor.getObjectBinding("testDetails").getPath() + "/parameters", params);
							oModel.setProperty(that._oParamEditor.getObjectBinding("testDetails").getPath() + "/consistencyStamp", updatedAsset.consistencyStamp);
						}
					}

					updatedAsset = updatedAsset || currScript;
				 	return that._Models.updateTest(that.getModel("srf"), test, updatedAsset && updatedAsset.parameters)
				 	.then(function(updatedTestResp){
				 		var updatedTest = updatedTestResp[0];
						if(updatedTest.test) {	
							oModel.setProperty("/consistencyStamp", updatedTest.test.consistencyStamp);
							oModel.setProperty("/test/consistencyStamp", updatedTest.test.consistencyStamp);
						}			  	
					});
				}).finally(function(){ 
					oModel.refresh(); 
					that._closeParams();
				});
		},
		
		onCancelParameters: function(){
			var oModel = this.getModel("testDetails"),				
				src = this._oParamEditor.getObjectBinding("testDetails").getPath(),
				currParams = this._backupParameters;
	
			oModel.setProperty(src + "/parameters", currParams);
			oModel.refresh();
			
			this._closeParams();
		},
		
		_closeParams: function(){
			this._cleanupParamDialog();						
			this._oParamEditor.close();
		},
		
		handleCloseParams: function(){
			this._oParamEditor.close();
		},

		onAddScriptsDlgOpen: function() {
			var that = this;
			//reset model's selectedItemsCount
			this.getModel("testDetails").setProperty("/_assets/selectedItemsCount", 0);
			// reset search field
			this.getModel("testDetails").setProperty("/_assets/searchAssetByName", "");

			this._loadAssets().then( function() {
				that._getScriptsDialog().open();
			}).done();
		},
		
		onAddScriptsDlgSave: function( oEvent) {
			var that = this;
			var oViewModel = this.getModel("testDetails");
			var scriptsSelected = oViewModel.getProperty("/_assets/selectedItemsCount");
			var labelElement = null;
			
			if ( scriptsSelected) {
				labelElement = sap.ui.getCore().getElementById(oViewModel.getProperty("/prefix") + "--srfTotalScripts");
				if ( labelElement) {
					labelElement.setText( this.getResourceBundle().getText( "addingScripts", [scriptsSelected]));
				}
			}
	
			this.onSaveScripts(oEvent).then( function() {  
				if ( labelElement) {
					labelElement.setText("");
				}
				that._oAddScriptsList.getBinding("items").refresh();
			}).done();
		},
			
		onAddScriptsDlgCancel: function() {
			this._getScriptsDialog().close();
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {object} oTableSearchState an array of filters for the search
		 * @private
		 */
		_applySearch: function(sQuery, list, filterField) {
			if (!list || !filterField) {
				return;
			}
			var oTableSearchState = [];

			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter(filterField, FilterOperator.Contains, sQuery)];
			}
		
			var oViewModel = this.getModel();
			list.getBinding("items").filter(oTableSearchState, sap.ui.model.FilterType.Application);
			
			// changes the noDataText of the list in case there are no filter results
			if (oTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("testListNoDataWithSearchText"));
			}
		},
		
		onScriptsLiveSearch: function(oEvent) {
			var oViewModel = this.getModel("testDetails");
			oViewModel.setProperty("/_assets/searchAssetByName", oEvent.getParameter("newValue"));
			// this._applySearch(oEvent.getParameter("newValue"), this._oAddScriptsList, "name");
			this._loadAssets();
		},
		
		onScriptsSearch: function(oEvent) {
			this.getModel("testDetails").setProperty("/_assets/searchAssetByName", oEvent.getParameter("query"));
			this._loadAssets();
			// this._applySearch(oEvent.getParameter("query"), this._oAddScriptsList, "name");
		},

	
		onEnvFilter: function(oEvent) {
			var oColumn = oEvent.getParameter("column"),
				sValue = oEvent.getParameter("value"),
				oViewModel = this.getModel("testDetails"),
				sPrefix = oViewModel.getProperty("/prefix");
			
			oEvent.preventDefault(); 
			switch(oColumn.sId)	{
				case sPrefix + "--os" : 
					this._filterColumn(sValue, oColumn, this._oOSFilter, "os");
					break;
				case sPrefix + "--browser":
					this._filterColumn(sValue, oColumn, this._oBrowserFilter, "browser");
					break;
			}
		},

		_clearFilter: function(oColumn, type) {
			switch(type) {
				case "os" :
					this._oOSFilter = [];
					break;
				case "browser" :
					this._oBrowserFilter = [];
					break;
			}
			
			oColumn.setFiltered(false);
			this._filter();
		},

		_filterColumn: function(sValue, oColumn, oFilter, type) {
				
			var	value = sValue.split(" "),
				oTableSearchState = [];
			
			if (!sValue) {
				this._clearFilter(oColumn, type);
				return;
			} 
			
			if(value && value.length > 1) {
				var numExp=/\d/,
					length = value.length,
					version = value[length - 1];
				
				if (numExp.test(version)) {
					oTableSearchState.push(new Filter(type + "/version", FilterOperator.Contains, version));

					value.splice(length - 1, 1);
					var osName = value.join(" ");
					oTableSearchState.push(new Filter(type + "/name", FilterOperator.Contains, osName));
				} else {
					oTableSearchState.push(new Filter(type + "/name", FilterOperator.Contains, sValue));
				}				
			} else {
				oTableSearchState.push(new Filter(type + "/name", FilterOperator.Contains, sValue));
			}
 			
			$.merge(oFilter, oTableSearchState);
			oColumn.setFiltered(true);
		
			this._filter();	
		},
		
		_filter : function () {
			var newFilter = [];
			
			$.merge(newFilter, this._oOSFilter);
			$.merge(newFilter, this._oBrowserFilter);
			this._oAddEnvList.getBinding("rows").filter(newFilter, sap.ui.model.FilterType.Application);
		},
		
		onEnvSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var sQuery = oEvent.getParameter("newValue"),
					oQuery = sQuery && sQuery.split(";"),
					oTableSearchState = [];

					if (oQuery && oQuery.length > 0) {
						if(oQuery[0] && oQuery[0].length > 0) {
							oTableSearchState.push(new Filter("os/name", FilterOperator.Contains,  oQuery[0]));
						}
						
						if(oQuery[1] && oQuery[1].length > 0) {
							oTableSearchState.push(new Filter("browser/name", FilterOperator.Contains,  oQuery[1]));
						}
					}

			
				this._oAddEnvList.getBinding("rows").filter(oTableSearchState, sap.ui.model.FilterType.Application);
			}
		},
		
		onRunsLiveSearch: function(oEvent) {
			this._applySearch(oEvent.getParameter("newValue"), this._oRunsList, "start");
		},
		
		onRunsSearch: function(oEvent) {
			this._applySearch(oEvent.getParameter("query"), this._oRunsList, "start");
		},
		
		// make sure the only one attended edit session is running
		onAttendedEditScript: function(oEvent) {
			if (this._inAttendedEdit){
				this.liteNotification( this.getResourceBundle().getText("attendedEditSessionProgressNotification"), "warn") ;
				return {};
			}
			var	 currScript = oEvent.getSource().oParent,
				oModel = this.getModel("testDetails"),
				sScriptPath = currScript.oBindingContexts.testDetails.getPath(),
				oScripts = oModel.getProperty("/scripts"),
 				sScriptIndex = sScriptPath.split("/")[2],
 				oScript = oScripts[sScriptIndex];
  				return this._startAttendedEditSession(oScript);
		
		},
		
		_startAttendedEditSession: function(oAssetData) {
			
			var that = this;
			if (oAssetData && oAssetData.physicalFileName) {
				this._inAttendedEdit = true;
				this.getView().setBusy(true);
				return 	that.common().startAttendedEdit(that.context(), oAssetData)		
				
				.finally( function( reply) {
					that._inAttendedEdit = false;
					that.getView().setBusy(false);
					return reply;
				});
			}
			else {
				return 	Q.reject("Illegal asset data");	
			}
		},
		
		onDeleteScript: function(oEvent) {
			var currScript = oEvent.getSource().oParent,
				oModel = this.getModel("testDetails"),
				sScriptPath = currScript.oBindingContexts.testDetails.getPath(),
				oScripts = oModel.getProperty("/scripts"),
 				sPath = oEvent.getSource().getBindingContext().getPath(),
 				sTestId = oModel.getProperty("/testId"),
 				sScriptNumber = sScriptPath.split("/")[2],
 				that = this;
		
			return this._deleteScript( sTestId, oScripts, sScriptNumber)
			.then( function( bStatus) {
				// TBD:  refresh the only scripts table
				if ( bStatus) {
					//var oScriptsList = that.byId("scriptsList");
					//oScriptsList.removeItem(currScript);
					//oScriptsList.rerender();
					that._bindView(sPath);
				}
			});
		},
		
		_deleteScript: function( sTestId, oScripts, sScriptNumber)
		{
			var	that = this,
				oScript = oScripts[sScriptNumber],
				i18n = this.getResourceBundle() || this.context().i18n,
				sTitle = i18n.getText("deleteScriptTitle"),
				sMessage = i18n.getText("deleteScriptText", [oScript.originalFileName]),
				sTooltip = i18n.getText("deleteScriptTooltip");
				
			return this._openAreYouSureDialog({title: sTitle, message: sMessage, tooltip: sTooltip})
				.then( function() {
					oScripts.splice( sScriptNumber, 1);
					return that._Models.saveTestScripts(that.getModel("srf"), sTestId, that.convertScriptsForSave(oScripts, false, sTestId))
			
					.then( function( ) {
						// oResponce is the test details model
						return true;
					})
					.catch( function( error) {
						var sMsg = i18n.getText("deleteScriptFailedMsg",[oScript.originalFileName, error]);
					
						that.trace( sMsg, "error");
						that.liteNotification( sMsg, "error");
						return false;
					});
				})
				.catch( function() {
				//	window.console.log("Delete script for test " + sTestId + " cancelled");
					return false;
				});
		},
		
		onSaveScripts: function() {
			// clear the search results so bring full list to view
		
			var oViewModel = this.getModel("testDetails"),
				sTestId = oViewModel.getProperty("/testId"),
				oExistingScripts = this.convertScriptsForSave(oViewModel.getProperty("/scripts"), false, sTestId),
				sPath,								
				oScript,
				oScripts = [],
				oConvertedScripts = [];
				
			// clear the search results so bring full list to view  
			this._applySearch("", this._oAddScriptsList, "name");
			// get selected items from the full list and not from filtered only
			var aItems =this._oAddScriptsList.getSelectedItems();
			// apply search back
			
			this._applySearch(oViewModel.getProperty("/_assets/searchAssetByName"), this._oAddScriptsList, "name");
			$.each(aItems, function(i, script) {
				sPath = script.getBindingContext("testDetails").getPath();
				oScript = oViewModel.getProperty(sPath);
				//window.console.log("onSaveScripts: test " + oScript.id + " " + oScript.name);
				// add flag or switch its value
				oScripts.push(oScript);			
			});
 
			if( oScripts && oScripts.length > 0) {
 				var oContext = this._oAddScriptsList.getBindingContext(),
 					that = this;
 				sPath = oContext ? this._oAddScriptsList.getBindingContext().getPath() : undefined;
				if(!sPath) {
					$.merge(oScripts, oViewModel.getProperty("/scripts") || []);
					oViewModel.setProperty("/scripts", oScripts);
				}
				
				oConvertedScripts = this.convertScriptsForSave(oScripts, true, sTestId);
				$.merge(oConvertedScripts, oExistingScripts);
 				return this._Models.saveTestScripts(this.getModel("srf"), sTestId, oConvertedScripts, true)
 				.then( function() {
	 				// remove all( filtered and sorted) selections 
					that._oAddScriptsList.removeSelections(true);
					//reset/update model's selectedItemsCount
					that.getModel("testDetails").setProperty("/_assets/selectedItemsCount", that._oAddScriptsList.getSelectedItems().length);
					// apply search
					that._applySearch(that.getModel("testDetails").getProperty("/_assets/searchAssetByName"), that._oAddScriptsList, "name");
					that._bindView(sPath);
				});
 			}
 			return Q.resolve(null);
		},
	

		convertScriptsForSave: function(oScripts, bNew, testId) {
	
			/* The data supposed to look like:
				{
					"id": "edcdb1d4-14fb-4e16-9729-10734e380db0",
					"scripts": [{
						"id": "0ca1d079-81dd-4c6b-8c43-432804181888",
						"test": {
							"id": "edcdb1d4-14fb-4e16-9729-10734e380db0"
						},
						"primaryResource": {
							"id": "73fa34af-2106-4072-bed4-86c65ed30372"
						},
						"resources": null,
						"creationDate": "2016-07-18T23:16:34.096Z",
						"modifiedDate": "2016-07-18T23:16:34.096Z",
						"charterBlob": null,
						"params": null
					}]
				}

				Now it looks :
					"assets": [{
					"id": "41303976-f0fa-4c95-bfa3-6c39cba954c4",
					"name": "Call Elevator",
					"description": "resource 2 description",
					"type": "mobile",
					"sdk": "selenium",
					"originalFileName": "scripts/callElevator.js",
					"physicalFileName": "41303976-f0fa-4c95-bfa3-6c39cba954c4",
					"runner": "mocha",
					"owner": "Yossi Neeman",
					"creationDate": "2016-04-10T13:40:04.137+03:00",
					"modificationDate": "2016-04-10T13:40:04.137+03:00",
					"editable": true,
					"data": null,
					"testsCount": "2"
				}]
				
			*/
			var oNewScripts = [],
				that = this;
				
			$.each(oScripts, function(i, oScript) {
				oScript.parameters = oScript.parameters || [];				
				var id = oScript.id,
					oNewScript = {},
					parameters = that._Models._convertScriptParamValues(oScript.parameters, id);
					
				if( bNew ) {
					oNewScript = {
						id: "NEW_ITEM_" + id,
						primaryResource: {
							id: id
						}
					};
					// add flag or switch its value
					oNewScripts.push(oNewScript);
				}
				else {
					oNewScript = {
						id: id,
						test: {
							id: testId
						},
						primaryResource: {
							id: (oScript.primaryResource && oScript.primaryResource.id) || oScript.id
						},
						resources: oScript.resources
					};
					if(parameters && parameters.length) {
						oNewScript.parameters = parameters;
					}

					// add flag or switch its value
					oNewScripts.push(oNewScript);
				}
			});

			return oNewScripts;
		},

		onSaveLabEnv : function(oSelectedBrowsers) {
			var oEnvModel = this.getModel("mcEnvironments"),
				oSelectedDevices = oEnvModel.getProperty("/selecteddevices"),
				oSpecificDevices = oEnvModel.getProperty("/selectedspecificdevices"),
				oSelectedApps = oEnvModel.getProperty("/selectedmobileapps"),
				oSelectedRunContext = oEnvModel.getProperty("/selectedruncontext"),
				oPackageForSave = MCEnvUtils.convertPackageForSave(oSelectedBrowsers, 
													$.merge(oSelectedDevices, oSpecificDevices), 
													oSelectedApps,
													oSelectedRunContext),
				oViewModel = this.getModel("testDetails"),
				oTestContext = this._oNewEnvDialog.getBindingContext(),
				sPath = oTestContext && oTestContext.getPath(),	
				oTest = oViewModel.getProperty("/test"),
				that = this;

			return that._Models.saveTestPackage(that.getModel("srf"), oTest, oPackageForSave)
			.then( function() {
				that._bindView(sPath);
			})
			.finally( function() {
				that._closeNewEnvDialog();
			}); 
		},
		
		onSaveNewEnv: function() {
			var oSelectedEnv = SrfEnvUtils.convertSelectedBrowsersToEnv(oSelectedEnv),
				oViewModel = this.getModel("testDetails"),
				oEnvModel = this.getModel("environments"),
				oSelectedBrowsers = oEnvModel.getProperty("/srfSelectedEnv"),
				that = this;
				
			if ( oViewModel.getProperty("/runEnvironmentsSelection") === false ) {
				if(oSelectedBrowsers && oSelectedBrowsers.count > 0) {
					return this._Models.saveRecordSettings(this.getModel("srf"), oSelectedBrowsers, oViewModel.getProperty("/platform"))
					.then( function(oRecordingEnv) {
						oViewModel.setProperty("/scriptRecordingEnvironment", oRecordingEnv);
						return oRecordingEnv;
					})
					.finally( function() {
						// for sure
						oViewModel.setProperty("/runEnvironmentsSelection", true);
						that._envMode = "allEnv";
						that._closeNewEnvDialog();
					}); 
				} else {
					oEnvModel = this.getModel("mcEnvironments");
					oSelectedBrowsers = oEnvModel.getProperty("/selectedbrowsers");
					
					var oSelectedDevices = oEnvModel.getProperty("/selecteddevices"),
						oSpecificDevices = oEnvModel.getProperty("/selectedspecificdevices"),
						oSelectedApps = oEnvModel.getProperty("/selectedmobileapps"),
						oSelectedRunContext = oEnvModel.getProperty("/selectedruncontext"),
						oPackageForSave = MCEnvUtils.convertPackageForSave(oSelectedBrowsers, $.merge(oSelectedDevices, oSpecificDevices), oSelectedApps, oSelectedRunContext);

					return this._Models.saveRecordSettings(this.getModel("srf"), oPackageForSave, oViewModel.getProperty("/platform"))
					.then( function( oRecordingEnv) {
						var retRecordingEnv = oRecordingEnv || {};
						var sRecEnvText = that.formatter.recordingEnvironment(retRecordingEnv);
						that._oSelectExecutabelDialog._record._recordingEnvironmentLabel.setText(sRecEnvText);
						that._oSelectExecutabelDialog._record._recordingEnvironmentLabel.setTooltip(sRecEnvText);
						
						oViewModel.setProperty("/scriptRecordingEnvironment", retRecordingEnv);
						return retRecordingEnv;
					})
					.finally( function() {
						// for sure
						oViewModel.setProperty("/runEnvironmentsSelection", true);
						that._envMode = "allEnv";
						that._closeNewEnvDialog();
					}); 
				}	
			} 
			else {
				if(oSelectedBrowsers && oSelectedBrowsers.length > 0) {
					oViewModel.setProperty("/environments", oSelectedBrowsers);			
				}
				
				this.onSaveLabEnv(oSelectedBrowsers);
			}
			
			return true;
		},
		
		onClearEnvironment: function(){
			var	that = this,
				i18n = this.getResourceBundle() || this.context().i18n,
				sTitle = i18n.getText("areYouSureForRemoveSelectedEnvTitle"),
				sMessage = i18n.getText("areYouSureForRemoveSelectedEnv"),
				sTooltip = i18n.getText("areYouSureForRemoveSelectedEnv");
				
			return this._openAreYouSureDialog({title: sTitle, message: sMessage, tooltip: sTooltip})
				.then( function() {
					var oTest = that.getModel("testDetails").getProperty("/test");
						oTest.packageId = "";
				
					that._Models.saveTestPackage(that.getModel("srf"), oTest);
					that._loadMCFavorites(that.getModel("mcEnv"));
					return;
				})
				.catch( function() {
				//	window.console.log("Delete script for test " + sTestId + " cancelled");
					return false;
				});
		},
		
		onAddLabEnvDlgOpen: function() {
			var oEnvViewModel = this.getModel("mcEnvironments"), 
				oDevicesModel = this._Models.loadMCDevices(this.getModel("srf")),
				oDialog = this._getEnvLabDialog();
		//		oViewModel = this.getModel("testDetails");
	//			sPackageId = oViewModel.getProperty("/test/packageId"),
//				oEnvModel = this._Models.loadEnvironmentsModelBeta(this.getModel("srf")),
	//			that = this;		
			
			this._showSelectionPanels(oEnvViewModel, false);

			oDevicesModel.detachRequestCompleted(this.loadDevicesModel);
			this.loadDevicesModel = function() {
				var oDevicesContent = this.getProperty("/"),
					oDevices = MCEnvUtils.devicesToUI(oDevicesContent);

				oEnvViewModel.setProperty("/devices", oDevices);
			};
			oDevicesModel.attachRequestCompleted(this.loadDevicesModel);
			
	//		this._loadMCFavorites(this.getModel("mcAdd"), sPackageId);
	//		oEnvModel.detachRequestCompleted(this.loadEnvironmentsBeta);
			// this.loadEnvironmentsBeta = function() {
			// 	var oLabContent = this.getProperty("/"),
			// 		oEnv = MCEnvUtils.contentJsonToUI(oLabContent);

			// 	oEnvViewModel.setProperty("/environments", oEnv);
			// 	oEnvViewModel.setProperty("/labTypes", oEnv.labTypes);
			// 	oEnvViewModel.setProperty("/rules", oEnv.rules);
				
			// 	if(sPackageId) {
			// 		var currPackage = that._loadSelectedBrowsers();
				
			// 		that._setSelectedFavorite(currPackage.uuid);
			// 		that._backupSelectedPackage(currPackage);
			// 	} else {					
			// 		oEnvViewModel.setProperty("/selectedbrowsers", []);
			// 		oEnvViewModel.setProperty("/selecteddevices", []);
			// 	}
			
			// };
//			oEnvModel.attachRequestCompleted(this.loadEnvironmentsBeta);

			oDialog.open();
		},
		
		_setSelectedFavorite: function(sKey) {
			var oViewModel = this.getModel("testDetails"),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "",	
				oFavCombo = sap.ui.getCore().getElementById(sPrefix + "--envFavorites1");
				
			oFavCombo.setSelectedKey(sKey);
		},

		onAddNewEnvDlgOpen: function() {
			this.getModel("testDetails").setProperty("/runEnvironmentsSelection", true);
			this._envMode = "allEnv";
			this._loadEnvironments(); 
	
			this._selectedTestEnvs = [];
			this._currTestEnvs = [];
		
			this._getNewEnvDialog().open();
		},

		onAddNewEnvDlgCancel: function() {
			this._closeNewEnvDialog();
		},
		
		_closeNewEnvDialog: function() {
			this.getModel("testDetails").setProperty("/runEnvironmentsSelection", true);
			this._envMode = "allEnv";
			this._loadMCFavorites(this.getModel("mcEnv"));
			if ( this._oNewEnvDialog) {
				this._oNewEnvDialog.close(); 
			}
			
			this.getView().setBusy(false);
		},
		
		onTestNameChange: function(oEvent) {
			var	oModel = this.getModel("testDetails"),
				oTest = oModel.getProperty("/"),
				that = this;
		
			// store the previous test name
			oModel.setProperty("/prevTestName", oTest.name);
			var bApplyChanges = this._validateTestName(oEvent.getParameter("newValue"));
			if ( bApplyChanges) {
				oTest.name = oTest.newTestName;
				oTest.description = oTest.desc;
				return this._Models.saveTestDetails(this.getModel("srf"), oTest)				
				.then(function(test) {
					oModel.setProperty("/test", test);
					that.onRefresh();
					return;
				});
			}
			else {
				// restore the previous test name
				return oModel.setProperty("/newTestName", oModel.getProperty("/prevTestName"));
			}
		},

		_validateTestName: function(sName){
			var	oModel = this.getModel("testDetails"),
				oCommon = this.common(),
				i18n = this.getResourceBundle(),
				error = "",
				bRet = true;
			if ( !$.trim(sName)) {
				error = i18n.getText("newTest_TestNameEmpty");	
				bRet = false;
			}
			else if ( sName.length >= oCommon._nSrfTestNameMaxLength) {
				error = i18n.getText("newTest_TestNameTooLong", [oCommon._nSrfTestNameMaxLength]); 
			}
			oModel.setProperty("/newTestNameError", error);
			oModel.setProperty("/newTestNameErrorShow", error ? true : false);

			return bRet;	
		},
		
		onDescChange: function(oEvent) {
			var	oModel = this.getModel("testDetails"),
				oAuxModel = this.getModel("srf"),
				oTest = oModel.getProperty("/"),
				that = this;
				
			if(oTest.testId) {
				return this._Models.saveTestDetails(oAuxModel, oTest)
				.then(function(test) {
					oModel.setProperty("/test", test);
					that.onRefresh();
				});
			} 

			return this._createTest()
			.then ( function ( testDetails) {
				testDetails.test.description = oTest.desc;
				testDetails.test.name = oTest.name;
				return that._Models.saveTestDetails(oAuxModel, testDetails.test);
			})
			.catch( function (error) {
				var sMsg = 	that.getResourceBundle().getText("updateTestDetailsFailureMsg", [oTest.newTestName, error && error.responseText]);
				that.trace( sMsg, "error");
				that.liteNotification(
					sMsg,
					"failure");
				return;
			});
			
		},
			
		onSubmitDefect: function() {
			var	oModel = this.getModel("testDetails"),
	//			sScriptRunId = oModel.getProperty("/scriptRun/yac") || oModel.getProperty("/scriptRun/id"),
				sRunId=oModel.getProperty("/lastRun/yac");		

			this.common().openSRF("results/" + sRunId + "/details/submit-defect" );
		},		
		

		onMoreInformation: function() {
			var	oModel = this.getModel("testDetails"),
				sScriptRunId = oModel.getProperty("/scriptRun/yac") || oModel.getProperty("/scriptRun/id"),
				sRunId=oModel.getProperty("/lastRun/yac");		

			this.common().openSRF("results/" + sRunId + "/details/compare?script-runs=" + sScriptRunId );
		},		
		
		onLetUsKnow: function() {
			this.common()._openInNewTab("https://home.software.microfocus.com/myaccount/?TENANTID=0#/tickets/addNewTicket/product/10096/service/instance/304108/category/General/catalogItem/StormRunnerFunctional_General_Enhancement%20Request",
						this.common()._oContext);
		},				
		
		onLogButtonClick: function(){
			var dlg = this._getLogDialog();

			dlg.open();	
		},
			
		verifyDefectsRepository: function () {
			var that = this;
			return this._Models.verifyDefectsRepository(this.getModel("srf"))
			.catch(function(oResponse) {
				var errtext = that.getResourceBundle().getText("NoDefectServerMsg");
 				jQuery.sap.require("sap.m.MessageBox");	
 				var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
				if(oResponse ) {
					switch ( oResponse.status ) {
						case 403:
						case 405:
							errtext = that.getResourceBundle().getText("AuthDefectServerMsg");
							break;
						case 500:
						default:
							break;
					}

					sap.m.MessageBox.error(errtext, {
					title: "Error",                                    // default
					onClose: null,                                       // default			
					styleClass: bCompact? "sapUiSizeCompact" : ""
					});
				} else {
					errtext = that.getResourceBundle().getText("NoDefectServerMsg");
 					sap.m.MessageBox.error(errtext, {
					title: "Error",                                    // default
					onClose: null,                                       // default			
					styleClass: bCompact? "sapUiSizeCompact" : ""
					});
				}
				that.trace(errtext + "\n[" + oResponse.statusText + "]\n" + oResponse.responseText, "error");
				return Q.reject(errtext);
			});
		},
		
		onPreviousRunsDlgOpen: function() {
	
			var oViewModel = this.getModel("testDetails"),
				testPath = this.getView("details").getBindingContext().getPath(),
				id = testPath.split("/");
				
			this.getRouter().navTo("runs", {
				testId: id[2],
				oData: oViewModel.getProperty("/testRuns")
			});
			// var oDialog = this._getPreviousRunsDialog();
		
			// oDialog.open();
		},
		
		onPreviousRunsDlgCancel: function() {

			this._getPreviousRunsDialog().close(); 
		},

		_getPreviousRunsDialog: function() {
			// create dialog lazily
			if (!this._oPreviousRunDialog) {
				// create dialog via fragment factory
				this._oPreviousRunDialog = sap.ui.xmlfragment("srf.view.dialog.PreviousRunsDialog", this);
				this.getView().addDependent(this._oPreviousRunDialog);
			}
			return this._oPreviousRunDialog;
		},
		
		_loadRunData: function(runId, oViewModel) {
			var that = this;
				
			this._cleanRunTable(oViewModel);
			this._cleanStepsList(oViewModel);

			this._Models.loadTestRunsModel(this.getModel("srf"), { id: runId })
			.then( function( oRunsModel) {
	
					var oRun = oRunsModel.getProperty( "/runData");
					
					if(oRun) {
						if(oRun.scriptRuns) {
							var oScriptRunsTable = that._convertScriptRunsToTable(oRun.scriptRuns);	
							try {
								that._fillRunTable( oScriptRunsTable, that._sTenantId );
							} 
							catch( err) {
								that.trace(err.message && err.statusText, "error");
							}
							oViewModel.setProperty("/lastRunTable", oScriptRunsTable);
							oViewModel.setProperty("/scriptRuns", oRun.scriptRuns);

							that.byId("runErrors").setProperty("visible", false);
							that.byId("scriptRun").setProperty("visible", true);							
						}
	
						oViewModel.setProperty("/lastRun", oRun);
						oViewModel.setProperty("/lastRunVisible", true);
					} else {
						oViewModel.setProperty("/lastRun", undefined);	
						oViewModel.setProperty("/lastRunVisible", false);
					}
			}).done(); // due to the legacy code is not waiting
			
		},
		
		_fillRunTable: function( oScriptRunsTable, sTenantId) {
			var oComparisonTable = this._oComparisonTable,
				that = this;
			
			if(oComparisonTable) {
				
				oComparisonTable.bindAggregation("items", "testDetails>/lastRunTable/items", 
				function(id, context) {
					var item = context.getObject();
					if(item) {
						 var oCells = [];
					  	
					  	 $.each(oScriptRunsTable.cols, function(i, col) {
							if(i === 0 ) {
								var param = item.params,
									imgPath = that.formatter.parametersRunImg(param),
									tooltip = imgPath ? "Click here to see param values" : "";//oController.formatter.parametersRunTooltip(param);

								 oCells.push(new sap.m.Image( {	src : imgPath,
									 							alt : imgPath,
									 							tooltip: tooltip,
									 							press: function() {
																		that.onParamPopoverOpen(this, context.getPath());
																	}
															})); 
															
							} else if(i === 1 ) {
								var oText = new sap.m.Text({text : "{testDetails>name}",
															tooltip : "{testDetails>name}" });

							//	oText.setTooltip("{testDetails>name}");
								oText.setProperty("wrapping", false);
						
								oCells.push(oText); 
							}
							else {
								var image = new sap.m.Image( {	src :"{testDetails>col" + i + "}", 
																alt:"{testDetails>col" + i + "}",
																tooltip:"{testDetails>errors" + i + "}",
																press: function() {
																		that.onScriptRunSelected(item["scriptRun" + i], this, sTenantId);
																	}
															});
								image.addStyleClass(item["class" + i] );
								oCells.push(image);
							}
						});
						
						var oTemplate = new sap.m.ColumnListItem( {cells: oCells} );   
						return oTemplate;
					}
				});
				
				oComparisonTable.getBinding("columns").refresh();
				
				//oComparisonTable.getBinding("items").refresh();
			}
		},
		
		_refreshRunTable: function(oController) {
			this._oComparisonTable.getBinding("items").refresh();
		},
		
		onScriptRunSelected: function(oScriptRun, image, sTenantId) {
			var oViewModel = this.getModel("testDetails"),
				stepsTree = null,
				oScriptSteps = oScriptRun.scriptSteps;
			
			this.byId("runErrors").setProperty("visible", false);
			
			this.byId("scriptRun").setProperty("visible", false);
			
			this._oSnapshots.destroyPages().removeAllPages();
			this._oSnapshotsWithProp.destroyPages().removeAllPages();			
			this._oSnapPages = [];
			if(this._oComparisonTable && this._oComparisonTable.getBinding("items")) {
				this._oComparisonTable.unbindAggregation("items", true);
			}
			
			var sModulePath = jQuery.sap.getModulePath("srf/img/status"),
				prevRun = oViewModel.getProperty("/scriptRun"),
				prevImage = oViewModel.getProperty("/selectedImage");
			
			image.setProperty("src", this.formatter.scriptSelectedStatus(sModulePath, oScriptRun.status));
			if(prevRun) {
				prevImage.setProperty("src", this.formatter.scriptStatus(sModulePath, prevRun.status));	
			}

			oViewModel.setProperty("/scriptRun", oScriptRun);
			oViewModel.setProperty("/selectedImage", image);
			this._oScriptRunEnv.setProperty("visible", true);
			this._oStepsList.setProperty("visible", true);
			this.byId("moreInformation").setProperty("visible", true);
			this.byId("executionLog").setProperty("visible", true);
			this.byId("executionLog").setProperty("enabled", false);

			oViewModel.setProperty("/btnShowStepProperties/visible", true);
		
			stepsTree = ScriptStepUtils.convertScriptStepsToTree(oScriptSteps, oScriptRun.durationMs, this, sTenantId);
			
		//	oViewModel.setProperty("/scriptSteps", oScriptSteps);
			oViewModel.setProperty("/scriptSteps", stepsTree);

			this.byId("scriptRun").setProperty("visible", true);
			this._oSnapshots.setProperty("visible", !oViewModel.getProperty("/btnShowStepProperties/pressed"));
			this._oSnapshotsWithProp.setProperty("visible", oViewModel.getProperty("/btnShowStepProperties/pressed"));

			this.loadScriptLog(oScriptRun);	
			// show log button enable - sync 
			this.byId("executionLog").setProperty("enabled", oScriptRun && oScriptRun.executionLog ? true : false);
		
			var aPages = this._oSnapshots.getPages();
			if ( aPages.length > 0 ) {
				var snapPage = this._oSnapPages[1];
				this._oSnapshots.setActivePage(snapPage.image);
				this._oSnapshotsWithProp.setActivePage(snapPage.withProp);
 				this._oStepsList.expandToLevel(100);	
 				this._oStepsList.setSelectedIndex(snapPage.treeStepIndex);
			}
			//  the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor
			this._snapshotsScrollIntoView();
			window.setTimeout(this._snapshotsScrollIntoView.bind(this), 1000);
			if(this._oGeneralDetailsPanel) {
				this._oGeneralDetailsPanel.setProperty("expanded", false);
			}
			
		},
		
		loadScriptLog: function (oScriptRun) {
			var oViewModel = this.getModel("testDetails");
			var logId = oScriptRun.executionLog;
			if ( !logId) {
				this.trace( this.getResourceBundle().getText("noLogFileMsg", [oScriptRun.assetInfo && oScriptRun.assetInfo.name || "burst-run-" + oScriptRun.script.id,  this.formatter.timestampToDateTime(oScriptRun.start)]), "info");
				return;
			}
			var	log = this._Models.loadScriptLog(this.getModel("srf"), logId),
			that = this;
				
			log.detachRequestCompleted(this._scriptLogRequestCompletedHandler);
			this._scriptLogRequestCompletedHandler = function() {
				var sScriptLog = "";
			
				$.each(this.getProperty("/"), function(i, line) {
					var formattedLine = "",
						lineString = JSON.stringify(line);
					JSON.parse(lineString, function(key, value) {
						if( key !== "" ) {
							value.replace(/\x1b /g, "_");
					 		formattedLine = that.formatter.timestampToDateTime(key) + " : " + value;
						}
					});
					
					sScriptLog += formattedLine;
				});
				
				oScriptRun.executionLogText = sScriptLog;
				oViewModel.setProperty("/scriptRun/executionLogText", sScriptLog);
				// synch the log button here
				//that.byId("executionLog").setProperty("enabled", oScriptRun && oScriptRun.executionLog ? true : false);

			};
			
			log.attachRequestCompleted(this._scriptLogRequestCompletedHandler);	
		},
		
		onScriptSnapSelected: function(sUrl, sDescription) {
			// var viewer = this.byId("bigSnapViewer");
			var dlg = this._getSnapshotDialog(),
				image = dlg.getAggregation("content")[1];
			
			dlg.setTitle(sDescription);

			image.setProperty("src", sUrl);
			dlg.open();
		},
		
		onSnapshotLoadError: function(oEvent) {
			var sModulePath = jQuery.sap.getModulePath("srf/img");
			
			oEvent.getSource().setProperty("src", (sModulePath + "/no_snapshot.png"));
		},
		
		onSnapshotClose: function(oEvent) {
			if ( this._oSnapshotDialog) { 
		    	this._oSnapshotDialog.close();
			}	
		},
		
		onStepSelected: function(oEvent) {
			var context = oEvent.getParameters("rowContext").rowContext,
				sPath = context.getPath(),
				step = context.getModel().getObject(sPath);

			//  the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor
			this._snapshotsScrollIntoView();
			var aPages =this._oSnapshots.getPages();
			if ( step && step.snapshotIndex && aPages.length > 0  ) {
				this._oSnapshots.setActivePage(this._oSnapPages[step && step.snapshotIndex].image );	
				this._oSnapshotsWithProp.setActivePage(this._oSnapPages[step && step.snapshotIndex].withProp );
				if( this._oSnapPages[step.snapshotIndex] && this._oSnapPages[step.snapshotIndex].oStepProperties ) {
					this._oSnapPages[step.snapshotIndex].oStepProperties.bindElement({path: sPath, model: "testDetails" });
				}
			}
		},
		
		onPrevStep: function(oEvent) {
			var sStepPath = oEvent.getSource().getParent().getBindingContext("testDetails").getPath(),
				step = this.getModel("testDetails").getObject(sStepPath);
			
			var aPages = this._oSnapshots.getPages();
			if ( step && aPages.length > 0 && step.snapshotIndex > 0) {
				this._oSnapshots.setActivePage(this._oSnapPages[step && --step.snapshotIndex ].image );
				this._oSnapshotsWithProp.setActivePage(this._oSnapPages[step && --step.snapshotIndex ].withProp);
			}
		},
		
		onNextStep: function(oEvent) {
			var sStepPath = oEvent.getSource().getParent().getBindingContext("testDetails").getPath(),
				step = this.getModel("testDetails").getObject(sStepPath);
	
			var aPages = this._oSnapshots.getPages();
			if ( step && aPages.length > 0  && step.snapshotIndex < aPages.length - 1) {
				this._oSnapshots.setActivePage(this._oSnapPages[step && ++step.snapshotIndex ].image );
				this._oSnapshotsWithProp.setActivePage(this._oSnapPages[step && ++step.snapshotIndex ].withProp);
			}
		},
	
		// PARAMETER: bAlignToTop, default - false
		//			true, the top of the element will be aligned to the top of the visible area of the scrollable ancestor.
		//			false, the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor.
		_snapshotsScrollIntoView: function( alignToTop)	
		{
			var el = this._oSnapshots.getDomRef();
			if ( !alignToTop) {
				alignToTop = false; 
			} 
			if ( el) {
				el.scrollIntoView(alignToTop);	
			}
		},
		
		onSnapshotChanged:  function(oEvent) {
			var id = oEvent.getParameters("newActivePageId") && oEvent.getParameters("newActivePageId").newActivePageId,
				that = this,
				visibleRowCount = this._oStepsList.getVisibleRowCount();
			
			if( id ) {
				$.each(this._oSnapPages, function(i, snapPage) {
					var pageLayoutId = snapPage && snapPage.withProp.getId(),
						pageImageId = snapPage && snapPage.image.getId(),
						treeStepIndex = snapPage && snapPage.treeStepIndex;

					if( pageLayoutId === id || pageImageId === id ) {
						var firstRow = that._oStepsList.getFirstVisibleRow();

						if( treeStepIndex > firstRow + visibleRowCount -1 ) {
							that._oStepsList.setFirstVisibleRow( treeStepIndex - visibleRowCount + 1 );
						} else if( treeStepIndex < firstRow ) {
							that._oStepsList.setFirstVisibleRow( treeStepIndex );
						}
						
						that._oStepsList.expandToLevel(100);	
						that._oStepsList.setSelectedIndex(treeStepIndex);
						return;
					}
				});		
			}
		},

		// TODO: remove if not needed
		_cleanupModel: function( sModelName, oViewModel) {
			switch ( sModelName) {
				case "testDetails":
					this._cleaunpTestDetailsModel(oViewModel);
					break;
				case "testsView":
					break;
				case "runningTests":
					break;
				case "environments":
					break;
				default:
					break;
			}
		},
		
		_cleaunpTestDetailsModel: function(oViewModel) {
		
			oViewModel.setProperty("/testId", null);

			oViewModel.setProperty("/name", "");
			oViewModel.setProperty("/description", "");
			oViewModel.setProperty("/scripts", {}); 

			oViewModel.setProperty("/testruns", {}); 
			oViewModel.setProperty("/testOwner", "");
			oViewModel.setProperty("/creationDate", "");
			oViewModel.setProperty("/test",  {});
			oViewModel.setProperty("/subType",  "");
			oViewModel.setProperty("/environments", []);
			oViewModel.setProperty("/newTestName",  "");
			oViewModel.setProperty("/name", "");
			oViewModel.setProperty("/prevTestName", "");
			oViewModel.setProperty("/desc",   "");
			oViewModel.setProperty("/description",  "");
			oViewModel.setProperty("/platform",  "web");
			oViewModel.setProperty("/tags", []);
			oViewModel.setProperty("/owner", {id: "", name:""});
			oViewModel.setProperty("/author", {id: "", name:""});

			oViewModel.setProperty("/newTestNameError", "");
			oViewModel.setProperty("/prefix", "existingTest");		
			
			this._cleanRunTable(oViewModel);
			this._cleanStepsList(oViewModel);

		},
		
		_cleanRunTable: function(oViewModel) {
			var oComparisonTable = this._oComparisonTable;

			oViewModel.setProperty("/lastRunTable", undefined);
			if(oComparisonTable) {
				if(oComparisonTable.getBinding("items")) {
					oComparisonTable.getBinding("items").refresh();
				}
				oComparisonTable.getBinding("columns").refresh();
			}
			
			oViewModel.setProperty("/lastRun", undefined);	
			oViewModel.setProperty("/lastRunVisible", false);
		},

		_cleanStepsList: function(oViewModel) {
			this._oSnapshots.destroyPages().removeAllPages();
			this._oSnapPages = [];	
			
			oViewModel.setProperty("/scriptSteps", undefined);
			oViewModel.setProperty("/scriptRun", undefined);
		
			this._oScriptRunEnv.setProperty("visible", false);
			this._oStepsList.setProperty("visible", false);
			this.byId("moreInformation").setProperty("visible", false);
			this.byId("executionLog").setProperty("visible", false);

			oViewModel.setProperty("/btnShowStepProperties/visible", false);
			this._oSnapshots.setProperty("visible", false);
			this._oSnapshotsWithProp.setProperty("visible", false);
		},
		
		_cleanSelectedBrowsers: function() {
			var oFavModel = this.getModel("mcEnv");

			oFavModel.setProperty("/favorites", undefined);
		},
		
		_getScriptInstanceName: function(scriptRun) {
			var scriptName = scriptRun.name || "";

            if (scriptRun.test && scriptRun.test.id && scriptRun.test.id === "-1" ) {
                return "burst-run-" + scriptName;
            }

            if (scriptRun.scriptInstance && scriptRun.scriptInstance.id ) {
                return  scriptRun.scriptInstance.id + scriptName;
            }
		},
		
		_convertScriptRunsToTable: function(oScriptRuns) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/status"),
				oRunTableModel = [],
				bFirstScript = true,
				cols = [{type: "", os: {name: "", version: ""}, browser: {name: "", version: ""}, resolution: "", width: "1px"},
						{type: "", os: {name: "", version: ""}, browser: {name: "", version: ""}, resolution: "", width: "60px", hAlign: "Begin"}], 
				oController = this,
				items = [];
				
			oScriptRuns = Utils.Array.reorder(oScriptRuns);
			var scriptRunsByScript = Utils.Array.groupBy(oScriptRuns, this._getScriptInstanceName);
			$.each(scriptRunsByScript, function(i, scriptRuns) {
				scriptRuns = Utils.Array.sortBy(scriptRuns, SrfEnvUtils.generateEnvironmentId);
		
				$.each(scriptRuns, function(j, scriptRun) {
					var env = scriptRun.environment;
					env.resolution = scriptRun.resolution;
					//Maya: workaround for Devices
					env.browser.name = (env.browser && env.browser.name) || 
										env.deviceName || env.deviceType || 
										oController.getResourceBundle().getText("noDeviceAvailable2");
					env.os.name = env.os.name || oController.getResourceBundle().getText("noDeviceAvailable1");

					if(bFirstScript) {
						oController._addEnvToColumns(env, cols);
					}
					
					var item = oController._addScriptToItems(scriptRun, items),
						colIndex = j + 2,
						colName = "col" + colIndex;
						
					//Maya: revert shift snapshot
					//ScriptStepUtils.fixStepSnapshot(scriptRun.scriptSteps);
					item[colName] = oController.formatter.scriptStatus(sModulePath, scriptRun.status);
					item["class" + colIndex] = oController.formatter.scriptStatusClass(scriptRun.status);
					item["runData" + colIndex] = scriptRun;
					item["errors" + colIndex] = oController._convertScriptErrors(scriptRun.errors);
					item["scriptSteps" + colIndex] =  scriptRun.scriptSteps;
					item["scriptRun" + colIndex] =  scriptRun;
				});
				
				bFirstScript = false;
			});
			
			oRunTableModel.cols = cols;
			oRunTableModel.items = items;
			
			return oRunTableModel;
		},
		
		_convertScriptErrors: function(oErrors) {
			var ret = "";
			
			if(oErrors && oErrors.length > 0) {
				$.each(oErrors, function(i, error) {
					ret = error && error.message + "\r\n";	
				});
			} 
			 
			return ret;
		},
		
		_addScriptToItems: function(scriptRun, items) {
			var index = -1;
			var newItem = { scriptInstance : "" };
			
			$.each(items, function(i, item) {
				if( item.scriptInstance === scriptRun.scriptInstance.id ) {
					index = i;
					newItem = item;
					return;
				}
			});
			
			if(index === -1) {
				newItem.scriptInstance = scriptRun.scriptInstance.id;
				newItem.name = scriptRun.assetInfo && scriptRun.assetInfo.name || "burst-run-" + scriptRun.script.id;
				newItem.params = scriptRun.parameters;
				items.push(newItem);
			}
			
			return newItem;
		},
		
		_addEnvToColumns: function(env, cols) {

			env.width="6.5rem";
			env.hAlign="Center";
			cols.push(env);
		
		}
	
	});

});