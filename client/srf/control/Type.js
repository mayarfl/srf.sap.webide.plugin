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
		"sap/m/Text"
	],
	function(Control, Image, Text) {	

	"use strict";

	return Control.extend("srf.control.Type", {

		metadata : {
			properties : {
				type : {type : "string"}
			},
			aggregations : {
				_typeText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_typeIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"}
			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();

			var sModulePath = jQuery.sap.getModulePath("srf/img/");
	
			this._sModulePath = sModulePath;
			this._selected = true;
		
			this.setAggregation("_typeText", new Text({
				text : this.getType()
			}));

			this.setAggregation("_typeIcon", new Image({
				src :  "",
				tooltip: "type"//oResourceBundle.getText("typeIconTooltip")
			}));
			
			this.onclick = function() {
				this._selected = !this._selected;	
			};
		},

		setType: function (iValue) {
			this.setProperty("type", iValue, true);
	//		this.setTextData("_typeText", iValue);
			this.setImageData("_typeIcon", "/srftesttype/hpe-", iValue);
		},
		
		setTextData: function(sControlName, iValue) {
			this.getAggregation(sControlName).setText(iValue);
			this.getAggregation(sControlName).setTooltip(iValue);
		},
		
		setImageData: function(sControlName, type, iValue) {
			var sImagePath = this._sModulePath + type + iValue + ".svg";
			this.getAggregation(sControlName).setSrc(sImagePath);//"sap-icon://world");
			this.getAggregation(sControlName).setWidth("1rem");
			this.getAggregation(sControlName).setTooltip(iValue);
		},

		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiSmallMarginBeginEnd");
			oRm.writeClasses();
			oRm.write(">");

			oRm.renderControl(oControl.getAggregation("_typeIcon"));
	//		oRm.renderControl(oControl.getAggregation("_typeText"));		

			oRm.write("</div>");
		}
	});
});