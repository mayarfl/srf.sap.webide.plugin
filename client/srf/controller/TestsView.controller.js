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
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"../formatter/formatter",
	"../formatter/styleformatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"../utils/utils",
	"../utils/srfEnvUtils"
], function(BaseController, Device, JSONModel, oFormatter, oStyleformatter, Filter, FilterOperator, Utils, SrfEnvUtils) {
	"use strict";
	var TESTS_PAGE_SIZE = 100;

	return BaseController.extend("srf.controller.TestsView", {

		formatter: oFormatter,
		styleformatter: oStyleformatter,

		_oTable: null,
		_oTableSearchState: null,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf srf.view.TestsView
		 */
		onInit: function() {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass()).addStyleClass("sapUiSizeCompact");

			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("testsTable");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			this._oTable = oTable;
			// keeps the search state
			this._oTableSearchState = [];
			var sTitle = this.getResourceBundle().getText("testViewTitle");

			this._PAGE_SIZE = TESTS_PAGE_SIZE;


			// Model used to manipulate control states
			oViewModel = new JSONModel({
				tests: [],
				pageNumber: 1, // due to binding to paginator property pageNumber which is 1-based
				pageSize: this._PAGE_SIZE,
				growingThreshold: this._PAGE_SIZE + 1,
				totalPages: 1,
				totalItemsCount: 0,
				testsTableTitle: sTitle,
				// tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				btnRunIcon: jQuery.sap.getModulePath("srf/img/") + "/run.svg",
				btnRunEnabled: false
			});
			this.setModel(oViewModel, "testsView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});

			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "ProjectChanged", this.onProjectChanged, this);
			sap.ui.getCore().getEventBus().subscribe("SRF_Channel", "NavigateTo", this.onNavigateTo, this);

			this.getRouter().getRoute("tests").attachPatternMatched(this._onObjectMatched, this);

			this.getOwnerComponent().getTargets().display("details");
		},

		onProjectChanged: function() {
			var that = this;
			var ctx = this.context();

			return ctx && ctx.service.rightpane.isVisible()
				.then(function(bVisible) {
					if (bVisible) {
						return that._updateModel(true);
					} else {
						return Q();
					}
				}).done();
		},
		
		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			var oSource = oEvent.getSource();

			// The source is the list item that got pressed
			this._showObject(oSource);
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function() {
			history.go(-1);
		},

		onNavigateTo: function(sChannel, sEvent, oEventData) {
			var sTarget = oEventData.target ? oEventData.target : null;

			if (oEventData.reason && oEventData.reason === "newtest") {
				//window.console.error("SRF", "Create New Test by right click");
				return this._onNewTest( oEventData.type);
			} else {
				//	window.console.error("SRF", "srf.controller.TestsView.onNavigateTo :" + ( sTarget ? sTarget : " no target"));
				this.getRouter().navTo(sTarget);
			}
		},

		onSearch: function(oEvent) {
			this._applySearch(oEvent.getParameter("query"));
		},

		onLiveSearch: function(oEvent) {
			this._applySearch(oEvent.getSource().getValue());
		},

		onNewTest: function(oEvent) {
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return;
			}
		
			var i18n = this.getResourceBundle();
			var sTestPlatform = null;
			var sSelection = null;
			// one level menu
			if (  oEvent.getParameter("item").getText()  ) {
				sSelection = oEvent.getParameter("item").getText();
				switch ( sSelection) {
					case i18n.getText("menuItemMobilePlatform"):
						sTestPlatform =	i18n.getText("mobilePaltf");
						break;
					case i18n.getText("menuItemWebPlatform") :
						default:
						sTestPlatform = i18n.getText("webPlatf") ;
						break;
				}
			}
			
			oAuxModel.setProperty("/srf_newtest", "newtest");
			this._onNewTest( sTestPlatform).done();
		},

		_onNewTest: function( sTestPlatform) {
			var that = this;
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return Q(false);
			}
			if (oAuxModel.getProperty("/srf_newtest") === "") {
				return Q(false);
			}
			oAuxModel.setProperty("/srf_newtest", "");
		
			var i18n = this.getResourceBundle();
			if (!sTestPlatform ) {
				sTestPlatform  = i18n.getText("webPlatf");
			}
			return  Q.spread( [this._loadAllEnvironments(sTestPlatform), this.getAppDetails( )], 
				function(aEnvJson, oAppDetailes) {
					var sTestName = that.common().generateNewTestName(oAppDetailes, that.getResourceBundle());
					var desc = that.common().generateDescription(oAppDetailes);
					var aTags = that._Models.createDefaultTags(oAppDetailes, []);

					var env = SrfEnvUtils.getLatestEnvironment(aEnvJson);
					if ( !env || !env.length) {
						 env = SrfEnvUtils.getFirstAvailable(aEnvJson);
					}
					if ( !env) {
						 env = []; //that.common().generateDefaultEnvironment();
					}
						
					var testDefinitions = {
						sTestName: sTestName,
						sTestDescription: desc,
						sTestType: "auto",
						sTestPlatform: sTestPlatform,
						aTags: aTags,
						aScripts: [],
						aEnvoronments: env 
					};
					var testId = null;
					// create test if test does not exist ( testId is null )
					return that.common().createNewTest(that.context(), testDefinitions)
						.then(function(oTestDefinitionData) {
							// fix SRF ignores tags while test creation

							oTestDefinitionData.tags = aTags;
							oTestDefinitionData.testId = oTestDefinitionData.id;
							testId = oTestDefinitionData.id;
							return that._Models.updateTest(that.getModel("srf"), oTestDefinitionData);
						})
						.then(function() {
							// reload tests list on the first page: 
							// the new created test will be shown on the first page
							// due to sort by date 
							var oFetchParams = {
								pageNumber: 1,
								pageSize: that._PAGE_SIZE,
								sortOrder: "desc",
								sortBy: "modifiedDate"
							};
							return that._loadTestsModel(oFetchParams);
						})
						.then(function(oTestListModel) {

							var tests = oTestListModel.getProperty("/tests");
							var index = 0;
							for (index = 0; index < tests.length; index++) {
								if (tests[index].id === testId) {
									break;
								}
							}
							return index;
						})
						.then(function(index) {
							// publish new test creation event for subscribers and pass tab key to be selected
							var oEventBus = sap.ui.getCore().getEventBus();
							oEventBus.publish("SRF_Channel", "NewTestCreated", {
								sSelectedTabKey: that.getResourceBundle().getText("ScriptsCaption")
							});
							that.getRouter().navTo("details", {
								testId: index
							}, true);
							
							return;
						})
						.catch(function(err) {
							var errorDesc = i18n.getText("TestUpdateFailureNotification", [testDefinitions.sTestName, err.statusText || err.message || err]);
							that.trace(errorDesc, "failure");

							that.liteNotification(errorDesc, "failure");
						});
				});
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */

		onRefresh: function() {
			this._updateModel(true);
		},

		onQuickFilter: function(oEvent) {
			var sKey = oEvent.getParameter("key"),
				oFilter = this._mFilters[sKey],
				oBinding = this._oTable.getBinding("items");

			oBinding.filter(oFilter);

		},

		//TODO: ??
		onUpdateFinished: function(/*oEvent*/) {},

		onPageSelected: function(oEvent) {
			var targetPage = oEvent.getParameter("targetPage");
			this.getModel("testsView").setProperty("/pageNumber", targetPage || 1);
			this._updateModel(true).done();
		},

		handleSelectionChange: function( /*oEvent*/) {
		
			var testsItems = this._oTable.getSelectedItems();
			if (testsItems ) {
				this.getModel("testsView").setProperty("/btnRunEnabled", testsItems.length > 0);
			}
			else {
				this.getModel("testsView").setProperty("/btnRunEnabled", false);
			}
		},
		
		// get all selected tests and execute them 
		onRun: function() {
			var sPath, oTest;
			var aTests = [];
			this.common().setResourceBundle(this.getResourceBundle());

			var testsItems = this._oTable.getSelectedItems();
			if (testsItems) {
				$.each(testsItems, function(i, test) {
					sPath = test.getBindingContext().getPath();
					oTest = this.getModel().getProperty(sPath);
					this._addTestToRun(aTests, oTest);
				}.bind(this));

				this._runTests(aTests);
			}
		},

		onDeleteTest: function(oEvent) {
			var currTest = oEvent.getSource().oParent,
				oModel = this.getModel(),
				sPath = currTest.getBindingContext().getPath(),
				sTestId = oModel.getProperty(sPath + "/id"),
				sTestName = oModel.getProperty(sPath + "/name"),
				sTestOwner = oModel.getProperty(sPath + "/owner/id"),
				that = this;

			this.getView().setBusy(true);
			return this._deleteTest(sTestId, sTestName, sTestOwner).then(function(numberDeletedTests) {
				return numberDeletedTests && that._updateModel(true);
			}).finally(function() {
				that.getView().setBusy(false);
			}).done();
		},

		_onObjectMatched: function() {
			this._updateModel(true);
		},

		_runTests: function(aTestsToRun) {
			var len = aTestsToRun.length;
			if (len === 0) {
				this.liteNotification((this.getResourceBundle().getText("selectTestMsg") || "Please, select test to run."), "failure");
				return;
			}

			this.trace(this.getResourceBundle().getText("runTestsTotalMsg", [len]), "log");
			// run test from the aux array while cleaning it
			while (aTestsToRun.length > 0) {
				this._runSingleTest(aTestsToRun[0]).done();
				aTestsToRun.shift();
			}
		},

		// auxiliary running tests array 
		_addTestToRun: function(aTests, oTest) {
			var bFound = false;
			// verify test is not in the array 
			$.each(aTests, function(i, test) {
				if (test.id === oTest.id) {
					bFound = true;
					return;
				}
			});
			if (!bFound) {
				aTests.push(oTest);
			}
		},

		_updateModel: function(bUseBusyIndicator) {
			var that = this;
			bUseBusyIndicator = (bUseBusyIndicator === true);
			var ctx = this.context();

			return ctx && ctx.service.rightpane.isVisible()
			.then(function(bVisible) {
				if (bVisible) {
					that.getView().setBusy(bUseBusyIndicator);
					return that._preload()
					.then( function( bRet ) {
						return bRet && that._loadTestsModel();
					})
					.finally(function() {
						that.getView().setBusy(false);
					});
				} else {
					return Q();
				}
			});
		},
		
		onAfterRendering: function() {
			var that = this;
			// if called after the new test creation on right click in workspace project
			this.getView().setBusy(true);
			return this._onNewTest().then( function( bRet ) {
				return bRet && that._updateModel(true);
			}).finally(function() {
				that.getView().setBusy(false);
			}).done();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		_preload: function() {
			var oAuxModel = this.getModel("srf"),
				that = this;

			return oAuxModel && this._Models.loadProfile(oAuxModel)
			.then( function(profile) {
				var lastSelectedWorkspace = profile.workspaces[0].id;
				if( profile.lastSelectedWorkspaceId ) {
					var wsIndex = profile.workspaces.findIndex( function isExists(oWS) {																
																	return oWS.id === profile.lastSelectedWorkspaceId; });
					lastSelectedWorkspace = wsIndex > -1 ? profile.lastSelectedWorkspaceId : profile.workspaces[0].id;
				}
		
				oAuxModel.setProperty("/srf_workspaces", profile && profile.workspaces );
				oAuxModel.setProperty("/srf_lastSelectedWorkspaceId", lastSelectedWorkspace );
				oAuxModel.setProperty("/srf_profile", profile);
				that.common().setWorkspace(lastSelectedWorkspace);
				
				return that._Models.fetchSettings(oAuxModel, "isLegalAgreed", true, true)
				.then( function(agreed) {
					if( agreed !== "true" ) {
						var	i18n = that.getResourceBundle() || this.context().i18n,
							sTitle = i18n.getText("privacyTitle"),
							sMessage = i18n.getText("privacyDisclamer"),
							acceptBtn = i18n.getText("accept"),
							rejectBtn = i18n.getText("reject");
						
						return that._openAreYouSureDialog({title: sTitle, message: sMessage, buttons: [acceptBtn, rejectBtn]})
						.then( function() {
							that._Models.saveSettings(oAuxModel, "isLegalAgreed", "true", true);
							return true;
						})
						.catch( function() {
							that._Models.logout(oAuxModel);
							return false;
						});
					}
				
					return true;
				});
			});
		},
		
		// depends on updated "runningTests" model
		_loadTestsModel: function(oFetchParams) {
			var oAuxModel = this.getModel("srf");

			if( !oAuxModel ) {
				return Q();
			}
			
			var oView = this.getView(),
				oTestsModel = oView.getModel(), // default component model - testsColumnsModel
				oTable = this._oTable,
				oResourseBundle = this.getResourceBundle();

			var oViewModel = oView.getModel("testsView"),
				sProjectName = oAuxModel.getProperty("/srf_projectName");
				
			if ( !sProjectName || sProjectName === "" ) {
				oViewModel.setProperty("/projectName", oResourseBundle.getText("NoProjectName"));
			}
			else {
				oViewModel.setProperty("/projectName", oResourseBundle.getText("ProjectName", [sProjectName]));
			}
			if (!oFetchParams) {
				oFetchParams = {
					pageSize: this._PAGE_SIZE,
					pageNumber: oViewModel.getProperty("/pageNumber"),
					sortOrder: "desc",
					sortBy: "modifiedDate"
				};
			}

			var pageNumber = oFetchParams.pageNumber || oViewModel.getProperty("/pageNumber") || 1;

			// fix paginator pageNumber is 1-based, SRF - 0-based
			pageNumber -= 1;
			// update page number 0-based
			oFetchParams.pageNumber = pageNumber;

			return Q.spread([this._Models.loadTestsModelSync(oAuxModel, oFetchParams), this._loadRunningModel()], 
				function(oTestListModel, oRunningsModel) {
					// oTestListModel : {tests: [,…], totalItemsCount: 12, pageNumber: "0", pageSize: "100", testStats: {...test runs...}}
					var tests = oTestListModel.getProperty("/tests") || [];
					var testsRunning = oRunningsModel.getProperty("/aData") || [];
					$.each(testsRunning, function(j, runningTest) {
						$.each(tests, function(i, test) {
							if (test.id === runningTest.test.id) {
								if (test.additionalData && test.additionalData.lastRunData) {
									test.additionalData.lastRunData.status = "running1";
								} else {
									test.additionalData.lastRunData = {
										status: "running1"
									};
								}
								return;
							}
						});
					});

					oTestsModel.setProperty("/tests", tests);
					oTable.getBinding("items").refresh();
					oViewModel.setProperty("/tests", tests);
					// recalculate the pages number due to totalItemsCount might be changed in SRF
					var pageInfo = Utils.Calc.recalcModelPaginatorData(oTestListModel);

					oViewModel.setProperty("/testsTableTitle",
						oResourseBundle.getText("testTableTitleCount", [pageInfo.totalItemsCount]));
					oViewModel.setProperty("/totalItemsCount", pageInfo.totalItemsCount);
					oViewModel.setProperty("/pageNumber", pageInfo.pageNumber);
					oViewModel.setProperty("/totalPages", pageInfo.totalPages);

					return oTestListModel;
				})
				.catch(function(error) {
					if(error.status === 500 ) {
						var errorMsg = oAuxModel.getProperty("/srf_context").i18n.getText("loginInfoInvalid");
						oAuxModel.setProperty("/srf_loginFailed", errorMsg);
					} else {
						oAuxModel.setProperty("/srf_loginFailed", error.message);
					}
				
					oTestsModel.setProperty("/tests", []);
					oTable.getBinding("items").refresh();

					oViewModel.setProperty("/tests", []);
					oViewModel.setProperty("/totalItemsCount", 0);
				});
		},

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			var bCont = oItem.getBindingContext();
			var id = bCont.getPath();
			var id1 = id.split("/");

			this.getRouter().navTo("details", {
				testId: id1[2]
			});

		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {object} oTableSearchState an array of filters for the search
		 * @private
		 */
		_applySearch: function(sQuery) {
			var oTableSearchState = [];

			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("name", FilterOperator.Contains, sQuery)];
			}

			var oViewModel = this.getModel();
			this._oTable.getBinding("items").filter(oTableSearchState, sap.ui.model.FilterType.Application);
			// changes the noDataText of the list in case there are no filter results
			if (oTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("testListNoDataWithSearchText"));
			}
		}

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf srf.view.TestsView
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf srf.view.TestsView
		 */
		//	onExit: function() {
		//
		//	}

	});

});