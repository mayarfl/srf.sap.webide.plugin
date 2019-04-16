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
		"../formatter/formatter"
	],
	function(Control, Image, Text, Formatter) {	

	"use strict";

	return Control.extend("srf.control.Parameters", {

		metadata : {
			properties : {
				param : {type : "object"}
			},
			aggregations : {
				_scriptsText : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_scriptsIcon : {type : "sap.m.Image", multiple : false, visibility : "hidden"}
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
			
			this.setAggregation("_scriptsText", new Text({
				text : this.getParam()
			}));

			this.setAggregation("_scriptsIcon", new Image({
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

		setParam: function (oParam) {
			
			if(oParam) {
				this.setProperty("param", oParam, true);
				this.setTextData(this, "_scriptsText", oParam.length);
				this.setImageData(this, "_scriptsIcon", "param", oParam);
			}
		},
		
		setTextData: function(oControl, sControlName, oParam) {
			oControl.getAggregation(sControlName).setText(oParam);
			oControl.getAggregation(sControlName).setTooltip(Formatter.parametersTooltip(oParam));
		},
		
		setImageData: function(oControl, sControlName, type, oParam) {
			var sImagePath = Formatter.parametersImg1(oParam),
				sTooltip = Formatter.parametersTooltip(oParam);
		
			oControl.getAggregation(sControlName).setSrc(sImagePath);//"sap-icon://world");
			oControl.getAggregation(sControlName).setWidth("1rem");
			oControl.getAggregation(sControlName).setTooltip(sTooltip);
		},
	
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
	//		oRm.addClass("sapUiSmallMarginBeginEnd");
			oRm.writeClasses();
			oRm.write(">");

			oRm.renderControl(oControl.getAggregation("_scriptsText"));
			oRm.renderControl(oControl.getAggregation("_scriptsIcon"));
		

			oRm.write("</div>");
		}
	});
});