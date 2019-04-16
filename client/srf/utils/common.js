/*
 *     (c) Copyright 2019, a Micro Focus company, L.P.
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

define([],
	function() {
		"use strict";
		return {
			// "https://webide-webidedemo.dispatcher.hana.ondemand.com/destinations/SRF_NGINX/"
			// DB - max length for test, tag, script names  
			_nSrfTestNameMaxLength: 100,
			_nSrfTagMaxLength: 50,
			_nSrfResourceNameMaxLength: 50,
			_recordingTab: null,

			_oResourceBundle: null,
			_oSelectedDocument: null, // reset by Pane.onSelectionChanged due to "selection:changed" subscription
			_oContext: null,
			_sSrfDestinationName: null,
			_srfWorkspace: null,
			_srfOpenWorkspace: null,
			
			get storageDestinationKey()  {
				return "srf.destinations.name";
			},
			
			get srfDefaultDestinationName () {
				return "SRF_INTEGRATION";
			},
			
			get srfDestination (){
				return "/destinations/" + this._sSrfDestinationName;
			},
			get assetsDestination() {
				return this.srfDestination + "/rest/storage";
			},
			
			set srfDestinationName (sValue) {
				this._sSrfDestinationName = sValue;
			},
			
			get srfDestinationName () {
				return this._sSrfDestinationName || this.srfDefaultDestinationName;
			},
			
			get srfWorkspace() {
				return this._srfWorkspace;
			},
			
			get srfOpenWorkspace() {
				return this._srfOpenWorkspace;
			},
			
			setWorkspace: function( sValue ) {
				this._srfWorkspace = "/workspaces/" + sValue;
				this._srfOpenWorkspace = "workspace/" + sValue + "/";
			},
			
			setSrfToken: function(sToken) {
				if (sToken)  {
					this.setCookie(this.srfDestinationName, sToken);
				}
				else {
					this.eraseSrfToken();
				}
			},
			
			// returns string		
			getSrfToken: function( ) {
				var token = this.getCookie(this.srfDestinationName);
				if(token && token !== "") {
					token = "MULTI_DOMAIN_RES=true&LWMDSSO_NRM=" + token;
				}
				return token;
			},
			
			eraseSrfToken: function () {
				//window.console.error("eraseSrfToken : " + this.getCookie("LWMDSSO_NRM"));
				document.cookie = this.srfDestinationName + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
			},
			
			setCookie: function (cname, cvalue) {
			    document.cookie = cname + "=" + cvalue;
			},

			getCookie: function (cname) {
			    var name = cname + "=";
			    var ca = document.cookie.split(";");
			    for(var i = 0; i < ca.length; i++) {
			        var c = ca[i];
			        while (c.charAt(0) === " ") {
			            c = c.substring(1);
			        }
			        if (c.indexOf(name) === 0) {
			            return c.substring(name.length, c.length);
			        }
			    }
			    return "";
			},

			// {name: sValue}
			// returns promise
			setSrfPreferences: function( oContext, oPreferences) {
				if (!oContext) {
					return Q.reject( { message: "Context is null or undefined"});
				}
				this.srfDestinationName = oPreferences.name;    
				return oContext.service.preferences.set( oPreferences, this.storageDestinationKey, true, true /*for all workspaces/global*/);	
			},
			
			setUserPreferences: function( oContext, key, oData ) {
				if (!oContext) {
					return Q.reject( { message: "Context is null or undefined"});
				}
	
				return oContext.service.preferences.set( oData, key, true, true /*for all workspaces/global*/);	
			},
			
			getUserPreferences: function( oContext, key ) {
				if (!oContext) {
					return Q.reject( { message: "Context is null or undefined"});
				}
	
				return oContext.service.preferences.get(key);	
			},

			// returns promise with string	
			fetchSrfDestinationName: function( oContext) {
				if (!oContext) {
					return Q.reject( { message: "Context is null or undefined"});
				}
				var that = this;
				this._oContext =  oContext;
				return this._fetchDestination(oContext, this.storageDestinationKey)
				.then( function( sName) {
					that._sSrfDestinationName= sName || that.srfDefaultDestinationName;
					return that._sSrfDestinationName;
				});
			},
			
			isCommandEnabled: function( oContextService ) {
				return oContextService.selection.getSelection()
				.then( function(selection) {
					var oDocument = selection && selection[0] && selection[0].document;
					return oDocument.getProject(true)
					.then(function(oProject) {
						if (oProject && oProject.getEntity().getName()) {
							return oContextService.rightpane.isLoggedIn().then( function(rc) {
									return rc;
								})
								.catch( function(){
									return false;
								});
						} 
						else {
							return false;
						}
					});
				})
				.catch( function(e) {
					window.console.error(e);
					return false;
				});
			},
			
			_fetchDestination: function( oContext, sPrefKey) {
				var that = this; 
				if ( !oContext) {
					return this.srfDefaultDestinationName;
				}

				if ( !sPrefKey) {
					sPrefKey = this.storageDestinationKey;
				}
				return oContext.service.preferences.get(sPrefKey)
				.then( function(oSelectedDestination) {
					if ( oSelectedDestination) {
						return oSelectedDestination.name;
					}
				
					that.trace("SRF", 
						that._oResourceBundle ? that._oResourceBundle.getText("settings_DefaultDestinationMsg") : oContext.i18n.getText("settings_DefaultDestinationMsg"), 
						oContext, "warn");
					return that.getSRFDestinations(oContext).then( function( aDestinations) {
						return ( aDestinations.length > 0 ? (aDestinations[0].destination || that.srfDefaultDestinationName) : that.srfDefaultDestinationName);
					});
				})
				.catch ( function() {
					return that.srfDefaultDestinationName;
				});
			},

			set context( oContext) {
				this._oContext = oContext;
			},
			
			setSelectedDocument: function(oDocument) {
				this._oSelectedDocument = oDocument;
			},
			
			setResourceBundle: function(oBundle) {
				this._oResourceBundle = oBundle;
			},
			
			getTestManagerDestination: function() {
				return this.srfDestination + "/rest/test-manager";
			},
			
			getJobManagerDestination: function() {
				return this.srfDestination + "/rest/jobmanager";
			},

			LeanFTWebScriptTemplate :
					"\nvar LFT = require('leanft');" +
					"\nvar SDK = LFT.SDK;" +
					"\nvar Web = LFT.Web;" +             
					"\nvar SAPUI5 = LFT.SAPUI5;" +
					"\nvar whenDone = LFT.whenDone;" +
					"\nvar verify = require('leanft/verify');" +
					
					"\n\ndescribe('demo',function() {" +
						"\n\tvar browser;" +
						"\n" +
						"\n\tbefore(function(done) {" +
							"\n\t\tLFT.init({});" +
							"\n" +
							"\n\t\twhenDone(done); " +							
						"\n\t}); " +
						"\n" +
						"\n\tbeforeEach(function(done) {" +
							"\n\t\tLFT.beforeTest();" +
							"\n" +
							"\n\t\tWeb.Browser.launch('chrome').then(function(b) {" +
							"\n\t\t\tbrowser = b;" +
							"\n\t\t});" +
							"\n" +
							"\n\t\twhenDone(done); " +
						"\n\t}); " +
						"\n\n\tit('should work',function(done) {" +
							"\n" +
							"\n\n\t\twhenDone(done); " +
							"\n\t});" +
						"\n\n\tafterEach(function(done) {" +
							"\n\t\tLFT.afterTest(); " +
							"\n\n\t\tif (browser) {" +
							"\n\t\t\tbrowser.close();" +
							"\n\t\t}" +
							"\n\n\t\twhenDone(done);" +
						"\n\t});" +
						"\n\n\tafter(function(done) {" +
							"\n\t\tLFT.cleanup(); " +
							"\n\n\t\twhenDone(done);" +
						"\n\t});" +
					"\n});",
					
			LeanFTMobileScriptTemplate :
					"\nvar LFT = require('leanft');" +
					"\nvar SDK = LFT.SDK;" +
					"\nvar Web = LFT.Web;" + 
					"\nvar Mobile = LFT.Mobile;" +              
					"\nvar SAPUI5 = LFT.SAPUI5;" +
					"\nvar whenDone = LFT.whenDone;" +
					"\nvar verify = require('leanft/verify');" +
					
					"\n\ndescribe('demo',function() {" +
						"\n\tvar device;\n" +
						"\n\tbefore(function(done) {" +
							"\n\t\tLFT.init({});" +
							"\n" +
							"\n\t\twhenDone(done); " +							
						"\n\t}); " +
						"\n" +
						"\n\tbeforeEach(function(done) {" +
							"\n\t\tLFT.beforeTest();" +
							"\n" +
							"\n\n\t\tLFT.SrfLab.lockDevice({name:'srf-device'}).then(function(d){" +
							"\n\t\t\tdevice = d;" +
							"\n\t\t});" +
							"\n" +
							"\n\t\twhenDone(done); " +
						"\n\t}); " +
						"\n\n\tit('should work',function(done) {" +
							"\n" +
							"\n\n\t\twhenDone(done); " +
							"\n\t});" +
						"\n\n\tafterEach(function(done) {" +
							"\n\t\tLFT.afterTest(); " +
							"\n\n\t\tif (device) {" +
							"\n\t\t\tdevice.unlock();" +
							"\n\t\t}" +
							"\n\n\t\twhenDone(done);" +
						"\n\t});" +
						"\n\n\tafter(function(done) {" +
							"\n\t\tLFT.cleanup(); " +
							"\n\n\t\twhenDone(done);" +
						"\n\t});" +
					"\n});",
										
					
			// info, warn, error
			trace: function(sTag, sMessage, oContext, sLevel) {
				if (!oContext) {
					window.console.log(sTag, sMessage);
					return;
				}
				// override sTag
				sTag = ( this._oResourceBundle ? this._oResourceBundle.getText("appTraceTag") : oContext.i18n.getText("appTraceTag") || sTag);

				this.log(sTag, sMessage, oContext, sLevel);
			},

			// info, warn, error
			log: function(sTag, sMessage, oContext, sLevel) {
				if (!oContext) {
					return;
				}
				sLevel = sLevel || "info";
				
				// override sTag
				sTag = ( this._oResourceBundle ? this._oResourceBundle.getText("appTraceTag") : oContext.i18n.getText("appTraceTag") || sTag) ;
				
				switch (sLevel) {
					case "info":
					case "log":
						oContext.service.log.info(sTag, sMessage, ["user"]).done();
						break;
					case "warning":
						oContext.service.log.warn(sTag, sMessage, ["user"]).done();
						break;
					case "failure":
					case "err":
					case "error":
						oContext.service.log.error(sTag, sMessage, ["user"]).done();
						break;
					case "success":
					default:
						oContext.service.log.info(sTag, sMessage, ["user"]).done();
						break;
				}
			},
			
	
			
			// info, warning, alert,  confirm - additional parameter
			notification: function(sTag, sMessage, oContext, sLevel) {
				if (!oContext) {
					return;
				}
		
				sLevel = sLevel || "info";

				switch (sLevel) {
					case "log":
						oContext.service.usernotification.info(sMessage).done();
						break;
					case "warn":
						oContext.service.usernotification.warning(sMessage).done();
						break;
					case "failure":
					case "err":
					case "error":
						oContext.service.usernotification.alert(sMessage).done();
						break;
					case "success":
					default:
						oContext.service.usernotification.info(sMessage).done();
						break;
				}
			},

			liteNotification: function(sTag, sMessage, oContext, sLevel, milliSecondsDelay) {
				if (!oContext) {
					return;
				}
				// override sTag
				sTag = ( this._oResourceBundle ? this._oResourceBundle.getText("appTraceTag") : oContext.i18n.getText("appTraceTag") || sTag);
				sLevel = sLevel || "info";

				switch (sLevel) {
					case "success":
						milliSecondsDelay = milliSecondsDelay||1000;
						oContext.service.usernotification.liteNotificationSuccess(sMessage, "", null, true).done();
						break;
					case "err":
					case "error":
					case "failure":
						milliSecondsDelay = milliSecondsDelay||30000;
						oContext.service.usernotification.liteNotificationFailure(sMessage, "", null, true).done();
						break;
					case "log":
					case "warn":
					case "info":
					default:
						milliSecondsDelay = milliSecondsDelay||1000;
						oContext.service.usernotification.liteNotificationInfo(sMessage, "", null, true).done();
						break;
				}
			},

			// sAppName - timestamp
			generateNewTestName: function(oAppDescription, oResourseBundle) {
				var	sAppName = oAppDescription && oAppDescription.sAppName ? oAppDescription.sAppName : "",
					date = new Date(),
					newTestName = (sAppName ? sAppName : "");

				newTestName += " " + (oResourseBundle 
					? (oResourseBundle.getText("newTestSuffix", [("0" + date.getHours()).substr(-2), ("0" + date.getMinutes()).substr(-2), ("0" + date.getSeconds()).substr(-2)])) 
					: ("0" + date.getHours()).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2) + ":" + ("0" + date.getSeconds()).substr(-2));
				if ( newTestName.length > this._nSrfTestNameMaxLength)
				{
					newTestName = newTestName.substr(0, this._nSrfTestNameMaxLength);
				}
				return newTestName;
			},

			generateDescription: function(oAppDescription) {
				var sAppAccount,
					sAppName,
					sAppVersion,
					sDescription;

				if (oAppDescription) {
					sAppAccount = oAppDescription.sAppAccount ? oAppDescription.sAppAccount : sAppAccount;
					sAppName = oAppDescription.sAppName ? oAppDescription.sAppName : sAppName;
					sAppVersion = oAppDescription.sAppVersion ? oAppDescription.sAppVersion : sAppVersion;
				}

				sDescription = (sAppName ? "Application: " + sAppName : "") +
					(sAppVersion ?  ", v:" + sAppVersion : "") +
					(sAppAccount ?  ", Account: " + sAppAccount : "");
				return sDescription;
			},

			generateNewScriptName: function( sSdk, oResourseBundle) {
				var sSuffix = oResourseBundle ? oResourseBundle.getText("appTraceTag") : "SRF";
				
				switch ( sSdk) {
					case "leanft":
						return sSuffix + "_LEANFT_script";
					case "uft":
						return sSuffix + "_UFT_script";
					case "selenium":
						return sSuffix + "_SELENIUM_script";
					default:
						return sSuffix + "_LEANFT_script";
				}
			},

			// copied from formatter
			timestampToDate: function(timestamp, locale, options) {

				if (timestamp === null) {
					return "";
				}

				var dt = new Date(timestamp);
				var defaultLocale = "en-US";
				var defaultOptions = {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
					second: "numeric"
				};
				locale = locale ? locale : defaultLocale;
				options = options ? options : defaultOptions;
				return dt.toLocaleString(locale);
			},

			getProjectName: function(oDocument) {
				return oDocument.getProject(true).then(function(oProject) {
					if (oProject) {
						return oProject.getEntity().getName();
					}
					
					return "";
				});
			},
			
			openSRF: function(sPath) {
				var that = this;
				return Q.spread( [this._getFullDestinationUrl( this._oContext), this.getSrfTenant(this._oContext)],
					function( sUrl, sTenant) {
						var ssoToken = that.getSrfToken();
						
						sUrl = that.addSSOToken(sUrl + that.srfOpenWorkspace + sPath, ssoToken, sTenant);
						return that._openInNewTab( sUrl,  that._oContext);
				})
				.catch(function( error) {
					return error;
				});
			},
			
			// changes sUrl inplace
			addUrlQueryStatement: function(sUrl, sQueryStatement) {
				if(sQueryStatement) {
					if(sUrl.indexOf("?") >= 0) {
						sUrl += "&";
					} else {
						sUrl += "?";
					}
					sUrl += sQueryStatement;
				}
				return sUrl;
			},
			
			// changes sUrl inplace
			addTenantToUrl: function(sUrl, sTennant) {
				if(sTennant) {
					if(sUrl.indexOf("?") >= 0) {
						sUrl += "&";
					} else {
						sUrl += "?";
					}
					sUrl += "TENANTID=" + sTennant;
				}
				return sUrl;
			},
			
			addSSOToken: function(sUrl, ssoToken, sTenant) {
				sUrl = this.addTenantToUrl(sUrl, sTenant);
				if(ssoToken) {
					sUrl += "&" + ssoToken;
				}
				else {
					window.console.error("URL= " + sUrl + ", ssoToken undefined, TENANTID= " + sTenant);
				}
				
				return sUrl;
			},
			
			// tenant is the second item in WebIDEAdditionalData array
			getSrfTenant: function(oContext) {
				if (!oContext) {
					oContext =  this._oContext;
				}
				if (!oContext){ 
					return Q.resolve(null);
				}
				var that = this;
				return oContext.service.destination.getDestinations("SRF").then(function(aDestinations) {
					for (var i = 0; i < aDestinations.length; i++) {
						var oDestination = aDestinations[i];
						if (oDestination.name === that._sSrfDestinationName) {
							return oDestination.additionalData[1];
						}
					}
				});
			},
		
			_getRealDestinationUrl: function(oContext) {
				if (!oContext) {
					oContext =  this._oContext;
				}
				if (!oContext){ 
					return Q.resolve(null);
				}
				var that = this;
				return oContext.service.destination.getDestinations("SRF").then(function(aDestinations) {
					for (var i = 0; i < aDestinations.length; i++) {
						var oDestination = aDestinations[i];
						if (oDestination.name === that._sSrfDestinationName) {
							var url = oDestination.additionalData[0],
								lastChar = url.split("/").pop();

							if(lastChar !== "") {
								url = url + "/";
							}
							
							return url;
						}
					}
				});
			},
			
			
			getSRFDestinations: function(oContext, sKey) {
				var aDestinationsNames = [];
				
				sKey = sKey || "SRF";
				oContext = oContext || this._oContext;
				if (!oContext){ 
					return ([{ destination : null}]);
				}
				return oContext.service.destination.getDestinations(sKey)
				.then( function(aDestinations) {
					if ( aDestinations && aDestinations.length > 0) {
						
						$.each( aDestinations, function(i, oDestination) {
							aDestinationsNames.push({ destination : oDestination.name,
													  tenantId : oDestination.additionalData[1] });
						});
					}
					return(aDestinationsNames);
				});
			},

			// create new test without recording session
			// return JSON with xxx.id
			createNewTest: function(oContext, oTestDefinitionData) {

				if (!oTestDefinitionData) {
					this.trace("SRF", oContext.i18n.getText("newTestNoDataMsg") , oContext, "warn");
					this.liteNotification("SRF", oContext.i18n.getText("newTestNoDataMsg"), oContext, "warn");
					return Q.resolve({});
				}
				if ( oTestDefinitionData.id) {
					this.trace("SRF", oContext.i18n.getText("newTestExistsAlreadyMsg", [oTestDefinitionData.sTestName, oTestDefinitionData.id]) , oContext, "debug");
					return Q.resolve(oTestDefinitionData);
				}
					
				var _oTestDefinitionData = oTestDefinitionData;

				_oTestDefinitionData.sTestName = oTestDefinitionData.sTestName || (" Web IDE dummy New Test " + this.timestampToDate(Date.now()));
				_oTestDefinitionData.sTestDescription = oTestDefinitionData.sTestDescription || "";
				_oTestDefinitionData.sTestType = oTestDefinitionData.sTestType || "auto";
				_oTestDefinitionData.sTestPlatform = oTestDefinitionData.sTestPlatform || "web";
				_oTestDefinitionData.aEnvoronments = oTestDefinitionData.aEnvoronments || [];
				_oTestDefinitionData.aScripts = oTestDefinitionData.aScripts || [];
				_oTestDefinitionData.aTags = oTestDefinitionData.aTags || [];

				this.trace("SRF",  oContext.i18n.getText("newTestDefinitionDataDebugMsg",
					[_oTestDefinitionData.sTestName, _oTestDefinitionData.sTestDescription, _oTestDefinitionData.sTestType, _oTestDefinitionData.sTestPlatform]),
					oContext, "debug");

				return this._createNewTest(oContext, _oTestDefinitionData);
			},
			
			// start recording session API
			startRecordingSession: function(oContext, oTestDefinitionData) {
				var that = this;
				return Q.promise(function(resolve){
					if (!oTestDefinitionData) {
						that.trace("SRF", oContext.i18n.getText("newTestNoDataMsg") , oContext, "warn");
						that.notification("SRF", oContext.i18n.getText("newTestNoDataMsg") , oContext, "warn");
						return {};
					}

					that.trace("SRF",
						oContext.i18n.getText("newTestDefinitionDataDebugMsg",
						[oTestDefinitionData.sTestName, oTestDefinitionData.sTestDescription,oTestDefinitionData.sTestType, oTestDefinitionData.sTestPlatform]),
						oContext, "debug");
	
					return that._openRecordingSession(oContext, oTestDefinitionData, resolve);
				});
			},

			_openRecordingSession: function(oContext, oTestDefinitionData, onClose) {
				var that = this;
				var sTestName = oTestDefinitionData ? oTestDefinitionData.sTestName : "";	

				if (that._recordingTab && !that._recordingTab.closed){
					that.liteNotification("SRF", that._oResourceBundle ? that._oResourceBundle.getText("recordSessionProgressNotification") : oContext.i18n.getText("recordSessionProgressNotification"), oContext, "warn") ;
					return onClose();
				}
				
				return  Q.spread([this._getRecordingSessionUrl(oContext, oTestDefinitionData), this.getSrfTenant(oContext)], function(srfUrl, sTenant) {			
					var ssoToken = that.getSrfToken();
					srfUrl = that.addSSOToken(srfUrl, ssoToken, sTenant);
					that.trace("SRF", oContext.i18n.getText("newTestSrfUrlDebugMsg",[srfUrl]), oContext, "debug");						
					that._recordingTab = that._openInNewTab(srfUrl, oContext, "SAP_SRF_RecordingSession");
					if (that._recordingTab) {
						that.trace("SRF", 
							that._oResourceBundle ? that._oResourceBundle.getText("recordingTestNotification",[oTestDefinitionData.sTestName, oTestDefinitionData.test.id]) 
								: oContext.i18n.getText("recordingTestNotification",[oTestDefinitionData.sTestName, oTestDefinitionData.test.id]),
							oContext, "info");
						that.liteNotification("SRF", 
							that._oResourceBundle ? that._oResourceBundle.getText("recordingTestNotification",[oTestDefinitionData.sTestName, oTestDefinitionData.test.id]) 
								: oContext.i18n.getText("recordingTestNotification",[oTestDefinitionData.sTestName, oTestDefinitionData.test.id]),
							oContext, "success");

						var interval = setInterval(function() { 
							if(that._recordingTab.closed) {
								onClose();
								clearInterval(interval);
							}
						}, 500);
					}
					else {
						onClose();
					}
				}).catch(function(error) {
					that.trace("SRF",
						( that._oResourceBundle ? that._oResourceBundle.getText("recordTestFailedNotification",[sTestName,(error && error.message)]) 
											: oContext.i18n.getText("recordTestFailedNotification",[sTestName,(error && error.message)])),
						oContext, "error");
					that.liteNotification("SRF",
						( that._oResourceBundle ? that._oResourceBundle.getText("recordTestFailedNotification",[sTestName,(error && error.message)]) 
											: oContext.i18n.getText("recordTestFailedNotification",[sTestName,(error && error.message)])),
						oContext, "failure");
					onClose();
				});
			},
			
			_createNewTest: function(oContext, oTestDefinitionData) {
				var that = this;
				var sProjectName;

				return that.getAUTData(oContext, that._oSelectedDocument)
					.then(function(sAutData) {
						oTestDefinitionData.sProjectName = sProjectName = sAutData.projectName;
						oTestDefinitionData.sAppVersion = sAutData.appVersion;
						oTestDefinitionData.sAppAccount = sAutData.appAccount;
						that.trace("SRF",
							that._oResourceBundle 
								? that._oResourceBundle.getText("newTestDetailsMsg", [sProjectName, sAutData.appVersion, oTestDefinitionData.sTestName, oTestDefinitionData.sTestDescription, oTestDefinitionData.sTestType, oTestDefinitionData.sTestPlatform]) 
								: oContext.i18n.getText("newTestDetailsMsg", [sProjectName, sAutData.appVersion, oTestDefinitionData.sTestName, oTestDefinitionData.sTestDescription, oTestDefinitionData.sTestType, oTestDefinitionData.sTestPlatform]),
							oContext, 
							"info");
						return that._createTest(oContext, oTestDefinitionData);
					}).then( function ( oTestResponse) {
						oTestDefinitionData.id = ( oTestResponse ? oTestResponse.test.id : null);
						return Q.resolve(oTestDefinitionData);
					})
					.catch(function(error) {
							that.trace("SRF",
								that._oResourceBundle 
								? that._oResourceBundle.getText("newTestFailureMsg", [oTestDefinitionData.sTestName , (sProjectName ? sProjectName : " "), error.message || error]) 
								: oContext.i18n.getText("newTestFailureMsg", [oTestDefinitionData.sTestName , (sProjectName ? sProjectName : " "), error.message || error]) ,
							oContext,
							"error");
						return Q.reject(error); 
					});
			},

			getAUTData: function(oContext, oDocument) {
				var that = this;
				
				return this.getProjectName(oDocument).then(function(sName) {
					var autData = {
						projectName: sName,
						appAccount : null,
						appName :sName,
						appVersion :  null
					};
			
					return oContext.service.setting.project.getProjectSettings("hcpdeploy", oDocument).then(function(oDeployedAppInfo) {
						if (!oDeployedAppInfo) {
							that.trace("SRF", oContext.i18n.getText("appNotDeployedMsg", [sName ? sName : ""]), oContext, "info");
							return autData;
						}
						
						autData.appAccount = oDeployedAppInfo.account;
						autData.appName = oDeployedAppInfo.name;
						autData.appVersion = oDeployedAppInfo.lastVersionWeTriedToDeploy;
						autData.projectName = autData.appName || autData.projectName;
						
						return autData;
					}).fail(function() {
						return autData;
					});
				});
			},
			
			generateDefaultTags: function(applicationData) {
				var aTags = [];
				var sProjectPrefix = "SAP-";
				var nTagLength = 50;
	
				aTags.push({
					"name": (sProjectPrefix + applicationData.sProjectName).substr(0, nTagLength)
				});
	
				if (applicationData.sAppVersion) {
					aTags.push({
						"name": applicationData.sAppVersion.substr(0, nTagLength)
					});
				}
				if (applicationData.sAppAccount) {
					aTags.push({
						"name": applicationData.sAppAccount.substr(0, nTagLength)
					});
				}
				return aTags;
			},
			
			generateDefaultEnvironment: function() {
				var env = [{
						"os": {
							"name": "Windows",
							"version": "7"
						},
						"type": "web",
						"browser": {
							"name": "Chrome",
							"version": "51"
						}
					}];
					// fetch the current system information
					/*			var browserInfo = this.getBrowserInfo();
								var osInfo = this.getOSInfo();
										
								env[0].os.name = osInfo.name || env[0].os.name;
								env[0].type = browserInfo.type || env[0].type;
								env[0].browser = browserInfo.browser || env[0].browser ;
					*/
					return env;
			},
			
			getRunConfigurations: function( sAppExecutableFullPath) {
				return this._getRunConfigurations({ sAppExecutableFullPath : sAppExecutableFullPath});
			},
			
			_getRunConfigurations: function(oTestDefinitionData) {
				var that = this;
				if ( oTestDefinitionData.sAppExecutableFullPath) {
					this.trace("SRF", this._oContext.i18n.getText("getRunConfigurations",[oTestDefinitionData.sAppExecutableFullPath]), this._oContext, "log");
					return this._oContext.service.run.getRunConfigurations(oTestDefinitionData.sAppExecutableFullPath)
					.then( function( aCfgs ) {
						var aRelevantCfg = aCfgs.filter( function(aCfg) {
										return oTestDefinitionData.sAppExecutableFullPath.indexOf(aCfg.filePath) > -1;
									});
						return aRelevantCfg;
					})
					.catch( function(error){
						that.trace("SRF", that._oContext.i18n.getText("generateUrlForAppFailedMsg", [ oTestDefinitionData.sAppExecutableFullPath, (error && error.message)]), that._oContext, "error");
						return [];
					});
				}
				else { 
					return [];
				}
			},

			generateAUTUrl: function( sAppExecutableFullPath ) {
				return this._generateAUTUrl( { sAppExecutableFullPath :sAppExecutableFullPath } );
			},
			
			generateAUTUrlFromRunConfig: function( sAppExecutableFullPath, oRunConfiguration ) {
				return this._oContext.service.run.getApplicationUrl( sAppExecutableFullPath, oRunConfiguration);
			},

			_generateAUTUrl: function( oTestDefinitionData) {
				var that = this;
				if ( oTestDefinitionData.sAppExecutableFullPath) {
					this.trace("SRF", this._oContext.i18n.getText("generatingUrlForAppMsg",[oTestDefinitionData.sAppExecutableFullPath]), this._oContext, "log");
					return this._oContext.service.run.getRunConfigurations(oTestDefinitionData.sAppExecutableFullPath).then( function( aCfgs ) {
						var aRelevantCfg = aCfgs.filter( function(aCfg) {
										return aCfg.fileName === oTestDefinitionData.sAppExecutableFullPath;
									});
						return that._oContext.service.run.getApplicationUrl( oTestDefinitionData.sAppExecutableFullPath, aRelevantCfg[0]);
					})
					.catch( function(error){
						that.trace("SRF", that._oContext.i18n.getText("generateUrlForAppFailedMsg", [ oTestDefinitionData.sAppExecutableFullPath, (error && error.message)]), that._oContext, "error");
						return ("about:blank");
					});
				}
				else { 
					return Q("about:blank");
				}
			},
			
			isExecutable: function( oDocument) {
				if (!oDocument) {return false;}
				return this._isExecutable( oDocument.getEntity().getName());
			},
			
			// returns Promise<array of executable files full paths> given project' document
			// in case of oDocument is executable file and fAllFiles is undefined, returns an array of single element -
			// this executable file
			fetchExecutableFiles: function( oDocument, fAllFiles) {
				var aPaths = [];
				var sName = "";
				
				var that = this;
				if ( !oDocument && this._oSelectedDocument)
				{
					//this.trace("SRF", "fetchExecutableFiles - no selected document, use the last stored " , this._oContext, "warn");
					oDocument = this._oSelectedDocument;
				}
				if (!oDocument)
				{ 
					return  Q.resolve(aPaths);
				}
				// return this document full path if it is an executable file 
				sName = oDocument.getEntity().getName();
				if ( this._isExecutable( sName) && !fAllFiles)
				{
					//this.trace("SRF", "fetchExecutableFiles " + sName , this._oContext, "log");
					aPaths.push( { sFilePath: oDocument.getEntity().getFullPath(), sFileName: sName});
					return  Q.resolve(aPaths);	
				}
			
				return oDocument.getProject(true)
					.then(function(oProjectDocument) {
						return oProjectDocument.getCurrentMetadata(true)
						.then(function(aMetadata) {
							$.each( aMetadata,	function(i, oMetadata) {
								if ( oMetadata.folder === false 
									&& that._isExecutable( oMetadata.name)
									&& !that._isHidden( oMetadata.name)
									&& !that._isInternal( oMetadata.name))
								{
									aPaths.push( {sFilePath: oMetadata.path, sFileName: oMetadata.name });
								}
							});
							return  Q.resolve(aPaths);
					});
				});
			},
			
			_isExecutable: function( sName) {
				if (!sName) { return false;}
				if ( sName === "Component.js") { return true;}
				// check file name ends with ".html" case insensitive
				var regExp= /.+\.html$/i;
				return regExp.test(sName);
			},
			
			_isInternal: function( sName)
			{
				//exclude mock_preview_sapui5.html	
				if (!sName) { return true;}
				// check file name contains with "mock_preview" case insensitive
				var regExp= /.*mock_preview.*/i;
				return regExp.test(sName);
			},
			
			_isHidden: function( sName) {
				//exclude preview_hidden.html
				if (!sName) { return true;}
				// check file name contains with "hidden" case insensitive
				var regExp= /.*preview_hidden.*/i;
				return regExp.test(sName);
			},
				
			_isGitInfo: function( sPath) {
				if (!sPath) { return false;}
				// check file name contains with ".git" case insensitive
				var regExp= /.+\.git/i;
				return regExp.test(sPath);
			},
			
			// returns SRF URL for window.open like this:
			// "automation?testId=b866b224-5323-42c8-9bbb-a04507a7615d&recordingUrl=www.cnn.com&closeOnRecordStop"
			// testId - SRF test ID
			// recordingUrl - AUT's url
			// closeOnRecordStop - inform SRF to close browser window after recording completed
			_getRecordingSessionUrl: function(oContext, oTestDefinitionData) {
				var that = this;
				var srfUrl = "";
				var reason = oContext.i18n.getText("projectNotSelected");
				return that._getRealDestinationUrl(oContext)
					.then(function(sUrl) {
						srfUrl = sUrl || srfUrl;
						if(!oTestDefinitionData.test || !oTestDefinitionData.test.id) { // legacy/paranoya code
							if (!oTestDefinitionData.sProjectName) {
								var sError = oContext.i18n.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName || "", reason]);
								that.trace("SRF", sError, oContext, "error");
								that.liteNotification( "SRF", sError, oContext, "error");
								throw (sError);
							}
							
							return that._createTest(oContext, oTestDefinitionData);
						} else {
							return oTestDefinitionData;
						}
					}).then(function(testDefinitions) {
						if (!testDefinitions.test) {
							var sError = oContext.i18n.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName || "", "undefined test"]);
							that.liteNotification("SRF", sError, oContext, "failure");
							throw (sError);
						}
						that.trace("SRF", oContext.i18n.getText("scriptRecordingMsg" ,[oTestDefinitionData.sTestName]),oContext, "info");
						that.trace("SRF", oContext.i18n.getText("newTestGenerateAppUrlDebugMsg",[oTestDefinitionData.sAppUrl]), oContext, "debug");	

						srfUrl +=  that.srfOpenWorkspace
									+ "scripts/record?testId=" + testDefinitions.test.id 
									+ "&platform=" + testDefinitions.test.platform
									+ "&recordingUrl=" + window.encodeURIComponent(oTestDefinitionData.sAppUrl)
									+ "&closeOnRecordExit";
									//+ "&closeOnRecordStop ";
						that.trace("SRF", oContext.i18n.getText("newTestSrfUrlDebugMsg", [srfUrl]), oContext, "info");
						return srfUrl;
					}).catch(function(err) {
						//	error
						that.trace("SRF",oContext.i18n.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName || "", ( err.message || err || "unknown")]), oContext, "error");
						return Q.reject(err);
					});
			},
			
			_createTest: function(oContext, oTestDefinitionData) {

				if (!oTestDefinitionData.sProjectName) {
					var reason = this._oResourceBundle ? this._oResourceBundle.getText("projectNotSelected") : oContext.i18n.getText("projectNotSelected");
					var errorDesc = this._oResourceBundle ? this._oResourceBundle.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName || "", ]) 
											: oContext.i18n.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName || "", reason]);
					this.trace("SRF", errorDesc, oContext, "error");
					this.liteNotification("SRF", errorDesc,	oContext, "error");
					return Q.reject(reason); 
				}

				var body = {
								"name": oTestDefinitionData.sTestName,
								"description": oTestDefinitionData.sTestDescription,
								"type": oTestDefinitionData.sTestPlatform, // default - web
								"subType": oTestDefinitionData.sTestType || "auto",
								"environments": oTestDefinitionData.aEnvoronments
							},
					testManagerUrl = this.getTestManagerDestination() + this.srfWorkspace + "/tests",
					that = this;
					
				return this.getSrfTenant(oContext).then( function( sTenant) {
					var sTenantUrl = "TENANTID=" + sTenant;
					testManagerUrl = that.addUrlQueryStatement( testManagerUrl, sTenantUrl);

					return Q.sap.ajax(testManagerUrl, {
						contentType: "application/json",
						type: "POST",
						xhrFields: { withCredentials: false },
						data: JSON.stringify(body)
					}).then(function(oResponse) {
	
						if (!oResponse || oResponse.length <= 0 || !oResponse[0].id) {
							that.liteNotification("SRF", 
								that._oResourceBundle ? that._oResourceBundle.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName]) : oContext.i18n.getText("creationTestFailedNotification",[oTestDefinitionData.sTestName]),
								oContext, "failure");
							return null;
						}
						that.trace("SRF",
							that._oResourceBundle ? that._oResourceBundle.getText("creationTestSuccessNotification",[oTestDefinitionData.sTestName, oResponse[0].id]) : oContext.i18n.getText("creationTestSuccessNotification",[oTestDefinitionData.sTestName, oResponse[0].id]),
							oContext, "info");
						oTestDefinitionData.test = oResponse[0];
						return oTestDefinitionData; // created test id: oResponse[0].test.id
					});
				});
			},
			
			// execute test API
			executeTest: function(oTestDefinitionData, oContext, oAuxModel, fSuccess, fFailure) {
				var msg = this._oResourceBundle ? this._oResourceBundle.getText("testDefinitionMissingNotification") : oContext.i18n.getText("testDefinitionMissingNotification");
				if (!oTestDefinitionData || !(oTestDefinitionData.testId || oTestDefinitionData.id)) {
					this.log("SRF", msg, oContext, "warn");
					this.liteNotification("SRF",
						msg,
						oContext,
						"info");
					return Q({});
				} 
				
				var sTestId = oTestDefinitionData.testId || oTestDefinitionData.id,
					sAppUrl = oTestDefinitionData.sAppUrl;
				msg = this._oResourceBundle ? this._oResourceBundle.getText("runTestMsg", [sTestId, sAppUrl ? " sAppUrl" + sAppUrl : ""]) : oContext.i18n.getText("runTestMsg",[sTestId, sAppUrl ? " sAppUrl" + sAppUrl : ""]);
				this.log("SRF", msg, oContext, "info");

				return this._executeTest(oTestDefinitionData, oContext, oAuxModel, fSuccess, fFailure);
			},
			
			_executeTest: function(oTestDefinitionData, oContext, oAuxModel, fSuccess, fFailure) {
				var sTestId = oTestDefinitionData.testId || oTestDefinitionData.id,
					sTestName = oTestDefinitionData.name || "";
				//var	sAppUrl = oTestDefinitionData.sAppUrl;
				var msg = "";
				if (!oTestDefinitionData || !sTestId) {
					msg = this._oResourceBundle ? this._oResourceBundle.getText("testDefinitionMissingNotification") : oContext.i18n.getText("testDefinitionMissingNotification");
					this.log("SRF", msg, oContext, "warn");
					this.liteNotification("SRF", msg, oContext,	"info");
					return Q({});
				}

				var body = {
					"testId": sTestId
						//	,"url": sAppUrl // future - app url will be passed to test by input parameter
				};

				var sUrl = this.getJobManagerDestination() + "/v1" + this.srfWorkspace + "/execution/jobs";
				
				var sType = "POST";
				var that = this;
				return this.getSrfTenant(oContext).then( function( sTenant) {
				
					var sTenantUrl = "TENANTID=" + sTenant;
					sUrl = that.addUrlQueryStatement( sUrl, sTenantUrl);
					//sUrl = that.addUrlQueryStatement( sUrl, that.getSrfToken());  // LWMDSSO_NRM=XXX
					
					//that.log("SRF", "SRF.executeTest AJAX URL: " + sUrl, oContext);
					
					return Q.sap.ajax(sUrl, {
						contentType: "application/json",
						type: sType,
						data: JSON.stringify(body),
						xhrFields: {
							withCredentials: false
						},
						responseType: "json"
					}).then(function(oResponse) {					
						if (oResponse && oResponse.length > 0) {
							//that.log("SRF", "Response " + JSON.stringify(oResponse[0]), oContext);
							var jobId = oResponse[0].jobs && oResponse[0].jobs[0] && oResponse[0].jobs[0].jobId || "";
							if (jobId) {
								that.liteNotification("SRF",
									that._oResourceBundle ? that._oResourceBundle.getText("testRunningNotification", [sTestName]) : oContext.i18n.getText("testRunningNotification", [sTestName]),
									oContext,
									"success");
								if (fSuccess) {
									fSuccess({
										"id": sTestId,
										"runId": jobId,
										"status": "running"
									});
								}
								return jobId;
							}
							
							return "";
						} else {
							that.trace("SRF",
								oContext.i18n.getText("testRunFailedNotification", [sTestName, JSON.stringify( oResponse[0])]),
								oContext,
								"error");
							that.liteNotification("SRF",
								that._oResourceBundle ? that._oResourceBundle.getText("testNoStateNotification", [sTestName]) : oContext.i18n.getText("testNoStateNotification", [sTestName]),
								oContext,
								"failure");
							if (fSuccess) {
								fSuccess({
									"id": sTestId,
									"runId": null,
									"status": "failed"
								});
							}
							return "";
						}
					},
					function(err) {
						var errCode =  err && err.responseJSON && err.responseJSON.code,
							errStatusText = err && err.statusText,
							oResource = that._oResourceBundle || oContext.i18n,
							errTextByCode = errCode && oResource.getText(errCode),
							sContextError = oResource.getText("testRunFailedNotification", [sTestName, errTextByCode || errStatusText]);					
						
						that.trace("SRF",
							err && err.message + sContextError + " \n" + (body ? "[ test ID " + JSON.stringify(body) + "]" : ""),
							oContext,
							"failure");
						that.liteNotification("SRF",
							sContextError,
							oContext,
							"failure");
	
						if (fFailure) {
							fFailure({
								"id": sTestId,
								"runId": null,
								"status": "failed",
								"message": (err || err.message)
							});
						}
						return {};
					});
				});
			},

			_getFullDestinationUrl: function(sDestinationName) {
				return this._getRealDestinationUrl( this._oContext);
			},

			_openInNewTab: function(sUrl, oContext, sWinName) {
				if (!sUrl) {
					return null;
				} 
				this.log("SRF", oContext.i18n.getText("openNewTabMsg", [sUrl]),  oContext);
			
				var win = window.open(sUrl, sWinName || "_blank");

				if (win) {
					//Browser has allowed it to be opened
					win.focus();
				} else {
					//Broswer has blocked it
					this.log("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);
					//this.liteNotification("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);
					this.notification("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);					
				}
				return win;
			},

			_openSelfTab: function(sUrl, oContext) {
				if (!sUrl) {
					return this;
				}

				this.log("SRF", oContext.i18n.getText("openNewTabMsg", [sUrl]),  oContext);
				var win = window.open(sUrl, "_self", "directories=0,titlebar=0,toolbar=0,location=0,status=0, menubar=0,scrollbars=no,resizable=no");

				if (win) {
					//Browser has allowed it to be opened
					win.focus();
				} else {
					//Broswer has blocked it
					this.log("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);
					this.liteNotification("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);
					this.notification("SRF", oContext.i18n.getText("allowPopupsMsg", [sUrl]), oContext);
				}
				return this;
			},
			
			// returns json 
/*			{
				"type": "web",
				"browser": {
					"name": "Chrome",
					"version": "51"
				}
			}*/
			getBrowserInfo: function() {
				// fVersion
				var browserInfo = {
					"type": "web",
					"browser": {
						"name": "",
						"version": ""
					}
				};
				//1 name	
				if ($.browser.mozilla ){ 
					browserInfo.browser.name = "Firefox";
				}
				// If the browser type is Opera
				else if( $.browser.opera) {
					browserInfo.browser.name = "Opera";
				}
				// If the web browser type is Safari
				else if( $.browser.safari ) {
					browserInfo.browser.name = "Safari";
				}
				// If the web browser type is Chrome
				else if( $.browser.chrome) {
					browserInfo.browser.name = "Chrome";
				}
				// If the web browser type is Internet Explorer
				else if ($.browser.msie) {
					browserInfo.browser.name = "Internet Explorer";
				}
				//2. version convert to string
				browserInfo.browser.version = $.browser.fVersion + '';
				//3. type
				//If the browser type is mobile
				if ($.browser.mobile) {
					browserInfo.type = "mobile";
				}
				return browserInfo;
			},
			getOSInfo: function() {
				var sOS = {name:null};
				if (window.navigator.appVersion.indexOf("Win")!==-1) {sOS.name="Windows";}
				else if (window.navigator.appVersion.indexOf("Mac")!==-1) {sOS.name="MacOS";}
				else if (window.navigator.appVersion.indexOf("X11")!==-1) {sOS.ame="UNIX";}
				else if (window.navigator.appVersion.indexOf("Linux")!==-1) {sOS.name="Linux";}
				return sOS;

			},
			// start asset replay and edit/record session 
			startAttendedEdit: function(oContext, oAssetData) {
				var that = this;
				return Q.promise(function(resolve, reject){
					if (!oAssetData) {
						that.trace("SRF", oContext.i18n.getText("assetOpenDataMissingMsg"), oContext, "warn");
						that.notification("SRF", oContext.i18n.getText("assetOpenDataMissingMsg"), oContext, "warn");
						return {};
					}
					var _oAssetPhysicalName = oAssetData.physicalFileName;
					
					that.trace("SRF", oContext.i18n.getText("assetOpenDataMsg", [_oAssetPhysicalName]),	oContext, "info");
	
					return that._openAttendedEditSession(oContext, oAssetData, resolve);
				});
			},

			_openAttendedEditSession: function(oContext, oAssetData, onClose) {
				var that = this;

				if (this._attendedTab && !this._attendedTab.closed){
					this.liteNotification("SRF", this._oResourceBundle ? this._oResourceBundle.getText("attendedEditSessionProgressNotification") : oContext.i18n.getText("recordSessionProgressNotification"), oContext, "warn") ;
					return onClose();
				}
				var sPath = that.srfOpenWorkspace + "scripts/" +  oAssetData.yac + "/player";
				return Q.spread([this._getFullDestinationUrl( oContext),  this.getSrfTenant(oContext)], function( sUrl, sTenant) {
				
					var ssoToken = that.getSrfToken();
					
					//that.trace("SRF", "SRF Asset Open in Player URL:" + sUrl + sPath + "?" + ssoToken + 	"&TENANTID=" + sTenant, oContext);
					that.trace("SRF", oContext.i18n.getText("assetOpenUrlDebugMsg", [sUrl + sPath + "?" + ssoToken + "&TENANTID=" + sTenant]), oContext,"debug");
					that._attendedTab = that._openInNewTab(sUrl + sPath + "?" + ssoToken + "&TENANTID=" + sTenant, oContext, "SAP_SRF_AttendedEdit");
					if (that) {
						that.liteNotification("SRF", 
							that._oResourceBundle ? that._oResourceBundle.getText("attendedEditNotification",[oAssetData.originalFileName, oAssetData.physicalFileName])
								: oContext.i18n.getText("attendedEditNotification",[oAssetData.originalFileName, oAssetData.physicalFileName]),
							oContext, "success");
	
						var interval = window.setInterval(function() { 
							if(that._attendedTab.closed) {
								onClose();
								window.clearInterval(interval);
							}
						}, 500);
					}
				});
			},
			
			// returns template based on document extInfo["sdk"]
			_template: function(sSdk, sTestType) {

				
				if ( !sSdk) {
					sSdk = "leanft";
				}
				switch (sSdk) {
					case "leanft":
						return this._leanft(sTestType);
					case "selenium":
						return this._selenium();
					default:
						return this._leanft(sTestType);
				}
				
			},
			
			_leanft: function(sTestType)
			{
				return sTestType === "mobile" ? this.LeanFTMobileScriptTemplate : this.LeanFTWebScriptTemplate;
			},
			
			_selenium: function()
			{
				var sSeleniumScriptTemplate =
								
				"\nvar wd = require('wd');" +
				
				"\nvar VARS = {};" +
				// This assumes that selenium is running at http://127.0.0.1:4444/wd/hub/
				"\nvar noop = function () {};" +
				
				"\nvar b = wd.remote(process.env.SELENIUM_HOST, process.env.SELENIUM_PORT);" +
				    //b = wd.remote('127.0.0.1', 4444);
				   // b = wd.promiseChainRemote('127.0.0.1', 4444);
				
				"\nb.on('status', function (info) {" +
				"\n\tconsole.log('\x1b[36m%s\x1b[0m', info);" +
				"\n});"+
				
				"\nb.on('command', function (meth, path) {" +
				"\n\tconsole.log(' > \x1b[33m%s\x1b[0m: %s', meth, path);" +
				"\n});" +
				
				"\nb.on('error', function (meth, path) {" +
				"\n\tconsole.error(' > \x1b[33m%s\x1b[0m: %s', meth, path);" +
				"\n});" +
				
				"\n\ndescribe('Selenium Test Case', function () {" +
				
				 "\n\n\tit('should execute test case without errors', function (done) {" +
				
				"\n\n\t\treturn b.chain(function (err) {" +
				"\n\n\t\t\tdone(err);" +
				"\n\n\t\t})" +
				"\n\n\t\t.init({" +
				"\n\n\t\t\tbrowserName: 'chrome'"+
				"\n\n\t\t\t, version: '50'"+
				"\n\n\t\t\t, tags: ['examples']"+
				"\n\n\t\t\t, name: 'This is an example script'"+
				"\n\n\t\t\t, hpExtendedConfigurations: {recordSnapshots: true}"+
				"\n\n\t\t\t, SRF_ACCESS_KEY: process.env.SRF_ACCESS_KEY"+
				"\n\n\t\t\t})"+
				"\n\n\t\t .get('http://www.bing.com')"+
				"\n\n\t\t.elementById('sb_form_q', function (err, el) {"+
				"\n\n\t\t\t\tb.next('clear', el, function (err) {"+
				"\n\n\t\t\t\tb.next('type', el, 'ebay;, noop);"+
				"\n\n\t\t\t});"+
				"\n\n\t\t})"+
				"\n\n\t\t.elementById('sb_form_go', function (err, el) {"+
				"\n\n\t\t\tb.next('clickElement', el, noop);"+
				"\n\n\t\t})"+
				"\n\n\t\t.elementByLinkText('eBay - Official Site', function (err, el) {"+
				"\n\n\t\t\tb.next('clickElement', el, noop);"+
				"\n\n\t\t})"+
				"\n\n\t\t.elementById('gh-ac', function (err, el) {"+
				"\n\n\t\t\tb.next('clear', el, function (err) {"+
				"\n\n\t\t\t\tb.next('type', el, process.env.KEYWORD, noop);"+
				"\n\n\t\t\t});"+
				"\n\n\t\t})"+
				"\n\n\t\t.elementById('gh-btn', function (err, el) {"+
				"\n\n\t\t\tb.next('clickElement', el, noop);"+
				"\n\n\t\t})"+
				
				"\n\n\t\t.sleep(5000)"+
				"\n\n\t\t.quit(function (err) {"+
				"\n\n\t\t\tdone(err);"+
				"\n\n\t\t})"+
				
				"\n\n\t});"+
				"\n\n\t});"+
				
				"\n\n\tafterEach(function () {"+
				    //b.quit();
				"\n\n\t});";
				return sSeleniumScriptTemplate;
			}
		};
	});