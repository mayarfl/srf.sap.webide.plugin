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
 
sap.ui.define([],
function() {	
	"use strict";
	return { 
		BrowserOs: {
			supportedData: { 
				"os": ["windows", "linux", "android", "osx", "ios", "ubuntu", "wp", "macOS", "mac", "applications"],
				"browser" : ["chrome", "edge", "firefox", "explorer", "native", "opera", "safari"]
			},
			
			
			_selectIcon: function(type, value) {
				var lcValue = value && value.toLowerCase();
				for(var i = 0; i < this.supportedData[type].length; i++) {
					var iconName = this.supportedData[type][i];
					if(lcValue && lcValue.indexOf(iconName) >= 0){
						return iconName;
					}
				}
				return null;
			},
			
			getImageName: function(sModulePath, type, iValue, bGrey) {
				var sGreyFolder = bGrey ? "/grey/" : "/color/",
					sIcon = this._selectIcon(type, iValue),
					sImagePath = sIcon ? sModulePath + "/" + type + sGreyFolder + sIcon + ".png" : sIcon;
				
				return sImagePath;
			},
			
			setTextData: function(oControl, sControlName, iValue) {
				oControl.getAggregation(sControlName).setText(iValue);
				oControl.getAggregation(sControlName).setTooltip(iValue);
				oControl.getAggregation(sControlName).setWidth("auto");
			//	oControl.getAggregation(sControlName).setWidth((iValue.length < 4) ? "1.25rem" : "auto");
			},
			
			setImageData: function(oControl, sControlName, type, iValue, bGrey) {
				var sImagePath = this.getImageName(oControl._sModulePath, type, iValue, bGrey);
				oControl.getAggregation(sControlName).addStyleClass("srfEnv");
				oControl.getAggregation(sControlName).setSrc(sImagePath);//"sap-icon://world");
				oControl.getAggregation(sControlName).setWidth("1.3rem");
				oControl.getAggregation(sControlName).setTooltip(iValue);
			}
		}
	};
});