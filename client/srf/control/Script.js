/*
 *     (c) Copyright 2019 Micro Focus or one of its affiliates. 
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

	return Control.extend("srf.control.Script", {

		metadata : {
			properties : {
				scripts : {type : "string", defaultValue : "0"}
			},
			aggregations : {
				_scriptsText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_scriptsIcon : {type : "sap.ui.core.Icon", multiple : false, visibility : "hidden"}
			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();
			
			this.setAggregation("_scriptsText", new Text({
				text : this.getScripts()
			}));

			this.setAggregation("_scriptsIcon", new Icon({
				src :  "sap-icon://documents",
				tooltip: "Scripts"//oResourceBundle.getText("scriptsIconTooltip")
			}));
		},

		setScripts: function (iValue) {
			this.setProperty("scripts", iValue, true);
			this.setAdditionalData("_scriptsText", iValue? iValue : "0");
		},
		
		setAdditionalData: function(sControlName, iValue) {
			this.getAggregation(sControlName).setText(iValue);
			this.getAggregation(sControlName).setTooltip(iValue + "");
		},
		
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiTinyMarginBeginEnd srfBrowsers");
			oRm.writeClasses();
			oRm.write(">");

			oControl.getAggregation("_scriptsIcon").addStyleClass("srfBrowsers");
			oRm.renderControl(oControl.getAggregation("_scriptsText"));		
			oRm.renderControl(oControl.getAggregation("_scriptsIcon"));

			oRm.write("</div>");
		}
	});
});