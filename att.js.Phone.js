
    // The Muc object assumes you'll send it a strophe connection
    function Phone(options) {
        var self = this,
            opts = options || {},
            config = this.config = {
                version: 'a1',
                token: '',
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
            this.config.url = 'https://api.foundry.att.com/a1/webrtc';
        } else if (this.config.version === 'a2') {
            this.config.url = 'https://api.foundry.att.com/a2/webrtc';
        } else {
            this.config.phono = true;
        }
    
        if (!this.config.phono && !_.h2sSupport()) {
            alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
        }
    
        // if we got auth credentials on init, we assume
        // they want to immediately log in.
        if (config.token) {
            this.login(config.token);
        }
    
        // inherit wildemitter properties
        WildEmitter.call(this);
    
        // register handlers passed in on init
        _.each(availableCallbacks, function (key, value) {
            if (_.isFunc(self.config[key])) self.on(value, self.config[key]);
        });
    
        if (this.config.log) {
            this.on('*', function (eventName, payload) {
                console.log('event:', eventName, payload);
            });
        }
    }
    
    // set our prototype to be a new emitter instance
    Phone.prototype = new WildEmitter();
    
    Phone.prototype.login = function (accessToken, cb) {
        var self = this,
            config = this.config,
            token = this.config.token = accessToken;
        
        if (config.phono) {
            console.log('setting up phono');
            this.phono = $.phono({
                apiKey: "7826110523f1241fcfd001859a67128d",            
                gateway: 'gw.phono.com',
                connectionUrl: 'http://bosh.spectrum.tfoundry.com:8080/http-bind',
                audio: {
                    type: 'webrtc'
                },
                onReady: function () {
                    self.emit('ready', self);
                },
                onUnready: function () {
                    self.emit('unready', self);
                },
                phone: {
                    ringTone: config.ringTone,
                    ringbackTone: config.ringbackTone,
                    onIncomingCall: function (call) {
                        self.emit('incomingCall', call);
                    }
                },
                onError: function (err) {
                    self.emit('error', err);
                }
            });
        } else {
          this.phono = $.wcgphono(config);
          /*
            this.ms = new MediaServices(this.config.url, this.config.user, "oauth " + token || this.config.token, "audio,video");
            this.ms.oninvite = function (event) {
                self._normalizeH2SCallHandlers(event.call);
                self.emit('incomingCall', event.call);
                window.call = event.call;
            };
            this.ms.onready = function () {
                self.emit('ready', self);
                //self.ms.unregister();
            };
         */
        }
    };
    
    // outgoing call
    Phone.prototype.dial = function (phoneNumber, config) {
        var self = this,
            callable = att.phoneNumber.getCallable(phoneNumber);
        if (this.phono) {
            call = this.phono.phone.dial(callable, config);
            return call;
        } 
        
        /*
        else {
            var call = this.ms.createCall('sip:' + callable + '@vims1.com', {audio: true, video: false});
            this._normalizeH2SCallHandlers(call);
            call.ring();
            return call;
        }
        */
    };
    
    /*
    Phone.prototype._normalizeH2SCallHandlers = function (call) {
        var self = this;
        // make the call object an emitter
        WildEmitter.call(call);
        _.extend(call, WildEmitter.prototype);
    
        call.onbegin = function () {
            self.emit('callBegin', call);
            call.emit('callBegin', call);
        };
        call.onend = function () {
            self.emit('callEnd', call);
            call.emit('callEnd', call);
        };
        call.onaddstream = function () {
            self.emit('addStream', call);
            call.emit('addStream', call);  
        };
    };
    */
    
