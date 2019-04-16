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
	["../utils/common"],
	function(oCommon) {

		"use strict";
		return {

			get urlAssetsManager() {
				return oCommon.assetsDestination; //"/destinations/SRF_NGINX/rest/storage" 	
			},

			get urlTestsManager() {
				return oCommon.getTestManagerDestination(); // "/destinations/SRF_NGINX/rest/test-manager"	
			},

			// set member for script ID & pass it with c-tor ( version parameter or additional)

			load: function(oDocument) {
				return Q.spread([this.readFileContent(oDocument), this.readFileMetadata(oDocument)], function(mContent, oMetadata) {
					//window.console.warn("HPEFileDAO.load");
					return {
						mContent: mContent,
						sETag: oMetadata.sETag
					};
				});
			},

			//  fetch from SRF by specific asset ID
			readFileContent: function(oDocument) {
				var oSrfExtInfo = oDocument.getExtInfo().srfScriptFileExtInfo;
				// there is no such file on server	
				if (oSrfExtInfo.newFileScript) {
					return Q("");
				}
				var that = this;
				// assets-stream/{physicalFileName} – download specific files
				var sUrl = this.urlAssetsManager + oCommon.srfWorkspace + "/assets-stream/" + oSrfExtInfo.physicalFileName;
				return oCommon.getSrfTenant().then( function (sTenant) {
					return oCommon.addTenantToUrl( sUrl, sTenant);
				}).then( function(sUrlTenant) {
					return Q.sap.ajax(sUrlTenant, {
						type: "GET",
						responseType: "script", // responce is a stream 
						xhrFields: {
							withCredentials: false
						}
					}).then(function(aResponse) {
						if (aResponse && aResponse.length > 0) {
							return that._jsonEscape(aResponse[0]);
						}
					});
				});

			},

			// replace \r-> \\n
			_jsonEscape: function(str) {
				return str.replace(/\r/g, "\n");
			},

			objectExists: function(oParentFolderDocument, sRelativePath) {
				return true;
			},

			/* save into SRF server 
			To upload
			PUT 
			Body is a (file) stream.
			http://52.34.123.180:4571/v2/assets-stream/{physicalFileName} – download specific files
			*
			http://127.0.0.1:4571/v2/assets-stream/9bdd85be-7548-49b5-b161-75ef271acf5f
			*/
			save: function(oDocument) {
				var that = this;
				var extInfo = oDocument.getExtInfo();
				return this._save(oDocument, extInfo)
					.then(function(oScript) {
						if (oScript) {
							extInfo.srfScriptFileExtInfo.oScript = oScript;
							extInfo.srfScriptFileExtInfo.physicalFileName = oScript.physicalFileName;
						}
						oDocument.setExtInfo(extInfo);
						return;
					}).catch(function(err) {
						oCommon.trace(that.context.i18n.getText("appTraceTag"),
							that.context.i18n.getText("saveScriptFailedNotification", [extInfo.originalFileName || extInfo.name || extInfo.physicalFileName,
								err.responseText || err.statusText
							]), that.context,
							"failure");

						// retry to save the new script file 
						// as if it was deleted in SRF while opened in the Web IDE editor
						if ( extInfo.physicalFileName !== "") {
							extInfo.physicalFileName = extInfo.srfScriptFileExtInfo.physicalFileName = "";
							extInfo.srfScriptFileExtInfo.newFileScript = true;
							extInfo.srfScriptFileExtInfo.oScript = null;
							oDocument.setExtInfo(extInfo);
							return that._save(oDocument, oDocument.getExtInfo())
								.then(function(oScript) {
									if (oScript) {
										extInfo.srfScriptFileExtInfo.oScript = oScript;
										extInfo.srfScriptFileExtInfo.physicalFileName = oScript.physicalFileName;
									}
									oDocument.setExtInfo(extInfo);
									return;
								});
						} else {
							return null;
						}
					}).catch(function(err) {
						oCommon.trace(that.context.i18n.getText("appTraceTag"),
							that.context.i18n.getText("saveScriptFailedNotification", [extInfo.originalFileName || extInfo.name || extInfo.physicalFileName,
								err.responseText || err.statusText
							]), that.context,
							"failure");

					});
			},

			_save: function(oDocument, extInfo) {
				var that = this;
				//http://52.34.123.180:4571/assets-stream/{physicalFileName} – download specific files
				var sUrl = this.urlAssetsManager + oCommon.srfWorkspace + "/v2/assets-stream/",
					sScriptId = extInfo.srfScriptFileExtInfo.physicalFileName;
				
				return oDocument.getContent().then(function(script) {
					sUrl += sScriptId || "";

					return oCommon.getSrfTenant().then( function (sTenant) {
						return oCommon.addTenantToUrl( sUrl, sTenant);
					})
					.then( function(sUrlTenant) {

						var formData = new FormData(),
							blob = new Blob([script], {
								type: "text/xml"
							});
						formData.append("scriptStream", blob);

						var extInfo1 = extInfo.srfScriptFileExtInfo;
						var oScriptData = JSON.stringify({
							description: extInfo1.description,
							editable: extInfo1.editable,
							name: extInfo1.name,
							originalFileName: extInfo1.originalFileName,
							runner: extInfo1.runner,
							sdk: extInfo1.sdk,
							type: extInfo1.type
						});
						formData.append("scriptData", oScriptData);
						
						var opts = {
							url: sUrlTenant,
							data: formData,
							cache: false,
							contentType: false,
							processData: false,
							type: "PUT"
						};
						// save text into assets by physical file name/ create the new one if no physical file name
						// PUT /v2/assets-stream/866ea6d5-52a7-41da-867d-5cfc40363181
						return Q.sap.ajax(opts)
						.then(function(aResponse) {
							if (aResponse && aResponse.length > 0 && aResponse[2] === "success") {
								return aResponse[0];
							} else return null;
						}).catch(function(err) {
							oCommon.trace(that.context.i18n.getText("appTraceTag"), that.context.i18n.getText("saveScriptFailedNotification", [extInfo.originalFileName ||
									extInfo.name || extInfo.physicalFileName, err.responseText || err.statusText
								]), that.context,
								"failure");

							oCommon.liteNotification(that.context.i18n.getText("appTraceTag"), that.context.i18n.getText("saveScriptFailedNotification", [
									extInfo.originalFileName || extInfo.name || extInfo.physicalFileName, (err.responseJSON && err.responseJSON.message) || err.statusText
								]), that.context,
								"failure");
						});
					});
				});
			},

			readFileMetadata: function(oDocument) {
				// override readonly
				return {
					sETag: oDocument.getETag(false),
					readOnly: false // set for editing
				};
			},

			// update asset with all description data 
			// PUT application/json /rest/test-manager/assets/{script id}
			// payload { description:"",editable:true,name:"LEANFT",originalFileName:"LEANFT.js",runner:"mocha",sdk:"leanft",type:"web"}
			// response: asset json
			// returns null if existing script editing ( test ID is null then) 
			_saveScriptDescription: function(oDocExtInfo) {
				var extInfo = oDocExtInfo.srfScriptFileExtInfo;
				var that = this;
				if (extInfo && extInfo.testId !== null && extInfo.physicalFileName !== "") {
					var sUrl = this.urlTestsManager + oCommon.getWorkspace() + "/assets/" + extInfo.physicalFileName;
					var oScriptData = JSON.stringify({
						description: extInfo.description,
						editable: extInfo.editable,
						name: extInfo.name,
						originalFileName: extInfo.originalFileName,
						runner: extInfo.runner,
						sdk: extInfo.sdk,
						type: extInfo.type
					});

					return oCommon.getSrfTenant().then( function (sTenant) {
						return oCommon.addTenantToUrl( sUrl, sTenant);
					}).then( function(sUrlTenant) {
						var opts = {
							url: sUrlTenant,
							responseType: "application/json",
							cache: false,
							dataType: "json",
							contentType: "application/json",
							data: oScriptData,
							processData: false,
							type: "PUT"
						};
						return Q.sap.ajax(opts).then(function(aResponse) {
								if (aResponse && aResponse.length > 0 && aResponse[2] === "success") {
									return aResponse[0];
								}
							}).catch(function(err) {
								oCommon.trace(that.context.i18n.getText("appTraceTag"), that.context.i18n.getText("saveScriptFailedNotification", [extInfo.originalFileName ||
										extInfo.name || extInfo.physicalFileName, err.responseText || err.statusText
									]), that.context,
									"failure");

								oCommon.liteNotification(that.context.i18n.getText("appTraceTag"), that.context.i18n.getText("saveScriptFailedNotification", [
										extInfo.originalFileName || extInfo.name || extInfo.physicalFileName, (err.responseJSON && err.responseJSON.message) || err.statusText
									]), that.context,
									"failure");
							});
					});
				}
			}
		};
	});