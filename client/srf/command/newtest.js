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
 
/**
 * A command for calling the 'SRF' service.
 *
 * The command is added to the File menu at 'File->New SRF Test->Record New Test' 
 * and to the menu bar at 'SRF->New SRF Test->Record New Test'
 * as defined in the plugin.json file.
 */
// how to deprecate service.srfMenu and instead implement is as a library move Menu.js to lib
// 
define(
	[
		"../utils/common"
	],
	function(oCommon) {

		return {
			execute: function() {
				this._createNewTest().done();
			},
			
			_createNewTest: function() {
				// 1. open right pane plugin
				var that = this;
				return this.context.service.rightpane.isVisible()
				.then(function(bVisible){
					return that.context.service.rightpane.setVisible(true);
				})
				.then (function () {
					// 2. create new test and open its details UI
					oCommon.trace( that.context.i18n.getText("appTraceTag"), that.context.i18n.getText("newTestMsg"), that.context, "log");
					return that.context.service.rightpane.navigateTo({target: "details", reason:"newtest"});
				});				
			},
			
			isAvailable: function() {
				return true;
			},

			isEnabled: function() {
				return oCommon.isCommandEnabled(this.context.service);
			}
		};
	});