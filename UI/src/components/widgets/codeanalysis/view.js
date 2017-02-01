(function () {
    'use strict';

    angular
        .module(HygieiaConfig.module)
        .controller('CodeAnalysisViewController', CodeAnalysisViewController);

    CodeAnalysisViewController.$inject = ['$scope', 'codeAnalysisData', 'testSuiteData', '$q', '$filter', '$modal'];
    function CodeAnalysisViewController($scope, codeAnalysisData, testSuiteData, $q, $filter, $modal) {
        var ctrl = this;

        ctrl.pieOptions = {
            donut: true,
            donutWidth: 20,
            donutWidth: 20,
            startAngle: 270,
            total: 200,
            showLabel: false
        };
       /* var analysisChartOptions = {
                plugins: [
                          Chartist.plugins.gridBoundaries(),
                          Chartist.plugins.lineAboveArea(),
                          Chartist.plugins.pointHalo(),
                          Chartist.plugins.tooltip(),
                          Chartist.plugins.ctPointClick({
                              onClick: showDetail
                          }),
                          Chartist.plugins.axisLabels({
                              stretchFactor: 1.4,
                              axisX: {
                                  labels: [
                                           moment().subtract(14, 'days').format('MMM DD'),
                                           moment().subtract(7, 'days').format('MMM DD'),
                                           moment().format('MMM DD')
                                           ]
                              }
                          }),
                          Chartist.plugins.ctPointLabels({
                              textAnchor: 'middle'
                          })
                          ],
                          showArea: true,
                           showPoint: true,
                          lineSmooth: false,
                          fullWidth: true,
                          height:'165px',
                          axisY: {
                              offset: 30,
                              showGrid: true,
                              showLabel: true,
                              labelInterpolationFnc: function(value) { return Math.round(value * 100) / 100; }
                          }
        };*/
         var analysisChartOptions = {
            plugins: [
                Chartist.plugins.threshold({
                    threshold:  10
                }),
                Chartist.plugins.gridBoundaries(),
                Chartist.plugins.tooltip({
      pointClass: 'my-cool-point'
    }),
                Chartist.plugins.ctPointLabels({
                              textAnchor: 'middle'
                          }),
                Chartist.plugins.axisLabels({
                    stretchFactor: 1.4,
                    axisX: {
                        labels: [
                            moment().subtract(14, 'days').format('MMM DD'),
                            moment().subtract(7, 'days').format('MMM DD'),
                            moment().format('MMM DD')
                        ]
                    }
                })
            ],
            stackBars: true,
            centerLabels: true,
            height: '165px',
            axisY: {
                offset: 30,
                  showLabel: true,
                labelInterpolationFnc: function(value) {
                    return value === 0 ? 0 : ((Math.round(value * 100) / 100) + '');
                }
            }
        };
        ctrl.showStatusIcon = showStatusIcon;
        ctrl.showDetail = showDetail;
        /*var analysisChartOptions={
  fullWidth: true,
  chartPadding: {
    right: 40
  }
};*/
        ctrl.codeAnalysisEvents = {
            'draw': draw
        };
         function draw(data) {
           // If the draw event was triggered from drawing a point on the line chart
  if(data.type === 'point') {
    // We are creating a new path SVG element that draws a triangle around the point coordinates

    var circle = new Chartist.Svg('circle', {
        cx: [data.x],
      cy: [data.y],
      r: [5], 
      'ct:value': data.value.y,
      'ct:meta': data.meta,
    }, 'my-cool-point');

    // With data.element we get the Chartist SVG wrapper and we can replace the original point drawn by Chartist with our newly created triangle
    data.element.replace(circle);
  }
        }
        ctrl.analysisChartOptions=analysisChartOptions;
        coveragePieChart({});

        ctrl.load = function() {
            var caRequest = {
                componentId: $scope.widgetConfig.componentId,
                numberOfDays: 30
            };
            var testRequest = {
                componentId: $scope.widgetConfig.componentId,
                types: ['Functional'],
                max: 1
            };
            var saRequest = {
                componentId: $scope.widgetConfig.componentId,
                max: 1
            };
            return $q.all([
                codeAnalysisData.staticDetails(caRequest).then(processCaResponse,caRequest),
                codeAnalysisData.securityDetails(saRequest).then(processSaResponse),
                testSuiteData.details(testRequest).then(processTestResponse)
            ]);
        };

        function processCaResponse(response,params) {
            var deferred = $q.defer();
            var caData = _.isEmpty(response.result) ? {} : response.result[0];

            ctrl.versionNumber = caData.version;

            ctrl.rulesCompliance = getMetric(caData.metrics, 'violations_density');

            ctrl.technicalDebt = getMetric(caData.metrics, 'sqale_index');

		//the JSON contains the required info in ctrl.technicalDebt.formattedValue, no need to calculate	 
            //ctrl.technicalDebt.formattedValue = calculateTechnicalDebt(ctrl.technicalDebt.value);

            ctrl.linesofCode = getMetric(caData.metrics, 'ncloc');

            ctrl.issues = [
                getMetric(caData.metrics, 'blocker_violations', 'Blocker'),
                getMetric(caData.metrics, 'critical_violations', 'Critical'),
                getMetric(caData.metrics, 'major_violations', 'Major'),
                getMetric(caData.metrics, 'violations', 'Issues')
            ];

            ctrl.unitTests = [
                getMetric(caData.metrics, 'test_success_density', 'Success'),
                getMetric(caData.metrics, 'test_failures', 'Failures'),
                getMetric(caData.metrics, 'test_errors', 'Errors'),
                getMetric(caData.metrics, 'tests', 'Tests')
            ];

            ctrl.lineCoverage = getMetric(caData.metrics, 'line_coverage');

            coveragePieChart(ctrl.lineCoverage);
            processChartData(response.result,30);
            deferred.resolve(response.lastUpdated);
            return deferred.promise;
        }

        function processSaResponse(response) {
            var deferred = $q.defer();
            var saData = _.isEmpty(response.result) ? {} : response.result[0];

            //ctrl.versionNumber = saData.version;

            ctrl.securityIssues = [
                getMetric(saData.metrics, 'blocker', 'Blocker'),
                getMetric(saData.metrics, 'critical', 'Critical'),
                getMetric(saData.metrics, 'major', 'Major'),
                getMetric(saData.metrics, 'minor', 'Minor')
            ];

            deferred.resolve(response.lastUpdated);
            return deferred.promise;
        }


        function processTestResponse(response) {
            var deferred = $q.defer();

            ctrl.testResult = testResult;

            ctrl.functionalTests = [];
            var index;
            var totalSize = _.isEmpty(response.result) ? 0 : response.result.length;
            for (index = 0; index < totalSize; ++index) {

                var testResult = _.isEmpty(response.result) ? {testCapabilities: []} : response.result[index];
                var allZeros = {
                    failureCount: 0, successCount: 0, skippedCount: 0, totalCount: 0
                };
                // Aggregate the counts of all Functional test suites
                var aggregate = _.reduce(_.filter(testResult.testCapabilities, {type: "Functional"}), function (result, capability) {
                    //var ind;
                    //for (ind = 0; ind < testCap.testSuites.length; ++ind) {
                    //    var testSuite = capability.testSuites[ind];
                    //    result.failureCount += testSuite.failedTestCaseCount;
                    //    result.successCount += testSuite.successTestCaseCount;
                    //    result.skippedCount += testSuite.skippedTestCaseCount;
                    //    result.totalCount += testSuite.totalTestCaseCount;
                    //}
                    //New calculation: 3/10/16 - Topo Pal
                        result.failureCount += capability.failedTestSuiteCount;
                        result.successCount += capability.successTestSuiteCount;
                        result.skippedCount += capability.skippedTestSuiteCount;
                        result.totalCount += capability.totalTestSuiteCount;

                    return result;
                }, allZeros);
                var passed = aggregate.successCount;
                var allPassed = aggregate.successCount === aggregate.totalCount;
                var success = allPassed ? 100 : ((passed / (aggregate.totalCount)) * 100);


                ctrl.executionId = _.isEmpty(response.result) ? "-" : response.result[index].executionId;
                ctrl.functionalTests.push({
                    name: $scope.widgetConfig.options.testJobNames[index],
                    totalCount: aggregate.totalCount === 0 ? '-' : $filter('number')(aggregate.totalCount, 0),
                    successCount: aggregate.totalCount === 0 ? '-' : $filter('number')(aggregate.successCount, 0),
                    failureCount: aggregate.totalCount === 0 ? '-' : $filter('number')(aggregate.failureCount, 0),
                    skippedCount: aggregate.totalCount === 0 ? '-' : $filter('number')(aggregate.skippedCount, 0),
                    successPercent: aggregate.totalCount === 0 ? '-' : $filter('number')(success, 0) + '%',
                    details: testResult
                });
            }
            deferred.resolve(response.lastUpdated);
            return deferred.promise;
        }

        function coveragePieChart(lineCoverage) {
            lineCoverage.value = lineCoverage.value || 0;

            ctrl.unitTestCoverageData = {
                series: [ lineCoverage.value, (100 - lineCoverage.value) ]
            };
        }


        function getMetric(metrics, metricName, title) {
            title = title || metricName;
            return angular.extend((_.findWhere(metrics, { name: metricName }) || { name: title }), { name: title });
        }

        function calculateTechnicalDebt(value) {
            var factor, suffix;
            if (!value) return '-';
            if (value < 1440) {
                // hours
                factor = 60;
                suffix = 'h';
            } else if (value < 525600) {
                // days
                factor = 1440;
                suffix = 'd';
            } else {
                // years
                factor = 525600;
                suffix = 'y';
            }
            return Math.ceil(value/factor) + suffix;
        }

        function showStatusIcon(item) {
            return item.status && item.status.toLowerCase() != 'ok';
        }


        function showDetail(test) {
            $modal.open({
                controller: 'TestDetailsController',
                controllerAs: 'testDetails',
                templateUrl: 'components/widgets/codeanalysis/testdetails.html',
                size: 'lg',
                resolve: {
                    testResult: function() {
                        return test;
                    }
                }
            });
        }
        var groupedAnalysisData = [];
        function processChartData(data, numberOfDays) {
            // get total commits by day
            var analysisData = [];
            var groups = _(data).sortBy('timestamp')
            .groupBy(function(item) {
                return -1 * Math.floor(moment.duration(moment().diff(moment(item.timestamp))).asDays());
            }).value();
console.log(groups);
            for(var x=-1*numberOfDays+1; x <= 0; x++) {
                if(groups[x]) {
                    analysisData.push(groups[x].length);
                    groupedAnalysisData.push(groups[x]);
                }
                else {
                    analysisData.push(0);
                    groupedAnalysisData.push([]);
                }
            }

            
            // group get total counts and contributors
            var today = toMidnight(new Date());
            var sevenDays = toMidnight(new Date());
            var fourteenDays = toMidnight(new Date());
            sevenDays.setDate(sevenDays.getDate() - 7);
            fourteenDays.setDate(fourteenDays.getDate() - 14);

            var lastDayBlockersCount = 0;
            var lastSevenDaysBlockersCount = 0;
            var lastFourteenDaysBlockersCount = 0;
            var lastDayBlockersData = [];
            var lastSevenDaysBlockersData = [];
            var lastFourteenDaysBlockersData = [];

            var lastDayCriticalCount = 0;
            var lastSevenDaysCriticalCount = 0;
            var lastFourteenDaysCriticalCount = 0;
            var lastDayCriticalData = [];
            var lastSevenDaysCriticalData = [];
            var lastFourteenDaysCriticalData = [];

            var lastDayIssuesCount = 0;
            var lastSevenDaysIssuesCount = 0;
            var lastFourteenDaysIssuesCount=0;
            var lastDayIssuesData = [];
            var lastSevenDaysIssuesData = [];
            var lastFourteenDaysIssuesData = [];

            // loop through and add to counts
            _(data).forEach(function (analysisResult) {
                console.log('---- analysisResult');
                console.log(analysisResult);
                var blockerscnt=getMetric(analysisResult.metrics, 'Blocker').value;
               var criticalcnt= getMetric(analysisResult.metrics, 'Critical').value;               
                var issuesCnt=getMetric(analysisResult.metrics, 'Issues').value;
                
                
                if(analysisResult.timestamp >= today.getTime()) {
                    lastDayBlockersCount+=blockerscnt;
                    lastDayCriticalCount+=criticalcnt;
                    lastDayIssuesCount+=issuesCnt;
                     lastDayCriticalData.push(criticalcnt);
                     lastDayBlockersData.push(blockerscnt);
                     lastDayIssuesData.push(issuesCnt);
                    
                }

                if(analysisResult.timestamp >= sevenDays.getTime()) {
                    lastSevenDaysBlockersCount+=blockerscnt;
                    lastSevenDaysCriticalCount+=criticalcnt;
                    lastSevenDaysIssuesCount+=issuesCnt;
                     lastSevenDaysCriticalData.push(criticalcnt);
                     lastSevenDaysBlockersData.push(blockerscnt);
                     lastSevenDaysIssuesData.push(issuesCnt);
                }

                if(analysisResult.timestamp >= fourteenDays.getTime()) {
                    lastFourteenDaysBlockersCount+=blockerscnt;
                    lastFourteenDaysCriticalCount+=criticalcnt;
                    lastFourteenDaysIssuesCount+=issuesCnt;
                     lastFourteenDaysCriticalData.push(criticalcnt);
                     lastFourteenDaysBlockersData.push(blockerscnt);
                     lastFourteenDaysIssuesData.push(issuesCnt);
                }

            });
            var metadata="Blocker:" + lastFourteenDaysBlockersCount +"\n<br/>"
            + 'Critical' +lastFourteenDaysCriticalCount +"\n<br/>"
            + 'Issues' + lastFourteenDaysIssuesCount ;
            var blockersSeries=[ {meta: metadata, value: lastFourteenDaysBlockersCount}, 
            {meta: 'Blocker', value: lastSevenDaysBlockersCount},
             {meta: 'Blocker', value: lastDayBlockersCount}];
             var criticalSeries=[ {meta: metadata, value: lastFourteenDaysCriticalCount}, 
            {meta: 'Critical', value: lastSevenDaysCriticalCount},
             {meta: 'Critical', value: lastDayCriticalCount}]
            var issuesSeries=[ {meta: metadata, value: lastFourteenDaysIssuesCount}, 
                 {meta: 'Issues', value: lastSevenDaysIssuesCount},
             {meta: 'Issues', value: lastDayIssuesCount}]
            
            ctrl.lastDayBlockersData =lastDayBlockersData;
            ctrl.lastSevenDaysBlockersData =lastSevenDaysBlockersData;
            ctrl.lastFourteenDaysBlockersData =lastFourteenDaysBlockersData;

            ctrl.lastDayCriticalData =lastDayCriticalData;
            ctrl.lastSevenDaysCriticalData = lastSevenDaysCriticalData;
            ctrl.lastFourteenDaysCriticalData =lastFourteenDaysCriticalData;
            ctrl.lastDayIssuesData = lastDayIssuesData
            ctrl.lastSevenDaysIssuesData = lastSevenDaysIssuesData;
            ctrl.lastFourteenDaysIssuesData = lastFourteenDaysIssuesData;
            function toMidnight(date) {
                date.setHours(0, 0, 0, 0);
                return date;
            }
            console.log('----analysisData--');
            console.log(analysisData);
            //update charts
            if(analysisData.length)
            {
                var labels = [];
                _(analysisData).forEach(function(c) {
                    labels.push('');
                });
                 ctrl.analysisChartData = {
                         series: 
    [
      {meta: 'description', value: 1 }, 
      {meta: 'description', value: 5}, 
      {meta: 'description', value: 3}
    ],                       
                        labels: [1,2,3]
                };
                ctrl.analysisBlkcriticalChartData = { 
                        series: [blockersSeries,criticalSeries],
                        
                        labels: labels                       

                };
                ctrl.analysisBlockerChartData = {
                        series: [blockersSeries],
                        labels: labels
                };
                ctrl.analysisCriticalChartData = {
                        series: [criticalSeries],
                        labels: labels
                };
                ctrl.analysisIssuesChartData = {
                        series: [issuesSeries],
                        labels: labels
                };
                //console.log(ctrl.analysisChartData);
            }


        }
        
    }
})();
