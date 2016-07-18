angular.module("mainApp", ["ngSanitize"])
    .config(function ($locationProvider) {
        $locationProvider.html5Mode(true);
    })
    .directive("infoLineCompile", ["$compile", function ($compile) {
        return {
            restrict: 'A',
            link: function ($scope, element, attr) {
                $scope.appendChip = function () {
                    if (angular.element(document.querySelector("#chipContainer")).children().length == 0) {
                        var domChip = "<div class='chip'><span>{{companyInChip}}</span><i class='material-icons' ng-click='clearParameters()'>close</i></div>"
                        var compileFn = $compile(domChip);
                        var content = compileFn($scope);
                        angular.element(document.querySelector("#chipContainer")).append(content);
                    }
                }
            }
        }
    }])
    .factory("getRequest", ["$http", function($http) {
        return function (url, suffix) {
            return $http.get(url + "/" + suffix)
                .then(function(response) {
                    return {
                        response: response.data
                    }
                })
        }
    }])
    .factory("postRequest", ["$http", function ($http) {
        return function (url, postArg) {
            return $http.post(url, postArg)
                .then(function (response) {
                    return {
                        response: response.data
                    }
                })
        }
    }])
    .filter('unique', function () {

        return function (items, filterOn) {

            if (filterOn === false) {
                return items;
            }

            if ((filterOn || angular.isUndefined(filterOn)) && angular.isArray(items)) {
                var hashCheck = {}, newItems = [];

                var extractValueToCompare = function (item) {
                    if (angular.isObject(item) && angular.isString(filterOn)) {
                        return item[filterOn];
                    } else {
                        return item;
                    }
                };

                angular.forEach(items, function (item) {
                    var valueToCheck, isDuplicate = false;

                    for (var i = 0; i < newItems.length; i++) {
                        if (angular.equals(extractValueToCompare(newItems[i]), extractValueToCompare(item))) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    if (!isDuplicate) {
                        newItems.push(item);
                    }

                });
                items = newItems;
            }
            return items;
        };
    })
    .controller("mainAppCtrl", ["$scope", "$sanitize", "$sce", "$timeout", "getRequest", "postRequest",
            function ($scope, $sanitize, $sce, $timeout, getRequest, postRequest) {


        /**
         * Global variable for filters functionality.
         * mainFieldFlag gets the column name of filter which were choosed first,
         * or which remains last after other filters were canceled.
         * Other fields are booleans which means is column filter active or not.
         */
        var mainFilterFlag = {
            mainFieldFlag: null,

            CheckboxFlag: false,
            MeasureNameFlag: false,
            MeasurePriorityFlag: false,
            PeriodNameFlag: false,
            PeriodLevelFlag: false,
            PeriodValueFlag: false,
            IndexValueFlag: false,
            CurrencyFlag: false,
        };

        /**
         * Global variable which count checked checkboxes.
         */
        var checkboxCounter = 0;

        /**
        * Visibility variable for all show/hide/disable states of elements in markup
        */
        $scope.mode = {
            main: false,
            table: false,
            infoLine: false,
            noDataError: false,
            successMessage: false,
            progress: false,

            checkboxClose: false,
            measureNameClose: false,
            measurePriorityClose: false,
            periodNameClose: false,
            periodLevelClose: false,
            periodValueClose: false,
            indexValueClose: false,
            currencyClose: false,

            checkboxAllUnchecked: false,
            checkboxIndeterminate: false,
            checkboxAllChecked: false,

            disable: {
                getBtn: false,
                saveBtn: false
            }
        };


        $scope.message = {
            content: ""
        };

        $scope.jsonForSaving = {};

        /**
         * Makes table and info-line visible
         */
        function changeDisplayMode() {
            if ($scope.items.Attributes) {
                //$scope.mode.noDataError = false;
                $scope.mode.table = true;
                $scope.mode.infoLine = true;
            } else {
                //$scope.mode.table = false;
                //$scope.mode.infoLine = false;
                $scope.mode.noDataError = true;
            }

        }

        /**
         * Variable for holding company name
         */
        $scope.company = "";
        $scope.commonFilteredItems = [];


        /**
         * Calls when user clicks "GET" button or press "Enter" key of keyboard in company name input field
         * to get JSON with all company information.
         * Via angular directive info-line-compile adds chip with company name to dom, because the default
         * bahavior of close chip event is removing chip from dom.
         * Via method setCheckboxes() sets checkboxes to every table row according to the rule:
         * if MeasurePriority <> 3 && PeriodLevel <> 255 checked, else unchecked.
         * Makes angular.copy to avoid changing chip with company name changing when user enters another
         * company name in input field.
         */
        $scope.getCompany = function () {
            //$scope.filterMeasureName = null;
            //if ($scope.mode.table) {
            //    TF_RemoveFilterGrid("companiesData");
            //}
            resetParameters();
            //If getRequest doesn't work change argument to "GetData" without controller's name "Home/"
            //or remove "/Home/Index" from web browser's address bar
            getRequest("Home/GetData", $scope.company).then(function (response) {
                console.log(response.response);
                $scope.mode.progress = false;
                $scope.companyInChip = angular.copy($scope.company);
                $scope.items = response.response;
                if ($scope.items.Attributes) {
                    prepareAttributesForFiltering();
                    //$scope.checkboxForRow = [$scope.items.Attributes.length];
                    setCheckboxes();
                } else {
                    $scope.message.content = $scope.items.TaxonomyName;
                }
                changeDisplayMode();
                //$.getScript("Scripts/tablefilter.js", function () {
                    //var tableTune = {
                    //    col_0: "select",
                    //    col_1: "select",
                    //    col_2: "select",
                    //    col_3: "select",
                    //    col_4: "select",
                    //    col_5: "select",
                    //    col_6: "select",
                    //    col_7: "select"
                    //}

                    //setFilterGrid("companiesData");
                    //$(document).ready(function () {
                    //    $('select').material_select();
                    //});
                //});
            })
        };

        /**
         * Calls when user clicks "SAVE" button.
         */
        $scope.saveCompany = function () {
            if ($scope.items.Attributes) {
                $scope.mode.progress = true;
                prepareJsonForSaving();
                //If getRequest doesn't work change argument to "SaveData" without controller's name "Home/"
                //or remove "/Home/Index" from address in web browser's address bar
                postRequest("Home/SaveData", $scope.jsonForSaving).then(function (response) {
                    $scope.mode.progress = false;
                    $scope.message.content = "Saving was successful";
                    $scope.mode.successMessage = true;
                    $timeout(function () {
                        $scope.mode.successMessage = false;
                    }, 5000);
                }, function (response) {
                    $scope.mode.progress = false;
                    $scope.message.content = "There was a problem with saving. Please try again";
                })
            }
        };

        $scope.$watch("mode.main", function () {
            $scope.clearParameters();
        });

        /**
         * Clones the structure of JSON obtained after "GET" button clicked.
         * Attributes and filled only values from table rows that marked as checked.
         */
        function prepareJsonForSaving() {
            //Cloning the structure
            var keys = Object.keys($scope.items);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] == "Attributes") {
                    $scope.jsonForSaving[keys[i]] = [];
                } else {
                    $scope.jsonForSaving[keys[i]] = $scope.items[keys[i]];
                }
            }
            //Filling with data from ckecked table rows
            for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                if ($scope.attributesForFilterDropdownButton[i].Checkbox) {
                    $scope.jsonForSaving.Attributes.push($scope.items.Attributes[i]);
                }
            }
            console.log($scope.jsonForSaving);
        }

        /**
         * Adds fields "filterIndex" and "Checkbox" to JSON obtained from get request
         * for filters functionality and functionality connected with checkboxes.
         */
        function prepareAttributesForFiltering() {
            $scope.attributesForFilterDropdownButton = angular.copy($scope.items.Attributes);
            for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                $scope.attributesForFilterDropdownButton[i].Checkbox = null;
            }
        }

        /**
         * Sets checkboxes to every table row according to the rule:
         * if MeasurePriority <> 3 && PeriodLevel <> 255 checked, else unchecked.
         */
        function setCheckboxes() {
            var attributes = $scope.items.Attributes;
            for (var i = 0; i < attributes.length; i++) {
                if (attributes[i].MeasurePriority == 3 || attributes[i].PeriodLevel == 255) {
                    $scope.attributesForFilterDropdownButton[i].Checkbox = false;
                } else {
                    $scope.attributesForFilterDropdownButton[i].Checkbox = true;
                    checkboxCounter++;
                }
            }
            setCheckboxesMark();
        }

        /**
         * Transforms true/false values to "Checked/Unchecked".
         */
        $scope.getItemCheckbox = function (item) {
            switch (item) {
                case true: return "Checked";
                case false: return "Unchecked";
            }
        };


        /**
         * Functionality for button with id "dropdownBtnMarkCheckboxes"
         * which checks and unchecks all checkboxes in table.
         */
        $scope.markCheckboxes = ["All", "None"];

        $scope.markCheckboxesFunc = function (item) {
            switch (item) {
                case "All": $scope.checkAll(); break;
                case "None": $scope.uncheckAll(); break;
            }
        };

        /**
         * Toggle icons "All checked", "None checked" and "Indeterminate" inside the button.
         */
        function setCheckboxesMark() {
            if (checkboxCounter == 0) {
                $scope.mode.checkboxAllUnchecked = true;
                $scope.mode.checkboxAllChecked = false;
                $scope.mode.checkboxIndeterminate = false;
            } else if (checkboxCounter == $scope.attributesForFilterDropdownButton.length) {
                $scope.mode.checkboxAllChecked = true;
                $scope.mode.checkboxAllUnchecked = false;
                $scope.mode.checkboxIndeterminate = false;
            } else {
                $scope.mode.checkboxIndeterminate = true;
                $scope.mode.checkboxAllChecked = false;
                $scope.mode.checkboxAllUnchecked = false;
            }
        }


        $scope.changeCounter = function (item) {
            item ? checkboxCounter++ : checkboxCounter--;
            setCheckboxesMark();
        };

        $scope.checkAll = function () {
            //$scope.checkboxesBackup = angular.copy($scope.attributesForFilterDropdownButton);
            for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                if (!$scope.attributesForFilterDropdownButton[i].Checkbox &&
                        $scope.attributesForFilterDropdownButton[i].PeriodLevel != 255) {
                    $scope.attributesForFilterDropdownButton[i].Checkbox = true;
                    checkboxCounter++;
                }
            }
            //checkboxCounter = $scope.attributesForFilterDropdownButton.length;
            setCheckboxesMark();
        };

        $scope.uncheckAll = function () {
            //$scope.checkboxesBackup = angular.copy($scope.attributesForFilterDropdownButton);
            for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                $scope.attributesForFilterDropdownButton[i].Checkbox = false;
                checkboxCounter = 0;
                setCheckboxesMark();
            }
        };


        /**
         * Functionality for column filters in table.
         */
        $scope.$watch("filterCheckbox", function () {
            if ($scope.filterCheckbox || $scope.filterCheckbox == 0) {
                $scope.mode.checkboxClose = true;
            } else {
                $scope.mode.checkboxClose = false;
            }
        });

        $scope.$watch("filterMeasureName", function () {
            if ($scope.filterMeasureName || $scope.filterMeasureName == 0) {
                $scope.mode.measureNameClose = true;
            } else {
                $scope.mode.measureNameClose = false;
            }
        });

        $scope.$watch("filterMeasurePriority", function () {
            if ($scope.filterMeasurePriority || $scope.filterMeasurePriority == 0) {
                $scope.mode.measurePriorityClose = true;
            } else {
                $scope.mode.measurePriorityClose = false;
            }
        });

        $scope.$watch("filterPeriodName", function () {
            if ($scope.filterPeriodName || $scope.filterPeriodName == 0) {
                $scope.mode.periodNameClose = true;
            } else {
                $scope.mode.periodNameClose = false;
            }
        });

        $scope.$watch("filterPeriodLevel", function () {
            if ($scope.filterPeriodLevel || $scope.filterPeriodLevel == 0) {
                $scope.mode.periodLevelClose = true;
            } else {
                $scope.mode.periodLevelClose = false;
            }
        });

        $scope.$watch("filterPeriodValue", function () {
            if ($scope.filterPeriodValue || $scope.filterPeriodValue == 0) {
                $scope.mode.periodValueClose = true;
            } else {
                $scope.mode.periodValueClose = false;
            }
        });

        $scope.$watch("filterIndexValue", function () {
            if ($scope.filterIndexValue || $scope.filterIndexValue == 0) {
                $scope.mode.indexValueClose = true;
            } else {
                $scope.mode.indexValueClose = false;
            }
        });

        $scope.$watch("filterCurrency", function () {
            if ($scope.filterCurrency || $scope.filterCurrency == 0) {
                $scope.mode.currencyClose = true;
            } else {
                $scope.mode.currencyClose = false;
            }
        });

        $scope.filterCheckboxFunc = function (item) {
            $scope.filterCheckbox = item;
            mainFilterFlag.CheckboxFlag = true;

            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].Checkbox == $scope.filterCheckbox) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Checkbox = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].Checkbox == $scope.filterCheckbox) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Checkbox = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "Checkbox";
            }
        };

        $scope.filterMeasureNameFunc = function (item) {
            $scope.filterMeasureName = item;
            mainFilterFlag.MeasureNameFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].MeasureName == $scope.filterMeasureName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasureName = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].MeasureName == $scope.filterMeasureName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasureName = i;
                    }
                }
                //$("#dropdownBtnMeasureName").css("background-color", "#ffa726");
                mainFilterFlag.mainFieldFlag = "MeasureName";
            }
        };

        $scope.filterMeasurePriorityFunc = function (item) {
            $scope.filterMeasurePriority = item;
            mainFilterFlag.MeasurePriorityFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].MeasurePriority == $scope.filterMeasurePriority) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasurePriority = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].MeasurePriority == $scope.filterMeasurePriority) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasurePriority = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "MeasurePriority";
            }
        };

        $scope.filterPeriodNameFunc = function (item) {
            $scope.filterPeriodName = item;
            mainFilterFlag.PeriodNameFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].PeriodName == $scope.filterPeriodName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodName = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].PeriodName == $scope.filterPeriodName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodName = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "PeriodName";
            }
        };

        $scope.filterPeriodLevelFunc = function (item) {
            $scope.filterPeriodLevel = item;
            mainFilterFlag.PeriodLevelFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].PeriodLevel == $scope.filterPeriodLevel) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodLevel = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].PeriodLevel == $scope.filterPeriodLevel) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodLevel = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "PeriodLevel";
            }
        };

        $scope.filterPeriodValueFunc = function (item) {
            $scope.filterPeriodValue = item;
            mainFilterFlag.PeriodValueFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].PeriodValue == $scope.filterPeriodValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodValue = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].PeriodValue == $scope.filterPeriodValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodValue = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "PeriodValue";
            }
        };

        $scope.filterIndexValueFunc = function (item) {
            $scope.filterIndexValue = item;
            mainFilterFlag.IndexValueFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].IndexValue == $scope.filterIndexValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.IndexValue = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].IndexValue == $scope.filterIndexValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.IndexValue = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "IndexValue";
            }
        };

        $scope.filterCurrencyFunc = function (item) {
            $scope.filterCurrency = item;
            mainFilterFlag.CurrencyFlag = true;
            if (mainFilterFlag.mainFieldFlag) {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {

                    if ($scope.attributesForFilterDropdownButton[i].filterIndex.filter &&
                            $scope.attributesForFilterDropdownButton[i].Currency == $scope.filterCurrency) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Currency = i;
                    } else {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = false;
                    }
                }
            } else {
                for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                    if ($scope.attributesForFilterDropdownButton[i].Currency == $scope.filterCurrency) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Currency = i;
                    }
                }
                mainFilterFlag.mainFieldFlag = "Currency";
            }
        };


        $scope.selectItems = function (item) {

            if (mainFilterFlag.mainFieldFlag) {
                return item.filterIndex.filter;
            }
            else {
                return item;
            }
        };


        $scope.selectItemsFromAllColumns = function (columnParameter) {
            return function (item) {
                if (mainFilterFlag.mainFieldFlag) {
                    return item.filterIndex.filter;
                } else {
                    return true;
                }
            }
        };

        $scope.clearFilter = function (item) {
            switch (item) {
                case "Checkbox":
                    $scope.filterCheckbox = null;
                    mainFilterFlag.CheckboxFlag = false;
                    if (mainFilterFlag.MeasureNameFlag ||mainFilterFlag.MeasurePriorityFlag || mainFilterFlag.PeriodNameFlag ||
                            mainFilterFlag.PeriodLevelFlag || mainFilterFlag.PeriodValueFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("Checkbox", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.Checkbox = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "MeasureName":
                    $scope.filterMeasureName = null;
                    mainFilterFlag.MeasureNameFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasurePriorityFlag || mainFilterFlag.PeriodNameFlag ||
                            mainFilterFlag.PeriodLevelFlag || mainFilterFlag.PeriodValueFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("MeasureName", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.MeasureName = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "MeasurePriority":
                    $scope.filterMeasurePriority = null;
                    mainFilterFlag.MeasurePriorityFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.PeriodNameFlag ||
                            mainFilterFlag.PeriodLevelFlag || mainFilterFlag.PeriodValueFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("MeasurePriority", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.MeasurePriority = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "PeriodName":
                    $scope.filterPeriodName = null;
                    mainFilterFlag.PeriodNameFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.MeasurePriorityFlag ||
                            mainFilterFlag.PeriodLevelFlag || mainFilterFlag.PeriodValueFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("PeriodName", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodName = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "PeriodLevel":
                    $scope.filterPeriodLevel = null;
                    mainFilterFlag.PeriodLevelFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.MeasurePriorityFlag ||
                            mainFilterFlag.PeriodNameFlag || mainFilterFlag.PeriodValueFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("PeriodLevel", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodLevel = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "PeriodValue":
                    $scope.filterPeriodValue = null;
                    mainFilterFlag.PeriodValueFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.MeasurePriorityFlag ||
                            mainFilterFlag.PeriodNameFlag || mainFilterFlag.PeriodLevelFlag ||
                            mainFilterFlag.IndexValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("PeriodValue", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodValue = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "IndexValue":
                    $scope.filterIndexValue = null;
                    mainFilterFlag.IndexValueFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.MeasurePriorityFlag ||
                            mainFilterFlag.PeriodNameFlag || mainFilterFlag.PeriodLevelFlag ||
                            mainFilterFlag.PeriodValueFlag || mainFilterFlag.CurrencyFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("IndexValue", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.IndexValue = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;

                case "Currency":
                    $scope.filterCurrency = null;
                    mainFilterFlag.CurrencyFlag = false;
                    if (mainFilterFlag.CheckboxFlag || mainFilterFlag.MeasureNameFlag || mainFilterFlag.MeasurePriorityFlag ||
                            mainFilterFlag.PeriodNameFlag || mainFilterFlag.PeriodLevelFlag ||
                            mainFilterFlag.PeriodValueFlag || mainFilterFlag.IndexValueFlag) {
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};

                            clearfilterReset("Currency", i);

                            $scope.attributesForFilterDropdownButton[i].filterIndex.Currency = null;
                        }
                    } else {
                        mainFilterFlag.mainFieldFlag = null;
                        for (var i = 0; i < $scope.attributesForFilterDropdownButton.length; i++) {
                            $scope.attributesForFilterDropdownButton[i].filterIndex = {};
                        }
                    }
                    break;
            }
        };

        function clearfilterReset(columnParameter, i) {

            switch (columnParameter) {
                case "Checkbox": break;
                default:
                    if (mainFilterFlag.CheckboxFlag && $scope.attributesForFilterDropdownButton[i].Checkbox == $scope.filterCheckbox) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Checkbox = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "MeasureName": break;
                default:
                    if (mainFilterFlag.MeasureNameFlag && $scope.attributesForFilterDropdownButton[i].MeasureName == $scope.filterMeasureName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasureName = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "MeasurePriority": break;
                default:
                    if (mainFilterFlag.MeasurePriorityFlag && $scope.attributesForFilterDropdownButton[i].MeasurePriority == $scope.filterMeasurePriority) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.MeasurePriority = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "PeriodName": break;
                default:
                    if (mainFilterFlag.PeriodNameFlag && $scope.attributesForFilterDropdownButton[i].PeriodName == $scope.filterPeriodName) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodName = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "PeriodLevel": break;
                default:
                    if (mainFilterFlag.PeriodLevelFlag && $scope.attributesForFilterDropdownButton[i].PeriodLevel == $scope.filterPeriodLevel) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodLevel = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "PeriodValue": break;
                default:
                    if (mainFilterFlag.PeriodValueFlag && $scope.attributesForFilterDropdownButton[i].PeriodValue == $scope.filterPeriodValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.PeriodValue = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "IndexValue": break;
                default:
                    if (mainFilterFlag.IndexValueFlag && $scope.attributesForFilterDropdownButton[i].IndexValue == $scope.filterIndexValue) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.IndexValue = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

            switch (columnParameter) {
                case "Currency": break;
                default:
                    if (mainFilterFlag.CurrencyFlag && $scope.attributesForFilterDropdownButton[i].Currency == $scope.filterCurrency) {
                        $scope.attributesForFilterDropdownButton[i].filterIndex.Currency = i;
                        $scope.attributesForFilterDropdownButton[i].filterIndex.filter = true;
                    }
                    break;
            }

        }


        /**
         * Calls when user closes chip with company name and wants to enter new company name.
         * Clears all nessesary parameters.
         */
        $scope.clearParameters = function () {
            $scope.company = "";
            $scope.items = {};
            $scope.mode.table = false;
            $scope.mode.infoLine = false;
            $scope.mode.progress = false;
            $scope.mode.noDataError = false;

            $scope.filterCheckbox = null;
            $scope.filterMeasureName = null;
            $scope.filterMeasurePriority = null;
            $scope.filterPeriodName = null;
            $scope.filterPeriodLevel = null;
            $scope.filterPeriodValue = null;
            $scope.filterIndexValue = null;
            $scope.filterCurrency = null;

            $scope.message.content = "";

            checkboxCounter = 0;
        };

        /**
        * Clears all nessesary parameters.
        */
        function resetParameters() {
            $scope.mode.progress = true;
            $scope.items = {};
            $scope.mode.table = false;
            $scope.mode.infoLine = false;
            $scope.mode.noDataError = false;

            $scope.filterCheckbox = null;
            $scope.filterMeasureName = null;
            $scope.filterMeasurePriority = null;
            $scope.filterPeriodName = null;
            $scope.filterPeriodLevel = null;
            $scope.filterPeriodValue = null;
            $scope.filterIndexValue = null;
            $scope.filterCurrency = null;

            $scope.message.content = "";

            checkboxCounter = 0;
        }



        /**
         * Random generator to fill table for testing purposes
         */
        //$scope.items = {TaxonomyName: "ABG", SourceLink: "http://microsoft.com", Attributes: []};
        //for (var i = 0; i < 100; i++) {
        //    var measureName = "Revenue" + i;
        //    function getRandom(min, max) {
        //        return Math.floor(Math.random() * (max - min + 1)) + min;
        //    }
        //    function getRandom2(min, max) {
        //        var random = 0;
        //        for (var i = 0; i < 2; i++) {
        //            var random1 = getRandom(min, max);
        //            var random2 = getRandom(min, max);
        //            random = random1 + random2;
        //        }

        //        switch (random) {
        //            case 0: random = 0; break;
        //            case 1: random = 1; break;
        //            case 2: random = 255; break;
        //            default: random = 0; break;
        //        }
        //        return random;
        //    }
        //    var periodName = "periodName" + i;
        //    var currency = "currency" + i;
        //    var sourceLink = "http://sourcelink" + i;
        //    $scope.items.Attributes.push(
        //        {
        //            measureName: measureName,
        //            measurePriority: getRandom(0, 3),
        //            periodName: periodName,
        //            periodLevel: getRandom2(0, 1),
        //            periodValue: getRandom(19991001, 20160101),
        //            indexValue: getRandom(-1000000000000, 5000000000),
        //            currency: currency,
        //            sourceLink: sourceLink
        //        })
        //}
    }]);