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
		"sap/ui/core/Control",
		"sap/m/Image",
		"sap/m/Text",
		"../control/common/utils"
	],
	function(Control, Image, Text, Utils) {	

	"use strict";

	return Control.extend("srf.control.Browser", {

		metadata : {
			properties : {
				browser : {type : "object"},
				name : {type : "string" },
				type : {type : "string" }
			},
			aggregations : {
				_browserText : {type : "sap.m.Text", multiple : false, wrapping: "false", visibility : "hidden"},
				_browserIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"}
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
			var sModulePath = jQuery.sap.getModulePath("srf/img/");
	
			this._sModulePath = sModulePath;
			this._selected = true;
	
			this.setAggregation("_browserText", new Text({
				text : ""
			}));

			this.setAggregation("_browserIcon", new Image({
				src :  "",
				tooltip:  "Environments"//oResourceBundle.getText("browserIconTooltip")
			}));
			
			this.onclick = function(oEvent) {
				oEvent.bubble = false ;
				
				this.fireEvent("press", {
					value: this
				});
			//	oEvent.stopPropagation();
			};
		},
		
		setBrowser: function (iValue) {
			if(iValue) {
				this.setProperty("browser", iValue, true);
				Utils.BrowserOs.setTextData(this, "_browserText", iValue.name + " " + iValue.version);//getAggregation("_browserText").setText(iValue.version);
				Utils.BrowserOs.setImageData(this, "_browserIcon", "browser", iValue.name);
			}
		},
		
		setName: function( sName ) {
			if(sName) {
				this.setProperty("name", sName, true);
				Utils.BrowserOs.setTextData(this, "_browserText", sName);//getAggregation("_browserText").setText(iValue.version);
				Utils.BrowserOs.setImageData(this, "_browserIcon", "browser", sName);
			}
		},
		
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiTinyMarginBeginEndTopBotom srfBrowsers environment");
			oRm.writeClasses();
			oRm.write(">");

			oRm.renderControl(oControl.getAggregation("_browserIcon"));
			oRm.renderControl(oControl.getAggregation("_browserText"));
			oRm.write("</div>");
		}
	});
});