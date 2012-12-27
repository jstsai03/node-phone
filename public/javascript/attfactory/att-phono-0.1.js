/*global io MediaServices Phono*/
(function ($) {
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
            return !!window.webkitPeerConnection00 && window.navigator.userAgent.indexOf('Chrome/24') !== -1;
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

    // The Muc object assumes you'll send it a strophe connection
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
                'onCallEnd': 'callEnd'
            };
    
        // extend our defaults
        _.extend(this.config, opts);
    
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

        this.phone = new Phone(this);
    }
    
    function Phone(att)
    {
      this._att = att;
    }
    
    // outgoing call
    Phone.prototype.dial = function (phoneNumber, config) {
      var callable = att.phoneNumber.getCallable(phoneNumber);
      call = this._att.phono.phone.dial(callable, config);
      return call;
    } 
    
    $.extend({att: function(cfg) { return new Att(cfg); }});

})(jQuery);