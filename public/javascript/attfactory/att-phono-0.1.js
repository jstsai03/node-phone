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
          // return !!window.webkitPeerConnection00 && window.navigator.userAgent.indexOf('Chrome/24') !== -1;
          //first OR is for original leif
          // second OR is for IIP Leif
          return ( (window.navigator.userAgent == "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.4 (KHTML, like Gecko) Chrome/19.0.1077.0 Safari/536.4")
            ||
            (window.webkitPeerConnection00 && window.navigator.userAgent.indexOf('Chrome/24') !== -1));
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
      
        // allow a sip address of any format
        if(input.indexOf('sip:') != -1) {
          return input;
        }

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
    
        // Geoff A hack of all hacks even if i say so myself
        // Place a handler in the way so any bindings from call.bind keep Att object in middle
        //Otherwise we lose event state model 
        if(event == 'onIncomingCall') {
          var attCall = new AttCall(this, args[0]['call']);
          args[0] = {'call' : attCall};
        }

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
    function Att(options) {
      
        if(options) {
          // Make sure the version passed in is at least a valid string
          if(!options.version){
            options.version = 'a1';
          }
        }
        
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
                'onIncomingCall': 'incomingCall',
                'onError': 'error',
                'onCallBegin': 'callBegin',
                'onCallEnd': 'callEnd',
                'onOutgoingCall': 'outgoingCall',
                'onCalling': 'calling'
            },
            phonoAPICallbacks = {
                'onIncomingCall': 'incomingCall',
                'onError': 'error'
            };
    
        // extend our defaults
        _.extend(this.config, opts);
    
        // support att.phone.dial() api
        this.phone = this;
    
        // inherit wildemitter properties
        WildEmitter.call(this);
    
        // register handlers passed in on init
        _.each(availableCallbacks, function (key, value) {
            if (_.isFunc(self.config[key])) {
              self.on(key, self.config[key]);
              self.config[key] = function(event) {
                self.emit(key, event);
              }
            }
        });
    
        // support phono api
        if (opts.phone) {
            _.each(phonoAPICallbacks, function (key, value) {
                if (_.isFunc(self.config.phone[key])) {
                  self.on(key, self.config.phone[key]);
                  self.config.phone[key] = function(event) {
                    self.emit(key, event);
                  }
                }
            });
        }
    
        if (this.config.log) {
            this.on('*', function (eventName, payload) {
                console.log('att.js event:', eventName, payload);
            });
        }

        // always override with query param version, if set
        this.config.version = _.getQueryParam('version') || this.config.version;
    
        if (this.config.version === 'a1') {
          if (!_.h2sSupport()) {
              alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
          } else {
            console.log('setting up wcgphono');
            this.phono = $.wcgphono(config);
          }
        } else if (this.config.version === 'a2') {
          if (!_.h2sSupport()) {
              alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
          } else {
            console.log('setting up h2sphono');
            this.phono = $.h2sphono(config);
          }
        } else {
            console.log('setting up phono');
            this.phono = $.phono(config);
        }

        this.sessionId = this.phono.sessionId;
    }
    
    // set our prototype to be a new emitter instance
    Att.prototype = new WildEmitter();
    
    // Connect
    Att.prototype.connect = function (config) {
      return new Att(cfg);
    } 
    
    // Disconnect
    Att.prototype.disconnect = function () {
      this.phono.disconnect();
      this.phono = null;
    } 
    
    // Connected?
    Att.prototype.connected = function () {
      return this.phono;
    } 
    
    // outgoing call
    Att.prototype.dial = function (phoneNumber, callbackHash) {
        var self = this,
            callable = att.phoneNumber.getCallable(phoneNumber),
            callbacks = callbackHash || {};
        this.emit('calling', phoneNumber);
        var call = this.phono.phone.dial(callable, {
            // Events
            onRing: function () {
                self.emit('outgoingCall', call);
                if (callbacks.onRing) callbacks.onRing(call);
            },
            onAnswer: function () {
                self.emit('callBegin', call);
                if (callbacks.onAnswer) callbacks.onAnswer(call);
            },
            onHangup: function () {
                self.emit('callEnd', call);
                if (callbacks.onHangup) callbacks.onHangup(call);
            },
            onError: function () {
                self.emit('error', call);
                if (callbacks.onError) callbacks.onError(call);
            },
        });
        return call;
    };

    function AttCall(att, call) {
      this._att = att;
      this._call = call;
      this.id = call.id;
      return this;
    }

    AttCall.prototype.bind = function(config) {
      // support phono call api
      var phonoCallAPICallbacks = {
          'onRing': 'ring',
          'onAnswer': 'answer',
          'onHangup': 'hangup',
          'onError': 'error'
      };

      var self = this._att;

      if (config) {
        _.each(phonoCallAPICallbacks, function (key, value) {
            if (_.isFunc(config[key])) {
              self.on(key, config[key]);
              config[key] = function(event) {
                self.emit(key, event);
              }
            }
        });
      }
      return this._call.bind(config);
    }
    
    AttCall.prototype.answer = function() {
      return this._call.answer();
    }
      
    AttCall.prototype.hangup = function() {
      return this._call.hangup();
    }
      
    AttCall.prototype.digit = function(digit) {
      return this._call.digit(digit);
    }
      
    AttCall.prototype.pushToTalk = function(flag) {
      return this._call.pushToTalk(flag);
    }
      
    AttCall.prototype.talking = function(flag) {
      return this._call.talking(flag);
    }
      
    AttCall.prototype.mute = function(flag) {
      return this._call.mute(flag);
    }
      
    AttCall.prototype.hold = function(flag) {
      return this._call.hold(flag);
    }
      
    AttCall.prototype.volume = function(level) {
      return this._call.volume(level);
    }
      
    AttCall.prototype.gain = function(level) {
      return this._call.gain(level);
    }
      
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
        root.att || (root.att = {});
        _.extend(root.att, att);
    }

}).call(this);
