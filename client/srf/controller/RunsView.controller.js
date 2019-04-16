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
	"../controller/BaseTestDetailsController",
	"sap/ui/Device",
	"../model/models",
	"../utils/utils"
], function(BaseTestDetailsController, Device, models, Utils) {
	"use strict";


	return BaseTestDetailsController.extend("srf.controller.RunsView", {

		onInit: function() {

			this.init();		
			this.getRouter().getRoute("runs").attachPatternMatched(this._onObjectMatched, this);
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass()).addStyleClass("sapUiSizeCompact");
		},

		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function() {
			var oView = this.getView("runs"),
				sPath = oView.getBindingContext().getPath(),
				id = sPath.split("/");

			this.getRouter().navTo("details", {
				testId: id[2]
			});
		},

		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").testId;

			this._bindView("/tests/" + sObjectId);
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function(sObjectPath) {
			//window.console.log("sObjectPath : " + sObjectPath);

			this.getView("runs").bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this)
				}
			});
		},

		_onBindingChange: function() {
			this.getModel("testDetails").setProperty("/_runs/pageNumber", 1);
			this._loadRunModel();
		},
		
		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */

		onRefresh : function( ) {
			this._onBindingChange();
		},

		onRunsPageSelected: function(oEvent) {
			var targetPage = oEvent.getParameter("targetPage");
	
			this.getModel("testDetails").setProperty("/_runs/pageNumber", targetPage || 1 );

			return this._loadRunModel();
		},
		
		_loadRunModel: function() {		
			var oView = this.getView("runs"),
				that = this,
				oElementBinding = oView.getElementBinding();
				
			// No data for the binding
			if (!oElementBinding.getBoundContext() || !this.common()) {
				this.getRouter().navTo("tests", {}, true);
				return;
			}

			this.common().getSrfTenant().then( function (sTenant) {
				return that.common().addTenantToUrl( "", sTenant);
			}).then( function(sUrlTenant) {
				return that._sTenantId = sUrlTenant;
			}).catch( function() {
				return;
			});
				
			var oObject = oView.getBindingContext().getObject(),
				sTestId =  oObject ? oObject.id : "",
				oViewModel = this.getModel("testDetails"),
				oFetchParams = {
					id : sTestId,
					pageSize: oViewModel.getProperty("/_runs/pageSize") || this._PAGE_SIZE,
					pageNumber:  oViewModel.getProperty("/_runs/pageNumber") || 1 ,
					sortOrder: "desc",
					sortBy: "start"
				};
			// fix paginator pageNumber is 1-based, while SRF REST page is 0-based
			// update page number 0-based
			oFetchParams.pageNumber -= 1;

			models.loadTestRunsPage( this.getModel("srf"), oFetchParams)
			.then( function( oResponseModel) {
							//  { entities: [...], totalItemsCount: T, pageNumber: nPage, pageSize: nPageSize};
				var oTestRuns =  oResponseModel.getProperty( "/entities"),
					oRunsList = that._oRunsList;
				
				$.each(oTestRuns, function(i, run) {
					run.start = that.formatter.timestampToDateTime(run.start) + " | " + run.user.name;                       
				});
				
				// sorted by "start" and ordered desc while fetch 
				oViewModel.setProperty("/testruns", oTestRuns); 

				var pageInfo = Utils.Calc.recalcModelPaginatorData(oResponseModel);
				
				oViewModel.setProperty("/_runs/totalItemsCount", pageInfo.totalItemsCount);
				oViewModel.setProperty("/_runs/pageNumber",  pageInfo.pageNumber);
				oViewModel.setProperty("/_runs/pageSize",  pageInfo.pageSize);
				
				// recalculate the pages number due to totalItemsCount might be changed in SRF
				oViewModel.setProperty("/_runs/totalPages", pageInfo.totalPages);
				
				if(oRunsList) {
					oRunsList.getBinding("items").refresh();
				}
				// fetch extended runs details for the first listed run
				if( oTestRuns && oTestRuns.length && oTestRuns.length > 0) {
					that._loadRunData(oTestRuns[0].id, oViewModel);
				}
				
				return;
			}).catch( function() {
				return;
			});
		},	
		
		onRunSelected: function(oEvent){
			var runsPath = oEvent.getSource().getSelectedItems()[0].oBindingContexts.testDetails.getPath(),
				oViewModel = this.getModel("testDetails"),
				oRun =  oViewModel.getObject(runsPath);
		
			this._showDetail(oRun);

		},
		
		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oRun) {
			this._loadRunData(oRun.id, this.getModel("testDetails"), this);
		
		}
	});

});