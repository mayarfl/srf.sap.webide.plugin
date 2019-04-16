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
 
define({

// this command id = "srf.Notification" - see plugin.json

	execute: function(oValue) {
		window.console.log("SRF", JSON.stringify( oValue) || "");
		// open right pane plugin
		var that = this;
		return this.context.service.rightpane.isVisible().then(function(bVisible) {
			if ( !bVisible) {
				return that.context.service.rightpane.setVisible(true);
			}
		});
		
	},

	isAvailable: function() {
		return true;
	},

	isEnabled: function() {
		return this.context.service.rightpane.isLoggedIn().then( function( rc) {
			return rc;
		}).catch( function(){
			return false;
		});
	}
});