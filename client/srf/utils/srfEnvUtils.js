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
		srfTypes: {
			"WINDOWS": {
				name: "Windows",
				osArr: []
			},
			"Mac": {
				name: "Mac",
				osArr: []
			},
			"LINUX": {
				name: "Linux",
				osArr: []
			},
			"osx": {
				name: "Mac",
				osArr: []
			},
			"macOS": {
				name: "Mac",
				osArr: []
			}
		},
		
		convertSelectedBrowsersToEnv: function(oSelectedBrowsers) {
			var oSelectedEnv = oSelectedBrowsers;
			
			return oSelectedEnv;
		},

		convertSelectedEnvToTree: function(oSelectedEnvs) {
			var tree = {
					"osTitle": [],
					"count": 0
				},
				that = this;

			$.each(oSelectedEnvs, function(i, selEnv) {
				var index = that._findIfExists(tree, selEnv.os);

				if (index > -1) {
					that._addNodeToTree(tree, index, selEnv, i);				
				} else {
					index = that._addOSToTree(tree, selEnv.os);
					that._addNodeToTree(tree, index, selEnv, i);

					tree.osTitle.sort(function(os1, os2){								
										var a = parseFloat(os1.order),
											b = parseFloat(os2.order);
				
										return a > b ? -1 : a < b ? 1 : 0;
									});
				}
			});

			return tree;
		},

		_addOSToTree: function(oTree, oOS) {
			oOS.osTitle = [];
			oOS.description = oOS.name + " " + oOS.version;
			oOS.visible = false;
			oTree.osTitle.push(oOS);

			oTree.count++;

			return oTree.osTitle.length - 1;
		},

		_addNodeToTree: function(oTree, index, oSelectedNode, arrItemId) {
			var os = oTree.osTitle[index];

			oSelectedNode.browser.description = oSelectedNode.browser.name;
			oSelectedNode.browser.visible = true;
			oSelectedNode.browser.resolutions = oSelectedNode.os.resolutions;
			oSelectedNode.browser.resolution = oSelectedNode.resolution || oSelectedNode.os.resolutions[oSelectedNode.os.resolutions.length - 1].resolution;
			oSelectedNode.browser.arrItemId = arrItemId;
			
			os.osTitle.push(oSelectedNode.browser);

			oTree.count++;
		},

		_findIfExists: function(oTree, oOS) {
			var index = -1;

			$.each(oTree.osTitle, function(i, title) {
				if ((title.name + " " + title.version) === (oOS.name + " " + oOS.version)) {
					index = i;
					return i;
				}
			});

			return index;
		},

		convertEnvToUI: function(oEnvJson) {
			var arrEnv = {
					Windows: {
						name: "Windows",
						osArr: []
					},
					Mac: {
						name: "Mac",
						osArr: []
					},
					Linux: {
						name: "Linux",
						osArr: []
					}
				},
				that = this;
			/*
				{
				    "type": "web",
				    "os": {
				      "version": "7",
				      "name": "Windows"
				    },
				    "browsers": [
				      {
				        "version": [
				          "56",  "57",  "58",
				          "59", "60", "61", "beta", "latest"
				        ],
				        "name": "Chrome"
				      },
				      {
				        "version": [
				          "11"
				        ],
				        "name": "Internet Explorer"
				      },
				      {
				        "version": [
				          "50",  "51", "52", "53", "54", "55",  "56",
				          "beta", "latest"
				        ],
				        "name": "Firefox"
				      }
				    ],
				    "resolutions": [
				      "800x600",
				      "1024x768",
				      "1280x1024",
				      "1366x768",
				      "1600x900", 
				      "1920x1080"
				    ],
				    "defaultResolution": "1366x768"
				  },
		
					*/
			$.each(oEnvJson, function(i, env) {
				// DKOM SRF backward compatibility
				var oType = arrEnv[env.os.type || env.os.name] || that.srfTypes[env.os.name] && arrEnv[that.srfTypes[env.os.name].name] || arrEnv.Linux,
					oOS = that.isOSExists(oType.osArr, env.os);

				if (!oOS) {
					oOS = env.os;
					oOS.browsers = [];
					oOS.resolutions = [];
					oOS.defaultResolution = env.defaultResolution;
					oOS.expanded = false;
					oType.osArr.push(oOS);
				}

				that.addResolutionsToArray(oOS.resolutions, env.resolutions);
				that.addBrowsersToArray(oOS.browsers, env.browsers);
			});

			$.each(oEnvJson, function(i, env) {
	//			window.console.log(i, "env.os.type " + env.os.type + ", env.os.name " + env.os.name);
				var oType = arrEnv[env.os.type || env.os.name] || that.srfTypes[env.os.name] && arrEnv[that.srfTypes[env.os.name].name] || arrEnv.Linux;
	//			var ii = 0;
				oType.osArr.sort(function(os1, os2){								
	//								window.console.log(ii, "os1 version " + os1.version + ", os2 version " + os2.version);
	//								window.console.log(ii++, "os1 name " + os1.name + ", os2 name " + os2.name);

									var a = parseFloat(os1.version),
										b = parseFloat(os2.version);
				
									return a > b ? -1 : a < b ? 1 : 0;
								});
								
			});
			
			this.markExpandedPanel(arrEnv);
			
			return arrEnv;
		},

		convertEnvToUIOld: function(oEnvJson) {
			var arrEnv = {
					Windows: {
						name: "Windows",
						osArr: []
					},
					Mac: {
						name: "Mac",
						osArr: []
					},
					Linux: {
						name: "Linux",
						osArr: []
					}
				},
				that = this;
			/*
		
					{type: "web", os: {name: "Windows", version: "7", type: "Windows", order: "7"},…}
						browser :
							{name: "Chrome", version: "54", order: "54"}
						isAvailable :
							true
						os :
							{name: "Windows", version: "7", type: "Windows", order: "7"}
						type :
							"web"
		
					*/
			$.each(oEnvJson, function(i, env) {
				// DKOM SFR backward compatibility
				var oType = arrEnv[env.os.type || env.os.name];
				if (!oType) {
					 oType = arrEnv.Linux;
				}
				var oOS = that.isOSExists(oType.osArr, env.os);

				if (!oOS) {
					oOS = env.os;
					oOS.browsers = [];
					oOS.resolutions = [];
					oOS.expanded = false;
					oType.osArr.push(oOS);
				}

				that.addResolutionToArrayOld(oOS.resolutions, env.resolution);
				that.addBrowserToArrayOld(oOS.browsers, env.browser);
			});

			$.each(oEnvJson, function(i, env) {
//				window.console.log(i, "env.os.type " + env.os.type + ", env.os.name " + env.os.name);
				var oType = arrEnv[env.os.type || env.os.name];
//				var ii = 0;
				oType.osArr.sort(function(os1, os2){								
//									window.console.log(ii, "os1 version " + os1.version + ", os2 version " + os2.version);
//									window.console.log(ii++, "os1 name " + os1.name + ", os2 name " + os2.name);

									var a = parseFloat(os1.order),
										b = parseFloat(os2.order);
				
									return a > b ? -1 : a < b ? 1 : 0;
								});
									// var a = parseFloat(os1.version),
									// 	b = parseFloat(os2.version),
									// 	c = os1.name,
									// 	d = os2.name;
										
									// 	if(c === d) {
									// 		return a > b ? -1 : a < b ? 1 : 0;
									// 	} else {							
									// 		return c > d ? 1 : c < d ? -1 : 0;
									// 	}
						
									// });
			});
			
			this.markExpandedPanel(arrEnv);
			
			return arrEnv;
		},

		markExpandedPanel: function(arrEnv) {
			var oWinType = arrEnv.Windows;
			var oMacType = arrEnv.Mac;
			var oLinuxType = arrEnv.Linux;

			if (oWinType.osArr.length) {
				oWinType.osArr[0].expanded = true;
			}

			if (oLinuxType.osArr.length) {
				oLinuxType.osArr[0].expanded = true;
			}

			if (oMacType.osArr.length) {
				oMacType.osArr[0].expanded = true;
			}

		},
		
		addResolutionsToArray: function(osResolutions, resolutions) {
			var	that = this;
			
			$.each(resolutions, function(j, resolution) {
				that.addResolutionToArray(osResolutions, resolution);
			});
		},

		addResolutionToArray: function(osResolutions, resolution) {
			var bFound = false;
			
			$.each(osResolutions, function(i, osResolution) {
				if (osResolution.resolution === resolution) {
					bFound = true;
					return;
				}
			});

			if (!bFound) {
				osResolutions.push( {resolution : resolution} );
			}
			
		},
		
		addBrowsersToArray: function(osBrowsers, browsers) {
			var that = this;
			/**
			 "browsers": [
				      {
				        "version": [
				          "56",  "57",  "58", "59", "60", "61", "beta", "latest"
				        ],
				        "name": "Chrome"
				      },
				      {
				        "version": [
				          "11"
				        ],
				        "name": "Internet Explorer"
				      },
				      {
				        "version": [
				          "50",  "51", "52", "53", "54", "55",  "56", "beta", "latest"
				        ],
				        "name": "Firefox"
				      }
				    ],
			**/
			$.each(browsers, function(i, browser) {
				that.addBrowserToArray(osBrowsers, browser);
			});
		},

		addBrowserToArray: function(osBrowsers, browser) {
			var osBrowser = this.isBrowserExists(osBrowsers, browser.name),
				that = this;

			if (!osBrowser) {
				osBrowser = {
					"name": browser.name,
					"versions": []
				};

				that.addVersionsToBrowser(osBrowser.versions, browser);
				osBrowsers.push(osBrowser);
			} else {
				$.each(browser.version, function(j, ver) {
					var bFound = false;
					$.each(osBrowser.versions, function(i, version) {
						if (version.version === ver) {
							bFound = true;
							return;
						}
					});
	
					if (!bFound) {
						osBrowser.versions.push({
							version: ver
						});
					}
				});
				
			}
		},
		
		addBrowserToArrayOld: function(osBrowsers, browser) {
			var osBrowser = this.isBrowserExists(osBrowsers, browser.name),
				that = this;

			if (!osBrowser) {
				osBrowser = {
					"name": browser.name,
					"versions": []
				};

				that.addVersionToBrowser(osBrowser.versions, browser);
				osBrowsers.push(osBrowser);
			} else {
				var bFound = false;
				$.each(osBrowser.versions, function(i, version) {
					if (version.version === browser.version) {
						bFound = true;
						return;
					}
				});

				if (!bFound) {
					that.addVersionToBrowser(osBrowser.versions, browser);
				}
			}
		},
		
		addVersionsToBrowser: function(versionsArr, browser) {
			$.each(browser.version, function(i, version) {
				versionsArr.push({
					version: version
				});
			});
			
			if (browser.versionTag && browser.versionTag === "latest") {
				versionsArr.push({
					version: "latest"
				});
			}
		},

		addVersionToBrowser: function(versionsArr, browser) {
			versionsArr.push({
				version: browser.version
			});
			if (browser.versionTag && browser.versionTag === "latest") {
				versionsArr.push({
					version: "latest"
				});
			}
		},

		isOSExists: function(array, oValue) {
			var ret = null;

			$.each(array, function(i, os) {
				if (os.name === oValue.name && os.version === oValue.version) {
					ret = os;
					return ret;
				}
			});

			return ret;
		},

		isTypeExists: function(array, sValue) {
			var ret = array.sValue;

			return ret;
		},

		isBrowserExists: function(array, sValue) {
			var ret = null;

			$.each(array, function(i, item) {
				if (item.name.toLowerCase() === sValue.toLowerCase()) {
					ret = item;
					return ret;
				}
			});

			return ret;
		},

		isEqualEnv: function(oEnv1, oEnv2) {
			var ret = false;

			if (oEnv1 && oEnv1.browser.name.toLowerCase() === oEnv2.browser.name.toLowerCase() &&
				oEnv1.browser.version.toLowerCase() === oEnv2.browser.version.toLowerCase() &&
				oEnv1.os.name.toLowerCase() === oEnv2.os.name.toLowerCase() &&
				oEnv1.os.version.toLowerCase() === oEnv2.os.version.toLowerCase() && 
				oEnv1.resolution === oEnv2.resolution
			) {
				ret = true;
			}

			return ret;
		},
		
		generateEnvironmentId: function(oScriptRun) {
			var env = oScriptRun.environment;
			
			return [
                (env.type || ""),
                env.os && env.os.name,
                env.os && env.os.version,
                env.browser && env.browser.name,
                env.browser && env.browser.version,
                (env.device) ? env.device.model : "",
                (env.device) ? env.device.manufacturer : ""
            ].join("_");
		},

		isEqualOS: function(os1, os2) {
			var bRet = false;

			if (os1.name === os2.name && os1.version === os2.version) {
				bRet = true;
			}

			return bRet;
		},

		mergeEnvs: function(aFrom, aTo) {
			var that = this,
				bFound = false;

			$.each(aFrom, function(i, env1) {
				bFound = false;
				if (aTo) {
					$.each(aTo, function(j, env2) {
						if (that.isEqualEnv(env1, env2)) {
							bFound = true;
							return;
						}
					});

					if (!bFound) {
						aTo.push(env1);
					}
				}
			});

			return aTo;
		},

		copyEnvs: function(aFrom, aTo) {
			var that = this,
				bFound = false;

			$.each(aFrom, function(i, env1) {
				bFound = false;
				if (aTo) {					
					aTo.push(env1);						
				}
			});

			return aTo;
		},

		getFirstAvailable: function(arrayEnvJson, sPlatform) {
			var aEnvJson = [];

			if (!arrayEnvJson || !arrayEnvJson.length) {
				return aEnvJson;
			}
			if (!sPlatform) {
				sPlatform = "web";
			}
			// find the first available environment for this platform
			$.each(arrayEnvJson, function(i, envIter) {

				if (sPlatform === envIter.type && envIter.isAvailable) {

					aEnvJson[0] = envIter;
					return false;
				}
			});
			return aEnvJson;
		},

		// returns array
		// containing this env JSON element(s)
		getSpecificEnvironment: function(arrayEnvJson, oDesc) {
			var aEnvJson = [];
	
			if (!oDesc || !arrayEnvJson || !arrayEnvJson.length) {
				return aEnvJson;
			}
			return this.getEnvironments(arrayEnvJson, oDesc);
		},

		// if 2-nd parameter undefined
		// returns the latest Windows 7 Chrome available environment
		getLatestEnvironment: function(arrayEnvJson, oDesc) {
			var aEnvJson = [];

			if (!arrayEnvJson || !arrayEnvJson.length) {
				return aEnvJson;
			}
			if (!oDesc) {
				oDesc = {
					type: "web",
					isAvailable: true,
					os: {
						name: "Windows",
						type: "Windows"
					},
					browser: {
						name: "Chrome"
					}
				};
			}
			aEnvJson = this.getEnvironments(arrayEnvJson, oDesc);
			var max = -1;
			var currVer = null;

			var maxEnv = null;
			$.each(aEnvJson, function(i, envIter) {
				// use latest is tagged
				if ( envIter.browser.version && envIter.browser.version === "latest") {
					maxEnv = envIter;
					maxEnv.resolution = envIter.defaultResolution;
					return false;
				}
				currVer = parseInt(envIter.browser.version);

				if (max < currVer) {
					max = currVer;
					maxEnv = envIter;
					maxEnv.resolution = envIter.defaultResolution;
				}
			});
			aEnvJson.length = 0;
			if (maxEnv) {
				aEnvJson[0] = maxEnv;
			}
			return aEnvJson;
		},

		// returns array
		// containing this env JSON element(s)
		getEnvironments: function(arrayEnvJson, oDesc) {
			var aEnvJson = [];

			if ( !oDesc || !arrayEnvJson || !arrayEnvJson.length) {
				return aEnvJson;
			}

			// find all environments matching this desc
			$.each(arrayEnvJson, function(i, envIter) {
				if( oDesc.type === envIter.type  && oDesc.os.name === envIter.os.name ) {
					var browser = envIter.browsers.find( function isExists(browser1) {
												return oDesc.browser.name === browser1.name; }); 
				
					if (browser && oDesc.browser.version) {
						if (oDesc.browser.version === browser.version) {
							envIter.browser = { name: browser.name, version: browser.version };
							aEnvJson[0] = envIter;
							return;
						}
					} else {
						envIter.browser = { name: browser.name, version: "latest" };
						aEnvJson.push(envIter);
					}
				}
			});
			return aEnvJson;
		}

	};
});