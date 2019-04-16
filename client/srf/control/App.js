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
 
sap.ui.define(["sap/m/App", "sap/m/NavContainer"], function(App, NavContainer) {

	"use strict";

	return App.extend("srf.control.App", {
		onAfterRendering: function() {
			if (NavContainer.prototype.onAfterRendering) {
				NavContainer.prototype.onAfterRendering.apply(this, arguments);
			}
			var ref = this.getDomRef().parentNode;
			// set all parent elements to 100% height this *should* be done by the application in CSS, but people tend to forget it...
			while (ref && ref !== document.documentElement) {
				var $ref = jQuery(ref);
				if ($ref.attr("data-sap-ui-root-content")) { // Shell as parent does this already
					break;
				}
				
				//---START SRF PATCH
				if (ref.id === "srf-root") {
					break;
				}
				//---END SRF PATCH
				
				if(!ref.style.height) {
					ref.style.height = "100%";
				}
				ref = ref.parentNode;
			}
		},

		renderer: {}
	});
});