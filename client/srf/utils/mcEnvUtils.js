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
 
sap.ui.define([],
function() {	
	"use strict";
	return { 

		supportedData: { 
			"os": ["windows", "linux", "android", "osx", "ios", "ubuntu"],
			"browser" : ["chrome", "edge", "firefox", "explorer", "native", "opera", "safari"]
		},
		
		_selectIcon: function(type, value) {
			var lcValue = value.toLowerCase();
			for(var i = 0; i < this.supportedData[type].length; i++) {
				var iconName = this.supportedData[type][i];
				if(lcValue.indexOf(iconName) >= 0){
					return iconName;
				}
			}
			return null;
		},
		
		envTypes: { 
			"Windows": ["WINDOWS", "WIN7", "WIN8", "WIN8.1"],
			"Mac" : ["chrome", "edge", "firefox", "explorer", "native", "opera", "safari"],
			"Linux" : [],
			"Android" : []
		},
		
		rulesCombo: [	{rule : "Any", id: 1}, 
						{rule : "Equals", id: 2},  
						{rule : "Earlier than", id: 3}, 
						{rule : "Earlier than or equal to", id: 4},   
						{rule : "Later than", id: 5},  
						{rule : "Later than or equal to", id: 6} ],
		
		
		winTypes: { 
			"WINDOWS" :  {name: "Windows", version : "", code: "WINDOWS", browsers: []} , 
			"WIN7" :  {name: "Windows",  version : "7", code: "WIN7", browsers: []} , 
			"WIN8" :  {name: "Windows",  version : "8", code: "WIN8", browsers: []} , 
			"WIN8.1" : {name: "Windows",  version : "8.1", code: "WIN8.1", browsers: []}
		},
		
		labTypes: [ {type : "MC"} ],

		osNames: { 
			"WINDOWS" : "Windows", 
			"Windows" : "Windows", 
			"windows" : "Windows"
		},

		sourceNames: { 
			"any" : "Any", 
			"aws" : "Amazon", 
			"mc" : "MC Lab"
		},
		
		sourceNamesForSave: { 
			"Any" : "any", 
			"Amazon" : "aws", 
			"MC Lab" : "mc"
		},
		
		browserNames: {
			"firefox" : "Firefox",
			"Firefox" : "Firefox",
			"internet explorer" : "Internet Explorer",
			"Internet Explorer" : "Internet Explorer",
			"chrome" : "Chrome",
			"Chrome" : "Chrome"
		},
		
		packageTemplateForSave: {
			"browsers": [],
			"mobiles": [],
			"applications":[],
			"type":"web",
			"usageType":"temp",
			"name":"",
			"uuid":""
		},
		
		favoriteTemplateForSave: {
			"browsers": [],
			"mobiles": [],
			"applications":[],
			"type":"web",
			"usageType":"favorite",
			"name":"",
			"uuid":""
		},
		
		browserTemplateForSave: {
			"platform":"", //WIN7
			"browserName":"", //Chrome
			"version":"" //latest
		},
		
		startupApps: function (app) {
		    return app.type === "ANY";
		},
		
		sortApps: function(app1, app2) {	
			var a = app1.name,
				b = app2.name;

			return a > b ? 1 : a < b ? -1 : 0;
		},
		
		getApps: function (app) {
			return app.type !== "ANY";
		},
		
		getApplicationContext: function (mobileApp) {
	        var isHasPackagedBinary = !!(mobileApp && mobileApp.instrumentedApplicationExist),
	    		isHasNotPackagedBinary = !!(mobileApp && mobileApp.applicationExist),
		        canChangeUsePackagedVersion = isHasPackagedBinary && isHasNotPackagedBinary,
	    		usePackagedVersion = isHasNotPackagedBinary ? false : isHasPackagedBinary ? true : undefined;
	        return {
	            isHasPackagedBinary: isHasPackagedBinary,
	            isHasNotPackagedBinary: isHasNotPackagedBinary,
	            canChangeUsePackagedVersion: canChangeUsePackagedVersion,
	            usePackagedVersion: usePackagedVersion
	        };
	
	    },
		
		getSelectedDevicesTypes: function (oDevices, oSpecDevices) {
			var	oDevicesTypes = [];
					
			$.each( oDevices, function(j, oSelectedDevice) {
				if(!oDevicesTypes.find( function isExists(oType) {
					return oSelectedDevice.platformName.toLowerCase() === oType;
				})) {
					oDevicesTypes.push(oSelectedDevice.platformName.toLowerCase());
				}
			});
				
			$.each(oSpecDevices, function(j, oSelectedDevice) {
				if(!oDevicesTypes.find( function isExists(oType) {
					return oSelectedDevice.platformName.toLowerCase() === oType ? true: false;
				})) {
					oDevicesTypes.push(oSelectedDevice.platformName.toLowerCase());
				}
			});
			
			return oDevicesTypes;
		},
		
		updateDevicesAvailability: function (oDevices, oSpecDevices) {
			$.each(oSpecDevices, function(i, oSpecDevice) {
				$.each( oDevices, function(j, oOSDevices) {
					var oDevice = oOSDevices.devices.specific.find( function (device) {
							var serialNumber1 = oSpecDevice.udid || oSpecDevice.uiud,
								serialNumber2 = device.udid || device.uiud;

							return (serialNumber1 && serialNumber2 && serialNumber1.toLowerCase() === serialNumber2.toLowerCase());
						});

					if(oDevice) {
						oSpecDevice.currentReservation = oDevice.currentReservation;
						oSpecDevice.connected = oDevice.connected;
					}
				});
				
			});
		},
		
		convertPackageForSave: function(oSelectedBrowsers, oSelectedDevices, oSelectedApps, oRunCOntext) {
			var oPackage = this.packageTemplateForSave;
			
			this.convertBrowsersForSave(oPackage, oSelectedBrowsers);
			this.convertDevicesForSave(oPackage, oSelectedDevices);
			this.convertAppsForSave(oPackage, oSelectedApps);
			this.convertRunContextForSave(oPackage, oRunCOntext);
			
			return oPackage;
		},
		
		convertFavoriteForSave: function(oSelectedBrowsers, oPackage, sName, oSelectedDevices) {
			var bRet = oPackage || this.favoriteTemplateForSave;
			
			bRet.name = sName;
			this.convertBrowsersForSave(bRet, oSelectedBrowsers);
			this.convertDevicesForSave(bRet, oSelectedDevices);
			
			return bRet;
		},
		
		convertBrowsersForSave: function(oPackage, oSelectedBrowsers) {
// 			var that = this;
			
// 			oPackage.browsers = [];
// 			$.each(oSelectedBrowsers, function(i, oBrowser) {
// 				var newBrowser = {	"platform":"", //WIN7
// 									"browserName":"", //Chrome
// 									"version":"" //latest 
// 								 };

// 				newBrowser.browserName = that.browserNames[oBrowser.browser.name];
// 				newBrowser.version = oBrowser.browser.version;
// 				newBrowser.platform = that.platformForSave(oBrowser.os);

// 				oPackage.browsers.push(newBrowser);
// 			});
			oPackage.environments = oSelectedBrowsers;
			oPackage.browsers = oSelectedBrowsers;
		},
			
		convertDevicesForSave: function(oPackage, oSelectedDevices) {
			oPackage.mobileCapabilities = [];
			$.each(oSelectedDevices, function(i, oDevice) {
				delete oDevice.availableDevices;
				delete oDevice.availableVersions;
				
				var newDevice = oDevice;

				if(oDevice.uiud || oDevice.udid) {
					newDevice = { 	deviceName: "",
									platformName: "",
									platformVersion: "",
									platformVersionOperator: "<",
									source: "",
									specificDevice: { mobileDevice : oDevice }
								};
				} 

				oPackage.mobileCapabilities.push(newDevice);
			});
		},
		
		convertAppsForSave: function(oPackage, oSelectedApps) {
			oPackage.applications = [];
			oPackage.mobileApps = [];
			$.each(oSelectedApps, function(i, oApp) {
				var sImage = oApp.mobileApp && oApp.mobileApp.icon;
				if( sImage && sImage.indexOf("data:image/png;base64,") < 0 ) {
					oApp.mobileApp.icon = "data:image/png;base64," + sImage;
				}			
				oPackage.applications.push(oApp);
				oPackage.mobileApps.push(oApp);
			});
		},
				
		convertRunContextForSave: function(oPackage, oRunContext) {
			oPackage.runContext = {};
			oPackage.runContext = oRunContext;
		},
		
		platformForSave : function( oOS ) {
			var bRet = null;

			switch(oOS.name) {
				case "Windows":
					bRet = "WIN";
					break;
			}
			
			return bRet + oOS.version;
		},

		devicesToUI: function( oDevicesContent ) {
			var arrDevices = [],
				that = this;

			if( oDevicesContent ) {
				for( var i=0; i < oDevicesContent.length; i++) {
					var device = oDevicesContent[i];

					device.os = {   "name" : device.platformName,
									"version": device.platformVersion };	
			
					var oOS = that.isOSExists(arrDevices, device.platformName);
					if(!oOS) {
						oOS = { name : device.platformName, code : device.platformName, devices : {specific: [], devices: []} };
						arrDevices.push(oOS);
					} 

					that.addDeviceToArray(oOS.devices, device);
//					window.console.log("Device num: " + i + ", device ID " + device.udid || device.uiud);
				}
			}

			return arrDevices;			
		},
		
		sortDevicesByNameAndVersion: function(oDevices) {
			var ret = {availableVersions: {}, availableDevices: {}};
										
			var oArrAndroid = oDevices.find( function(retDevices) {
															return (retDevices.name.toLowerCase() === "android");
														}),
				arrAndroid = oArrAndroid && oArrAndroid.length > 0 ? oArrAndroid.devices.devices : [],
				oArrIOS = oDevices.find( function(retDevices) {
															return (retDevices.name.toLowerCase() === "ios");
														}),
				arrIOS = oArrIOS && oArrIOS.length > 0 ? oArrIOS.devices.devices : [],
				retAndroid = [],
				retIOS = [],
				verAndroid = [],
				verIOS = [];	
	
			for( var i=0 ; i < arrAndroid.length; i++ ) {
				var device = arrAndroid[i];
				var d = retAndroid.find( function(retDevice) {
							return (device.deviceName === retDevice.deviceName);
						}),
					v =  verAndroid.find( function(retDevice) {
							return (device.platformVersion === retDevice.platformVersion);
						});

				if( !d ) {
					retAndroid.push(device);
				}
				if( !v ) {
					verAndroid.push(device);
				}

			}
		
			for( i=0 ; i < arrIOS.length; i++ ) {
				device = arrIOS[i];
				d = retIOS.find( function(retDevice) {
							return (device.deviceName === retDevice.deviceName);
						});
				v = verIOS.find( function(retDevice) {
							return (device.platformVersion === retDevice.platformVersion);
						});
						
				if( !d ) {
					retIOS.push(device);
				}
				if( !v ) {
					verIOS.push(device);
				}

			}
		
			var oEmptyDevice = {deviceName: "", platformVersion: ""};
			retAndroid.push(oEmptyDevice);
			verAndroid.push(oEmptyDevice);
			retIOS.push(oEmptyDevice);
			verIOS.push(oEmptyDevice);
						
			ret.availableDevices = {android: retAndroid, ios: retIOS};
			ret.availableVersions = {android: verAndroid, ios: verIOS};
			
			return ret;
		},

		contentJsonToUI: function( oContentJson ) {
			var arrOS = [],
				that = this;
			
			if(oContentJson && oContentJson.browser) {
				var browsers = oContentJson.browser;
				$.each(browsers, function(i, browser) {
					 var platforms = browser.platform.split("|");
					 $.each(platforms, function(j, platform) {
					 	if(platform !== "WINDOWS") {
							var oOS = that.isOSExists(arrOS, platform);
							if(!oOS) {
								oOS = that.winTypes[platform];
								oOS.devices = [];
								arrOS.push(oOS);
							} 

							that.addBrowserToArray(oOS.browsers, browser);
					 	}
					});							

				});
			}
			
			arrOS.labTypes = this.labTypes;
			arrOS.rules = this.rulesCombo;
			
			return arrOS;
		},
		
		addDeviceToArray: function(osDevices, device) {
			var serialNumber = device.uiud || device.udid;
			if( serialNumber ) {
				var osDevice = this.isDeviceExists(osDevices, serialNumber);	
				if( !osDevice ) {			
	 				osDevices.devices.push(device);
	 				
	 				osDevices.specific.push(device);
	 				osDevices.specific.sort( function(dev1, dev2) {	
									var a = dev2.connected,
										b = dev1.connected;

									return a > b ? 1 : a < b ? -1 : 0;
								});
	 			} 
			} else {
				osDevices.devices.push(device);
			}
		},
		
		addBrowserToArray: function(osBrowsers, browser) {
			var osBrowser = this.isBrowserExists(osBrowsers, browser.browserName),
				that = this;
				
 			if( !osBrowser ) {
 				osBrowser = { "name" : this.browserNames[browser.browserName],
							 "versions" : [] };
							 
				that.addVersionToBrowser(osBrowser.versions, browser);
 				osBrowsers.push(osBrowser);
 			} 
 			else {
 				var bFound = false;
 				$.each(osBrowser.versions, function(i, version) {
 					if(version.version === browser.version) {
						bFound = true;
						return;
					}
 				});

 				if(!bFound) {
 					that.addVersionToBrowser(osBrowser.versions, browser);
 				}
 			}
		},
		
		addVersionToBrowser: function(versionsArr, browser) {
			versionsArr.push({ version : browser.version } );
			if( browser.versionTag && browser.versionTag === "latest" ) {
 				versionsArr.push({ version : "latest" });
 			}
		},
		
		isOSExists: function( array, sValue ) {
			var ret = null;
			
			$.each(array, function(i, item) {
				if(item.code === sValue && sValue !== "WINDOWS") {
					ret = item;
					return ret;
				}
			});
			
			return ret;
		},	
		
		isBrowserExists: function( array, sValue ) {
			var ret = null;
			
			$.each(array, function(i, item) {
				if(item.name.toLowerCase() === sValue.toLowerCase()) {
					ret = item;
					return ret;
				}
			});
			
			return ret;
		},
		
		isDeviceExists: function( array, sValue ) {
			var ret = null;
			
			if(sValue) {
				array.specific.find( function(device) {
					var serialNumber = device.udid || device.uiud;
					return (serialNumber.toLowerCase() === sValue.toLowerCase());
				});
			}
			
			return ret;
		},	
		
		favoritesToUI: function( oData, oApps) {
			var that = this;
			
			if( oData && oData.length) {
				$.each(oData, function(j, mcPackage) {		
					that.packageToUI(mcPackage, oApps);
				});
			}
		},
		
		packageToUI: function(oPackage, oApps) {
			var browsers = oPackage.browsers,
				mobiles = oPackage.mobiles,	
				applications = oPackage.applications,
				devices = [],
				specificdevices = [],
				that = this;
			
			$.each(browsers, function(i, browser) {
				browser.os = { 	"name" : that.osNames[browser.os] || that.winTypes[browser.platform].name,
								"version": browser.osVersion || that.winTypes[browser.platform].version };	
				browser.browser = { "name" : browser.browserName,
									"version" : ""};		
				browser.type = "web";										
			});
			
			$.each(mobiles, function(i, mobile) {
				if(mobile.udid) {
					mobile.source = that.sourceNames.mc;
					specificdevices.push(mobile);
				} else {
					mobile.os = { 	"name" : mobile.platformName,
									"version": mobile.platformVersion };	
					mobile.source = that.sourceNames[mobile.source];
					
					devices.push(mobile);
				}
			});
			
			mobiles.specificdevices = specificdevices;
			mobiles.devices = devices;
			
			$.each(applications, function(i, application) {
				var app = that.getApplication(oApps, application.id || application.appUuid);

				if(app) {
					application.name = app.name;
					application.dateTime = app.dateTime;
					application.icon = app.icon;
					application.minimumOsVersion = app.minimumOsVersion;
					application.source = app.source;
					application.version = app.appVersion;
					application.applicationExist = app.applicationExist;
					application.instrumentedApplicationExist = app.instrumentedApplicationExist;
					application.type = app.type;
				} else {
					application.name = "";
					application.dateTime = "";
					application.icon = "";
					application.minimumOsVersion = "";
					application.source = "";
					application.version = "";
					application.applicationExist = "";
				}
			});
					
			browsers.existing = browsers.length > 0 ? true : false;
			mobiles.existing = mobiles.length > 0 ? true : false;
			mobiles.devices.existing = mobiles.devices.length > 0 ? true : false;
			mobiles.specificdevices.existing = mobiles.specificdevices.length > 0 ? true : false;
			applications.existing = applications.length > 0 ? true : false;
		},
		
		getApplication: function( arrApps, appId) {
			var retApp = null;
			
			$.each(arrApps, function(i, app) {
				if(app.id === appId) {
					retApp = app;
					return;
				}
			});
			
			return retApp;
		},
		
		isEqualOS: function(os1, os2) {
			var bRet = false;
			
			if(os1.name === os2.name && os1.version === os2.version) {
				bRet = true;
			}
			
			return bRet; 
		}
			
	};
});