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

	return Control.extend("srf.control.EnvironmentDetails", {
	
		
		metadata : {
			properties : {
				os : {type : "object"},
				browser : {type : "object"},
				grey : {type : "boolean"}
			},
			aggregations : {
				_osText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_osIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"},
				_browserText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_browserIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"}
			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();

			var sModulePath = jQuery.sap.getModulePath("srf/img/");
	
			this._sModulePath = sModulePath;
			this._selected = true;
		//	this.grey = false;
		
			this.setAggregation("_osText", new Text({
				text : this.getOs()
			}));

			this.setAggregation("_osIcon", new Image({
				src :  "",
				tooltip: "os"//oResourceBundle.getText("osIconTooltip")
			}));
			
			this.setAggregation("_browserText", new Text({
				text : this.getBrowser()
			}));

			this.setAggregation("_browserIcon", new Image({
				src :  "",
				tooltip:  "Environments"//oResourceBundle.getText("browserIconTooltip")
			}));
			
			this.onclick = function() {
				this._selected = !this._selected;	
			};
		},
		
		setOs: function (iValue) {
			this.setProperty("os", iValue, true);
			Utils.BrowserOs.setTextData(this, "_osText", iValue && iValue.version || "");
			Utils.BrowserOs.setImageData(this, "_osIcon", "os", iValue && iValue.name || "", this.getProperty("grey"));
		},
		
		setBrowser: function (iValue) {
			this.setProperty("browser", iValue, true);
			Utils.BrowserOs.setTextData(this, "_browserText", iValue && iValue.version || "");//getAggregation("_browserText").setText(iValue.version);
			Utils.BrowserOs.setImageData(this, "_browserIcon", "browser", iValue && iValue.name || "", this.getProperty("grey"));
		},
		
		setGrey: function(bValue) {
			this.setProperty("grey", bValue, true);
		},
	
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
		//	oRm.addClass("sapUiSmallMarginBeginEnd");
			oRm.writeClasses();
			oRm.write(">");

			if( oControl.getAggregation("_osText").getText() !== "" ) {
				oRm.renderControl(oControl.getAggregation("_osIcon"));
				oRm.renderControl(oControl.getAggregation("_osText"));	

				var b = oControl.getProperty("browser");
				if(b.name) {	
					oRm.renderControl(oControl.getAggregation("_browserIcon"));
					oRm.renderControl(oControl.getAggregation("_browserText"));
				}
			}
			oRm.write("</div>");
		}
	});
});