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

	return Control.extend("srf.control.Browsers", {
	
		
		metadata : {
			properties : {
				os : {type : "object"},
				browsers : {type : "object"}
			},
			aggregations : {
				_Icon1 : {type : "sap.m.Image", multiple : false, visibility : "hidden"},
				_Text1 : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_Icon2 : {type : "sap.m.Image", multiple : false, visibility : "hidden"},
				_Text2 : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_Icon3 : {type : "sap.m.Image", multiple : false, visibility : "hidden"},
				_Text3 : {type : "sap.m.Text", multiple : false, visibility : "hidden"},
				_Icon4 : {type : "sap.m.Image", multiple : false, visibility : "hidden"}

			}
		},

		init : function() {
//			var oResourceBundle =  this.getModel("i18n").getResourceBundle();

			var sModulePath = jQuery.sap.getModulePath("srf/img/"),
				that=this;
	
			this._sModulePath = sModulePath;
			this._selected = true;
		
			this.setAggregation("_Text1", new Text({
				text : " "
			}));
			
			this.setAggregation("_Text2", new Text({
				text : " "
			}));
			
			this.setAggregation("_Text3", new Text({
				text : " "
			}));

			this.setAggregation("_Icon1", new Image({
				src :  "",
				tooltip: "os",
				events : {
					press : {
						parameters : {
							oEvent : {type : "object"}
						}
					}
				}
			}));
			
			this.setAggregation("_Icon2", new Image({
				src :  "",
				tooltip: "os",
				events : {
					press : {
						parameters : {
							oEvent : {type : "object"}
						}
					}
				}
			}));
				
			this.setAggregation("_Icon3", new Image({
				src :  "",
				tooltip: "os",
				press: that.onclick,
				data: {},
				events : {
					press : {
						parameters : {
							oEvent : {type : "object"}
						}
					}
				}
			}));
				
			this.setAggregation("_Icon4", new Image({
				src :  "",
				tooltip: "os",
				events : {
					press : {
						parameters : {
							oEvent : {type : "object"}
						}
					}
				}
			}));
			
		},

		onclick: function(oEvent) {
			oEvent.bubble = false ;
			this.fireEvent("press", {
				value: this
			});
		},
		
		setOs: function (iValue) {
			this.setProperty("os", iValue, true);
			Utils.BrowserOs.setTextData(this, "_osText", iValue && iValue.version || "");
			Utils.BrowserOs.setImageData(this, "_osIcon", "os", iValue && iValue.name || "");
		},
		
		setBrowsers: function (oBrowsers) {
			var that = this;
			this.setProperty("browsers", oBrowsers, true);
			
			if(oBrowsers && oBrowsers.length) {
				$.each(oBrowsers, function(i, oBrowser) {
					Utils.BrowserOs.setImageData(that, "_Icon" + (i+1), "browser", oBrowser.name);
					var image = that.getAggregation("_Icon" + (i+1));
					image.data = oBrowser;
				});
			}
		},
		
	

		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
	//		oRm.addClass("sapUiSmallMarginBeginEnd");
			oRm.writeClasses();
			oRm.write(">");

	//		if( oControl.getAggregation("_osText").getText() !== "" ) {
				oRm.renderControl(oControl.getAggregation("_Icon1"));
				oRm.renderControl(oControl.getAggregation("_Text1"));		
				oRm.renderControl(oControl.getAggregation("_Icon2"));
				oRm.renderControl(oControl.getAggregation("_Text2"));
				oRm.renderControl(oControl.getAggregation("_Icon3"));
				oRm.renderControl(oControl.getAggregation("_Text3"));		
				oRm.renderControl(oControl.getAggregation("_Icon4"));
	//		}
			oRm.write("</div>");
		}
	});
});