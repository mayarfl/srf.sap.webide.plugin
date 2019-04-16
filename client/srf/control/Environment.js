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
		"sap/ui/core/Icon",
		"sap/m/Text"
	],
	function(Control, Icon, Text) {	

	"use strict";

	return Control.extend("srf.control.Environment", {

		metadata : {
			properties : {
				envs : {type : "string", defaultValue : "0"}
			},
			aggregations : {
				_envsText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_envsIcon : {type : "sap.ui.core.Icon", multiple : false, visibility : "hidden"}
			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();
			
			this.setAggregation("_envsText", new Text({
				text : this.getEnvs(),
				tooltip: this.getEnvs()
			}));

			this.setAggregation("_envsIcon", new Icon({
				src :  "sap-icon://sys-monitor",
				tooltip:  "Environments"//oResourceBundle.getText("envsIconTooltip")
			}));
		},
		
		setEnvs: function (iValue) {
			if(iValue === "" ) {
				iValue = 0;
			}
			this.setProperty("envs", iValue, true);
			this.getAggregation("_envsText").setText(iValue);
			this.getAggregation("_envsText").setTooltip(iValue + "");
		},
		
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiTinyMarginBeginEnd srfBrowsers");
			
			oRm.writeClasses();
			oRm.write(">");

			oControl.getAggregation("_envsIcon").addStyleClass("srfBrowsers");
			oRm.renderControl(oControl.getAggregation("_envsText"));
			oRm.renderControl(oControl.getAggregation("_envsIcon"));

			oRm.write("</div>");
		}
	});
});