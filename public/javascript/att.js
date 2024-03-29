/*global io MediaServices Phono*/
(function () {
    // Utils and references
    var root = this,
        att = {};

    // global utils
    var _ = att.util = {
        _uuidCounter: 0,
        uuid: function () {
            return Math.random().toString(16).substring(2) + (_._uuidCounter++).toString(16);
        },
        slice: Array.prototype.slice,
        isFunc: function (obj) {
            return Object.prototype.toString.call(obj) == '[object Function]';
        },
        extend: function (obj) {
            this.slice.call(arguments, 1).forEach(function (source) {
                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            });
            return obj;
        },
        each: function (obj, func) {
            if (!obj) return;
            if (obj instanceof Array) {
                obj.forEach(func);
            } else {
                for (var key in obj) {
                    func(key, obj[key]);
                }
            }
        },
        getQueryParam: function (name) {
            // query string parser
            var cleaned = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"),
                regexS = "[\\?&]" + cleaned + "=([^&#]*)",
                regex = new RegExp(regexS),
                results = regex.exec(window.location.search);
            return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : undefined;
        },
        // used to try to determine whether they're using the ericsson leif browser
        // this is not an ideal way to check, but I'm not sure how to do it since
        // leif if pretty much just stock chromium.
        h2sSupport: function () {
            // first OR is for original leif
            // second OR is for Mobile bowser
            // third OR is for IIP Leif
            return window.navigator.userAgent == "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.4 (KHTML, like Gecko) Chrome/19.0.1077.0 Safari/536.4" ||
            window.navigator.userAgent == "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10A523" ||
            window.webkitPeerConnection00 && window.navigator.userAgent.indexOf('Chrome/24') !== -1;
        }
    };

    var phoneNumber = {};
    
    phoneNumber.stringify = function (text) {
        // strip all non numbers
        var cleaned = phoneNumber.parse(text),
            len = cleaned.length,
            countryCode = (cleaned.charAt(0) === '1'),
            arr = cleaned.split(''),
            diff;
    
        // if it's long just return it unformatted
        if (len > (countryCode ? 11 : 10)) return cleaned;
    
        // if it's too short to tell
        if (!countryCode && len < 4) return cleaned;
    
        // remove country code if we have it
        if (countryCode) arr.splice(0, 1);
    
        // the rules are different enough when we have
        // country codes so we just split it out
        if (countryCode) {
            if (len > 1) {
                diff = 4 - len;
                diff = (diff > 0) ? diff : 0;
                arr.splice(0, 0, " (");
                // back fill with spaces
                arr.splice(4, 0, (new Array(diff + 1).join(' ') + ") "));
                
                if (len > 7) {
                    arr.splice(8, 0, '-');
                }
            }
        } else {
            if (len > 7) {
                arr.splice(0, 0, "(");
                arr.splice(4, 0, ") ");
                arr.splice(8, 0, "-");
            } else if (len > 3) {
                arr.splice(3, 0, "-");
            }
        }
    
        // join it back when we're done with the CC if it's there
        return (countryCode ? '1' : '') + arr.join('');
    };
    
    phoneNumber.parse = function (input) {
        return String(input)
            .toUpperCase()
            .replace(/[A-Z]/g, function (l) {
                return (l.charCodeAt(0) - 65) / 3 + 2 - ("SVYZ".indexOf(l) > -1) | 0;
            })
            .replace(/\D/g, '');
    };
    
    phoneNumber.getCallable = function (input, countryAbr) {
        var country = countryAbr || 'us',
            cleaned = phoneNumber.parse(input);
        if (cleaned.length === 10) {
            if (country == 'us') {
                return '1' + cleaned;
            }
        } else if (country == 'us' && cleaned.length === 11 && cleaned.charAt(0) === '1') {
            return cleaned;
        } else {
            return false;
        }
    };
    
    att.phoneNumber = phoneNumber;
    /*
    WildEmitter.js is a slim little event emitter largely based on @visionmedia's Emitter from UI Kit.
    
    I wanted it standalone.
    
    I also wanted support for wildcard emitters. Like:
    
    emitter.on('*', function (eventName, other, event, payloads) {
        
    });
    
    emitter.on('somenamespace*', function (eventName, payloads) {
        
    });
    
    Functions triggered by wildcard registered events also get the event name as the first argument.
    
    */
    function WildEmitter() {
        this.callbacks = {};
    }
    
    // Listen on the given `event` with `fn`. Store a group name if present.
    WildEmitter.prototype.on = function (event, groupName, fn) {
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined, 
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };
    
    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    WildEmitter.prototype.once = function (event, fn) {
        var self = this;
        function on() {
            self.off(event, on);
            fn.apply(this, arguments);
        }
        this.on(event, on);
        return this;
    };
    
    // Unbinds an entire group
    WildEmitter.prototype.releaseGroup = function (groupName) {
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };
    
    // Remove the given callback for `event` or all
    // registered callbacks.
    WildEmitter.prototype.off = function (event, fn) {
        var callbacks = this.callbacks[event],
            i;
        
        if (!callbacks) return this;
    
        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }
    
        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        return this;
    };
    
    // Emit `event` with the given args.
    // also calls any `*` handlers
    WildEmitter.prototype.emit = function (event) {
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item;
    
        if (callbacks) {
            for (i = 0, len = callbacks.length; i < len; ++i) {
                callbacks[i].apply(this, args);
            }
        }
    
        if (specialCallbacks) {
            for (i = 0, len = specialCallbacks.length; i < len; ++i) {
                specialCallbacks[i].apply(this, [event].concat(args));
            }
        }
    
        return this;
    };
    
    // Helper for for finding special wildcard event handlers that match the event
    WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
        var item,
            split,
            result = [];
    
        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[1].length) === split[1])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };
    function Att(config) {
        var self = this, 
            options = config || {};
        
        // Make sure the version passed in is valid
        if (['a1', 'a2', 'a3'].indexOf(options.version) === -1) {
            options.version = 'a1';
        }
    
        // always override with query param version, if set
        options.version = _.getQueryParam('version') || options.version;
        
        // inherit wildemitter properties
        WildEmitter.call(this);
    
        if (options.version === 'a1' || options.version === 'a2') {
            $.getScript('/js/att.' + options.version + '.js', function () {
                self.create(options);    
            });    
        } else {
            $.getScript('/js/phono.06.js', function () {
                options.token = options.apiKey;
                options.apiKey = "7826110523f1241fcfd001859a67128d";
                options.connectionUrl = "http://gw.att.io:8080/http-bind";
                self.create(options);    
            });
        }
    
        return self;
    }
    
    // set our prototype to be a new emitter instance
    Att.prototype = new WildEmitter();
    
    Att.prototype.create = function (options) {
        var self = this,
            opts = options || {},
            config = this.config = {
                apiKey: '',
                user: _.uuid(),
                jid: '',
                log: true,
                ringTone: '',
                ringbackTone: ''
            },
            availableCallbacks = {
                'onReady': 'ready',
                'onUnReady': 'unready',
                'onError': 'error',
                'onCallBegin': 'callBegin',
                'onCallEnd': 'callEnd',
                'onOutgoingCall': 'outgoingCall',
                'onCalling': 'calling'
            },
            phonoAPICallbacks = {
                'onError': 'error',
                'onCallBegin': 'callBegin',
                'onCallEnd': 'callEnd'
            },
            incomingCallHandler = function () {
                if (_.isFunc(options.onIncomingCall)) {
                    return options.onIncomingCall;
                } else if (options.phone && _.isFunc(options.phone.onIncomingCall)) {
                    return options.phone.onIncomingCall;
                } else {
                    return function () {};
                }
            }();
    
        // extend our defaults
        _.extend(this.config, opts);
    
        // store a reference to or main incoming call handler
        this.config.incomingCallHandler = incomingCallHandler;
        // delete the original
        delete this.config.onIncomingCall;
        if (this.config.phone) {
            delete this.config.phone.onIncomingCall;
        }
    
        // support att.phone.dial() api
        this.phone = this;
    
        // register the real incoming call handler
        this.on('incomingCall', incomingCallHandler);
    
        // register handlers passed in on init
        _.each(availableCallbacks, function (key, value) {
            if (_.isFunc(self.config[key])) {
                self.on(value, self.config[key]);
                self.config[key] = function (event) {
                    self.emit(value, event);
                };
            }
        });    
    
        // support phono api
        if (opts.phone) {
            _.each(phonoAPICallbacks, function (key, value) {
                if (_.isFunc(self.config.phone[key])) {
                    self.on(key, self.config.phone[key]);
                    self.config.phone[key] = function (event) {
                        self.emit(value, event);
                    };
                }
            });
        }
    
        if (this.config.log) {
            this.on('*', function (eventName, payload) {
                console.log('att.js event:', eventName, payload);
            });
        }
    
        if (this.config.version === 'a1') {
            if (!_.h2sSupport()) {
                alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
            } else {
                console.log('setting up wcgphono');
                // Henrik: I'm of the opinion that we should normalize all handling in this library
                // rather than in the dynamically loaded ones. That way we maintain one compatibility 
                // layer outside of the included (hopefully unmodified) libraries rather than have to
                // modify each one.
                this.phono = $.wcgphono(_.extend(config, {
                    phone: {
                        onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
                    }
                }));
            }
        } else if (this.config.version === 'a2') {
            if (!_.h2sSupport()) {
                alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
            } else {
                console.log('setting up h2sphono');
                this.phono = $.h2sphono(_.extend(config, {
                    phone: {
                        onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
                    }
                }));
            }
        } else {
            console.log('setting up phono');
            this.phono = $.phono(_.extend(config, {
                phone: {
                    onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
                },
                onReady: function () {
                    self.sessionId = this.sessionId;
                    self.getMyNumber(function (number) {
                        self.bindNumberToPhonoSession(number, self.sessionId, function () {
                            self.emit('ready'); 
                        });
                    });
                }
            }));
        }
    };
    
    Att.prototype.getMyNumber = function (cb) {
        var self = this;
        $.getJSON('https://auth.tfoundry.com/me.json?access_token=' + this.config.token, function (user) {
            var number;
            if (user) {
                number = user.conference_phone_number || user.phone_number;
                self.config.myNumber = number;
                cb(number);
            } else {
                cb('');
            }
        });
    };
    
    Att.prototype.bindNumberToPhonoSession = function (number, session, cb) {
        // For A3, we need to bind the session id with the phone number
        $.ajax({
            url: 'http://binder.api.tfoundry.com/session/' + number + '/' + session,
            type: "POST",
            success: function (data) {
                cb();
            }
        });
    };
    
    // Disconnect
    Att.prototype.disconnect = function () {
        this.phono.disconnect();
        this.phono = null;
    };
    
    // Connected?
    Att.prototype.connected = function () {
        return !!this.phono;
    };
    
    Att.prototype._normalizeNonPhonoCallHandlers = function (event) {
        var call = event.call,
            attCall,
            number;
        if (call) {
            attCall = new AttCall(this, call);
            number = attCall.initiator || attCall._call.recipient || '';
            number = number.replace('tel:', '').replace('sip:', '');
            // silly fix to support phono API
            attCall.call = attCall;
            this.emit('incomingCall', attCall, att.phoneNumber.parse(number));
        }
    };
    
    // outgoing call
    Att.prototype.dial = function (phoneNumber, callbackHash) {
        var self = this,
            callable = att.phoneNumber.getCallable(phoneNumber),
            callbacks = callbackHash || {},
            call,
            attCall;
    
        this.emit('calling', phoneNumber);
        
        // for 'a3' we need to set a full sip address
        if (this.config.version === 'a3') {
            call = this.phono.phone.dial('sip:' + callable + '@12.208.176.26', {
                callerId: self.config.myNumber + '@phono06.tfoundry.com'
            });
        } else {
            call = this.phono.phone.dial(callable, {});
        }
    
        attCall = new AttCall(this, call);
        attCall.bind(callbackHash);
    
        this.emit('outgoingCall', attCall);
        return attCall;
    };
    
    
    // The AttCall Object
    function AttCall(att, call) {
        var self = this;
        
        // store references for convenience
        this._att = att;
        this._call = call;
        this.id = call.id;
    
        // inherit wildemitter properties
        WildEmitter.call(this);
    
        // this makes it so that emitting events from the call
        // object automatically emits them on underlying att
        // object.
        this.on('*', function (eventType) {
            self._att.emit(eventType, self);
        });
    
        this._call.bind({
            onRing: function () {
                self.emit('ring');
            },
            onAnswer: function () {
                self.emit('callBegin');
            },
            onHangup: function () {
                self.emit('callEnd');
            },
            onError: function () {
                self.emit('error');
            }
        });
    
        return this;
    }
    
    AttCall.prototype = new WildEmitter();
    
    // Support the phono call
    AttCall.prototype.bind = function (callbacks) {
        // support phono call api
        var self = this,
            phonoCallAPICallbacks = {
                'onRing': 'ring',
                'onAnswer': 'callBegin',
                'onHangup': 'callEnd',
                'onError': 'error'
            },
            options = callbacks || {},
            att = this._att;
    
        _.each(phonoCallAPICallbacks, function (key, value) {
            if (_.isFunc(options[key])) {
                self.on(value, options[key]);     
            }
        });
    };
    
    
    AttCall.prototype.answer = function () {
        return this._call.answer();
    };
      
    AttCall.prototype.hangup = function () {
        return this._call.hangup();
    };
      
    AttCall.prototype.digit = function (digit) {
        return this._call.digit(digit);
    };
      
    AttCall.prototype.pushToTalk = function (flag) {
        return this._call.pushToTalk(flag);
    };
      
    AttCall.prototype.talking = function (flag) {
        return this._call.talking(flag);
    };
      
    AttCall.prototype.mute = function (flag) {
        return this._call.mute(flag);
    };
      
    AttCall.prototype.hold = function (flag) {
        return this._call.hold(flag);
    };
      
    AttCall.prototype.volume = function (level) {
        return this._call.volume(level);
    };
      
    AttCall.prototype.gain = function (level) {
        return this._call.gain(level);
    };
    
    AttCall.prototype.__defineGetter__("initiator", function () { return this._call.initiator; });
    
    // additional IIP extensions to phono
    AttCall.prototype.transferto = function (phoneNumber) {
        var callable = att.phoneNumber.getCallable(phoneNumber);
        this._call.transferto(callable);
    };
    
    // attch it to root
    att.Phone = Att;
    if (root.jQuery) {
        root.jQuery.att = function (opts) {
            return new Att(opts);
        };
    }
    


    // attach to window or export with commonJS
    if (typeof exports !== 'undefined') {
        module.exports = att;
    } else {
        // make sure we've got an "att" global
        root.ATT || (root.ATT = {});
        _.extend(root.ATT, att);
    }

}).call(this);
