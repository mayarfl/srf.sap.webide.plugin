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
		'sap/ui/core/Control',
		"sap/m/Image",
		"sap/m/Text",
		"../control/common/utils"
	],
	function(Control, Image, Text, Utils) {	

	"use strict";

	return Control.extend("srf.control.OS", {

		metadata : {
			properties : {
				os : {type : "object"},
				name : {type : "string" },
				image : {type : "string" } 
			},
			aggregations : {
				_osText : {type : "sap.m.Text", multiple : false, wrapping: "false", visibility : "hidden"},
				_osIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"}
			},
			events : {
				press : {
					parameters : {
						oEvent : {type : "object"}
					}
				}
			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();

			var sModulePath = jQuery.sap.getModulePath("srf/img/");
	
			this._sModulePath = sModulePath;
			this._selected = true;
		
			this.setAggregation("_osText", new Text({
				text : this.getOs()
			}));

			this.setAggregation("_osIcon", new Image({
				src :  "",
				tooltip: "os"//oResourceBundle.getText("osIconTooltip")
			}));
			
			this.onclick = function(oEvent) {
				oEvent.bubble = false ;
				
				this.fireEvent("press", {
					value: this
				});
				//oEvent.stopPropagation();
			};
		},

		setOs: function (iValue) {
			if(iValue) {
			this.setProperty("os", iValue, true);
			Utils.BrowserOs.setTextData(this, "_osText", iValue.name + " " + iValue.version);
			Utils.BrowserOs.setImageData(this, "_osIcon", "os", iValue.name);
			}
		},
					
		setName: function( sName ) {
			if(sName) {
				this.setProperty("name", sName, true);
				Utils.BrowserOs.setTextData(this, "_osText", sName);//getAggregation("_browserText").setText(iValue.version);
				Utils.BrowserOs.setImageData(this, "_osIcon", "os", sName);
			}
		},

		setImage: function( sName ) {
			if(sName) {
				this.setProperty("image", sName, true);
				Utils.BrowserOs.setTextData(this, "_osText", "");//getAggregation("_browserText").setText(iValue.version);
				Utils.BrowserOs.setImageData(this, "_osIcon", "os", sName);
			}
		},
		
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("srfBrowsers environment");
			oRm.writeClasses();
			oRm.write(">");

			oRm.renderControl(oControl.getAggregation("_osIcon"));
			if( oControl.getProperty("name") || oControl.getProperty("os")) {
				oRm.renderControl(oControl.getAggregation("_osText"));		
			}

			oRm.write("</div>");
		}
	});
});