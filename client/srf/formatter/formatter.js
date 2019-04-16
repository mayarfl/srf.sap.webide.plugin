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
	"../control/common/utils"], function(CommonUtils) {
	"use strict";

	var Formatter =  {
		
		stepError: function() {
			return jQuery.sap.getModulePath("srf/img/stepstatus") + "/error_mark.png";
		},
		
		isVisible: function(sData) {
			return sData && (sData !== "") ? true : false;
		},
		
		isPropertiesExpanded: function(sDetails) {
			var bRet = sDetails ? false : true;
			
			return bRet;
		},
		
		
		stepVerificationDataVisible: function( oParameters ) {
			return oParameters && !$.isEmptyObject(oParameters) ? true: false;
		},
		
		addEnvironmentsBtnText: function(bBrowsers, bMobiles, bApps) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle();

			return bBrowsers || bMobiles || bApps ? oResourceBundle.getText("modifyEnvironment") : oResourceBundle.getText("addEnvironment");
		},

		base64Image: function( sImage ) {
			if( sImage && sImage.indexOf("data:image/png;base64,") < 0 ) {
				sImage = "data:image/png;base64," + sImage;
			}
			
			return sImage || jQuery.sap.getModulePath("srf/img") + "/empty.png";
		},
		
		lunchOnStartAppId: function( oRunContext ) {
			var bRet = "";
			
			if(oRunContext && oRunContext.launchOnStart && oRunContext.launchOnStart.mobileApp) {
				bRet = oRunContext.launchOnStart.mobileApp.id;
			}
			return bRet;	
		},
		
		btnRunEnabled: function( oTest ) {
			if( oTest ) {
				var bEnv = oTest.environments && oTest.environments.length > 0;
				var bMobile = oTest.mobileCapabilities && oTest.mobileCapabilities.length > 0;
				var bDevice = oTest.mobileDevice && oTest.mobileDevice.length > 0;
				var bScript = oTest.scripts && oTest.scripts.length > 0;

				return bScript && (bEnv || bMobile || bDevice) ? true : false;	
			} else {
				return false;
			}
		},
		
		trueFalse: function( bTrue ) {
			return bTrue ? "True" : "False";// "Reserved & Locked";	
		},
		
		labType: function(oType) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle();

			return oResourceBundle.getText(oType);
		},
		
		platformVersionOperatorVisible: function( sPlatformVersion ) {
			return sPlatformVersion ? true : false;
		},
				
		deviceAvailabilityTooltip: function(oCurrentReservation, bConnected) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				bFree = oCurrentReservation && (oCurrentReservation.status).toLowerCase() === "free",
				ret = bConnected ? (bFree ? oResourceBundle.getText("Available") : oResourceBundle.getText(oCurrentReservation.status)) 
						: oResourceBundle.getText("Disconnected");
				
			if(bConnected && oCurrentReservation && !bFree) {
				var startTime = this.formatter.timestampToDateTime(oCurrentReservation.startTime) || "",
					endTime = this.formatter.timestampToDateTime(oCurrentReservation.endTime) || "",
					status = oResourceBundle.getText(oCurrentReservation.status) || "",
					owner = oCurrentReservation.owner || "";
					
				ret = oResourceBundle.getText("reservationTooltip", [status, startTime, endTime, owner]);
			}
			
			return ret;
				//that.getResourceBundle().getText("loginSuccessUserMsg", [that.getModel("srf").getProperty("/srf_username"), that.getModel("srf").getProperty("/srf_destination") ])


//"currentReservation":{"status":"reservedByOther"}
//Reserved & Locked 8/25/17 | 01:35 AM - 8/25/17 | 02:05 AM by srfqa@yopmail.com
			

//"currentReservation":{"owner":"srfqa@yopmail.com","status":"ReservedAndLocked","startTime":1503614136875,"endTime":1503615936875}
//Reserved & Locked 8/25/17 | 01:35 AM - 8/25/17 | 02:05 AM by srfqa@yopmail.com
		},

		deviceAvailabilityImage: function(oCurrentReservation, bConnected) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/device"),
				bFree = oCurrentReservation && (oCurrentReservation.status).toLowerCase() === "free";
				
			return  sModulePath + (bConnected ? (bFree ? "/available.png" : "/busy.png") : "/disconnected.png");
		},
		
		deviceAvailable: function( oCurrentReservation, bConnected ) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				bFree = oCurrentReservation && (oCurrentReservation.status).toLowerCase() === "free";
		
			return bConnected ? (bFree ? oResourceBundle.getText("Available") : oResourceBundle.getText(oCurrentReservation.status)) 
								: oResourceBundle.getText("Disconnected");
		},
		
		testPlatform: function(sPlatform) {
			var sImagePath = "";
			
			if(sPlatform) {
				var sModulePath = jQuery.sap.getModulePath("srf/img/srftesttype/hpe-");
				sImagePath = sModulePath + sPlatform.toLowerCase() + ".svg";
			}
		
			return sImagePath;
		},
		
		isIOSDevice: function(sPlatform) {
			return sPlatform.toLowerCase() === "ios";
		},
		
		isAndroidDevice: function(sPlatform) {
			return sPlatform.toLowerCase() === "android";
		},
				
		deviceNamesByOS: function( oDevices) {
			var retDevices = [];
			
			for( var device in oDevices ) {
				if( !retDevices.find( function(retDevice) {
					return (device.name === retDevice.name);
						})) {
					retDevices.push(device);
				}
			}
			return retDevices;
		},
		
		deviceVersionsByOS: function( oDevices, sPlatform) {
			var oDevicesOS = oDevices.find( function(device) {
					return (device.name.toLowerCase() === sPlatform);
				}),
				retDevices = [];
			
			for( var device in oDevicesOS ) {
				if( !retDevices.find( function(retDevice) {
					return (device.platformVersion === retDevice.platformVersion);
						})) {
					retDevices.push(device);
				}
			}
			return retDevices;
		},

		selectedItemsHBoxVisible: function( bMCHasSelection, bSRFHasSelection) {
			return bMCHasSelection || bSRFHasSelection;
		},
		
		devicesSectionVisible: function(devices, specificDevices) {
			return (devices && devices.count > 0) || (specificDevices && specificDevices.count > 0) ;
		},
		
		noSelectionHBox: function( bMCHasSelection, bSRFHasSelection) {
			return bMCHasSelection || bSRFHasSelection ? false : true;
		},

		noAvailableBrowsersVisible: function( bExists, sPlatform ) {
			return (sPlatform === "web") && bExists ? true : false;
		},
			
		mobilesVisible: function( bExists, sPlatform ) {
			return (sPlatform !== "web") ? true : false;
		},
		
		appsVisible: function( bExists, sPlatform ) {
			return (bExists && sPlatform !== "web") ? true : false;
		},
		
		browsersSelectionVisible: function( sPlatform, bHasSelection ) {
			return bHasSelection && sPlatform === "web" ? true : false;
		},
				
		devicesSelectionVisible: function( sPlatform, devCount ) {
			return devCount > 0 ? true : false;
		},		
		
		runContextSelectionVisible: function( sPlatform, devCount ) {
			return sPlatform !== "web" && devCount > 0;
		},
		
		appsSelectionVisible: function( sPlatform, appsCount ) {
			return sPlatform !== "web" && appsCount > 0 ? true : false;
		},
		
		browsersSectionVisible: function( sPlatform ) {
			return sPlatform === "web" ? true : false;
		},
		
		mobileSectionVisible: function( sPlatform ) {
			return sPlatform === "web" ? false : true;
		},
		
		rulesSelectionVisible: function( devCount ) {
			return devCount > 0 ? true : false;
		},
		
		specificDevicesSelectionVisible: function( devCount ) {
			return devCount > 0 ? true : false;
		},
		
		platformVersionRuleKey: function(sPlatformVersion) {
			var retVersion = 1;
			
			switch(sPlatformVersion) {
				case ">=" :
					retVersion = 5;
					break;
				case "<=" :
					retVersion = 3;
					break;
				case ">":
					retVersion = 4;
					break;
				case "<" :
					retVersion = 2;
					break;
				default:
					retVersion = 1;
					break;
			}

			return retVersion;			
		},
		
		deviceSource: function(sSource) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				ret = sSource && oResourceBundle.getText(sSource) || oResourceBundle.getText("MC");

			return ret;
		},
		
		testPlatformName: function(sTestPlatform) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				ret = oResourceBundle.getText(sTestPlatform);

			return ret;	
		},
		
		environmentSelectionTitle: function(bRunEnvironmentsSelection) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				ret = oResourceBundle.getText(bRunEnvironmentsSelection ? "environmentSelection" : "recEnvironmentSelection");

			return ret;		
		},
		
		platformVersion: function(sPlatformVersion) {
			var retVersion = "";
			
			if(sPlatformVersion) {
				if( sPlatformVersion.startsWith(">=") || sPlatformVersion.startsWith("<=") ) {
					retVersion = sPlatformVersion.slice(2);
				} else if( sPlatformVersion.startsWith(">") || sPlatformVersion.startsWith("<") ) {
					retVersion = sPlatformVersion.slice(1);
				} else {
					retVersion = sPlatformVersion;
				}
			}
			
			return retVersion;
		},
		
		browserImg: function(sBrowserName) {

			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = CommonUtils.BrowserOs.getImageName(sModulePath, "browser", sBrowserName, true);

			return sImagePath;
		},
		
		testType: function(sType) {
			var sImagePath = "";
			
			if(sType) {
				var sModulePath = jQuery.sap.getModulePath("srf/img/scripttype/hpe-");
				sImagePath = sModulePath + sType.toLowerCase() + ".svg";
			}
		
			return sImagePath;
		},
		
		instrumentedApplicationExist: function(sInstrumentedApplicationExist) {
			var sRet = sInstrumentedApplicationExist ? "Both packaged and non-packaged versions available" : "Only non-packaged version available";
			
			return sRet;
		},	
		
		usePackagedVersionTooltip: function(oMobileAppContext) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle();

			if (!oMobileAppContext || oMobileAppContext.canChangeUsePackagedVersion) {
            	return "";
        	}

	        if (oMobileAppContext.isHasNotPackagedBinary && !oMobileAppContext.isHasPackagedBinary) {
	            return oResourceBundle.getText("hasOnlyNonPackaged");
	        }
	
	        if (!oMobileAppContext.isHasNotPackagedBinary && oMobileAppContext.isHasPackagedBinary) {
	            return oResourceBundle.getText("hasOnlyPackaged");
	        }
	
	        return "";
		},
		
		timestampToDate: function(timestamp, locale, options) {
			
			if( timestamp === null ) {
				return "";
			}
			
			var dt = new Date(timestamp);
			var defaultLocale = "en-US";
			var defaultOptions = {
				year: "2-digit",
				month: "2-digit",
				day: "2-digit"
			};
			locale = locale || defaultLocale;
			options = options || defaultOptions;
			return dt.toLocaleDateString(locale, options);
		},
		
		timestampToDateTime: function(timestamp, locale, options) {
		
			if( !timestamp ) {
				return "";
			}
				
			var dt = new Date(timestamp);
			var defaultLocale = "en-US";
			var defaultOptions = {
				year: "2-digit",
				month: "2-digit",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
//				second: "2-digit",
				hour12: false
			};
			locale = locale ? locale : defaultLocale;
			options = options ? options : defaultOptions;
			return dt.toLocaleString(locale, options);
		},	
			
		timestampToTestName: function(timestamp, locale, options) {
			
			if( timestamp === null ) {
				return "";
			}
			
			var dt = new Date(timestamp);
			var defaultLocale = "en-US";
			var defaultOptions = {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit"
			};
			locale = locale ? locale : defaultLocale;
			options = options ? options : defaultOptions;
			return dt.toLocaleDateString(locale, options);
		},
		
		environments: function(oEnv, oMobile) {
			var sResult = (oEnv && oEnv.length) + (oMobile && oMobile.length) || "";
		
			return sResult;
		},
	
		scripts: function(sScripts) {
			var sResult = sScripts + "sap-icon://documents";
		
			return sResult;
		},
		
		status: function(sStatus) {
			if (sStatus === "success") {
				return "Success";
			} else if (sStatus === "running") {
				return "Warning";
			} else if (sStatus === "failed"){
				return "Error";
			} else {
				return "None";
			}
		},	
		
		scriptStatus: function(sModulePath, sStatus) {
			var sImagePath = sModulePath + "/failed1.png";
		
			if (sStatus === "success") {
				sImagePath = sModulePath + "/passed.png";
			} else if (sStatus === "completed") {
				sImagePath = sModulePath + "/completed.png";
			}  else if (sStatus === "pending" || sStatus === "cancelled") {
				sImagePath = sModulePath + "/pending.png";
			} else if (sStatus === "running") {
				sImagePath = sModulePath + "/running1.png";
			} else if (sStatus === "warning") {
				sImagePath = sModulePath + "/warning.png";
			} else if (sStatus === "errored") {
				sImagePath = sModulePath + "/errored.png";
			}

			return sImagePath;
		},
				
		scriptSelectedStatus: function(sModulePath, sStatus) {
			var sImagePath = sModulePath + "/failed_selected.png";
		
			if (sStatus === "success") {
				sImagePath = sModulePath + "/passed_selected.png";
			} else if (sStatus === "completed") {
				sImagePath = sModulePath + "/completed_selected.png";
			} else if (sStatus === "pending" || sStatus === "cancelled") {
				sImagePath = sModulePath + "/pending_selected.png";
			} else if (sStatus === "running") {
				sImagePath = sModulePath + "/running1_selected.png";
			} else if (sStatus === "errored") {
				sImagePath = sModulePath + "/errored_selected.png";
			}
			
			return sImagePath;
		},
		
		scriptStatusClass: function(sStatus) {
			var sRet = "";
		
			if (sStatus === "running" || sStatus === "running1") {
				sRet = "scriptrunning";
			}
			
			return sRet;
		},
		
		testStatus: function(sStatus) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/srftestsstatus"),
				sImagePath = sModulePath + "/noRun.png";
		
			if (sStatus === "success") {
				sImagePath = sModulePath + "/success.png";
			} else if (sStatus === "completed") {
				sImagePath = sModulePath + "/completed.png";
			} else if (sStatus === "pending") {
				sImagePath = sModulePath + "/noRun.png";
			} else if (sStatus === "errored") {
				sImagePath = sModulePath + "/errored.png";
			} else if (sStatus === "failed") {
				sImagePath = sModulePath + "/failed.png";
			} else if (sStatus === "running1") {
				sImagePath = sModulePath + "/running2.png";
			} else if (sStatus === "cancelled") {
				sImagePath = sModulePath + "/cancelled.png";
			}
			//TODO: need to handle no run status..
			return sImagePath;
		},
 
 		finishedTestStatus: function(sStatus) {
			var sRet = "Low";
		
			if (sStatus === "success") {
				sRet = "Low";
			}else if (sStatus === "errored") {
				sRet = "High";
			}else if (sStatus === "cancelled") {
				sRet = "Medium";
			}
			//TODO: need to handle no run status..
			return sRet;
		},

		btnStepPropertiesTooltip: function(bBtnPressed) {
			var oResourceBundle =  this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				ret = bBtnPressed ? oResourceBundle.getText("hideStepPropertiesTooltip") : 
						oResourceBundle.getText("showStepPropertiesTooltip");

			return ret;
		},
		
		stepStatus: function(sStatus) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/stepstatus"),
				sImagePath = sModulePath + "/running1.png";
		
			if (sStatus === "success"  || sStatus === "completed") {
				sImagePath = sModulePath + "/success.png";
			} else if (sStatus === "pending") {
				sImagePath = sModulePath + "/cancelled.png";
			} else if (sStatus === "failed") {
				sImagePath = sModulePath + "/error.png";
			} else if (sStatus === "errored") {
				sImagePath = sModulePath + "/error.png";
			} else if (sStatus === "cancelled") {
				sImagePath = sModulePath + "/cancelled.png";
			} else if (sStatus === "warning") {
				sImagePath = sModulePath + "/warning.png";
			}
			//TODO: need to handle no run status..
			return sImagePath;
		},
		
		statusColor: function(sStatus) {
			if (sStatus === "success") {
				this.addStyleClass(sStatus);
				return sStatus;
			} else if (sStatus === "running") {
				this.addStyleClass(sStatus);
				return sStatus;
			} else if (sStatus === "failed"){
				this.addStyleClass(sStatus);
				return sStatus;
			} else {
				return (!sStatus ? "" : sStatus);
			}
		},
			
		statusTooltip: function(oAdditionalData) {
			var sResult = "";
			
			if( !$.isEmptyObject(oAdditionalData) ) {
				sResult = "Execution count: " + 
					(!oAdditionalData.execCount ? 0 : oAdditionalData.execCount);

				if( oAdditionalData.lastRunData && oAdditionalData.lastRunData.scriptStatus ) {
					sResult += 	"\r\nScripts: " +
						(!oAdditionalData.lastRunData.scriptStatus.success ? 0 : oAdditionalData.lastRunData.scriptStatus.success) +
						" passed / " + 
						(!oAdditionalData.lastRunData.scriptStatus.errored ? 0 : oAdditionalData.lastRunData.scriptStatus.errored) + 
						" failed";
				}
			}
			return sResult;
		},
		
		parameters: function(oParams) {
			var sResult = "NO PARAMETERS";
			
			if( !$.isEmptyObject(oParams) ) {
				sResult = oParams.length + " PARAMETERS";
			}
			
			return sResult;
		},		
		
		parametersImg: function(oParams) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/params"),
				sImagePath = sModulePath + "/no_param.png",
				bOveriden = false;
		
			if( !$.isEmptyObject(oParams) ) {
				$.each(oParams, function(i, oParam) {
					if(oParam.value && oParam.value !== "" && oParam.defaultValue !== oParam.value) {
						bOveriden = true;
						return;
					}
				});
				
				sImagePath = bOveriden ? sModulePath + "/other_param.png" : sModulePath + "/def_param.png";
			}
			
			return sImagePath;
		},
		
		parametersImg1: function(oParams) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/param"),
				sImagePath = sModulePath + "/no_param.png",
				bOveriden = false;
		
			if( !$.isEmptyObject(oParams) ) {
				$.each(oParams, function(i, oParam) {
					if(oParam.value && oParam.value !== "" && oParam.defaultValue !== oParam.value) {
						bOveriden = true;
						return;
					}
				});
				
				sImagePath = bOveriden ? sModulePath + "/other_param1.png" : sModulePath + "/def_param1.png";
			}
			
			return sImagePath;
		},
		
		parametersDefaultValueIndicator: function( bHasNonDefaultValue ) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/param"),
				sImagePath = bHasNonDefaultValue ? sModulePath + "/other_param.png" : sModulePath + "/def_param.png";
			
			return sImagePath;
		},
			
		parametersDefaultValueIndicatorTooltip: function( bHasNonDefaultValue ) {
			var sImagePath = bHasNonDefaultValue ? "Non-default value" : "Default value";
			
			return sImagePath;
		},
		
		parametersRunImg: function(oParams) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/param"),
				sImagePath = "",
				bOveriden = false;
		
			if( !$.isEmptyObject(oParams) ) {
				$.each(oParams, function(i, oParam) {
					if(oParam.hasNonDefaultValue) {
						bOveriden = true;
						return;
					}
				});
				
				sImagePath = bOveriden ? sModulePath + "/other_param.png" : sModulePath + "/def_param.png";
			}
			
			return sImagePath;
		},
		
		parametersRunTooltip: function(oParams) {
			var sRet = "";
		
			if( !$.isEmptyObject(oParams) ) {
				sRet ="Parameter\tValue\r\n\r\n";
				$.each(oParams, function(i, oParam) {
					sRet += oParam.name + "\t\t" + oParam.value + "\r\n";				
				});
			}
			
			return sRet;
		},
							
		parametersTooltip: function(oParams) {
			var	sRet = $.isEmptyObject(oParams) ? "Add Parameters" : "Modify Parameters";

			return sRet;
		},
		
		scriptRunCaption: function(oScriptRun) {
			var bRet = "";
			
			if(oScriptRun) {
				var scriptName = oScriptRun.assetInfo && oScriptRun.assetInfo.name || "burst-run-" + oScriptRun.script.id;
				bRet = "'" + scriptName + "' on ";
			 	// + oScriptRun.environment.os.name + oScriptRun.environment.os.version + " " +
					//   oScriptRun.environment.browser.name + oScriptRun.environment.browser.version;
			}

			return bRet;
		},
		
		duration: function(sDuration) {
			var sec =  Math.floor(sDuration / 1000),
				min = Math.floor(sDuration / 1000 / 60 ),
				hour = Math.floor(sDuration / 1000 / 3600 ),
				diffM = (min - hour * 60),
				diff = (sec - min * 60),
				sResult = sDuration ? ( "Duration: " + ( min > 9 ? min : "0" + min ) + ":"
													 + ( diff > 9 ? diff : "0" + diff ) ) : "";
				
			return sResult;
		},
		
		stepDuration: function(sDuration) {
			var sec =  Math.floor(sDuration / 1000),
				sResult = "" ;	
				
			if(sec < 1) {
				sResult = sDuration ? sDuration + " ms" : "";
			} 
			else {
				sResult = sDuration ? sDuration/1000 + " sec" : "";
			}

			return sResult;
		},
		
		getScriptImage: function(relativePath, iValue) {
			var sModulePath = jQuery.sap.getModulePath("srf/img/"),
				sImagePath = sModulePath + relativePath + iValue.toLowerCase() + ".svg";
		
			return sImagePath;
		},
		
		testTypeImage: function(sType) {
			return this.getScriptImage("/scripttype/hpe-", sType);
		},
		
		more: function(sType) {
			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = sModulePath + "/more1.png";
		
			return sImagePath;
		},
		
		getMainPluginImage: function(isLoggedIn) {
			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = sModulePath + "/robot_srf.png";
			if ( isLoggedIn === false) {
				sImagePath = sModulePath + "/login_red.png";
			}
			return sImagePath;
		},
		
		getRecordImage: function() {
			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = sModulePath + "/record.png";
		
			return sImagePath;
		},
		
		getLeanFTImage: function() {
			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = sModulePath + "/scripttype/hpe-leanft.svg";
		
			return sImagePath;
		},
	
		availableEnv: function(bAvailable)  {
			return (bAvailable ? "Available" : "Not Available");
		},
		
		availableTestRuns: function(testRuns)  {
			return !!(testRuns && testRuns.length);
		},
		
		getSettingsImage: function(sImgName) {
			sImgName =  sImgName || "settings.png";
			var sModulePath = jQuery.sap.getModulePath("srf/img"),
				sImagePath = sModulePath + "/" + sImgName;
		
			return sImagePath;
		},
		
		recordingEnvironment: function( oSettingsEnv) {
			if(oSettingsEnv && oSettingsEnv.length) {
				oSettingsEnv = oSettingsEnv[0];
			}
			
			var sSettings = oSettingsEnv && oSettingsEnv.os && oSettingsEnv.browser ? ( oSettingsEnv.os.name || "") + " " + (oSettingsEnv.os.version || "") +	" / " + 
				(oSettingsEnv.browser.name || "" ) +  " " + (oSettingsEnv.browser.version || "") + " " +
				( oSettingsEnv.browser.version === oSettingsEnv.browser.order ? "" :  (oSettingsEnv.browser.order||"")) + 
				" | " +
				( oSettingsEnv.resolution || "")
				: "";
			
			if( !sSettings ) {
				var mobileDevice = oSettingsEnv && oSettingsEnv.mobileCapabilities && oSettingsEnv.mobileCapabilities[0];
				if( mobileDevice && mobileDevice.specificDevice && mobileDevice.specificDevice.mobileDevice ) {
					var device = mobileDevice.specificDevice.mobileDevice;
					sSettings = device.platformName + " " + device.platformVersion + " | " + device.nickName;
				} else if (mobileDevice && (typeof mobileDevice.platformName === "string")) {
					sSettings = mobileDevice.platformName;		
					sSettings += " " + (mobileDevice.platformVersion ? (mobileDevice.platformVersionOperator + " " + mobileDevice.platformVersion) : "") + 
								 " | " + mobileDevice.deviceName;
				} 
			}

			return sSettings;		 
		},
		
		environmentsSelectionMode: function( bRunEnvsSelectionMode) {
			return bRunEnvsSelectionMode === true ? "sap.ui.table.SelectionMode.MultiToggle" : "sap.ui.table.SelectionMode.Single";
		},
	
		isNotLoggedin: function( bLoggedIn) {
			return !bLoggedIn;
		},
	
		isUnauthorized: function( bLoggedIn) {
			return !bLoggedIn;
		},
		
		isLoginEnabled: function( oSrfUserInfo) {
			return ( oSrfUserInfo.name !== "" && oSrfUserInfo.password !== "");
		},
		
		checkInputValueState: function( sValue) {
			return $.trim(sValue) === "" ? "Error" : "None";
		}
	};
	
	return Formatter;
});