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
		StepRoles: {
		    suiteBegin: "suite-begin",
		    suiteEnd: "suite-end",
		    testBegin: "test-begin",
		    testEnd: "test-end",
		    iterationBegin: "iteration-begin",
		    iterationEnd: "iteration-end",
		    actionBegin: "action-begin",
		    actionEnd: "action-end",
		    actionIterationBegin: "action-iteration-begin",
		    actionIterationEnd: "action-iteration-end",
		    regular: "regular",
		    checkpoint: "checkpoint",
		    verification: "verification",
		    comment: "comment",
		    custom: "custom-step",
		    beginSuffix: "-begin",
		    endSuffix: "-end"
		},
		
		StepTitles: {
		    suite: "<describe> ",
		    test: "<it> ",
		    iteration: "Test Iteration",
		    action: "Action",
		    iterationAction: "Action iteration"
		},

		_sTenantAddition: null,
		
		fixStepSnapshot: function(oScriptSteps)	{		//Maya: fix for snapshots, move one right
			var that = this,
				oRegularSteps = oScriptSteps && oScriptSteps.filter( function(step) {
							return that._isChildStep(step.role.type);
						});
			
			if( oRegularSteps ) {
				for(var ind = 0; ind < oRegularSteps.length; ind++) {
					if(ind < oRegularSteps.length - 1 ) {
						oRegularSteps[ind].snapshot = oRegularSteps[ind+1].snapshot;		
					}
					else {
						oRegularSteps[ind].snapshot = null;
					}
				}
			}
		},
		
		convertScriptStepsToTree: function(oScriptSteps, totalDuration, oController, sTenantId) {
			var stepsTree = {"steps": []},
				that = this,
				parentNode = { "parent" : null, "steps" : stepsTree.steps },
				stepIndex = 1,
				treeStepIndex = 0;
				
			this._sTenantAddition = sTenantId;
		
			$.each(oScriptSteps, function(i, step) {
				that.__convertStepForUI(stepIndex, step, treeStepIndex, oController);
				parentNode = that._addStepToTree(step, parentNode, totalDuration); 	 

				if (step.role.type.endsWith(that.StepRoles.beginSuffix)) {
					treeStepIndex++;
            	}
            	else if( that._isChildStep(step.role.type) ) {
            		treeStepIndex++;
            		stepIndex++;

				} else if (step.role.type === that.StepRoles.comment) {
					// comment step is valid, but no need to add it to the report
				} 
			});
			
			this._deleteStepsTreeParents(stepsTree.steps, true);
			return stepsTree;
		},
		
		_deleteStepsTreeParents: function(treeSteps, bNodeIncluded) {
			var that = this;
			
			$.each(treeSteps, function(i, node) {
				if(node.steps) {
					if(bNodeIncluded) {
						delete node.parent;	
					}
					that._deleteStepsTreeParents(node.steps, bNodeIncluded);
				} else {
					delete node.parent;	
				}
			});
		},
		
		_addStepToTree: function(step, parentNode, totalDuration) {
			var currNode = null;
			
			if (step.role.type.endsWith(this.StepRoles.beginSuffix)) {
				if(parentNode.parent === null) {
					step.durationMs = totalDuration;
				}

				currNode = step;
				currNode.steps = [];
				currNode.parent = parentNode;
				
				parentNode.steps.push(currNode);
				parentNode = currNode;
            } else if (step.role.type.endsWith(this.StepRoles.endSuffix)) {
            	this._deleteStepsTreeParents(parentNode.steps, false);
					
				parentNode.status = this._getAggregateStepsStatus([parentNode.status, step.status]);
				this._getAggregateErrors(parentNode, step);
				this._getAggregateErrors(parentNode.parent, parentNode);

				parentNode = parentNode.parent;
            } else if (this._isChildStep(step.role.type)) {
            	currNode = step;
				currNode.parent = parentNode;
					
				parentNode.steps.push(currNode);

            } else if (step.role.type === this.StepRoles.comment) {
                // comment step is valid, but no need to add it to the report
            } 
			
			return parentNode;
		},
		
		_getAggregateErrors: function(parentNode, stepNode) {
			var mergedErrors = [];
			
			[].concat(parentNode.errors, stepNode.errors)
	                        .forEach((item) => {
	                                if (!!item && !mergedErrors.find(obj =>
	                                    obj.code === item.code)) {
	                                    mergedErrors.push(item);
	                                }
	                            }
	                        );	
	                        
	        parentNode.errors = mergedErrors;
	        parentNode.error = this._getErrorText(mergedErrors);
		},
		
		_getErrorText: function(errors) {
			var errorText = "";
			$.each(errors, function(i, error) {
				errorText += error.message && (error.message + "\r\n") || "";
			});
			
			return errorText;
		},
		
		_getScriptStepPrefix: function(stepRole, stepIndex) {
			var ret = "";
			
			switch(stepRole.type) {
				case this.StepRoles.suiteBegin:
					ret = this.StepTitles.suite;
					break;
				case this.StepRoles.testBegin:
					ret = this.StepTitles.test;
					break;
				case this.StepRoles.iterationBegin:
                    ret = this.StepTitles.iteration + this._getIndexTitle(stepRole);
                    break;
                case this.StepRoles.actionBegin:
                    ret = this.StepTitles.action + this._getIndexTitle(stepRole);
                    break;
                case this.StepRoles.actionIterationBegin:
                    ret = this.StepTitles.iterationAction + this._getIndexTitle(stepRole);
                    break;
                case this.StepRoles.regular:
				case this.StepRoles.checkpoint:
				case this.StepRoles.verification:
				case this.StepRoles.custom:
					ret = stepIndex + ". ";
					break;
                default:
                    if (stepRole.type.endsWith(this.StepRoles.beginSuffix)) {
                        ret = stepRole.type.slice(0, stepRole.type.length -  
                        		this.StepRoles.beginSuffix.length) + 
                        		this._getIndexTitle(stepRole);
                    }
                    break;
			}
			
			return ret;
		},
		
		_getIndexTitle: function(stepRole) {
			if (!stepRole || !stepRole.index) {
            	return "";
	        }
	        return ": " +  stepRole.index.toString();
		},
		
		_getAggregateStepsStatus: function(statusesArray) {
			
	        if ( statusesArray.every(function(status) { return status === "completed"; }) )
	            return "completed";
	            
	        if ( statusesArray.every(function(status) { return status === "new"; }) )
	            return "new";
	            
	        if ( statusesArray.every(function(status) { return status === "na"; }) )
	            return "na";
	            
	        if ( statusesArray.some(function(status) { return status === "failed"; }) )
	            return "failed";
	            
	        if ( statusesArray.some(function(status) { return status === "errored"; }) )
	            return "errored";
	            
	        if ( statusesArray.some(function(status) { return status === "cancelled"; }) )
	            return "cancelled";
	            
	        if ( statusesArray.some(function(status) { return status === "discarded"; }) )
	            return "discarded";
	            
	        if ( statusesArray.some(function(status) { return status === "warning"; }) )
	            return "warning";
	            
	        // the order is very important!
	        if ( statusesArray.some(function(status) { return status === "success"; }) )
	            return "success";
	            
	        if ( statusesArray.some(function(status) { return status === "running"; }) )
	            return "running";

	        if ( statusesArray.some(function(status) { return status === "pending"; }) )
	            return "pending";	            
	    },

		__convertStepForUI: function(stepIndex, oStep, treeStepIndex, oController) {
			var stepPrefix = this._getScriptStepPrefix(oStep.role, stepIndex ),
				that = this;
					
			oStep.statusClass = oController.formatter.scriptStatusClass(oStep.status);
			oStep.error = "";
			
			if( oStep.description ) {
				if( !oStep.description.startsWith(stepPrefix) ) {
					oStep.origDesc = oStep.description;
					oStep.description = stepPrefix + " " + oStep.description; 
				} 
			}
			else {
				oStep.description = stepPrefix;
			}

			if(	this._isChildStep(oStep.role.type) ) {
				this._createCarouselPage(oController, oStep, stepIndex, treeStepIndex);
				
				oStep.snapshotIndex = stepIndex;
				oStep.stepProperties = [];
				
				var propertyText = "",
					expected = "",
					actual = "",
					stepProperties = "";
							
				switch(oStep.role.type) {
					case that.StepRoles.regular:
					case that.StepRoles.custom:
						$.each(oStep.properties, function(key, property) {
							propertyText = ($.type(property) === "object") ? JSON.stringify(property) : "'" + property + "'";
							stepProperties = {key: key, value: propertyText};

							oStep.stepProperties.push(stepProperties);
						});
						break;
					case that.StepRoles.checkpoint:
						$.each(oStep.properties, function(key, property) {
							expected = ($.type(property) === "object") ? property.expected : "'" + property + "'";
							actual = ($.type(property) === "object") ? property.actual : "'" + property + "'";
							stepProperties = {key: key, expected: expected, actual: actual};

							oStep.stepProperties.push(stepProperties);			
						});                	
						break;
					case that.StepRoles.verification:
						$.each(oStep.verifications, function(key, property) {
	
							if( property.parameters ) {
								property.values = [];
								if( property.parameters.expected ) {	
							
									property.values.push({key: "arg0", value: property.parameters.expected});
									property.values.push({key: "arg1", value: property.parameters.actual});
								} else {
									$.each(Object.keys(property.parameters), function(i, key) {
										property.values.push({key: key, value: property.parameters[key]});
									})
								}
									
							}
							
							
							oStep.verification = property;
						});
						break;
					default:
						break;				
				}
			}
			
			oStep.error = this._getErrorText(oStep.errors);
		},
		
		_createCarouselPage: function(oController, oStep, stepIndex, treeStepIndex) {
			var	sModulePath = jQuery.sap.getModulePath("srf/img"),
				baseSnapshot = this._getStepSnapshotBase(oStep.snapshot),
				oAuxModel = oController.getModel("srf"),
				baseStorageUrl = oController._Models._urlStorage + oController._Models._getWorkspacePart(oAuxModel),
				srcThumb = this._getStepSnapshotURL(baseStorageUrl, sModulePath, baseSnapshot, true),
				srcPrev = this._getStepSnapshotURL(baseStorageUrl, sModulePath, baseSnapshot, false),
				hLayout = new sap.ui.layout.HorizontalLayout(),
				oStepProperties = "",
				vLayout = new sap.ui.layout.VerticalLayout({
											width: "auto"}),
				oLabel = new sap.m.Label(),
				oImage = new sap.m.Image( {src : srcThumb, 
											alt: oStep.snapshot,
											tooltip: oStep.snapshot,
											height:"205px",
											press: function() {
												oController.onScriptSnapSelected(srcPrev, oStep.description);
											},
											error: 	
												oController.onSnapshotLoadError
										}),

				oImage1 = new sap.m.Image( {src : srcThumb, 
											alt: oStep.snapshot,
											tooltip: oStep.snapshot,
											height:"205px",
											press: function() {
												oController.onScriptSnapSelected(srcPrev, oStep.description);
											},
											error: 	
												oController.onSnapshotLoadError
										});

			switch(oStep.role.type) {
                case this.StepRoles.regular:
                	oStepProperties = sap.ui.xmlfragment(oController.getView().sId, "srf.view.fragment.runsummary.stepTypes.StepProperties", oController);
                	break;
               	case this.StepRoles.custom:
                	oStepProperties = sap.ui.xmlfragment(oController.getView().sId, "srf.view.fragment.runsummary.stepTypes.StepCustom", oController);
                	break;
				case this.StepRoles.checkpoint:
					oStepProperties = sap.ui.xmlfragment(oController.getView().sId, "srf.view.fragment.runsummary.stepTypes.StepCheckpoint", oController);
                	break;
				case this.StepRoles.verification:
					oStepProperties = sap.ui.xmlfragment(oController.getView().sId, "srf.view.fragment.runsummary.stepTypes.StepVerification", oController);
					break;
			}
			
			vLayout.addContent(oLabel);
			vLayout.addContent(oImage);
			hLayout.addContent(vLayout);
			hLayout.addContent(oStepProperties);	

			oController._oSnapshotsWithProp.addPage(hLayout);
			oController._oSnapshots.addPage(oImage1);
			oController._oSnapPages[stepIndex] = {withProp : hLayout};
			oController._oSnapPages[stepIndex].image = oImage1;
			oController._oSnapPages[stepIndex].treeStepIndex = treeStepIndex;

			oController._oSnapPages[stepIndex].oStepProperties = oStepProperties;
		},
		
		_getStepSnapshotBase: function(snapshot) {
			if(snapshot && snapshot.indexOf("assets-stream") < 0) {
				snapshot = "/assets-stream/images/" + snapshot;
			}

			return snapshot;
		},
		
		_getStepSnapshotURL: function(srfUrl, sModulePath, snapshot, bThumb) {
			var sSize = bThumb ? "&size=thumb" : "", //"?size=prev",
				bRet = snapshot ? (srfUrl + snapshot + this._sTenantAddition + sSize) : (sModulePath + "/no_snapshot.png");

			return bRet;
		},
		
		_isChildStep: function( sStepRoleType) {
			return (sStepRoleType === this.StepRoles.regular || 
					sStepRoleType === this.StepRoles.custom ||
            		sStepRoleType === this.StepRoles.checkpoint || 
            		sStepRoleType === this.StepRoles.verification);
		}
				
	};
});