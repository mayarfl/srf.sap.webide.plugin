/*
 *     (c) Copyright 2019, a Micro Focus company, L.P.
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
		
		Array: {
			removeElement: function(array, element) {
				var i = array.indexOf(element);
				if(i !== -1) {
					array.splice(i, 1);
				}
			},
			
			sortByDateDesc: function(array, prop) {
				array.sort(function(a, b) {
				    a = new Date(a[prop]);
				    b = new Date(b[prop]);
				    return a > b ? -1 : a < b ? 1 : 0;
				});
				
				return array;
			},
			
			sortBy: function(array, getKey) {
				array.sort(function(a, b) {
				    a = getKey(a);
				    b = getKey(b);
				    return a < b ? -1 : a > b ? 1 : 0;
				});
				
				return array;
			},
			
			reorder: function(array) {
				array.sort( function(a, b) {
		            var diff = a.order - b.order;
		            if (diff && diff !== 0) {
		                return diff;
		            }
		            if (a.yac && b.yac) {
		                return a.yac - b.yac;
		            }
		            return 0;
		        });
			
				return array;	
			},
			
			groupBy: function(array, getKey) {
		    	return array.reduce( function (sum, item) {
		                var key = getKey(item);
		
		                sum[key] = sum[key] || [];
		                sum[key].push(item);
		
		                return sum;
		            }, {}
	            );    	
			}
		},
		
		Calc: {
		
			recalcModelPaginatorData: function( oModel) {
				var iTotalItems = oModel.getProperty("/totalItemsCount") || 0;
				var iPageSize = parseInt(oModel.getProperty("/pageSize")) || 100;
				var iTotalPages = Math.ceil( iTotalItems/iPageSize);
				var iPageNumber =  parseInt(oModel.getProperty("/pageNumber")) || 0;
				iPageNumber += 1; // fix to 1-based
				return {totalItemsCount:iTotalItems, pageNumber : iPageNumber, pageSize: iPageSize, totalPages: iTotalPages};
			}
		}
			
	};
});