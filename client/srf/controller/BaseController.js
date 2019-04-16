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
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"../model/models",
	"../formatter/formatter"
], function(Controller, History, Models, oFormatter) {
	"use strict";

	var nRunningInterval = 5000; // _runsPollingInterval
	
	return Controller.extend("srf.controller.BaseController", {
		
		_Models : Models,
		formatter : oFormatter,
		_PAGE_SIZE : 100,		
		// 
		common: function() {
			var oAuxModel = this.getModel("srf");
			return oAuxModel ? oAuxModel.getProperty("/srf_common") : null;
		},
		context: function() {
			var oAuxModel = this.getModel("srf");
			return oAuxModel ? oAuxModel.getProperty("/srf_context") : null;
		},
		document: function() {
			var oAuxModel = this.getModel("srf");
			return oAuxModel ? oAuxModel.getProperty("/srf_document") : null;
		},
		appProjectName: function() {
			var oAuxModel = this.getModel("srf");
			return oAuxModel ? oAuxModel.getProperty("/srf_projectName") : null;
		},
		destination: function() {
			var oAuxModel = this.getModel("srf");
			return oAuxModel ? oAuxModel.getProperty("/srf_destination") : null;
		},

		trace: function(sMessage, sLevel) {
			
			if ( this.common() && this.common().trace) {
				this.common().trace("SRF", sMessage,this.context(), sLevel);
			}
			else {
				window.console.info(sMessage);
			}
			return;
		},

		liteNotification: function( sMessage, sLevel, milliSecondsDelay) {
			if ( this.common() && this.common().liteNotification) {
				this.common().liteNotification("SRF", sMessage,this.context(), sLevel, milliSecondsDelay);
			}
			else {
				window.console.info(sMessage);
			}
			return;
		},
		notification: function( sMessage, sLevel) {
			if ( this.common() && this.common().notification) {
				this.common().notification("SRF", sMessage,this.context(), sLevel);
			}
			else {
				window.console.info(sMessage);
			}
			return;
		},	
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function() {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			switch (sName) {
				case "srf":
				case "runningTests":
				case "pendingTests":
				case "finishedTests":					
					return this.getOwnerComponent() && this.getOwnerComponent().getModel(sName);
				default:
					return this.getView() && this.getView().getModel(sName);
			}
		},

		getAppDetails: function() {
			var oContext = this.context(),
				oDocument = this.document(),
				oCommon = this.common();

			var	oAppDescription = {
						"sAppName":  this.appProjectName(), // selected  Web IDE project 
						"sAppVersion": null,
						"sAppAccount": null,
						"sProjectName":  this.appProjectName()
					};
				
			return oCommon.getAUTData( oContext, oDocument)
				.then( function ( oAppDesc) {
					oAppDescription.sAppName = 		oAppDesc.appName ?  oAppDesc.appName : oAppDescription.sAppName;
					oAppDescription.sAppVersion = 	oAppDesc.appVersion ?  oAppDesc.appVersion : oAppDescription.sAppVersion;
					oAppDescription.sAppAccount = 	oAppDesc.appAccount ?  oAppDesc.appAccount : oAppDescription.sAppAccount;
					return oAppDescription;
				})
				.finally( function(){ 
					return oAppDescription;
				});
		},
		
		showTests: function() {
			this._navBack();
		},
		
		_navBack: function() {
			var that = this;
			var ctx = this.context();

			return ctx && ctx.service.rightpane.isVisible()
				.then( function( bVisible) {
					if ( bVisible) { 
						that.getRouter().navTo("tests", {} , true);
					}
					return;
				}).done();
		},

		onWorkspaceChanged: function(oEvent) {
			var oAuxModel = this.getModel("srf"),
				that = this,
				userId = oAuxModel.getProperty("/srf_profile/userId"),
				wsId = oEvent.getParameter("selectedItem").getKey();
				
			return this._Models.changeWorkspace(oAuxModel, wsId, userId)
			.then( function( oResponse ) {
				that._navBack();
				that._updateModel(true);
			});
		},
		
		onPluginImagePressed: function(oEvent) {
			if ( this.getModel("srf") && this.getModel("srf").getProperty("/srf_loggedIn") === true ) {
				this.Logout(oEvent).done();
			}
		},
				
		Logout: function(oEvent) {
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return Q();
			}
			var that = this;
			// set aux data
			oAuxModel.setProperty("/srf_controller", this);		// callback controller
			
			return this._Models.Logout(oAuxModel, oEvent).then( function() {
				if ( that.getModel("srf") && that.getModel("srf").getProperty("/srf_loggedIn") === false ) {
					that._navBack();
				}
				return;
			});
		},
		
		openLogoutDialog: function(oEvent) {
			var that = this;
			var oDefpromise = Q.defer();
			var oButton = oEvent.getSource();
			this._oLogoutDialog = that._getLogoutDialog(function() {
				if(that._oLogoutDialog) {
				 	if( that._oLogoutDialog.ok === true) {
						oDefpromise.resolve();
					 }
					 else {
						oDefpromise.reject();
					}
				}
			});
			//this._oLogoutDialog.open();
			this._oLogoutDialog.openBy(oButton);
			return oDefpromise.promise;
		},	
		
		closeLogoutDialog: function() {
			if(this._oLogoutDialog) {
				 this._oLogoutDialog.close();
				 this._oLogoutDialog.destroy();
				 this._oLogoutDialog = null;
			}
		},	
		
		// {title: sTitle, message: sMessage, tooltip: sTooltip}		
		_getLogoutDialog: function(onClose) {
			var oViewModel = this.getModel("srf") || this.getModel();
				
			if (!this._oLogoutDialog) {
				// create dialog via fragment factory
				this._oLogoutDialog = sap.ui.xmlfragment( "srf.view.dialog.LogoutDialog", this);
				this.getView().addDependent(this._oLogoutDialog);
				//  compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oLogoutDialog);
				// attach close callback function
				this._oLogoutDialog.attachAfterClose( oViewModel, onClose, this);
				// attach open callback function
				this._oLogoutDialog.attachAfterOpen( oViewModel, this.onAfterLogoutOpen, this);
				
			}
	
			return this._oLogoutDialog;
		},

		// bind ENTER keystroke handler 
		onAfterLogoutOpen: function() {
			var that = this;
			$("#" + this._oLogoutDialog.getId()).keydown( function(e) {
			    if (e.keyCode === 13) {
			       	that.onLogout();
				}
			});
		},

		onLogout: function() {
			if ( this._oLogoutDialog) {
				this._oLogoutDialog.ok = true;
				this._oLogoutDialog.close();
			}
		},		
		
		onLogoutCancel: function() {
			if ( this._oLogoutDialog) {
				this._oLogoutDialog.ok = false;
				this._oLogoutDialog.close();
			}
		},

		onPaneLogin: function() {
			var oAuxModel = this.getModel("srf");
			var that = this;
			return this._Models.loginWithCredentials(oAuxModel, {user : oAuxModel.getProperty("/user/name"), pwd : oAuxModel.getProperty("/user/password") }).then( function( sStatus) {
				if ( sStatus === that.getResourceBundle().getText("responseSuccess")) {
					that.trace( that.getResourceBundle().getText("loginSuccessUserMsg", [that.getModel("srf").getProperty("/srf_username"), that.getModel("srf").getProperty("/srf_destination") ]), "log");
				}
				else {
					that.trace( that.getResourceBundle().getText("loginFailureUserMsg", [that.getModel("srf").getProperty("/srf_username"), that.getModel("srf").getProperty("/srf_destination") ]), "log");
				}
				return true;
			}).finally( function() {
				that._updateModel(true);
			});
	
		},	
		
		onPaneUserNameChanged: function(oEvent){
			var sValue = oEvent.getParameter("newValue");
//			var sId = oEvent.getParameter("id");
			// if( sValue === "" ) {
			// 	sap.ui.getCore().getElementById(sId).setValueState('Error');
			// }
			// else {
			// 	sap.ui.getCore().getElementById(sId).setValueState('None');
			// }
			this.getModel("srf").setProperty("/user/name", sValue);
		}, 

		onPanePasswordChanged: function(oEvent){
			var sValue = oEvent.getParameter("newValue");
//			var sId = oEvent.getParameter("id");
			// if( sValue === "" ) {
			// 	sap.ui.getCore().getElementById(sId).setValueState('Error');
			// }
			// else {
			// 	sap.ui.getCore().getElementById(sId).setValueState('None');
			// }
			this.getModel("srf").setProperty("/user/password", sValue);
		}, 

	
		_openAreYouSureDialog: function( oDialogInfo) {
			var that = this;
			return Q.promise( function(resolve, reject){
				// create promise resolve it in close
				
				that._oAreYouSureDialog = that._getAreYouSureDialog(function(){
				
					 if(that._oAreYouSureDialog.ok === true) {
						 resolve();
					 }
					 else {
					 	reject();
					 }
					 that._oAreYouSureDialog.destroy();
					 that._oAreYouSureDialog = null;
				}, oDialogInfo);
				that._oAreYouSureDialog.open();
			});
		},	
		
		// {title: sTitle, message: sMessage, tooltip: sTooltip}
		_getAreYouSureDialog: function(onClose, oDialogInfo ) {
			var oViewModel = this.getModel("testDetails") || this.getModel(),
				sPrefix = oViewModel && oViewModel.getProperty("/prefix") || "";
				
			if (!this._oAreYouSureDialog) {
				// create dialog via fragment factory
				this._oAreYouSureDialog = sap.ui.xmlfragment(sPrefix, "srf.view.dialog.AreYouSureDialog", this);
				this.getView().addDependent(this._oAreYouSureDialog);
				//  compact style
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oAreYouSureDialog);
				// attach close callback function
				this._oAreYouSureDialog.attachAfterClose( oViewModel, onClose, this);
				this._oAreYouSureDialog.attachAfterOpen( oViewModel, this.onAfterAreYouSureDialogOpen, this);
			}

			
			if ( oDialogInfo) {
				if ( oDialogInfo.title) {
					this._oAreYouSureDialog.setTitle( oDialogInfo.title);
				}
				if ( oDialogInfo.message) {
					// get inner label element andd set its "text" property
					this._oAreYouSureDialog.getContent()[0].setProperty("text",  oDialogInfo.message);
				}
				if ( oDialogInfo.tooltip) {
					this._oAreYouSureDialog.setTooltip( oDialogInfo.tooltip);
				}
				if ( oDialogInfo.buttons ) {
					var buttons = this._oAreYouSureDialog.getButtons();
					
					$.each(buttons, function(i, button) {
						button.setProperty("text", oDialogInfo.buttons[i]);
					})
				}
			}
			return this._oAreYouSureDialog;
		},

		// bind ENTER keystroke handler 
		onAfterAreYouSureDialogOpen: function() {
			var that = this;
			$("#" + this._oAreYouSureDialog.getId()).keydown( function(e) {
			    if (e.keyCode === 13) { 
				    if ( that._oAreYouSureDialog.getBeginButton().getEnabled()) {
						that._oAreYouSureDialog.ok = true;
						that._oAreYouSureDialog.close();
				    }
				}
			});
		},
		
		_deleteTest: function(sTestId, sTestName, sTestOwner) {
			var	that = this,
				i18n = this.getResourceBundle(),
				sTitle = i18n.getText("deleteTestTitle"),
				sMessage = i18n.getText("deleteTestText"),
				sTooltip = i18n.getText("deleteTestTooltip"),
				testDeleteNotPermittedMsg = i18n.getText("testDeleteNotPermittedMsg"),
				srfModel = that.getModel("srf"),
				oDialogInfo = {title: sTitle, message: sMessage, tooltip: sTooltip};
			
			return this._openAreYouSureDialog( oDialogInfo)
				
				.then(function() { 
					that.getView().setBusy(true);
					return that._Models.deleteTest(srfModel, sTestId);
				})
				.then( function(oResponce) {
					if ( oResponce[2] !== "success" ) {
						that.liteNotification( i18n.getText("testDeleteFailureMsg", [sTestName, oResponce[2]]), "error");
						return 0;
					}
					else {
						if (oResponce[0] > 0)  {
							that.trace( i18n.getText("testDeleteSuccessMsg", [sTestId]), "log");
							that._navBack();
						} else {
							var srf_userId = srfModel.getProperty("/srf_user/id");
							if (srf_userId !== sTestOwner) {
								that.trace( i18n.getText("testDeleteFailureMsg", [sTestId, testDeleteNotPermittedMsg]), "error");
								that.liteNotification( i18n.getText("testDeleteFailureMsg", [sTestName, testDeleteNotPermittedMsg]), "error");
							}
							else {
								that.liteNotification( i18n.getText("testDeleteFailureNoErrorMsg", [sTestName]), "error");
							}
						}

						return oResponce[0];
					}
				})
				.catch( function() {
					return -1;
				});
		},		
		
		onCloseAreYouSureDialog: function() {
			this._oAreYouSureDialog.ok = true;
			this._oAreYouSureDialog.close();
		},		
		
		onCancelAreYouSureDialog: function() {
			this._oAreYouSureDialog.ok = false;
			this._oAreYouSureDialog.close();
		},
		
		onParamPopoverOpen: function(oParamImage, sRunParamPath) {
			// create popover
			if (!this._oParamPopover) {
				this._oParamPopover = sap.ui.xmlfragment(this.getView().sId, "srf.view.fragment.ParametersRunValuePopover", this);
				this.getView().addDependent(this._oParamPopover);
			}

			this._oParamPopover.bindElement({path: sRunParamPath, model: "testDetails" });
			this._oParamPopover.openBy(oParamImage);
		},
		
		onStepPropertiesPopoverOpen: function(oEvent) {
			var sStepPropertiesPath = oEvent.getSource().getParent().getBindingContext("testDetails").getPath();	

			// create popover
			// if (!this._oStepPropertiesPopover) {
			// 	this._oStepPropertiesPopover = sap.ui.xmlfragment(this.getView().sId, "srf.view.fragment.runsummary.StepPropertiesPopover", this);
			// 	this.getView().addDependent(this._oStepPropertiesPopover);
			// }

			// this._oStepPropertiesPopover.bindElement({path: sStepPropertiesPath, model: "testDetails" });
			// this._oStepPropertiesPopover.openBy( oEvent.getSource());
		},
	
		
		onRunningsPressed: function(oEvent) {
			var that = this;
			var oButton = oEvent.getSource();
			// create popover
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment(this.getView().sId, "srf.view.fragment.notifications.NotificationsPopover", this);
				this.getView().addDependent(this._oPopover);
			}
			
			this._loadAllRunningModels().then( function() {	
				
				// delay because addDependent will do a async rerendering and the popover will immediately close without it
				jQuery.sap.delayedCall(0, that, function () {
					that._oPopover.openBy(oButton);
				});
			});
		},
		
		_loadAllRunningModels: function() {
			if ( !this.getModel("srf")) {
				return Q();
			}
		
			var oView = this.getView().setBusy(true);
			return Q.spread( [this._loadRunningModel(),	this._loadPendingModel(),this._loadFinishedModel()], function( oRunningsModel, oPendingsModel, oFinishedModel) {
			//	window.console.debug( " total running = " + (oRunningsModel ? oRunningsModel.getProperty("/total") : 0));
			//	window.console.debug( " total pending = " + ( oPendingsModel ? oPendingsModel.getProperty("/total") : 0));
			//	window.console.debug( " total finished = " + ( oFinishedModel ? oFinishedModel.getProperty("/total") : 0));
				
				return;
			}).finally( function() {
				oView.setBusy(false);
			});
		},
		
		onStopTest: function(oEvent) {
			var that = this,
				oItem = oEvent.getSource().getParent(),
				sPath = oItem.oPropagatedProperties.oBindingContexts.runningTests.getPath(),
				oRun = this.getModel("runningTests").getProperty(sPath);

			return this._Models.stopRun( this.getModel("srf"), oRun.id)
			.then( function(response) {
				if(response === "success") {
					that.trace( that.getResourceBundle().getText("runningTestStoppedMsg", [oRun.name]), "log");
					return that._loadRunningModel();
				}
				//that.trace(that.getResourceBundle().getText("runningTestStopFaileddMsg", [oRun.name, response]), "error");
			})
			.done();
		},
		
		_loadRunningModel: function() {
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return Q();
			}
			var oModel = this.getModel("runningTests");
			oAuxModel.setProperty("/srf_controller", this);
			return this._Models.loadRunningModel(oAuxModel, oModel)
			.then(function(oRunningsModel) {
				oModel.setProperty("/aData", oRunningsModel.getProperty("/aData"));
				oModel.setProperty("/total", oRunningsModel.getProperty("/total"));
				return oModel;
			});
		},

		_loadPendingModel: function() {
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return Q();
			}
			
			var oModel = this.getModel("pendingTests");	
			oAuxModel.setProperty("/srf_controller", this);
			return this._Models.loadPendingModel(oAuxModel, oModel)
			.then(function(oRunningsModel) {
				oModel.setProperty("/aData", oRunningsModel.getProperty("/aData"));
				oModel.setProperty("/total", oRunningsModel.getProperty("/total"));
				return oModel;
			});
		},
				
		_loadFinishedModel: function() {
			var oAuxModel = this.getModel("srf");
			if (!oAuxModel) {
				return Q();
			}
				
			var oModel = this.getModel("finishedTests");
			oAuxModel.setProperty("/srf_controller", this);
			return this._Models.loadFinishedModel(oAuxModel, oModel)
			.then(function(oFinishedModel) {
				var todayTests = [],
					yesterdayTests = [],
					older = [];
				
				$.each( oFinishedModel.getProperty("/aData"), function(i, entity) {
					var startDate = (new Date(entity && entity.start)).toDateString(),
						today = (new Date()).toDateString(),				
						diff = (new Date(today)) - (new Date(startDate)),
						daysDiff = Math.floor(diff / 1000 / 3600 / 24);

					switch( daysDiff ) {
						case 0:
							todayTests.push(entity);
							break;
						case 1:
							yesterdayTests.push(entity);
							break;
						default:
							older.push(entity);							
					}					
				});
				oModel.setProperty("/aData", oFinishedModel.getProperty("/aData"));
				oModel.setProperty("/total", oFinishedModel.getProperty("/total"));
				oModel.setProperty("/today", todayTests);
				oModel.setProperty("/yesterday", yesterdayTests);
				oModel.setProperty("/older", older);
				return oModel;
			});
		},
	
		// returns running tests array 
		_getRunningTests: function() {
			//var oRunningsModel = that.getModel("runningTests");
			return this._loadRunningModel()
			.then( function( oRunningsModel) {
				var aData = oRunningsModel.getProperty("/aData");
				return aData;				
			});
		},
		
		// returns total running tests number 
		_getRunningTestsNumber: function() {
			return this._loadRunningModel()
			.then( function( oRunningsModel) {
				var total = oRunningsModel.getProperty("/total");
				return total;				
			});
	
		},
	
		// execute test and run test polling functionality
		_runSingleTest: function(oTestAux) {
			var that = this;
			var oAuxModel = this.getModel("srf");
			
			if ( !oTestAux) {
				this.liteNotification(this.getResourceBundle().getText("selectTestMsg"), "failure");
				return Q();
			}
			
			return this.common().executeTest(oTestAux, this.context(), oAuxModel, this._updateTestRunning.bind(this), this._updateTestFailedRunning.bind(this) )
			.then( function ( oRunId) {
				if (!jQuery.isEmptyObject(oRunId)) {
					that.trace(that.getResourceBundle().getText("runTestSuccessMsg", [oTestAux.name]), "log");
					// start polling if not yet
					that._pingRunningTests();	
				}		
				return oRunId;
			})
			.catch( function( error) {
				that.trace(that.getResourceBundle().getText("runTestFailedMsg", [oTestAux.name, (error && error.message)]), "log");
			});
		},
				
		// callback of successful run data polling { id: oTestAux.id, runId: oRunId.id, status: "running"}
		_updateTestRunning: function() {
			this._updateModelAsyncHandler();
		},
		
	
		_updateTestFailedRunning: function( oTestRunningInfo)
		{
			this._updateModelAsyncHandler();
		},
		
		_pingRunningTests: function() {
			this._pingRunningTestsWorker();
		},

		_pingRunningTestsWorker: function() {
			var that = this;
			return this._getRunningTestsNumber()
			.then( function( nTotal) {
				if( nTotal > 0) {
					if (  !that._runsPollingInterval ) {
						that._runsPollingInterval = window.setInterval( function() { that._pingRunningTests(); }, nRunningInterval);
					}
				}
				else {	
					that._stopRunsPolling();
					// update test list / test details model
					that._updateTestRunning();
					//that.trace("No more tests running on SRF", "log");
				}
				return;
			})
			.finally( function() {
				// update running test details model
				that._updateModelAsyncHandler();

			});
			
		},
		
		_stopRunsPolling: function() {
			if ( this._runsPollingInterval ) {
				window.clearInterval(  this._runsPollingInterval);
				this._runsPollingInterval = null;
			}	
		},
		
		_updateModel: function( ) {
			window.console.error("No one will see this message: _updateModel is implemented in each derived controller" );			
			return Q();			
		},

		// WAS Async, TODO
		_updateModelAsyncHandler: function() {
			return this._updateModel();	
		},

		// load environments to aux as a raw data array
		// returns the array
		_loadAllEnvironments: function(sPlatform) {
			var auxModel = this.getModel("srf");

			if(sPlatform === "web") {
				var arrayAllEnvs = auxModel.getProperty("/environments");
				if ( !arrayAllEnvs || !arrayAllEnvs.length) {
					return this._Models.fetchEnvironmentsSync( auxModel).then ( function( sAllEnvs) {
						auxModel.setProperty("/environments", sAllEnvs);
						return sAllEnvs || [];
					});
				}
			} else {
				var arrayAllDevices = auxModel.getProperty("/devices");
				if ( !arrayAllDevices || !arrayAllDevices.length) {
					return this._Models.fetchDevicesSync(auxModel).then ( function(sAllDevices) {
						auxModel.setProperty("/devices", sAllDevices);
						return sAllDevices || [];
					});
				}											
			}
			return arrayAllEnvs;
		},
		
		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		}



	});

});