/*global angular,$,kzi,_ */
/*jshint unused:false */
(function () {
    'use strict';
    angular.module('wt.pbox', [])
        .provider("$wtPosition", [function () {
            this.$get = ['$document', function ($document) {
                return {
                    calculatePos: function (options, $element, $boxElement) {
                        var elementTop = $element.offset().top,
                            elementLeft = $element.offset().left,
                            docOuterWidth = $document.outerWidth(),
                            docOuterHeight = $document.outerHeight(),
                            elementOuterWidth = $element.outerWidth(),
                            elementOuterHeight = $element.outerHeight(),
                            boxWidth = $boxElement.outerWidth(true),
                            boxHeight = $boxElement.outerHeight(true),
                            top, left, right, bottom;
                        switch (options.placement) {
                            case "bottom":
                                top = elementTop + elementOuterHeight + options.offset;
                                if (options.align === "left") {
                                    left = elementLeft;
                                } else if (options.align === "right") {
                                    left = elementLeft + elementOuterWidth - boxWidth;
                                }
                                else {
                                    left = elementLeft - boxWidth / 2 + elementOuterWidth / 2;
                                }

                                if (left < 0) {
                                    left = options.offset;
                                }
                                if (left + boxWidth > docOuterWidth) {
                                    left = docOuterWidth - boxWidth - options.offset;
                                }
                                if (top + boxHeight > docOuterHeight) {
                                    top = elementTop - boxHeight - options.offset;
                                }
                                break;
                            case "top":
                                top = elementTop - boxHeight - options.offset;
                                left = elementLeft;
                                if (options.align === "left") {
                                    left = elementLeft;
                                } else if (options.align === "right") {
                                    left = elementLeft + elementOuterWidth - boxWidth;
                                }
                                else {
                                    left = elementLeft - boxWidth / 2 + elementOuterWidth / 2;
                                }

                                if (left < 0) {
                                    left = options.offset;
                                }
                                if (left + boxWidth > docOuterWidth) {
                                    left = docOuterWidth - boxWidth - options.offset;
                                }
                                if (top < boxHeight) {
                                    top = elementTop + elementOuterHeight + options.offset;
                                }
                                break;
                            case "left":
                                right = ~~(docOuterWidth - elementLeft + options.offset);
                                if (right + boxWidth + options.offset > docOuterWidth) {
                                    right = 0;
                                    left = ~~(elementLeft + elementOuterWidth + options.offset);
                                }
                                if (options.align === "top") {
                                    top = elementTop;
                                } else if (options.align === "bottom") {
                                    top = elementTop + elementOuterHeight - boxHeight;
                                }
                                else {
                                    top = ~~(elementTop - boxHeight / 2 + elementOuterHeight / 2);
                                }

                                if (top < 0) {
                                    top = options.offset;
                                } else if (top + boxHeight > docOuterHeight) {
                                    top = docOuterHeight - boxHeight - options.offset;
                                }
                                break;
                            case "right":
                                left = elementLeft + elementOuterWidth + options.offset;
                                if(left + boxWidth + options.offset > docOuterWidth){
                                    left = 0;
                                    right = docOuterWidth - elementLeft + options.offset;
                                }
                                if (options.align === "top") {
                                    top = elementTop;
                                } else if (options.align === "bottom") {
                                    top = elementTop + elementOuterHeight - boxHeight;
                                }
                                else {
                                    top = elementTop - boxHeight / 2 + elementOuterHeight / 2;
                                }

                                if (top < 0) {
                                    top = options.offset;
                                } else if (top + boxHeight > docOuterHeight) {
                                    top = docOuterHeight - boxHeight - options.offset;
                                }
                                break;
                            default:
                                break;
                        }

                        if (top) {
                            $boxElement.css("top", top);
                        }
                        if (bottom) {
                            $boxElement.css("bottom", bottom);
                        }
                        if (left) {
                            $boxElement.css("left", left);
                        }
                        if (right) {
                            $boxElement.css("right", right);
                        }

                        if (options.animation === true) {
                            $boxElement.slideToggle("normal");
                        } else {
                            $boxElement.addClass(options.openClass);
                            $boxElement.removeClass(options.closeClass);
                        }
                        $element.addClass(options.openClass);
                    }
                }
            }];
        }])
        .provider("$pbox", [function () {
            // The default options for all popboxs.
            var defaultOptions = {
                placement : 'bottom',
                align     : null,
                animation : false,
                popupDelay: 0,
                arrow     : false,
                openClass : 'pbox-open',
                closeClass: 'pbox-close',
                autoClose : true,
                offset    : 1,
                resolve   : {}
            };

            var globalOptions = {
                triggerClass   : "pbox-trigger",
                boxInstanceName: "boxInstance"
            };

            this.options = function (value) {
                globalOptions = value;
            };

            var util = {
                hasClass  : function (element, className) {
                    return element.hasClass(className) || element.parents("." + className).length > 0;
                },
                hasClasses: function (element, classes) {
                    var result = false;
                    classes.forEach(function (className) {
                        if (result) {
                            return;
                        }
                        result = util.hasClass(element, className);
                    });
                    return result;
                },
                getTarget : function (event) {
                    var $target = angular.element(event.target);
                    if (!$target) {
                        throw new Error("The event")
                    }
                    if ($target.hasClass(globalOptions.triggerClass)) {
                        return $target
                    }
                    var $trigger = $target.parents("." + globalOptions.triggerClass);
                    if ($trigger.length > 0) {
                        $target = $trigger;
                    } else {
                        $target.addClass(globalOptions.triggerClass);
                    }
                    return $target;
                }
            };

            this.$get = [
                "$http",
                "$document",
                "$compile",
                "$rootScope",
                "$controller",
                "$templateCache",
                "$q",
                "$injector",
                "$timeout",
                "$wtPosition",
                function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $injector, $timeout, $wtPosition) {

                    var $pbox = {}, $body = $document.find('body');

                    function getTemplatePromise(options) {
                        return options.template ? $q.when(options.template) :
                            $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                                return result.data;
                            });
                    }

                    function getResolvePromises(resolves) {
                        var promisesArr = [];
                        angular.forEach(resolves, function (value, key) {
                            if (angular.isFunction(value) || angular.isArray(value)) {
                                promisesArr.push($q.when($injector.invoke(value)));
                            }
                        });
                        return promisesArr;
                    }

                    function PBoxModal(options, $target) {
                        var _resultDeferred = $q.defer();
                        var _openedDeferred = $q.defer();
                        this.resultDeferred = _resultDeferred;
                        this.openedDeferred = _openedDeferred;
                        this.result = _resultDeferred.promise;
                        this.opened = _openedDeferred.promise;

                        var _self = this;
                        this._options = options;
                        this._pboxElement = null;
                        this._$target = $target;

                        $target.data(globalOptions.boxInstanceName, this);

                        PBoxModal.prototype._remove = function(){
                            this._$target.removeData(globalOptions.boxInstanceName);
                            this._$target.removeClass(this._options.openClass);
                            this._pboxElement.remove();
                        };

                        PBoxModal.prototype._bindEvents = function () {
                            $document.bind("mousedown.pbox", function (e) {
                                var _eTarget = angular.element(e.target);
                                if (util.hasClass(_eTarget, 'pbox')) {
                                    return;
                                }
                                if (util.hasClass(_eTarget, globalOptions.triggerClass)) {
                                    var isResult = false;
                                    var _target = util.getTarget(e);
                                    if (_target && _target.data(globalOptions.boxInstanceName)) {
                                        var instance = _target.data(globalOptions.boxInstanceName);
                                        if (instance === _self) {
                                            isResult = true;
                                        }
                                    }
                                    if (isResult) {
                                        return;
                                    }
                                }
                                $document.unbind("mousedown.pbox");
                                _self.close();
                            });
                        };

                        PBoxModal.prototype.open = function (tpl, scope) {
                            this._pboxElement = angular.element('<div class="pbox"></div>');
                            this._pboxElement.html(tpl);
                            this._$target.addClass(this._options.openClass);
                            $compile(this._pboxElement)(scope);
                            $body.append(this._pboxElement);
                            $timeout(function () {
                                $wtPosition.calculatePos(_self._options, $target, _self._pboxElement);
                            });
                            this._bindEvents();
                        };

                        PBoxModal.prototype.close = function (result) {
                            this._remove();
                            _resultDeferred.resolve(result);
                        };

                        PBoxModal.prototype.dismiss = function (reason) {
                            this._remove();
                            _resultDeferred.reject(reason);
                        }
                    }

                    $pbox.open = function (options) {

                        //merge and clean up options
                        options = angular.extend({}, defaultOptions, options);
                        options.resolve = options.resolve || {};

                        //verify options
                        if (!options.template && !options.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }
                        if (!options.event || !options.event.target) {
                            throw new Error("The event.target not be null.")
                        }

                        //verify is exists pbox,if exists close it and return,else open continue...
                        var $target = util.getTarget(options.event);
                        options.placement = $target.data("placement") ? $target.data("placement") : options.placement;
                        options.align = $target.data("align") ? $target.data("align") : options.align;
                        if ($target.data(globalOptions.boxInstanceName)) {
                            return $target.data(globalOptions.boxInstanceName).close();
                        }

                        var pboxInstance = new PBoxModal(options, $target);

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(options)].concat(getResolvePromises(options.resolve)));

                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

                            var pboxScope = (options.scope || $rootScope).$new();
                            pboxScope.$close = options.close;
                            pboxScope.$dismiss = options.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (options.controller) {
                                ctrlLocals.$scope = pboxScope;
                                ctrlLocals.$pboxInstance = pboxInstance;
                                pboxScope.$pboxInstance = pboxInstance;
                                angular.forEach(options.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(options.controller, ctrlLocals);
                                pboxInstance.ctrlInstance = ctrlInstance;
                            }

                            pboxInstance.open(tplAndVars[0], pboxScope);

                        }, function resolveError(reason) {
                            pboxInstance.resultDeferred.reject(reason);
                        });

                        templateAndResolvePromise.then(function () {
                            pboxInstance.openedDeferred.resolve(true);
                        }, function () {
                            pboxInstance.openedDeferred.reject(false);
                        });

                        return pboxInstance;
                    };

                    return $pbox;
                }
            ];
        }]);
})();
