/**
 * WCG Javascript Library
 * With WebRTC support for Google Chrome using JSEP (ROAP is supported but deprecated)
 *
 * @version 2.1.26 gh+
 * Copyright: 2012 Ericsson
 */

(function($)
{

  // Geoff added
  var accessToken = null;
  var sipdomain = "mon.api.att.net";
  var server = "https://api.foundry.att.com/a1/webrtc";
  var turnconfig = "STUN:206.18.171.164:5060";
  
    // Random, unique, unpredictable
    // Both uuidCounter++ are needed and Math.random.
    // uuidCounter++ ensures unique
    // Math.random() ensures unpredictable
    // Prints it out as hex with no other punctuation (looks neater)
    var uuidCounter = 0;
    var uuid = function()
    {
        return Math.random().toString(16).substring(2) + (uuidCounter++).toString(16);
    };
    
    function PhonoCall(ms, destination, config, oCall)
    {
    
        var call = oCall;
    
        if (!call)
            call = ms.createCall(destination, {audio: true, video: true});
            
        if (!config)
            config = {};
            
        $.extend(this, config);
        
        this.state = "initial";
        var mt = this;
        
        call.onstatechange = function(e)
        {
        
            if (e.state == Call.State.RINGING && mt.onRing)
            {
                mt.onRing(e);
                mt.state = "ringing";
            }
            if (e.state == Call.State.ONGOING && mt.onAnswer)
            {
                mt.onAnswer(e);
                mt.state = "connected";
            }
            if (e.state == Call.State.ENDED && mt.onHangup)
            {
                mt.onHangup(e);
                mt.state = "disconnected";
            }
            if (e.state == Call.State.ERROR && mt.onError)
            {
                mt.onError(e);
                mt.state = "disconnected";
            }
        }
        
        call.onaddstream = function(e)
        {
            // TODO: Add the stream to an element.
            // This is not possible (nor useful) in current Chrome
            if (mt.onAddStream)
                mt.onAddStream(e);
        }   
        
        this.__defineGetter__("localStreams", function() { return call.localStreams; });
        this.__defineGetter__("remoteStreams", function() { return call.localStreams; });
        
        if (!destination)
            this.__defineGetter__("from", function() { return call.recipient; });
        
        this.id = uuid();
        this.call = call;
        
        if (!oCall)
            call.ring();
    }
    
    PhonoCall.prototype.answer = function() { this.call.answer(); };
    PhonoCall.prototype.hangup = function() { this.call.end(); };
    PhonoCall.prototype.digit = function() { };
    PhonoCall.prototype.pushToTalk = function() { };
    PhonoCall.prototype.talking = function() { };
    PhonoCall.prototype.mute = function() { };
    PhonoCall.prototype.hold = function() { };
    PhonoCall.prototype.volume = function() { };
    PhonoCall.prototype.gain = function() { };
    
    function Phone(ms, config)
    {
        this._ms = ms;
        if (!config) config = {};
        this._config = config;
        
        $.extend(this, config);
        
        if (!this.onError)
            this.onError = function(){
                console.warn("Error occurred with no handler there");
            };
    }
    
    Phone.prototype.dial = function(destination, config)
    {
        if (!config.video)
            config.video = this.video;
            
        var sipDestination = "sip:"+destination + "@" + sipdomain;
        this.call = new PhonoCall(this._ms, sipDestination, config);
        
        return this.call;
    };
    
    Phone.prototype.tones = function(){};
    Phone.prototype.headset = function(){};
    Phone.prototype.wideband = function(){};
    Phone.prototype.ringTone = function(){};
    Phone.prototype.ringbackTone = function(){};

    function WCGPhono(config)
    {
        this._config = config;
		
        if(config.apiKey.indexOf("oauth" == -1)) {
          config.apiKey = "oauth " +  config.apiKey;
        }

        if (!config.turnconfig)
            config.turnconfig = turnconfig;
        
        if (!config.sipdomain)
            config.sipdomain = sipdomain;
        
        if (!config.server)
            config.server = server;
        
        $.extend(this, config);
        
        if (!this.user)
            this.user = uuid();
            
        //this._ms = new MediaServices("http://api.tfoundry.com/a1/H2SConference", uuid(), config.apiKey, "audio");
        
        var mt = this;
        
        var mediaType = (config.video ? "audio,video" : "audio");
        
        
        // /* Comment out for the test case
        
        this._ms = new MediaServices(this.server, this.user, config.apiKey, mediaType);
        this._ms.onready = function() { setTimeout(function() { mt._ms.unregister(); }, 500) };
        this._ms.onclose = function() { setTimeout(function() {
        
        // */
            
            mt._ms = new MediaServices(mt.server, mt.user, config.apiKey, mediaType);
            mt._ms.turnConfig = config.turnconfig || "NONE";
            
            // preserve "this" for callbacks
            mt._ms.onclose = function(e) { if (mt.onUnready) mt.onUnready(e); };
            mt._ms.onerror = function(e) { mt.onerror(e); };
            mt._ms.oninvite = function(e) { mt.oninvite(e); };
            mt._ms.onready = function(e) { mt.sessionId = mt._ms.username; if (mt.onReady) mt.onReady(e); };
            
            mt.phone = new Phone(mt._ms, config.phone);
        
        // /*
        }, 500); };
        
        // */
    }

    // Connect
    WCGPhono.prototype.connect = function (config) {
      return new WCGPhono(cfg);
    } 
    
    // Disconnect
    WCGPhono.prototype.disconnect = function () {
      this._ms.unregister();
      this.phono = null;
    } 
    
    // Connected?
    WCGPhono.prototype.connected = function () {
      return this.phono;
    } 
    
    
    WCGPhono.prototype.onerror = function(evt)
    {
        // TODO: Ensure error event format matches
        if(this.phone._call && this.phone._call.onerror)
        {
            this.phone._call.onerror(evt);
        }
        else
        {
            this.phone.onerror(evt);
        }
    }
    
    WCGPhono.prototype.oninvite = function(evt)
    {
        if (evt.call && this.phone.onIncomingCall)
            this.phone.onIncomingCall({call: new PhonoCall(this._ms, null, null, evt.call)});
    }
    
    $.extend({wcgphono: function(cfg) { return new WCGPhono(cfg); }});

})(jQuery);

/**
 * WCG Javascript Library
 * With WebRTC support for Google Chrome using JSEP (ROAP is supported but deprecated)
 *
 * @version 2.1.26 
 * Copyright: 2012 Ericsson
 */

if (typeof Logs === "undefined") {
    Logs = true;
}
        
(function(parent) {
    // noop logger
    // note that all three functions are present in console and can be used
    var logger = {
        log: function(){},
        warn: function(){},
        error: function(){}
    };
    
    // op logger. Only enable due to a flag. At the moment, no flag (true).
    // Change this to disable logging in one place.
    if (Logs)
        logger = console;


    // WCG URL resources
    var SESSION = "session",
        REGISTER_RESOURCE = "register",
        CONFERENCE_RESOURCE = "mediaconf",
        CONFERENCE_RESOURCE_ADD = "add",
        CONFERENCE_RESOURCE_REMOVE = "remove",
        AUDIOVIDEO_RESOURCE = "audiovideo",
        CHANNEL_RESOURCE = "channels",
        FILETRANSFER_RESOURCE = "filetransfer",
        FILETRANSFER_RESOURCE_SEND = "sendfile",
        FILETRANSFER_RESOURCE_UPLOAD = "uploadfiledata",
        FILETRANSFER_RESOURCE_ACCEPT = "accept",
        FILETRANSFER_RESOURCE_TERMINATE = "terminate",
        FILETRANSFER_RESOURCE_GETFILE = "getfiledata",
        ADDRESSBOOK_RESOURCE = "ab",
        ADDRESSBOOK_RESOURCE_CONTACTS = "contacts",
        CHAT_RESOURCE = "message",
        CHAT_RESOURCE_SEND = "send",
        CHAT_RESOURCE_SEND_ISCOMPOSING = "send-iscomposing",
        CHAT_RESOURCE_SEND_MEDIA = "sendmedia?to=",
        CHAT_RESOURCE_GET_MEDIA = "getmedia?fileRef=",
        GROUP_CHAT_RESOURCE = "groupchat",
        GROUP_CHAT_CREATE = "create",
        GROUP_CHAT_LEAVE = "leave",
        GROUP_CHAT_ADD = "addparticipants",
        GROUP_CHAT_JOIN = "join",
        GROUP_CHAT_ACCEPT = "invite/accept",
        GROUP_CHAT_DECLINE = "invite/decline",
        GROUP_CHAT_RESOURCE_SEND_MEDIA = "sendmedia?confId=";
        PRESENCE_RESOURCE = "presence",
        PRESENCE_RESOURCE_USER = "user",
        PRESENCE_RESOURCE_USER_SUBSCRIBE = "subscribe",
        PRESENCE_RESOURCE_USER_PUBLISH = "publish",
        PRESENCE_RESOURCE_USER_ANONYMOUS = "anonymous",
        PRESENCE_RESOURCE_LIST = "list",
        PRESENCE_RESOURCE_LIST_ADD = "adduser",
        PRESENCE_RESOURCE_LIST_REMOVE = "removeuser",
        PRESENCE_RESOURCE_LIST_BLOCK = "blockuser",
        CONTENT_RESOURCE = "content",
        CONTENT_RESOURCE_GETAVATAR = "getavatar",
        CONTENT_RESOURCE_SETAVATAR = "setavatar",
        CONTENT_RESOURCE_DELETEAVATAR = "deleteavatar";
    
    // Presence service descriptions. Taken from RCS specs document
    var SERVICE = {
        MESSAGING_STANDALONE : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.sm",
            serviceVersion : "1.0"
        },
        MESSAGING_SESSION_MODE : {
            serviceDescription : "org.openmobilealliance:IM-session",
            serviceVersion : "1.0"
        },
        FILE_TRANSFER : {
            serviceDescription : "org.openmobilealliance:File-Transfer",
            serviceVersion : "1.0"
        },
        IMAGE_SHARE : {
            serviceDescription : "org.gsma.imageshare",
            serviceVersion : "1.0"
        },
        VIDEO_SHARE_1 : {
            serviceDescription : "org.gsma.videoshare",
            serviceVersion : "1.0"
        },
        VIDEO_SHARE_2 : {
            serviceDescription : "org.gsma.videoshare",
            serviceVersion : "2.0"
        },
        SOCIAL_PRESENCE : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcse.sp",
            serviceVersion : "1.0"
        },
        CAPABILITY_DISCOVERY : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcse.dp",
            serviceVersion : "1.0"
        },
        VOICE_CALL : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-service.ims.icsi.mmtel",
            serviceVersion : "1.0"
        },
        VIDEO_CALL : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-service.ims.icsi.mmtel",
            serviceVersion : "1.0"
        },
        GEOLOCATION_PUSH : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.geopush",
            serviceVersion : "1.0"
        },
        GEOLOCATION_PULL : {
            serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.geopull",
            serviceVersion : "1.0"
        }
    };
    
    // TODO: this is a parameter that can be fetched with getParameter from the REST API
    var MAX_MEDIA_SIZE = 51200; // Media message size
    
    // Signature on this can vary. Basically it has a URL to the gateway and some form of access token.
    // It auto-registers after the current event loop
    /**
    Creates a new MediaServices instance. This instance can be used to request new media services and to respond to incoming media requests.
    @class The MediaServices class is the main entry point of the application. It registers with the media gateway, 
    creates outgoing calls and new conferences, and accepts incoming calls.<br />
    @property {MediaServices.State} state State of the MediaServices.
    @property {String} mediaType The media type(s) supported by this MediaServices object.
    @property {String} turnConfig The TURN server URL. (e.g. "provserver.televolution.net") Defaults to "NONE" if not set.
    @property {String} willingness The willingness status of the user. This will be published automatically.
    @property {String} tagline The tagline of the user. This will be published automatically.
    @property {Object} homepage The homepage of the user (should be an object with field: homepage.url and homepage.label). This will be published automatically.
    @property {String} username (readyonly)
    @property {ContactList} contactList
    @param {String} gwUrl URL to the MediaGateway, including the protocol scheme (e.g. "http://129.192.188.88:9191/HaikuServlet/rest/v2/"). This is also described as the base URL.
    @param {String} username Name/identity to register with the Media Gateway. For SIP users, start with "sip:" (e.g. "sip:name@domain.com")
    @param {String} authentication SIP password or authorization token. If registering with oAuth, this parameter should begin with "oauth" (e.g. "oauth mytoken")
    @param {String} services Media services that the user supports. Any combination of "audio,video,ftp,chat".
    @throws {TypeError} Invalid username
    @throws {Error} Invalid user services
    @example
ms = new MediaServices("http://129.192.188.88:9191/HaikuServlet/rest/v2/", "sip:name@domain.com", "0faeb2c", "audio,video,ftp,chat");
// or
ms = new MediaServices("http://129.192.188.88:9191/HaikuServlet/rest/v2/", "name@domain.com", "oauth 0faeb2c", "audio,video");
ms.onclose = function(evt) {};
ms.onerror = function(evt) {};
ms.oninvite = function(evt) {};
ms.onstatechange = function(evt) {};
ms.onready = function(evt) {
    // Perform an action, such as outgoing call
};
    */
    MediaServices = function(gwUrl, username, authentication, services) {
        var _state = MediaServices.State.INITIALISED,
            _services = services,
            // _turnConfig = turnconfig || "NONE";
            _username = username;
        
        /**
        Base URL including session ID ("baseURL"/"sessionID"/)
        @private
        */
        
        this._gwUrl = (gwUrl.substr(-1) == "/") ? gwUrl : gwUrl + "/";
        var domainIndex = gwUrl.replace(/https?:\/\/[^\/]*\/?/i, "");
        this._host = gwUrl.substring(0, gwUrl.indexOf(domainIndex)-1);

        
        /**
        Event channel
        @private
        */
        this._channel = null;
        
        /**
        Current Call object
        @private
        */
        this._call = null;
        
        /**
        Current Transfer Target Call object
        @private
        */
        this._transferTargetCall = null;
        
        /**
        Is user a SIP user or Web user
        @private
        */
        this._isSipUser = (username.indexOf("sip:") == 0) ? true : false;
        
        /**
        Hashmap of FileTransfer objects
        @private
        */
        this._ftp = new _HashMap();
        
        /**
        Session ID (the ID is needed for file transfer)
        @private
        */
        this._sessionID = null;
        
        /**
        A ContactList object
        @private
        */
        this._contactList = null;
        
        /**
        Hashmap of Chat and GroupChat objects
        @private
        */
        this._chat = new _HashMap();
        
        this._willingness;
        
        this._tagline = "";
        
        this._homepage = "";
        
        /**
        Access token (used for oAuth)
        E.g. "oauth mytoken"
        @private
        */
        this._accessToken = (authentication.indexOf("oauth ") == 0) ? authentication.substring(6, authentication.length) : null;
        
    //Geoff Added
        accessToken = this._accessToken;    

        /**
        @field state
        Object's state
        */
        Object.defineProperty(this, "state", {
            get: function()
            {
                return _state;
            },
            
            set: function(newState)
            {
                _state = newState;
                
                if (typeof(this.onstatechange) == "function") {
                    var evt = {type: "statechange", oldState : _state, state: newState};
                    this.onstatechange(evt);
                }
                
                // Dispatch appropriate states
                if (newState == MediaServices.State.READY && typeof(this.onready) == "function")
                    this.onready(evt);
                else if (newState == MediaServices.State.CLOSED && typeof(this.onclose) == "function")
                    this.onclose(evt);
            }
        });
        
        /**
        @field mediaType
        @readonly
        The media type(s) supported by this MediaServices object
        */
        Object.defineProperty(this, "mediaType", {
            get: function() { return _services; }
        });
        
        /**
        @field turnConfig
        The TURN server configuration
        */
        Object.defineProperty(this, "turnConfig", {
            get: function() { return _turnConfig; },
            set: function(turnConfig) { _turnConfig = turnConfig; }
        });
        
        /**
        @field contactList
        */
        Object.defineProperty(this, "contactList", {
            get: function() { return this._contactList; }
        });
        
        /**
        @field willingness
        */
        Object.defineProperty(this, "willingness", {
            get: function() { return this._willingness; },
            set: function(willingness) {
                this._willingness = willingness;
                this._publish({ willingness : willingness });
            }
        });
        
        /**
        @field tagline
        */
        Object.defineProperty(this, "tagline", {
            get: function() { return this._tagline; },
            set: function(tagline) {
                this._tagline = tagline; 
                this._publish({ freeText : tagline });
            }
        });
        
        /**
        @field homepage
        */
        Object.defineProperty(this, "homepage", {
            get: function() { return this._homepage; },
            set: function(homepage) {
                this._homepage = homepage;
                if (homepage.url && homepage.label) {
                    this._publish({ homepage : homepage });
                }
            }
        });
        
        /**
        @field username
        @readonly
        */
        Object.defineProperty(this, "username", {
            get: function() { return _username; }
        });
        
        // Auto register right away
        this._register(username, authentication);
    };
    
    /**
    TODO: keep this private?
    @private
    */
    MediaServices.prototype._getVersion = function() {
        var url = this._gwUrl + "application/version";
        var req = new _CreateXmlHttpReq();
            
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
        
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    logger.log(this.responseText);
                }
            }
        };  
    };
    
    /**
    TODO: keep this private?
    @private
    */
    MediaServices.prototype._getInfo = function() {
        var url = this._gwUrl + "application/info";
        var req = new _CreateXmlHttpReq();
            
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
        
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    logger.log(this.responseText);
                }
            }
        };  
    };
    
    /**
    WCG user registration
    @private
    @return void
    @throws {Error} Invalid username
    @throws {Error} Invalid authentication
    @throws {Error} Invalid user services
    */
    MediaServices.prototype._register = function(username, authentication) {
        var mediaService = this;
        var registerURL = this._gwUrl + REGISTER_RESOURCE;
        
        logger.log("Media service initialised");
        //if(this._accessToken == null) {
            if (typeof(username) != "string" || username == "") {
                throw new Error(MediaServices.Error.INVALID_CREDENTIALS);
            //} else if (typeof(authentication) != "string" || authentication == "") {
            //  throw new Error(MediaServices.Error.INVALID_CREDENTIALS);
            }
        //}
        
        if (typeof(this.mediaType) != "string") {
            throw new TypeError(MediaServices.Error.INVALID_SERVICES);
        }
        
        // Check if user services are valid
        var _services = [];
    
        var tokens = this.mediaType.toLowerCase().replace(/(\s)/g, "").split(",");
        
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] == "audio") {
                _services.push("ip_voice_call");
            } else if (tokens[i] == "video") {
                _services.push("ip_video_call");
            } else if (tokens[i] == "ftp") {
                _services.push("file_transfer");
            } else if (tokens[i] == "chat") {
                _services.push("im_chat");
            }
        }
        
        if (_services.length < 1) {
            throw new Error("Invalid user services");
        }
        
        var body = null;
        //if(this._accessToken == null) {
            if (this._isSipUser) {
                // Remove "sip:" prefix
                username = username.slice(4, username.length);
            
                // SIP users supports Address Book and Presence by default
                _services.push("ab");
                _services.push("presence");
                
                body = {
                    username : username,
                    password : authentication,
                    mediaType : "rtp",
                    services : _services
                };
        //  }
        } else {
            body = {
                username : username,
                mediaType : "rtp",
                services : _services
            };
        }

        // Create and send a register request
        var req = new _CreateXmlHttpReq(this._accessToken);
        
        req.open("POST", registerURL, true);
        req.setRequestHeader("Content-Type", "application/json");
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(JSON.stringify(body, null, " "));
        
        // On response
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                mediaService.state = MediaServices.State.REGISTERING;
                logger.log("Registering...");

                // Success response 201 Created
                if (this.status == 201) {
                    // Extract the sessionID from JSON body
                    var json = JSON.parse(this.responseText);
                    var tokens = json.resourceURL.split("/");
                    var index = tokens.indexOf("session");

                    mediaService._sessionID = tokens[index + 1];
                    mediaService._gwUrl += SESSION + '/' + mediaService._sessionID + '/';
                    
                    // Start polling the event channel
                    mediaService._channel = new _Channel(mediaService);
                    mediaService._channel.pollChannel();

                    //Following code used if creating a contact list and publishing upon registration is necessary
                    /**
                    if (mediaService._isSipUser) {
                        // Create a new contact list
                        mediaService._contactList = new ContactList(mediaService);
                        mediaService._contactList._url = mediaService._gwUrl;
                        mediaService._contactList.update();

                        // Publish self services
                         mediaService._publishServices();
                    }**/
                    
                    logger.log("Registration successful");
                    
                    mediaService.state = MediaServices.State.READY;
                } else {
                    logger.log("Registration unsuccessful: " + this.status + " " + this.statusText);
                    
                    switch (this.status) {
                        case 401: // 401 Unauthorized
                        case 403: // 403 Forbidden
                            _InternalError(mediaService, MediaServices.Error.INVALID_CREDENTIALS);
                            break;
                        default:
                            _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                            break;
                    }
                }
            };
        };
    };
    
    /**
    @namespace Describes the possible states of the MediaServices object.
    */
    MediaServices.State = {};
    
    /**
    The MediaServices object is initialised, but has not yet begun registration with the media gateway
    */
    MediaServices.State.INITIALISED = 0;
    
    /**
    The MediaServices object registration and authentication are in progress
    */
    MediaServices.State.REGISTERING = 1;
    
    /**
    The MediaServices object has registered and authenticated, and can now be used to create and receive media
    */
    MediaServices.State.READY = 2;
    
    /**
    The MediaServices object unregistration is in progress
    */
    MediaServices.State.UNREGISTERING = 3;
    
    /**
    The MediaServices object session has ended in a controlled and expected manner, and the object can no longer be used
    */
    MediaServices.State.CLOSED = 4;
    
    /**
    The MediaServices object session has ended abruptly, in an unexpected manner (network failure, server error, etc), and the object can no longer be used
    */
    MediaServices.State.ERROR = 5;
    
    /**
    @namespace Describes the possible errors of the MediaServices object.
    */
    MediaServices.Error = {};
    
    /**
    Generic network failure.
    */
    MediaServices.Error.NETWORK_FAILURE = 0;
    
    /**
    Registration failed due to invalid credentials. 
    */
    MediaServices.Error.INVALID_CREDENTIALS = 1;
    
    /**
    Registration failed due to invalid services. 
    */
    MediaServices.Error.INVALID_SERVICES = 2;
    
    /**
    Re-registers the client. 
    @function
    @return void
    @example
ms.reregister();
    */
    MediaServices.prototype.reregister = function() {
        var mediaService = this;
        var reregisterURL = mediaService._gwUrl + REGISTER_RESOURCE;
        
        logger.log("Reregistering...");
        
        this.state = MediaServices.State.REGISTERING;
        
        // Create a new logout request
        var req = new _CreateXmlHttpReq(this._accessToken);
        
        req.open("PUT", reregisterURL, true);
        req.setRequestHeader("X-http-method-override", "PUT");
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
        
        // On response
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                var json = JSON.parse(this.responseText);
            
                // Success response 200 OK
                if (this.status == 200) {
                    logger.log("Reregistration successful " + json.expires);
                    
                    mediaService.state = MediaServices.State.READY;
                } else {
                    logger.log("Reregistration unsuccessful: " + this.status + " " + this.statusText);
                    
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Unregisters the user from the current media service session. When completed successfully, MediaServices will change state to CLOSED.
    @function
    @return void
    @example
ms.unregister();
    */
    MediaServices.prototype.unregister = function() {
        var mediaService = this;
        var unregisterURL = mediaService._gwUrl + REGISTER_RESOURCE;
        
        logger.log("Deregistering...");
        
        this.state = MediaServices.State.UNREGISTERING;
        
        // Create a new logout request
        var req = new _CreateXmlHttpReq();
        
        req.open("DELETE", unregisterURL, true);
        req.setRequestHeader("X-http-method-override", "DELETE");
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
        
        // On response
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                mediaService._clean();                  
                mediaService.state = MediaServices.State.CLOSED;
                // Success response 204 No content
                if (this.status == 204) {
                    logger.log("Deregistration successful");
                } else {
                    logger.log("Deregistration unsuccessful: " + this.status + " " + this.statusText);
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    TODO: is this function useful?
    */
    MediaServices.prototype.anonymousSubscribe = function() {
        var mediaService = this;
        
        var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_ANONYMOUS 
            + '/' + PRESENCE_RESOURCE_USER_SUBSCRIBE;
        
        logger.log("Anonymous subscribing...");
        
        var list = [];
        
        if (this._contactList) {
            for (var i in this._contactList.contact) {
                list.push("tel:+" + this._contactList.contact[i]._id);
            }
        }
        
        if (list.length == 0) {
            logger.log("No one to subscribe to");
            return;
        }
        
        var body = {
            entities : list
        };
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 202 Accepted
                if (req.status == 202) {
                    logger.log("Anonymous subscribe successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Anonymous subscribe failed: " + json.reason);
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Obtain to the Presence information of your subscription list (contacts with follow relationship). Done automatically upon registration
    @function
    @return void
    @example
ms.subscribe();
    */
    MediaServices.prototype.subscribe = function() {
        var mediaService = this;
        
        var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_SUBSCRIBE;
        
        logger.log("Subscribing...");
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 201 Created
                if (req.status == 201) {
                    logger.log("Subscribe successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Subscribe failed: " + json.reason);
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Publish willingness, tagline and homepage
    @private
    */
    MediaServices.prototype._publish = function(presenceData) {
        var mediaService = this;
        
        var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_PUBLISH;
        
        logger.log("Publishing services...");
        
        var body = {
            person : presenceData
        };
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 201 Created
                if (req.status == 201) {
                    logger.log("Publish services successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Publish services failed: " + json.reason);
                    
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Set the avatar for self.
    @function
    @param {File} avatar Image avatar file 
    @param {Function} [callback] Success/failure callback function
    @throws {TypeError} Invalid avatar file
    @return void
    @example
var avatar = document.getElementById("avatar");
ms.setAvatar(avatar.files[0], function(evt) {
    if (evt.success == true) {
        // Set avatar successful
    } else if (evt.failure == true) {
        // Set avatar unsuccessful
    }
});
    */
    MediaServices.prototype.setAvatar = function(avatar, callback) {
        if (!(avatar instanceof File)) {
            throw new TypeError("Invalid avatar file");
        }
        if (avatar.type.indexOf("image") != 0) {
            throw new TypeError("Invalid avatar file");
        }
    
        var url = this._gwUrl + CONTENT_RESOURCE + '/' + CONTENT_RESOURCE_SETAVATAR;
        
        var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
        body.append("Filename", avatar.name);
        body.append("ClientId", this._sessionID);
        body.append("Filedata", avatar);
        body.append("Upload", "Submit Query");
        
        // Create and send a set avatar request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(body);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                
                switch (req.status) {
                    // Success response 201 Created (no previous avatar)
                    case 201:
                    // Success response 204 No Content
                    case 204:
                        logger.log("Set avatar successful");
                        status = true;
                
                        if (typeof(callback) == "function") {
                            var event = {success : true, failure: false};
                            callback(event);
                        }
                        break;
                    default:
                        var json = JSON.parse(req.responseText);
                        logger.log("Set avatar failed: " + json.reason);
                        
                        if (typeof(callback) == "function") {
                            var event = {success : false, failure: true};
                            callback(event);
                        }
                        break;
                }
            }
        };
    };
    
    /**
    Delete the avatar for self.
    @function
    @return void
    @example
ms.deleteAvatar();
    */
    MediaServices.prototype.deleteAvatar = function() {
        var mediaService = this;
        
        var url = this._gwUrl + CONTENT_RESOURCE + '/' + CONTENT_RESOURCE_DELETEAVATAR;
        
        // Create and send a set avatar request
        var req = new _CreateXmlHttpReq();
        
        req.open("DELETE", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success respone 204 No Content
                if (req.status == 204) {
                    logger.log("Delete avatar successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Delete avatar unsuccessful" + json.reason);
                    
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Publish services. Done automatically upon successful registration.
    TODO: keep this private? We only publish the services the user used on registration.
    @private
    */
    MediaServices.prototype._publishServices = function() {
        var mediaService = this;
        
        var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_PUBLISH;
        
        logger.log("Publishing services...");
        
        var _services = [];
        var tokens = this.mediaType.replace(/(\s)/g, "").split(",");
        
        // Check which services the user registered with and publish those
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] == "audio") {
                var service = SERVICE.VOICE_CALL;
                service.serviceStatus = "open";
                _services.push(service);
            } else if (tokens[i] == "video") {
                var service = SERVICE.VIDEO_CALL;
                service.serviceStatus = "open";
                _services.push(service);
            } else if (tokens[i] == "ftp") {
                var service = SERVICE.FILE_TRANSFER;
                service.serviceStatus = "open";
                _services.push(service);
            } else if (tokens[i] == "chat") {
                var service = SERVICE.MESSAGING_SESSION_MODE;
                service.serviceStatus = "open";
                _services.push(service);
            } else {
                // Invalid service
                _services = [];
                break;
            }
        }
        
        if (_services.length < 1) {
            throw new Error("Invalid user services");
        }
        
        var body = {
            services : _services
        };
        
        // Create and send a publish services request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 201 Created
                if (req.status == 201) {
                    logger.log("Publish services successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Publish services failed: " + json.reason);
                    
                    _InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Clean parameters on deregistration.
    @private
    */
    MediaServices.prototype._clean = function() {
        // Clear channel
        this._channel = null;
        
        // Clear peer connection
        if (this._call) {
            if (this._call._pc && this._call._pc.close) {
                this._call._pc.close();
                this._call._pc = null;
            }
            delete this._call;
            this._call = null;
        }
        
        // Clear the FileTransfer hashmap
        if (this._ftp) {
            this._ftp.clear();
            delete this._ftp;
            this._ftp = null;
        }
        
        // Clear contact list
        if (this._contactList) {
            delete this._contactList;
            this._contactList = null;
        }
        
        // Clear Chat hashmap
        if (this._chat) {
            this._chat.clear();
            delete this._chat;
            this._chat = null;
        }
    };
    
    /**
    Creates a new outgoing call object to a given recipient. The Call will be initialised, but will not ring until the {@link OutgoingCall#ring} method is called.
    @function
    @param {String} recipient An identifier denoting the callee. This can be a WebID, a SIP URI or a tel: URI
    @param {Object} [mediaType] Defines the getUserMedia() type of the Call. If specified, must be of format {audio:true} or {video:true} or {audio:true,video:true}. If unspecified, inherits the full set of media types of the MediaServices object.
    @return {OutgoingCall} A newly initialised OutgoingCall object
    @throws {Error} Recipient must be defined, and must be a string
    @throws {Error} Invalid media types
    @example
var call = ms.createCall("user2", {video:true});
call.onaddstream = function(evt) {};
call.onbegin = function(evt) {};
call.onend = function(evt) {};
call.onerror = function(evt) {};
call.onremovestream = function(evt) {};
call.onstatechange = function(evt) {};
call.ring();
    */
    MediaServices.prototype.createCall = function(recipient, mediaType) {
        if (typeof(recipient) != "string" || recipient == "")
            throw new Error("Recipient must be defined, and must be a string");
        logger.log("MediaServices.prototype.createCall.... " );
        mediaType = _ParseMediaType(this, mediaType);
        
        this._call = new OutgoingCall(this, recipient, mediaType);
        this._call._isModerator = true;
        this._call._url = this._gwUrl + AUDIOVIDEO_RESOURCE;
        
        return this._call;
    };

    /**
    Create transfer call...
    @private    
    */
    MediaServices.prototype._createTransferCall = function(recipient) {
        logger.log("MediaServices.prototype.createTransferCall.... " );
        this._transferTargetCall = new OutgoingCall(this, recipient, this._call.mediaType);
        this._transferTargetCall._url = this._gwUrl + AUDIOVIDEO_RESOURCE;
        this._transferTargetCall._isModerator = true;

        return this._transferTargetCall;
    };

    /**
    Creates a new conference object. The Conference object will be ready to begin, join or query.
    @function
    @param {String} [mediaType] Specifies the getUserMedia() type of the conference. If specified, must be of format {audio:true} or {video:true} or {audio:true,video:true}. If unspecified, inherits the full set of media types of the MediaServices object.
    @param {String} [confID] Identifies the conference ID to be joined (if already existing). If this parameter is absent, a new conference must be created but not joined.
    @return {Conference} A newly initialised Conference object
    @throws {Error} The conference must be named
    @throws {Error} Invalid media types
    @example
var conf = ms.createConference({audio:true});
conf.onaddstream = function(evt) {};
conf.onbegin = function(evt) {};
conf.onend = function(evt) {};
conf.onerror = function(evt) {};
conf.onremovestream = function(evt) {};
conf.onstatechange = function(evt) {};
conf.begin();
    */
    MediaServices.prototype.createConference = function(mediaType, confID) {
        mediaType = _ParseMediaType(this, mediaType);
        
        var url = this._gwUrl + CONFERENCE_RESOURCE;

        this._call = new Conference(this, confID, url, mediaType);
        this._call._isModerator = true;
        
        return this._call;
    };
    
    /**
    Creates a new OutgoingFileTransfer object to a destination user.
    @function
    @param {String} destination The recipient of this file transfer. The destination has to be a Tel URI (e.g. tel:+491728885008) or Sip URI (e.g. sip:491728885008@mns.ericsson.ca).
    @return {OutgoingFileTransfer} A new OutgoingFileTransfer object
    @throws {Error} Invalid destination
    @example
var ftp = service.createFileTransfer("tel:+491728885008");
ftp.onstatechange = function(evt) {};
ftp.onerror = function(evt) {};
ftp.onuploadprogress = function(evt) {};
ftp.sendFile(file.files[0]);
    */
    MediaServices.prototype.createFileTransfer = function(destination) {
        if (typeof(destination) != "string" || destination == "")
            throw new Error("Invalid destination");
        
        var ft = new OutgoingFileTransfer(this, destination);
        ft._url = this._gwUrl + FILETRANSFER_RESOURCE;
        
        return ft;
    };
    
    /**
    Creates a new chat session with a given recipient. The Chat object will be initialised.
    @function
    @param {String} recipient An identifier denoting the recipient of the message. This can be a WebID, a SIP URI or a TEL URI.
    @return {Chat} A newly initialised Chat object.
    @throws {Error} Invalid recipient
    @example
var chat = service.createChat("sip:491728885004@mns.ericsson.ca");
chat.onbegin = function(evt) {};
chat.onmessage = function(evt) {};
chat.oncomposing = function(evt) {};
chat.onerror = function(evt) {};
chat.onstatechange = function(evt) {};
    */
    MediaServices.prototype.createChat = function(recipient){
        if (typeof(recipient) != "string" || recipient == "" || recipient == this.username)
            throw new Error("Invalid recipient");
        
        var chat = new Chat(this, recipient);
        
        chat._url = this._gwUrl + CHAT_RESOURCE;
        
        return chat;
    };
    
        /**
    Sends an instant message.
    @function
    @param {String} recipient An identifier denoting the recipient of the message. This can be a WebID, a SIP URI or a TEL URI.
    @param {String} The body of the message.
    @return void
    @throws {Error} Invalid recipient
    @example
var chat = service.createChat("sip:491728885004@mns.ericsson.ca");
chat.onbegin = function(evt) {};
chat.onmessage = function(evt) {};
chat.oncomposing = function(evt) {};
chat.onerror = function(evt) {};
chat.onstatechange = function(evt) {};
    */
    MediaServices.prototype.sendIM = function(recipient, body){
        if (typeof(recipient) != "string" || recipient == "" || recipient == this.username)
            throw new Error("Invalid recipient");

        if(!body || typeof(body) != "string"){
            throw new Error("No body");
        }
        
        logger.log("Sending IM...");
        
        var messageURL = this._gwUrl + "message/send";
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();  
        var message = {
            to : recipient,
            body : body,
            contentType : "text/plain",
            type : "message"
        };
            
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {          
                if (req.status == 204) {
                    logger.log("Send IM successful");
                } else {
                    _InternalError(this, MediaServices.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Creates a new group chat object with a given subjet and a list of members. Invitations to join the group chat will be sent upon calling {GroupChat#start}.
    @function
    @param {String} subject The subject title of this group chat conference
    @param {Array} members A list of members to be invited to this group chat session
    @return {GroupChat} A newly initialised GroupChat object.
    @throws {Error} Invalid subject
    @throws {Error} Invalid recipients
    @throws {Error} No recipients
    @example
var groupchat = service.createGroupChat("This is a new group chat!", ["sip:491728885004@mns.ericsson.ca", "sip:491728885005@mns.ericsson.ca"]);
groupchat.onbegin = function(evt) {};
groupchat.onmessage = function(evt) {};
groupchat.oncomposing = function(evt) {};
groupchat.onerror = function(evt) {};
groupchat.onstatechange = function(evt) {};
groupchat.onupdate = function(evt) {};
groupchat.onend = function(evt) {};
groupchat.start();
    */
    MediaServices.prototype.createGroupChat = function(subject, members) {
        if (typeof(subject) != "string" || subject == "") {
            throw new Error("Invalid subject");
        }
        if (typeof(members) != "object" || !members || members.length == 0) {
            throw new Error("Invalid recipients");
        }
        
        if (members.indexOf(this.username) > -1) {
            members.splice(members.indexOf(this.username), 1);
            if (members.length == 0)
                throw new Error("No recipients");
        }
        
        var groupChat = new GroupChat(this, subject, members, this.username);
        
        groupChat._url = this._gwUrl + GROUP_CHAT_RESOURCE;
        groupChat._isOwner = true;
        
        return groupChat;
    };
    
    // Callback functions for MediaServices
    /**
    Called when the MediaServices object is ready to use.
    @event 
    @type function
    @param evt
    @example
ms.onready = function(evt) {
    // Media service is ready to use.
};
    */
    MediaServices.prototype.onready = function(evt){}; // The MediaServices object is ready to use
    
    /**
    Called when MediaServices has encountered an error
    @event 
    @type function
    @param evt Error event
    @param {String} evt.type "error"
    @param {MediaServices.Error} evt.reason Error code
    @param {MediaServices} evt.target Proximal event target
    @example
var ms = new MediaServices(...);
ms.onerror = function(evt) {
    switch (evt) {
        case MediaServices.Error.NETWORK_FAILURE:
            // Handle
            break;
        case MediaServices.Error.INVALID_CREDENTIALS:
            // Handle
            break;
        // ...
    }
};
    */
    MediaServices.prototype.onerror = function(evt){}; // An error occurred. See the event for details.
    
    /**
    Called when the MediaServices object has closed in an orderly fashion.
    @event 
    @type function
    @param evt
    @example
ms.onclose = function(evt) {
    // Media service has closed properly.
};
    */
    MediaServices.prototype.onclose = function(evt){}; // The session has ended and this MediaServices object is no longer available to use
    
    /**
    Called when MediaServices changes its state.
    @event
    @type function
    @param evt Event describing the state change
    @param {Call.State} evt.newState New state
    @param {Call.State} evt.oldState Old state
    @example
ms.onstatechange = function(evt) {
    switch (evt.newState) {
        case MediaServices.State.INITIALISED:
            // Call state has changed to READY
            break;
        case MediaServices.State.REGISTERING:
            // Call state has changed to ENDED
            break;
        // ...
    }
};
    */
    MediaServices.prototype.onstatechange = function(evt){}; // The MediaServices object has changed state
    
        /**
    Called when the MediaServices has and instant Message (IM) event.
    @event 
    @type function
    @param evt
    @example
ms.onimresult = function(evt) {
    // Media service is ready to use.
};
    */
    MediaServices.prototype.oninstantmessage = function(evt){}; // The MediaServices object is ready to use
    
    /**
    Called when the MediaServices object receives a remote media event such as an incoming call, a conference invitation, a file transfer request, a chat message or a group chat request.
    @event
    @type function
    @param evt
    @param {IncomingCall} evt.call An IncomingCall object
    @param {Conference} evt.conf A Conference object
    @param {IncomingFileTransfer} evt.ftp An IncomingFileTransfer object
    @param {Chat} evt.chat A Chat object
    @param {GroupChat} evt.groupChat A GroupChat object
    @example
ms.oninvite = function(evt) {
    if (evt.call) {
        // We have an incoming call
        // This is a regular IncomingCall object that can be freely manipulated.
        evt.call.answer();
    } else if (evt.conf) {
        // Invited to a conf
        evt.conf.join();
    } else if (evt.ftp) {
        evt.ftp.accept();
        // or
        evt.ftp.cancel();
    } else if (evt.chat) {
        evt.chat.onbegin = function() {};
        evt.chat.onmessage = function() {};
    } else if (evt.groupChat) {
        evt.groupChat.accept();
        // or
        evt.groupChat.decline();
    }
};
    */
    MediaServices.prototype.oninvite = function(evt){}; // An invitation to a call/conference has been received
    
    /**
    Call is a generic handler for calls. The abstract Call object handles signaling and termination of calls. These calls
    can be sessions to a conference or to another user. This is a private constructor.
    @class Call is a generic handler for calls and includes all methods for dealing with an ongoing call. The abstract Call 
    object can handle signaling and termination of calls.  These calls can be sessions to a conference or to another user. 
    For outgoing calls to other recipients, see {@link OutgoingCall}. For incoming calls from other users, see {@link IncomingCall}. <br />
    @property {Call.state} state The call's current state (read only).
    @property {MediaStream[]} localStreams Contains a list of local streams being sent on this call (read only).
    @property {MediaStream[]} remoteStreams Contains a list of remote streams being received on this call (read only).
    @property {String} mediaType Type of media for this call. This field can be changed until media has been established.
    @param {MediaServices} mediaServices The object that created this Call object.
    @param {String} recipient Call recipient
    @param {String} mediaType Media types supported in this call (e.g. "audio", "video" or "audio,video").
    */
    Call = function(mediaServices, recipient, mediaType) {
        var _state= Call.State.READY;
        
        /**
        @field mediaType
        Call media type 
        */
        Object.defineProperty(this, "mediaType", {
            get: function() { return mediaType; },
            set: function(newType) { 
                if (this._pc != null) 
                    throw "Cannot change media type after established media.";
                mediaType = newType;
            }
        });

        /**
        @field state
        Call state
        */
        Object.defineProperty(this, "state", {
            get: function()
            {
                return _state;
            },
            
            set: function(newState)
            {
                _state = newState;
                
                var evt = {type: "statechange", oldState : _state, state: newState};
                if (typeof(this.onstatechange) == "function") {
                    this.onstatechange(evt);
                }                   
                
                // Dispatch appropriate states
                switch (newState) {
                    case Call.State.RINGING:
                        if (this instanceof IncomingCall) {
                            var evt = { call: this, conf: null };
                            if (typeof(mediaServices.oninvite) == "function") { mediaServices.oninvite(evt); }
                        }
                        break;
                    case Call.State.ONGOING:
                    case Conference.State.IN_PROGRESS:
                        if (typeof(this.onbegin) == "function") { this.onbegin(evt); }
                        break;
                    default:
                        break;
                }
            }
        });

        /**
        @field remoteStreams
        Remote streams of the call
        */
        Object.defineProperty(this, "remoteStreams", {
            get: function() {
                if (this._pc) { return this._pc.remoteStreams; }
                else { return []; }
            }
        });

        /**
        @field localStreams
        Local streams of the call
        */
        Object.defineProperty(this, "localStreams", {
            get: function() {
                if (this._pc) { return this._pc.localStreams; }
                else { return []; }
            }
        });
        
        /**
        Call/conference recipients
        @private
        */
        this.recipient = recipient;
        
        /**
        Media service object
        @private
        */
        this._mediaServices = mediaServices;
        
        /**
        is RTC peer connection (JSEP latest)
        @private
        */
        this.isRTCConnection = true;
        
        /**
        Base URL including session ID ("baseURL"/"sessionID"/)
        @private
        */
        this._url = null;
        
        /**
        Session modification ID
        @private
        */
        this._modID = null;
                        
        /**
        Role of the user (Moderator or Normal user)
        @private
        */
        this._isModerator = null;

        /**
        Role of the user (Moderator or Normal user)
        @private
        */
        this._isModifModerator = null;

        /**
        A reference to the local PeerConnection object. The call re-exposes the relevant elements.
        @private
        */
        this._pc = null;
        
        /**
        Current call ID
        @private
        */
        this._callID = null;
        
        /**
        Remote SDP object
        @private
        */
        this._sdp = {};
        
        /**
        Array of Ice candidates
        @private
        */
        this._candidates = [];
        
        /**
        Has OFFER been sent
        @private
        */
        this._isSignalingSent = false;
        
        /**
        Mod ID
        @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
        @private
        */
        this._DEPRECATEDmodID = null;
        
        /**
        ROAP handling object
        @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
        @private
        */
        this._DEPRECATEDroap = new _DEPRECATEDRoap();
        return this;
    };
    
    /**
    @namespace Describes the possible states of the call object.
    */
    Call.State = {};
    
    /**
    Notifies that call object is ready for outgoing calls
    */
    Call.State.READY = 0;
    
    /**
    Notifies that call object is ringing; an incoming call needs to be answered or an outgoing call needs the remote side to answer
    */
    Call.State.RINGING = 1;
    
    /**
    Notifies that call object is in progress and media is flowing
    */
    Call.State.ONGOING = 2;
    
    /**
    Notifies that call object is on hold.
    */
    Call.State.HOLDING = 5;
    
    /**
    Notifies that call was put on Hold by the other side.
    */
    Call.State.WAITING = 6;
    
    /**
    Notifies that call object is in transition.
    */
    Call.State.TRANSITION = 7;
    
    /**
    Notifies that call object has ended normally; the call was terminated in an expected and controlled manner
    */
    Call.State.ENDED = 3;
    
    /**
    Notifies that call object has ended with an error; the call was terminated in an unexpected manner (see {@link Call.Error} for more details)
    */
    Call.State.ERROR = 4;
    
    /**
    @namespace Describes the possible errors of the call object.
    */
    Call.Error = {};
    
    /**
    General network failure
    */
    Call.Error.NETWORK_FAILURE = 0;
    
    /**
    Peer Connection setup failure
    */
    Call.Error.PEER_CONNECTION = 1;
    
    /**
    Webkit media error
    */
    Call.Error.USER_MEDIA = 2;
    
    /**
    Invalid user error
    */
    Call.Error.INVALID_USER = 3;    
    
    Call.prototype.isConference = function() { return false;};
    
    /**
    Gets the string representing the State ID. This can be called at any time and is useful for debugging
    @return {String} State A string representing the state of the Call 
    @example
call.getStringState();
    */
    Call.prototype.getStringState = function() {
    switch (this.state) {
    case Call.State.READY:
        return "READY";
        break;
    case Call.State.RINGING:
        return "RINGING";
        break;
    case Call.State.ONGOING:
        return "ONGOING";
        break;
    case Call.State.HOLDING:
        return "HOLDING";
        break;
    case Call.State.TRANSITION:
        return "TRANSITIONING";
        break;
    case Call.State.WAITING:
        return "WAITING";
        break;
    case Call.State.ENDED:
        return "ENDED";
        break;
    default:
        return "ERROR";
        break;
    }
    };

    /**
    Creates a Peer Connection and triggers signaling when ready
    @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
    @private
    */
    Call.prototype._DEPRECATEDcreatePeerConnection = function(callback, roapMessage) {
        var mt = this;
        
        navigator.webkitGetUserMedia('audio, video', function(stream) {
            var turnConf= mt._mediaServices.turnConfig.replace('stun:', 'STUN '); 
            try {
                mt._pc = new webkitDeprecatedPeerConnection(turnConf, function(sig) {
                
                    logger.log("turnConfig: " + turnConf + "   sig: " + sig);
                    mt._DEPRECATEDsendSignaling(sig, function(event) {
                        if (typeof(callback) == "function") {
                            callback(event);
                        }
                    });
                });
            } catch (e) {   
                mt._pc = new webkitPeerConnection00(turnConf, function(sig) {
                    logger.log("turnConfig: " + turnConf + "   sig: " + sig);
                    mt._DEPRECATEDsendSignaling(sig, function(event) {
                        if (typeof(callback) == "function") {
                            callback(event);
                        }
                    });
                });
            }
            
            // Add the local stream
            mt._pc.addStream(stream);
            
            // Propagate the event
            mt._pc.onaddstream = function(evt) { if (typeof(mt.onaddstream) == "function") { evt.call = mt; mt.onaddstream(evt);} };
            mt._pc.onremovestream = function(evt) { logger.log("ONREMOVESTREAM"); if (typeof(mt.onremovestream) == "function")  { evt.call = mt; mt.onremovestream(evt);} };
            mt._pc.onclose = function() { mt.onend(); };
            mt._pc.onopen = function() { mt.state = Call.State.ONGOING; };
            logger.log("Event propagated");
            
            if (roapMessage) {
                // Signal the ANSWER
                mt._pc.processSignalingMessage(roapMessage);
            }
        }, function(error) {
            logger.log("Error obtaining user media: " + error.toString());
            
            var callType = (mt instanceof Conference) ? Conference : Call;
            _InternalError(mt, callType.Error.USER_MEDIA);
        });
    };
    
    /**
    H2S signalling
    @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
    @private
    */
    Call.prototype._DEPRECATEDsendSignaling = function(sig, callback) {
        var _call = this;
        
        var roap = this._DEPRECATEDroap.parseROAP(sig);
        var url = this._url;
        var callType = (_call instanceof Conference) ? Conference : Call;
        logger.log("Roap Message Type: " + roap.messageType);
        if (roap.messageType == "OFFER") {
            logger.log("Got OFFER");
            
            if (this instanceof Conference && !this.confID) {
                // Starting a new conference
                var req = new _CreateXmlHttpReq();
                
                req.open("POST", url, true);
                req.setRequestHeader("Content-Type", "application/json");
                req.setRequestHeader("Accept", "application/json, text/html");
                req.send(JSON.stringify(roap.SDP, null, " "));
                req.onreadystatechange = function() {
                    if (req.readyState == 4) {
                        
                        var json = JSON.parse(req.responseText);
                        
                        // Success response 202 Accepted
                        if (req.status == 202) {
                            // Get the conference ID
                            var tokens = json.resourceURL.split("/");
                            var index = tokens.indexOf("mediaconf");
                            _call.confID = tokens[index + 1];
                            
                            var event = {success : true, failure: false};
                            callback(event);
                        } else {
                            var event = {success : false, failure: true};
                            callback(event);
                        }
                    }
                };
            } else {
                // Audio video invite
                var body = {
                    to : this.recipient,
                    sdp : roap.SDP.sdp,
                    v : roap.SDP.sdp.v,
                    o : roap.SDP.sdp.o,
                    s : roap.SDP.sdp.s,
                    t : roap.SDP.sdp.t
                };
                
                var req = new _CreateXmlHttpReq();
                if(!_call._isModerator){
                    //var wcgSdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
                    for(mediaIndex in roap.SDP.sdp) {
                       if(roap.SDP.sdp[mediaIndex].c == ""){
                          roap.SDP.sdp[mediaIndex].c= "IN IP4 10.10.0.55";
                       }
                    }

                    body.v= "0";
                    body.o= "- 0 0 IN IP4 127.0.0.1";
                    body.s= "";
                    body.t= "0 0";
                    
                    url= url + "/mod";
                }               
                
                var stringBody= JSON.stringify(body, null, " ");
                stringBody= stringBody.replace("RTP/AVPF", "RTP/AVP");
                stringBody= stringBody.replace("ulpfec", "H264");
                logger.log("about to send SDP: " + stringBody);

                req.open("POST", url, true);
                req.setRequestHeader("Content-Type", "application/json");
                req.setRequestHeader("Accept", "application/json, text/html");
                req.send(stringBody);
            
                // On response
                req.onreadystatechange = function() {
                    if (req.readyState == 4) {
                        var json = JSON.parse(req.responseText);
                        
                        // Success response 202 Accepted
                        if (req.status == 202 || req.status == 201) {
                            logger.log("Audio video invite: " + json.state);
                        } else {
                            logger.log("Audio video invite unsuccessful: " + req.status + " " + json.reason);
                            
                            if (req.status == 400) {
                                throw new Error("User not found");
                            } else {
                                _InternalError(_call, callType.Error.NETWORK_FAILURE);
                            }
                        }
                    }
                };
            }
        } else if (roap.messageType == "ANSWER") {
            logger.log("Got ANSWER");
            
            if (this._modID) {
                url += "/mod/" + this._modID;
            }
            
            var req = new _CreateXmlHttpReq();
                            
            var stringBody= JSON.stringify(roap.SDP, null, " ");
            stringBody= stringBody.replace("RTP/AVPF", "RTP/AVP");
            stringBody= stringBody.replace("ulpfec", "H264");
            logger.log("about to send SDP: " + stringBody);

            req.open("POST", url, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/html");
            req.send(stringBody);
            
            // On response
            req.onreadystatechange = function() {
                if (this.readyState == 4) {
                    var json = JSON.parse(req.responseText);
                    
                    // Success response 200 OK
                    if (req.status == 200) {
                        logger.log("Accept invite: " + json.state);
                    } else {
                        logger.log("Accept invite unsuccessful: " + json.reason);
                        _InternalError(_call, callType.Error.NETWORK_FAILURE);
                    }
                }
            };
        } else if (roap.messageType == "OK") {
            logger.log("Got OK");
            
            if (_call instanceof Conference) {
                _call.state = callType.State.IN_PROGRESS;
            } else {
                _call.state = callType.State.ONGOING;
            }
        } else {
            logger.log("Got ERROR");
            logger.log(roap);
            throw new Error("Failed to setup peer connection");
        }
    };

    /**
    Terminates all media in the call. This can be called at any time
    @return void
    @throws {Error} No active call to end
    @example
call.end();
    */
    Call.prototype.end = function() {
        var _call = this;
        var audiovideoURL = this._url;
        
        logger.log("Leaving call...");
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        req.open("DELETE", audiovideoURL, true);
        req.setRequestHeader("X-http-method-override", "DELETE");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No content
                if (req.status == 204) {
                    logger.log("Leave call successful");
                    
                    // Clear moderator flag
                    _call._isModerator = null;
                    _call._callID = null;

                    _call.state = Call.State.ENDED;
                    if (typeof(_call.onend) == "function") { 
                        _call.onend({reason: "Call terminated"}); 
                    }
                      
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Leave call unsuccessful: " + json.reason);
                    
                    // 403 Forbidden, Call-ID does not exist
                    if (req.status == 403) {
                        throw new Error("No active call to end");
                    } else {
                        _InternalError(_call, Call.Error.NETWORK_FAILURE);
                    }
                }
            }
        };
        
        _call._modID= null;
        if (this._pc && this._pc.close)
            this._pc.close();
        this._pc = null;
    };
    
    function _updateSdp(sdp, oldString, newString) {    
        var indexof= sdp.indexOf(oldString);
        if(indexof > 0){
            var prefix= sdp.substr(0, indexof);
            var remaining= sdp.substr(indexof + oldString.length);
            return prefix + newString + remaining;
        } else {
            return sdp;
        }
    };

    /**
    Put the call on hold. This can be called at any time
    @return void
    @throws {Error} No active call to hold
    @example
call.hold();
    */
    Call.prototype.hold = function() {
        if(this.state == Call.State.ONGOING){
            logger.log("Put call on hold...");
            this._modify("hold");
        }
    };
    
    /**
    Resume the call. This can be called at any time
    @return void
    @throws {Error} No active call to resume
    @example
call.resume();
    */
    Call.prototype.resume = function() {
        if(this.state == Call.State.HOLDING){
            logger.log("Resume the call...");
            this._modify("resume");
        }
    };
    
    /**
    Modify the call.
    @private
    */
    Call.prototype._modify = function(action) {

        var _call = this;
        var audiovideoURL = this._url + '/mod';
        _call._pc.createOffer(function(sdp){
            console.log("Mod SDP offer from Browser = " + sdp.sdp);
            _call._sdp.sdp = sdp.sdp;

            _call._isModifModerator= true;
            var req = new _CreateXmlHttpReq();
            var newsdp;

            if(action == "resume"){
                newsdp= _updateSdp(_call._sdp.sdp, "sendonly", "sendrecv"); //audio
                newsdp= _updateSdp(newsdp, "sendonly", "sendrecv"); //video
            } else {
                newsdp= _updateSdp(_call._sdp.sdp, "sendrecv", "sendonly"); //audio
                newsdp= _updateSdp(newsdp, "sendrecv", "sendonly"); //video
            }
            
            if(_call.mediaType.video){
                //keep video
            } else {
                newsdp= _stripVideoPart(newsdp);
            }

            _call._sdp.sdp = newsdp;
            var descriptor = {
                sdp: newsdp,
                type: "offer"
            };
            
            var modifyLocalDescriptor= new RTCSessionDescription(descriptor,
                function(){ console.log("Success Local RTCSessionDescription");},
                function(err){ console.log("Err Local RTCSessionDescription " + err);});                                        
                    
            _call._pc.setLocalDescription(modifyLocalDescriptor);
            var body = _ParseSDP(null, newsdp);
                  
            req.open("POST", audiovideoURL, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/html");
            req.send(JSON.stringify(body, null, " "));
        
            // On response
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    // Success response 204 No content
                    if (req.status >= 200 && req.status <= 204) {
                    logger.log(action + " call in transition...waiting for ack");   
                    _call.state = Call.State.TRANSITION;
                    
                    /**if(action == "resume"){
                        _call._pc.localStreams[0].audioTracks[0].enabled = true;
                        if(_call._pc.localStreams[0].videoTracks && _call._pc.localStreams[0].videoTracks.length > 0){
                            _call._pc.localStreams[0].videoTracks[0].enabled = true;
                        }
                    } else {
                        
                        _call._pc.localStreams[0].audioTracks[0].enabled = false;
                        if(_call._pc.localStreams[0].videoTracks && _call._pc.localStreams[0].videoTracks.length > 0){
                            _call._pc.localStreams[0].videoTracks[0].enabled = false;
                        }
                    }**/
                    
                    
                    } else {
                        var json = JSON.parse(req.responseText);
                        logger.log(action + " call unsuccessful: " + json.reason);
                        
                        // 403 Forbidden, Call-ID does not exist
                        if (req.status == 403) {
                            throw new Error("No active call to end");
                        } else {
                            _InternalError(_call, Call.Error.NETWORK_FAILURE);
                        }
                    }
                }
            };
                
            }, 
            function(err){ console.log("Err answer " + err);}, 
            _call.mediaType);
    };
    
    function incrementSdpVersion(sdp){
        var oLineBeginIndex= sdp.indexOf("o=");
        var before= sdp.substr(0, oLineBeginIndex);
        var oLine= sdp.substr(oLineBeginIndex);
        var oLineEndIndex= oLine.indexOf("\r\n");
        var after= oLine.substr(oLineEndIndex);
        oLine= oLine.substr(0, oLineEndIndex);
        var o_values = oLine.split(" ");
        o_values[2] ++;
        return before + o_values.join(" ") + after;
    }
    
    function delayTransferBecauseOfMTASBug(_call, transferToCall, event){
        console.log("Performing transfer from " + _call._callID  + " to " + transferToCall._callID);
        var audiovideoURL = _call._url + '/transfer/' + transferToCall._callID;
        
        var req = new _CreateXmlHttpReq();
        req.open("POST", audiovideoURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No content
                if (req.status >= 200 && req.status <= 204) {
                    logger.log("Sending transfer request");                 
                } else {
                    var reason= "unknown, status= " + req.status;
                    if(req.responseText != "") {reason = JSON.parse(req.responseText).reason;}                      
                    logger.log("Transfer call unsuccessful: " + reason);
                    transferToCall.end();
                    throw new Error("Fail to transfer the call to " + transferaddress);
                }
            }
        };
    }
    
    /**
    Transfer the call to another address. This can be called at any time
    @return void
    @throws {Error} No active call to transfer
    @example
call.transferto(transferaddress);
    */
    Call.prototype.transferto = function(transferaddress) {

        var _call = this;
        if(_call.state != Call.State.HOLDING){
            console.log("Call is not on hold cannot transfer.");
        }
        
        //Make second call to transferaddress
        transferToCall = _call._mediaServices._createTransferCall(transferaddress);
        transferToCall.onaddstream = function (event) {console.log("Got transferTarget media stream");};
        transferToCall.onbegin = function (event) {
            console.log("TransferTarget connected");
            setTimeout(delayTransferBecauseOfMTASBug, 6000, _call, transferToCall, event);
        };
        transferToCall.onend = function (event) {console.log("TransferTarget call has ended.");};
        transferToCall.onerror = function (event) {console.log("TransferTarget call error ending transfer."); transferToCall.end();};
        transferToCall.onremovestream = function(event){};
        transferToCall.onstatechange =  function(event){console.log("TransferTarget new state " + transferToCall.getStringState());};
        transferToCall.ring();
    };

    function _stripVideoPart(sdp) { 
        var indexof= sdp.indexOf("m=video");
        if(indexof > 0){
            return sdp.substr(0, indexof);
        } else return sdp;
    }
    
    var nCand = 0;
    var sendTimer = -1;
    function sendSdp(mt) {
        if (!mt._isSignalingSent) {
            mt._isSignalingSent = true;
            console.log("SDP answer from Browser = " +  mt._pc.localDescription.sdp);
            sendTimer = -1;
            if(mt.mediaType.video){
                mt._sdp.sdp= mt._pc.localDescription.sdp;
            } else {
                mt._sdp.sdp= _stripVideoPart( mt._pc.localDescription.sdp);
                var descriptor = {
                    sdp: mt._sdp.sdp,
                    type: mt._pc.localDescription.type
                };
                
                var modifyLocalDescriptor= new RTCSessionDescription(descriptor,
                    function(){ console.log("Success Local RTCSessionDescription");},
                    function(err){ console.log("Err Local RTCSessionDescription " + err);});                                                    
                mt._pc.setLocalDescription(modifyLocalDescriptor);
            }
            mt._sendSignaling(mt._pc.localDescription.type, mt._sdp.sdp);
        }
    }

    /**
    Creates a Peer Connection and triggers signaling when ready
    @private
    */
    Call.prototype._createPeerConnection = function(callback) {
        var mt = this;
        logger.log("in createPeerConnection " + callback);
        
        // Get the user's media
        navigator.webkitGetUserMedia(mt.mediaType, function(stream) {
            try {
               console.log("Turnconfig: " + mt._mediaServices.turnConfig);
                //var pc_config = {"iceServers": [{"url": mt._mediaServices.turnConfig}]};
                pc_config = {};
                pc_config.iceServers = [{"url": mt._mediaServices.turnConfig, "credentials" : null}];
                mt._pc = new webkitRTCPeerConnection(pc_config);
                mt._pc.onicecandidate= function(event) {
                    // Get all candidates before signaling
                    if (event.candidate != null) {
                        console.log("onicecandidate called: " + JSON.stringify(event.candidate));
                        nCand++;
                        console.log("nr of gathered candidates: " + nCand);
                        if (sendTimer == -1) sendTimer = setTimeout(sendSdp, 5000, mt);
                    } else if (!mt._isSignalingSent) {
                        clearTimeout(sendTimer);
                        sendSdp(mt);
                    } else {
                    mt._pc.onicecandidate= {};
                    }
                };
            } catch (e) {
                console.log("catched exception in webkitGetUserMedia callback function: " + e.message);
                mt.isRTCConnection= false;
                var turnConf= mt._mediaServices.turnConfig.replace('stun:', 'STUN ') ;
                // Create new PeerConnection
                mt._pc = new webkitPeerConnection00(turnConf, function(candidate, moreToFollow) {
                    // Get all candidates before signaling
                    if (candidate) {
                        mt._sdp.sdp.addCandidate(candidate);
                    }
                    
                    if (!moreToFollow && !mt._isSignalingSent) {
                        mt._sendSignaling(mt._sdp.type, mt._sdp.sdp.toSdp());                       
                        mt._isSignalingSent = true;
                    }
                });

            }

            // Add the local stream
            mt._pc.addStream(stream);
            
            // Propagate the event
            mt._pc.onaddstream = function(evt) { if (typeof(mt.onaddstream) == "function") { evt.call = mt; mt.onaddstream(evt);} };
            mt._pc.onremovestream = function(evt) { logger.log("ONREMOVESTREAM"); if (typeof(mt.onremovestream) == "function")  { evt.call = mt; mt.onremovestream(evt);} };
            mt._pc.onclose = function() { mt.onend({reason: "Terminated"}); };
            mt._pc.onconnecting = function() { console.log("peer connecting !"); };
            mt._pc.onopen = function() { if(mt.state != Call.State.WAITING && mt.state != Call.State.HOLDING && mt.state != Call.State.TRANSITION) mt.state = Call.State.ONGOING;};
            
            if (typeof(callback) === "function") {
                callback();
            }
        }, function(error) {
            logger.log("Error obtaining user media: " + error.toString());
            
            var callType = (mt instanceof Conference) ? Conference : Call;
            _InternalError(mt, callType.Error.USER_MEDIA);
        });
    };
    
    /**
    WCG signalling
    @private
    */
    Call.prototype._sendSignaling = function(type, sdp) {
        var _call = this;
        var url = this._url;

    //
    // GEOFF HACK TO FIX direct wcg event coming from apigee g/w
    // DO NOT LEAVE AS IS
    // Replace "https://api.foundry.att.com/HaikuServlet/rest/v2/session/xxx/audiovideo/yyy with
    // Replace "APIGEE SERVER/session/xxx/audiovideo/yyy 
    if(url.indexOf("HaikuServlet") != -1) {
      logger.log("Rewriting url from: " + url);
      url = url.replace(/^.*\/session\/.+?\//, _call._mediaServices._gwUrl);
      logger.log("to: " + url);
      this._url = url;
    }

        console.log("Sending " + type + " with SDP: " + sdp);
        if (type == "OFFER" || type == "offer") {
            if(this._modID != null){
                logger.log("Sending MOD OFFER");
                url += "/mod/" + this._modID;
            } else {
                logger.log("Sending OFFER");
            }
            
            if (this instanceof Conference && !this.confID) {
                var body = _ParseSDP(null, sdp);
                
                // Starting a new conference
                var req = new _CreateXmlHttpReq();
                
                req.open("POST", url, true);
                req.setRequestHeader("Content-Type", "application/json");
                req.setRequestHeader("Accept", "application/json, text/html");
                req.send(JSON.stringify(body, null, " "));
                req.onreadystatechange = function() {
                    if (req.readyState == 4) {
                        
                        var json = JSON.parse(req.responseText);
                        
                        // Success response 201 Created
                        if (req.status == 201) {
                            var tokens = req.getResponseHeader ("Location").split("/");
                            var index = tokens.indexOf("mediaconf");
                            _call.confID = tokens[index + 1];
                            _call._url+= "/" +  tokens[index + 1];                      
                        } else {
                            _InternalError(_call, _call.Error.NETWORK_FAILURE);
                        }
                    }
                };
            } else {
                // Audio video invite
                var body = _ParseSDP(this.recipient, sdp);
                
                var req = new _CreateXmlHttpReq();
                req.open("POST", url, true);
                req.setRequestHeader("Content-Type", "application/json");
                req.setRequestHeader("Accept", "application/json, text/html");
                req.send(JSON.stringify(body, null, " "));
            
                // On response
                req.onreadystatechange = function() {
                    if (req.readyState == 4) {
                        var json = JSON.parse(req.responseText);
                        
                        // Success response 201 Created
                        if (req.status >= 200 && req.status <= 204) {
                            if(_call._callID == null){
                                var tokens = req.getResponseHeader ("Location").split("/");
                                var index = tokens.indexOf("audiovideo");
                                _call._callID=tokens[index + 1];
                                _call._url+= "/" +  tokens[index + 1];                      
                            }
                            logger.log("Audio video invite: " + json.state);
                        } else {
                            logger.log("Audio video invite unsuccessful: " + json.reason);
                            
                            if (req.status == 400) {
                                _InternalError(_call, Call.Error.INVALID_USER);
                            } else {
                                _InternalError(_call, Call.Error.NETWORK_FAILURE);
                            }
                        }
                    }
                };
            }
        } else if (type == "ANSWER" || type == "answer") {
            
            if(this._modID != null){
                logger.log("Sending MOD ANSWER");
                url += "/mod/" + this._modID;
            } else {
                logger.log("Sending ANSWER");
            }
            
            var body = _ParseSDP(null, sdp);
            
            var req = new _CreateXmlHttpReq();
            
            req.open("POST", url, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/html");
            req.send(JSON.stringify(body, null, " "));
            
            // On response
            req.onreadystatechange = function() {
                if (this.readyState == 4) {
                    var json = JSON.parse(req.responseText);
                    
                    // Success response 200 OK
                    if (req.status == 200) {
                        logger.log("Accept invite: " + json.state);
                    } else {
                        logger.log("Accept invite unsuccessful: " + json.reason);
                        
                        _InternalError(_call, _call.Error.NETWORK_FAILURE);
                    }
                }
            };
        }
    };
    
    /**
    Create offer
    @private
    */
    Call.prototype._doOffer = function() {
        // Create offer
        var mt= this; //needed for anonymous function
        if(this.isRTCConnection){   
              this._pc.createOffer(function(sdp){
                console.log("SDP offer from Browser = " + sdp.sdp);
                mt._sdp.sdp = sdp.sdp;
                mt._sdp.type = "OFFER";
                mt._pc.setLocalDescription(sdp);
              }, 
              function(err){ console.log("Err answer " + err);}, 
              this.mediaType);
        }else{
            var offer = this._pc.createOffer(this.mediaType);
            this._pc.setLocalDescription(this._pc.SDP_OFFER, offer);
            
            // Start Ice
            this._pc.startIce();
            this._sdp.type = "OFFER";
            this._sdp.sdp = offer;
        }
    };
    
    /**
    Create answer
    @private
    */
    Call.prototype._doAnswer = function() {
    
        var mt= this; //needed for anonymous function
        console.log("_doAnswer " + this.mediaType);
        if(this.isRTCConnection){   
            try{
                var remoteSdp= {};
                remoteSdp.type= 'offer';
                remoteSdp.sdp= mt._sdp.sdp;
                
                mt._sdp.type= 'answer';
                mt._candidates.length= 0;
                
                var remoteDesc= new RTCSessionDescription(remoteSdp, 
                    function(){ console.log("Success Remote RTCSessionDescription");},
                    function(err){ console.log("Err Remote RTCSessionDescription " + err);});                                       
                
                mt._pc.setRemoteDescription(remoteDesc, 
                function(){ //success
                    mt._pc.createAnswer(function(sdp){  
                        console.log("SDP answer from Browser = " + sdp.sdp);
                        if(mt._sdp.sdp.indexOf("sendonly") != -1){ //remote has sendonly
                            var newsdp= _updateSdp(sdp.sdp, "sendrecv", "recvonly"); //audio
                            newsdp= _updateSdp(newsdp, "sendrecv", "recvonly"); //video
                            sdp.sdp= newsdp;
                        }
                        
                        if(mt._modID != null){                          
                            if(mt._sdp.sdp.indexOf("sendonly") != -1){ //remote has sendonly
                                mt.state= Call.State.WAITING;
                            } else {
                                mt.state= Call.State.ONGOING;
                                if(mt._sdp.sdp.indexOf("sendrecv") != -1 && sdp.sdp.indexOf("recvonly") != -1){
                                    var newsdp= _updateSdp(sdp.sdp, "recvonly", "sendrecv"); //audio
                                    newsdp= _updateSdp(newsdp, "recvonly", "sendrecv"); //video
                                    sdp.sdp= newsdp;
                                }
                            }
                        }
                        mt._pc.setLocalDescription(sdp);
                        mt._sdp.sdp= sdp.sdp;   
                        if(mt._modID != null){                          
                            mt._sendSignaling("ANSWER", sdp.sdp);
                        }                       
                    },
                    function(err){ console.log("Err create answer " + err);}, 
                    mt.mediaType);
                }, function(err){ console.log("Err setRemoteDescription " + err);});
            }catch(e){
                console.log("error creating answer: " + e);
            }
        } else {
            var sd = new SessionDescription(this._sdp.sdp);
            
            // Receive offer
            this._pc.setRemoteDescription(this._pc.SDP_OFFER, sd);
            
            // Create answer
            var answer = this._pc.createAnswer(this._pc.remoteDescription.toSdp(), this.mediaType);
            this._pc.setLocalDescription(this._pc.SDP_ANSWER, answer);
            
            // Start Ice
            this._pc.startIce();
            
            this._sdp.type = "ANSWER";
            this._sdp.sdp = answer;
            
            // Process Ice candidates
            for (index in this._candidates) {
                var candidate = new IceCandidate(this._candidates[index].label, this._candidates[index].candidate);
                this._pc.processIceMessage(candidate);
            }
        }
    };
    
            
    
    /**
    Called when the Call object changes its state.
    @event
    @type function
    @param evt An event describing the state change
    @param {String} evt.type "statechange"
    @param {Call.State} evt.newState The new state
    @param {Call.State} evt.oldState The old state
    @example
call.onstatechange = function(evt) {
    switch (evt.newState) {
        case Call.State.READY:
            // Call state has changed to READY
            break;
        case Call.State.ENDED:
            // Call state has changed to ENDED
            break;
        // ...
    }
};
    */
    Call.prototype.onstatechange = function(evt){};
    
    /**
    Called when the call has begun, the call has started and media is now flowing.
    @event
    @type function
    @param evt
    @example
call.onbegin = function(evt) {
    // Call has begun
};
    */
    Call.prototype.onbegin = function(evt){};
    
    /**
    Called when the call has ended. Media will no longer be flowing as the call was terminated.
    @event
    @type function
    @param evt
    @example
call.onend = function(evt) {
    // Call has ended
};
    */
    Call.prototype.onend = function(evt){};
    
    /**
    Called when a remote stream is added.
    @event
    @type function
    @param evt An event containing the call object with localStreams and remoteStreams.
    @param {MediaStream} evt.stream The stream that was added.
    @param {Call} evt.call Call object containing the local and remote media streams list.
    @param {MediaStream[]} evt.call.localStreams Local media stream list.
    @param {MediaStream[]} evt.call.remoteStreams Remote media streams list.
    @example
var call = service.createCall(...);
call.onaddstream = function(evt) {
    if (evt.call.localStreams) {
        // Do stuff with the list of local media stream
    }
    if (evt.call.remoteStreams) {
        // Do stuff with the list of remote media stream
    }
};
    */
    Call.prototype.onaddstream = function(evt){};
    
    /**
    Called when a remote stream is removed.
    @event
    @type function
    @param evt An event containing the call object with localStreams and remoteStreams.
    @param {MediaStream} evt.stream The stream that was removed.
    @param {MediaStream[]} evt.call.localStreams Local media stream list
    @param {MediaStream[]} evt.call.remoteStreams Remote media streams list
    @example
call.onremovestream = function(evt) {
    if (evt.call.localStreams) {
        // Perform actions with the list of local media stream.
    }
    if (evt.call.remoteStreams) {
        // Perform actions with the list of remote media stream.
    }
};
    */
    Call.prototype.onremovestream = function(evt){};
    
    /**
    Called when the call has encountered an error. The call has encountered an unexpected behavior.
    @event
    @type function
    @param evt Error event
    @param {String} evt.type "error"
    @param {Call.Error} evt.reason Error code
    @param {Object} evt.target Proximal event target
    @example
call.onerror = function(evt) {
    switch (evt.reason) {
        case Call.Error.NETWORK_FAILURE:
            // Handle
            break;
        case Call.Error.PEER_CONNECTION:
            // Handle
            break;
        // ...
    }
};
    */
    Call.prototype.onerror = function(evt){};
    
    /**
    The OutgoingCall objects can be used to initiate calling.
    @class <p>OutgoingCall objects are created by {@link MediaServices#createCall} and are used to initiate calls to other parties.</p>
    @extends Call
    @param {MediaServices} mediaServices Object that created this Call object.
    @param {String} recipient Call recipient
    @param {String} mediaType Media types supported in this call (i.e. "audio", "video" or "audio,video")
    */
    OutgoingCall = function(mediaServices, recipient, mediaType) {
        // call parent constructor
        Call.prototype.constructor.call(this, mediaServices, recipient, mediaType);
        
        this.state = Call.State.READY;
        
        logger.log("OutgoingCall created");
    };
    
    OutgoingCall.prototype = new Call;
    OutgoingCall.prototype.constructor = OutgoingCall;
    
    /**
    Initiates the outgoing call, ringing the recipient.
    @function
    @return void
    @example
var call = ms.createCall("user2", "audio, video");
call.ring();
    */
    OutgoingCall.prototype.ring = function() {
        var call = this;
        
        logger.log("OutgoingCall ringing...");
        
        try {
            this._createPeerConnection(function() {
                call._doOffer();
            });
        } catch (e) {
            this._DEPRECATEDcreatePeerConnection();
        }
        
        this.state = Call.State.RINGING;
    };
    
    /**
    The IncomingCall objects are provided by MediaService on an incoming call. This is a private constructor.
    @class <p>The IncomingCall objects are provided by mediaServices on an incoming call and are used to answer them.</p>
    @extends Call
    @param {MediaServices} mediaServices Object that created this Call object.
    @param {String} recipient An identifier denoting the recipient; this can be a WebID, a SIP URI, or a tel: URI.
    @param {String} mediaType Media types supported in this conference (i.e. "audio", "video" or "audio,video").
    */
    IncomingCall = function(mediaServices, recipient, mediaType) {      
        // call parent constructor
        var call = Call.prototype.constructor.call(this, mediaServices, recipient, mediaType);
        call._isModerator= false;
        /**
        Remote SDP
        @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
        @private
        */
        this._DEPRECATEDsdp = null;
        
        this.state = Call.State.READY;
        
        logger.log("IncomingCall created");
    };
    
    IncomingCall.prototype = new Call;
    IncomingCall.prototype.constructor = IncomingCall;
    
    /**
    Acknowledges an incoming call and establishes media. Note that if the mediaType of this call is to be changed, it must be changed before a call to answer().
    @function
    @return void
    @example
service.oninvite = function(evt) {
    if (evt.call) {
        evt.call.answer();
    }
};
    */
    IncomingCall.prototype.answer = function() {
        var call = this;
        
        try {
            this._createPeerConnection(function() {
                call._doAnswer();
            });
        } catch (e) {
            var roapMessage = this._DEPRECATEDroap.processRoapOffer(this._mediaServices, this._DEPRECATEDsdp);
            
            this._DEPRECATEDcreatePeerConnection(null, roapMessage);
        }
    };
    
    // Internal constructor.
    /**
    The Conference object allows interaction with a conference. It includes joining, leaving, ending, and moderating the conference (adding/removing participants).
    A conference object can only be created with {@link MediaServices#createConference} or {@link MediaServices}.oninvite.
    <p>
    The Conference object can be treated as a Call for the purposes of media control. It will elicit the same events for the purposes of a client joining the conference.
    Even if a client has access to a Conference object, it does not imply this client is a participant of the conference. Indeed the client can
    still use the other Conference methods like the moderator functions. Therefore a client can be the moderator of a conference in which he is not participating.</p>
    <p>This is a private constructor.</p>
    @class <p>The Conference object allows interaction with a conference, including joining, leaving, ending, and moderating the conference (adding/removing participants).
    A conference object can only be created with {@link MediaServices#createConference} or {@link MediaServices}.oninvite.
    <p>The Conference object can be treated as a Call for the purposes of media control. It will elicit the same events for the purposes of a client joining the conference.
    Even if a client has access to a Conference object, it does not imply this client is a participant of the conference. Indeed the client can
    still use the other Conference methods like the moderator functions. Therefore a client can be the moderator of a conference in which he is not participating.</p>
    @extends Call
    @property {Conference.State} confState The current state of the conference itself (read only).
    @property {String} confID The ID of this conference.
    @param {MediaServices} mediaServices The object that created this Conference object.
    @param {String} confId the ID of this conference.
    @param {String} url The URL to the MediaGateway.
    @param {String} mediaType The media types supported in this conference (e.g. "audio", "video" or "audio,video").
    @protected
    */
    Conference = function(mediaServices, confId, url, mediaType) {
        Object.defineProperty(this, "confID", {
            get: function() {return confId;},
            set: function(newType) {confId = newType;}
        });
    
        Call.prototype.constructor.call(this, mediaServices, confId, mediaType);
        
        // Change the URL of the object. This will make the Call methods use the Conference URL for their method calls (signaling, etc)
        this._url = url;
        this.state = Conference.State.NEW;
        
        logger.log("Conference created");
    };
    
    /**
    @namespace Describes the possible states of the conference object. 
    */
    Conference.State = {};
    
    /**
    This is a new Conference object and it has not yet been started; the begin() method should be called to begin this new conference.
    */
    Conference.State.NEW = 0;
    
    /**
    The Conference object is in progress and users may join; the conference is ongoing.
    */
    Conference.State.IN_PROGRESS = 2;
    
    /**
    The Conference object has ended; the conference was terminated in an expected and controlled manner.
    */
    Conference.State.ENDED = 3;
        
    /**
    The Conference object has ended unexpectedly with an error; the conference was terminated in an unexpected manner (see {@link Conference.Error} for more details).
    */
    Conference.State.ERROR = 4;
    
    /**
    @namespace Describes the possible errors of the conference object.
    */
    Conference.Error = {};
    
    /**
    General network failure.
    */
    Conference.Error.NETWORK_FAILURE = 0;
    
    /**
    Peer Connection setup failure
    */
    Conference.Error.PEER_CONNECTION = 1;
    
    // Import all methods from Call
    Conference.prototype = new Call;
    Conference.prototype.constructor = Conference;
    
    Conference.prototype.isConference = function() { return true;};
    /**
    Leaves the conference.
    @function
    @return void
    @throws {Error} No active conference to leave
    @example
conf.leave();
    */
    Conference.prototype.leave = function() {
        var _conf = this;
        var conferenceURL = this._url;
        
        logger.log("Leaving conference: " + this.confID + "...");
                
        // Create and send a leave conference request
        var req = new _CreateXmlHttpReq();
        
        req.open("DELETE", conferenceURL, true);
        req.setRequestHeader("X-http-method-override", "DELETE");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                
                // Success response 202
                if (req.status == 204) {
                    logger.log("End conference successful!");
                    
                    _conf.state = Conference.State.ENDED;
                    if (typeof(_conf.onend) == "function") { 
                        _conf.onend({reason: "Conference terminated"}); 
                    }
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("End conference unsuccessful: " + json.reason);
                    
                    if (req.status == 403) {
                        throw new Error("No active conference to leave");
                    } else {
                        _InternalError(_conf, Conference.Error.NETWORK_FAILURE);
                    }
                }
            }
        };
        
        if (this._pc && this._pc.close)
            this._pc.close();
        this._pc = null;
    };
    
    /**
    Joins the conference. Join a conference by establishing media according to the previous parameters.
    @function
    @return void
    @throws {Error} Invalid conference ID.
    @example
var conf = createConference(..., "confID");
conf.join(); // Joins conference with confID
    */
    Conference.prototype.join = function() {
        var conf = this;
        
        logger.log("Joining conference: " + this.confID + "...");
        
        if (this.confID == "" || typeof(this.confID) != "string") {
            throw new Error("Invalid conference ID");
        }
        
        this.recipient = "conf:" + this.confID;
        
        try {
            this._createPeerConnection(function() {
                conf._doAnswer();
            });
        } catch (e) {
            this._DEPRECATEDcreatePeerConnection();
        }
    };
    
    /**
    Ends the conference. All participants are removed and new ones are unallowed to join. The caller must be authorized to moderate the conference to do so.
    @function
    @return void
    @example
conf.end();
    */
    Conference.prototype.end = function() {
        // TODO: remove all users from the conference before leaving        
        this.leave();
    };
    
    /**
    Forcibly removes a user from the conference.
    @function
    @param {String} user Specifies the name, SIP or tel URI of the user to be removed from the conference.
    @param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the user was removed or not.
    @return void
    @throws {TypeError} Invalid user
    @example
conf.removeUser("test2", function(evt) {
    if (evt.success) {
        // User has been removed successfully
    } else if (evt.failure) {
        // Removing user has failed due to evt.reason
    }
});
    */
    Conference.prototype.removeUser = function(user, callback) {
        var conferenceURL = this._url + '/' + CONFERENCE_RESOURCE_REMOVE;
        
        logger.log("Removing participant " + user + " from conference " + this.confID + "...");
        
        if (typeof(user) != "string") {
            throw new TypeError("Invalid user");
        } else {
            var body = {
                members : [user]
            };
            
            // Create and send a remove user request
            var req = new _CreateXmlHttpReq();
            
            req.open("POST", conferenceURL, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/html");
            req.send(JSON.stringify(body, null, " "));
        
            // On response
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    
                    // Success response 202
                    if (req.status >= 200 && req.status <= 204) {
                        logger.log("Remove participant successful!");
                        
                        if (typeof(callback) == "function") {
                            var event = {success : true, failure: false};
                            callback(event);
                        }
                    } else {
                        var reason= "unknown, status= " + req.status;
                        if(req.responseText != ""){ //TODO EVERYWHERE check the response before parsing json
                            reason = JSON.parse(req.responseText).reason;
                        }
                        
                        logger.log("Remove participant unsuccessful: " + reason);
                        
                        if (typeof(callback) == "function") {
                            var event = {success : false, failure: true};
                            callback(event);
                        }
                    }
                }
            };
        }
    };
    
    /**
    Adds a user to the conference.
    @function
    @param {String} user Defines the name, SIP or tel URI of the user to be added to the conference.
    @param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the user was added or not.
    @return void
    @throws {Error} Invalid user
    @example
conf.addUser("test2", function(evt) {
    if (evt.success) {
        // User has been added successfully
    } else if (evt.failure) {
        // Adding user has failed due to evt.reason
    }
});
    */
    Conference.prototype.addUser = function(user, callback) {
        var conferenceURL = this._url + '/' + CONFERENCE_RESOURCE_ADD;
        
        logger.log("Adding participant " + user + " to conference " + this.confID + "...");
        
        if (typeof(user) != "string" || user == "") {
            throw new Error("Invalid user");
        } else {
            var body = {
                members : [user]
            };
            
            // Create and send an add participant request
            var req = new _CreateXmlHttpReq();
            
            req.open("POST", conferenceURL, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/html");
            req.send(JSON.stringify(body, null, " "));
        
            // On response
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    // Success response 202
                    if (req.status >= 200 && req.status <= 204) {
                        logger.log("Add participant successful");
                        
                        if (typeof(callback) == "function") {
                            var event = {success : true, failure: false};
                            callback(event);
                        }
                    } else {
                        var reason= "unknown, status= " + req.status;
                        if(req.responseText != ""){ //TODO EVERYWHERE check the response before parsing json
                            reason = JSON.parse(req.responseText).reason;
                        }
                        
                        logger.log("Add participant unsuccessful: " + reason);
                        if (typeof(callback) == "function") {
                            var event = {success : false, failure: true};
                            callback(event);
                        }
                    }
                }
            };
        }
    };
    
    /**
    Begins the conference. The moderator automatically joins the conference on success.
    @function
    @param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the conference has successfully started or not.
    @return void
    @example
var conf = service.createConference(...);
conf.begin(function(evt) {
    if (evt.success == true) {
        // Conference has started successfully
    } else if (evt.failure == true) {
        // Conference has failed due to evt.reason
    }
)};
    */
    Conference.prototype.begin = function(callback) {
        logger.log("Conference beginning...");
        var conf = this;
        
        try {
            this._createPeerConnection(function() {
                conf._doOffer();
            });
        } catch (e) {
            this._DEPRECATEDcreatePeerConnection(function(status) {
                if (typeof(callback) == "function") {
                    callback(status);
                }
            });
        }
    };
    
    /**
    File Transfer contains information associated to the current file transfer session. This is a private constructor.
    @class <p>File Transfer contains information associated to the current file transfer session. A file transfer session can be initiated by 
    calling {@link MediaServices#createFileTransfer} and then {@link OutgoingFileTransfer#sendFile} which sends a file transfer request to the destination. </p>
    <p>Upon the recipient accepting, the file will be uploaded on the sending side and downloaded on the receiving side automatically.</p>
    @property {FileTransfer.state} state The file transfer's current state (read only).
    @property {String} name File name (read only).
    @property {String} size File size in bytes (read only).
    @property {String} type File type (read only).
    @param {MediaServices} mediaServices The object that created this File Transfer object.
    */
    FileTransfer = function(mediaServices) {
        var _state = FileTransfer.State.IDLE;
        
        this._url = null;
        this._mediaServices = mediaServices;
        this._fileName = null;
        this._fileSize = null;
        this._fileType = null;
        this._id = null;
        
        /**
        @field state
        */
        Object.defineProperty(this, "state", {
            get: function()
            {
                return _state;
            },
            set: function(newState)
            {
                _state = newState;
                
                if (typeof(this.onstatechange) == "function") {
                    var evt = {type: "statechange", oldState : _state, state: newState};
                    this.onstatechange(evt);
                }
                    
                switch (newState) {
                    case FileTransfer.State.INVITATION_RECEIVED:
                        var evt = { call: null, conf: null, ftp: this };
                        if (typeof(mediaServices.oninvite) == "function") { mediaServices.oninvite(evt); }
                        break;
                    case FileTransfer.State.DOWNLOAD_COMPLETE:
                        var evt = { ftp: this };
                        if (typeof(this.onreceivedfile) == "function") { this.onreceivedfile(evt); }
                    default:
                        break;
                }
            }
        });
        
        /**
        @field name
        */
        Object.defineProperty(this, "name", {
            get: function() { return this._fileName; }
        });
        
        /**
        @field size
        */
        Object.defineProperty(this, "size", {
            get: function() { return this._fileSize; }
        });
        
        /**
        @field type
        */
        Object.defineProperty(this, "type", {
            get: function() { return this._fileType; }
        });
    };
    
    /**
    Cancels an active file transfer or rejects a file transfer invitation.
    @function
    @return void
    @throws {Error} No active file transfer session
    @example
ftp.cancel();
    */
    FileTransfer.prototype.cancel = function() {
        var url = this._url + '/' + FILETRANSFER_RESOURCE_TERMINATE + '/' + this._id;
        var ft = this;
        
        if (!this._id || this.state == FileTransfer.State.UPLOAD_COMPLETE ||
            this.state == FileTransfer.State.DOWNLOAD_COMPLETE) {
            throw new Error("No active file transfer session");
        }
        
        logger.log("Terminating file transfer...");
        
        // Create and send a cancel file transfer request
        var req = new _CreateXmlHttpReq();
        
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No Content
                if (req.status == 204) {
                    logger.log("File transfer terminated");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("File transfer termination failed: " + json.reason);
                    
                    _InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    // Callback functions for MediaServices
    /**
    Called when FileTransfer changes its state.
    @event
    @type function
    @param evt Event describing the state change
    @param {FileTransfer.State} evt.newState New state
    @param {FileTransfer.State} evt.oldState Old state
    @example
ftp.onstatechange = function(evt) {
    switch (evt.newState) {
        case FileTransfer.State.INVITATION_SENT:
            // FileTransfer state has changed to INVITATION_SENT
            break;
        case FileTransfer.State.UPLOADING:
            // FileTransfer state has changed to UPLOADING
            break;
        // ...
    }
};
    */
    FileTransfer.prototype.onstatechange = function(evt) {};
    
    /**
    Called when FileTransfer has encountered an error.
    @event
    @type function
    @param evt Error event
    @param {String} evt.type "error"
    @param {Call.Error} evt.reason Error code
    @param {Object} evt.target Proximal event target
    @example
ftp.onerror = function(evt) {
    switch (evt.reason) {
        case FileTransfer.Error.NETWORK_FAILURE:
            // Handle
            break;
        // ...
    }
};
    */
    FileTransfer.prototype.onerror = function(evt) {};
    
    /**
    @namespace Describes the possible states of the FileTransfer object.
    */
    FileTransfer.State = {};
    
    /**
    FileTransfer is idle and ready to be used.
    */
    FileTransfer.State.IDLE = 0;
    
    /**
    A file transfer invitation has been sent.
    */
    FileTransfer.State.INVITATION_SENT = 1;
    
    /**
    A file transfer invitation has been received
    */
    FileTransfer.State.INVITATION_RECEIVED = 2;
    
    /**
    A file is currently being uploaded to the server.
    */
    FileTransfer.State.UPLOADING = 3;
    
    /**
    A file is currently being downloaded from the server.
    */
    FileTransfer.State.DOWNLOADING = 4;
    
    /**
    A file transfer upload has completed successfully.
    */
    FileTransfer.State.UPLOAD_COMPLETE = 5;
    
    /**
    A file transfer download has completed successfully.
    */
    FileTransfer.State.DOWNLOAD_COMPLETE = 6;
    
    /**
    A file transfer has been canceled or rejected.
    */
    FileTransfer.State.CANCELED = 7;
    
    /**
    The file transfer has encountered an error. See {@link FileTransfer.Error} for more details
    */
    FileTransfer.State.ERROR = 8;
    
    /**
    @namespace Describes the possible errors of the FileTransfer object.
    */
    FileTransfer.Error = {};
    
    /**
    General network failure.
    */
    FileTransfer.Error.NETWORK_FAILURE = 0;
    
    /**
    File size is larger than the limit
    */
    FileTransfer.Error.FILE_SIZE_LIMIT = 1;
    
    /**
    The user cannot be found
    */
    FileTransfer.Error.INVALID_USER = 2;
    
    /**
    The file transfer timed out
    */
    FileTransfer.Error.TIMEOUT = 3;
    
    /**
    The OutgoingFileTransfer objects can be used to initiate a file transfer.
    @class <p>OutgoingFileTransfer objects are created by {@link MediaServices#createFileTransfer} and are used to initiate file transfer requests to other parties.</p>
    @extends FileTransfer
    @param {MediaServices} mediaServices Object that created this FileTransfer object.
    @param {String} destination File transfer destination (recipient).
    @property {String} to Outgoing file transfer recipient (read only).
    @property {File} file Reference to the current file being transfered (read only).
    */
    OutgoingFileTransfer = function(mediaServices, destination) {
        FileTransfer.prototype.constructor.call(this, mediaServices);
        
        var _destination = destination;
        this._file = null;
        
        /**
        @field to
        Upload destination
        */
        Object.defineProperty(this, "to", {
            get: function() { return _destination; }
        });
        
        /**
        @field file
        */
        Object.defineProperty(this, "file", {
            get: function() { return this._file; }
        });
    };
    
    /**
    Called when a file upload is in progress.
    @event
    @type function
    @param evt
    @param {Number} evt.loaded The amount of bytes uploaded.
    @param {Number} evt.total The total amount of bytes to be uploaded.
    @example
ftp.onuploadprogress = function(evt) {
    console.log(event.loaded / event.total * 100 + "%");
};
    */
    OutgoingFileTransfer.prototype.onuploadprogress = function(evt) {};
    
    OutgoingFileTransfer.prototype = new FileTransfer;
    OutgoingFileTransfer.prototype.constructor = OutgoingCall;
    
    /**
    Sends a file transfer request to the destination. The file will be automatically uploaded on acceptance.
    @function
    @return void
    @param {File} file A reference to the file being sent.
    @throws {TypeError} Invalid file
    @example
var file = document.getElementById("file");
ftp.sendFile(file.files[0]);
    */
    OutgoingFileTransfer.prototype.sendFile = function(file) {
        if (!(file instanceof File)) {
            throw new TypeError("Invalid file");
        }
        
        var ft = this;
        this._file = file;
        this._fileType = file.type;
        this._fileName = file.name;
        this._fileSize = file.size;
        
        var url = this._url + '/' + FILETRANSFER_RESOURCE_SEND;
        
        logger.log("Initiating file transfer...");
        
        var body = {
            to : this.to,
            contentDisposition : "attachment",
            contentType : this.type,
            fileName : this.name,
            fileSize : this.size
        };
        
        // Create and send a file transfer request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                var json = JSON.parse(req.responseText);
                // Success response 202 Accepted
                if (req.status == 202) {
                    logger.log("File invitation sent, ID: " + json.ftId + ", state: " + json.state);
                    
                    ft.state = FileTransfer.State.INVITATION_SENT;
                    
                    // Put it in the hashmap
                    ft._mediaServices._ftp.put(json.ftId, ft);
                } else {
                    logger.log("File invitation failed: " + json.reason);
                    
                    _InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    WCG REST request for uploading a file. Upload occurs automatically upon acceptance.
    @function
    @return void
    @private
    */
    OutgoingFileTransfer.prototype._uploadFile = function() {
        var url = this._url + '/' + FILETRANSFER_RESOURCE_UPLOAD + '/' + this._id;
        var ft = this;
        
        ft.state = FileTransfer.State.UPLOADING;
            
        logger.log("Uploading file...");
        
        // The body is a multipart/form-data payload
        var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
        body.append("Filename", this._fileName);
        body.append("ClientId", this._mediaServices._sessionID);
        body.append("Filedata", this._file);
        body.append("Upload", "Submit Query");
        
        // Create and send a file upload request
        var req = new _CreateXmlHttpReq();
        
        req.upload.addEventListener("progress", function(evt) {
            var event = { "loaded": evt.loaded, "total": evt.total };
            ft.onuploadprogress(event);
        }, false);
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(body);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No Content
                if (req.status == 204) {
                    logger.log("File uploaded");
                    
                    if (ft.state != FileTransfer.State.CANCELED) {
                        ft.state = FileTransfer.State.UPLOAD_COMPLETE;
                    }
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("File upload failed: " + json.reason);
                    
                    if (ft.state != FileTransfer.State.CANCELED &&
                        ft.state != FileTransfer.State.ERROR) {
                        ft.state = FileTransfer.State.CANCELED;
                    }
                }
            }
        };
    };
    
    /**
    The IncomingFileTransfer objects are provided by MediaService on an incoming file transfer request. This is a private constructor.
    @class <p>The IncomingFileTransfer objects are provided by MediaService on an incoming file transfer request.</p>
    @extends FileTransfer
    @param {MediaServices} mediaServices Object that created this FileTransfer object.
    @param {String} from Initiator of file transfer.
    @property {String} rawData Raw data received (read only).
    @property {String} data Base 64 encoded data uri of the file (read only).
    @property {String} from Initiator of file transfer (read only).
    */
    IncomingFileTransfer = function(mediaServices, from) {
        FileTransfer.prototype.constructor.call(this, mediaServices);
        
        this._from = from;
        this._rawData = null;
        this._data = null;
        
        /**
        @field Raw data received.
        */
        Object.defineProperty(this, "rawData", {
            get: function() { return this._rawData; }
        });
        
        /**
        @field Base 64 encoded data received.
        */
        Object.defineProperty(this, "data", {
            get: function() { return this._data; }
        });
        
        /**
        @field File transfer initiator
        */
        Object.defineProperty(this, "from", {
            get: function() { return this._from; }
        });
        
    };
    
    /**
    Called when a file download is in progress.
    @event
    @type function
    @param evt
    @param {Number} evt.loaded The amount of bytes downloaded.
    @param {Number} evt.total The total amount of bytes to download.
    @example
ftp.ondownloadprogress = function(evt) {
    console.log(event.loaded / event.total * 100 + "%");
};
    */
    IncomingFileTransfer.prototype.ondownloadprogress = function(evt) {};
    
    /**
    Called when the file transfer has finished (when the file has been fully downloaded).
    @event
    @type function
    @param evt
    @param {IncomingFileTransfer} evt.ftp The IncomingFileTransfer object.
    @param {String} evt.ftp.rawData Raw bit stream of the file.
    @param {String} evt.ftp.data Data URI of the file in base 64.
    @example
call.onreceivedfile = function(evt) {
    // Do stuff with evt.ftp.data
};
    */
    IncomingFileTransfer.prototype.onreceivedfile = function(evt) {};
    
    IncomingFileTransfer.prototype = new FileTransfer;
    IncomingFileTransfer.prototype.constructor = IncomingFileTransfer;
    
    /**
    Accept an incoming file transfer invitation. The file will be automatically downloaded afterwards.
    @function
    @return void
    @throws {Error} No active file transfer session
    @example
ms.oninvite = function(evt) {
    if (evt.ftp) {
        evt.ftp.accept();
    }
};
    */
    IncomingFileTransfer.prototype.accept = function() {
        if (this.state == FileTransfer.State.UPLOAD_COMPLETE ||
                this.state == FileTransfer.State.DOWNLOAD_COMPLETE) {
            throw new Error("No active file transfer session");
        }
        
        var url = this._url + '/' + FILETRANSFER_RESOURCE_ACCEPT + '/' + this._id;
        var ft = this;
        
        logger.log("IncomingFileTransfer accepting...");
        
        // Create and send an accept file transfer request
        var req = new _CreateXmlHttpReq();
        
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 201 Created
                if (req.status == 200) {
                    logger.log("IncomingFileTransfer accepted");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("IncomingFileTransfer accept failed: " + json.reason);
                    
                    _InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    WCG REST request for downloading a file. Download occurs automatically when ready.
    @function
    @return void
    @private
    */
    IncomingFileTransfer.prototype._downloadFile = function() {
        var url = this._url + '/' + FILETRANSFER_RESOURCE_GETFILE + '/' + this._id;
        var ft = this;
        var loaded = null;
        
        ft.state = FileTransfer.State.DOWNLOADING;
        
        logger.log("Downloading file...");
        
        // Create and send a download file transfer request
        var req = new _CreateXmlHttpReq();
        
        req.addEventListener("progress", function(evt) {
            var event = { "loaded": evt.loaded, "total": ft.size };
            loaded = evt.loaded;
            ft.ondownloadprogress(event);
        }, false);
        req.open("GET", url, true);
        req.overrideMimeType("text/plain; charset=x-user-defined");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200) {
                    if (ft.state != FileTransfer.State.CANCELED && ft.state != FileTransfer.State.ERROR) {
                        // We have a response and we are in a non-failure state
                        if (req.responseText && loaded == ft.size) {
                            // req.responseText is a binary stream of the file received
                            ft._rawData = req.responseText;
                            ft._data = 'data:' + ft.type + ';base64,' + _Base64encode(req.responseText);
                            
                            ft.state = FileTransfer.State.DOWNLOAD_COMPLETE;
                        } else {
                            if (ft.state != FileTransfer.State.CANCELED &&
                                    ft.state != FileTransfer.State.ERROR) {
                                ft.state = FileTransfer.State.CANCELED;
                            }
                        }
                    }
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Downloading file failed: " + json.reason);
                    
                    _InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Chat is a generic handler for a one-to-one chat. Chat allows the user to send and receive chat messages, 
    media messages (50 kB images), is-composing (typing) events. A Chat object can only be created by {@link MediaServices#createChat}. 
    This is a private constructor.
    @class Chat is a generic handler for a one-to-one chat. Chat allows the user to send and receive chat messages, 
    media messages (50 kB images), is-composing (typing) events. A Chat object can only be created by {@link MediaServices#createChat}. 
    This is a private constructor. <br />
    @property {Chat.State} state The chat session's current state (readonly).
    @property {String} recipient The recipient of this chat session (readonly).
    @param {MediaServices} mediaServices The parent MediaServices instance.
    @param {String} recipient The chat message recipient.
    */
    Chat = function(mediaServices, recipient) {
        var _state = Chat.State.NEW;
        this._mediaServices = mediaServices;
        
        /**
        @field state
        The state of the call
        */
        Object.defineProperty(this, "state", {
            get: function()
            {
                return _state;
            },
            
            set: function(newState)
            {
                _state = newState;
                
                if (typeof(this.onstatechange) == "function") {
                    var evt = {type: "statechange", oldState : _state, state: newState};
                    this.onstatechange(evt);
                }
                    
                if ((newState == Chat.State.ACTIVE || newState == GroupChat.State.IN_PROGRESS) && typeof(this.onbegin) == "function")
                    this.onbegin(evt);
                if (newState == GroupChat.State.ENDED && typeof(this.onend) == "function")
                    this.onend(evt);
            }
        });
        
        /**
        @field recipient
        The recipient of the chat session
        */
        Object.defineProperty(this, "recipient", {
            get: function() { return this._recipient; }
        });
        
        /**
        Chat message recipient
        @private
        */
        this._recipient = recipient;
        
        /**
        Lock used to determine if the user can send an is-composing request, or has to wait
        @private
        */
        this._composingWait = false;
        
        /**
        The base URL including session ID ("baseURL"/"sessionID"/)
        @private
        */
        this._url = null;
    };
    
    /**
    @namespace Describes the states of the chat object.
    */
    Chat.State = {};
    
    /**
    A new Chat object has been initialised
    */
    Chat.State.NEW = 0;
    
    /**
    A chat session is considered active when the chat initiator has sent at least 1 message to the recipient.
    Typing/idle is-composing events and media messages can only be sent in this state.
    */
    Chat.State.ACTIVE = 1;
    
    /**
    The Chat object has encountered an error
    */
    Chat.State.ERROR = 3;
    
    /**
    @namespace Describes the possible errors of the Chat object.
    */
    Chat.Error = {};
    
    /**
    General network failure
    */
    Chat.Error.NETWORK_FAILURE = 0;
    
    /**
    The recipient is an invalid user
    */
    Chat.Error.INVALID_USER = 1;
    
    /**
    The recipient is offline and is unable to receive chat messages
    */
    Chat.Error.USER_NOT_ONLINE = 2;
    
    /**
    Sends a chat message to the recipient. This function can be called at any time once a Chat object has been created.
    @function
    @return void
    @param {String} body The message to be sent.
    @throws {Error} No body
    @example
var chat = service.createChat("sip:491728885004@mns.ericsson.ca");
chat.send("Hello world!");
    */
    Chat.prototype.send = function(body) {
        var chat = this;
        
        if(!body || typeof(body) != "string"){
            throw new Error("No body");
        }
        
        logger.log("Sending message...");
        
        var messageURL = this._url + '/' + CHAT_RESOURCE_SEND;
        
        // Clear the composing wait lock
        chat._composingWait = false;
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        var message = null;
        if (this instanceof GroupChat) {
            message = {
                confId : this.confID,
                body : body
            };
        } else {
            message = {
                to : this.recipient,
                body : body,
                contentType : "text/plain",
                type : "session-message"
            };
        }
            
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {          
                var json= "\"\"";
                if(req.responseText != "") {
                    json= JSON.parse(req.responseText);
                }
                // Success response 200 OK for Chat
                if (req.status == 200) {
                    logger.log("Send message successful: msgId " + json.msgId);
                    
                    // Put the current Chat/GroupChat object in the HashMap
                    if (chat.recipient) {
                        if (!chat._mediaServices._chat.get(chat.recipient)) {
                            chat._mediaServices._chat.put(chat.recipient, chat);
                        }
                    }
                }
                // Success response 202 Accepted for GroupChat
                else if (req.status == 202) {
                    logger.log("Send message successful: msgId " + json.msgId);
                } else {
                    if (req.status == 400) {
                        _InternalError(chat, Chat.Error.INVALID_USER);
                    } else {
                        _InternalError(chat, Chat.Error.NETWORK_FAILURE);
                    }
                }
            }
        };
        
    };
    
    /**
    Sends a typing is-composing notification to the other user(s)
    @function
    @return void
    @throws {Error} Unable to send composing event until the chat session is active
    @example
object.onkeypress = function() {
    chat.typing();
};
    */
    Chat.prototype.typing = function() {
        // Don't send an is composing event if another one has been sent recently
        if (!this._composingWait && (this.state == Chat.State.ACTIVE || this.state == GroupChat.State.IN_PROGRESS)) {
            this._composingWait = true;
            this._sendComposing("active", 10);
        }
    };
    
    /**
    Sends an idle is-composing notification to the other user(s)
    @function
    @return void
    @throws {Error} Unable to send composing event until the chat session is active
    @example
chat.idle();
    */
    Chat.prototype.idle = function() {
        // Send an idle if it was in the composing state
        if (this._composingWait && (this.state == Chat.State.ACTIVE || this.state == GroupChat.State.IN_PROGRESS)) {
            this._sendComposing("idle", 10);
            this._composingWait = false;
        }
    };
    
    /**
    Sends an is-composing event.
    @param {String} state "active" if typing, "idle" if not typing
    @param {Number} timer Refresh timer
    @throws {Error} Invalid state
    @private
    */
    Chat.prototype._sendComposing = function(state, timer) {
        var chat = this;

        if (this.state != Chat.State.ACTIVE) {
            throw new Error("Unable to send composing event until the chat session is active");
        }
        if (state != "active" && state != "idle") {
            // Shouldn't happen
            throw new Error("Invalid state");
        }
        
        var messageURL = this._url + '/' + CHAT_RESOURCE_SEND_ISCOMPOSING;
        
        logger.log("Sending is-composing...");
        
        // Create and send a chat is composing request
        var req = new _CreateXmlHttpReq();
        
        var body = null;
        if (this instanceof GroupChat) {
            body = {
                confId : this.confID,
                state : state,
                refresh : timer
            };
        } else {
            body = {
                to : this.recipient,
                state : state,
                refresh : timer,
                contentType : "text/plain"
            };
        }           
            
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No content
                if (req.status == 204) {
                    logger.log("Sending is-composing successful");
                    
                    // Timer to prevent user from sending another request until timer expires
                    setTimeout(function() { chat._composingWait = false; }, timer * 1000);
                } else {
                    logger.log("Sending is-composing unsuccessful");
                    
                    var json = JSON.parse(req.responseText);
                    
                    if (req.status == 403 && json.reason == "no active session") {
                        throw new Error("No active chat session");
                    } else {
                        _InternalError(chat, Chat.Error.NETWORK_FAILURE);
                    }
                }
            }
        };
    };
    
    
    /**
    Sends a media message to the recipient. The media file is restricted to image file types and a maximum size of 50 kB.
    This method can only be called when the Chat object is in the active state. Larger file transfers should be handled with {@link FileTransfer}.
    @function
    @return void
    @param {File} file A reference to the media image file being sent.
    @throws {TypeError} Invalid file type
    @throws {Error} Unable to send a media message until the chat session is active
    @throws {Error} Media size too large
    @throws {Error} No active chat session
    @example
chat.sendMedia(file.files[0]);
    */
    Chat.prototype.sendMedia = function(file) {
        var _chat = this;

        if (!(file instanceof File)) {
            throw new TypeError("Invalid file type");
        }
        if (this.state != Chat.State.ACTIVE || this.state != GroupChat.State.IN_PROGRESS) {
            throw new Error("Unable to send a media message until the chat session is active");
        }
        if (file.type.indexOf("image") == -1) {
            // We only accept image file types
            throw new TypeError("Invalid file type");
        }
        if (file.size > MAX_MEDIA_SIZE) {
            throw new Error("Media size too large, maximum: " + MAX_MEDIA_SIZE + " current: " + file.size);
        }
        
        logger.log("Sending media message...");
        
        var url = "";
        if (this instanceof GroupChat) {
            url = this._url + '/' + GROUP_CHAT_RESOURCE_SEND_MEDIA + this.confID;
        } else {
            url = this._url + '/' + CHAT_RESOURCE_SEND_MEDIA + this.recipient;
        }
        
        // The body is a multipart/form-data payload
        var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
        body.append("Filename", file.name);
        body.append("ClientId", this._mediaServices._sessionID);
        body.append("Filedata", file);
        body.append("Upload", "Submit Query");  
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(body);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                var json = JSON.parse(req.responseText);
                // Success response 200 OK
                if (req.status == 200) {
                    // Chat
                    logger.log("Send media message successful: msgId " + json.msgId);
                } else if (req.status == 202) {
                    // Group chat
                    logger.log("Send media message successful: msgId " + json.msgId);
                } else {
                    logger.log("Send media message unsuccessful");

                    if (req.status == 403) {
                        // 403 Forbidden with reason: "no active session"
                        throw new Error("No active chat session");
                    } else if (req.status == 413) {
                        // File size too big (shouldn't happen)
                        throw new Error(json.reason);
                    } else {
                        _InternalError(_chat, Chat.Error.NETWORK_FAILURE);
                    }
                }
            }
        };
    };
    
    /**
    Retrieve the media message. This is done automatically upon media message channel event.
    @private
    */
    Chat.prototype._getMedia = function(id, from) {
        var _chat = this;
        var url = this._url + '/' + CHAT_RESOURCE_GET_MEDIA + id;
        
        logger.log("Getting media message...");
        
        // Create and send an add contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("GET", url, true);
        req.overrideMimeType("text/plain; charset=x-user-defined");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200) {
                    logger.log("Get media message successful");
                    
                    var mediaType = req.getResponseHeader("Content-Type");
                    var evt = {
                        from : from,
                        type : mediaType,
                        media : 'data:' + mediaType + ';base64,' + _Base64encode(req.responseText),
                        size : req.getResponseHeader("Content-Length")
                    };
                    
                    chat.onmessage(evt);
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Get media message unsuccessful: " + json.reason);
                    _InternalError(_chat, Chat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Called when the Chat object changes its state.
    @event
    @type function
    @param evt An event describing the state change.
    @param {String} evt.type "statechange".
    @param {Chat.State} evt.newState New state.
    @param {Chat.State} evt.oldState Old state.
    @example
chat.onstatechange = function(evt) {
    switch (evt.newState) {
        case Chat.State.ACTIVE:
            // Chat state has changed to ACTIVE
            break;
        case Chat.State.ERROR:
            // Chat state has changed to ERROR
            break;
        // ...
    }
};
    */
    Chat.prototype.onstatechange = function(evt) {};
    
    /**
    Called when the Chat object has begun and is in the active state. Sending and receiving of message/media/is-composing events can occur.
    @event
    @type function
    @param evt
    @example
chat.onbegin = function(evt) {
    // Chat has begun
};
    */
    Chat.prototype.onbegin = function(evt) {};
    
    /**
    Called when a message is received in the event channel. The message can be either a chat message or media message.
    @event
    @type function
    @param evt An event containing a message or a media message
    @param {String} evt.from Composer of the message
    @param {String} [evt.message] Text message body
    @param {String} [evt.type] Media message type (jpeg, gif, png, etc)
    @param {String} [evt.media] Media message content (base 64 encoded data URI format)
    @param {String} [evt.size] Media message size in bytes
    @example
chat.onmessage = function(evt) {
    if (evt.message) {
        // Chat message
    } else if (evt.media) {
        // Media message
    }
};
    */
    Chat.prototype.onmessage = function(evt) {};
    
    /**
    Called when a message has not been sent properly. TODO: Note that this is not implemented yet.
    @event
    @type function
    @param evt
    */
    Chat.prototype.onmessagefailure = function(evt) {};
    
    /**
    Called when an is-composing message is received in the event channel
    @event
    @type function
    @param evt
    @param {String} evt.from Is-composing event originator
    @param {String} evt.state One of "active" (user is currently typing) or "idle" (user has stopped typing)
    @param {Number} evt.refresh The timer, in seconds, associated to this is-composing event. For example, an is-composing icon could be displayed for evt.refresh amount of time.
    @example
chat.oncomposing = function(evt) {
    if (evt.state == "active") {
        // User 'evt.from' is currently typing
    } else if (evt.state == "idle") {
        // User 'evt.from' has stopped typing
    }
};
    */
    Chat.prototype.oncomposing = function(evt) {};
    
    /**
    Called when the Chat object has encountered an error, the chat message was terminated in an unexpected manner.
    @event
    @type function
    @param evt Error event.
    @param {String} evt.type "error".
    @param {Chat.Error} evt.reason Error code.
    @param {Object} evt.target Proximal event target.
    @example
chat.onerror = function(evt) {
    switch (evt.reason) {
        case Chat.Error.NETWORK_FAILURE:
            // Handle
            break;
        case Chat.Error.INVALID_USER:
            // Handle
            break;
        // ...
    }
};
    */
    Chat.prototype.onerror = function(evt) {};
    
    /**
    GroupChat is a generic handler for chatting in a conference. GroupChat allows for sending and receiving chat messages, media messages, is-composing events.
    GroupChat users are allowed to freely leave and rejoin the group chat session as long as there is still 1 connected member in the conference.
    The administrator (creator) can invite new members into this group chat by calling {@link GroupChat#add}. This is a private constructor.
    @class GroupChat is a generic handler for chatting in a conference. GroupChat allows for sending and receiving chat messages, media messages, is-composing events.
    GroupChat users are allowed to freely leave and rejoin the group chat session as long as there is still 1 connected member in the conference.
    The administrator (creator) can invite new members into this group chat by calling {@link GroupChat#add}. This is a private constructor. <br />
    @extends Chat
    @property {Boolean} isOwner returns true if the user is the creator of the GroupChat
    @property {GroupChat.State} state The group chat session's current state (readonly)
    @property {String} subject The subject of the group chat
    @property {String} confID The current group chat's identifier
    @property {Array} members An array of members and their state (invited, connected, disconnected)
    @param {MediaServices} mediaServices Object that created this GroupChat object
    @param {String} subject The subject of the group chat
    @param {Array} recipients The group chat invites
    @param {String} owner The identifier of the owner of this group chat conference
    @param {String} [confID] Include this parameter if joining an active conference
    */
    GroupChat = function(mediaServices, subject, recipients, owner, confID) {
        var _subject = subject,
            _confID = confID;
    
        this._members = [];
        
        this._isOwner = false;
    
        Chat.prototype.constructor.call(this, mediaServices, recipients);
        
        Object.defineProperty(this, "isOwner", {
            get: function() { return this._isOwner; }
        });
        
        /**
        @field subject
        The subject of the group chat
        */
        Object.defineProperty(this, "subject", {
            get: function() { return _subject; },
            set: function(newSubject) {_subject = newSubject;}
        });
        
        /**
        @field confID
        The current group chat's identifier
        */
        Object.defineProperty(this, "confID", {
            get: function() { return _confID; },
            set: function(newConfID) {_confID = newConfID;}
        });
        
        /**
        @field members
        An array of members and their state
        */
        Object.defineProperty(this, "members", {
            get: function() { return this._members; }
        });
    };
    
    // Import all methods from Chat
    GroupChat.prototype = new Chat;
    GroupChat.prototype.constructor = GroupChat;
    
    /**
    @namespace Describes the states of GroupChat
    */
    GroupChat.State = {};
    
    /**
    The GroupChat session is new.
    */
    GroupChat.State.NEW = 0;
    
    /**
    The GroupChat session is ready.
    */
    GroupChat.State.IN_PROGRESS = 1;
    
    /**
    The GroupChat sesion has ended.
    */
    GroupChat.State.ENDED = 2;
    
    /**
    The GroupChat object encountered an error (see {@link GroupChat.Error} for more details).
    */
    GroupChat.State.ERROR = 3;
    
    /**
    @namespace Describes the error of a GroupChat session.
    */
    GroupChat.Error = {};
    
    /**
    General network failure
    */
    GroupChat.Error.NETWORK_FAILURE = 0;
    
    /**
    The initiator starts the group chat session by sending group chat invitations to the specified members.
    @return void
    @example
var groupchat = service.createGroupChat("This is a new group chat!", ["sip:491728885004@mns.ericsson.ca", "sip:491728885005@mns.ericsson.ca"]);
groupchat.start();
    */
    GroupChat.prototype.start = function() {
        var groupChat = this;
        
        var messageURL = this._url + '/' + GROUP_CHAT_CREATE;
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        var message = {
            members : this.recipient,
            subject : this.subject
        };
        
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
        
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 No content
                if (req.status == 202) {
                    
                    // Extract the confID from JSON body
                    var json = JSON.parse(req.responseText);
                    var confId = json.confId;
                    groupChat.confID = confId;                  
                    
                    // Put it in the HashMap
                    groupChat._mediaServices._chat.put(confId, groupChat);
                    
                    // Update all members as "invited"
                    for (var i = 0; i < groupChat.recipient.length; i++) {
                        groupChat.members.push({ entity: groupChat.recipient[i], status: "invited" });
                    }
                    groupChat.state= GroupChat.State.NEW;
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Create group chat fail reason: " + json.reason);                        
                    _InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Leave the current group chat session.
    @return void
    @throws {Error} No active group chat session to leave
    @example
groupchat.leave();
    */
    GroupChat.prototype.leave = function() {
        var groupChat = this;
        
        if (!this.confID) {
            throw new Error("No active group chat session to leave");
        }
        
        var messageURL = this._url + '/' + GROUP_CHAT_LEAVE;
        
        logger.log("Leaving group chat...");
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        var body = {
            confId : this.confID
        };

        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 No content
                if (req.status == 204) {
                    groupChat.state = GroupChat.State.ENDED;
                    
                    // Remove it from the HashMap
                    groupChat._mediaServices._chat.remove(groupChat.confID);
                    
                    logger.log("Leave group chat successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Leave group chat unsuccessful: " + json.reason);                
                    
                    _InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Add a participant(s) to the current group chat session. Only the administrator should be able to do this.
    @return void
    @param {Array} members A list of members to be added to the group chat session.
    @throws {Error} Failed to add member in an ongoing group chat session, no new member defined
    @throws {Error} Not allowed to add participant you are not the owner of the conference
    @throws {Error} Unable to add existing member to chat
    @example
groupchat.add(["sip:491728885004@mns.ericsson.ca"]);
    */
    GroupChat.prototype.add = function(members) {
        var _groupChat = this;

        if (typeof(members) != "object" || !members || members.length == 0) {
            throw new Error("Failed to add member in an ongoing group chat session, no new member defined");
        }
        if (!this._isOwner) {
            throw new Error("Not allowed to add participant you are not the owner of the conference");
        }
        
        var newMembers = [];
        // Check if members to add already exist in the active recipient list
        for (var i = 0; i < members.length; i++ ) {
            var member = members[i];
            
            for (var j = 0; j < this.members.length; j++) {
                if (this.members[j].entity.indexOf(member) == -1) {
                    // Doesn't exist
                    newMembers.push(member);
                    break;
                }
            }
        }
        
        if (newMembers.length == 0) {
            throw new Error("Unable to add existing member to chat");
        }
        
        logger.log("Adding participants to group chat");
        
        var messageURL = this._url + '/' + GROUP_CHAT_ADD;
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
                
        var message = {
            confId : this.confID,
            members : newMembers
        };
        
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No content
                if (req.status == 204) {
                    logger.log("Add participant successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Add participant unsuccessful: " + json.reason);
                    
                    _InternalError(_groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Join is used to re-join a group chat session for which the user has previously left.
    @return void
    @throws {Error} Invalid conference ID
    @example
groupChat.join();
    */
    GroupChat.prototype.join = function() {
        var groupChat = this;
        
        if (!this.confID || typeof(this.confID) != "string") {
            throw new Error("Invalid conference ID");
        }
        
        logger.log("Joining group chat " + this.confID + "...");
        
        var messageURL = this._url + '/' + GROUP_CHAT_JOIN;
        
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        var message = {
            confId : this.confID
        };

        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 202 Accepted
                if (req.status == 202) {
                    logger.log("Join successful");
                    
                    groupChat.state = GroupChat.State.IN_PROGRESS;
                    
                    groupChat._mediaServices._chat.put(groupChat.confID, groupChat);
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Join unsuccessful: " + json.reason);
                    
                    _InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Accept an invitation to a group chat session. The user will automatically join the active conference and will be able to start sending messages.
    @return void
    @throws {Error} Unable to join group chat with invalid ID
    @example
service.oninvite = function(evt) {
    if (evt.groupChat) {
        evt.groupChat.accept();
    }
};
    */
    GroupChat.prototype.accept = function() {
        var groupChat = this;
        
        if (!this.confID) {
            throw new Error("Unable to join group chat with invalid ID");
        }
        
        logger.log("Accepting...");
        
        var messageURL = this._url + '/' + GROUP_CHAT_ACCEPT;
            
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
        
        var message = {
            confId : this.confID
        };
        
        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
        
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200 || req.status == 201) {
                    logger.log("Accept successful");
                    
                    // Put it in the HashMap
                    groupChat._mediaServices._chat.put(groupChat.confID, groupChat);
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Accept unsuccessful: " + json.reason);
                    
                    _InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
        
    };
    
    /**
    Decline an invitation to a group chat session.
    @return void
    @throws {Error} Failed to decline invitation to group chat, no conferenceID
    @example
service.oninvite = function(evt) {
    if (evt.groupChat) {
        evt.groupChat.decline();
    }
};
    */
    GroupChat.prototype.decline = function() {
        var groupChat = this;
        
        if (!this.confID) {
            throw new Error("Failed to decline invitation to group chat, no conferenceID");
        }
        
        logger.log("Declining group chat invite...");
        
        var messageURL = this._url + '/' + GROUP_CHAT_DECLINE;
            
        // Create and send a create conference request
        var req = new _CreateXmlHttpReq();
                
        var message = {
            confId : this.confID
        };

        req.open("POST", messageURL, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(message, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No content
                if (req.status == 204) {
                    groupChat.state = GroupChat.State.ENDED;
                    
                    logger.log("Decline group chat invite successful");
                    
                    // Remove it from the HashMap
                    groupChat._mediaServices._chat.remove(groupChat.confID);
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Decline group chat invite unsuccessful: " + json.reason);
                    
                    _InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
                }
            }
        };
    };
    
    /**
    Called when the GroupChat has ended
    @event
    @type function
    @param evt
    @example
groupchat.onend = function(evt) {
    // GroupChat has ended
};
    */
    GroupChat.prototype.onend = function(evt) {};
    
    /**
    Called when a user has joined/left the current group chat session
    @event
    @type function
    @param evt
    @param {Array} evt.members Array of members and their state
    @param {String} evt.members.entity Identifier of member in the group chat
    @param {String} evt.members.status Status of the member ("invited", "connected", "disconnected")
    @example
groupchat.onupdate = function(evt) {
    // A crude example...
    if (evt.members[0].status == "disconnected") {
        alert(evt.members[0].entity + "has disconnected from the chat");
    }
}
    */
    GroupChat.prototype.onupdate = function(evt) {};

    /**
    A new ContactList object is created upon registration, assuming the user has an address book. The user's ContactList can be accessed from 
    {@link MediaServices.contactList}.
    @class
    @param {MediaServices} mediaServices The parent MediaServices instance.
    @property {Number} size The size of the contact list
    @property {Array} contact An array of Contact objects
    @property {ContactList.State} state The state of the contact list
    @example
var contactList = service.contactList;
contactList.onstatechange = function(evt) {};
contactList.onready = function(evt) {};
contactList.onpresenceinvite = function(evt) {};
contactList.update();
contactList.getAllAvatars();
    */
    ContactList = function(mediaServices) {
        var _state = ContactList.State.NEW;
        
        this._url = null;
        
        /**
        An array of Contact objects
        */
        this._contacts = [];
        
        /**
        Current syncId, used for contact list requests
        */
        this._syncId = null;
        
        /**
        Parent MediaServices object
        */
        this._mediaServices = mediaServices;
        
        /**
        @field size
        Amount of Contacts in ContactList
        */
        Object.defineProperty(this, "size", {
            get: function() { return this._contacts.length; }
        });
        
        /**
        @field contact
        Contact array
        */
        Object.defineProperty(this, "contact", {
            get: function() { return this._contacts; }
        });
        
        /**
        @field state
        */
        Object.defineProperty(this, "state", {
            get: function()
            {
                return _state;
            },
            set: function(newState)
            {
                _state = newState;
                
                if (typeof(this.onstatechange) == "function"){
                    var evt = {type: "statechange", oldState : _state, state: newState};
                    this.onstatechange(evt);
                }
                // Dispatch appropriate states
                if (newState == ContactList.State.READY && typeof(this.onready) == "function")
                    this.onready({ contactList : this });
                // else if (newState == ContactList.State.UPDATED && typeof(this.onupdate) == "function")
                    // this.onupdate({ contactList : this });
            }
        });
    };
    
    /**
    @namespace Describes the states of the ContactList object.
    */
    ContactList.State = {};
    
    /**
    The ContactList has been initialized.
    */
    ContactList.State.NEW = 0;
    
    /**
    The ContactList has been updated and is ready.
    */
    ContactList.State.READY = 1;
    
    /**
    The ContactList has encountered an error.
    */
    ContactList.State.ERROR = 2;
    
    /**
    Retrieves the network address book
    @function
    @return void
    @example
service.contactList.update();
    */
    ContactList.prototype.update = function() {
        var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS;
        
        if (this._syncId) {
            // TODO: uncomment below
            // url += '?syncId=' + this._syncId;
        }
        
        logger.log("Updating contact list...");
        
        // Create and send an update contact list request
        var req = new _CreateXmlHttpReq();
        
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 202 Accepted
                if (req.status == 202) {
                    logger.log("Update contact list finished");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Update contact list failed: " + json.reason);
                }
            }
        };
    };
    
    /**
    Builds contact list from a contactlist event
    @private
    */
    ContactList.prototype._parseContactList = function(contacts) {
        var size = this.size;
        var isUpdated = false;
    
        for (var j = 0;; j++) {
            try {
                var contact = contacts[j];
                var isContactList = false;
                
                // Check ContactList for that contact
                for (var l = 0; l < this.size; l++) {
                    if (this.contact[l]._id == _GetNumber(contact.uri)) {
                        // Update the Presence relationship state
                        this.contact[l]._presenceState = contact.state;
                        isContactList = true;
                        isUpdated = true;
                    }
                }
                
                // Contact doesn't exist locally
                if (!isContactList) {
                    // Create a new entry
                    var info = {
                        numbers : [{
                            number : contact.uri
                        }]
                    };
                    var newContact = new Contact(info);
                    newContact._mediaServices = this._mediaServices;
                    newContact._url = this._url;
                    newContact._id = _GetNumber(contact.uri);
                    
                    if (contact.self == "true") {
                        newContact._isSelf = true;
                    }
                    
                    // Add to local ContactList (not network address book)
                    this.contact.push(newContact);
                }
            } catch (error) {
                // No more contact updates
                break;
            }
        }
        
        // Change state to ready if contact list was updated
        if (this.size != size || isUpdated) {
            this.state = ContactList.State.READY;
        }
    };
    
    /**
    Builds contact list from the network address book. Called on address book channel event.
    @private
    */
    ContactList.prototype._parseAddressBook = function(contacts) {
        var isUpdated = false;
    
        for (var i = 0;; i++) {
            try {
                var info = contacts[i];
                var contact = null;
                
                if (this._contacts[info.contactId]) {
                    // Contact already exists, update him
                    contact = this._contacts[info.contactId];
                    contact.state = Contact.State.UPDATING;
                    
                    // Set info
                    if (info.vcard) {
                        contact.name = info.vcard.name;
                        contact.emails = info.vcard.emails;
                        contact.addresses = info.vcard.addresses;
                        contact.note = info.vcard.note;
                        contact.numbers = info.vcard.numbers;
                        
                        if (info.vcard.photo) {
                            // photo is already base 64 encoded
                            contact.photo = 'data:image/' + info.vcard.photoType + ';base64,' + info.vcard.photo;
                        }
                    }
                } else {
                    // Contact doesn't exist in our list, create a new entry
                    contact = new Contact(info.vcard);
                    contact._url = this._url;
                    contact._mediaServices = this._mediaServices;
                }
                
                // Set the contactId as the array location
                contact._contactId = info.contactId;
                
                var self = _GetNumber(this._mediaServices.username);
                
                // Get the main ID of that contact and check if it is self
                if (info.vcard.numbers) {
                    var number = null;
                    
                    // Get the primary number of this contact
                    for (var j in info.vcard.numbers) {
                        if (info.vcard.numbers[j].primary) {
                            number = _GetNumber("tel:" + info.vcard.numbers[j].number);
                            
                            if (number == self && !contact._id) {
                                contact._isSelf = true;
                                contact._id = _GetNumber("tel:" + info.vcard.numbers[j].number);
                            }
                        }
                    }
                    
                    // No primary number, just grab the first one
                    if (number == null) {
                        number = _GetNumber("tel:" + info.vcard.numbers[0].number);
                        
                        if (number == self) {
                            contact._isSelf = true;
                        }
                    }
                    
                    if (!contact._id) {
                        contact._id = number;
                    }
                }
                
                // Insert it into the contact list at the position of the ID if it doesn't exist yet
                if (!this._contacts[info.contactId]) {
                    this._contacts[info.contactId] = contact;
                }
                
                contact.state = Contact.State.UPDATED;
                
                isUpdated = true;
            } catch (error) {
                // No more contacts in the list
                break;
            }
        }
        
        // Done parsing, callback to notify of changes
        if (isUpdated) {
            this.state = ContactList.State.READY;
        }
    };
    
    /**
    Parse Presence List event
    @private
    */
    ContactList.prototype._parsePresenceList = function(userPresences) {
        var cl = this;
        var isUpdated = false;
        
        for (var i = 0;; i++) {
            try {
                var presence = userPresences[i];
                
                if (typeof(presence) == "undefined") {
                    // No more userPresences
                    break;
                }
                
                var user = _GetNumber(presence.entity);
                
                // Store presence information into contact the correct contact in our list
                for (var j = 0; j < this.size; j++) {
                    if (this.contact[j]._id == user) {
                        this.contact[j].state = Contact.State.UPDATING;
                    
                        // Get Avatar of users in the presence list
                        if (presence.person.statusIconEtag == "0") {
                            this.contact[j]._avatar = null;
                            cl.state = ContactList.State.READY;
                        } else if (presence.person.statusIconEtag) {
                            if (!this.contact[j].avatar || presence.person.statusIconEtag != this.contact[j].presence.statusIconEtag) {
                                this.contact[j].presence = presence.person;
                                
                                // TODO: there is a bug in WCG that returns the wrong statusIconUrl
                                this.contact[j].presence.statusIconUrl = 
                                    presence.person.statusIconUrl.substring(presence.person.statusIconUrl.indexOf("content/getavatar/"), presence.person.statusIconUrl.length);
                                this.contact[j].services = presence.services;
                                
                                // Get the avatar if no avatar or if the avatar has changed
                                this.contact[j].getAvatar(function(status) {
                                    if (status.success == true) {
                                        cl.state = ContactList.State.READY;
                                    }
                                });
                            }
                        }
                        
                        this.contact[j].presence = presence.person;
                        this.contact[j].services = presence.services;
                        
                        // If self
                        if (presence.self == "true") {
                            this.contact[j]._isSelf = true;
                            this._mediaServices._tagline = presence.person.freeText;
                            this._mediaServices._homepage = presence.person.homepage;
                            this._mediaServices._willingness = presence.person.willingness;
                        }
                        
                        this.contact[j].state = Contact.State.UPDATED;
                    } else {
                        // TODO: user doesn't exist in our ContactList? Is this possible?
                    }
                }
                
                isUpdated = true;
            } catch (error) {
                // No more userPresences
                break;
            }
        }
        
        // Done parsing, callback to notify of changes
        if (isUpdated) {
            this.state = ContactList.State.READY;
        }
    };
    
    /**
    Add user to network address book and local contact list.
    @param {Contact} contact The contact to add into our contact list
    @return void
    @throws {Error} Invalid contact
    @example
var contact = new Contact(info);
contactList.add(contact);
    */
    ContactList.prototype.add = function(contact) {
        if (!contact || !(contact instanceof Contact)) {
            throw new Error("Invalid contact");
        }
        
        var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS;
        var cl = this;
        
        logger.log("Adding contact...");
        
        var body = {
            vcard : {
                name : contact.name,
                numbers : contact.numbers,
                emails : contact.emails,
                addresses : contact.addresses,
                note : contact.note
            },
            syncId : this._syncId
        };
        
        // Create and send an add contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                var json = JSON.parse(req.responseText);
                
                // Success response 201 Created
                if (req.status == 201) {
                    logger.log("Add contact successful");
                    cl._syncId = json.syncId;
                    contact._contactId = json.contactId;
                    
                    // Put it in the array after add successful
                    cl.contact[contact._contactId] = contact;
                } else {
                    logger.log("Add contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Remove user from network address book and local contact list, and unfollows user as well.
    @function
    @param {Contact} contact Contact to remove
    @throws {Error} Invalid contact
    @throws {Error} Unable to perform action to self
    @return void
    @example
var contact = contactList.contact[0];
contactList.remove(contact);
    */
    ContactList.prototype.remove = function(contact) {
        if (!contact || !(contact instanceof Contact)) {
            throw new Error("Invalid contact");
        }
        if (contact.isSelf) {
            throw new Error("Unable to perform action to self");
        }
        
        // Remove user from presence list
        contact.unfollow();
        
        if (contact._contactId === "") {
            // No contactId, the user isn't in the address book
            var contactIndex = this.contact.indexOf(contact);
            if (contactIndex != -1) {
                // Remove from local ContactList
                this.contact.splice(contactIndex, 1);
                logger.log("Remove contact successful");
                
                return;
            } else {
                throw new Error("Invalid contact");
            }
        }
        
        var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS + '/' + contact._contactId;
        
        logger.log("Removing contact...");
        
        var body = {
            syncId : this._syncId
        };
        
        // Create and send an add contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("DELETE", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.setRequestHeader("X-http-method-override", "DELETE");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200) {
                    logger.log("Remove contact successful");
                    // cl._syncId = json.syncId;
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Remove contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Modify contact information.
    @function
    @param {Contact} contact Contact object with modified information
    @throws {Error} Invalid contact
    @throws {Error} Unable to perform action to self
    @return void
    @example
var contact = contactList.contact[0];
contact.name.given = "bob";
contactList.modify(contact);
    */
    ContactList.prototype.modify = function(contact) {
        if (!contact || !(contact instanceof Contact)) {
            throw new Error("Invalid contact");
        }
        if (contact.isSelf) {
            throw new Error("Unable to perform action to self");
        }
        
        var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS + '/' + contact._contactId;
        
        logger.log("Modifying contact...");
        
        var body = {
            vcard : {
                name : contact.name,
                numbers : contact.numbers,
                emails : contact.emails,
                addresses : contact.addresses,
                note : contact.note
            },
            // contactId : contact.id,
            syncId : this._syncId
        };
        
        // Create and send an add contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200) {
                    logger.log("Modify contact successful");
                    // cl._syncId = json.syncId;
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Modify contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Fetches all avatars of all users with a presence relationship.
    @function
    @return void
    @example
contactList.getAllAvatars();
    */
    ContactList.prototype.getAllAvatars = function() {
        var cl = this;
    
        for (var i = 0; i < cl.contact.length; i++) {
            // Can only get avatars of users with presence relationship
            if (cl.contact[i].presence) {
                cl.contact[i].getAvatar(function(status) {
                    if (status.success == true) {
                        cl.state = ContactList.State.READY;
                    }
                });
            }
        }
    };
    
    /**
    Called when the ContactList object changes its state.
    @event
    @type function
    @param evt An event describing the state change.
    @param {String} evt.type "statechange".
    @param {Chat.State} evt.newState New state.
    @param {Chat.State} evt.oldState Old state.
    @example
contactList.onstatechange = function(evt) {
    switch (evt.newState) {
        case ContactList.State.READY:
            // ContactList state has changed to READY
            break;
        case ContactList.State.ERROR:
            // ContactList state has changed to ERROR
            break;
        // ...
    }
};
    */
    ContactList.prototype.onstatechange = function(evt) {};
    
    /**
    Called when the ContactList object is ready and has been updated with new Contact information.
    @event
    @type function
    @param evt
    @param {ContactList} evt.contactList The ContactList object
    @example
contactList.onready = function(evt) {
    if (evt.contactList) {
        // Do stuff with the ContactList and Contacts
    }
};
    */
    ContactList.prototype.onready = function(evt) {};
    
    /**
    A presence follow request has been received
    @event
    @type function
    @param evt
    @param {Array} evt.contacts An array of Contact objects
    @example
contactList.onpresenceinvite = function(evt) {
    var contact = evt.contacts[0];
    contactList.add(contact);
    contact.follow();
};
    */
    ContactList.prototype.onpresenceinvite = function(evt) {};
    
    /**
    TODO: to complete
    */
    ContactList.prototype.onerror = function(evt) {};
    
    /**
    A new contact is created from a JSON object. This is a public constructor.
    @class A new contact is created from a JSON object. This is a public constructor.
    @param {Object} info An object containing a contact's info
    @property {Contact.State} state State of the contact
    @property {Object} name Object containing the name of the contact (has the following properties: name.given, name.family, name.middle, name.prefixes, name.suffixes)
    @property {Array} numbers Array containing the numbers of the contact (has the following properties: numbers.number, numbers.type, numbers.primary)
    @property {Array} emails Array containing the emails of the contact (has the following properties: emails.email, emails.type, emails.primary)
    @property {Array} addresses Array containing the addresses of the contact (has the following properties: addresses.type, addresses.pobox, addresses.street, addresses.ext-street, addresses.locality, addresses.region, addresses.postalcode, addresses.country)
    @property {String} note A note added to the contact
    @property {String} org Organization the contact belongs to
    @property {String} title The title of the contact
    @property {String} birthday The birthday date of the contact (format: yyyy-mm-dd)
    @property {String} photo A base 64 encoded data uri of the contact's photo
    @property {String} presenceState The state of the presence relationship with this contact (one of "active", "pending" or "terminated")
    @property {Object} presence The presence information of the contact (has the following properties: presence.willingness, presence.displayName, presence.statusIconUrl, presence.statusIconEtag, presence.freeText, presence.statusIconContentType, presence.statusIconFileSize, presence.homepage, presence.opdLinks)
    @property {Array} services An array of services published (as defined by RCS standards) by the contact (has the following properties: services.serviceStatus, services.serviceDescription, services.serviceVersion)
    @property {Boolean} isSelf Is this contact the user's self
    @property {Object} avatar A base 64 encoded data uri of the contact's avatar
    @example
var info = {
    "name":
        {"given": "givenName",
        "family": "familyName"},
    "addresses":[
        {
        "type": "HOME",
            "street": "a street",
            "locality": "a town",
            "region": "a region",
            "postalcode": "a postal code",
            "country": "a country"}],
    "numbers": [
        {
        "number": "1",
        "type": "MOBILE_HOME",
        "primary": "false"},
        {
        "number": "3",
        "type": "MOBILE_WORK",
        "primary": "true"},
        {
        "number": "2",
        "type": "HOME",
        "primary": "false"}],
    "emails": [
        {
        "email": "1@domain.com",
        "type": "WORK",
        "primary": "true"}],
    "note":"a note"
};
var contact = new Contact(info);
    */
    Contact = function(info) {
        var _state = Contact.State.NEW,
            _name = null,
            _numbers = [],
            _emails = [],
            _addresses = [],
            _note = "",
            _org = "",
            _title = "",
            _birthday ="",
            _photo = "",
            _presence = null, // RCS Presence attributes for this contact
            _services = null; // RCS Presence services
        
        if (info) {
            _name = info.name;
            _numbers = info.numbers;
            _emails = info.emails;
            _addresses = info.addresses;
            _note = info.note;
            _org = info.org;
            _title = info.title;
            _birthday = info.birthday;
            
            if (info.photo) {
                _photo = 'data:image/' + info.photoType + ';base64,' + info.photo;
            }
        }
        
        this._mediaServices = null;
        
        /**
        WCG URL for Presence list
        */
        this._url = null;
        
        /**
        Is the user self (boolean)
        */
        this._isSelf = false;
        
        /**
        The contact's telephone number
        */
        this._id = "";
        
        /**
        address book contactId (array location)
        */
        this._contactId = "";
        
        /**
        active, pending, terminated
        */
        this._presenceState = "";
        
        /**
        avatar file data uri base 64 encoded
        */
        this._avatar = null;
        
        /**
        @field state
        */
        Object.defineProperty(this, "state", {
            get: function() {
                return _state;
            },
            set: function(newState)
            {
                _state = newState;
                
                if (typeof(this.onstatechange) == "function") {
                    var evt = {type: "statechange", oldState : _state, state: newState};
                    this.onstatechange(evt);
                }
                
                if (newState == Contact.State.UPDATING && typeof(this.onupdating) == "function") {
                    this.onupdating({ contact : this });
                }
                else if (newState == Contact.State.UPDATED && typeof(this.onupdate) == "function") {
                    this.onupdate({ contact : this });
                }
            }
        });
        
        /**
        @field name
        */
        Object.defineProperty(this, "name", {
            get: function() { return _name; },
            set: function(name) { _name = name; }
        });
        
        /**
        @field numbers
        */
        Object.defineProperty(this, "numbers", {
            get: function() { return _numbers; },
            set: function(numbers) { _numbers = numbers; }
        });
        
        /**
        @field emails
        */
        Object.defineProperty(this, "emails", {
            get: function() { return _emails; },
            set: function(emails) { _emails = emails; }
        });
        
        /**
        @field addresses
        */
        Object.defineProperty(this, "addresses", {
            get: function() { return _addresses; },
            set: function(addresses) { _addresses = addresses; }
        });
        
        /**
        @field note
        */
        Object.defineProperty(this, "note", {
            get: function() { return _note; },
            set: function(note) { _note = note; }
        });
        
        /**
        @field org
        */
        Object.defineProperty(this, "org", {
            get: function() { return _org; },
            set: function(org) { _org = org; }
        });
        
        /**
        @field title
        */
        Object.defineProperty(this, "title", {
            get: function() { return _title; },
            set: function(title) { _title = title; }
        });
        
        /**
        @field birthday
        */
        Object.defineProperty(this, "birthday", {
            get: function() { return _birthday; },
            set: function(birthday) { _birthday = birthday; }
        });
        
        /**
        @field photo
        Data URI format of the photo
        */
        Object.defineProperty(this, "photo", {
            get: function() { return _photo; },
            set: function(photo) { _photo = photo; }
        });
        
        /**
        @field presenceState
        */
        Object.defineProperty(this, "presenceState", {
            get: function() { return this._presenceState; }
        });
        
        /**
        @field presence
        Presence information
        */
        Object.defineProperty(this, "presence", {
            get: function() { return _presence; },
            set: function(presence) { _presence = presence; }
        });
        
        /**
        @field services
        Services information from presence
        */
        Object.defineProperty(this, "services", {
            get: function() { return _services; },
            set: function(services) { _services = services; }
        });
        
        /**
        @field isSelf
        */
        Object.defineProperty(this, "isSelf", {
            get: function() { return this._isSelf; }
        });
        
        /**
        @field avatar
        */
        Object.defineProperty(this, "avatar", {
            get: function() { return this._avatar; }
        });
    };
    
    /**
    @namespace Describes the states of the Contact object.
    */
    Contact.State = {};
    
    /**
    The Contact object has been newly created
    */
    Contact.State.NEW = 0;
    
    /**
    The Contact object is being updated after receiving new information from the server
    */
    Contact.State.UPDATING = 1;
    
    /**
    The Contact object has been updated with new information
    */
    Contact.State.UPDATED = 2;
    
    /**
    Subscribe to this contact's Presence.
    @function
    @return void
    @throws {Error} Unable to perform action to self
    @example
contact = contactList.contact[0];
contact.follow();
    */
    Contact.prototype.follow = function() {
        if (this.isSelf) {
            throw new Error("Unable to perform action to self");
        }
    
        var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_ADD;
        
        logger.log("Following contact...");
        
        var body = {
            username : "tel:+" + this._id
        };
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No Content
                if (req.status == 204) {
                    logger.log("Follow contact request sent");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Follow contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Unsubscribe from this contact's Presence
    @function
    @return void
    @throws {Error} Unable to perform action to self
    @example
contact = contactList.contact[0];
contact.unfollow();
    */
    Contact.prototype.unfollow = function() {
        if (this.isSelf) {
            throw new Error("Unable to perform action to self");
        }
    
        var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_REMOVE;
        
        logger.log("Unfollowing contact...");
        
        var body = {
            username : "tel:+" + this._id
        };
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No Content
                if (req.status == 204) {
                    logger.log("Unfollow contact successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Unfollow contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Ignore/block the Presence request from this contact
    @function
    @return void
    @throws {Error} Unable to perform action to self
    @example
contactList.onpresenceinvite = function(evt) {
    var contact = evt.contacts[0];
    contactList.add(contact);
    contact.block();
};
    */
    Contact.prototype.block = function() {
        if (this.isSelf) {
            throw new Error("Unable to perform action to self");
        }
        
        var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_BLOCK;
        
        logger.log("Blocking contact...");
        
        var body = {
            username : "tel:+" + this._id
        };
        
        // Create and send a follow contact request
        var req = new _CreateXmlHttpReq();
        
        req.open("POST", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(body, null, " "));
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 204 No Content
                if (req.status == 204) {
                    logger.log("Block contact successful");
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Block contact failed: " + json.reason);
                    
                    // TODO: error
                }
            }
        };
    };
    
    /**
    Fetch the contact's Presence avatar. The avatar will be stored in the Contact.avatar field, and will trigger an onupdate callback on success.
    @function
    @param {Function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the avatar was fetched successfully or not
    @throws {Error} User has no avatar
    @return void
    @example
contact.getAvatar(function(evt) {
    if (evt.success) {
        // Update the avatar of this contact
    }
});
    */
    Contact.prototype.getAvatar = function(callback) {
        var contact = this;
        
        if (!this.presence.statusIconUrl)
            throw new Error("User has no avatar");
        
        var url = this._url + this.presence.statusIconUrl;
        
        logger.log("Getting avatar of " + this._id); 
        
        // Create and send a get avatar request
        var req = new _CreateXmlHttpReq();
        
        req.open("GET", url, true);
        req.setRequestHeader("Accept", "application/json, text/html");
        req.overrideMimeType("text/plain; charset=x-user-defined");
        req.send(null);
    
        // On response
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                // Success response 200 OK
                if (req.status == 200) {
                    logger.log("Get avatar successful");
                    
                    var imgType = req.getResponseHeader("Content-Type");
                    
                    var newAvatar = 'data:' + imgType + ';base64,' + _Base64encode(req.responseText);
                    
                    // Update only if different from old avatar
                    if (contact._avatar != newAvatar) {
                        contact.state = Contact.State.UPDATING;
                        contact._avatar = newAvatar;
                        
                        if (typeof(callback) == "function") {
                            var event = {success : true, failure: false};
                            callback(event);
                        }
                        
                        contact.state = Contact.State.UPDATED;
                    }
                } else {
                    var json = JSON.parse(req.responseText);
                    logger.log("Get avatar failed: " + json.reason);
                    
                    if (typeof(callback) == "function") {
                        var event = {success : false, failure: true};
                        callback(event);
                    }
                }
            }
        };
    };
    
    /**
    The contact has been updated successfully with new information
    @event
    @type function
    @param evt
    @example
contact.onupdate = function(evt) {
    // The contact has been updated
};
    */
    Contact.prototype.onupdate = function(evt) {};
    
    /**
    The contact is currently being updated with new information
    @event
    @type function
    @param evt
    @example
contact.onupdating = function(evt) {
    // The contact is being updated
};
    */
    Contact.prototype.onupdating = function(evt) {};
    
    /**
    Generate a general error callback
    @private
    */
    _InternalError = function(obj, code) {
        try {
            if (obj instanceof MediaServices) {
                obj.state = MediaServices.State.ERROR;
            } else if (obj instanceof Conference) {
                obj.state = Conference.State.ERROR;
            } else if (obj instanceof Call) {
                obj.state = Call.State.ERROR;
            } else if (obj instanceof FileTransfer) {
                obj.state = FileTransfer.State.ERROR;
            } else if (obj instanceof Chat) {
                obj.state = Chat.State.ERROR;
            } else if (obj instanceof GroupChat) {
                obj.state = GroupChat.State.ERROR;
            } else if (obj instanceof ContactList) {
                obj.state = ContactList.State.ERROR;
            } else if (obj instanceof Contact) {
                obj.state = Contact.State.ERROR;
            }
            
            if (typeof(obj.onerror) == "function") {
                var event = {type: "error", reason: code, target: obj};
                obj.onerror(event);
            }
        } catch (error) {
            logger.log("Invalid ERROR");
        }
    };
    
    /**
    Base 64 encoding of a String
    Source: http://stackoverflow.com/questions/7370943/retrieving-binary-file-content-using-javascript-base64-encode-it-and-reverse-de
    @private
    @param {String} str Input raw data
    @return {String} Base 64 encoded string
    */
    _Base64encode = function(str) {
        var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var out, i, len;
        var c1, c2, c3;

        len = str.length;
        i = 0;
        out = "";
        while (i < len) {
            c1 = str.charCodeAt(i++) & 0xff;
            if (i == len) {
                out += base64EncodeChars.charAt(c1 >> 2);
                out += base64EncodeChars.charAt((c1 & 0x3) << 4);
                out += "==";
                break;
            }
            c2 = str.charCodeAt(i++);
            if (i == len) {
                out += base64EncodeChars.charAt(c1 >> 2);
                out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
                out += base64EncodeChars.charAt((c2 & 0xF) << 2);
                out += "=";
                break;
            }
            c3 = str.charCodeAt(i++);
            out += base64EncodeChars.charAt(c1 >> 2);
            out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
            out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
            out += base64EncodeChars.charAt(c3 & 0x3F);
        }
        return out;
    };
    
    /**
    Parse the media types used in createCall/createConference. Also checks for invalid services. 
    For example, if the call is created as an audio/video call, but the user has registered with only audio, 
    the call will be reduced to an audio call.
    @private
    @param {MediaServices} mediaServices The parent MediaServices object
    @param {Object} mediaType Media services object(e.g. {audio:true,video:true})
    @return {Object} Mediatypes allowed for this call/conference
    */
    function _ParseMediaType(mediaServices, mediaType) {
        var parentMedia = mediaServices.mediaType.replace(/(\s)/g, "").split(",");
        var _mediaType = {};
        
        // Inherit media type, if undefined
        if (typeof(mediaType) == "undefined" || Object.keys(mediaType).length == 0) {
            if (parentMedia.indexOf("audio") != -1)
                _mediaType.audio = true;
            if (parentMedia.indexOf("video") != -1)
                _mediaType.video = true;
            
            return _mediaType;
        } else if (typeof(mediaType) != "object" || mediaType == "") {
            throw new Error("Invalid media types");
        }
        
        // Assert media type is allowed. E.g. If parent is only registered for audio, disallow "video" in mediaType.
        if (mediaType.audio) {
            if (mediaType.audio == true && parentMedia.indexOf("audio") != -1)
                _mediaType.audio = true;
        }
        if (mediaType.video) {
            if (mediaType.video == true && parentMedia.indexOf("video") != -1)
                _mediaType.video = true;
        }
        
        return _mediaType;
    }
    
    /**
    Determine the type(s) of media in the SDP by inspeting the "m" field of the SDP
    @private
    @param {Object} sdp An object containing SDP attributes.
    @return {Object} mediaType An array of media types.
    */
    function _ParseSDPMedia(sdp) {
        // TODO: can know the media type from the a=group:BUNDLE audio video line
        // Find the a=group:BUNDLE line
        // set mediaType.audio = true and/or mediaType.video = true
        
        var mediaType = {audio:false,video:false};
        
        for (var j = 0;; j++) {
            // Inspect the "m" field of the SDP
            try {
                var m = sdp[j].m;
                if (m.search("audio") != -1) {
                    mediaType.audio = true;
                } else if (m.search("video") != -1) {
                    mediaType.video = true;
                }
            } catch(error) {
                // Done
                break;
            }
        }
        
        return mediaType;
    }
    
    /**
    Get the number from a Tel or Sip uri
    @private
    */
    function _GetNumber(uri) {
        if (uri.indexOf("tel:+") == 0) {
            // Tel uri
            return uri.substring(5, uri.length);
        } else if (uri.indexOf("sip:") == 0) {
            // Sip uri
            return uri.substring(4, uri.indexOf("@"));
        } else {
            return "";
        }
    }
    
    /**
    Create an HTTP request
    @private
    @return {XMLHttpRequest} xmlhttp An XML/HTTP request
    */
    function _CreateXmlHttpReq(token) {
        var xmlhttp = null;

        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            // Users with ActiveX off
            try {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (error) {
                // Do nothing
            }
        }

        if (accessToken) {
            xmlhttp.o = xmlhttp.open;
            xmlhttp.open = function(a, b, c)
            {
                this.o(a,b + "?access_token=" + accessToken,c);
                //this.o(a,b + "?access_token=" + token,c);
                //this.setRequestHeader('Authorization', 'Bearer ' + token);
            };
        }
        xmlhttp.withCredentials = true;

        return xmlhttp;
    }
    
    /**
    The event channel
    @private
    @param {MediaServices} The MediaServices object
    */
    function _Channel(mediaService) {
        var timer = 2000,
            channel = this,
            _ms = mediaService;
        
        // Poll the channel
        this.pollChannel = function() {
            var channelURL = _ms._gwUrl + CHANNEL_RESOURCE;
            
            logger.log("Querying channel...");
            
            // Create and send a channel query request
            var req = new _CreateXmlHttpReq();
            
            req.open("GET", channelURL, true);
            req.setRequestHeader('Accept', 'application/json, text/html');
            //req.setRequestHeader('Cache-Control', 'no-cache');
            //req.setRequestHeader('Pragma', 'no-cache');
            req.send(null);
            
            // On response
            req.onreadystatechange = function() {
                if (this.readyState == 4) {
                    // Success response 200 OK
                    if (this.status == 200) {
                        logger.log("Get channel successful: " + this.status + " " + this.statusText + " " + this.responseText);
                    
                        var json = JSON.parse(this.responseText);
                        
                        // Parse channel events
                        for (var i = 0;; i++) {
                            var eventObject = null;
                            
                            // Get the event
                            try {
                                eventObject = json.events.list[i].eventObject;
                            } catch (error) {
                                // No more events in the list, get out
                                break;
                            }
                            
                            var type = eventObject["@type"],
                                state = eventObject.state,
                                from = eventObject.from;
                            
                            // Channel Handlers
                            if (type == "audiovideo" || type == "media-conference") {
                                var sdp = eventObject.sdp,
                                    resourceURL = eventObject.resourceURL,
                                    reason = eventObject.reason;
                                
                                // Tokenize the resourceURL
                                var tokens = resourceURL.split("/");

                                if (state.toLowerCase() == "session-open" || state.toLowerCase() == "session-modified" ) {
                                    // Audio video call session established
                                    var mediaConfIndex = tokens.indexOf("mediaconf");
                                    var audioVideoIndex = tokens.indexOf("audiovideo");
                                    var currentCall;
                                    
                                    if (mediaConfIndex != -1) {
                                        if(typeof(sdp) === "undefined") {
                                            continue;
                                        }
                                        _ms._call.confID = tokens[mediaConfIndex + 1];
                                        currentCall= _ms._call;
                                    } else if (audioVideoIndex != -1) {
                                        var callId= tokens[audioVideoIndex + 1];
                                        if(_ms._call._callID == null || _ms._call._callID == callId)    {
                                            currentCall= _ms._call;
                                        } 
                                        else if(_ms._transferTargetCall != null && _ms._transferTargetCall._callID == callId){
                                            currentCall= _ms._transferTargetCall;
                                        } else {
                                            console.log("What to do with call id: " + callId + " ?? ");
                                        }
                                        currentCall._callID = callId;
                                    }

                                    // DEPRECATED: to remove this if case
                                    try {   
                                        if (typeof(currentCall._pc) == "webkitDeprecatedPeerConnection") {
                                        //if (currentCall._pc instanceof webkitDeprecatedPeerConnection) { //throws exception
                                            var modIndex = tokens.indexOf("mod");
                                            if (modIndex != -1) {
                                                currentCall._modID = tokens[modIndex + 1];
                                                
                                                if (currentCall._isModerator) {
                                                    // Nothing
                                                } else {
                                                    var roapMessage = currentCall._DEPRECATEDroap.processRoapAnswer(_ms, sdp);
                                                    currentCall._pc.processSignalingMessage(roapMessage);
                                                }
                                            } else {
                                                if (currentCall._isModerator || (currentCall instanceof Conference && !currentCall._isModerator)) {
                                                    var roapMessage = currentCall._DEPRECATEDroap.processRoapAnswer(_ms, sdp);
                                                    currentCall._pc.processSignalingMessage(roapMessage);
                                                } else {
                                                    var roapMessage = currentCall._DEPRECATEDroap.processRoapOK(_ms);
                                                    currentCall._pc.processSignalingMessage(roapMessage);
                                                }
                                            }
                                        } else {
                                            if (currentCall._isModerator || (currentCall instanceof Conference && !currentCall._isModerator)) {
                                                var remoteSdp= _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);
                                                if (currentCall.isRTCConnection) {
                                                    // Check for emty INVITE
                                                        //generate Answer
                                                        var remoteDest= {};
                                                        remoteDest.type= 'answer';
                                                        remoteDest.sdp= remoteSdp;
                                                        console.log("Setting Remote RTCSessionDescription sdp = " + remoteSdp );
                                                        currentCall._pc.setRemoteDescription(new RTCSessionDescription(remoteDest),
                                                            function(){ console.log("Success Remote RTCSessionDescription");},
                                                            function(err){ console.log("Err Remote RTCSessionDescription " + err);});
                                                } else {
                                                    var sd = new SessionDescription(remoteSdp);
                                                    
                                                    // Get Ice candidates
                                                    var candidates = _GetCandidates(sd.toSdp());
                                                    currentCall._candidates = candidates;
                                                    
                                                    // Receive ANSWER SDP of callee
                                                    currentCall._pc.setRemoteDescription(currentCall._pc.SDP_ANSWER, sd);
                                                    
                                                    // Process the Ice Candidates
                                                    for (index in candidates) {
                                                        var candidate= new IceCandidate(candidates[index].label, candidates[index].candidate);
                                                        currentCall._pc.processIceMessage(candidate);
                                                    }
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        if (currentCall._isModerator || (currentCall instanceof Conference && !currentCall._isModerator)) {
                                            var sd = new SessionDescription(_SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes));
                                            
                                            // Get Ice candidates
                                            var candidates = _GetCandidates(sd.toSdp());
                                            currentCall._candidates = candidates;
                                            
                                            // Receive ANSWER SDP of callee
                                            currentCall._pc.setRemoteDescription(currentCall._pc.SDP_ANSWER, sd);
                                            
                                            // Process the Ice Candidates
                                            for (index in candidates) {
                                                var candidate= new IceCandidate(candidates[index].label, candidates[index].candidate);
                                                currentCall._pc.processIceMessage(candidate);
                                            }
                                        }
                                    }
                                } else if (state.toLowerCase() == "session-terminated") {
                                    // Audio video call terminated
                                    var audioVideoIndex = tokens.indexOf("audiovideo");
                                    var callId= tokens[audioVideoIndex + 1];
                                    if(_ms._call._callID == callId) {
                                        currentCall= _ms._call;
                                    } 
                                    else {
                                        currentCall= _ms._transferTargetCall;
                                    }
                                    currentTerminatedCall(currentCall,eventObject);                                 
                                } else if (state.toLowerCase() == "invitation-received") {
                                    // Receive audio video call invitation
                                    var index = tokens.indexOf("audiovideo");
                                    var mediaType = _ParseSDPMedia(sdp);
                                    
                                    // Set the media type of the call invitation
                                    mediaType = _ParseMediaType(_ms, mediaType);
                                    
                                    // Create a new IncomingCall object and save the remote SDP
                                    _ms._call = new IncomingCall(_ms, from, mediaType);
                                    _ms._call._isModerator= false;
                                    _ms._call.mediaType= mediaType;
                                    _ms._call._url = _ms._host + eventObject.resourceURL;
                                    _ms._call._callID = tokens[index + 1];
                                    
                                    // Parse the SDP
                                    _ms._call._sdp.type = "ANSWER";
                                    _ms._call._sdp.sdp = _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);                                   
                                    logger.log("Network receive sdp offer: " + _ms._call._sdp.sdp);

                                    // DEPRECATED: to remove
                                    _ms._call._DEPRECATEDsdp = sdp;
                                    
                                    // Grab the Ice candidates
                                    _ms._call._candidates = _GetCandidates(_ms._call._sdp.sdp);
                                    
                                    _ms._call.state = Call.State.RINGING;
                                } else if (state.toLowerCase() == "mod-terminated") {
                                    var index = tokens.indexOf("mod");                                  
                                    logger.log("Terminating modification: " + tokens[index + 1]);   
                                    var currentCall= _ms._call;
                                    currentCall._modID = null;
                                    var remoteSdp= _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);
                                    
                                    _ms._call._sdp.sdp = _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);
                                    
                                
                                    if(_ms._call._sdp.sdp.indexOf("recvonly")!=-1){
                                    
                                        _ms._call.state = Call.State.HOLDING;
                                        _ms._call._pc.localStreams[0].audioTracks[0].enabled = false;
                                        
                                        if(_ms._call._pc.localStreams[0].videoTracks && _ms._call._pc.localStreams[0].videoTracks.length > 0){
                                            _ms._call._pc.localStreams[0].videoTracks[0].enabled = false;
                                        }
                                        console.log("Hold call successful...other party is waiting.");
                                        
                                    }else if(_ms._call._sdp.sdp.indexOf("sendonly") != -1){
                                        _ms._call.state = Call.State.WAITING;
                                        console.log("Hold call successful...waiting for other party to resume.");                                       
                                    }else if(_ms._call._sdp.sdp.indexOf("sendrecv")!=-1){
                                    
                                        _ms._call.state = Call.State.ONGOING;
                                        _ms._call._pc.localStreams[0].audioTracks[0].enabled = true;
                                        
                                        if(_ms._call._pc.localStreams[0].videoTracks && _ms._call._pc.localStreams[0].videoTracks.length > 0){
                                            _ms._call._pc.localStreams[0].videoTracks[0].enabled = true;
                                        }
                                        console.log("Resume call successful...call ongoing.");
                                    }
                                    
                                    if (currentCall.isRTCConnection && currentCall._isModifModerator) {
                                        var remoteDest= {};
                                        remoteDest.type= 'answer';
                                        remoteDest.sdp= remoteSdp;
                                        currentCall._pc.setRemoteDescription(new RTCSessionDescription(remoteDest),
                                            function(){ console.log("Success Remote RTCSessionDescription");},
                                            function(err){ console.log("Err Remote RTCSessionDescription " + err);});                                                                                               
                                    }
                                    currentCall._isModifModerator=null;
                                } else if (state.toLowerCase() == "mod-received") {
                                    var modIndex = tokens.indexOf("mod");                                   
                                    var callModId= tokens[modIndex + 1];
                                    var currentCall= _ms._call;                                     
                                    currentCall._modID= callModId;
                                    currentCall._sdp.sdp = _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);
                                    
                                    if(currentCall._sdp.sdp.indexOf("sendonly")!=-1){
                                        _ms._call.state = Call.State.TRANSITION;
                                    }
                                    
                                    logger.log("Processing modification: " + currentCall._modID);
                                    if(typeof(sdp) === "undefined") {
                                        logger.log("Generate Mod offer");
                                        currentCall._isModifModerator= true; //offer
                                        currentCall._pc.createOffer(function(sdp){
                                            console.log("Mod SDP offer from Browser = " + sdp.sdp);
                                            currentCall._sdp.sdp = sdp.sdp;
                                            currentCall._sdp.type = "OFFER";
                                            currentCall._pc.setLocalDescription(new RTCSessionDescription(sdp),
                                                function(){ console.log("Generated Modification offer");
                                                    currentCall._sendSignaling(currentCall._pc.localDescription.type, currentCall._pc.localDescription.sdp);                                    
                                                },
                                                function(err){ console.log("Err setLocalDescription " + err);});
                                          }, 
                                          function(err){ console.log("Err answer " + err);}, 
                                          currentCall.mediaType);
                                    } else {
                                        currentCall._isModifModerator= false; //answer
                                        logger.log("Generate Mod answer");
                                        currentCall._sdp.type = "ANSWER";
                                        currentCall._sdp.sdp = _SDPToString(eventObject.sdpSessionOrigin, sdp, eventObject.attributes);
                                        currentCall._doAnswer();
                                    }
                                } else if (state.toLowerCase() == "transfer-initiated") {
                                    console.log("transfer-initiated");
                                } else if (state.toLowerCase() == "transfer-terminated") {
                                    console.log("transfer-terminated");
                                    //Wait for the other leg session-terminated event                                   
                                } else {
                                    // Unhandled event
                                    logger.log("Unhandled audio video channel event: " + type + " " + state);
                                }
                            } else if (type == "file-transfer") {
                                var fileName = eventObject.fileName,
                                    fileSize = eventObject.fileSize,
                                    contentType = eventObject.contentType,
                                    ftId = eventObject.ftId;
                            
                                // Get the current file transfer object in the hashmap
                                var ft = null;
                                if (_ms._ftp) {
                                    ft = _ms._ftp.get(ftId);
                                }
                                
                                if (state.toLowerCase() == "session-open" && ft) {
                                    if (ft instanceof OutgoingFileTransfer) {
                                        logger.log("Uploading...");
                                        
                                        // Automatically start uploading
                                        ft._id = ftId;
                                        ft._uploadFile();
                                    } else {
                                        logger.log("Downloading...");
                                        
                                        // Automatically start downloading
                                        ft._downloadFile();
                                    }
                                } else if (state.toLowerCase() == "session-terminated" && ft) {
                                    var code = eventObject.code;
                                    
                                    // File transfer session terminated
                                    logger.log("session-terminated");
                                    
                                    if (ft.state != FileTransfer.State.ERROR &&
                                            ft.state != FileTransfer.State.CANCELED) {
                                        // If not in an error state, check what error code we've received
                                        switch (code) {
                                            case 487:
                                            case 603:
                                                ft.state = FileTransfer.State.CANCELED;
                                                break;
                                            case 403:
                                                _InternalError(ft, FileTransfer.Error.FILE_SIZE_LIMIT);
                                                break;
                                            case 486:
                                                _InternalError(ft, FileTransfer.Error.TIMEOUT);
                                                break;
                                            case 480:
                                            case 500:
                                                _InternalError(ft, FileTransfer.Error.INVALID_USER);
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                } else if (state.toLowerCase() == "invitation-received") {
                                    // File transfer invitation received
                                    if (ft) {
                                        // Already had an old file transfer session from same user, remove it
                                        _ms._ftp.remove(ftId);
                                    } else {
                                        ft = new IncomingFileTransfer(_ms, from);
                                        ft._url = _ms._gwUrl + FILETRANSFER_RESOURCE;
                                        ft._id = ftId;
                                        ft._fileName = fileName;
                                        ft._fileSize = fileSize;
                                        ft._fileType = contentType;
                                        
                                        ft.state = FileTransfer.State.INVITATION_RECEIVED;
                                        
                                        // Put the new object in the hashmap
                                        _ms._ftp.put(ftId, ft);
                                    }
                                }
                            } else if (type == "address-book") {
                                // An address book update
                                var contacts = eventObject.contacts;
                                //var abId = eventObject.abId; // TODO: unused ????
                                
                                _ms._contactList._syncId = eventObject.syncId;
                                
                                if (contacts) {
                                    _ms._contactList._parseAddressBook(contacts);
                                }
                            } else if (type == "message") {
                                var body = eventObject.body,
                                    //contentType = eventObject.contentType,
                                    typeMessage = eventObject.type;
                                    var msg = {
                                        from: from,
                                        message: body
                                    };
                                        
                                
                                if (typeMessage == "session-message") {
                                    // Check if it's a new chat session with another user
                                    if (_ms._chat.contains(from) == -1) {
                                        var newChat = new Chat(_ms, from);
                                        newChat._url = _ms._gwUrl + CHAT_RESOURCE;
                                        newChat.state = Chat.State.ACTIVE;
                                        
                                        var evt = {
                                            chat: newChat,
                                            call: null,                                     
                                            conf: null
                                        };
                                    
                                        _ms.oninvite(evt);
                                        
                                        newChat.onmessage(msg);
                                        _ms._chat.put(from, newChat);
                                    } else {
                                        // Chat already exists
                                        var ongoingChat = _ms._chat.get(from);
                                        
                                        if (ongoingChat.state != Chat.State.ACTIVE) {
                                            ongoingChat.state = Chat.State.ACTIVE;
                                        }

                                        ongoingChat.onmessage(msg); 
                                    }
                                } else if (typeMessage == "message") {
                                    logger.log("PAGER MODE MESSAGE");                                       
                                    _ms.oninstantmessage(msg);
                                }
                            } else if (type == "composing") {
                                var refresh = eventObject.refresh;
                            
                                var ongoingChat = _ms._chat.get(from);
                                
                                var evt = {
                                    from : from,
                                    state : state,
                                    refresh : refresh
                                };
                                
                                ongoingChat.oncomposing(evt); 
                            } else if (type == "media-message") {
                                // Received a media-message
                                var from = eventObject.from,
                                    //contentType = eventObject.contentType,
                                    //size  = eventObject.size,
                                    url = eventObject.url;
                            
                                var ongoingChat = _ms._chat.get(from);
                                ongoingChat.state = Chat.State.ACTIVE;
                                
                                // Get the file ID from url
                                var id = url.substring(url.indexOf("fileRef") + 8, url.length);
                                
                                // Get the file automatically
                                ongoingChat._getMedia(id, from);
                            } else if (type == "message-failure") {
                                var to = eventObject.to,
                                    //msgId = eventObject.msgId,
                                    code = eventObject.code;
                                
                                var ongoingChat = _ms._chat.get(to);
                                
                                switch (code) {
                                    case 480:
                                        _InternalError(ongoingChat, Chat.Error.USER_NOT_ONLINE);
                                        break;
                                    case 500:
                                        _InternalError(ongoingChat, Chat.Error.INVALID_USER);
                                        break;
                                    case 404:
                                    default:
                                        _InternalError(ongoingChat, Chat.Error.NETWORK_FAILURE);
                                        break;
                                }
                            } else if (type == "conference-invite"){
                                // Group chat invitation
                                var referredBy = eventObject.referredBy,
                                    confId = eventObject.confId,
                                    subject = eventObject.subject,
                                    members = eventObject.members;
                                
                                var newGroupChat = new GroupChat(_ms, subject, members, referredBy, confId);
                                newGroupChat._url = _ms._gwUrl + GROUP_CHAT_RESOURCE;
                                
                                var evt = {
                                    groupChat: newGroupChat,
                                    chat: null,                             
                                    call: null,
                                    conf: null
                                };
                            
                                _ms.oninvite(evt);
                            } else if (type == "conference-info") {
                                // Group chat updated info (users and states)
                                var userCount = eventObject.userCount,
                                    confId = eventObject.confId,
                                    //state = eventObject.state,
                                    //reason = eventObject.reason,
                                    users = eventObject.users;
                                
                                var ongoingGroupChat = _ms._chat.get(confId);
                                
                                if (ongoingGroupChat) {
                                    if (userCount == 0 || users.length == 0) {
                                        // Users declined group chat invite
                                        ongoingGroupChat.state = GroupChat.State.ENDED;
                                    } else {
                                        if (ongoingGroupChat.state != GroupChat.State.ENDED) {
                                            // The group chat is ongoing
                                            if (ongoingGroupChat.state != GroupChat.State.IN_PROGRESS) {
                                                ongoingGroupChat.state = GroupChat.State.IN_PROGRESS;
                                            }
                                            
                                            // Handle the members' statuses
                                            for (var j = 0; j < users.length; j++) {
                                                var l = 0;
                                                for (; l < ongoingGroupChat.members.length; l++) {
                                                    // Received a disconnected event of self
                                                    if (_ms.username == users[j].entity && users[j].status == "disconnected") {
                                                        ongoingGroupChat.state = GroupChat.State.ENDED;
                                                    }
                                                    
                                                    if (ongoingGroupChat.members[l].entity == users[j].entity) {
                                                        ongoingGroupChat.members[l].status = users[j].status;
                                                        break;
                                                    }
                                                }
                                                
                                                // New user
                                                if (l == ongoingGroupChat.members.length) {
                                                    ongoingGroupChat.members.push(users[j]);
                                                }
                                            }
                                            
                                            if (ongoingGroupChat.state != GroupChat.State.ENDED) {
                                                ongoingGroupChat.onupdate({ members : ongoingGroupChat.members });
                                            }
                                        } else {
                                            // The group chat has already ended
                                        }
                                    }
                                }
                            } else if (type == "conference-message") {
                                // Group chat message received
                                var from = eventObject.from,
                                    confId = eventObject.confId,
                                    body = eventObject.body;
                                    
                                logger.log("GroupChat message: confId: " + confId + ", from: " + from + ", body: " + body);
                                
                                var ongoingGroupChat = _ms._chat.get(confId);
                                
                                var evt = {
                                    confId: confId,
                                    from: from,
                                    message: body
                                };
                                
                                ongoingGroupChat.onmessage(evt);
                            } else if (type == "conference-media-message") {
                                // Group chat media message received
                                var from = eventObject.from,
                                    confId = eventObject.confId,
                                    //contentType = eventObject.contentType,
                                    //size = eventObject.size,
                                    url = eventObject.url;
                                
                                var ongoingGroupChat = _ms._chat.get(confId);
                                
                                // Get the file ID from url
                                var id = url.substring(url.indexOf("fileRef") + 8, url.length);
                                
                                // Get the file automatically
                                ongoingGroupChat._getMedia(id,from);
                            } else if (type == "conference-composing") {
                                // Group chat is composing received
                                var from = eventObject.from,
                                    confId = eventObject.confId,
                                    refresh = eventObject.refresh,
                                    state = eventObject.state;
                                    
                                var ongoingGroupChat = _ms._chat.get(confId);
                                
                                var evt = {
                                    from: from,
                                    refresh : refresh,
                                    state : state
                                };
                                
                                ongoingGroupChat.oncomposing(evt);  
                            } else if (type == "contactlist") {
                                // List of users with a presence relationship
                                var contacts = eventObject.contacts;
                                
                                if (contacts) {
                                    // Update our contact list
                                    _ms._contactList._parseContactList(contacts);
                                }
                            } else if (type == "presencelist") {
                                // Presence information
                                var userPresences = eventObject.userPresences;
                                
                                if (userPresences) {
                                    _ms._contactList._parsePresenceList(userPresences);
                                }
                            } else if (type == "anonymous-subscription") {
                                // Event containing individual user with services/isIMSUser
                                //var isIMSUser = eventObject.isIMSUser;
                                //var services = eventObject.services;
                                
                                // TODO: implement if we need anonymous subscribe
                            } else if (type == "watcherlist") {
                                // List of Presence follow requests
                                var contacts = eventObject.contacts;
                                
                                if (contacts) {
                                    // An array of Contacts with presence request
                                    var array = [];
                                    
                                    for (var j in contacts) {
                                        var uri = contacts[j].uri;
                                        var found = false;
                                        
                                        // Find that Contact in ContactList
                                        for (var l in _ms._contactList.contact) {
                                            if (_GetNumber(uri) == _ms._contactList.contact[l]._id) {
                                                array.push(_ms._contactList.contact[l]);
                                                found = true;
                                            }
                                        }
                                        
                                        // User not found, create a new contact
                                        if (found == false) {
                                            var info = {
                                                numbers : [{
                                                    number : contacts[j].uri
                                                }]
                                            };
                                            
                                            var contact = new Contact(info);
                                            contact._mediaServices = _ms;
                                            contact._url = _ms._gwUrl;
                                            contact._id = _GetNumber(contacts[j].uri);
                                            array.push(contact);
                                        }
                                    }
                                    
                                    // Presence invite callback
                                    var evt = { contacts : array };
                                    _ms._contactList.onpresenceinvite(evt);
                                }
                            } else {
                                // Unhandled event
                                state = eventObject.state;
                                logger.log("Unhandled channel event: " + type + " " + state);
                            }
                        }
                        
                        // Poll again
                        if (_ms._channel != null) {
                            channel.pollChannel();
                            timer = 2000;
                        }
                    }
                    // Success response 204 No Content
                    else if (this.status == 204) {
                        logger.log("Get channel successful: " + this.status + " " + this.statusText + " " + this.responseText);
                        
                        // Poll again
                        if (_ms._channel != null) {
                            channel.pollChannel();
                            timer = 2000;
                        }
                    }
                    // Error response
                    else {
                        if (timer >= 128000) {
                            // Try to logout since channel hasn't responded for 4 minutes
                            _ms.unregister();
                        } else {
                            // If we are unable to poll the channel, attempt to poll for 2 minutes exponentially, then stop
                            if (_ms._channel != null) {
                                timer *= 2;
                                logger.log("Get channel unsuccessful: " + this.responseText);
                                setTimeout(function(){channel.pollChannel();},timer);
                            }
                        }
                    }
                }
            };
        };
    }
    
    function currentTerminatedCall(currentCall, eventObject){
        if (currentCall) {
            if (currentCall.state != Call.State.ENDED) {
            // Cleanup the Peer Connection
                if (currentCall._pc && currentCall._pc.close) {
                    currentCall._pc.close();
                    currentCall._pc = null;
                    if(currentCall.localStreams[0] && currentCall.localStreams[0].stop){
                        currentCall.localStreams[0].stop();
                    }
                    if(currentCall.remoteStreams[0] && currentCall.remoteStreams[0].stop){
                        currentCall.remoteStreams[0].stop();
                    }
                }
            
                // Clear moderator flag
                currentCall._isModerator = null;
                currentCall._callID = null;

                currentCall.state = Call.State.ENDED;
                if (typeof(currentCall.onend) == "function") { 
                    var endingReason= (typeof(eventObject.reason) === "undefined")?"Call terminated":eventObject.reason;
                    currentCall.onend({reason: endingReason}); 
                }
            }
        }   
    }
    
    /**
    Build WCG signaling SDP object from SDP string
    @private
    @param {String} recipient The recipient of the call
    @param {String} Offer SDP
    @return {Object} The SDP in accepted WCG json format
    */
    function _ParseSDP(recipient, sdp) {
        var SDP = {};       
        if (recipient) {
            SDP = {
                to : recipient,
                sdp : []
            };
        } else {
            SDP = {
                sdp : []
            };
        }
        
        var sdp_string = JSON.stringify(sdp);       
        var mediaIndex= sdp_string.indexOf("m=");
        var commonPart= sdp_string.substring(0, mediaIndex);        
        var mediaPart= sdp_string.substring(mediaIndex);

        // Get the v line
        var v_pattern = /v=(.*?)(?=\\r\\n)/g;
        var v_match = v_pattern.exec(commonPart);

        // Get the o line
        var o_pattern = /o=(.*?)(?=\\r\\n)/g;
        var o_match = o_pattern.exec(commonPart);

        // Get the s line
        var s_pattern = /s=(.*?)(?=\\r\\n)/g;
        var s_match = s_pattern.exec(commonPart);

        // Get the t line
        var t_pattern = /t=(.*?)(?=\\r\\n)/g;
        var t_match = t_pattern.exec(commonPart);

        // Get the a line
        //TODO - WCG does not support multiple attributes.. Will be fix in next release
        var a_pattern = /a=(.*?)(?=\\r\\n)/g;
        var a_match = a_pattern.exec(commonPart);

        // Split all media
        var media_line_array = mediaPart.split("m=");
        
        var doCommonPart= true;
        for (var index in media_line_array) {
            if(media_line_array[index] === "") continue;
            var m = "m=" + media_line_array[index];
            var lines_array = m.split("\\r\\n");
            lines_array.pop();
            
            // For each media, split all the lines
            // Find the m, the c, and the a
            var m_struct = {};
            if (doCommonPart) {
                doCommonPart= false;
                if(a_match == null){
                    m_struct = {
                        v : v_match[1],
                        o : o_match[1],
                        s : s_match[1],
                        t : t_match[1],
                        m : "",
                        c : "",
                        attributes : []
                    };
                } else {
                    m_struct = {
                        v : v_match[1],
                        o : o_match[1],
                        s : s_match[1],
                        t : t_match[1],
                        a : a_match[1],
                        m : "",
                        c : "",
                        attributes : []
                    };
                }
            } else {
                m_struct = {
                    m : "",
                    c : "",
                    attributes : []
                };
            }
            
            for(var i in lines_array) {
                var line = lines_array[i];
                
                if (line[0] == "m") {
                    m_struct.m = line.substring(2);
                }
                
                if (line[0] == "c") {
                    m_struct.c = line.substring(2);
                }
                
                if (line[0] == "a") { 
                    var a_line = { a : line.substring(2) };                 
                    m_struct.attributes.push(a_line);
                }
            }   
            
            SDP.sdp.push(m_struct);
        }
        
        logger.log(JSON.stringify(SDP,null, " "));      

        return SDP;
    }
    
    
    /**
    Build SDP string from SDP object
    @private
    @param {Object} sdp WCG json SDP
    @returns {String} SDP as string
    */
    function _SDPToString(origin, sdp, attributes) {
        // TODO: WCG should return v= o= s= t= a= lines, parse them
        // Hardcode this for now
                
        var wcgSdp;
        if(typeof(origin) === "undefined") {        
            wcgSdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
        } else {
            wcgSdp = "v=0\r\n" + origin + "\r\ns=\r\nt=0 0\r\n";
        }
        
        if(typeof(attributes) != "undefined" && attributes != ""){
            wcgSdp+= attributes + "\r\n";
        }
        
        for (mediaIndex in sdp) {
            wcgSdp += "m=" + sdp[mediaIndex].m + "\r\n";
            wcgSdp += "c=" + sdp[mediaIndex].c + "\r\n";
            for(attributeIndex in sdp[mediaIndex].attributes) {
                wcgSdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
            }
        }
        
        return wcgSdp;
    }
    
    /**
    Retrieve candidates from sdp
    @private
    @param {String} sdp SDP as string
    @returns {Array} Array of Ice candidates
    */
    function _GetCandidates(sdp) {
        var candidates = [];
        
        var lines = sdp.split("\r\n");
        var labelIndex = -1;
        
        for (i in lines) {
            if (lines[i].indexOf("m=") == 0) {
                labelIndex++;
            } else if (lines[i].indexOf("a=candidate") == 0) {
                candidates.push({label: labelIndex, candidate: lines[i]});
            }
        }
        
        return candidates;
    }

    /**
    ROAP message handling object
    @deprecated Not used for JSEP. To remove when ROAP is no longer supported.
    @private
    */
    function _DEPRECATEDRoap() {
        // WCG roap object 
        var _H2SRoap = {
            messageType : "",
            SDP : [],
            offererSessionId : "" ,
            answererSessionId : "",
            
            reset : function() {
                messageType = "",
                SDP = [],
                offererSessionId = "" ,
                answererSessionId = "";
            }
        };
        
        // Parse a ROAP message and return an SDP
        this.parseROAP = function(message) {
            var json = JSON.parse(message.slice(message.indexOf("{")), message.lastIndexOf("}"));
            _H2SRoap.reset();
            
            _H2SRoap.messageType = json.messageType;
            _H2SRoap.offererSessionId = json.offererSessionId;
            _H2SRoap.answererSessionId = json.answererSessionId;
            _H2SRoap.SDP = null;
                
            if (json.sdp) {
                var SDP = {
                    v : "",
                    o : "",
                    s : "",
                    t : "",
                    sdp : []
                };
            
                var sdp_string = JSON.stringify(json.sdp);
                // Get the v line
                var v_pattern = /v=(.*?)(?=\\r\\n)/g;
                var v_match = v_pattern.exec(sdp_string);
                SDP.v = v_match[1];

                // Get the o line
                var o_pattern = /o=(.*?)(?=\\r\\n)/g;
                var o_match = o_pattern.exec(sdp_string);
                SDP.o = o_match[1];

                // Get the s line
                var s_pattern = /s=(.*?)(?=\\r\\n)/g;
                var s_match = s_pattern.exec(sdp_string);
                SDP.s = s_match[1];

                // Get the t line
                var t_pattern = /t=(.*?)(?=\\r\\n)/g;
                var t_match = t_pattern.exec(sdp_string);
                SDP.t = t_match[1];

                // Get all media
                var media_pattern = /m=(.*)/g;
                var media_match = media_pattern.exec(sdp_string);
                var media = media_match[1];

                // Split all media
                var media_line_array = media.split("m=");
                
                for (var index in media_line_array) {
                    var m = "m=" + media_line_array[index];
                    var lines_array = m.split("\\r\\n");
                    lines_array.pop();
                    
                    // For each media, split all the lines
                    // Find the m, the c, and the a
                    var m_struct = {
                        m : "",
                        c : "",
                        attributes : []
                    };
                    
                    for(var i in lines_array) {
                        var line = lines_array[i];
                        
                        if (line[0] == "m") {
                            m_struct.m = line.substring(2);
                        }
                        
                        if (line[0] == "c") {
                            m_struct.c = line.substring(2);
                        }
                        if (line[0] == "a") { 
                            var a_line = { a : line.substring(2) };
                            m_struct.attributes.push(a_line);
                        }
                        
                    }
                    
                    SDP.sdp.push(m_struct);
                }
                
                _H2SRoap.SDP = SDP;
            }
            
            return _H2SRoap;
        };
        
        // Build the OFFER ROAP message and process it
        this.processRoapOffer = function(mediaServices, sdp) {
            logger.log("Processing an OFFER...");
            var offererSessionId = null;
            var answererSessionId = null;
            var seq = 1;
            if (mediaServices._call._isModerator || (mediaServices._call instanceof Conference && !mediaServices._call._isModerator)) {
                seq = 2;
                offererSessionId = _H2SRoap.offererSessionId;
                answererSessionId = _H2SRoap.answererSessionId;
            } else {
                offererSessionId = this.idGenerator();
                seq = 1;
            }
            var tieBreaker = this.tieBreakerGenerator();

            //build the sdp

            //build the ROAP message
            //the sdp has been set on invitation received
            var wcgSdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
            for (mediaIndex in sdp) {
                wcgSdp += "m=" + sdp[mediaIndex].m + "\r\n";
                wcgSdp += "c=" + sdp[mediaIndex].c + "\r\n";
                for(attributeIndex in sdp[mediaIndex].attributes) {
                    wcgSdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
                }
            }

            var roapStruct = {
                "messageType" : "OFFER",
                "offererSessionId" : offererSessionId,
                "answererSessionId" : answererSessionId,
                "sdp" : wcgSdp,
                "seq" : seq,
                "tieBreaker" : tieBreaker
            };

            var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
            
            return roapMessage;
        };
        
        // Build the ANSWER ROAP message and process it
        this.processRoapAnswer = function(mediaServices, sdp) {
            logger.log("Processing an ANSWER...");
            var offererSessionId = null;
            var answererSessionId = null;
            var seq = 2;

            if (mediaServices._call._isModerator || (mediaServices._call instanceof Conference && !mediaServices._call._isModerator)) {
                seq = 1;
                offererSessionId = _H2SRoap.offererSessionId;
                answererSessionId = this.idGenerator();
            } else {
                seq = 2;
                offererSessionId = _H2SRoap.offererSessionId;
                answererSessionId = _H2SRoap.answererSessionId;
            }

            //build the sdp

            //build the ROAP message
            //the sdp has been set on invitation received
            var wcgSdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
            for(mediaIndex in sdp) {
                wcgSdp += "m=" + sdp[mediaIndex].m + "\r\n";
                wcgSdp += "c=" + sdp[mediaIndex].c + "\r\n";
                for(attributeIndex in sdp[mediaIndex].attributes) {
                    wcgSdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
                }
            }

            var roapStruct = {
                "messageType" : "ANSWER",
                "offererSessionId" : offererSessionId,
                "answererSessionId" : answererSessionId,
                "sdp" : wcgSdp,
                "seq" : seq
            };

            var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
            
            return roapMessage;
        };
        
        // Build the OK ROAP message and process it
        this.processRoapOK = function(mediaServices) {
            logger.log("Processing an OK...");

            if(!_H2SRoap.answererSessionId) {
                _H2SRoap.answererSessionId = this.idGenerator();
            }
            var offererSessionId = _H2SRoap.answererSessionId;
            var answererSessionId = _H2SRoap.offererSessionId;
            var seq = 1;
            if (mediaServices._call._isModerator) {
                seq = 2;
            } else {
                seq = 1;
            }
            var roapStruct = {
                "messageType" : "OK",
                "offererSessionId" : offererSessionId,
                "answererSessionId" : answererSessionId,
                "seq" : seq
            };

            var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
            logger.log("roap message: " + roapMessage);
            return roapMessage;
        };
        
        // The offererSessionId and the answererSessionId must be of 32 characters
        this.idGenerator = function() {
            var S4 = function() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };
            return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
        };
        
        // The tieBreaker must be of 10 digits
        this.tieBreakerGenerator = function() {
            var id = Math.floor(Math.random() * 90000) + 1000000000;
            return id;
        };
    }

    /**
    Hashmap implementation
    @private
    */
    var _HashMap = function() {
        var obj = [];
        obj.size = function () {
            return this.length;
        };
        obj.isEmpty = function () {
            return this.length == 0;
        };
        obj.contains = function (key) {
            for (i in this) {
                if (this[i].key == key) {
                    return i;
                }
            }
            return -1;
        };
        obj.get = function (key) {
            var i = this.contains(key);
            if (i !== -1) {
                return this[i].value;
            }
        };
        obj.put = function (key, value) {
            if (this.contains(key) == -1) {
                this.push({'key': key, 'value': value});
                return true;
            }
            return false;
        };
        obj.clear = function () {
            for (i in this) {
                this.pop(i);
            }
        };
        obj.remove = function(key) {
            var i = this.contains(key);
            if (i) {
                this.splice(i,1);
            }
        };
        obj.getAll = function() {
            return this;
        };
        return obj;
    };
})(window);


/*
Copyright 2007 Adobe Systems Incorporated

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.


THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

/*
 * The Bridge class, responsible for navigating AS instances
 */
function FABridge(target,bridgeName)
{
    this.target = target;
    this.remoteTypeCache = {};
    this.remoteInstanceCache = {};
    this.remoteFunctionCache = {};
    this.localFunctionCache = {};
    this.bridgeID = FABridge.nextBridgeID++;
    this.name = bridgeName;
    this.nextLocalFuncID = 0;
    FABridge.instances[this.name] = this;
    FABridge.idMap[this.bridgeID] = this;

    return this;
}

// type codes for packed values
FABridge.TYPE_ASINSTANCE =  1;
FABridge.TYPE_ASFUNCTION =  2;

FABridge.TYPE_JSFUNCTION =  3;
FABridge.TYPE_ANONYMOUS =   4;

FABridge.initCallbacks = {};
FABridge.userTypes = {};

FABridge.addToUserTypes = function()
{
	for (var i = 0; i < arguments.length; i++)
	{
		FABridge.userTypes[arguments[i]] = {
			'typeName': arguments[i], 
			'enriched': false
		};
	}
}

FABridge.argsToArray = function(args)
{
    var result = [];
    for (var i = 0; i < args.length; i++)
    {
        result[i] = args[i];
    }
    return result;
}

function instanceFactory(objID)
{
    this.fb_instance_id = objID;
    return this;
}

function FABridge__invokeJSFunction(args)
{  
    var funcID = args[0];
    var throughArgs = args.concat();//FABridge.argsToArray(arguments);
    throughArgs.shift();
   
    var bridge = FABridge.extractBridgeFromID(funcID);
    return bridge.invokeLocalFunction(funcID, throughArgs);
}

FABridge.addInitializationCallback = function(bridgeName, callback)
{
    var inst = FABridge.instances[bridgeName];
    if (inst != undefined)
    {
        callback.call(inst);
        return;
    }

    var callbackList = FABridge.initCallbacks[bridgeName];
    if(callbackList == null)
    {
        FABridge.initCallbacks[bridgeName] = callbackList = [];
    }

    callbackList.push(callback);
}

function FABridge__bridgeInitialized(bridgeName)
{
    var searchStr = "bridgeName="+ bridgeName;

    if (/Explorer/.test(navigator.appName) || /Opera/.test(navigator.appName) || /Netscape/.test(navigator.appName) || /Konqueror|Safari|KHTML/.test(navigator.appVersion))
    {

        var flashInstances = document.getElementsByTagName("object");
        if (flashInstances.length == 1)
        {
            FABridge.attachBridge(flashInstances[0], bridgeName);
        }
        else
        {
            for(var i = 0; i < flashInstances.length; i++)
            {
                var inst = flashInstances[i];
                var params = inst.childNodes;
                var flash_found = false;

                for (var j = 0; j < params.length; j++)
                {
                    var param = params[j];
                    if (param.nodeType == 1 && param.tagName.toLowerCase() == "param")
                    {
                        if (param["name"].toLowerCase() == "flashvars" && param["value"].indexOf(searchStr) >= 0)
                        {
                            FABridge.attachBridge(inst, bridgeName);
                            flash_found = true;
                            break;
                        }
                    }
                }

                if (flash_found) {
                    break;
                }
            }
        }
    }
    else
    {
        var flashInstances = document.getElementsByTagName("embed");
        if (flashInstances.length == 1)
        {
            FABridge.attachBridge(flashInstances[0], bridgeName);
        }
        else
        {
            for(var i = 0; i < flashInstances.length; i++)
            {
                var inst = flashInstances[i];
                var flashVars = inst.attributes.getNamedItem("flashVars").nodeValue;
                if (flashVars.indexOf(searchStr) >= 0)
                {
                    FABridge.attachBridge(inst, bridgeName);
                }

            }
        }
    }
    return true;
}

// used to track multiple bridge instances, since callbacks from AS are global across the page.

FABridge.nextBridgeID = 0;
FABridge.instances = {};
FABridge.idMap = {};
FABridge.refCount = 0;

FABridge.extractBridgeFromID = function(id)
{
    var bridgeID = (id >> 16);
    return FABridge.idMap[bridgeID];
}

FABridge.attachBridge = function(instance, bridgeName)
{
    var newBridgeInstance = new FABridge(instance, bridgeName);

    FABridge[bridgeName] = newBridgeInstance;

/*  FABridge[bridgeName] = function() {
        return newBridgeInstance.root();
    }
*/

    var callbacks = FABridge.initCallbacks[bridgeName];
    if (callbacks == null)
    {
        return;
    }
    for (var i = 0; i < callbacks.length; i++)
    {
        callbacks[i].call(newBridgeInstance);
    }
    delete FABridge.initCallbacks[bridgeName]
}

// some methods can't be proxied.  You can use the explicit get,set, and call methods if necessary.

FABridge.blockedMethods =
{
    toString: true,
    get: true,
    set: true,
    call: true
};

FABridge.prototype =
{


// bootstrapping

    root: function()
    {
        return this.deserialize(this.target.getRoot());
    },

    releaseASObjects: function()
    {
        return this.target.releaseASObjects();
    },

    releaseNamedASObject: function(value)
    {
        if(typeof(value) != "object")
        {
            return false;
        }
        else
        {
            var ret =  this.target.releaseNamedASObject(value.fb_instance_id);
            return ret;
        }
    },

    create: function(className)
    {
        return this.deserialize(this.target.create(className));
    },


    // utilities

    makeID: function(token)
    {
        return (this.bridgeID << 16) + token;
    },


    // low level access to the flash object

    getPropertyFromAS: function(objRef, propName)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.getPropFromAS(objRef, propName);
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

    setPropertyInAS: function(objRef,propName, value)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.setPropInAS(objRef,propName, this.serialize(value));
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

    callASFunction: function(funcID, args)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.invokeASFunction(funcID, this.serialize(args));
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

    callASMethod: function(objID, funcName, args)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            args = this.serialize(args);
            retVal = this.target.invokeASMethod(objID, funcName, args);
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

    // responders to remote calls from flash

    invokeLocalFunction: function(funcID, args)
    {
        var result;
        var func = this.localFunctionCache[funcID];

        if(func != undefined)
        {
            result = this.serialize(func.apply(null, this.deserialize(args)));
        }

        return result;
    },

    // Object Types and Proxies
	getUserTypeDescriptor: function(objTypeName)
	{
		var simpleType = objTypeName.replace(/^([^:]*)\:\:([^:]*)$/, "$2");
    	var isUserProto = ((typeof window[simpleType] == "function") && (typeof FABridge.userTypes[simpleType] != "undefined"));

    	var protoEnriched = false;
    	
    	if (isUserProto) {
	    	protoEnriched = FABridge.userTypes[simpleType].enriched;
    	}
    	var toret = {
    		'simpleType': simpleType, 
    		'isUserProto': isUserProto, 
    		'protoEnriched': protoEnriched
    	};
    	return toret;
	}, 
	
    // accepts an object reference, returns a type object matching the obj reference.
    getTypeFromName: function(objTypeName)
    {
    	var ut = this.getUserTypeDescriptor(objTypeName);
    	var toret = this.remoteTypeCache[objTypeName];
    	if (ut.isUserProto)
		{
    		//enrich both of the prototypes: the FABridge one, as well as the class in the page. 
	    	if (!ut.protoEnriched)
			{

		    	for (i in window[ut.simpleType].prototype)
				{
		    		toret[i] = window[ut.simpleType].prototype[i];
		    	}
				
				window[ut.simpleType].prototype = toret;
				this.remoteTypeCache[objTypeName] = toret;
				FABridge.userTypes[ut.simpleType].enriched = true;
	    	}
    	}
        return toret;
    },

    createProxy: function(objID, typeName)
    {
    	//get user created type, if it exists
    	var ut = this.getUserTypeDescriptor(typeName);

        var objType = this.getTypeFromName(typeName);

		if (ut.isUserProto)
		{
			var instFactory = window[ut.simpleType];
			var instance = new instFactory(this.name, objID);
			instance.fb_instance_id = objID;
		}
		else
		{
	        instanceFactory.prototype = objType;
	        var instance = new instanceFactory(objID);
		}

        this.remoteInstanceCache[objID] = instance;
        return instance;
    },

    getProxy: function(objID)
    {
        return this.remoteInstanceCache[objID];
    },

    // accepts a type structure, returns a constructed type
    addTypeDataToCache: function(typeData)
    {
        newType = new ASProxy(this, typeData.name);
        var accessors = typeData.accessors;
        for (var i = 0; i < accessors.length; i++)
        {
            this.addPropertyToType(newType, accessors[i]);
        }

        var methods = typeData.methods;
        for (var i = 0; i < methods.length; i++)
        {
            if (FABridge.blockedMethods[methods[i]] == undefined)
            {
                this.addMethodToType(newType, methods[i]);
            }
        }


        this.remoteTypeCache[newType.typeName] = newType;
        return newType;
    },

    addPropertyToType: function(ty, propName)
    {
        var c = propName.charAt(0);
        var setterName;
        var getterName;
        if(c >= "a" && c <= "z")
        {
            getterName = "get" + c.toUpperCase() + propName.substr(1);
            setterName = "set" + c.toUpperCase() + propName.substr(1);
        }
        else
        {
            getterName = "get" + propName;
            setterName = "set" + propName;
        }
        ty[setterName] = function(val)
        {
            this.bridge.setPropertyInAS(this.fb_instance_id, propName, val);
        }
        ty[getterName] = function()
        {
            return this.bridge.deserialize(this.bridge.getPropertyFromAS(this.fb_instance_id, propName));
        }
    },

    addMethodToType: function(ty, methodName)
    {
        ty[methodName] = function()
        {
            return this.bridge.deserialize(this.bridge.callASMethod(this.fb_instance_id, methodName, FABridge.argsToArray(arguments)));
        }
    },

    // Function Proxies

    getFunctionProxy: function(funcID)
    {
        var bridge = this;
        if (this.remoteFunctionCache[funcID] == null)
        {
            this.remoteFunctionCache[funcID] = function()
            {
                bridge.callASFunction(funcID, FABridge.argsToArray(arguments));
            }
        }
        return this.remoteFunctionCache[funcID];
    },

    getFunctionID: function(func)
    {
        if (func.__bridge_id__ == undefined)
        {
            func.__bridge_id__ = this.makeID(this.nextLocalFuncID++);
            this.localFunctionCache[func.__bridge_id__] = func;
        }
        return func.__bridge_id__;
    },

    // serialization / deserialization

    serialize: function(value)
    {
        var result = {};

        var t = typeof(value);
        if (t == "number" || t == "string" || t == "boolean" || t == null || t == undefined)
        {
            result = value;
        }
        else if (value instanceof Array)
        {
            result = [];
            for (var i = 0; i < value.length; i++)
            {
                result[i] = this.serialize(value[i]);
            }
        }
        else if (t == "function")
        {
            result.type = FABridge.TYPE_JSFUNCTION;
            result.value = this.getFunctionID(value);
        }
        else if (value instanceof ASProxy)
        {
            result.type = FABridge.TYPE_ASINSTANCE;
            result.value = value.fb_instance_id;
        }
        else
        {
            result.type = FABridge.TYPE_ANONYMOUS;
            result.value = value;
        }

        return result;
    },

    deserialize: function(packedValue)
    {

        var result;

        var t = typeof(packedValue);
        if (t == "number" || t == "string" || t == "boolean" || packedValue == null || packedValue == undefined)
        {
            result = this.handleError(packedValue);
            //if (typeof(retVal)=="string" && retVal.indexOf("__FLASHERROR")==0)
            //{
            //    throw new Error(retVal);
            //}
        }
        else if (packedValue instanceof Array)
        {
            result = [];
            for (var i = 0; i < packedValue.length; i++)
            {
                result[i] = this.deserialize(packedValue[i]);
            }
        }
        else if (t == "object")
        {
            for(var i = 0; i < packedValue.newTypes.length; i++)
            {
                this.addTypeDataToCache(packedValue.newTypes[i]);
            }
            for (var aRefID in packedValue.newRefs)
            {
                this.createProxy(aRefID, packedValue.newRefs[aRefID]);
            }
            if (packedValue.type == FABridge.TYPE_PRIMITIVE)
            {
                result = packedValue.value;
            }
            else if (packedValue.type == FABridge.TYPE_ASFUNCTION)
            {
                result = this.getFunctionProxy(packedValue.value);
            }
            else if (packedValue.type == FABridge.TYPE_ASINSTANCE)
            {
                result = this.getProxy(packedValue.value);
            }
            else if (packedValue.type == FABridge.TYPE_ANONYMOUS)
            {
                result = packedValue.value;
            }
        }
        return result;
    },

    addRef: function(obj)
    {
        this.target.incRef(obj.fb_instance_id);
    },

    release:function(obj)
    {
        this.target.releaseRef(obj.fb_instance_id);
    },

    handleError: function(value)
    {
        if (typeof(value)=="string" && value.indexOf("__FLASHERROR")==0)
        {
            var myErrorMessage = value.split("||");
            if(FABridge.refCount > 0 )
            {
                FABridge.refCount--;
            }
            throw new Error(myErrorMessage[1]);
            return value;
        }
        else
        {
            return value;
        }   
    }
};

// The root ASProxy class that facades a flash object

ASProxy = function(bridge, typeName)
{
    this.bridge = bridge;
    this.typeName = typeName;
    return this;
};

ASProxy.prototype =
{
    get: function(propName)
    {
        return this.bridge.deserialize(this.bridge.getPropertyFromAS(this.fb_instance_id, propName));
    },

    set: function(propName, value)
    {
        this.bridge.setPropertyInAS(this.fb_instance_id, propName, value);
    },

    call: function(funcName, args)
    {
        this.bridge.callASMethod(this.fb_instance_id, funcName, args);
    }, 
    
    addRef: function() {
        this.bridge.addRef(this);
    }, 
    
    release: function() {
        this.bridge.release(this);
    }
};


// FIXME: Needed by flXHR
var flensed={base_path:"//s.phono.com/deps/flensed/1.0/"};

(function($) {


;function Phono(config) {

   // Define defualt config and merge from constructor
   this.config = Phono.util.extend({
      gateway: "gw-v4.d.phono.com",
      connectionUrl: window.location.protocol+"//app.phono.com/http-bind"
   }, config);
   if (this.config.connectionUrl.indexOf("file:")==0){
      this.config.connectionUrl = "https://app.phono.com/http-bind";
   }

   // Bind 'on' handlers
   Phono.events.bind(this, config);
   
   if(!config.apiKey) {
      this.config.apiKey = prompt("Please enter your Phono API Key.\n\nTo get a new one sign up for a free account at: http://www.phono.com");
      if(!this.config.apiKey) {
         var message = "A Phono API Key is required. Please get one at http://www.phono.com";
         Phono.events.trigger(this, "error", {
            reason: message
         });
         throw message;
      }
   }
   
   // Initialize Fields
   this.sessionId = null;
   Phono.log.debug("ConnectionUrl: " + this.config.connectionUrl);
   this.connection = new Strophe.Connection(this.config.connectionUrl);
   if(navigator.appName.indexOf('Internet Explorer')>0){
    xmlSerializer = {};
    xmlSerializer.serializeToString = function(body) {return body.xml;};
   } else {
    xmlSerializer = new XMLSerializer();
   }
   this.connection.xmlInput = function (body) {
       Phono.log.debug("[WIRE] (i) " + xmlSerializer.serializeToString(body));
   };

   this.connection.xmlOutput = function (body) {
       Phono.log.debug("[WIRE] (o) " + xmlSerializer.serializeToString(body));
   };

   // Wrap ourselves with logging
   Phono.util.loggify("Phono", this);

   this.connect();
   
};

(function() {
   
    // ======================================================================
   
;Phono.util = {
   guid: function() {
     return MD5.hexdigest(new String((new Date()).getTime())) 
   },
   escapeXmppNode: function(input) {
      var node = input;
		node = node.replace(/\\/g, "\\5c");
		node = node.replace(/ /g, "\\20");
		node = node.replace(/\"/, "\\22");
		node = node.replace(/&/g, "\\26");
		node = node.replace(/\'/, "\\27");
		node = node.replace(/\//g, "\\2f");
		node = node.replace(/:/g, "\\3a");
		node = node.replace(/</g, "\\3c");
		node = node.replace(/>/g, "\\3e");
		node = node.replace(/@/g, "\\40");         
      return node;
   },
   // From jQuery 1.4.2
	each: function( object, callback, args ) {
		var name, i = 0,
			length = object.length,
			isObj = length === undefined || $.isFunction(object);

		if ( args ) {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.apply( object[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( object[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( var value = object[0];
					i < length && callback.call( value, i, value ) !== false; value = object[++i] ) {}
			}
		}

		return object;
	},   
	isFunction: function( obj ) {
		return toString.call(obj) === "[object Function]";
	},

	isArray: function( obj ) {
		return toString.call(obj) === "[object Array]";
	},   
	isPlainObject: function( obj ) {
		if ( !obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval ) {
			return false;
		}
		if ( obj.constructor
			&& !hasOwnProperty.call(obj, "constructor")
			&& !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
			return false;
		}
		var key;
		for ( key in obj ) {}
		
		return key === undefined || hasOwnProperty.call( obj, key );
	},	
   extend: function() {
   	var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;
   	if ( typeof target === "boolean" ) {
   		deep = target;
   		target = arguments[1] || {};
   		i = 2;
   	}
   	if ( typeof target !== "object" && !$.isFunction(target) ) {
   		target = {};
   	}
   	if ( length === i ) {
   		target = this;
   		--i;
   	}
   	for ( ; i < length; i++ ) {
   		if ( (options = arguments[ i ]) != null ) {
   			for ( name in options ) {
   				src = target[ name ];
   				copy = options[ name ];
   				if ( target === copy ) {
   					continue;
   				}
   				if ( deep && copy && ( $.isPlainObject(copy) || $.isArray(copy) ) ) {
   					var clone = src && ( $.isPlainObject(src) || $.isArray(src) ) ? src
   						: $.isArray(copy) ? [] : {};
   					target[ name ] = $.extend( deep, clone, copy );
   				} else if ( copy !== undefined ) {
   					target[ name ] = copy;
   				}
   			}
   		}
   	}
   	return target;
   },
   
   
   // Inspired by...
   // written by Dean Edwards, 2005
   // with input from Tino Zijdel, Matthias Miller, Diego Perini   
   eventCounter: 1,
   addEvent: function(target, type, handler) {
		// assign each event handler a unique ID
		if (!handler.$$guid) handler.$$guid = this.eventCounter++;
		// create a hash table of event types for the target
		if (!target.events) target.events = {};
		// create a hash table of event handlers for each target/event pair
		var handlers = target.events[type];
		if (!handlers) {
			handlers = target.events[type] = {};
			// store the existing event handler (if there is one)
			if (target["on" + type]) {
				handlers[0] = target["on" + type];
			}
		}
		// store the event handler in the hash table
		handlers[handler.$$guid] = handler;
		// assign a global event handler to do all the work
		target["on" + type] = handleEvent;
   },
   removeEvent: function(target, type, handler) {
		// delete the event handler from the hash table
		if (target.events && target.events[type]) {
			delete target.events[type][handler.$$guid];
		}
   },
   handleEvent: function(event) {
   	var returnValue = true;
   	// get a reference to the hash table of event handlers
   	var handlers = this.events[event.type];
   	// execute each event handler
   	for (var i in handlers) {
   		this.$$handleEvent = handlers[i];
   		if (this.$$handleEvent(event) === false) {
   			returnValue = false;
   		}
   	}
   	return returnValue;
   },
    /* parseUri JS v0.1, by Steven Levithan (http://badassery.blogspot.com)
       Splits any well-formed URI into the following parts (all are optional):
       ----------------------
       • source (since the exec() method returns backreference 0 [i.e., the entire match] as key 0, we might as well use it)
       • protocol (scheme)
       • authority (includes both the domain and port)
       • domain (part of the authority; can be an IP address)
       • port (part of the authority)
       • path (includes both the directory path and filename)
       • directoryPath (part of the path; supports directories with periods, and without a trailing backslash)
       • fileName (part of the path)
       • query (does not include the leading question mark)
       • anchor (fragment)
    */
    parseUri: function(sourceUri) {
        var uriPartNames = ["source","protocol","authority","domain","port","path","directoryPath","fileName","query","anchor"];
        var uriParts = new RegExp("^(?:([^:/?#.]+):)?(?://)?(([^:/?#]*)(?::(\\d*))?)?((/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[\\?#]|$)))*/?)?([^?#/]*))?(?:\\?([^#]*))?(?:#(.*))?").exec(sourceUri);
        var uri = {};
        
        for(var i = 0; i < 10; i++){
        uri[uriPartNames[i]] = (uriParts[i] ? uriParts[i] : "");
        }
        
        // Always end directoryPath with a trailing backslash if a path was present in the source URI
        // Note that a trailing backslash is NOT automatically inserted within or appended to the "path" key
        if(uri.directoryPath.length > 0){
            uri.directoryPath = uri.directoryPath.replace(/\/?$/, "/");
        }
    
        return uri;
    },
    filterWideband: function(offer, wideband) {
        var codecs = new Array();
        Phono.util.each(offer, function() {
            if (!wideband) {
                if (this.name.toUpperCase() != "G722" && this.rate != "16000") {
                    codecs.push(this);
                }
            } else {
                codecs.push(this);
            }
        });
        return codecs;
    },
    isIOS: function() {
        var userAgent = window.navigator.userAgent;
        if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i)) {
            return true;
        }
        return false;
    },
    isAndroid: function() {
        var userAgent = window.navigator.userAgent;
        if (userAgent.match(/Android/i)) {
            return true;
        }
        return false;
    },
    getIEVersion: function() {
        var rv = -1; // Return value assumes failure.
        if (navigator.appName == 'Microsoft Internet Explorer')
        {
            var ua = navigator.userAgent;
            var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null)
                rv = parseFloat( RegExp.$1 );
        }
        console.log("IE Version = " + rv);
        return rv;
    },
    localUri : function(fullUri) {
        var splitUri = fullUri.split(":");
        return splitUri[0] + ":" + splitUri[1] + ":" + splitUri[2];
    },
    loggify: function(objName, obj) {
        for(prop in obj) {
            if(typeof obj[prop] === 'function') {
                Phono.util.loggyFunction(objName, obj, prop);
            }
        }
        return obj;
    },
    loggyFunction: function(objName, obj, funcName) {
        var original = obj[funcName];
        obj[funcName] = function() {

            // Convert arguments to a real array
            var sep = "";
            var args = "";
            for (var i = 0; i < arguments.length; i++) {
                args+= (sep + arguments[i]);
                sep = ",";
            }
            
            Phono.log.debug("[INVOKE] " + objName + "." + funcName + "(" + args  + ")");
            return original.apply(obj, arguments);
        }
    },
    padWithZeroes: function(num, len) {
        var str = "" + num;
        while (str.length < len) {
            str = "0" + str;
        }
        return str;
    },
    padWithSpaces: function(str, len) {
        while (str.length < len) {
            str += " ";
        }
        return str;
    },
    srtpProps: function(tag, crypto, keyparams, sessionparams, required) {
        var props = "";
        if (crypto != undefined) {
            props = props + "crypto-suite=" + "'" + crypto +"' \n";
        }
        if (tag != undefined) {
            props = props + "tag=" + "'" + tag + "' \n";
        }
        if (keyparams != undefined) {
            props = props + "key-params=" + "'" + keyparams +"' \n";
        }
        if (sessionparams != undefined) {
            props = props + "session-params=" + "'" + sessionprams +"' \n";
        }
        if (required != undefined) {
            props = props + "required=" + "'" + required +"' \n";
        }
        return props;
    },
    genKey: function(bytes) {
        // Generate bytes random bytes, then base64 encode and return as a string
        var key = "";
        var i;
        for (i=0;i<bytes; i++) {
            key = key + String.fromCharCode(Math.random() * 256);
        }
        return Base64.encode(key);
    }
};


;var PhonoLogger = function() {
    var logger = this;
    logger.eventQueue = [];
    logger.initialized = false;
    $(document).ready(function() {
        if (typeof console === "undefined" || typeof console.log === "undefined") {
         console = {};
         console.log = function(mess) {
         // last ditch loging uncomment this 
	//		alert(mess)
		};
        }
        console.log("Phono Logger Initialized")
        logger.initialized = true;
        logger.flushEventQueue();
    });    
};

(function() {

    var newLine = "\r\n";

    // Logging events
    // ====================================================================================

    var PhonoLogEvent = function(timeStamp, level, messages, exception) {
        this.timeStamp = timeStamp;
        this.level = level;
        this.messages = messages;
        this.exception = exception;
    };

    PhonoLogEvent.prototype = {
        getThrowableStrRep: function() {
            return this.exception ? getExceptionStringRep(this.exception) : "";
        },
        getCombinedMessages: function() {
            return (this.messages.length === 1) ? this.messages[0] : this.messages.join(newLine);
        }
    };

    // Log Levels
    // ====================================================================================

    var PhonoLogLevel = function(level, name) {
        this.level = level;
        this.name = name;
    };

    PhonoLogLevel.prototype = {
        toString: function() {
            return this.name;
        },
        equals: function(level) {
            return this.level == level.level;
        },
        isGreaterOrEqual: function(level) {
            return this.level >= level.level;
        }
    };

    PhonoLogLevel.ALL = new PhonoLogLevel(Number.MIN_VALUE, "ALL");
    PhonoLogLevel.TRACE = new PhonoLogLevel(10000, "TRACE");
    PhonoLogLevel.DEBUG = new PhonoLogLevel(20000, "DEBUG");
    PhonoLogLevel.INFO = new PhonoLogLevel(30000, "INFO");
    PhonoLogLevel.WARN = new PhonoLogLevel(40000, "WARN");
    PhonoLogLevel.ERROR = new PhonoLogLevel(50000, "ERROR");
    PhonoLogLevel.FATAL = new PhonoLogLevel(60000, "FATAL");
    PhonoLogLevel.OFF = new PhonoLogLevel(Number.MAX_VALUE, "OFF");

    // Logger
    // ====================================================================================

    PhonoLogger.prototype.log = function(level, params) {

        var exception;
        var finalParamIndex = params.length - 1;
        var lastParam = params[params.length - 1];
        if (params.length > 1 && isError(lastParam)) {
            exception = lastParam;
            finalParamIndex--;
        }

        var messages = [];
        for (var i = 0; i <= finalParamIndex; i++) {
            messages[i] = params[i];
        }

        var loggingEvent = new PhonoLogEvent(new Date(), level , messages, exception);
        this.eventQueue.push(loggingEvent);

        this.flushEventQueue();
        
    };
    
    PhonoLogger.prototype.flushEventQueue = function() {
        if(this.initialized) {
            var logger = this;
            Phono.util.each(this.eventQueue, function(idx, event) {
                Phono.events.trigger(logger, "log", event);
            });
            this.eventQueue = [];
        }
    };

    PhonoLogger.prototype.debug = function() {
        this.log(PhonoLogLevel.DEBUG, arguments);
    };

    PhonoLogger.prototype.info = function() {
        this.log(PhonoLogLevel.INFO, arguments);
    };

    PhonoLogger.prototype.warn = function() {
        this.log(PhonoLogLevel.WARN, arguments);
    };

    PhonoLogger.prototype.error = function() {
        this.log(PhonoLogLevel.ERROR, arguments);
    };

    // Util
    // ====================================================================================

    function getExceptionMessage(ex) {
        if (ex.message) {
            return ex.message;
        } else if (ex.description) {
            return ex.description;
        } else {
            return toStr(ex);
        }
    };

    // Gets the portion of the URL after the last slash
    function getUrlFileName(url) {
        var lastSlashIndex = Math.max(url.lastIndexOf("/"), url.lastIndexOf("\\"));
        return url.substr(lastSlashIndex + 1);
    };

    // Returns a nicely formatted representation of an error
    function getExceptionStringRep(ex) {
        if (ex) {
            var exStr = "Exception: " + getExceptionMessage(ex);
            try {
                if (ex.lineNumber) {
                    exStr += " on line number " + ex.lineNumber;
                }
                if (ex.fileName) {
                    exStr += " in file " + getUrlFileName(ex.fileName);
                }
            } catch (localEx) {
            }
            if (showStackTraces && ex.stack) {
                exStr += newLine + "Stack trace:" + newLine + ex.stack;
            }
            return exStr;
        }
        return null;
    };

    function isError(err) {
        return (err instanceof Error);
    };

    function bool(obj) {
        return Boolean(obj);
    };
    
})();


   
    // ======================================================================

   
   // Global
   Phono.version = "0.5";
   
   Phono.log = new PhonoLogger();
   
   Phono.registerPlugin = function(name, config) {
      if(!Phono.plugins) {
         Phono.plugins = {};
      }
      Phono.plugins[name] = config;
   };

   // ======================================================================

   Phono.prototype.connect = function() {

      // Noop if already connected
      if(this.connection.connected) return;

      var phono = this;

      this.connection.connect(phono.config.gateway, null, function (status) {
         if (status === Strophe.Status.CONNECTED) {
            phono.connection.send(
               $iq({type:"set"})
                  .c("apikey", {xmlns:"http://phono.com/apikey"})
                  .t(phono.config.apiKey)
            );
            phono.handleConnect();
         } else if (status === Strophe.Status.DISCONNECTED) {
            phono.handleDisconnect();
         } else if (status === Strophe.Status.ERROR 
                 || status === Strophe.Status.CONNFAIL 
                 || status === Strophe.Status.CONNFAIL 
                 || status === Strophe.Status.AUTHFAIL) {
            phono.handleError();
          }
      },50);
   };

   Phono.prototype.disconnect = function() {
      this.connection.disconnect();
   };

   Phono.prototype.connected = function() {
      return this.connection.connected;
   };

   // Fires when the underlying Strophe Connection is estabilshed
   Phono.prototype.handleConnect = function() {
      this.sessionId = Strophe.getBareJidFromJid(this.connection.jid);
      new PluginManager(this, this.config, function(plugins) {
         Phono.events.trigger(this, "ready");
      }).init();
   };

   // Fires when the underlying Strophe Connection errors out
   Phono.prototype.handleError = function() {
      Phono.events.trigger(this, "error", {
         reason: "Error connecting to XMPP server"
      });
   };

   // Fires when the underlying Strophe Connection disconnects
   Phono.prototype.handleDisconnect = function() {
      Phono.events.trigger(this, "unready");
   };

   // ======================================================================

/*	flXHR 1.0.5 <http://flxhr.flensed.com/> | Copyright (c) 2008-2010 Kyle Simpson, Getify Solutions, Inc. | This software is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> */
(function(c){var E=c,h=c.document,z="undefined",a=true,L=false,g="",o="object",k="function",N="string",l="div",e="onunload",H=null,y=null,K=null,q=null,x=0,i=[],m=null,r=null,G="flXHR.js",n="flensed.js",P="flXHR.vbs",j="checkplayer.js",A="flXHR.swf",u=c.parseInt,w=c.setTimeout,f=c.clearTimeout,s=c.setInterval,v=c.clearInterval,O="instanceId",J="readyState",D="onreadystatechange",M="ontimeout",C="onerror",d="binaryResponseBody",F="xmlResponseText",I="loadPolicyURL",b="noCacheHeader",p="sendTimeout",B="appendToId",t="swfIdPrefix";if(typeof c.flensed===z){c.flensed={}}if(typeof c.flensed.flXHR!==z){return}y=c.flensed;w(function(){var Q=L,ab=h.getElementsByTagName("script"),V=ab.length;try{y.base_path.toLowerCase();Q=a}catch(T){y.base_path=g}function Z(ai,ah,aj){for(var ag=0;ag<V;ag++){if(typeof ab[ag].src!==z){if(ab[ag].src.indexOf(ai)>=0){break}}}var af=h.createElement("script");af.setAttribute("src",y.base_path+ai);if(typeof ah!==z){af.setAttribute("type",ah)}if(typeof aj!==z){af.setAttribute("language",aj)}h.getElementsByTagName("head")[0].appendChild(af)}if((typeof ab!==z)&&(ab!==null)){if(!Q){var ac=0;for(var U=0;U<V;U++){if(typeof ab[U].src!==z){if(((ac=ab[U].src.indexOf(n))>=0)||((ac=ab[U].src.indexOf(G))>=0)){y.base_path=ab[U].src.substr(0,ac);break}}}}}try{y.checkplayer.module_ready()}catch(aa){Z(j,"text/javascript")}var ad=null;(function ae(){try{y.ua.pv.join(".")}catch(af){ad=w(arguments.callee,25);return}if(y.ua.win&&y.ua.ie){Z(P,"text/vbscript","vbscript")}y.binaryToString=function(aj,ai){ai=(((y.ua.win&&y.ua.ie)&&typeof ai!==z)?(!(!ai)):!(y.ua.win&&y.ua.ie));if(!ai){try{return flXHR_vb_BinaryToString(aj)}catch(al){}}var am=g,ah=[];try{for(var ak=0;ak<aj.length;ak++){ah[ah.length]=String.fromCharCode(aj[ak])}am=ah.join(g)}catch(ag){}return am};y.bindEvent(E,e,function(){try{c.flensed.unbindEvent(E,e,arguments.callee);for(var ai in r){if(r[ai]!==Object.prototype[ai]){try{r[ai]=null}catch(ah){}}}y.flXHR=null;r=null;y=null;q=null;K=null}catch(ag){}})})();function Y(){f(ad);try{E.detachEvent(e,Y)}catch(af){}}if(ad!==null){try{E.attachEvent(e,Y)}catch(X){}}var S=null;function R(){f(S);try{E.detachEvent(e,R)}catch(af){}}try{E.attachEvent(e,R)}catch(W){}S=w(function(){R();try{y.checkplayer.module_ready()}catch(af){throw new c.Error("flXHR dependencies failed to load.")}},20000)},0);y.flXHR=function(aR){var ab=L;if(aR!==null&&typeof aR===o){if(typeof aR.instancePooling!==z){ab=!(!aR.instancePooling);if(ab){var aG=function(){for(var a0=0;a0<i.length;a0++){var a1=i[a0];if(a1[J]===4){a1.Reset();a1.Configure(aR);return a1}}return null}();if(aG!==null){return aG}}}}var aW=++x,ai=[],af=null,ah=null,X=null,Y=null,aM=-1,aF=0,aa=null,ac=null,ao=null,aE=null,aw=null,aV=null,ak=null,Q=null,aL=null,Z=a,aB=L,aY="flXHR_"+aW,au=a,aC=L,aA=a,aJ=L,S="flXHR_swf",ae="flXHRhideSwf",V=null,aH=-1,T=g,aK=null,aD=null,aO=null;var U=function(){if(typeof aR===o&&aR!==null){if((typeof aR[O]!==z)&&(aR[O]!==null)&&(aR[O]!==g)){aY=aR[O]}if((typeof aR[t]!==z)&&(aR[t]!==null)&&(aR[t]!==g)){S=aR[t]}if((typeof aR[B]!==z)&&(aR[B]!==null)&&(aR[B]!==g)){V=aR[B]}if((typeof aR[I]!==z)&&(aR[I]!==null)&&(aR[I]!==g)){T=aR[I]}if(typeof aR[b]!==z){au=!(!aR[b])}if(typeof aR[d]!==z){aC=!(!aR[d])}if(typeof aR[F]!==z){aA=!(!aR[F])}if(typeof aR.autoUpdatePlayer!==z){aJ=!(!aR.autoUpdatePlayer)}if((typeof aR[p]!==z)&&((H=u(aR[p],10))>0)){aH=H}if((typeof aR[D]!==z)&&(aR[D]!==null)){aK=aR[D]}if((typeof aR[C]!==z)&&(aR[C]!==null)){aD=aR[C]}if((typeof aR[M]!==z)&&(aR[M]!==null)){aO=aR[M]}}Y=S+"_"+aW;function a0(){f(af);try{E.detachEvent(e,a0)}catch(a3){}}try{E.attachEvent(e,a0)}catch(a1){}(function a2(){try{y.bindEvent(E,e,aI)}catch(a3){af=w(arguments.callee,25);return}a0();af=w(aT,1)})()}();function aT(){if(V===null){Q=h.getElementsByTagName("body")[0]}else{Q=y.getObjectById(V)}try{Q.nodeName.toLowerCase();y.checkplayer.module_ready();K=y.checkplayer}catch(a1){af=w(aT,25);return}if((q===null)&&(typeof K._ins===z)){try{q=new K(r.MIN_PLAYER_VERSION,aU,L,aq)}catch(a0){aP(r.DEPENDENCY_ERROR,"flXHR: checkplayer Init Failed","The initialization of the 'checkplayer' library failed to complete.");return}}else{q=K._ins;ag()}}function ag(){if(q===null||!q.checkPassed){af=w(ag,25);return}if(m===null&&V===null){y.createCSS("."+ae,"left:-1px;top:0px;width:1px;height:1px;position:absolute;");m=a}var a4=h.createElement(l);a4.id=Y;a4.className=ae;Q.appendChild(a4);Q=null;var a1={},a5={allowScriptAccess:"always"},a2={id:Y,name:Y,styleclass:ae},a3={swfCB:aS,swfEICheck:"reset"};try{q.DoSWF(y.base_path+A,Y,"1","1",a1,a5,a2,a3)}catch(a0){aP(r.DEPENDENCY_ERROR,"flXHR: checkplayer Call Failed","A call to the 'checkplayer' library failed to complete.");return}}function aS(a0){if(a0.status!==K.SWF_EI_READY){return}R();aV=y.getObjectById(Y);aV.setId(Y);if(T!==g){aV.loadPolicy(T)}aV.autoNoCacheHeader(au);aV.returnBinaryResponseBody(aC);aV.doOnReadyStateChange=al;aV.doOnError=aP;aV.sendProcessed=ap;aV.chunkResponse=ay;aM=0;ax();aX();if(typeof aK===k){try{aK(ak)}catch(a1){aP(r.HANDLER_ERROR,"flXHR::onreadystatechange(): Error","An error occurred in the handler function. ("+a1.message+")");return}}at()}function aI(){try{c.flensed.unbindEvent(E,e,aI)}catch(a3){}try{for(var a4=0;a4<i.length;a4++){if(i[a4]===ak){i[a4]=L}}}catch(bb){}try{for(var a6 in ak){if(ak[a6]!==Object.prototype[a6]){try{ak[a6]=null}catch(ba){}}}}catch(a9){}ak=null;R();if((typeof aV!==z)&&(aV!==null)){try{aV.abort()}catch(a8){}try{aV.doOnReadyStateChange=null;al=null}catch(a7){}try{aV.doOnError=null;doOnError=null}catch(a5){}try{aV.sendProcessed=null;ap=null}catch(a2){}try{aV.chunkResponse=null;ay=null}catch(a1){}aV=null;try{c.swfobject.removeSWF(Y)}catch(a0){}}aQ();aK=null;aD=null;aO=null;ao=null;aa=null;aL=null;Q=null}function ay(){if(aC&&typeof arguments[0]!==z){aL=((aL!==null)?aL:[]);aL=aL.concat(arguments[0])}else{if(typeof arguments[0]===N){aL=((aL!==null)?aL:g);aL+=arguments[0]}}}function al(){if(typeof arguments[0]!==z){aM=arguments[0]}if(aM===4){R();if(aC&&aL!==null){try{ac=y.binaryToString(aL,a);try{aa=flXHR_vb_StringToBinary(ac)}catch(a2){aa=aL}}catch(a1){}}else{ac=aL}aL=null;if(ac!==g){if(aA){try{ao=y.parseXMLString(ac)}catch(a0){ao={}}}}}if(typeof arguments[1]!==z){aE=arguments[1]}if(typeof arguments[2]!==z){aw=arguments[2]}ad(aM)}function ad(a0){aF=a0;ax();aX();ak[J]=Math.max(0,a0);if(typeof aK===k){try{aK(ak)}catch(a1){aP(r.HANDLER_ERROR,"flXHR::onreadystatechange(): Error","An error occurred in the handler function. ("+a1.message+")");return}}}function aP(){R();aQ();aB=a;var a3;try{a3=new y.error(arguments[0],arguments[1],arguments[2],ak)}catch(a4){function a1(){this.number=0;this.name="flXHR Error: Unknown";this.description="Unknown error from 'flXHR' library.";this.message=this.description;this.srcElement=ak;var a8=this.number,a7=this.name,ba=this.description;function a9(){return a8+", "+a7+", "+ba}this.toString=a9}a3=new a1()}var a5=L;try{if(typeof aD===k){aD(a3);a5=a}}catch(a0){var a2=a3.toString();function a6(){this.number=r.HANDLER_ERROR;this.name="flXHR::onerror(): Error";this.description="An error occured in the handler function. ("+a0.message+")\nPrevious:["+a2+"]";this.message=this.description;this.srcElement=ak;var a8=this.number,a7=this.name,ba=this.description;function a9(){return a8+", "+a7+", "+ba}this.toString=a9}a3=new a6()}if(!a5){w(function(){y.throwUnhandledError(a3.toString())},1)}}function W(){am();aB=a;if(typeof aO===k){try{aO(ak)}catch(a0){aP(r.HANDLER_ERROR,"flXHR::ontimeout(): Error","An error occurred in the handler function. ("+a0.message+")");return}}else{aP(r.TIMEOUT_ERROR,"flXHR: Operation Timed out","The requested operation timed out.")}}function R(){f(af);af=null;f(X);X=null;f(ah);ah=null}function aZ(a1,a2,a0){ai[ai.length]={func:a1,funcName:a2,args:a0};Z=L}function aQ(){if(!Z){Z=a;var a1=ai.length;for(var a0=0;a0<a1;a0++){try{ai[a0]=L}catch(a2){}}ai=[]}}function at(){if(aM<0){ah=w(at,25);return}if(!Z){for(var a0=0;a0<ai.length;a0++){try{if(ai[a0]!==L){ai[a0].func.apply(ak,ai[a0].args);ai[a0]=L}}catch(a1){aP(r.HANDLER_ERROR,"flXHR::"+ai[a0].funcName+"(): Error","An error occurred in the "+ai[a0].funcName+"() function.");return}}Z=a}}function aX(){try{ak[O]=aY;ak[J]=aF;ak.status=aE;ak.statusText=aw;ak.responseText=ac;ak.responseXML=ao;ak.responseBody=aa;ak[D]=aK;ak[C]=aD;ak[M]=aO;ak[I]=T;ak[b]=au;ak[d]=aC;ak[F]=aA}catch(a0){}}function ax(){try{aY=ak[O];if(ak.timeout!==null&&(H=u(ak.timeout,10))>0){aH=H}aK=ak[D];aD=ak[C];aO=ak[M];if(ak[I]!==null){if((ak[I]!==T)&&(aM>=0)){aV.loadPolicy(ak[I])}T=ak[I]}if(ak[b]!==null){if((ak[b]!==au)&&(aM>=0)){aV.autoNoCacheHeader(ak[b])}au=ak[b]}if(ak[d]!==null){if((ak[d]!==aC)&&(aM>=0)){aV.returnBinaryResponseBody(ak[d])}aC=ak[d]}if(aA!==null){aA=!(!ak[F])}}catch(a0){}}function aN(){am();try{aV.reset()}catch(a0){}aE=null;aw=null;ac=null;ao=null;aa=null;aL=null;aB=L;aX();T=g;ax()}function aU(a0){if(a0.checkPassed){ag()}else{if(!aJ){aP(r.PLAYER_VERSION_ERROR,"flXHR: Insufficient Flash Player Version","The Flash Player was either not detected, or the detected version ("+a0.playerVersionDetected+") was not at least the minimum version ("+r.MIN_PLAYER_VERSION+") needed by the 'flXHR' library.")}else{q.UpdatePlayer()}}}function aq(a0){if(a0.updateStatus===K.UPDATE_CANCELED){aP(r.PLAYER_VERSION_ERROR,"flXHR: Flash Player Update Canceled","The Flash Player was not updated.")}else{if(a0.updateStatus===K.UPDATE_FAILED){aP(r.PLAYER_VERSION_ERROR,"flXHR: Flash Player Update Failed","The Flash Player was either not detected or could not be updated.")}}}function ap(){if(aH!==null&&aH>0){X=w(W,aH)}}function am(){R();aQ();ax();aM=0;aF=0;try{aV.abort()}catch(a0){aP(r.CALL_ERROR,"flXHR::abort(): Failed","The abort() call failed to complete.")}aX()}function av(){ax();if(typeof arguments[0]===z||typeof arguments[1]===z){aP(r.CALL_ERROR,"flXHR::open(): Failed","The open() call requires 'method' and 'url' parameters.")}else{if(aM>0||aB){aN()}if(aF===0){al(1)}else{aM=1}var a7=arguments[0],a6=arguments[1],a5=(typeof arguments[2]!==z)?arguments[2]:a,ba=(typeof arguments[3]!==z)?arguments[3]:g,a9=(typeof arguments[4]!==z)?arguments[4]:g;try{aV.autoNoCacheHeader(au);aV.open(a7,a6,a5,ba,a9)}catch(a8){aP(r.CALL_ERROR,"flXHR::open(): Failed","The open() call failed to complete.")}}}function az(){ax();if(aM<=1&&!aB){var a1=(typeof arguments[0]!==z)?arguments[0]:g;if(aF===1){al(2)}else{aM=2}try{aV.autoNoCacheHeader(au);aV.send(a1)}catch(a2){aP(r.CALL_ERROR,"flXHR::send(): Failed","The send() call failed to complete.")}}else{aP(r.CALL_ERROR,"flXHR::send(): Failed","The send() call cannot be made at this time.")}}function aj(){ax();if(typeof arguments[0]===z||typeof arguments[1]===z){aP(r.CALL_ERROR,"flXHR::setRequestHeader(): Failed","The setRequestHeader() call requires 'name' and 'value' parameters.")}else{if(!aB){var a3=(typeof arguments[0]!==z)?arguments[0]:g,a2=(typeof arguments[1]!==z)?arguments[1]:g;try{aV.setRequestHeader(a3,a2)}catch(a4){aP(r.CALL_ERROR,"flXHR::setRequestHeader(): Failed","The setRequestHeader() call failed to complete.")}}}}function an(){ax();return g}function ar(){ax();return[]}ak={readyState:aF,responseBody:aa,responseText:ac,responseXML:ao,status:aE,statusText:aw,timeout:aH,open:function(){ax();if(ak[J]===0){ad(1)}if(!Z||aM<0){aZ(av,"open",arguments);return}av.apply({},arguments)},send:function(){ax();if(ak[J]===1){ad(2)}if(!Z||aM<0){aZ(az,"send",arguments);return}az.apply({},arguments)},abort:am,setRequestHeader:function(){ax();if(!Z||aM<0){aZ(aj,"setRequestHeader",arguments);return}aj.apply({},arguments)},getResponseHeader:an,getAllResponseHeaders:ar,onreadystatechange:aK,ontimeout:aO,instanceId:aY,loadPolicyURL:T,noCacheHeader:au,binaryResponseBody:aC,xmlResponseText:aA,onerror:aD,Configure:function(a0){if(typeof a0===o&&a0!==null){if((typeof a0[O]!==z)&&(a0[O]!==null)&&(a0[O]!==g)){aY=a0[O]}if(typeof a0[b]!==z){au=!(!a0[b]);if(aM>=0){aV.autoNoCacheHeader(au)}}if(typeof a0[d]!==z){aC=!(!a0[d]);if(aM>=0){aV.returnBinaryResponseBody(aC)}}if(typeof a0[F]!==z){aA=!(!a0[F])}if((typeof a0[D]!==z)&&(a0[D]!==null)){aK=a0[D]}if((typeof a0[C]!==z)&&(a0[C]!==null)){aD=a0[C]}if((typeof a0[M]!==z)&&(a0[M]!==null)){aO=a0[M]}if((typeof a0[p]!==z)&&((H=u(a0[p],10))>0)){aH=H}if((typeof a0[I]!==z)&&(a0[I]!==null)&&(a0[I]!==g)&&(a0[I]!==T)){T=a0[I];if(aM>=0){aV.loadPolicy(T)}}aX()}},Reset:aN,Destroy:aI};if(ab){i[i.length]=ak}return ak};r=y.flXHR;r.HANDLER_ERROR=10;r.CALL_ERROR=11;r.TIMEOUT_ERROR=12;r.DEPENDENCY_ERROR=13;r.PLAYER_VERSION_ERROR=14;r.SECURITY_ERROR=15;r.COMMUNICATION_ERROR=16;r.MIN_PLAYER_VERSION="9.0.124";r.module_ready=function(){}})(window);
// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

var Base64 = (function () {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var obj = {
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
        
            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                
                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);
            
            return output;
        },
        
        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            
            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            
            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));
                
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                
                output = output + String.fromCharCode(chr1);
                
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);
            
            return output;
        }
    };

    return obj;
})();
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var MD5 = (function () {
    /*
     * Configurable variables. You may need to tweak these to be compatible with
     * the server-side, but the defaults work in most cases.
     */
    var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase */
    var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance */
    var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode */

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    var safe_add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    var bit_rol = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    };

    /*
     * Convert a string to an array of little-endian words
     * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
     */
    var str2binl = function (str) {
        var bin = [];
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < str.length * chrsz; i += chrsz)
        {
            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
        }
        return bin;
    };

    /*
     * Convert an array of little-endian words to a string
     */
    var binl2str = function (bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < bin.length * 32; i += chrsz)
        {
            str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a hex string.
     */
    var binl2hex = function (binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i++)
        {
            str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
                hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a base-64 string
     */
    var binl2b64 = function (binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        var triplet, j;
        for(var i = 0; i < binarray.length * 4; i += 3)
        {
            triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16) |
                (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 ) |
                ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
            for(j = 0; j < 4; j++)
            {
                if(i * 8 + j * 6 > binarray.length * 32) { str += b64pad; }
                else { str += tab.charAt((triplet >> 6*(3-j)) & 0x3F); }
            }
        }
        return str;
    };

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    var md5_cmn = function (q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q),safe_add(x, t)), s),b);
    };

    var md5_ff = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    };

    var md5_gg = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    };

    var md5_hh = function (a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    };

    var md5_ii = function (a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    };
    
    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length
     */
    var core_md5 = function (x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        var olda, oldb, oldc, oldd;
        for (var i = 0; i < x.length; i += 16)
        {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;
            
            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);
            
            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);
            
            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);
            
            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);
            
            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    };


    /*
     * Calculate the HMAC-MD5, of a key and some data
     */
    var core_hmac_md5 = function (key, data) {
        var bkey = str2binl(key);
        if(bkey.length > 16) { bkey = core_md5(bkey, key.length * chrsz); }
        
        var ipad = new Array(16), opad = new Array(16);
        for(var i = 0; i < 16; i++)
        {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        
        var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
        return core_md5(opad.concat(hash), 512 + 128);
    };

    var obj = {
        /*
         * These are the functions you'll usually want to call.
         * They take string arguments and return either hex or base-64 encoded
         * strings.
         */
        hexdigest: function (s) {
            return binl2hex(core_md5(str2binl(s), s.length * chrsz));
        },

        b64digest: function (s) {
            return binl2b64(core_md5(str2binl(s), s.length * chrsz));
        },

        hash: function (s) {
            return binl2str(core_md5(str2binl(s), s.length * chrsz));
        },

        hmac_hexdigest: function (key, data) {
            return binl2hex(core_hmac_md5(key, data));
        },

        hmac_b64digest: function (key, data) {
            return binl2b64(core_hmac_md5(key, data));
        },

        hmac_hash: function (key, data) {
            return binl2str(core_hmac_md5(key, data));
        },

        /*
         * Perform a simple self-test to see if the VM is working
         */
        test: function () {
            return MD5.hexdigest("abc") === "900150983cd24fb0d6963f7d28e17f72";
        }
    };

    return obj;
})();

/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jslint configuration: */
/*global document, window, setTimeout, clearTimeout, console,
    XMLHttpRequest, ActiveXObject,
    Base64, MD5,
    Strophe, $build, $msg, $iq, $pres */

/** File: strophe.js
 *  A JavaScript library for XMPP BOSH.
 *
 *  This is the JavaScript version of the Strophe library.  Since JavaScript
 *  has no facilities for persistent TCP connections, this library uses
 *  Bidirectional-streams Over Synchronous HTTP (BOSH) to emulate
 *  a persistent, stateful, two-way connection to an XMPP server.  More
 *  information on BOSH can be found in XEP 124.
 */

/** PrivateFunction: Function.prototype.bind
 *  Bind a function to an instance.
 *
 *  This Function object extension method creates a bound method similar
 *  to those in Python.  This means that the 'this' object will point
 *  to the instance you want.  See
 *  <a href='http://benjamin.smedbergs.us/blog/2007-01-03/bound-functions-and-function-imports-in-javascript/'>Bound Functions and Function Imports in JavaScript</a>
 *  for a complete explanation.
 *
 *  This extension already exists in some browsers (namely, Firefox 3), but
 *  we provide it to support those that don't.
 *
 *  Parameters:
 *    (Object) obj - The object that will become 'this' in the bound function.
 *
 *  Returns:
 *    The bound function.
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (obj)
    {
        var func = this;
        return function () { return func.apply(obj, arguments); };
    };
}

/** PrivateFunction: Function.prototype.prependArg
 *  Prepend an argument to a function.
 *
 *  This Function object extension method returns a Function that will
 *  invoke the original function with an argument prepended.  This is useful
 *  when some object has a callback that needs to get that same object as
 *  an argument.  The following fragment illustrates a simple case of this
 *  > var obj = new Foo(this.someMethod);</code></blockquote>
 *
 *  Foo's constructor can now use func.prependArg(this) to ensure the
 *  passed in callback function gets the instance of Foo as an argument.
 *  Doing this without prependArg would mean not setting the callback
 *  from the constructor.
 *
 *  This is used inside Strophe for passing the Strophe.Request object to
 *  the onreadystatechange handler of XMLHttpRequests.
 *
 *  Parameters:
 *    arg - The argument to pass as the first parameter to the function.
 *
 *  Returns:
 *    A new Function which calls the original with the prepended argument.
 */
if (!Function.prototype.prependArg) {
    Function.prototype.prependArg = function (arg)
    {
        var func = this;

        return function () {
            var newargs = [arg];
            for (var i = 0; i < arguments.length; i++) {
                newargs.push(arguments[i]);
            }
            return func.apply(this, newargs);
        };
    };
}

/** PrivateFunction: Array.prototype.indexOf
 *  Return the index of an object in an array.
 *
 *  This function is not supplied by some JavaScript implementations, so
 *  we provide it if it is missing.  This code is from:
 *  http://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:indexOf
 *
 *  Parameters:
 *    (Object) elt - The object to look for.
 *    (Integer) from - The index from which to start looking. (optional).
 *
 *  Returns:
 *    The index of elt in the array or -1 if not found.
 */
if (!Array.prototype.indexOf)
{
    Array.prototype.indexOf = function(elt /*, from*/)
    {
        var len = this.length;

        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
            from += len;
        }

        for (; from < len; from++) {
            if (from in this && this[from] === elt) {
                return from;
            }
        }

        return -1;
    };
}

/* All of the Strophe globals are defined in this special function below so
 * that references to the globals become closures.  This will ensure that
 * on page reload, these references will still be available to callbacks
 * that are still executing.
 */

(function (callback) {
var Strophe;

/** Function: $build
 *  Create a Strophe.Builder.
 *  This is an alias for 'new Strophe.Builder(name, attrs)'.
 *
 *  Parameters:
 *    (String) name - The root element name.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $build(name, attrs) { return new Strophe.Builder(name, attrs); }
/** Function: $msg
 *  Create a Strophe.Builder with a <message/> element as the root.
 *
 *  Parmaeters:
 *    (Object) attrs - The <message/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $msg(attrs) { return new Strophe.Builder("message", attrs); }
/** Function: $iq
 *  Create a Strophe.Builder with an <iq/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <iq/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $iq(attrs) { return new Strophe.Builder("iq", attrs); }
/** Function: $pres
 *  Create a Strophe.Builder with a <presence/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <presence/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $pres(attrs) { return new Strophe.Builder("presence", attrs); }

/** Class: Strophe
 *  An object container for all Strophe library functions.
 *
 *  This class is just a container for all the objects and constants
 *  used in the library.  It is not meant to be instantiated, but to
 *  provide a namespace for library objects, constants, and functions.
 */
Strophe = {
    /** Constant: VERSION
     *  The version of the Strophe library. Unreleased builds will have
     *  a version of head-HASH where HASH is a partial revision.
     */
    VERSION: "1.0.1",

    /** Constants: XMPP Namespace Constants
     *  Common namespace constants from the XMPP RFCs and XEPs.
     *
     *  NS.HTTPBIND - HTTP BIND namespace from XEP 124.
     *  NS.BOSH - BOSH namespace from XEP 206.
     *  NS.CLIENT - Main XMPP client namespace.
     *  NS.AUTH - Legacy authentication namespace.
     *  NS.ROSTER - Roster operations namespace.
     *  NS.PROFILE - Profile namespace.
     *  NS.DISCO_INFO - Service discovery info namespace from XEP 30.
     *  NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
     *  NS.MUC - Multi-User Chat namespace from XEP 45.
     *  NS.SASL - XMPP SASL namespace from RFC 3920.
     *  NS.STREAM - XMPP Streams namespace from RFC 3920.
     *  NS.BIND - XMPP Binding namespace from RFC 3920.
     *  NS.SESSION - XMPP Session namespace from RFC 3920.
     */
    NS: {
        HTTPBIND: "http://jabber.org/protocol/httpbind",
        BOSH: "urn:xmpp:xbosh",
        CLIENT: "jabber:client",
        AUTH: "jabber:iq:auth",
        ROSTER: "jabber:iq:roster",
        PROFILE: "jabber:iq:profile",
        DISCO_INFO: "http://jabber.org/protocol/disco#info",
        DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
        MUC: "http://jabber.org/protocol/muc",
        SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
        STREAM: "http://etherx.jabber.org/streams",
        BIND: "urn:ietf:params:xml:ns:xmpp-bind",
        SESSION: "urn:ietf:params:xml:ns:xmpp-session",
        VERSION: "jabber:iq:version",
        STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas"
    },

    /** Function: addNamespace 
     *  This function is used to extend the current namespaces in
     *	Strophe.NS.  It takes a key and a value with the key being the
     *	name of the new namespace, with its actual value.
     *	For example:
     *	Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     *  Parameters:
     *    (String) name - The name under which the namespace will be
     *      referenced under Strophe.NS
     *    (String) value - The actual namespace.	
     */
    addNamespace: function (name, value)
    {
	Strophe.NS[name] = value;
    },

    /** Constants: Connection Status Constants
     *  Connection status constants for use by the connection handler
     *  callback.
     *
     *  Status.ERROR - An error has occurred
     *  Status.CONNECTING - The connection is currently being made
     *  Status.CONNFAIL - The connection attempt failed
     *  Status.AUTHENTICATING - The connection is authenticating
     *  Status.AUTHFAIL - The authentication attempt failed
     *  Status.CONNECTED - The connection has succeeded
     *  Status.DISCONNECTED - The connection has been terminated
     *  Status.DISCONNECTING - The connection is currently being terminated
     *  Status.ATTACHED - The connection has been attached
     */
    Status: {
        ERROR: 0,
        CONNECTING: 1,
        CONNFAIL: 2,
        AUTHENTICATING: 3,
        AUTHFAIL: 4,
        CONNECTED: 5,
        DISCONNECTED: 6,
        DISCONNECTING: 7,
        ATTACHED: 8
    },

    /** Constants: Log Level Constants
     *  Logging level indicators.
     *
     *  LogLevel.DEBUG - Debug output
     *  LogLevel.INFO - Informational output
     *  LogLevel.WARN - Warnings
     *  LogLevel.ERROR - Errors
     *  LogLevel.FATAL - Fatal errors
     */
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },

    /** PrivateConstants: DOM Element Type Constants
     *  DOM element types.
     *
     *  ElementType.NORMAL - Normal element.
     *  ElementType.TEXT - Text data element.
     */
    ElementType: {
        NORMAL: 1,
        TEXT: 3
    },

    /** PrivateConstants: Timeout Values
     *  Timeout values for error states.  These values are in seconds.
     *  These should not be changed unless you know exactly what you are
     *  doing.
     *
     *  TIMEOUT - Timeout multiplier. A waiting request will be considered
     *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 1.1, and with default wait, 66 seconds.
     *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
     *      Strophe can detect early failure, it will consider the request
     *      failed if it doesn't return after
     *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 0.1, and with default wait, 6 seconds.
     */
    TIMEOUT: 1.1,
    SECONDARY_TIMEOUT: 0.1,

    /** Function: forEachChild
     *  Map a function over some or all child elements of a given element.
     *
     *  This is a small convenience function for mapping a function over
     *  some or all of the children of an element.  If elemName is null, all
     *  children will be passed to the function, otherwise only children
     *  whose tag names match elemName will be passed.
     *
     *  Parameters:
     *    (XMLElement) elem - The element to operate on.
     *    (String) elemName - The child element tag name filter.
     *    (Function) func - The function to apply to each child.  This
     *      function should take a single argument, a DOM element.
     */
    forEachChild: function (elem, elemName, func)
    {
        var i, childNode;

        for (i = 0; i < elem.childNodes.length; i++) {
            childNode = elem.childNodes[i];
            if (childNode.nodeType == Strophe.ElementType.NORMAL &&
                (!elemName || this.isTagEqual(childNode, elemName))) {
                func(childNode);
            }
        }
    },

    /** Function: isTagEqual
     *  Compare an element's tag name with a string.
     *
     *  This function is case insensitive.
     *
     *  Parameters:
     *    (XMLElement) el - A DOM element.
     *    (String) name - The element name.
     *
     *  Returns:
     *    true if the element's tag name matches _el_, and false
     *    otherwise.
     */
    isTagEqual: function (el, name)
    {
        return el.tagName.toLowerCase() == name.toLowerCase();
    },

    /** PrivateVariable: _xmlGenerator
     *  _Private_ variable that caches a DOM document to
     *  generate elements.
     */
    _xmlGenerator: null,

    /** PrivateFunction: _makeGenerator
     *  _Private_ function that creates a dummy XML DOM document to serve as
     *  an element and text node generator.
     */
    _makeGenerator: function () {
        var doc;

        if (window.ActiveXObject) {
            doc = new ActiveXObject("Microsoft.XMLDOM");
            doc.appendChild(doc.createElement('strophe'));
        } else {
            doc = document.implementation
                .createDocument('jabber:client', 'strophe', null);
        }

        return doc;
    },

    /** Function: xmlElement
     *  Create an XML DOM element.
     *
     *  This function creates an XML DOM element correctly across all
     *  implementations. Note that these are not HTML DOM elements, which
     *  aren't appropriate for XMPP stanzas.
     *
     *  Parameters:
     *    (String) name - The name for the element.
     *    (Array|Object) attrs - An optional array or object containing
     *      key/value pairs to use as element attributes. The object should
     *      be in the format {'key': 'value'} or {key: 'value'}. The array
     *      should have the format [['key1', 'value1'], ['key2', 'value2']].
     *    (String) text - The text child data for the element.
     *
     *  Returns:
     *    A new XML DOM element.
     */
    xmlElement: function (name)
    {
        if (!name) { return null; }

        var node = null;
        if (!Strophe._xmlGenerator) {
            Strophe._xmlGenerator = Strophe._makeGenerator();
        }
        node = Strophe._xmlGenerator.createElement(name);

        // FIXME: this should throw errors if args are the wrong type or
        // there are more than two optional args
        var a, i, k;
        for (a = 1; a < arguments.length; a++) {
            if (!arguments[a]) { continue; }
            if (typeof(arguments[a]) == "string" ||
                typeof(arguments[a]) == "number") {
                node.appendChild(Strophe.xmlTextNode(arguments[a]));
            } else if (typeof(arguments[a]) == "object" &&
                       typeof(arguments[a].sort) == "function") {
                for (i = 0; i < arguments[a].length; i++) {
                    if (typeof(arguments[a][i]) == "object" &&
                        typeof(arguments[a][i].sort) == "function") {
                        node.setAttribute(arguments[a][i][0],
                                          arguments[a][i][1]);
                    }
                }
            } else if (typeof(arguments[a]) == "object") {
                for (k in arguments[a]) {
                    if (arguments[a].hasOwnProperty(k)) {
                        node.setAttribute(k, arguments[a][k]);
                    }
                } 
            }
        }

        return node;
    },

    /*  Function: xmlescape
     *  Excapes invalid xml characters.
     *
     *  Parameters:
     *     (String) text - text to escape.
     *
     *	Returns:
     *      Escaped text.
     */
    xmlescape: function(text) 
    {
	text = text.replace(/\&/g, "&amp;");
        text = text.replace(/</g,  "&lt;");
        text = text.replace(/>/g,  "&gt;");
        return text;    
    },

    /** Function: xmlTextNode
     *  Creates an XML DOM text node.
     *
     *  Provides a cross implementation version of document.createTextNode.
     *
     *  Parameters:
     *    (String) text - The content of the text node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlTextNode: function (text)
    {
	//ensure text is escaped
	text = Strophe.xmlescape(text);

        if (!Strophe._xmlGenerator) {
            Strophe._xmlGenerator = Strophe._makeGenerator();
        }
        return Strophe._xmlGenerator.createTextNode(text);
    },

    /** Function: getText
     *  Get the concatenation of all text children of an element.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A String with the concatenated text of all text element children.
     */
    getText: function (elem)
    {
        if (!elem) { return null; }

        var str = "";
        if (elem.childNodes.length === 0 && elem.nodeType ==
            Strophe.ElementType.TEXT) {
            str += elem.nodeValue;
        }

        for (var i = 0; i < elem.childNodes.length; i++) {
            if (elem.childNodes[i].nodeType == Strophe.ElementType.TEXT) {
                str += elem.childNodes[i].nodeValue;
            }
        }

        return str;
    },

    /** Function: copyElement
     *  Copy an XML DOM element.
     *
     *  This function copies a DOM element and all its descendants and returns
     *  the new copy.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A new, copied DOM element tree.
     */
    copyElement: function (elem)
    {
        var i, el;
        if (elem.nodeType == Strophe.ElementType.NORMAL) {
            el = Strophe.xmlElement(elem.tagName);

            for (i = 0; i < elem.attributes.length; i++) {
                el.setAttribute(elem.attributes[i].nodeName.toLowerCase(),
                                elem.attributes[i].value);
            }

            for (i = 0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.copyElement(elem.childNodes[i]));
            }
        } else if (elem.nodeType == Strophe.ElementType.TEXT) {
            el = Strophe.xmlTextNode(elem.nodeValue);
        }

        return el;
    },

    /** Function: escapeNode
     *  Escape the node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An escaped node (or local part).
     */
    escapeNode: function (node)
    {
        return node.replace(/^\s+|\s+$/g, '')
            .replace(/\\/g,  "\\5c")
            .replace(/ /g,   "\\20")
            .replace(/\"/g,  "\\22")
            .replace(/\&/g,  "\\26")
            .replace(/\'/g,  "\\27")
            .replace(/\//g,  "\\2f")
            .replace(/:/g,   "\\3a")
            .replace(/</g,   "\\3c")
            .replace(/>/g,   "\\3e")
            .replace(/@/g,   "\\40");
    },

    /** Function: unescapeNode
     *  Unescape a node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An unescaped node (or local part).
     */
    unescapeNode: function (node)
    {
        return node.replace(/\\20/g, " ")
            .replace(/\\22/g, '"')
            .replace(/\\26/g, "&")
            .replace(/\\27/g, "'")
            .replace(/\\2f/g, "/")
            .replace(/\\3a/g, ":")
            .replace(/\\3c/g, "<")
            .replace(/\\3e/g, ">")
            .replace(/\\40/g, "@")
            .replace(/\\5c/g, "\\");
    },

    /** Function: getNodeFromJid
     *  Get the node portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the node.
     */
    getNodeFromJid: function (jid)
    {
        if (jid.indexOf("@") < 0) { return null; }
        return jid.split("@")[0];
    },

    /** Function: getDomainFromJid
     *  Get the domain portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the domain.
     */
    getDomainFromJid: function (jid)
    {
        var bare = Strophe.getBareJidFromJid(jid);
        if (bare.indexOf("@") < 0) {
            return bare;
        } else {
            var parts = bare.split("@");
            parts.splice(0, 1);
            return parts.join('@');
        }
    },

    /** Function: getResourceFromJid
     *  Get the resource portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the resource.
     */
    getResourceFromJid: function (jid)
    {
        var s = jid.split("/");
        if (s.length < 2) { return null; }
        s.splice(0, 1);
        return s.join('/');
    },

    /** Function: getBareJidFromJid
     *  Get the bare JID from a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the bare JID.
     */
    getBareJidFromJid: function (jid)
    {
        return jid.split("/")[0];
    },

    /** Function: log
     *  User overrideable logging function.
     *
     *  This function is called whenever the Strophe library calls any
     *  of the logging functions.  The default implementation of this
     *  function does nothing.  If client code wishes to handle the logging
     *  messages, it should override this with
     *  > Strophe.log = function (level, msg) {
     *  >   (user code here)
     *  > };
     *
     *  Please note that data sent and received over the wire is logged
     *  via Strophe.Connection.rawInput() and Strophe.Connection.rawOutput().
     *
     *  The different levels and their meanings are
     *
     *    DEBUG - Messages useful for debugging purposes.
     *    INFO - Informational messages.  This is mostly information like
     *      'disconnect was called' or 'SASL auth succeeded'.
     *    WARN - Warnings about potential problems.  This is mostly used
     *      to report transient connection errors like request timeouts.
     *    ERROR - Some error occurred.
     *    FATAL - A non-recoverable fatal error occurred.
     *
     *  Parameters:
     *    (Integer) level - The log level of the log message.  This will
     *      be one of the values in Strophe.LogLevel.
     *    (String) msg - The log message.
     */
    log: function (level, msg)
    {
        return;
    },

    /** Function: debug
     *  Log a message at the Strophe.LogLevel.DEBUG level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    debug: function(msg)
    {
        this.log(this.LogLevel.DEBUG, msg);
    },

    /** Function: info
     *  Log a message at the Strophe.LogLevel.INFO level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    info: function (msg)
    {
        this.log(this.LogLevel.INFO, msg);
    },

    /** Function: warn
     *  Log a message at the Strophe.LogLevel.WARN level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    warn: function (msg)
    {
        this.log(this.LogLevel.WARN, msg);
    },

    /** Function: error
     *  Log a message at the Strophe.LogLevel.ERROR level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    error: function (msg)
    {
        this.log(this.LogLevel.ERROR, msg);
    },

    /** Function: fatal
     *  Log a message at the Strophe.LogLevel.FATAL level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    fatal: function (msg)
    {
        this.log(this.LogLevel.FATAL, msg);
    },

    /** Function: serialize
     *  Render a DOM element and all descendants to a String.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The serialized element tree as a String.
     */
    serialize: function (elem)
    {
        var result;

        if (!elem) { return null; }

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }

        var nodeName = elem.nodeName;
        var i, child;

        if (elem.getAttribute("_realname")) {
            nodeName = elem.getAttribute("_realname");
        }

        result = "<" + nodeName;
        for (i = 0; i < elem.attributes.length; i++) {
               if(elem.attributes[i].nodeName != "_realname") {
                 result += " " + elem.attributes[i].nodeName.toLowerCase() +
                "='" + elem.attributes[i].value
                    .replace("&", "&amp;")
                       .replace("'", "&apos;")
                       .replace("<", "&lt;") + "'";
               }
        }

        if (elem.childNodes.length > 0) {
            result += ">";
            for (i = 0; i < elem.childNodes.length; i++) {
                child = elem.childNodes[i];
                if (child.nodeType == Strophe.ElementType.NORMAL) {
                    // normal element, so recurse
                    result += Strophe.serialize(child);
                } else if (child.nodeType == Strophe.ElementType.TEXT) {
                    // text element
                    result += child.nodeValue;
                }
            }
            result += "</" + nodeName + ">";
        } else {
            result += "/>";
        }

        return result;
    },

    /** PrivateVariable: _requestId
     *  _Private_ variable that keeps track of the request ids for
     *  connections.
     */
    _requestId: 0,

    /** PrivateVariable: Strophe.connectionPlugins
     *  _Private_ variable Used to store plugin names that need
     *  initialization on Strophe.Connection construction.
     */
    _connectionPlugins: {},

    /** Function: addConnectionPlugin
     *  Extends the Strophe.Connection object with the given plugin.
     *
     *  Paramaters:
     *    (String) name - The name of the extension.
     *    (Object) ptype - The plugin's prototype.
     */
    addConnectionPlugin: function (name, ptype)
    {
        Strophe._connectionPlugins[name] = ptype;
    }
};

/** Class: Strophe.Builder
 *  XML DOM builder.
 *
 *  This object provides an interface similar to JQuery but for building
 *  DOM element easily and rapidly.  All the functions except for toString()
 *  and tree() return the object, so calls can be chained.  Here's an
 *  example using the $iq() builder helper.
 *  > $iq({to: 'you': from: 'me': type: 'get', id: '1'})
 *  >     .c('query', {xmlns: 'strophe:example'})
 *  >     .c('example')
 *  >     .toString()
 *  The above generates this XML fragment
 *  > <iq to='you' from='me' type='get' id='1'>
 *  >   <query xmlns='strophe:example'>
 *  >     <example/>
 *  >   </query>
 *  > </iq>
 *  The corresponding DOM manipulations to get a similar fragment would be
 *  a lot more tedious and probably involve several helper variables.
 *
 *  Since adding children makes new operations operate on the child, up()
 *  is provided to traverse up the tree.  To add two children, do
 *  > builder.c('child1', ...).up().c('child2', ...)
 *  The next operation on the Builder will be relative to the second child.
 */

/** Constructor: Strophe.Builder
 *  Create a Strophe.Builder object.
 *
 *  The attributes should be passed in object notation.  For example
 *  > var b = new Builder('message', {to: 'you', from: 'me'});
 *  or
 *  > var b = new Builder('messsage', {'xml:lang': 'en'});
 *
 *  Parameters:
 *    (String) name - The name of the root element.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder.
 */
Strophe.Builder = function (name, attrs)
{
    // Set correct namespace for jabber:client elements
    if (name == "presence" || name == "message" || name == "iq") {
        if (attrs && !attrs.xmlns) {
            attrs.xmlns = Strophe.NS.CLIENT;
        } else if (!attrs) {
            attrs = {xmlns: Strophe.NS.CLIENT};
        }
    }

    // Holds the tree being built.
    this.nodeTree = Strophe.xmlElement(name, attrs);

    // Points to the current operation node.
    this.node = this.nodeTree;
};

Strophe.Builder.prototype = {
    /** Function: tree
     *  Return the DOM tree.
     *
     *  This function returns the current DOM tree as an element object.  This
     *  is suitable for passing to functions like Strophe.Connection.send().
     *
     *  Returns:
     *    The DOM tree as a element object.
     */
    tree: function ()
    {
        return this.nodeTree;
    },

    /** Function: toString
     *  Serialize the DOM tree to a String.
     *
     *  This function returns a string serialization of the current DOM
     *  tree.  It is often used internally to pass data to a
     *  Strophe.Request object.
     *
     *  Returns:
     *    The serialized DOM tree in a String.
     */
    toString: function ()
    {
        return Strophe.serialize(this.nodeTree);
    },

    /** Function: up
     *  Make the current parent element the new current element.
     *
     *  This function is often used after c() to traverse back up the tree.
     *  For example, to add two children to the same element
     *  > builder.c('child1', {}).up().c('child2', {});
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    up: function ()
    {
        this.node = this.node.parentNode;
        return this;
    },

    /** Function: attrs
     *  Add or modify attributes of the current element.
     *
     *  The attributes should be passed in object notation.  This function
     *  does not move the current element pointer.
     *
     *  Parameters:
     *    (Object) moreattrs - The attributes to add/modify in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    attrs: function (moreattrs)
    {
        for (var k in moreattrs) {
            if (moreattrs.hasOwnProperty(k)) {
                this.node.setAttribute(k, moreattrs[k]);
            }
        }
        return this;
    },

    /** Function: c
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function moves the current element pointer to the child.  If you
     *  need to add another child, it is necessary to use up() to go back
     *  to the parent in the tree.
     *
     *  Parameters:
     *    (String) name - The name of the child.
     *    (Object) attrs - The attributes of the child in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    c: function (name, attrs)
    {
        var child = Strophe.xmlElement(name, attrs);
        this.node.appendChild(child);
        this.node = child;
        return this;
    },

    /** Function: cnode
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function is the same as c() except that instead of using a
     *  name and an attributes object to create the child it uses an
     *  existing DOM element object.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    cnode: function (elem)
    {
        this.node.appendChild(elem);
        this.node = elem;
        return this;
    },

    /** Function: t
     *  Add a child text element.
     *
     *  This *does not* make the child the new current element since there
     *  are no children of text elements.
     *
     *  Parameters:
     *    (String) text - The text data to append to the current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    t: function (text)
    {
        var child = Strophe.xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    }
};


/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistant depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */

/** PrivateConstructor: Strophe.Handler
 *  Create and initialize a new Strophe.Handler.
 *
 *  Parameters:
 *    (Function) handler - A function to be executed when the handler is run.
 *    (String) ns - The namespace to match.
 *    (String) name - The element name to match.
 *    (String) type - The element type to match.
 *    (String) id - The element id attribute to match.
 *    (String) from - The element from attribute to match.
 *    (Object) options - Handler options
 *
 *  Returns:
 *    A new Strophe.Handler object.
 */
Strophe.Handler = function (handler, ns, name, type, id, from, options)
{
    this.handler = handler;
    this.ns = ns;
    this.name = name;
    this.type = type;
    this.id = id;
    this.options = options || {matchbare: false};
    
    // default matchBare to false if undefined
    if (!this.options.matchBare) {
        this.options.matchBare = false;
    }

    if (this.options.matchBare) {
        this.from = Strophe.getBareJidFromJid(from);
    } else {
        this.from = from;
    }

    // whether the handler is a user handler or a system handler
    this.user = true;
};

Strophe.Handler.prototype = {
    /** PrivateFunction: isMatch
     *  Tests if a stanza matches the Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
     */
    isMatch: function (elem)
    {
        var nsMatch;
        var from = null;
        
        if (this.options.matchBare) {
            from = Strophe.getBareJidFromJid(elem.getAttribute('from'));
        } else {
            from = elem.getAttribute('from');
        }

        nsMatch = false;
        if (!this.ns) {
            nsMatch = true;
        } else {
            var that = this;
            Strophe.forEachChild(elem, null, function (elem) {
                if (elem.getAttribute("xmlns") == that.ns) {
                    nsMatch = true;
                }
            });

            nsMatch = nsMatch || elem.getAttribute("xmlns") == this.ns;
        }

        if (nsMatch &&
            (!this.name || Strophe.isTagEqual(elem, this.name)) &&
            (!this.type || elem.getAttribute("type") === this.type) &&
            (!this.id || elem.getAttribute("id") === this.id) &&
            (!this.from || from === this.from)) {
                return true;
        }

        return false;
    },

    /** PrivateFunction: run
     *  Run the callback on a matching stanza.
     *
     *  Parameters:
     *    (XMLElement) elem - The DOM element that triggered the
     *      Strophe.Handler.
     *
     *  Returns:
     *    A boolean indicating if the handler should remain active.
     */
    run: function (elem)
    {
        var result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            if (e.sourceURL) {
                Strophe.fatal("error: " + this.handler +
                              " " + e.sourceURL + ":" +
                              e.line + " - " + e.name + ": " + e.message);
            } else if (e.fileName) {
                if (typeof(console) != "undefined") {
                    console.trace();
                    console.error(this.handler, " - error - ", e, e.message);
                }
                Strophe.fatal("error: " + this.handler + " " +
                              e.fileName + ":" + e.lineNumber + " - " +
                              e.name + ": " + e.message);
            } else {
                Strophe.fatal("error: " + this.handler);
            }

            throw e;
        }

        return result;
    },

    /** PrivateFunction: toString
     *  Get a String representation of the Strophe.Handler object.
     *
     *  Returns:
     *    A String.
     */
    toString: function ()
    {
        return "{Handler: " + this.handler + "(" + this.name + "," +
            this.id + "," + this.ns + ")}";
    }
};

/** PrivateClass: Strophe.TimedHandler
 *  _Private_ helper class for managing timed handlers.
 *
 *  A Strophe.TimedHandler encapsulates a user provided callback that
 *  should be called after a certain period of time or at regular
 *  intervals.  The return value of the callback determines whether the
 *  Strophe.TimedHandler will continue to fire.
 *
 *  Users will not use Strophe.TimedHandler objects directly, but instead
 *  they will use Strophe.Connection.addTimedHandler() and
 *  Strophe.Connection.deleteTimedHandler().
 */

/** PrivateConstructor: Strophe.TimedHandler
 *  Create and initialize a new Strophe.TimedHandler object.
 *
 *  Parameters:
 *    (Integer) period - The number of milliseconds to wait before the
 *      handler is called.
 *    (Function) handler - The callback to run when the handler fires.  This
 *      function should take no arguments.
 *
 *  Returns:
 *    A new Strophe.TimedHandler object.
 */
Strophe.TimedHandler = function (period, handler)
{
    this.period = period;
    this.handler = handler;

    this.lastCalled = new Date().getTime();
    this.user = true;
};

Strophe.TimedHandler.prototype = {
    /** PrivateFunction: run
     *  Run the callback for the Strophe.TimedHandler.
     *
     *  Returns:
     *    true if the Strophe.TimedHandler should be called again, and false
     *      otherwise.
     */
    run: function ()
    {
        this.lastCalled = new Date().getTime();
        return this.handler();
    },

    /** PrivateFunction: reset
     *  Reset the last called time for the Strophe.TimedHandler.
     */
    reset: function ()
    {
        this.lastCalled = new Date().getTime();
    },

    /** PrivateFunction: toString
     *  Get a string representation of the Strophe.TimedHandler object.
     *
     *  Returns:
     *    The string representation.
     */
    toString: function ()
    {
        return "{TimedHandler: " + this.handler + "(" + this.period +")}";
    }
};

/** PrivateClass: Strophe.Request
 *  _Private_ helper class that provides a cross implementation abstraction
 *  for a BOSH related XMLHttpRequest.
 *
 *  The Strophe.Request class is used internally to encapsulate BOSH request
 *  information.  It is not meant to be used from user's code.
 */

/** PrivateConstructor: Strophe.Request
 *  Create and initialize a new Strophe.Request object.
 *
 *  Parameters:
 *    (XMLElement) elem - The XML data to be sent in the request.
 *    (Function) func - The function that will be called when the
 *      XMLHttpRequest readyState changes.
 *    (Integer) rid - The BOSH rid attribute associated with this request.
 *    (Integer) sends - The number of times this same request has been
 *      sent.
 */
Strophe.Request = function (elem, func, rid, sends)
{
    this.id = ++Strophe._requestId;
    this.xmlData = elem;
    this.data = Strophe.serialize(elem);
    // save original function in case we need to make a new request
    // from this one.
    this.origFunc = func;
    this.func = func;
    this.rid = rid;
    this.date = NaN;
    this.sends = sends || 0;
    this.abort = false;
    this.dead = null;
    this.age = function () {
        if (!this.date) { return 0; }
        var now = new Date();
        return (now - this.date) / 1000;
    };
    this.timeDead = function () {
        if (!this.dead) { return 0; }
        var now = new Date();
        return (now - this.dead) / 1000;
    };
    this.xhr = this._newXHR();
};

Strophe.Request.prototype = {
    /** PrivateFunction: getResponse
     *  Get a response from the underlying XMLHttpRequest.
     *
     *  This function attempts to get a response from the request and checks
     *  for errors.
     *
     *  Throws:
     *    "parsererror" - A parser error occured.
     *
     *  Returns:
     *    The DOM element tree of the response.
     */
    getResponse: function ()
    {
        var node = null;
        if (this.xhr.responseXML && this.xhr.responseXML.documentElement) {
            node = this.xhr.responseXML.documentElement;
            if (node.tagName == "parsererror") {
                Strophe.error("invalid response received");
                Strophe.error("responseText: " + this.xhr.responseText);
                Strophe.error("responseXML: " +
                              Strophe.serialize(this.xhr.responseXML));
                throw "parsererror";
            }
        } else if (this.xhr.responseText) {
            Strophe.error("invalid response received");
            Strophe.error("responseText: " + this.xhr.responseText);
            Strophe.error("responseXML: " +
                          Strophe.serialize(this.xhr.responseXML));
        }

        return node;
    },

    /** PrivateFunction: _newXHR
     *  _Private_ helper function to create XMLHttpRequests.
     *
     *  This function creates XMLHttpRequests across all implementations.
     *
     *  Returns:
     *    A new XMLHttpRequest.
     */
    _newXHR: function ()
    {
        var xhr = null;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/xml");
            }
        } else if (window.ActiveXObject) {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

        xhr.onreadystatechange = this.func.prependArg(this);

        return xhr;
    }
};

/** Class: Strophe.Connection
 *  XMPP Connection manager.
 *
 *  Thie class is the main part of Strophe.  It manages a BOSH connection
 *  to an XMPP server and dispatches events to the user callbacks as
 *  data arrives.  It supports SASL PLAIN, SASL DIGEST-MD5, and legacy
 *  authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection.  These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */

/** Constructor: Strophe.Connection
 *  Create and initialize a Strophe.Connection object.
 *
 *  Parameters:
 *    (String) service - The BOSH service URL.
 *
 *  Returns:
 *    A new Strophe.Connection object.
 */
Strophe.Connection = function (service)
{
    /* The path to the httpbind service. */
    this.service = service;
    /* The connected JID. */
    this.jid = "";
    /* request id for body tags */
    this.rid = Math.floor(Math.random() * 4294967295);
    /* The current session ID. */
    this.sid = null;
    this.streamId = null;

    // SASL
    this.do_session = false;
    this.do_bind = false;

    // handler lists
    this.timedHandlers = [];
    this.handlers = [];
    this.removeTimeds = [];
    this.removeHandlers = [];
    this.addTimeds = [];
    this.addHandlers = [];

    this._idleTimeout = null;
    this._disconnectTimeout = null;

    this.authenticated = false;
    this.disconnecting = false;
    this.connected = false;

    this.errors = 0;

    this.paused = false;

    // default BOSH values
    this.hold = 1;
    this.wait = 60;
    this.window = 5;

    this._data = [];
    this._requests = [];
    this._uniqueId = Math.round(Math.random() * 10000);

    this._sasl_success_handler = null;
    this._sasl_failure_handler = null;
    this._sasl_challenge_handler = null;

    // setup onIdle callback every 1/10th of a second
    this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);

    // initialize plugins
    for (var k in Strophe._connectionPlugins) {
        if (Strophe._connectionPlugins.hasOwnProperty(k)) {
	    var ptype = Strophe._connectionPlugins[k];
            // jslint complaints about the below line, but this is fine
            var F = function () {};
            F.prototype = ptype;
            this[k] = new F();
	    this[k].init(this);
        }
    }
};

Strophe.Connection.prototype = {
    /** Function: reset
     *  Reset the connection.
     *
     *  This function should be called after a connection is disconnected
     *  before that connection is reused.
     */
    reset: function ()
    {
        this.rid = Math.floor(Math.random() * 4294967295);

        this.sid = null;
        this.streamId = null;

        // SASL
        this.do_session = false;
        this.do_bind = false;

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        this.authenticated = false;
        this.disconnecting = false;
        this.connected = false;

        this.errors = 0;

        this._requests = [];
        this._uniqueId = Math.round(Math.random()*10000);
    },

    /** Function: pause
     *  Pause the request manager.
     *
     *  This will prevent Strophe from sending any more requests to the
     *  server.  This is very useful for temporarily pausing while a lot
     *  of send() calls are happening quickly.  This causes Strophe to
     *  send the data in a single request, saving many request trips.
     */
    pause: function ()
    {
        this.paused = true;
    },

    /** Function: resume
     *  Resume the request manager.
     *
     *  This resumes after pause() has been called.
     */
    resume: function ()
    {
        this.paused = false;
    },

    /** Function: getUniqueId
     *  Generate a unique ID for use in <iq/> elements.
     *
     *  All <iq/> stanzas are required to have unique id attributes.  This
     *  function makes creating these easy.  Each connection instance has
     *  a counter which starts from zero, and the value of this counter
     *  plus a colon followed by the suffix becomes the unique id. If no
     *  suffix is supplied, the counter is used as the unique id.
     *
     *  Suffixes are used to make debugging easier when reading the stream
     *  data, and their use is recommended.  The counter resets to 0 for
     *  every new connection for the same reason.  For connections to the
     *  same server that authenticate the same way, all the ids should be
     *  the same, which makes it easy to see changes.  This is useful for
     *  automated testing as well.
     *
     *  Parameters:
     *    (String) suffix - A optional suffix to append to the id.
     *
     *  Returns:
     *    A unique string to be used for the id attribute.
     */
    getUniqueId: function (suffix)
    {
        if (typeof(suffix) == "string" || typeof(suffix) == "number") {
            return ++this._uniqueId + ":" + suffix;
        } else {
            return ++this._uniqueId + "";
        }
    },

    /** Function: connect
     *  Starts the connection process.
     *
     *  As the connection process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  Please see XEP 124 for a more detailed explanation of the optional
     *  parameters below.
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID,
     *      or a full JID.  If a node is not supplied, SASL ANONYMOUS
     *      authentication will be attempted.
     *    (String) pass - The user's password.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     */
    connect: function (jid, pass, callback, wait, hold)
    {
        this.jid = jid;
        this.pass = pass;
        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.errors = 0;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;

        // parse jid for domain and resource
        this.domain = Strophe.getDomainFromJid(this.jid);

        // build the body tag
        var body = this._buildBody().attrs({
            to: this.domain,
            "xml:lang": "en",
            wait: this.wait,
            hold: this.hold,
            content: "text/xml; charset=utf-8",
            ver: "1.6",
            "xmpp:version": "1.0",
            "xmlns:xmpp": Strophe.NS.BOSH
        });

        this._changeConnectStatus(Strophe.Status.CONNECTING, null);

        this._requests.push(
            new Strophe.Request(body.tree(),
                                this._onRequestStateChange.bind(this)
                                    .prependArg(this._connect_cb.bind(this)),
                                body.tree().getAttribute("rid")));
        this._throttledRequestHandler();
    },

    /** Function: attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    attach: function (jid, sid, rid, callback, wait, hold, wind)
    {
        this.jid = jid;
        this.sid = sid;
        this.rid = rid;
        this.connect_callback = callback;

        this.domain = Strophe.getDomainFromJid(this.jid);

        this.authenticated = true;
        this.connected = true;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;
        this.window = wind || this.window;

        this._changeConnectStatus(Strophe.Status.ATTACHED, null);
    },

    /** Function: xmlInput
     *  User overrideable function that receives XML data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlInput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (XMLElement) elem - The XML data received by the connection.
     */
    xmlInput: function (elem)
    {
        return;
    },

    /** Function: xmlOutput
     *  User overrideable function that receives XML data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlOutput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (XMLElement) elem - The XMLdata sent by the connection.
     */
    xmlOutput: function (elem)
    {
        return;
    },

    /** Function: rawInput
     *  User overrideable function that receives raw data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawInput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data received by the connection.
     */
    rawInput: function (data)
    {
        return;
    },

    /** Function: rawOutput
     *  User overrideable function that receives raw data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawOutput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data sent by the connection.
     */
    rawOutput: function (data)
    {
        return;
    },

    /** Function: send
     *  Send a stanza.
     *
     *  This function is called to push data onto the send queue to
     *  go out over the wire.  Whenever a request is sent to the BOSH
     *  server, all pending data is sent and the queue is flushed.
     *
     *  Parameters:
     *    (XMLElement |
     *     [XMLElement] |
     *     Strophe.Builder) elem - The stanza to send.
     */
    send: function (elem)
    {
        if (elem === null) { return ; }
        if (typeof(elem.sort) === "function") {
            for (var i = 0; i < elem.length; i++) {
                this._queueData(elem[i]);
            }
        } else if (typeof(elem.tree) === "function") {
            this._queueData(elem.tree());
        } else {
            this._queueData(elem);
        }

        this._throttledRequestHandler();
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    },

    /** Function: flush
     *  Immediately send any pending outgoing data.
     *  
     *  Normally send() queues outgoing data until the next idle period
     *  (100ms), which optimizes network use in the common cases when
     *  several send()s are called in succession. flush() can be used to 
     *  immediately send all pending data.
     */
    flush: function ()
    {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    },

    /** Function: sendIQ
     *  Helper function to send IQ stanzas.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed 
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a 
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the IQ.
    */
    sendIQ: function(elem, callback, errback, timeout) {
        var timeoutHandler = null;
        var that = this;

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
	var id = elem.getAttribute('id');

	// inject id if not found
	if (!id) {
	    id = this.getUniqueId("sendIQ");
	    elem.setAttribute("id", id);
	}

	var handler = this.addHandler(function (stanza) {
	    // remove timeout handler if there is one
            if (timeoutHandler) {
                that.deleteTimedHandler(timeoutHandler);
            }

            var iqtype = stanza.getAttribute('type');
	    if (iqtype === 'result') {
		if (callback) {
                    callback(stanza);
                }
	    } else if (iqtype === 'error') {
		if (errback) {
                    errback(stanza);
                }
	    } else {
                throw {
                    name: "StropheError",
                    message: "Got bad IQ type of " + iqtype
                };
            }
	}, null, 'iq', null, id);

	// if timeout specified, setup timeout handler.
	if (timeout) {
	    timeoutHandler = this.addTimedHandler(timeout, function () {
                // get rid of normal handler
                that.deleteHandler(handler);

	        // call errback on timeout with null stanza
                if (errback) {
		    errback(null);
                }
		return false;
	    });
	}

	this.send(elem);

	return id;
    },

    /** PrivateFunction: _queueData
     *  Queue outgoing data for later sending.  Also ensures that the data
     *  is a DOMElement.
     */
    _queueData: function (element) {
        if (element === null ||
            !element.tagName ||
            !element.childNodes) {
            throw {
                name: "StropheError",
                message: "Cannot queue non-DOMElement."
            };
        }
        
        this._data.push(element);
    },

    /** PrivateFunction: _sendRestart
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        this._data.push("restart");

        this._throttledRequestHandler();
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    },

    /** Function: addTimedHandler
     *  Add a timed handler to the connection.
     *
     *  This function adds a timed handler.  The provided handler will
     *  be called every period milliseconds until it returns false,
     *  the connection is terminated, or the handler is removed.  Handlers
     *  that wish to continue being invoked should return true.
     *
     *  Because of method binding it is necessary to save the result of
     *  this function if you wish to remove a handler with
     *  deleteTimedHandler().
     *
     *  Note that user handlers are not active until authentication is
     *  successful.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    },

    /** Function: deleteTimedHandler
     *  Delete a timed handler for a connection.
     *
     *  This function removes a timed handler from the connection.  The
     *  handRef parameter is *not* the function passed to addTimedHandler(),
     *  but is the reference returned from addTimedHandler().
     *
     *  Parameters:
     *    (Strophe.TimedHandler) handRef - The handler reference.
     */
    deleteTimedHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    },

    /** Function: addHandler
     *  Add a stanza handler for the connection.
     *
     *  This function adds a stanza handler to the connection.  The
     *  handler callback will be called for any stanza that matches
     *  the parameters.  Note that if multiple parameters are supplied,
     *  they must all match for the handler to be invoked.
     *
     *  The handler will receive the stanza that triggered it as its argument.
     *  The handler should return true if it is to be invoked again;
     *  returning false will remove the handler after it returns.
     *
     *  As a convenience, the ns parameters applies to the top level element
     *  and also any of its immediate children.  This is primarily to make
     *  matching /iq/query elements easy.
     *
     *  The options argument contains handler matching flags that affect how
     *  matches are determined. Currently the only flag is matchBare (a
     *  boolean). When matchBare is true, the from parameter and the from
     *  attribute on the stanza will be matched as bare JIDs instead of
     *  full JIDs. To use this, pass {matchBare: true} as the value of
     *  options. The default value for matchBare is false. 
     *
     *  The return value should be saved if you wish to remove the handler
     *  with deleteHandler().
     *
     *  Parameters:
     *    (Function) handler - The user callback.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     *    (String) from - The stanza from attribute to match.
     *    (String) options - The handler options
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addHandler: function (handler, ns, name, type, id, from, options)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    },

    /** Function: deleteHandler
     *  Delete a stanza handler for a connection.
     *
     *  This function removes a stanza handler from the connection.  The
     *  handRef parameter is *not* the function passed to addHandler(),
     *  but is the reference returned from addHandler().
     *
     *  Parameters:
     *    (Strophe.Handler) handRef - The handler reference.
     */
    deleteHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeHandlers.push(handRef);
    },

    /** Function: disconnect
     *  Start the graceful disconnection process.
     *
     *  This function starts the disconnection process.  This process starts
     *  by sending unavailable presence and sending BOSH body of type
     *  terminate.  A timeout handler makes sure that disconnection happens
     *  even if the BOSH server does not respond.
     *
     *  The user supplied connection callback will be notified of the
     *  progress as this process happens.
     *
     *  Parameters:
     *    (String) reason - The reason the disconnect is occuring.
     */
    disconnect: function (reason)
    {
        this._changeConnectStatus(Strophe.Status.DISCONNECTING, reason);

        Strophe.info("Disconnect was called because: " + reason);
        if (this.connected) {
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                30000, this._onDisconnectTimeout.bind(this));
                
            // remove all of the requests
            if (this._requests.length > 0) {
            	for (var i=0; i<this._requests.length; i++) {
        			this._removeRequest(this._requests[i]);
            	}
        	}
                
            this._sendTerminate();
        }
    },

    /** PrivateFunction: _changeConnectStatus
     *  _Private_ helper function that makes sure plugins and the user's
     *  callback are notified of connection status changes.
     *
     *  Parameters:
     *    (Integer) status - the new connection status, one of the values
     *      in Strophe.Status
     *    (String) condition - the error condition or null
     */
    _changeConnectStatus: function (status, condition)
    {
        // notify all plugins listening for status changes
        for (var k in Strophe._connectionPlugins) {
            if (Strophe._connectionPlugins.hasOwnProperty(k)) {
                var plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        Strophe.error("" + k + " plugin caused an exception " +
                                      "changing status: " + err);
                    }
                }
            }
        }

        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition);
            } catch (e) {
                Strophe.error("User connection callback caused an " +
                              "exception: " + e);
            }
        }
    },

    /** PrivateFunction: _buildBody
     *  _Private_ helper function to generate the <body/> wrapper for BOSH.
     *
     *  Returns:
     *    A Strophe.Builder with a <body/> element.
     */
    _buildBody: function ()
    {
        var bodyWrap = $build('body', {
            rid: this.rid++,
            xmlns: Strophe.NS.HTTPBIND
        });

        if (this.sid !== null) {
            bodyWrap.attrs({sid: this.sid});
        }

        return bodyWrap;
    },

    /** PrivateFunction: _removeRequest
     *  _Private_ function to remove a request from the queue.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request to remove.
     */
    _removeRequest: function (req)
    {
        Strophe.debug("removing request");

        var i;
        for (i = this._requests.length - 1; i >= 0; i--) {
            if (req == this._requests[i]) {
                this._requests.splice(i, 1);
            }
        }

        // IE6 fails on setting to null, so set to empty function
        req.xhr.onreadystatechange = function () {};

        this._throttledRequestHandler();
    },

    /** PrivateFunction: _restartRequest
     *  _Private_ function to restart a request that is presumed dead.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _restartRequest: function (i)
    {
        var req = this._requests[i];
        if (req.dead === null) {
            req.dead = new Date();
        }

        this._processRequest(i);
    },

    /** PrivateFunction: _processRequest
     *  _Private_ function to process a request in the queue.
     *
     *  This function takes requests off the queue and sends them and
     *  restarts dead requests.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _processRequest: function (i)
    {
        var req = this._requests[i];
        var reqStatus = -1;

        try {
            if (req.xhr.readyState == 4) {
                reqStatus = req.xhr.status;
            }
        } catch (e) {
            Strophe.error("caught an error in _requests[" + i +
                          "], reqStatus: " + reqStatus);
        }

        if (typeof(reqStatus) == "undefined") {
            reqStatus = -1;
        }

        var time_elapsed = req.age();
        var primaryTimeout = (!isNaN(time_elapsed) &&
                              time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait));
        var secondaryTimeout = (req.dead !== null &&
                                req.timeDead() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait));
        var requestCompletedWithServerError = (req.xhr.readyState == 4 &&
                                               (reqStatus < 1 ||
                                                reqStatus >= 500));
        if (primaryTimeout || secondaryTimeout ||
            requestCompletedWithServerError) {
            if (secondaryTimeout) {
                Strophe.error("Request " +
                              this._requests[i].id +
                              " timed out (secondary), restarting");
            }
            req.abort = true;
            req.xhr.abort();
            // setting to null fails on IE6, so set to empty function
            req.xhr.onreadystatechange = function () {};
            this._requests[i] = new Strophe.Request(req.xmlData,
                                                    req.origFunc,
                                                    req.rid,
                                                    req.sends);
            req = this._requests[i];
        }

        if (req.xhr.readyState === 0) {
            Strophe.debug("request id " + req.id +
                          "." + req.sends + " posting");

            req.date = new Date();
            try {
                req.xhr.open("POST", this.service, true);
            } catch (e2) {
                Strophe.error("XHR open failed.");
                if (!this.connected) {
                    this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                              "bad-service");
                }
                this.disconnect();
                return;
            }

            // Fires the XHR request -- may be invoked immediately
            // or on a gradually expanding retry window for reconnects
            var sendFunc = function () {
                req.xhr.send(req.data);
            };

            // Implement progressive backoff for reconnects --
            // First retry (send == 1) should also be instantaneous
            if (req.sends > 1) {
                // Using a cube of the retry number creats a nicely
                // expanding retry window
                var backoff = Math.pow(req.sends, 3) * 1000;
                setTimeout(sendFunc, backoff);
            } else {
                sendFunc();
            }

            req.sends++;

            this.xmlOutput(req.xmlData);
            this.rawOutput(req.data);
        } else {
            Strophe.debug("_processRequest: " +
                          (i === 0 ? "first" : "second") +
                          " request has readyState of " +
                          req.xhr.readyState);
        }
    },

    /** PrivateFunction: _throttledRequestHandler
     *  _Private_ function to throttle requests to the connection window.
     *
     *  This function makes sure we don't send requests so fast that the
     *  request ids overflow the connection window in the case that one
     *  request died.
     */
    _throttledRequestHandler: function ()
    {
        if (!this._requests) {
            Strophe.debug("_throttledRequestHandler called with " +
                          "undefined requests");
        } else {
            Strophe.debug("_throttledRequestHandler called with " +
                          this._requests.length + " requests");
        }

        if (!this._requests || this._requests.length === 0) {
            return;
        }

        if (this._requests.length > 0) {
            this._processRequest(0);
        }

        if (this._requests.length > 1 &&
            Math.abs(this._requests[0].rid -
                     this._requests[1].rid) < this.window - 1) {
            this._processRequest(1);
        }
    },

    /** PrivateFunction: _onRequestStateChange
     *  _Private_ handler for Strophe.Request state changes.
     *
     *  This function is called when the XMLHttpRequest readyState changes.
     *  It contains a lot of error handling logic for the many ways that
     *  requests can fail, and calls the request callback when requests
     *  succeed.
     *
     *  Parameters:
     *    (Function) func - The handler for the request.
     *    (Strophe.Request) req - The request that is changing readyState.
     */
    _onRequestStateChange: function (func, req)
    {
        Strophe.debug("request id " + req.id +
                      "." + req.sends + " state changed to " +
                      req.xhr.readyState);

        if (req.abort) {
            req.abort = false;
            return;
        }

        // request complete
        var reqStatus;
        if (req.xhr.readyState == 4) {
            reqStatus = 0;
            try {
                reqStatus = req.xhr.status;
            } catch (e) {
                // ignore errors from undefined status attribute.  works
                // around a browser bug
            }

            if (typeof(reqStatus) == "undefined") {
                reqStatus = 0;
            }

            if (this.disconnecting) {
                if (reqStatus >= 400) {
                    this._hitError(reqStatus);
                    return;
                }
            }

            var reqIs0 = (this._requests[0] == req);
            var reqIs1 = (this._requests[1] == req);

            if ((reqStatus > 0 && reqStatus < 500) || req.sends > 5) {
                // remove from internal queue
                this._removeRequest(req);
                Strophe.debug("request id " +
                              req.id +
                              " should now be removed");
            }

            // request succeeded
            if (reqStatus == 200) {
                // if request 1 finished, or request 0 finished and request
                // 1 is over Strophe.SECONDARY_TIMEOUT seconds old, we need to
                // restart the other - both will be in the first spot, as the
                // completed request has been removed from the queue already
                if (reqIs1 ||
                    (reqIs0 && this._requests.length > 0 &&
                     this._requests[0].age() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait))) {
                    this._restartRequest(0);
                }
                // call handler
                Strophe.debug("request id " +
                              req.id + "." +
                              req.sends + " got 200");
                func(req);
                this.errors = 0;
            } else {
                Strophe.error("request id " +
                              req.id + "." +
                              req.sends + " error " + reqStatus +
                              " happened");
                if (reqStatus === 0 ||
                    (reqStatus >= 400 && reqStatus < 600) ||
                    reqStatus >= 12000) {
                    this._hitError(reqStatus);
                    if (reqStatus >= 400 && reqStatus < 500) {
                        this._changeConnectStatus(Strophe.Status.DISCONNECTING,
                                                  null);
                        this._doDisconnect();
                    }
                }
            }

            if (!((reqStatus > 0 && reqStatus < 10000) ||
                  req.sends > 5)) {
                this._throttledRequestHandler();
            }
        }
    },

    /** PrivateFunction: _hitError
     *  _Private_ function to handle the error count.
     *
     *  Requests are resent automatically until their error count reaches
     *  5.  Each time an error is encountered, this function is called to
     *  increment the count and disconnect if the count is too high.
     *
     *  Parameters:
     *    (Integer) reqStatus - The request status.
     */
    _hitError: function (reqStatus)
    {
        this.errors++;
        Strophe.warn("request errored, status: " + reqStatus +
                     ", number of errors: " + this.errors);
        if (this.errors > 4) {
            this._onDisconnectTimeout();
        }
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  This is the last piece of the disconnection logic.  This resets the
     *  connection and alerts the user's connection callback.
     */
    _doDisconnect: function ()
    {
        Strophe.info("_doDisconnect was called");
        this.authenticated = false;
        this.disconnecting = false;
        this.sid = null;
        this.streamId = null;
        this.rid = Math.floor(Math.random() * 4294967295);

        // tell the parent we disconnected
        if (this.connected) {
            this._changeConnectStatus(Strophe.Status.DISCONNECTED, null);
            this.connected = false;
        }

        // delete handlers
        this.handlers = [];
        this.timedHandlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
    },

    /** PrivateFunction: _dataRecv
     *  _Private_ handler to processes incoming data from the the connection.
     *
     *  Except for _connect_cb handling the initial connection request,
     *  this function handles the incoming data for all requests.  This
     *  function also fires stanza handlers that match each incoming
     *  stanza.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request that has data ready.
     */
    _dataRecv: function (req)
    {
        try {
            var elem = req.getResponse();
        } catch (e) {
            if (e != "parsererror") { throw e; }
            this.disconnect("strophe-parsererror");
        }
        if (elem === null) { return; }

        this.xmlInput(elem);
        this.rawInput(Strophe.serialize(elem));

        // remove handlers scheduled for deletion
        var i, hand;
        while (this.removeHandlers.length > 0) {
            hand = this.removeHandlers.pop();
            i = this.handlers.indexOf(hand);
            if (i >= 0) {
                this.handlers.splice(i, 1);
            }
        }

        // add handlers scheduled for addition
        while (this.addHandlers.length > 0) {
            this.handlers.push(this.addHandlers.pop());
        }

        // handle graceful disconnect
        if (this.disconnecting && this._requests.length === 0) {
            this.deleteTimedHandler(this._disconnectTimeout);
            this._disconnectTimeout = null;
            this._doDisconnect();
            return;
        }

        var typ = elem.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // an error occurred
            cond = elem.getAttribute("condition");
            conflict = elem.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            this.disconnect();
            return;
        }

        // send each incoming stanza through the handler chain
        var that = this;
        Strophe.forEachChild(elem, null, function (child) {
            var i, newList;
            // process handlers
            newList = that.handlers;
            that.handlers = [];
            for (i = 0; i < newList.length; i++) {
                var hand = newList[i];
                if (hand.isMatch(child) &&
                    (that.authenticated || !hand.user)) {
                    if (hand.run(child)) {
                        that.handlers.push(hand);
                    }
                } else {
                    that.handlers.push(hand);
                }
            }
        });
    },

    /** PrivateFunction: _sendTerminate
     *  _Private_ function to send initial disconnect sequence.
     *
     *  This is the first step in a graceful disconnect.  It sends
     *  the BOSH server a terminate body and includes an unavailable
     *  presence if authentication has completed.
     */
    _sendTerminate: function ()
    {
        Strophe.info("_sendTerminate was called");
        var body = this._buildBody().attrs({type: "terminate"});

        if (this.authenticated) {
            body.c('presence', {
                xmlns: Strophe.NS.CLIENT,
                type: 'unavailable'
            });
        }

        this.disconnecting = true;

        var req = new Strophe.Request(body.tree(),
                                      this._onRequestStateChange.bind(this)
                                          .prependArg(this._dataRecv.bind(this)),
                                      body.tree().getAttribute("rid"));

        this._requests.push(req);
        this._throttledRequestHandler();
    },

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the initial connection request
     *  response from the BOSH server. It is used to set up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Strophe.Request) req - The current request.
     */
    _connect_cb: function (req)
    {
        Strophe.info("_connect_cb was called");

        this.connected = true;
        var bodyWrap = req.getResponse();
        if (!bodyWrap) { return; }

        this.xmlInput(bodyWrap);
        this.rawInput(Strophe.serialize(bodyWrap));

        var typ = bodyWrap.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // an error occurred
            cond = bodyWrap.getAttribute("condition");
            conflict = bodyWrap.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            return;
        }

        // check to make sure we don't overwrite these if _connect_cb is
        // called multiple times in the case of missing stream:features
        if (!this.sid) {
            this.sid = bodyWrap.getAttribute("sid");
        }
        if (!this.stream_id) {
            this.stream_id = bodyWrap.getAttribute("authid");
        }
        var wind = bodyWrap.getAttribute('requests');
        if (wind) { this.window = parseInt(wind, 10); }
        var hold = bodyWrap.getAttribute('hold');
        if (hold) { this.hold = parseInt(hold, 10); }
        var wait = bodyWrap.getAttribute('wait');
        if (wait) { this.wait = parseInt(wait, 10); }
        

        var do_sasl_plain = false;
        var do_sasl_digest_md5 = false;
        var do_sasl_anonymous = false;

        var mechanisms = bodyWrap.getElementsByTagName("mechanism");
        var i, mech, auth_str, hashed_auth_str;
        if (mechanisms.length > 0) {
            for (i = 0; i < mechanisms.length; i++) {
                mech = Strophe.getText(mechanisms[i]);
                if (mech == 'DIGEST-MD5') {
                    do_sasl_digest_md5 = true;
                } else if (mech == 'PLAIN') {
                    do_sasl_plain = true;
                } else if (mech == 'ANONYMOUS') {
                    do_sasl_anonymous = true;
                }
            }
        } else {
            // we didn't get stream:features yet, so we need wait for it
            // by sending a blank poll request
            var body = this._buildBody();
            this._requests.push(
                new Strophe.Request(body.tree(),
                                    this._onRequestStateChange.bind(this)
                                      .prependArg(this._connect_cb.bind(this)),
                                    body.tree().getAttribute("rid")));
            this._throttledRequestHandler();
            return;
        }

        if (Strophe.getNodeFromJid(this.jid) === null &&
            do_sasl_anonymous) {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this), null,
                "success", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "ANONYMOUS"
            }).tree());
        } else if (Strophe.getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                      'x-strophe-bad-non-anon-jid');
            this.disconnect();
        } else if (do_sasl_digest_md5) {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_challenge1_cb.bind(this), null,
                "challenge", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "DIGEST-MD5"
            }).tree());
        } else if (do_sasl_plain) {
            // Build the plain auth string (barejid null
            // username null password) and base 64 encoded.
            auth_str = Strophe.getBareJidFromJid(this.jid);
            auth_str = auth_str + "\u0000";
            auth_str = auth_str + Strophe.getNodeFromJid(this.jid);
            auth_str = auth_str + "\u0000";
            auth_str = auth_str + this.pass;

            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this), null,
                "success", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            hashed_auth_str = Base64.encode(auth_str);
            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "PLAIN"
            }).t(hashed_auth_str).tree());
        } else {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._addSysHandler(this._auth1_cb.bind(this), null, null,
                                null, "_auth_1");

            this.send($iq({
                type: "get",
                to: this.domain,
                id: "_auth_1"
            }).c("query", {
                xmlns: Strophe.NS.AUTH
            }).c("username", {}).t(Strophe.getNodeFromJid(this.jid)).tree());
        }
    },

    /** PrivateFunction: _sasl_challenge1_cb
     *  _Private_ handler for DIGEST-MD5 SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The challenge stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_challenge1_cb: function (elem)
    {
        var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;

        var challenge = Base64.decode(Strophe.getText(elem));
        var cnonce = MD5.hexdigest(Math.random() * 1234567890);
        var realm = "";
        var host = null;
        var nonce = "";
        var qop = "";
        var matches;

        // remove unneeded handlers
        this.deleteHandler(this._sasl_failure_handler);

        while (challenge.match(attribMatch)) {
            matches = challenge.match(attribMatch);
            challenge = challenge.replace(matches[0], "");
            matches[2] = matches[2].replace(/^"(.+)"$/, "$1");
            switch (matches[1]) {
            case "realm":
                realm = matches[2];
                break;
            case "nonce":
                nonce = matches[2];
                break;
            case "qop":
                qop = matches[2];
                break;
            case "host":
                host = matches[2];
                break;
            }
        }

        var digest_uri = "xmpp/" + this.domain;
        if (host !== null) {
            digest_uri = digest_uri + "/" + host;
        }

        var A1 = MD5.hash(Strophe.getNodeFromJid(this.jid) +
                          ":" + realm + ":" + this.pass) +
            ":" + nonce + ":" + cnonce;
        var A2 = 'AUTHENTICATE:' + digest_uri;

        var responseText = "";
        responseText += 'username=' +
            this._quote(Strophe.getNodeFromJid(this.jid)) + ',';
        responseText += 'realm=' + this._quote(realm) + ',';
        responseText += 'nonce=' + this._quote(nonce) + ',';
        responseText += 'cnonce=' + this._quote(cnonce) + ',';
        responseText += 'nc="00000001",';
        responseText += 'qop="auth",';
        responseText += 'digest-uri=' + this._quote(digest_uri) + ',';
        responseText += 'response=' + this._quote(
            MD5.hexdigest(MD5.hexdigest(A1) + ":" +
                          nonce + ":00000001:" +
                          cnonce + ":auth:" +
                          MD5.hexdigest(A2))) + ',';
        responseText += 'charset="utf-8"';

        this._sasl_challenge_handler = this._addSysHandler(
            this._sasl_challenge2_cb.bind(this), null,
            "challenge", null, null);
        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build('response', {
            xmlns: Strophe.NS.SASL
        }).t(Base64.encode(responseText)).tree());

        return false;
    },

    /** PrivateFunction: _quote
     *  _Private_ utility function to backslash escape and quote strings.
     *
     *  Parameters:
     *    (String) str - The string to be quoted.
     *
     *  Returns:
     *    quoted string
     */
    _quote: function (str)
    {
        return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; 
        //" end string workaround for emacs
    },


    /** PrivateFunction: _sasl_challenge2_cb
     *  _Private_ handler for second step of DIGEST-MD5 SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The challenge stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_challenge2_cb: function (elem)
    {
        // remove unneeded handlers
        this.deleteHandler(this._sasl_success_handler);
        this.deleteHandler(this._sasl_failure_handler);

        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);
        this.send($build('response', {xmlns: Strophe.NS.SASL}).tree());
        return false;
    },

    /** PrivateFunction: _auth1_cb
     *  _Private_ handler for legacy authentication.
     *
     *  This handler is called in response to the initial <iq type='get'/>
     *  for legacy authentication.  It builds an authentication <iq/> and
     *  sends it, creating a handler (calling back to _auth2_cb()) to
     *  handle the result
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth1_cb: function (elem)
    {
        // build plaintext auth iq
        var iq = $iq({type: "set", id: "_auth_2"})
            .c('query', {xmlns: Strophe.NS.AUTH})
            .c('username', {}).t(Strophe.getNodeFromJid(this.jid))
            .up()
            .c('password').t(this.pass);

        if (!Strophe.getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = Strophe.getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(Strophe.getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null,
                            null, null, "_auth_2");

        this.send(iq.tree());

        return false;
    },

    /** PrivateFunction: _sasl_success_cb
     *  _Private_ handler for succesful SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_success_cb: function (elem)
    {
        Strophe.info("SASL authentication succeeded.");

        // remove old handlers
        this.deleteHandler(this._sasl_failure_handler);
        this._sasl_failure_handler = null;
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        this._addSysHandler(this._sasl_auth1_cb.bind(this), null,
                            "stream:features", null, null);

        // we must send an xmpp:restart now
        this._sendRestart();

        return false;
    },

    /** PrivateFunction: _sasl_auth1_cb
     *  _Private_ handler to start stream binding.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_auth1_cb: function (elem)
    {
        var i, child;

        for (i = 0; i < elem.childNodes.length; i++) {
            child = elem.childNodes[i];
            if (child.nodeName == 'bind') {
                this.do_bind = true;
            }

            if (child.nodeName == 'session') {
                this.do_session = true;
            }
        }

        if (!this.do_bind) {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        } else {
            this._addSysHandler(this._sasl_bind_cb.bind(this), null, null,
                                null, "_bind_auth_2");

            var resource = Strophe.getResourceFromJid(this.jid);
            if (resource) {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .c('resource', {}).t(resource).tree());
            } else {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .tree());
            }
        }

        return false;
    },

    /** PrivateFunction: _sasl_bind_cb
     *  _Private_ handler for binding result and session start.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_bind_cb: function (elem)
    {
        if (elem.getAttribute("type") == "error") {
            Strophe.info("SASL binding failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }

        // TODO - need to grab errors
        var bind = elem.getElementsByTagName("bind");
        var jidNode;
        if (bind.length > 0) {
            // Grab jid
            jidNode = bind[0].getElementsByTagName("jid");
            if (jidNode.length > 0) {
                this.jid = Strophe.getText(jidNode[0]);

                if (this.do_session) {
                    this._addSysHandler(this._sasl_session_cb.bind(this),
                                        null, null, null, "_session_auth_2");

                    this.send($iq({type: "set", id: "_session_auth_2"})
                                  .c('session', {xmlns: Strophe.NS.SESSION})
                                  .tree());
                } else {
                    this.authenticated = true;
                    this._changeConnectStatus(Strophe.Status.CONNECTED, null);
                }
            }
        } else {
            Strophe.info("SASL binding failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }
    },

    /** PrivateFunction: _sasl_session_cb
     *  _Private_ handler to finish successful SASL connection.
     *
     *  This sets Connection.authenticated to true on success, which
     *  starts the processing of user handlers.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_session_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            Strophe.info("Session creation failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }

        return false;
    },

    /** PrivateFunction: _sasl_failure_cb
     *  _Private_ handler for SASL authentication failure.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_failure_cb: function (elem)
    {
        // delete unneeded handlers
        if (this._sasl_success_handler) {
            this.deleteHandler(this._sasl_success_handler);
            this._sasl_success_handler = null;
        }
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
        return false;
    },

    /** PrivateFunction: _auth2_cb
     *  _Private_ handler to finish legacy authentication.
     *
     *  This handler is called when the result from the jabber:iq:auth
     *  <iq/> stanza is returned.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth2_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            this.disconnect();
        }

        return false;
    },

    /** PrivateFunction: _addSysTimedHandler
     *  _Private_ function to add a system level timed handler.
     *
     *  This function is used to add a Strophe.TimedHandler for the
     *  library code.  System timed handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     */
    _addSysTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    },

    /** PrivateFunction: _addSysHandler
     *  _Private_ function to add a system level stanza handler.
     *
     *  This function is used to add a Strophe.Handler for the
     *  library code.  System stanza handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Function) handler - The callback function.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     */
    _addSysHandler: function (handler, ns, name, type, id)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  If the graceful disconnect process does not complete within the
     *  time allotted, this handler finishes the disconnect anyway.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onDisconnectTimeout: function ()
    {
        Strophe.info("_onDisconnectTimeout was called");

        // cancel all remaining requests and clear the queue
        var req;
        while (this._requests.length > 0) {
            req = this._requests.pop();
            req.abort = true;
            req.xhr.abort();
            // jslint complains, but this is fine. setting to empty func
            // is necessary for IE6
            req.xhr.onreadystatechange = function () {};
        }

        // actually disconnect
        this._doDisconnect();

        return false;
    },

    /** PrivateFunction: _onIdle
     *  _Private_ handler to process events during idle cycle.
     *
     *  This handler is called every 100ms to fire timed handlers that
     *  are ready and keep poll requests going.
     */
    _onIdle: function ()
    {
        var i, thand, since, newList;

        // remove timed handlers that have been scheduled for deletion
        while (this.removeTimeds.length > 0) {
            thand = this.removeTimeds.pop();
            i = this.timedHandlers.indexOf(thand);
            if (i >= 0) {
                this.timedHandlers.splice(i, 1);
            }
        }

        // add timed handlers scheduled for addition
        while (this.addTimeds.length > 0) {
            this.timedHandlers.push(this.addTimeds.pop());
        }

        // call ready timed handlers
        var now = new Date().getTime();
        newList = [];
        for (i = 0; i < this.timedHandlers.length; i++) {
            thand = this.timedHandlers[i];
            if (this.authenticated || !thand.user) {
                since = thand.lastCalled + thand.period;
                if (since - now <= 0) {
                    if (thand.run()) {
                        newList.push(thand);
                    }
                } else {
                    newList.push(thand);
                }
            }
        }
        this.timedHandlers = newList;

        var body, time_elapsed;

        // if no requests are in progress, poll
        if (this.authenticated && this._requests.length === 0 &&
            this._data.length === 0 && !this.disconnecting) {
            Strophe.info("no requests during idle cycle, sending " +
                         "blank request");
            this._data.push(null);
        }

        if (this._requests.length < 2 && this._data.length > 0 &&
            !this.paused) {
            body = this._buildBody();
            for (i = 0; i < this._data.length; i++) {
                if (this._data[i] !== null) {
                    if (this._data[i] === "restart") {
                        body.attrs({
                            to: this.domain,
                            "xml:lang": "en",
                            "xmpp:restart": "true",
                            "xmlns:xmpp": Strophe.NS.BOSH
                        });
                    } else {
                        body.cnode(this._data[i]).up();
                    }
                }
            }
            delete this._data;
            this._data = [];
            this._requests.push(
                new Strophe.Request(body.tree(),
                                    this._onRequestStateChange.bind(this)
                                    .prependArg(this._dataRecv.bind(this)),
                                    body.tree().getAttribute("rid")));
            this._processRequest(this._requests.length - 1);
        }

        if (this._requests.length > 0) {
            time_elapsed = this._requests[0].age();
            if (this._requests[0].dead !== null) {
                if (this._requests[0].timeDead() >
                    Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait)) {
                    this._throttledRequestHandler();
                }
            }

            if (time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait)) {
                Strophe.warn("Request " +
                             this._requests[0].id +
                             " timed out, over " + Math.floor(Strophe.TIMEOUT * this.wait) +
                             " seconds since last activity");
                this._throttledRequestHandler();
            }
        }

        // reactivate the timer
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    }
};

if (callback) {
    callback(Strophe, $build, $msg, $iq, $pres);
}

})(function () {
    window.Strophe = arguments[0];
    window.$build = arguments[1];
    window.$msg = arguments[2];
    window.$iq = arguments[3];
    window.$pres = arguments[4];
});

/* CORS plugin
**
** flXHR.js should be loaded before this plugin if flXHR support is required.
*/

Strophe.addConnectionPlugin('cors', {
    init: function () {
        // replace Strophe.Request._newXHR with new CORS version
        if (window.XDomainRequest) {
            // We are in IE with CORS support
            Strophe.debug("CORS with IE");
            Strophe.Request.prototype._newXHR = function () {
                var stateChange = function(xhr, state) {
                    // Fudge the calling of onreadystatechange()
                    xhr.status = state;
                    xhr.readyState = 4;
                    try {
                        xhr.onreadystatechange();
                    }catch(err){}
                    xhr.readyState = 0;
                    try{
                        xhr.onreadystatechange();
                    }catch(err){}
                }
                var xhr = new XDomainRequest();
                xhr.readyState = 0;
                xhr.onreadystatechange = this.func.prependArg(this);
                xhr.onload = function () {
                    // Parse the responseText to XML
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = "false";
                    xmlDoc.loadXML(xhr.responseText);
                    xhr.responseXML = xmlDoc;
                    stateChange(xhr, 200);
                }
                xhr.onerror = function () {
                    stateChange(xhr, 500);
                }
                xhr.ontimeout = function () {
                    stateChange(xhr, 500);
                }
                xhr.sendFnc = xhr.send;
                xhr.send = function (value) {
                    xhr.readyState = 2;
                    return xhr.sendFnc(value);
                }
                return xhr;
            };
        } else if (new XMLHttpRequest().withCredentials !== undefined) {
            // We are in a sane browser with CROS support - no need to do anything
            Strophe.debug("CORS with Firefox/Safari/Chome");
        } else if (flensed && flensed.flXHR) {
            // We don't have CORS support, so include flXHR
            Strophe.debug("CORS not supported, using flXHR");
            var poolingSetting = true;
            if (navigator.userAgent.indexOf('MSIE') !=-1) {
                // IE 7 has an issue with instance pooling and flash 10.1
                poolingSetting = false;
            }
            Strophe.Request.prototype._newXHR = function () {
                var xhr = new flensed.flXHR({
                    autoUpdatePlayer: true,
                    instancePooling: poolingSetting,
                    noCacheHeader: false});
                xhr.onreadystatechange = this.func.prependArg(this);
                return xhr;
            };
        } else {
            Strophe.error("No CORS and no flXHR. You may experience cross domain turbulence.");
        }
    }
});

// Inspired by addEvent - Dean Edwards, 2005
;Phono.events = {
   handlerCount: 1,
   add: function(target, type, handler) {
      // ignore case
      type = type.toLowerCase();
        // assign each event handler a unique ID
        if (!handler.$$guid) handler.$$guid = this.handlerCount++;
        // create a hash table of event types for the target
        if (!target.events) target.events = {};
        // create a hash table of event handlers for each target/event pair
        var handlers = target.events[type];
        if (!handlers) {
            handlers = target.events[type] = {};
            // store the existing event handler (if there is one)
            if (target["on" + type]) {
                handlers[0] = target["on" + type];
            }
        }
        // store the event handler in the hash table
        handlers[handler.$$guid] = handler;
        // assign a global event handler to do all the work
        target["on" + type] = this.handle;
   },
   bind: function(target, config) {
      var name;
      for(k in config) {
        if(k.match("^on")) {
            this.add(target, k.substr(2).toLowerCase(), config[k]);
        }
      }
   },
   remove: function(target, type, handler) {
      // ignore case
      type = type.toLowerCase();
        // delete the event handler from the hash table
        if (target.events && target.events[type]) {
            delete target.events[type][handler.$$guid];
        }
   },
   trigger: function(target, type, event, data) {
      event = event || {};
      event.type = type;
      var handler = target["on"+type.toLowerCase()]
      if(handler) {
         // Don't log log events ;-)
         if("log" != type.toLowerCase()) {
             Phono.log.info("[EVENT] " + type + "[" + data + "]");
         }
         handler.call(target, event, data); 
      }
   },
   handle: function(event, data) {
    // get a reference to the hash table of event handlers
    var handlers = this.events[event.type.toLowerCase()];
    // set event source
    event.source = this;
    // build arguments
    var args = new Array();
    args.push(event);
    if(data) {
       var i;
       for(i=0; i<data.length; i++) {
          args.push(data[i]);
       }
    }
    var target = this;
    // execute each event handler
    Phono.util.each(handlers, function() {
         this.apply(target,args);
    });
   }
};
/*
 * jQuery Tools 1.2.2 - The missing UI library for the Web
 * 
 * [toolbox.flashembed]
 * 
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 * 
 * http://flowplayer.org/tools/
 * 
 * File generated: Tue May 25 08:09:15 GMT 2010
 */
(function(){function f(a,b){if(b)for(key in b)if(b.hasOwnProperty(key))a[key]=b[key];return a}function l(a,b){var c=[];for(var d in a)if(a.hasOwnProperty(d))c[d]=b(a[d]);return c}function m(a,b,c){if(e.isSupported(b.version))a.innerHTML=e.getHTML(b,c);else if(b.expressInstall&&e.isSupported([6,65]))a.innerHTML=e.getHTML(f(b,{src:b.expressInstall}),{MMredirectURL:location.href,MMplayerType:"PlugIn",MMdoctitle:document.title});else{if(!a.innerHTML.replace(/\s/g,"")){a.innerHTML="<h2>Flash version "+
b.version+" or greater is required</h2><h3>"+(g[0]>0?"Your version is "+g:"You have no flash plugin installed")+"</h3>"+(a.tagName=="A"?"<p>Click here to download latest version</p>":"<p>Download latest version from <a href='"+k+"'>here</a></p>");if(a.tagName=="A")a.onclick=function(){location.href=k}}if(b.onFail){var d=b.onFail.call(this);if(typeof d=="string")a.innerHTML=d}}if(h)window[b.id]=document.getElementById(b.id);f(this,{getRoot:function(){return a},getOptions:function(){return b},getConf:function(){return c},
getApi:function(){return a.firstChild}})}var h=document.all,k="http://www.adobe.com/go/getflashplayer",n=typeof $=="function",o=/(\d+)[^\d]+(\d+)[^\d]*(\d*)/,i={width:"100%",height:"100%",id:"_"+(""+Math.random()).slice(9),allowfullscreen:true,allowscriptaccess:"always",quality:"high",version:[3,0],onFail:null,expressInstall:null,w3c:false,cachebusting:false};window.attachEvent&&window.attachEvent("onbeforeunload",function(){__flash_unloadHandler=function(){};__flash_savedUnloadHandler=function(){}});
window.flashembed=function(a,b,c){if(typeof a=="string")a=document.getElementById(a.replace("#",""));if(a){if(typeof b=="string")b={src:b};return new m(a,f(f({},i),b),c)}};var e=f(window.flashembed,{conf:i,getVersion:function(){var a;try{a=navigator.plugins["Shockwave Flash"].description.slice(16)}catch(b){try{var c=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7");a=c&&c.GetVariable("$version")}catch(d){}}return(a=o.exec(a))?[a[1],a[3]]:[0,0]},asString:function(a){if(a===null||a===undefined)return null;
var b=typeof a;if(b=="object"&&a.push)b="array";switch(b){case "string":a=a.replace(new RegExp('(["\\\\])',"g"),"\\$1");a=a.replace(/^\s?(\d+\.?\d+)%/,"$1pct");return'"'+a+'"';case "array":return"["+l(a,function(d){return e.asString(d)}).join(",")+"]";case "function":return'"function()"';case "object":b=[];for(var c in a)a.hasOwnProperty(c)&&b.push('"'+c+'":'+e.asString(a[c]));return"{"+b.join(",")+"}"}return String(a).replace(/\s/g," ").replace(/\'/g,'"')},getHTML:function(a,b){a=f({},a);var c='<object width="'+
a.width+'" height="'+a.height+'" id="'+a.id+'" name="'+a.id+'"';if(a.cachebusting)a.src+=(a.src.indexOf("?")!=-1?"&":"?")+Math.random();c+=a.w3c||!h?' data="'+a.src+'" type="application/x-shockwave-flash"':' classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"';c+=">";if(a.w3c||h)c+='<param name="movie" value="'+a.src+'" />';a.width=a.height=a.id=a.w3c=a.src=null;a.onFail=a.version=a.expressInstall=null;for(var d in a)if(a[d])c+='<param name="'+d+'" value="'+a[d]+'" />';a="";if(b){for(var j in b)if(b[j]){d=
b[j];a+=j+"="+(/function|object/.test(typeof d)?e.asString(d):d)+"&"}a=a.slice(0,-1);c+='<param name="flashvars" value=\''+a+"' />"}c+="</object>";return c},isSupported:function(a){return g[0]>a[0]||g[0]==a[0]&&g[1]>=a[1]}}),g=e.getVersion();if(n){$.tools=$.tools||{version:"1.2.2"};$.tools.flashembed={conf:i};$.fn.flashembed=function(a,b){return this.each(function(){$(this).data("flashembed",flashembed(this,a,b))})}}})();


;(function() {
function FlashAudio(phono, config, callback) {
    this.type = "flash";

    // Define defualt config and merge from constructor
    this.config = Phono.util.extend({
        protocol: "rtmfp",
        swf: "//" + MD5.hexdigest(window.location.host+phono.config.apiKey) + ".u.phono.com/releases/" + Phono.version + "/plugins/audio/phono.audio.swf",
        cirrus: "rtmfp://phono-fms1-ext.voxeolabs.net/phono",
        direct: true,
        media: {audio:true,video:true}
    }, config);

    // Bind Event Listeners
    Phono.events.bind(this, config);
    
    var containerId = this.config.containerId;
    
    // Create flash continer is user did not specify one
    if(!containerId) {
	this.config.containerId = containerId = this.createContainer();
    }
    
    // OMG! Fix position of flash movie to be integer pixel
    Phono.events.bind(this, {
        onPermissionBoxShow: function() {
            var p = $("#"+containerId).position();
            $("#"+containerId).css("left",parseInt(p.left));
            $("#"+containerId).css("top",parseInt(p.top));
        } 
    });		
    
    var plugin = this;
    
    // Flash movie is embedded asynchronously so we need a listener 
    // to fire when the SWF is loaded and ready for action
    FABridge.addInitializationCallback(containerId, function(){
        Phono.log.info("FlashAudio Ready");
        plugin.$flash = this.create("Wrapper").getAudio();
        plugin.$flash.addEventListener(null, function(event) {
            var eventName = (event.getType()+"");
            Phono.events.trigger(plugin, eventName, {
                reason: event.getReason()
            });
            if (eventName == "mediaError") {
                Phono.events.trigger(phono, "error", {
                    reason: event.getReason()
                });
            }
        });
        plugin.$flash.setVersion(Phono.version);
        callback(plugin);
    });

    wmodeSetting = "opaque";
    
    if ((navigator.appVersion.indexOf("X11")!=-1) || (navigator.appVersion.indexOf("Linux")!=-1) || ($.browser.opera)) {
        wmodeSetting = "window";
    }
    
    // Embed flash plugin
    flashembed(containerId, 
               {
                   id:containerId + "id",
                   src:this.config.swf + "?rnd=" + new Date().getTime(),
                   wmode:wmodeSetting
               }, 
               {
                   bridgeName:containerId
               }
              );
};

FlashAudio.count = 0;

// FlashAudio Functions
//
// Most of these will simply pass through to the underlying Flash layer.
// In the old API this was done by 'wrapping' the Flash object. I've chosen a more verbos 
// approach to aid in debugging now that the Flash side has been reduced to a few simple calls.
// =============================================================================================

// Show the Flash Audio permission box
FlashAudio.prototype.showPermissionBox = function() {
    this.$flash.showPermissionBox();
};

// Returns true if the FLash movie has microphone access
FlashAudio.prototype.permission = function() {
    return this.$flash.getHasPermission();
};

// Creates a new Player and will optionally begin playing
FlashAudio.prototype.play = function(transport, autoPlay) {
    url = transport.uri.replace("protocol",this.config.protocol);
    var luri = url;
    var uri = Phono.util.parseUri(url);
    var location = Phono.util.parseUri(document.location);
    
    if (uri.protocol == "rtp") return null;
    if (url.indexOf("//") == 0) {
        luri = location.protocol+":"+url;
    } else if (uri.protocol.length < 2) {
        // We are relative, so use the document.location
        luri = location.protocol+"://"+location.authority+location.directoryPath+url;
    }
    
    var player;
    if (this.config.direct == true && transport.peerID != undefined && this.config.cirrus != undefined) {
        Phono.log.info("Direct media play with peer " + transport.peerID);
        player = this.$flash.play(luri, autoPlay, transport.peerID, this.config.video);
    }
    else player = this.$flash.play(luri, autoPlay);
    return {
        url: function() {
            return player.getUrl();
        },
        start: function() {
            player.start();
        },
        stop: function() {
            player.stop();
            // This is final, you can't restart if it was rtmp or rtmfp
            player.release();
        },
        volume: function(value) {
   	    if(arguments.length === 0) {
   		return player.getVolume();
   	    }
   	    else {
   		player.setVolume(value);
   	    }
        }
    }
};

// Creates a new audio Share and will optionally begin playing
FlashAudio.prototype.share = function(transport, autoPlay, codec) {
    var url = transport.uri.replace("protocol",this.config.protocol);
    var direct = false;
    var peerID = "";
    if (this.config.direct == true && transport.peerID != undefined && this.config.cirrus != undefined) { 
        peerID = transport.peerID;
        Phono.log.info("Direct media share with peer " + transport.peerID);
    }
    var isSecure = false;
    var share = this.$flash.share(url, autoPlay, codec.id, codec.name, codec.rate, true, peerID, this.config.video);
    if (url.indexOf("rtmfp://") == 0) isSecure = true;

    var s = {
        // Readonly
        url: function() {
            return share.getUrl();
        },
        codec: function() {
            var codec = share.getCodec();
            return {
                id: codec.getId(),
                name: codec.getName(),
                rate: codec.getRate()
            }
        },
        // Control
        start: function() {
            share.start();
        },
        stop: function() {
            share.stop();
            // This is final, you can't restart
            share.release();
        },
        digit: function(value, duration, audible) {
            share.digit(value, duration, audible);
        },
        // Properties
        gain: function(value) {
   	    if(arguments.length === 0) {
   		return share.getGain();
   	    }
   	    else {
   		share.setGain(value);
   	    }
        },
        mute: function(value) {
   	    if(arguments.length === 0) {
   		return share.getMute();
   	    }
   	    else {
   		share.setMute(value);
   	    }
        },
        suppress: function(value) {
   	    if(arguments.length === 0) {
   		return share.getSuppress();
   	    }
   	    else {
   		share.setSuppress(value);
   	    }
        },
        energy: function() {
            return {
               mic: 0.0 ,
               spk: 0.0
            }
        },
        secure: function() {
            return isSecure;
        }
    };

    share.addEventListener(null, function(event) {
        var eventName = (event.getType()+"");
        Phono.events.trigger(s, eventName, {
            reason: event.getReason()
        });
    });

    return s;
};   

// Returns an object containg JINGLE transport information
FlashAudio.prototype.transport = function() {
    var $flash = this.$flash;
    var config = this.config;
    var cirrus = this.config.cirrus;
    var plugin = this;
    var name = this.$flash.getTransport();
    var description = this.$flash.getDescription();

    return {
        name: name,
        description: description,
        buildTransport: function(direction, j, callback) {
            var nearID = "";
            if (config.direct) {
                // XXX HOW LONG WILL WAIT BEFORE ABORTING?
                var onConnected = function() {
                    if (nearID == "") {
                        // First call
                        nearID = $flash.nearID(cirrus);
                        Phono.log.info("Got nearID = " + nearID);
                        if (nearID != "") {
                            j.c('transport',{xmlns:name, peerID:nearID});
                        } else {
                            j.c('transport',{xmlns:name});
                        }
                        callback();
                    }
                }
                
                // Connect to cirrus, and once we get the good event, grab the nearID and continue
                var connected = $flash.doCirrusConnect(cirrus);
                Phono.log.info("doCirrusConnect");
                if (connected) {
                    // Will not get an additional callabck
                    Phono.log.info("doCirrusConnect - already connected");
                    onConnected();
                } else {
                    Phono.events.add(plugin, "flashConnected", onConnected);
                }
            } else {
                j.c('transport',{xmlns:this.name});
                callback();
            }
        },
        processTransport: function(t) {
            var pID = t.attr('peerid');
            var transport;
            // If we have a Peer ID, and no other transport, fake one
            if (pID != undefined)
                transport = {input: {uri: "rtmfp://invalid/invalid",
                                     peerID: pID},   
                             output: {uri: "rtmfp://invalid/invalid",
                                      peerID: pID}
                            };
            t.find('candidate').each(function () {
                transport = { input: {uri: $(this).attr('rtmpUri') + "/" + $(this).attr('playName'),
                                      peerID: pID},   
                              output: {uri: $(this).attr('rtmpUri') + "/" + $(this).attr('publishName'),
                                       peerID: pID}
                            };
            });
            return transport;
        },
        destroyTransport: function() {
            // Disconnect from cirrus server, reference counting is done in phono-as-audio
            if (config.direct) {
                Phono.log.info("Disconnecting from cirrus server");
                $flash.doCirrusDisconnect(cirrus);
            }
        }
    }
};

// Returns an array of codecs supported by this plugin
FlashAudio.prototype.codecs = function() {
    var result = new Array();
    var codecs = this.$flash.getCodecs();
    Phono.util.each(codecs, function() {
        result.push({
            id: this.getId(),
            name: this.getName(),
            rate: this.getRate()
        });
    });
    return result;
};

// Creates a DIV to hold the Flash movie if one was not specified by the user
FlashAudio.prototype.createContainer = function(phono) {
    
    var flashDiv = $("<div>")
      	.attr("id","_phono-audio-flash" + (FlashAudio.count++))
      	.addClass("phono_FlashHolder")
      	.appendTo("body");
    
    flashDiv.css({
   	"width":"1px",
   	"height":"1px",
   	"position":"absolute",
   	"top":"50%",
   	"left":"50%",
   	"margin-top":"-69px",
   	"margin-left":"-107px",
   	"z-index":"10001",
   	"visibility":"visible"
    });
    
    var containerId = $(flashDiv).attr("id");
    
    Phono.events.bind(this, {
      	onPermissionBoxShow: function() {
	    $("#"+containerId).css({
		"width":"240px",
   		"height":"160px"
	    });
      	},
      	onPermissionBoxHide: function() {
	    $("#"+containerId).css({
		"width":"1px",
   		"height":"1px"
	    });
      	}
    });
    
    return containerId;
    
};      


function JavaAudio(phono, config, callback) {
    this.type = "java";

    if (JavaAudio.exists()){
      // Define defualt config and merge from constructor
      this.config = Phono.util.extend({
          jar: "//s.phono.com/releases/" + Phono.version + "/plugins/audio/phono.audio.jar"
      }  , config);
    
      // Bind Event Listeners
      Phono.events.bind(this, config);
    
      var containerId = this.config.containerId;
    
      // Create applet continer is user did not specify one
      if(!containerId) {
          this.config.containerId = containerId = _createContainer();
      }
    
      var plugin = this;
    
      // Install the applet
      plugin.$applet = _loadApplet(containerId, this.config.jar, callback, plugin);
      window.setInterval(function(){
        var str = "Loading...";
        try { 
         var json = plugin.$applet[0].getJSONStatus();
         if (json){
	   var statusO = eval('(' +json+ ')');
           if (!statusO.userTrust){
             Phono.events.trigger(phono, "error", {
                reason: "Java Applet not trusted by user - cannot continue"
             });
           } else {
             eps = statusO.endpoints;
             if (eps.length >0){
                if ((eps[0].sent > 50) && (eps[0].rcvd == 0)){
                  Phono.events.trigger(phono, "error", {
                    reason: "Java Applet detected firewall."
                  });
                }
                str = "share: "+eps[0].uri ;
                str +=" sent " +eps[0].sent ;
                str +=" rcvd " +eps[0].rcvd ;
                str +=" error " +eps[0].error ;
                Phono.log.debug("[JAVA RTP] "+str);
             }
           } 
         } else {
          Phono.events.trigger(phono, "error", {
            reason: "Java applet did not load."
          });
          Phono.log.debug("[JAVA Load errror] no status returned.");
         }
        } catch (e) {
          Phono.events.trigger(phono, "error", {
            reason: "Can not communicate with Java Applet - perhaps it did not load."
          });
          Phono.log.debug("[JAVA Load error] "+e);
        }
      },25000); 
    } else {
         Phono.events.trigger(phono, "error", {
            reason: "Java not available in this browser."
         });
    }
};

JavaAudio.exists = function() {
    return (navigator.javaEnabled());
}

JavaAudio.count = 0;

// JavahAudio Functions
//
// Most of these will simply pass through to the underlying Java layer.
// =============================================================================================

// Creates a new Player and will optionally begin playing
JavaAudio.prototype.play = function(transport, autoPlay) {
    var url = transport.uri;
    var applet = this.$applet[0];
    var player;
    var luri = url;
    var uri = Phono.util.parseUri(url);
    var location = Phono.util.parseUri(document.location);

    if (uri.protocol == "rtp") return null;
    if (url.indexOf("//") == 0) {
        luri = location.protocol+":"+url;
    } else if (uri.protocol.length < 2) {
        // We are relative, so use the document.location
        luri = location.protocol+"://"+location.authority+location.directoryPath+url;
    }

    if (autoPlay === undefined) autoPlay = false;
    player = applet.play(luri, autoPlay);
    return {
        url: function() {
            return player.getUrl();
        },
        start: function() {
            player.start();
        },
        stop: function() {
            player.stop();
        },
        volume: function() { 
            if(arguments.length === 0) {
   		return player.volume();
   	    }
   	    else {
   		player.volume(value);
   	    }
        }
    }
};

// Creates a new audio Share and will optionally begin playing
JavaAudio.prototype.share = function(transport, autoPlay, codec, srtpPropsl, srtpPropsr) {
    var url = transport.uri;
    var applet = this.$applet[0];

    Phono.log.debug("[JAVA share codec ] "+codec.p.pt +" id = "+codec.id);
    var acodec = applet.mkCodec(codec.p, codec.id);
    var share;
    var isSecure = false;
    if (srtpPropsl != undefined && srtpPropsr != undefined) {
        share = applet.share(url, acodec, autoPlay, srtpPropsl, srtpPropsr);
        isSecure = true;
    }
    else { 
        share = applet.share(url, acodec, autoPlay);
    }
    return {
        // Readonly
        url: function() {
            return share.getUrl();
        },
        codec: function() {
            var codec = share.getCodec();
            return {
                id: codec.getId(),
                name: codec.getName(),
                rate: codec.getRate()
            }
        },
        // Control
        start: function() {
            share.start();
        },
        stop: function() {
            share.stop();
        },
        digit: function(value, duration, audible) {
            share.digit(value, duration, audible);
        },
        // Properties
        gain: function(value) {
   	    if(arguments.length === 0) {
   		return share.gain();
   	    }
   	    else {
   		share.gain(value);
   	    }
        },
        mute: function(value) {
   	    if(arguments.length === 0) {
   		return share.mute();
   	    }
   	    else {
   		share.mute(value);
   	    }
        },
        suppress: function(value) {
   	    if(arguments.length === 0) {
   		return share.doES();
   	    }
   	    else {
   		share.doES(value);
   	    }
        },
        energy: function() {
            var en = share.energy();
            return {
               mic: Math.floor(Math.max((Math.LOG2E * Math.log(en[0])-4.0),0.0)),
               spk: Math.floor(Math.max((Math.LOG2E * Math.log(en[1])-4.0),0.0))
            }
        },
        secure: function() {
            return isSecure;
        }
    }
};   

// We always have java audio permission
JavaAudio.prototype.permission = function() {
    return true;
};

// Returns an object containg JINGLE transport information
JavaAudio.prototype.transport = function() {
    var applet = this.$applet[0];
    var endpoint = applet.allocateEndpoint();
    
    return {
        name: "urn:xmpp:jingle:transports:raw-udp:1",
        description: "urn:xmpp:jingle:apps:rtp:1",
        supportsSRTP: true,
        buildTransport: function(direction, j, callback) {
            var uri = Phono.util.parseUri(endpoint);
            j.c('transport',{xmlns:"urn:xmpp:jingle:transports:raw-udp:1"})
                .c('candidate',{ip:uri.domain, port:uri.port, generation:"1"});
            callback();
        },
        processTransport: function(t) {
            var fullUri;
            t.find('candidate').each(function () {
                fullUri = endpoint + ":" + $(this).attr('ip') + ":" + $(this).attr('port');
            });
            return {input:{uri:fullUri}, output:{uri:fullUri}};
        }
    }
};

String.prototype.startsWith = function(str) {
    return (this.match("^"+str)==str)
};

// Returns an array of codecs supported by this plugin
JavaAudio.prototype.codecs = function() {
    var result = new Array();
    var applet = this.$applet[0];
    var codecs = applet.codecs();
    
    for (l=0; l<codecs.length; l++) {
        var name;
        if (codecs[l].name.startsWith("SPEEX")) {name = "SPEEX";}
        else name = codecs[l].name;
        result.push({
            id: codecs[l].pt,
            name: name,
            rate: codecs[l].rate,
            p: codecs[l]
        });
    }
    
    return result;
};

JavaAudio.prototype.audioIn = function(str) {
     var applet = this.$applet[0];
    applet.setAudioIn(str);
}

JavaAudio.prototype.audioInDevices = function(){
    var result = new Array();

    //var applet = this.$applet;
    //var jsonstr = applet.getAudioDeviceList();
    
    //console.log("seeing this.audioDeviceList as "+this.audioDeviceList);
    var devs = eval ('(' +this.audioDeviceList+ ')');
    var mixers = devs.mixers;
    result.push("Let my system choose");
    for (l=0; l<mixers.length; l++) {
        if (mixers[l].targets.length > 0){
            result.push(mixers[l].name );
        }
    }

    return result;
}


// Creates a DIV to hold the capture applet if one was not specified by the user
_createContainer = function() {
    
    var appletDiv = $("<div>")
        .attr("id","_phono-appletHolder" + (JavaAudio.count++))
        .addClass("phono_AppletHolder")
        .appendTo("body");
    
    appletDiv.css({
        "width":"1px",
        "height":"1px",
        "position":"absolute",
        "top":"50%",
        "left":"50%",
   	"margin-top":"-69px",
   	"margin-left":"-107px",
        "z-index":"10001",
        "visibility":"visible"
    });
    
    var containerId = $(appletDiv).attr("id");
    return containerId;
}

_loadApplet = function(containerId, jar, callback, plugin) {
    var id = "_phonoAudio" + (JavaAudio.count++);
    
    var callbackName = id+"Callback";
    
    window[callbackName] = function(devJson) {
            //console.log("Java audio device list json is "+devJson);
            plugin.audioDeviceList = devJson;
            t = window.setTimeout( function () {callback(plugin);},10);
            };
    var applet = $("<applet>")
        .attr("id", id)
        .attr("name",id)
        .attr("code","com.phono.applet.rtp.RTPApplet")
        .attr("archive",jar)
        .attr("width","1px")
        .attr("height","1px")
        .attr("mayscript","true")
        .append($("<param>")
                .attr("name","doEC")
                .attr("value","true")
               )
        .append($("<param>")
                .attr("name","callback")
                .attr("value",callbackName)
               )
        .appendTo("#" + containerId)
    // Firefox 7.0.1 seems to treat the applet object as a function
    // which causes mayhem later on - so we return an array containing it
    // which seems to sheild us from issue.
    return applet; 
};

function PhonegapIOSAudio(phono, config, callback) {
    this.type = "phonegap-ios";
    
    // Bind Event Listeners
    Phono.events.bind(this, config);
    
    var plugin = this;

    this.initState(callback, plugin);
};

PhonegapIOSAudio.exists = function() {
    return ((typeof PhoneGap != "undefined") && Phono.util.isIOS());
}

PhonegapIOSAudio.codecs = new Array();
PhonegapIOSAudio.endpoint = "rtp://0.0.0.0";

PhonegapIOSAudio.prototype.allocateEndpoint = function () {
    PhonegapIOSAudio.endpoint = "rtp://0.0.0.0";
    PhoneGap.exec( 
                  function(result) {console.log("endpoint success: " + result);
                                                    PhonegapIOSAudio.endpoint = result;}, 
                  function(result) {console.log("endpoint fail:" + result);},
                  "Phono","allocateEndpoint",[]);
}

PhonegapIOSAudio.prototype.initState = function(callback, plugin) {

    this.allocateEndpoint();
    PhoneGap.exec( 
                  function(result) {
                      console.log("codec success: " + result);
                      var codecs = $.parseJSON(result);
                      for (l=0; l<codecs.length; l++) {
                          var name;
                          if (codecs[l].name.startsWith("SPEEX")) {name = "SPEEX";}
                          else name = codecs[l].name;
                          PhonegapIOSAudio.codecs.push({
                              id: codecs[l].ptype,
                              name: name,
                              rate: codecs[l].rate,
                              p: codecs[l]
                          });
                      };
                      
                      // We are done with initialisation
                      callback(plugin);
                  }, 
                  function(result) {console.log("codec fail:" + result);},
                  "Phono","codecs",[]
                 );
};

// PhonegapIOSAudio Functions
//
// Most of these will simply pass through to the underlying Phonegap layer.
// =============================================================================================

// Creates a new Player and will optionally begin playing
PhonegapIOSAudio.prototype.play = function(transport, autoPlay) {
    var url = transport.uri;
    var luri = url;
    var uri = Phono.util.parseUri(url);
    var location = Phono.util.parseUri(document.location);

    if (uri.protocol == "rtp") return null;
    if (url.indexOf("//") == 0) {
        luri = location.protocol+":"+url;
    } else if (uri.protocol.length < 2) {
        // We are relative, so use the document.location
        luri = location.protocol+"://"+location.directoryPath.substring(0,location.directoryPath.length)+url;
        luri = encodeURI(luri);
    }

    // Get PhoneGap to create the play
    console.log("play("+luri+","+autoPlay+")");
    PhoneGap.exec( 
                  function(result) {console.log("play success: " + result);},
                  function(result) {console.log("play fail:" + result);},
                  "Phono","play",
                  [{
                      'uri':luri,
                      'autoplay': autoPlay == true ? "YES":"NO"
                  }] );


    return {
        url: function() {
            return luri;
        },
        start: function() {
            console.log("play.start " + luri);
            PhoneGap.exec( 
                          function(result) {console.log("start success: " + result);},
                          function(result) {console.log("start fail:" + result);},
                          "Phono","start",
                          [{
                              'uri':luri
                          }]);
        },
        stop: function() {
            PhoneGap.exec(
                          function(result) {console.log("stop success: " + result);},
                          function(result) {console.log("stop fail:" + result);},
                          "Phono","stop", 
                          [{
                              'uri':luri
                          }]);
        },
        volume: function() { 
            if(arguments.length === 0) {
                
   	    }
   	    else {
   	    }
        }
    }
};

// Creates a new audio Share and will optionally begin playing

PhonegapIOSAudio.prototype.share = function(transport, autoPlay, codec, srtpPropsl, srtpPropsr) {
    var url = transport.uri;
    var codecD = ""+codec.name+":"+codec.rate+":"+codec.id;
    // Get PhoneGap to create the share
    var pgprops;  
    var isSecure = false;
    if (srtpPropsl != undefined && srtpPropsr != undefined) {
       pgprops = [{
                      'uri':url,
                      'autoplay': autoPlay == true ? "YES":"NO",
                      'codec':codecD,
                      'srtpPropsl':srtpPropsl,
		      'srtpPropsr':srtpPropsr
                  }];
       isSecure = true;
    } else {
       pgprops = [{
                      'uri':url,
                      'autoplay': autoPlay == true ? "YES":"NO",
                      'codec':codecD
                  }];
    }
    PhoneGap.exec( 
                  function(result) {console.log("share success: " + result);},
                  function(result) {console.log("share fail:" + result);},
                  "Phono","share",pgprops);

    var luri = Phono.util.localUri(url);
    var muteStatus = false;
    var gainValue = 50;
    var micEnergy = 0.0;
    var spkEnergy = 0.0;

    // Return a shell of an object
    return {
        // Readonly
        url: function() {
            return url;
        },
        codec: function() {
            var codec;
            return {
                id: codec.getId(),
                name: codec.getName(),
                rate: codec.getRate()
            }
        },
        // Control
        start: function() {
            console.log("share.start " + luri);
            PhoneGap.exec( 
                          function(result) {console.log("start success: " + result);},
                          function(result) {console.log("start fail:" + result);},
                          "Phono","start",
                          [{
                              'uri':luri
                          }]);
        },
        stop: function() {
            PhoneGap.exec(
                          function(result) {console.log("stop success: " + result);},
                          function(result) {console.log("stop fail:" + result);},
                          "Phono","stop", 
                          [{
                              'uri':luri
                          }]);
        },
        digit: function(value, duration, audible) {
            PhoneGap.exec(
                          function(result) {console.log("digit success: " + result);},
                          function(result) {console.log("digit fail:" + result);},
                          "Phono","digit", 
                          [{
                              'uri':luri,
                              'digit':value,
                              'duration':duration,
                              'audible':audible == true ? "YES":"NO"
                          }]
                         );
        },
        // Properties
        gain: function(value) {
   	    if(arguments.length === 0) {
                return gainValue;
   	    }
   	    else {
                PhoneGap.exec( 
                              function(result) {
                                  console.log("gain success: " + result + " " + value);
                                  gainValue = value;
                              },
                              function(result) {console.log("gain fail:" + result);},
                              "Phono","gain",
                              [{
                                  'uri':luri,
                                  'value':value
                              }]
                             );
   	    }
        },
        mute: function(value) {
   	    if(arguments.length === 0) {
                return muteStatus;
   	    }
   	    else {
                PhoneGap.exec( 
                              function(result) {
                                  console.log("mute success: " + result + " " + value);
                                  muteStatus = value;
                              },
                              function(result) {console.log("mute fail:" + result);},
                              "Phono","mute",
                              [{
                                  'uri':luri,
                                  'value':value == true ? "YES":"NO"
                              }]
                             );
   	    }
        },
        suppress: function(value) {
   	    if(arguments.length === 0) {
   	    }
   	    else {
   	    }
        },
        energy: function(){
            PhoneGap.exec(
                        function(result) {
                            console.log("energy success: " + result);
                            var en = $.parseJSON(result);
                            micEnergy = Math.floor(Math.max((Math.LOG2E * Math.log(en[0])-4.0),0.0));
                            spkEnergy = Math.floor(Math.max((Math.LOG2E * Math.log(en[1])-4.0),0.0));
                            },
                        function(result) {console.log("energy fail:" + result);},
                        "Phono","energy",
                        [{'uri':luri}]
            );
            return {
               mic: micEnergy,
               spk: spkEnergy
            }
        },
        secure: function() {
            return isSecure;
        }
   };
    
};   

// We always have phonegap audio permission
PhonegapIOSAudio.prototype.permission = function() {
    return true;
};

// Returns an object containg JINGLE transport information
PhonegapIOSAudio.prototype.transport = function() {
    
    var endpoint = PhonegapIOSAudio.endpoint;
    // We've used this one, get another ready
    this.allocateEndpoint();

    return {
        name: "urn:xmpp:jingle:transports:raw-udp:1",
        description: "urn:xmpp:jingle:apps:rtp:1",
        supportsSRTP: true,
        buildTransport: function(direction, j, callback) {
            console.log("buildTransport: " + endpoint);
            var uri = Phono.util.parseUri(endpoint);
            j.c('transport',{xmlns:"urn:xmpp:jingle:transports:raw-udp:1"})
                .c('candidate',{ip:uri.domain, port:uri.port, generation:"1"});
            callback();
        },
        processTransport: function(t) {
            var fullUri;
            t.find('candidate').each(function () {
                fullUri = endpoint + ":" + $(this).attr('ip') + ":" + $(this).attr('port');
            });
            return {input:{uri:fullUri}, output:{uri:fullUri}};
        }
    }
};

String.prototype.startsWith = function(str) {
    return (this.match("^"+str)==str)
};

// Returns an array of codecs supported by this plugin
PhonegapIOSAudio.prototype.codecs = function() {
    return PhonegapIOSAudio.codecs;
};




function PhonegapAndroidAudio(phono, config, callback) {
    this.type = "phonegap-android";
    
    // Bind Event Listeners
    Phono.events.bind(this, config);

    var plugin = this;

    // Register our Java plugin with Phonegap so that we can call it later
    PhoneGap.exec(null, null, "App", "addService", ['PhonogapAudio', 'com.phono.android.phonegap.Phono']);
    
    // FIXME: Should not have to do this twice!
    this.allocateEndpoint();
    this.initState(callback, plugin);
};

PhonegapAndroidAudio.exists = function() {
    return ((typeof PhoneGap != "undefined") && Phono.util.isAndroid());
}

PhonegapAndroidAudio.codecs = new Array();
PhonegapAndroidAudio.endpoint = "rtp://0.0.0.0";

PhonegapAndroidAudio.prototype.allocateEndpoint = function () {
    
    PhonegapAndroidAudio.endpoint = "rtp://0.0.0.0";

    PhoneGap.exec(function(result) {console.log("endpoint: success");
                                    PhonegapAndroidAudio.endpoint = result.uri;
                                   },
                  function(result) {console.log("endpoint: fail");},
                  "PhonogapAudio",  
                  "allocateEndpoint",              
                  [{}]);      
}

PhonegapAndroidAudio.prototype.initState = function(callback, plugin) {

    this.allocateEndpoint();

    var codecSuccess = function(result) {
        console.log("codec: success");
        var codecs = result.codecs;
        for (l=0; l<codecs.length; l++) {
            var name;
            if (codecs[l].name.startsWith("SPEEX")) {name = "SPEEX";}
            else name = codecs[l].name;
            PhonegapAndroidAudio.codecs.push({
                id: codecs[l].ptype,
                name: name,
                rate: codecs[l].rate,
                p: codecs[l]
            });
        }
        // We are done with initialisation
        callback(plugin);
    }
    
    var codecFail = function(result) {
        console.log("codec:fail");
    }
    
    // Get the codec list
    PhoneGap.exec(codecSuccess,
                  codecFail,
                  "PhonogapAudio",
                  "codecs",
                  [{}]);
};

// PhonegapAndroidAudio Functions
//
// Most of these will simply pass through to the underlying Phonegap layer.
// =============================================================================================

// Creates a new Player and will optionally begin playing
PhonegapAndroidAudio.prototype.play = function(transport, autoPlay) {
    var url = transport.uri;
    var luri = url;
    var uri = Phono.util.parseUri(url);
    var location = Phono.util.parseUri(document.location);

    if (uri.protocol == "rtp") return null;
    if (url.indexOf("//") == 0) {
        luri = location.protocol+":"+url;
    } else if (uri.protocol.length < 2) {
        // We are relative, so use the document.location
        luri = location.protocol+"://"+location.directoryPath.substring(0,location.directoryPath.length)+url;
        luri = encodeURI(luri);
    }

    // Get PhoneGap to create the play
    PhoneGap.exec(function(result) {console.log("play: success");},
                  function(result) {console.log("play: fail");},
                  "PhonogapAudio",  
                  "play",              
                  [{
                      'uri':luri,
                      'autoplay': autoPlay == true ? "YES":"NO"
                  }]);      

    return {
        url: function() {
            return luri;
        },
        start: function() {
            console.log("play.start " + luri);
            PhoneGap.exec(function(result) {console.log("start: success");},
                  function(result) {console.log("start: fail");},
                  "PhonogapAudio",  
                  "start",              
                  [{
                      'uri':luri
                  }]);   
        },
        stop: function() {
            console.log("play.stop " + luri);
            PhoneGap.exec(function(result) {console.log("stop: success");},
                  function(result) {console.log("stop: fail");},
                  "PhonogapAudio",  
                  "stop",              
                  [{
                      'uri':luri
                  }]);   

        },
        volume: function() { 
            if(arguments.length === 0) {
                
   	    }
   	    else {
   	    }
        }
    }
};

// Creates a new audio Share and will optionally begin playing
PhonegapAndroidAudio.prototype.share = function(transport, autoPlay, codec, srtpPropsl, srtpPropsr) {
    var url = transport.uri;
    var codecD = ""+codec.name+":"+codec.rate+":"+codec.id;
    var pgprops;
    var isSecure = false;

    if (srtpPropsl != undefined && srtpPropsr != undefined) {
       pgprops = [{
                      'uri':url,
                      'autoplay': autoPlay == true ? "YES":"NO",
                      'codec':codecD,
                      'lsrtp':srtpPropsl,
                      'rsrtp':srtpPropsr
                  }];
       isSecure = true;
    } else {
       pgprops = [{
                      'uri':url,
                      'autoplay': autoPlay == true ? "YES":"NO",
                      'codec':codecD
                  }];
    }
    // Get PhoneGap to create the share
    PhoneGap.exec(function(result) {console.log("share: success");},
                  function(result) {console.log("share: fail");},
                  "PhonogapAudio",  
                  "share",              
                  pgprops
                  );   

    var luri = Phono.util.localUri(url);
    var muteStatus = false;
    var gainValue = 50;
    var micEnergy = 0.0;
    var spkEnergy = 0.0;


    // Return a shell of an object
    return {
        // Readonly
        url: function() {
            return url;
        },
        codec: function() {
            var codec;
            return {
                id: codec.getId(),
                name: codec.getName(),
                rate: codec.getRate()
            }
        },
        // Control
        start: function() {
            console.log("share.start " + luri);
            PhoneGap.exec(function(result) {console.log("start: success");},
                          function(result) {console.log("start: fail");},
                          "PhonogapAudio",  
                          "start",              
                          [{
                              'uri':luri
                          }]);   
        },
        stop: function() {
            console.log("share.stop " + luri);
            PhoneGap.exec(function(result) {console.log("stop: success");},
                          function(result) {console.log("stop: fail");},
                          "PhonogapAudio",  
                          "stop",              
                          [{
                              'uri':luri
                          }]);   
        },
        digit: function(value, duration, audible) {
            console.log("share.digit " + luri);
            PhoneGap.exec(function(result) {console.log("digit: success");},
                          function(result) {console.log("digit: fail");},
                          "PhonogapAudio",  
                          "digit",              
                          [{
                              'uri':luri,
                              'digit':value,
                              'duration':duration,
                              'audible':audible == true ? "YES":"NO"
                          }]);   
        },
        // Properties
        gain: function(value) {
   	    if(arguments.length === 0) {
                return gainValue;
   	    }
   	    else {
                console.log("share.gain " + luri);
                PhoneGap.exec(function(result) {console.log("gain: success");},
                              function(result) {console.log("gain: fail");},
                              "PhonogapAudio",  
                              "gain",              
                              [{
                                  'uri':luri,
                                  'value':value
                              }]);   
   	    }
        },
        mute: function(value) {
   	    if(arguments.length === 0) {
                return muteStatus;
   	    }
   	    else {
                console.log("share.mute " + luri);
                PhoneGap.exec(function(result) {console.log("mute: success");},
                              function(result) {console.log("mute: fail");},
                              "PhonogapAudio",  
                              "mute",              
                              [{
                                  'uri':luri,
                                  'value':value == true ? "YES":"NO"
                              }]);   
   	    }
        },
        suppress: function(value) {
   	    if(arguments.length === 0) {
   	    }
   	    else {
   	    }
        },
        energy: function(){
            PhoneGap.exec(
                        function(result) {
                            console.log("energy success: " + result);
                            var en = $.parseJSON(result);
                            if(en != null) {
                              micEnergy = Math.floor(Math.max((Math.LOG2E * Math.log(en.mic)-4.0),0.0));
                              spkEnergy = Math.floor(Math.max((Math.LOG2E * Math.log(en.spk)-4.0),0.0)); 
			    }
                          },
                        function(result) {console.log("energy fail:" + result);},
                        "PhonogapAudio","energy",
                        [{'uri':luri}]
            );
            return {
               mic: micEnergy,
               spk: spkEnergy
            }
        },
        secure: function() {
            return isSecure;
        }
    };
};   

// We always have phonegap audio permission
PhonegapAndroidAudio.prototype.permission = function() {
    return true;
};

// Returns an object containg JINGLE transport information
PhonegapAndroidAudio.prototype.transport = function() {
    
    var endpoint = PhonegapAndroidAudio.endpoint;
    // We've used this one, get another ready
    this.allocateEndpoint();

    return {
        name: "urn:xmpp:jingle:transports:raw-udp:1",
        description: "urn:xmpp:jingle:apps:rtp:1",
        supportsSRTP: (device.version.charAt(0) >= '4' ),
        buildTransport: function(direction, j, callback) {
            console.log("buildTransport: " + endpoint);
            var uri = Phono.util.parseUri(endpoint);
            j.c('transport',{xmlns:"urn:xmpp:jingle:transports:raw-udp:1"})
                .c('candidate',{ip:uri.domain, port:uri.port, generation:"1"});
            callback();
        },
        processTransport: function(t) {
            var fullUri;
            t.find('candidate').each(function () {
                fullUri = endpoint + ":" + $(this).attr('ip') + ":" + $(this).attr('port');
            });
            return {input:{uri:fullUri}, output:{uri:fullUri}};
        }
    }
};

String.prototype.startsWith = function(str) {
    return (this.match("^"+str)==str)
};

// Returns an array of codecs supported by this plugin
PhonegapAndroidAudio.prototype.codecs = function() {
    return PhonegapAndroidAudio.codecs;
};


function WebRTCAudio(phono, config, callback) {

    console.log("Initialize WebRTC");

    if (typeof webkitDeprecatedPeerConnection == "function") {
        WebRTCAudio.peerConnection = webkitDeprecatedPeerConnection;
    } else {
        WebRTCAudio.peerConnection = webkitPeerConnection;
    }

    this.config = Phono.util.extend({
        media: {audio:true,video:true}
    }, config);
    
    var plugin = this;
    
    var localContainerId = this.config.localContainerId;

    // Create audio continer if user did not specify one
    if(!localContainerId) {
	this.config.localContainerId = this.createContainer();
    }

    WebRTCAudio.localVideo = document.getElementById(this.config.localContainerId);

    try { 
        console.log("Request access to local media, use new syntax");
        navigator.webkitGetUserMedia(this.config.media, 
                                     function(stream) {
                                         WebRTCAudio.localStream = stream;
                                         console.log("We have a stream");
                                         var url = webkitURL.createObjectURL(stream);
                                         WebRTCAudio.localVideo.style.opacity = 1;
                                         WebRTCAudio.localVideo.src = url;
                                         callback(plugin);
                                     },
                                     function(error) {
                                         console.log("Failed to get access to local media. Error code was " + error.code);
                                         alert("Failed to get access to local media. Error code was " + error.code + ".");   
                                     });
    } catch (e) {
        console.log("getUserMedia error, try old syntax");
        navigator.webkitGetUserMedia("video,audio", 
                                     function(stream) {
                                         WebRTCAudio.localStream = stream;
                                         console.log("We have a stream");
                                         var url = webkitURL.createObjectURL(stream);
                                         WebRTCAudio.localVideo.style.opacity = 1;
                                         WebRTCAudio.localVideo.src = url;
                                         callback(plugin);
                                     },
                                     function(error) {
                                         console.log("Failed to get access to local media. Error code was " + error.code);
                                         alert("Failed to get access to local media. Error code was " + error.code + ".");   
                                     });    
    }
}

WebRTCAudio.exists = function() {
    return (typeof webkitDeprecatedPeerConnection == "function")|| (typeof webkitPeerConnection == "function");
}

WebRTCAudio.stun = "STUN stun.l.google.com:19302";
WebRTCAudio.count = 0;

// WebRTCAudio Functions
//
// =============================================================================================

// Creates a new Player and will optionally begin playing
WebRTCAudio.prototype.play = function(transport, autoPlay) {
    var url = transport.uri;
    var luri = url;
    var audioPlayer = null;
    
    return {
        url: function() {
            return luri;
        },
        start: function() {
            if (audioPlayer != null) {
                $(audioPlayer).remove();
            }
            audioPlayer = $("<audio>")
      	        .attr("id","_phono-audioplayer-webrtc" + (WebRTCAudio.count++))
                .attr("autoplay","autoplay")
                .attr("src",url)
                .attr("loop","loop")
      	        .appendTo("body");
        },
        stop: function() {
            $(audioPlayer).remove();
            audioPlayer = null;
        },
        volume: function() { 
        }
    }
};

// Creates a new audio Share and will optionally begin playing
WebRTCAudio.prototype.share = function(transport, autoPlay, codec) {
    var url = transport.uri;
    var share;
    var localStream;  

    return {
        // Readonly
        url: function() {
            return null;
        },
        codec: function() {
            return null;
        },
        // Control
        start: function() {
            // Start - we already have done...
        },
        stop: function() {
            // Stop
            console.log("Closing PeerConnection");
            if (transport.getPC() != null) {
                transport.getPC().close();
                console.log("closed");
            } 
//            WebRTCAudio.remoteVideo.style.opacity = 0;
        },
        digit: function(value, duration, audible) {
            // No idea how to do this yet
        },
        // Properties
        gain: function(value) {
            return null;
        },
        mute: function(value) {
            return null;
        },
        suppress: function(value) {
            return null;
        },
        energy: function(){        
            return {
               mic: 0.0,
               spk: 0.0
            }
        },
        secure: function() {
            return true;
        }
    }
};   

// Do we have WebRTC permission? 
WebRTCAudio.prototype.permission = function() {
    return true;
};

// Returns an object containg JINGLE transport information
WebRTCAudio.prototype.transport = function(config) {
    var pc, offer, answer, ok, remoteContainerId;

    if(!config || !config.remoteContainerId) {
        if (this.config.remoteContainerId) {
            remoteContainerId = this.config.remoteContainerId;
        } else {
	    remoteContainerId = this.createContainer();
        }
    } else {
        remoteContainerId = config.remoteContainerId;
    }

    var remoteVideo = document.getElementById(remoteContainerId);    
    
    return {
        name: "http://phono.com/webrtc/transport",
        description: "http://phono.com/webrtc/description",
        buildTransport: function(direction, j, callback, u, updateCallback) {
            if (direction == "answer") {
                // We are the result of an inbound call, so provide answer
                if (pc != null) {
                    pc.close();
                    pc = null;
                }
                pc = new WebRTCAudio.peerConnection(WebRTCAudio.stun,
                                                          function(message) {
                                                              console.log("C->S SDP: " + message);
                                                              var roap = $.parseJSON(message.substring(4,message.length));
                                                              if (roap['messageType'] == "ANSWER") {
                                                                  console.log("Received ANSWER from PeerConnection: " + message);
                                                                  // Canary is giving a null s= line, so 
                                                                  // we replace it with something useful
                                                                  message = message.replace("s=", "s=Canary");
                                                                  answer = message;
                                                                  j.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                      .c('roap',Base64.encode(answer));
                                                                  ok = "SDP\n{\n\"answererSessionId\":\"" +
                                                                      roap['offererSessionId'] + "\",\n" +
                                                                      "\"messageType\":\"OK\",\n" +
                                                                      "\"offererSessionId\":\"" +
                                                                      roap['answererSessionId'] + "\",\n" +
                                                                      "\"seq\":1\n}"
                                                                  
                                                                  setTimeout(function() {
                                                                      // Auto OK it
                                                                      console.log("H->C SDP: " + ok);
                                                                      pc.processSignalingMessage(ok);
                                                                  }, 1);
                                                                  // Invoke the callback to finish 
                                                                  callback();
                                                              } else if (roap['messageType'] == "OFFER") {
                                                                  // Oh no, here we go
                                                                  if (offer.indexOf("video") != -1) {
                                                                      offer = message;
                                                                      u.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                          .c('roap',Base64.encode(offer));
                                                                      updateCallback();
                                                                  } else {
                                                                      // This is an audio only call, lets lie
                                                                      roapAnswer = $.parseJSON(WebRTCAudio.offer.substring(4,message.length));
                                                                      fakeAnswer = "SDP\n{\n\"answererSessionId\":\"" +
                                                                      roap['answererSessionId'] + "\",\n" +
                                                                      "\"messageType\":\"ANSWER\",\n" +
                                                                      "\"offererSessionId\":\"" +
                                                                      roap['offererSessionId'] + "\",\n" +
                                                                          "\"seq\":2,\n" +
                                                                          "\"sdp\":\"" + roapAnswer['sdp']
                                                                          + "\"}";
                                                                      console.log("H->C SDP: " + fakeAnswer);
                                                                      pc.processSignalingMessage(fakeAnswer);
                                                                  }
                                                              } else {
                                                                  console.log("Recieved unexpected ROAP: " + message);
                                                              }
                                                          }
                                                         );
                
                pc.onaddstream = function(event) {
                    console.log("Remote stream added.");
                    console.log("Local stream is: " + WebRTCAudio.localStream);
                    var url = webkitURL.createObjectURL(event.stream);
                    remoteVideo.style.opacity = 1;
                    remoteVideo.src = url;
                };
                pc.onremovestream = function(event) {
                    conole.log("Remote stream removed.");
                };
                console.log("Created new PeerConnection, passing it :" + offer);
                pc.addStream(WebRTCAudio.localStream); 
                pc.processSignalingMessage(offer);
            } else {
                // We are creating an outbound call
                if (pc != null) {
                    pc.close();
                    pc = null;
                }
                pc = new WebRTCAudio.peerConnection(WebRTCAudio.stun,
                                                          function(message) {
                                                              console.log("C->S SDP: " + message);
                                                              // Canary is giving a null s= line, so 
                                                              // we replace it with something useful
                                                              message = message.replace("s=", "s=Canary");
                                                              //message = message.replace("a=group:BUNDLE audio video", "a=group:BUNDLE 2 1");
                                                              //message = message.replace("a=mid:audio", "a=mid:2");
                                                              //message = message.replace("a=mid:video", "a=mid:1");
                                                              var roap = $.parseJSON(message.substring(4,message.length));
                                                              if (roap['messageType'] == "OFFER") {
                                                                  j.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                      .c('roap',Base64.encode(message));  
                                                                  offer = message;
                                                                  callback();
                                                              } else if (roap['messageType'] == "OK") {
                                                                  // Ignore, we autogenerate on remote side
                                                              }
                                                              else if (roap['messageType'] == "ANSWER") {
                                                                  // Oh no, here we go
                                                                  answer = message;
                                                                  u.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                      .c('roap',Base64.encode(answer));
                                                                  updateCallback();
                                                              } else {
                                                                  console.log("Recieved unexpected ROAP: " + message);
                                                              }
                                                          }
                                                         );
                pc.onaddstream = function(event) {
                    console.log("Remote stream added.");
                    console.log("Local stream is: " + WebRTCAudio.localStream);
                    var url = webkitURL.createObjectURL(event.stream);
                    remoteVideo.style.opacity = 1;
                    remoteVideo.src = url;
                };
                pc.addStream(WebRTCAudio.localStream);
                console.log("Created PeerConnection for new OUTBOUND CALL");
            }
        },
        processTransport: function(t, update) {
            var roap;
            var message;
            t.find('roap').each(function () {
                var encoded = this.textContent;
                message = Base64.decode(encoded);
                console.log("S->C SDP: " + message);
                roap = $.parseJSON(message.substring(4,message.length));
            });
            if (roap['messageType'] == "OFFER") {
                // We are receiving an inbound call
                // Store the offer so we can use it to create an answer
                //  when the user decides to do so
                offer = message;
                // Or we are getting an update...
                if (pc != null && update == true) pc.processSignalingMessage(message);
            } else if (roap['messageType'] == "ANSWER") {

                // We are having an outbound call answered (must already have a PeerConnection)
                pc.processSignalingMessage(message);
            }
            return {input:{uri:"webrtc"}, output:{getPC: function() {return pc;}}};
        }
    }
};

// Returns an array of codecs supported by this plugin
// Hack until we get capabilities support
WebRTCAudio.prototype.codecs = function() {
    var result = new Array();
    result.push({
        id: 1,
        name: "webrtc",
        rate: 16000,
        p: 20
    });
    return result;
};

WebRTCAudio.prototype.audioInDevices = function(){
    var result = new Array();
    return result;
}

// Creates a DIV to hold the video element if not specified by the user
WebRTCAudio.prototype.createContainer = function() {
    var webRTC = $("<video>")
      	.attr("id","_phono-audio-webrtc" + (WebRTCAudio.count++))
        .attr("autoplay","autoplay")
      	.appendTo("body");

    var containerId = $(webRTC).attr("id");       
    return containerId;
};      


    Phono.registerPlugin("audio", {
        
        create: function(phono, config, callback) {
            config = Phono.util.extend({
                type: "auto"
            }, config);
            
            // What are we going to create? Look at the config...
            if (config.type === "java") {
                return Phono.util.loggify("JavaAudio", new JavaAudio(phono, config, callback));                
                
            } else if (config.type === "phonegap-ios") {
                return Phono.util.loggify("PhonegapIOSAudio", new PhonegapIOSAudio(phono, config, callback));
                
            } else if (config.type === "phonegap-android") {
                return Phono.util.loggify("PhonegapAndroidAudio", new PhonegapAndroidAudio(phono, config, callback));
                
            } else if (config.type === "flash") {
                return Phono.util.loggify("FlashAudio", new FlashAudio(phono, config, callback));

            } else if (config.type === "webrtc") {
                return Phono.util.loggify("WebRTCAudio", new WebRTCAudio(phono, config, callback));

            } else if (config.type === "jsep") {
                return Phono.util.loggify("JSEPAudio", new JSEPAudio(phono, config, callback));
                
            } else if (config.type === "none") {
                window.setTimeout(callback,10);
                return null;
                
            } else if (config.type === "auto") {
                
                console.log("Detecting Audio Plugin");
                
                if (PhonegapIOSAudio.exists())  { 
                    console.log("Detected iOS"); 
                    return Phono.util.loggify("PhonegapIOSAudio", new PhonegapIOSAudio(phono, config, callback));
                    
                } else if (PhonegapAndroidAudio.exists()) { 
                    console.log("Detected Android"); 
                    return Phono.util.loggify("PhonegapAndroidAudio", new PhonegapAndroidAudio(phono, config, callback));
                } else { 
                    console.log("Detected Flash"); 
                    return Phono.util.loggify("FlashAudio", new FlashAudio(phono, config, callback));
                    
                }
            }
        }
    });
      
})();
;(function() {

   function Message(connection) {
      this.from = null;
      this.body = null;
      this.connection = connection;
   };
   
   Message.prototype.reply = function(body) {
      this.connection.send($msg({to:this.from, type:"chat"}).c("body").t(body));
   };

   function StropheMessaging(phono, config, callback) {
      
      this.connection = phono.connection;
      
      this.connection.addHandler(
         this.handleMessage.bind(this), 
         null, "message", "chat"
      );
      
      Phono.events.bind(this, config);
      
      callback(this);
   };
   
   StropheMessaging.prototype.send = function(to, body) {
      this.connection.send($msg({to:to, type:"chat"}).c("body").t(body));
   };

   StropheMessaging.prototype.handleMessage = function(msg) {
      var message = new Message(this.connection);
      message.from = Strophe.getBareJidFromJid($(msg).attr("from"));
      message.body = $(msg).find("body").text();
      Phono.events.trigger(this, "message", {
         message: message
      }, [message]);
      return true;
   };
   
   Phono.registerPlugin("messaging", {
      create: function(phono, config, callback) {
         return new StropheMessaging(phono, config, callback);
      }
   });
      
})();

;(function() {

   Strophe.addNamespace('JINGLE', "urn:xmpp:jingle:1");
   Strophe.addNamespace('JINGLE_SESSION_INFO',"urn:xmpp:jingle:apps:rtp:1:info");

   var CallState = {
       CONNECTED: 0,
       RINGING: 1,
       DISCONNECTED: 2,
       PROGRESS: 3,
       INITIAL: 4
   };

   var Direction = {
       OUTBOUND: 0,
       INBOUND: 1
   };
   
   // Call
   //
   // A Call is the central object in the Phone API. Calls are started
   // using the Phone's dial function or by answering an incoming call.
   // =================================================================
   
   function Call(phone, id, direction, config) {

      var call = this;
      
      // TODO: move out to factory method
      this.phone = phone;
      this.phono = phone.phono;
      this.audioLayer = this.phono.audio;
      this.transport = this.audioLayer.transport(config);
      this.connection = this.phono.connection;
      
      this.config = Phono.util.extend({
         pushToTalk: false,
         mute: false,
         talking: false,
         hold: false,
         volume: 50,
         gain: 50,
         tones: false,
         codecs: phone.config.codecs,
         security: phone._security
      }, config);
      
      // Apply config
      Phono.util.each(this.config, function(k,v) {
         if(typeof call[k] == "function") {
            call[k](v);
         }
      });
            
      this.id = id;
      this.direction = direction;
      this.state = CallState.INITIAL;  
      this.remoteJid = null;
      this.initiator = null;
      this.codec = null;

      this.srtpPropsr = undefined;
      this.srtpPropsl = undefined;

      if (this._security != "disabled" && this.transport.supportsSRTP == true) {
          // Set up some local SRTP crypto parameters
          this.tag = "1";
          this.crypto = "AES_CM_128_HMAC_SHA1_80";
          this.keyparams = "inline:" + Phono.util.genKey(30);
          this.srtpPropsl = Phono.util.srtpProps(this.tag, this.crypto, this.keyparams);
      }
       
      this.headers = [];
      
      if(this.config.headers) {
         this.headers = this.config.headers;
      }
      
      // Bind Event Listeners
      Phono.events.bind(this, config);
      
      this.ringer = this.audioLayer.play({uri:phone.ringTone()}); 
      this.ringback = this.audioLayer.play({uri:phone.ringbackTone()});
      if (this.audioLayer.audioIn){
         this.audioLayer.audioIn(phone.audioInput());
      }
      
   };

   Call.prototype.bind = function(config) {
       Phono.events.bind(this, config);
   }

   Call.prototype.startAudio = function(iq) {
      if(this.input) {
         this.input.start();
      }
      if(this.output) {
         this.output.start();
      }
   };
   
   Call.prototype.stopAudio = function(iq) {
      if(this.input) {
         this.input.stop();
      }
      if(this.output) {
         this.output.stop();
      }
   };
   
   Call.prototype.start = function() {
      
      var call = this;

      if (call.state != CallState.INITIAL) return;
       
      var initiateIq = $iq({type:"set", to:call.remoteJid});
      
      var initiate = initiateIq.c('jingle', {
         xmlns: Strophe.NS.JINGLE,
         action: "session-initiate",
         initiator: call.initiator,
         sid: call.id
      });
                     
      $(call.headers).each(function() {
         initiate.c("custom-header", {name:this.name, data:this.value}).up();
      });
             
       var partialInitiate = initiate
           .c('content', {creator:"initiator"})
           .c('description', {xmlns:this.transport.description});
       
       Phono.util.each(this.config.codecs(Phono.util.filterWideband(this.audioLayer.codecs(),this.phone.wideband())), function() {
           partialInitiate = partialInitiate.c('payload-type', {
               id: this.id,
               name: this.name,
               clockrate: this.rate
           }).up();           
       });

       // Add our crypto
       var required = "0";
       if (call._security == "mandatory") required = "1";
       if (call._security != "disabled" && this.transport.supportsSRTP == true) {
           partialInitiate = partialInitiate.c('encryption', {required: required}).c('crypto', {
               tag: call.tag,
               'crypto-suite': call.crypto,
               'key-params': call.keyparams
           }).up();    
       }

       var updateIq = $iq({type:"set", to:call.remoteJid});
       
       var update = updateIq.c('jingle', {
           xmlns: Strophe.NS.JINGLE,
           action: "transport-accept",
           initiator: call.initiator,
           sid: call.id
       });
       
       var partialUpdate = update
           .c('content', {creator:"initiator"})
           .c('description', {xmlns:this.transport.description})
       
       this.transport.buildTransport("offer", partialInitiate.up(), 
                                     function() {
                                         call.connection.sendIQ(initiateIq, function (iq) {
                                             call.state = CallState.PROGRESS;
                                         });
                                     },
                                     partialUpdate.up(),
                                     function() {
                                         call.connection.sendIQ(updateIq, function (iq) {
                                         });   
                                     }
                                    );

   };
   
   Call.prototype.accept = function() {

      var call = this;

      if (call.state != CallState.PROGRESS) return;
      
      var jingleIq = $iq({
         type: "set", 
         to: call.remoteJid})
         .c('jingle', {
            xmlns: Strophe.NS.JINGLE,
            action: "session-info",
            initiator: call.initiator,
            sid: call.id})
         .c('ringing', {
            xmlns:Strophe.NS.JINGLE_SESSION_INFO}
      );
         
      this.connection.sendIQ(jingleIq, function (iq) {
          call.state = CallState.RINGING;
          Phono.events.trigger(call, "ring");
      });

   };
   
   Call.prototype.answer = function() {
      
      var call = this;
      
      if (call.state != CallState.RINGING 
      && call.state != CallState.PROGRESS) return;

       var acceptIq = $iq({type:"set", to:call.remoteJid});
      
       var accept = acceptIq.c('jingle', {
           xmlns: Strophe.NS.JINGLE,
           action: "session-accept",
           initiator: call.initiator,
           sid: call.id
       });
       
       var partialAccept = accept
           .c('content', {creator:"initiator"})
           .c('description', {xmlns:this.transport.description});
       
       partialAccept = partialAccept.c('payload-type', {
           id: call.codec.id,
           name: call.codec.name,
           clockrate: call.codec.rate
       }).up();           

       $.each((call.audioLayer.codecs()), function() {
           if (this.name == "telephone-event") {
               partialAccept = partialAccept.c('payload-type', {
                   id: this.id,
                   name: this.name,
                   clockrate: this.rate
               }).up();     
           } 
       });

       // Add our crypto
       if (call.srtpPropsl != undefined && call.srtpPropsr != undefined) {
           partialAccept = partialAccept.c('encryption').c('crypto', {
               tag: call.tag,
               'crypto-suite': call.crypto,
               'key-params': call.keyparams
           }).up();    
       }
       
       var updateIq = $iq({type:"set", to:call.remoteJid});
      
       var update = updateIq.c('jingle', {
           xmlns: Strophe.NS.JINGLE,
           action: "transport-replace",
           initiator: call.initiator,
           sid: call.id
       });
       
       var partialUpdate = update
           .c('content', {creator:"initiator"})
           .c('description', {xmlns:this.transport.description})

       this.transport.buildTransport("answer", partialAccept.up(), 
                                     function(){
                                         call.connection.sendIQ(acceptIq, function (iq) {
                                             call.state = CallState.CONNECTED;
                                             if (call.ringer != null) call.ringer.stop();
                                             call.setupBinding();
                                             // Check security
                                             if (call._security == "mandatory" && call.output.secure() == false) {
                                                 // We must fail the call, remote end did not agree on crypto
                                                 Phono.log.error("Security error, call not secure when mandatory specified");
                                                 call.hangup();
                                             } else {
                                                 Phono.events.trigger(call, "answer");
                                                 call.startAudio();
                                             }
                                         });
                                     },
                                     partialUpdate.up(),
                                     function() {
                                         call.connection.sendIQ(updateIq, function (iq) {
                                         });   
                                     });
   };

   Call.prototype.bindAudio = function(binding) {
      this.input = binding.input;
      this.output = binding.output;
      this.volume(this.volume());
      this.gain(this.gain());
      this.mute(this.mute());
      this.hold(this.hold());
      this.headset(this.headset());
      this.pushToTalkStateChanged();

      Phono.events.bind(this.output, {
      	  onMediaReady: function() {
              Phono.events.trigger(call, "mediaReady");
          }});
   };
   
   Call.prototype.hangup = function() {

      var call = this;
      
      if (call.state != CallState.CONNECTED 
       && call.state != CallState.RINGING 
       && call.state != CallState.PROGRESS) return;
      
      var jingleIq = $iq({
         type:"set", 
         to:call.remoteJid})
         .c('jingle', {
            xmlns: Strophe.NS.JINGLE,
            action: "session-terminate",
            initiator: call.initiator,
            sid: call.id}
      );
      
      this.connection.sendIQ(jingleIq, function (iq) {
          call.state = CallState.DISCONNECTED;
          Phono.events.trigger(call, "hangup");
          call.stopAudio();
          if (call.ringer != null) call.ringer.stop();
          if (call.ringback != null) call.ringback.stop();          
          if (call.transport.destroyTransport) call.transport.destroyTransport();
      });
      
   };
   
   Call.prototype.digit = function(value, duration) {
      if(!duration) {
         duration = 349;
      }
      this.output.digit(value, duration, this._tones);
   };
   
   Call.prototype.pushToTalk = function(value) {
   	if(arguments.length === 0) {
   	    return this._pushToTalk;
   	}
   	this._pushToTalk = value;
   	this.pushToTalkStateChanged();
   };

   Call.prototype.talking = function(value) {
   	if(arguments.length === 0) {
   	    return this._talking;
   	}
   	this._talking = value;
   	this.pushToTalkStateChanged();
   };

   Call.prototype.mute = function(value) {
   	if(arguments.length === 0) {
   	    return this._mute;
   	}
   	this._mute = value;
   	if(this.output) {
      	this.output.mute(value);
   	}
   };

   // TODO: hold should be implemented in JINGLE
   Call.prototype.hold = function(hold) {
      
   };

   Call.prototype.volume = function(value) {
   	if(arguments.length === 0) {
   	    return this._volume;
   	}
   	this._volume = value;
   	if(this.input) {
   	   this.input.volume(value);
   	}
   };

   Call.prototype.tones = function(value) {
   	if(arguments.length === 0) {
   	    return this._tones;
   	}
	   this._tones = value;
   };

   Call.prototype.gain = function(value) {
   	if(arguments.length === 0) {
   	    return this._gain;
   	}
   	this._gain = value;
   	if(this.output) {
   	   this.output.gain(value);
   	}
   };

   Call.prototype.energy = function() {
   	if(this.output) {
   	   ret = this.output.energy();
   	}
	return ret;
   };

   Call.prototype.secure = function() {
       var ret = false;
       if (this.output) {
           ret = this.output.secure();
       }
       return ret;
   };

   Call.prototype.security = function(value) {
   	if(arguments.length === 0) {
   	    return this._security;
   	}
   	this._security = value;
   };
   
   Call.prototype.headset = function(value) {
   	if(arguments.length === 0) {
   	    return this._headset;
   	}
   	this._headset = value;
   	if(this.output) {
   	   this.output.suppress(!value);
   	}
   };
   
	Call.prototype.pushToTalkStateChanged = function() {
	   if(this.input && this.output) {
   		if (this._pushToTalk) {
   			if (this._talking) {
   				this.input.volume(20);
   				this.output.mute(false);
   			} else {
   				this.input.volume(this._volume);
   				this.output.mute(true);
   			}
   		} else {
   			this.input.volume(this._volume);
   			this.output.mute(false);
   		}
	   }
	};
   
   Call.prototype.negotiate = function(iq) {

      var call = this;

      // Find a matching audio codec
      var description = $(iq).find('description');
      var codec = null;
      description.find('payload-type').each(function () {
         var codecName = $(this).attr('name');
         var codecRate = $(this).attr('clockrate');
          var codecId = $(this).attr('id');
          $.each(call.config.codecs(Phono.util.filterWideband(call.audioLayer.codecs(),call.phone.wideband())), function() {
             if ((this.name == codecName && this.rate == codecRate && this.name != "telephone-event") || (parseInt(this.id) < 90 && this.id == codecId)) {
                 if (codec == null) codec = {id: codecId , name:this.name,  rate: this.rate, p: this.p};
                 return false;
            } 
         });
      });
      
      // No matching codec
      if (!codec) {
          Phono.log.error("No matching jingle codec (not a problem if using WebRTC)");
          // Voodoo up a temporary codec as a placeholder
          codec = {
              id: 1,
              name: "webrtc-ulaw",
              rate: 8000,
              p: 20
          };
      }

      // Check to see if we have crypto, we only support AES_CM_128_HMAC_SHA1_80
      if (call._security != "disabled" && this.transport.supportsSRTP == true) {
          description.find('crypto').each(function () {
              if ($(this).attr('crypto-suite') == call.crypto) {
                  call.srtpPropsr = Phono.util.srtpProps($(this).attr('tag'), 
                                                         $(this).attr('crypto-suite'), 
                                                         $(this).attr('key-params'), 
                                                         $(this).attr('session-params'));
                  call.tag = $(this).attr('tag'); // So we can answer with the correct tag
              }
          });
          
          if (call._security == "mandatory" && call.srtpPropsr == undefined) {
              // We must fail the call, remote end did not agree on crypto
              Phono.log.error("No security when mandatory specified");
              return null;
          }
      }

      // Find a matching media transport
      var foundTransport = false;
      $(iq).find('transport').each(function () {
          if (call.transport.name == $(this).attr('xmlns') && foundTransport == false) {
              var transport = call.transport.processTransport($(this), false);      
              if (transport != undefined) {
                  call.setupBinding = function () {
                      return call.bindAudio ({
                          input: call.audioLayer.play(transport.input, false),
                          output: call.audioLayer.share(transport.output, false, codec, call.srtpPropsl, call.srtpPropsr)
                      });
                  };
                  foundTransport = true;
              } else {
                  Phono.log.error("No valid candidate in transport");
              }
          }
      });

      if (foundTransport == false) {
          Phono.log.error("No matching valid transport");
          return null;
      }
      return codec;
       
   };

   // Phone
   //
   // A Phone is created automatically with each Phono instance. 
   // Basic Phone allows setting  ring tones,  ringback tones, etc.
   // =================================================================

   function Phone(phono, config, callback) {

      var phone = this;
      this.phono = phono;
      this.connection = phono.connection;
      
      // Initialize call hash
      this.calls = {};

      // Initial state
      this._wideband = true;

      // Define defualt config and merge from constructor
      this.config = Phono.util.extend({
         audioInput: "System Default",
         ringTone: "//s.phono.com/ringtones/Diggztone_Marimba.mp3",
         ringbackTone: "//s.phono.com/ringtones/ringback-us.mp3",
         wideband: true,
         headset: false,
         codecs: function(offer) {return offer;},
         security: "optional" // mandatory, disabled
      }, config);
      
      // Apply config
      Phono.util.each(this.config, function(k,v) {
         if(typeof phone[k] == "function") {
            phone[k](v);
         }
      });
      
      // Bind Event Listeners
      Phono.events.bind(this, config);
      
      // Register Strophe handler for JINGLE messages
      this.connection.addHandler(
         this.doJingle.bind(this), 
         Strophe.NS.JINGLE, "iq", "set"
      );
      
      callback(this);

   };
   
   Phone.prototype.doJingle = function(iq) {
      
      var phone = this;
      var audioLayer = this.phono.audio;
      
      var jingle = $(iq).find('jingle');
      var action = jingle.attr('action') || "";
      var id = jingle.attr('sid') || "";
      var call = this.calls[id] || null;
      
      switch(action) {
         
         // Inbound Call
         case "session-initiate":
         
            call = Phono.util.loggify("Call", new Call(phone, id, Direction.INBOUND));
            call.phone = phone;
            call.remoteJid = $(iq).attr('from');
            call.initiator = jingle.attr('initiator');
            
            // Register Call
            phone.calls[call.id] = call;

            call.state = CallState.PROGRESS;
          
            // Negotiate SDP
            call.codec = call.negotiate(iq);
            if(call.codec == null) {
                Phono.log.warn("Failed to negotiate incoming call", iq);
                call.hangup();
                break;
            }
            
            // Get incoming headers
            call.headers = new Array();
            jingle.find("custom-header").each(function() {
               call.headers.push({
                  name:$(this).attr("name"),
                  value:$(this).attr("data")
               });
            });

            // Start ringing
            if (call.ringer != null) call.ringer.start();
            
            // Auto accept the call (i.e. send ringing)
            call.accept();

            // Fire imcoming call event
            Phono.events.trigger(this, "incomingCall", {
               call: call
            });
          
            // Get microphone permission if we are going to need it
            if(!audioLayer.permission()) {
                Phono.events.trigger(audioLayer, "permissionBoxShow");
            }
                        
            break;
            
         // Accepted Outbound Call
         case "session-accept":
         
            // Negotiate SDP
            call.codec = call.negotiate(iq);
            if(call.codec == null) {
                Phono.log.warn("Failed to negotiate outbound call", iq);
                call.hangup();
                break;
            }
          
            // Stop ringback
            if (call.ringback != null) call.ringback.stop();
          
            // Connect audio streams
            call.setupBinding();
          
            // Belt and braces
            if (call._security == "mandatory" && call.output.secure() == false) {
                // We must fail the call, remote end did not agree on crypto
                Phono.log.error("Security error, call not secure when mandatory specified");
                call.hangup();
                break;
            }

            call.startAudio();

            call.state = CallState.CONNECTED;
                
            // Fire answer event
            Phono.events.trigger(call, "answer")
            break;

         // Transport information update
         case "transport-replace":
         case "transport-accept":
            call.transport.processTransport($(iq), true);
            break;

         // Hangup
         case "session-terminate":
            
            call.state = CallState.DISCONNECTED;
            
            call.stopAudio();
            if (call.ringer != null) call.ringer.stop();
            if (call.ringback != null) call.ringback.stop();
            if (call.transport.destroyTransport) call.transport.destroyTransport();

            // Fire hangup event
            Phono.events.trigger(call, "hangup")
            
            break;
            
         // Ringing
         case "session-info":
         
            if ($(iq).find('ringing')) {
               call.state = CallState.RINGING;
               if (call.ringback != null) call.ringback.start();
               Phono.events.trigger(call, "ring")
            }
            
            break;
      }

      // Send Reply
      this.connection.send(
         $iq({
            type: "result", 
             id: $(iq).attr('id'),
             to:call.remoteJid
         })
      );
      
      return true;      
   };
   
   Phone.prototype.dial = function(to, config) {
      
      //Generate unique ID
      var id = Phono.util.guid();

      // Configure Call properties inherited from Phone
      config = Phono.util.extend({
         headset: this.headset()
      }, (config || {}));

      // Create and configure Call
      var call = new Phono.util.loggify("Call", new Call(this, id, Direction.OUTBOUND, config));
      call.phone = this;
      call.remoteJid = to;
      call.initiator = this.connection.jid;

      // Give platform a chance to fix up 
      // the destination and add headers
      this.beforeDial(call);

      // Register call
      this.calls[call.id] = call;

      // Kick off JINGLE invite
      call.start();
      
      return call;
   };
   
   Phone.prototype.beforeDial = function(call) {
      var to = call.remoteJid;
      if(to.match("^sip:") || to.match("^sips:")) {
         call.remoteJid = Phono.util.escapeXmppNode(to.substr(4)) + "@sip";
      }
      else if(to.match("^xmpp:")) {
         call.remoteJid = to.substr(5); 
      }
      else if(to.match("^app:")) {
         call.remoteJid = Phono.util.escapeXmppNode(to.substr(4)) + "@app";
      }
      else if(to.match("^tel:")) {
         call.remoteJid = "9996182316@app";
         call.headers.push({
            name: "x-numbertodial",
            value: to.substr(4)
         });
      }
      else {
         var number = to.replace(/[\(\)\-\.\ ]/g, '');
         if(number.match(/^\+?\d+$/)) {
            call.remoteJid = "9996182316@app";
            call.headers.push({
               name: "x-numbertodial",
               value: number
            });
         }
         else if(to.indexOf("@") > 0) {
             call.remoteJid = Phono.util.escapeXmppNode(to) + "@sip";
         }
      }
   };

   Phone.prototype.audioInput = function(value) {
      if(arguments.length == 0) {
         return this._audioInput;
      }
      this._audioInput = value;
   };
   
   Phone.prototype.audioInDevices = function(){
       var audiolayer = this.phono.audio;
       var ret = new Object();
       if (audiolayer.audioInDevices){
           ret = audiolayer.audioInDevices();
       }
       return ret;
   }

   Phone.prototype.ringTone = function(value) {
      if(arguments.length == 0) {
         return this._ringTone;
      }
      this._ringTone = value;
   };

   Phone.prototype.ringbackTone = function(value) {
      if(arguments.length == 0) {
         return this._ringbackTone;
      }
      this._ringbackTone = value;
   };

   Phone.prototype.headset = function(value) {
      if(arguments.length == 0) {
         return this._headset;
      }
      this._headset = value;
      Phono.util.each(this.calls, function() {
        this.headset(value);
      });
   };

   Phone.prototype.wideband = function(value) {
      if(arguments.length == 0) {
         return this._wideband;
      }
      this._wideband = value;
   }

   Phone.prototype.security = function(value) {
       if(arguments.length == 0) {
           return this._security;
       }
       this._security = value;
   }

   Phono.registerPlugin("phone", {
      create: function(phono, config, callback) {
         return Phono.util.loggify("Phone", new Phone(phono, config, callback));
      }
   });
      
})();


   // ======================================================================

   Strophe.log = function(level, msg) {
       Phono.log.debug("[STROPHE] " + msg);
   };

   // Register Loggign Callback
   Phono.events.add(Phono.log, "log", function(event) {
      var date = event.timeStamp;
      var formattedDate = 
            Phono.util.padWithZeroes(date.getHours(), 2) + ":" + 
            Phono.util.padWithZeroes(date.getMinutes(), 2) + ":" + 
            Phono.util.padWithZeroes(date.getSeconds(), 2) + "." +
            Phono.util.padWithZeroes(date.getMilliseconds(), 3);
      var formattedMessage = formattedDate + " " + Phono.util.padWithSpaces(event.level.name, 5) + " - " + event.getCombinedMessages();
      var throwableStringRep = event.getThrowableStrRep();
      if (throwableStringRep) {
        formattedMessage += newLine + throwableStringRep;
      }
      console.log(formattedMessage);
   });

   // PluginManager is responsible for initializing plugins an 
   // notifying when all plugins are initialized
   function PluginManager(phono, config, readyHandler) {
      this.index = 0;
      this.readyHandler = readyHandler;
      this.config = config;
      this.phono = phono;
      this.pluginNames = new Array();
      for(pluginName in Phono.plugins) {
         this.pluginNames.push(pluginName);
      }
   };

   PluginManager.prototype.init = function(phono, config, readyHandler) {
      this.chain();
   };

   PluginManager.prototype.chain = function() {
      var manager = this;
      var pluginName = manager.pluginNames[this.index];
      Phono.plugins[pluginName].create(manager.phono, manager.config[pluginName], function(plugin) {
         manager.phono[pluginName] = plugin;
         manager.index++;
         if(manager.index === manager.pluginNames.length) {
            manager.readyHandler.apply(manager.phono);
         }
         else {
            manager.chain();
         }
      });
   };
   
})();

   
   $.phono = function(config) {
      return new Phono(config);
   }
   
})(jQuery);(function($)
{

  // Geoff added
  var sipdomain = "vims1.com";
  var server = "https://api.foundry.att.com/a2/webrtc";
  
	// Random, unique, unpredictable
	// Both uuidCounter++ are needed and Math.random.
	// uuidCounter++ ensures unique
	// Math.random() ensures unpredictable
	// Prints it out as hex with no other punctuation (looks neater)
	var uuidCounter = 0;
	var uuid = function()
	{
		return Math.random().toString(16).substring(2) + (uuidCounter++).toString(16);
	};
	
	function PhonoCall(ms, destination, config, oCall)
	{
	
		var call = oCall;
	
		if (!call)
			call = ms.createCall(destination, {audio: true, video: true});
			
		if (!config)
			config = {};
			
		$.extend(this, config);
		
		this.state = "initial";
		var mt = this;
		
		call.onstatechange = function(e)
		{
			console.log("New state: " + e.state);
			if (e.state == Call.State.RINGING && mt.onRing)
			{
				mt.onRing(e);
				mt.state = "ringing";
			}
			if (e.state == Call.State.ONGOING && mt.onAnswer)
			{
				mt.onAnswer(e);
				mt.state = "connected";
			}
			if (e.state == Call.State.ENDED && mt.onHangup)
			{
				console.log(mt.onHangup);
				mt.onHangup(e);
				mt.state = "disconnected";
			}
			if (e.state == Call.State.ERROR && mt.onError)
			{
				mt.onError(e);
				mt.state = "disconnected";
			}
		}
		
		call.onaddstream = function(e)
		{
			// TODO: Add the stream to an element.
			// This is not possible (nor useful) in current Chrome
			if (mt.onAddStream)
				mt.onAddStream(e);
		}	
		
		this.__defineGetter__("localStreams", function() { return call.localStreams; });
		this.__defineGetter__("remoteStreams", function() { return call.localStreams; });
		
		if (!destination)
			this.__defineGetter__("from", function() { return call.recipient; });
		
		this.id = uuid();
		this.call = call;
		
		if (!oCall)
			call.ring();
	}
	
	PhonoCall.prototype.answer = function() { this.call.answer(); };
	PhonoCall.prototype.hangup = function() { this.call.end(); };
	PhonoCall.prototype.digit = function() { };
	PhonoCall.prototype.pushToTalk = function() { };
	PhonoCall.prototype.talking = function() { };
	PhonoCall.prototype.mute = function() { };
	PhonoCall.prototype.hold = function() { };
	PhonoCall.prototype.volume = function() { };
	PhonoCall.prototype.gain = function() { };
	
	function Phone(ms, config)
	{
		this._ms = ms;
		if (!config) config = {};
		this._config = config;
		
		$.extend(this, config);
		
		if (!this.onError)
			this.onError = function(){
				console.warn("Error occurred with no handler there");
			};
	}
	
	Phone.prototype.dial = function(destination, config)
	{
		if (!config.video)
			config.video = this.video;
			
    var sipDestination = "sip:"+destination + "@" + sipdomain;
		this.call = new PhonoCall(this._ms, sipDestination, config);
		return this.call;
	};
	
	Phone.prototype.tones = function(){};
	Phone.prototype.headset = function(){};
	Phone.prototype.wideband = function(){};
	Phone.prototype.ringTone = function(){};
	Phone.prototype.ringbackTone = function(){};

	function H2SPhono(config)
	{
		this._config = config;

    if(config.apiKey.indexOf("oauth" == -1)) {
      config.apiKey = "oauth " +  config.apiKey;
    }

    if (!config.sipdomain)
        config.sipdomain = sipdomain;
    
    if (!config.server)
        config.server = server;

		$.extend(this, config);
		
		if (!this.user)
			this.user = uuid();
			
		//this._ms = new MediaServices("http://api.tfoundry.com/a1/H2SConference", uuid(), config.apiKey, "audio");
		
		var mt = this;
		
		var mediaType = (config.video ? "audio,video" : "audio");
		
		this._ms = new MediaServices(this.server, this.user, config.apiKey, mediaType);
		this._ms.onready = function() { setTimeout(function() { mt._ms.unregister(); }, 500) };
		this._ms.onclose = function() { setTimeout(function() {
		
			
			mt._ms = new MediaServices(mt.server, mt.user, config.apiKey, mediaType);
			mt._ms.turnConfig = "NONE";
			
			// preserve "this" for callbacks
			mt._ms.onclose = function(e) { if (mt.onUnready) mt.onUnready(e); };
			mt._ms.onerror = function(e) { mt.onerror(e); };
			mt._ms.oninvite = function(e) { mt.oninvite(e); };
			mt._ms.onready = function(e) { mt.sessionId = mt._ms.username; if (mt.onReady) mt.onReady(e); };
			
			mt.phone = new Phone(mt._ms, config.phone);
		
		}, 500); };
		
	}
	
	H2SPhono.prototype.onerror = function(evt)
	{
		// TODO: Ensure error event format matches
		if(this.phone._call && this.phone._call.onerror)
		{
			this.phone._call.onerror(evt);
		}
		else
		{
			this.phone.onerror(evt);
		}
	}
	
	H2SPhono.prototype.oninvite = function(evt)
	{
		if (evt.call && this.phone.onIncomingCall)
			this.phone.onIncomingCall({call: new PhonoCall(this._ms, null, null, evt.call)});
	}
	
	$.extend({h2sphono: function(cfg) { return new H2SPhono(cfg); }});

})(jQuery);
/**
 * H2S Javascript Library
 * With WebRTC support for Google Chrome using ROAP only
 *
 * @author Philip Mark, Maxime-Alexandre Marchand, Paul Ghanime
 * @version 2.1.0
 * Copyright: 2012 Ericsson
 */

if (typeof Logs === "undefined") {
	Logs = true;
}
	
(function(parent) {
	// noop logger
	// note that all three functions are present in console and can be used
	var logger = {
		log: function(){},
		warn: function(){},
		error: function(){}
	};
	
	// op logger. Only enable due to a flag. At the moment, no flag (true).
	// Change this to disable logging in one place.
	if (Logs)
		logger = console;


	// H2S URL resources
	var SESSION = "session",
		REGISTER_RESOURCE = "register",
		CONFERENCE_RESOURCE = "mediaconf",
		CONFERENCE_RESOURCE_ADD = "add",
		CONFERENCE_RESOURCE_REMOVE = "remove",
		AUDIOVIDEO_RESOURCE = "audiovideo",
		CHANNEL_RESOURCE = "channels",
		FILETRANSFER_RESOURCE = "filetransfer",
		FILETRANSFER_RESOURCE_SEND = "sendfile",
		FILETRANSFER_RESOURCE_UPLOAD = "uploadfiledata",
		FILETRANSFER_RESOURCE_ACCEPT = "accept",
		FILETRANSFER_RESOURCE_TERMINATE = "terminate",
		FILETRANSFER_RESOURCE_GETFILE = "getfiledata",
		ADDRESSBOOK_RESOURCE = "ab",
		ADDRESSBOOK_RESOURCE_CONTACTS = "contacts",
		CHAT_RESOURCE = "message",
		CHAT_RESOURCE_SEND = "send",
		CHAT_RESOURCE_SEND_ISCOMPOSING = "send-iscomposing",
		CHAT_RESOURCE_SEND_MEDIA = "sendmedia?to=",
		CHAT_RESOURCE_GET_MEDIA = "getmedia?fileRef=",
		GROUP_CHAT_RESOURCE = "groupchat",
		GROUP_CHAT_CREATE = "create",
		GROUP_CHAT_LEAVE = "leave",
		GROUP_CHAT_ADD = "addparticipants",
		GROUP_CHAT_JOIN = "join",
		GROUP_CHAT_ACCEPT = "invite/accept",
		GROUP_CHAT_DECLINE = "invite/decline",
		GROUP_CHAT_RESOURCE_SEND_MEDIA = "sendmedia?confId=";
		PRESENCE_RESOURCE = "presence",
		PRESENCE_RESOURCE_USER = "user",
		PRESENCE_RESOURCE_USER_SUBSCRIBE = "subscribe",
		PRESENCE_RESOURCE_USER_PUBLISH = "publish",
		PRESENCE_RESOURCE_USER_ANONYMOUS = "anonymous",
		PRESENCE_RESOURCE_LIST = "list",
		PRESENCE_RESOURCE_LIST_ADD = "adduser",
		PRESENCE_RESOURCE_LIST_REMOVE = "removeuser",
		PRESENCE_RESOURCE_LIST_BLOCK = "blockuser",
		CONTENT_RESOURCE = "content",
		CONTENT_RESOURCE_GETAVATAR = "getavatar",
		CONTENT_RESOURCE_SETAVATAR = "setavatar",
		CONTENT_RESOURCE_DELETEAVATAR = "deleteavatar";
	
	// Presence service descriptions. Taken from RCS specs document
	var SERVICE = {
		MESSAGING_STANDALONE : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.sm",
			serviceVersion : "1.0"
		},
		MESSAGING_SESSION_MODE : {
			serviceDescription : "org.openmobilealliance:IM-session",
			serviceVersion : "1.0"
		},
		FILE_TRANSFER : {
			serviceDescription : "org.openmobilealliance:File-Transfer",
			serviceVersion : "1.0"
		},
		IMAGE_SHARE : {
			serviceDescription : "org.gsma.imageshare",
			serviceVersion : "1.0"
		},
		VIDEO_SHARE_1 : {
			serviceDescription : "org.gsma.videoshare",
			serviceVersion : "1.0"
		},
		VIDEO_SHARE_2 : {
			serviceDescription : "org.gsma.videoshare",
			serviceVersion : "2.0"
		},
		SOCIAL_PRESENCE : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcse.sp",
			serviceVersion : "1.0"
		},
		CAPABILITY_DISCOVERY : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcse.dp",
			serviceVersion : "1.0"
		},
		VOICE_CALL : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-service.ims.icsi.mmtel",
			serviceVersion : "1.0"
		},
		VIDEO_CALL : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-service.ims.icsi.mmtel",
			serviceVersion : "1.0"
		},
		GEOLOCATION_PUSH : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.geopush",
			serviceVersion : "1.0"
		},
		GEOLOCATION_PULL : {
			serviceDescription : "org.3gpp.urn:urn-7:3gpp-application.ims.iari.rcs.geopull",
			serviceVersion : "1.0"
		}
	};
	
	// TODO: this is a parameter that can be fetched with getParameter from the REST API
	var MAX_MEDIA_SIZE = 51200; // Media message size
	
	// Signature on this can vary. Basically it has a URL to the gateway and some form of access token.
	// It auto-registers after the current event loop
	/**
	Creates a new MediaServices instance. This instance can be used to request new media services and to respond to incoming media requests.
	@class The MediaServices class is the main entry point of the application. It registers with the media gateway, 
	creates outgoing calls and new conferences, and accepts incoming calls.<br />
	@property {MediaServices.State} state State of the MediaServices.
	@property {String} mediaType The media type(s) supported by this MediaServices object.
	@property {String} turnConfig The TURN server URL. (e.g. "provserver.televolution.net") Defaults to "NONE" if not set.
	@property {String} willingness The willingness status of the user. This will be published automatically.
	@property {String} tagline The tagline of the user. This will be published automatically.
	@property {Object} homepage The homepage of the user (should be an object with field: homepage.url and homepage.label). This will be published automatically.
	@property {String} username (readyonly)
	@property {ContactList} contactList
	@param {String} gwUrl URL to the MediaGateway, including the protocol scheme (e.g. "http://129.192.188.88:9191/HaikuServlet/rest/v2/"). This is also described as the base URL.
	@param {String} username Name/identity to register with the Media Gateway. For SIP users, start with "sip:" (e.g. "sip:name@domain.com")
	@param {String} authentication SIP password or authorization token. If registering with oAuth, this parameter should begin with "oauth" (e.g. "oauth mytoken")
	@param {String} services Media services that the user supports. Any combination of "audio,video,ftp,chat".
	@throws {TypeError} Invalid username
	@throws {Error} Invalid user services
	@example
ms = new MediaServices("http://129.192.188.88:9191/HaikuServlet/rest/v2/", "sip:name@domain.com", "0faeb2c", "audio,video,ftp,chat");
// or
ms = new MediaServices("http://129.192.188.88:9191/HaikuServlet/rest/v2/", "name@domain.com", "oauth 0faeb2c", "audio,video");
ms.onclose = function(evt) {};
ms.onerror = function(evt) {};
ms.oninvite = function(evt) {};
ms.onstatechange = function(evt) {};
ms.onready = function(evt) {
	// Perform an action, such as outgoing call
};
	*/
	MediaServices = function(gwUrl, username, authentication, services) {
		var _state = MediaServices.State.INITIALISED,
			_services = services,
			_turnConfig = "NONE",
			_username = username;
		
		/**
		Base URL including session ID ("baseURL"/"sessionID"/)
		@private
		*/
		this._gwUrl = (gwUrl.substr(-1) == "/") ? gwUrl : gwUrl + "/";
		
		/**
		Event channel
		@private
		*/
		this._channel = null;
		
		/**
		Role of the user (Moderator or Normal user)
		@private
		*/
		this._isModerator = null;
		
		/**
		Current Call object
		@private
		*/
		this._call = null;
		
		/**
		Is user a SIP user or Web user
		@private
		*/
		this._isSipUser = (username.indexOf("sip:") == 0) ? true : false;
		
		/**
		Hashmap of FileTransfer objects
		@private
		*/
		this._ftp = new _HashMap();
		
		/**
		Session ID (the ID is needed for file transfer)
		@private
		*/
		this._sessionID = null;
		
		/**
		A ContactList object
		@private
		*/
		this._contactList = null;
		
		/**
		Hashmap of Chat and GroupChat objects
		@private
		*/
		this._chat = new _HashMap();
		
		this._willingness;
		
		this._tagline = "";
		
		this._homepage = "";
		
		/**
		Access token (used for oAuth)
		E.g. "oauth mytoken"
		@private
		*/
		this._accessToken = (authentication.indexOf("oauth ") == 0) ? authentication.substring(6, authentication.length) : null;
    
		/**
		@field state
		Object's state
		*/
		Object.defineProperty(this, "state", {
			get: function()
			{
				return _state;
			},
			
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				if (typeof(this.onstatechange) == "function")
					this.onstatechange(evt);
					
				// Dispatch appropriate states
				if (newState == MediaServices.State.READY && typeof(this.onready) == "function")
					this.onready(evt);
				else if (newState == MediaServices.State.CLOSED && typeof(this.onclose) == "function")
					this.onclose(evt);
			}
		});
		
		/**
		@field mediaType
		@readonly
		The media type(s) supported by this MediaServices object
		*/
		Object.defineProperty(this, "mediaType", {
			get: function() { return _services; }
		});
		
		/**
		@field turnConfig
		The TURN server configuration
		*/
		Object.defineProperty(this, "turnConfig", {
			get: function() { return _turnConfig; },
			set: function(turnConfig) { _turnConfig = turnConfig; }
		});
		
		/**
		@field contactList
		*/
		Object.defineProperty(this, "contactList", {
			get: function() { return this._contactList; }
		});
		
		/**
		@field willingness
		*/
		Object.defineProperty(this, "willingness", {
			get: function() { return this._willingness; },
			set: function(willingness) {
				this._willingness = willingness;
				this._publish({ willingness : willingness });
			}
		});
		
		/**
		@field tagline
		*/
		Object.defineProperty(this, "tagline", {
			get: function() { return this._tagline; },
			set: function(tagline) {
				this._tagline = tagline; 
				this._publish({ freeText : tagline });
			}
		});
		
		/**
		@field homepage
		*/
		Object.defineProperty(this, "homepage", {
			get: function() { return this._homepage; },
			set: function(homepage) {
				this._homepage = homepage;
				if (homepage.url && homepage.label) {
					this._publish({ homepage : homepage });
				}
			}
		});
		
		/**
		@field username
		@readonly
		*/
		Object.defineProperty(this, "username", {
			get: function() { return _username; }
		});
		
		// Auto register right away
		this._register(username, authentication);
	};
	
	/**
	TODO: keep this private?
	@private
	*/
	MediaServices.prototype._getVersion = function() {
		var url = this._gwUrl + "application/version";
		var req = new _CreateXmlHttpReq(this._accessToken);
			
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
		
		req.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					logger.log(this.responseText);
				}
			}
		};	
	};
	
	/**
	TODO: keep this private?
	@private
	*/
	MediaServices.prototype._getInfo = function() {
		var url = this._gwUrl + "application/info";
		var req = new _CreateXmlHttpReq(this._accessToken);
			
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
		
		req.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					logger.log(this.responseText);
				}
			}
		};	
	};
	
	/**
	H2S user registration
	@private
	@return void
	@throws {Error} Invalid username
	@throws {Error} Invalid authentication
	@throws {Error} Invalid user services
	*/
	MediaServices.prototype._register = function(username, authentication) {
		var mediaService = this;
		var registerURL = this._gwUrl + REGISTER_RESOURCE;
		
		logger.log("Media service initialised");

		if (typeof(username) != "string" || username == "") {
			throw new Error(MediaServices.Error.INVALID_CREDENTIALS);
		//} else if (typeof(authentication) != "string" || authentication == "") {
		//	throw new Error(MediaServices.Error.INVALID_CREDENTIALS);
		} else if (typeof(this.mediaType) != "string") {
			throw new TypeError(MediaServices.Error.INVALID_SERVICES);
		} else {
			// Check if user services are valid
			var _services = [];
		
			var tokens = this.mediaType.toLowerCase().replace(/(\s)/g, "").split(",");
			
			for (var i = 0; i < tokens.length; i++) {
				if (tokens[i] == "audio") {
					_services.push("ip_voice_call");
				} else if (tokens[i] == "video") {
					_services.push("ip_video_call");
				} else if (tokens[i] == "ftp") {
					_services.push("file_transfer");
				} else if (tokens[i] == "chat") {
					_services.push("im_chat");
				}
			}
			
			if (_services.length < 1) {
				throw new Error("Invalid user services");
			}
			
			var body = null;
			if (this._isSipUser) {
				// Remove "sip:" prefix
				// username = username.slice(4, username.length);
			
				// SIP users supports Address Book and Presence by default
				//_services.push("ab");
				//_services.push("presence");
				
				body = {
					username : username,
					password : authentication,
					mediaType : "rtmp",
					services : _services
				};
			} else {
				body = {
					username : username,
					mediaType : "rtmp",
					services : _services
				};
			}
				
			// Create and send a register request
			var req = new _CreateXmlHttpReq(this._accessToken);
			
			req.open("POST", registerURL, true);
			req.setRequestHeader("Content-Type", "application/json");
			req.setRequestHeader("Accept", "application/json, text/html");
			req.send(JSON.stringify(body, null, " "));
			
			// On response
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					mediaService.state = MediaServices.State.REGISTERING;
					logger.log("Registering...");
					
					// Success response 201 Created
					if (this.status == 201) {
						// Extract the sessionID from JSON body
						var json = JSON.parse(this.responseText);
						var tokens = json.resourceURL.split("/");
						var index = tokens.indexOf("session");
						
						mediaService._sessionID = tokens[index + 1];
						mediaService._gwUrl += SESSION + '/' + mediaService._sessionID + '/';
						
						// Start polling the event channel
						mediaService._channel = new _Channel(mediaService);
						mediaService._channel.pollChannel();
						
						if (false && mediaService._isSipUser) {
							// Create a new contact list
							mediaService._contactList = new ContactList(mediaService);
							mediaService._contactList._url = mediaService._gwUrl;
							mediaService._contactList.update();
							
							// Publish self services
							mediaService._publishServices();
						}
						
						logger.log("Registration successful");
						
						mediaService.state = MediaServices.State.READY;
					} else {
						logger.log("Registration unsuccessful: " + this.status + " " + this.statusText);
						
						switch (this.status) {
							case 401: // 401 Unauthorized
							case 403: // 403 Forbidden
								_InternalError(mediaService, MediaServices.Error.INVALID_CREDENTIALS);
								break;
							default:
								_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
								break;
						}
					}
				}
			};
		}
	};
	
	/**
	@namespace Describes the possible states of the MediaServices object.
	*/
	MediaServices.State = {};
	
	/**
	The MediaServices object is initialised, but has not yet begun registration with the media gateway
	*/
	MediaServices.State.INITIALISED = 0;
	
	/**
	The MediaServices object registration and authentication are in progress
	*/
	MediaServices.State.REGISTERING = 1;
	
	/**
	The MediaServices object has registered and authenticated, and can now be used to create and receive media
	*/
	MediaServices.State.READY = 2;
	
	/**
	The MediaServices object unregistration is in progress
	*/
	MediaServices.State.UNREGISTERING = 3;
	
	/**
	The MediaServices object session has ended in a controlled and expected manner, and the object can no longer be used
	*/
	MediaServices.State.CLOSED = 4;
	
	/**
	The MediaServices object session has ended abruptly, in an unexpected manner (network failure, server error, etc), and the object can no longer be used
	*/
	MediaServices.State.ERROR = 5;
	
	/**
	@namespace Describes the possible errors of the MediaServices object.
	*/
	MediaServices.Error = {};
	
	/**
	Generic network failure.
	*/
	MediaServices.Error.NETWORK_FAILURE = 0;
	
	/**
	Registration failed due to invalid credentials. 
	*/
	MediaServices.Error.INVALID_CREDENTIALS = 1;
	
	/**
	Registration failed due to invalid services. 
	*/
	MediaServices.Error.INVALID_SERVICES = 2;
	
	/**
	Re-registers the client. 
	@function
	@return void
	@example
ms.reregister();
	*/
	MediaServices.prototype.reregister = function() {
		var mediaService = this;
		var reregisterURL = mediaService._gwUrl + REGISTER_RESOURCE;
		
		logger.log("Reregistering...");
		
		this.state = MediaServices.State.REGISTERING;
		
		// Create a new logout request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("PUT", reregisterURL, true);
		req.setRequestHeader("X-http-method-override", "PUT");
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
		
		// On response
		req.onreadystatechange = function() {
			if (this.readyState == 4) {
				var json = JSON.parse(this.responseText);
			
				// Success response 200 OK
				if (this.status == 200) {
					logger.log("Reregistration successful " + json.expires);
					
					mediaService.state = MediaServices.State.READY;
				} else {
					logger.log("Reregistration unsuccessful: " + this.status + " " + this.statusText);
					
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Unregisters the user from the current media service session. When completed successfully, MediaServices will change state to CLOSED.
	@function
	@return void
	@example
ms.unregister();
	*/
	MediaServices.prototype.unregister = function() {
		var mediaService = this;
		var unregisterURL = mediaService._gwUrl + REGISTER_RESOURCE;
		
		logger.log("Deregistering...");
		
		this.state = MediaServices.State.UNREGISTERING;
		
		// Create a new logout request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("DELETE", unregisterURL, true);
		req.setRequestHeader("X-http-method-override", "DELETE");
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
		
		// On response
		req.onreadystatechange = function() {
			if (this.readyState == 4) {
				// Success response 204 No content
				if (this.status == 204) {
					mediaService._clean();
					
					logger.log("Deregistration successful");
					
					mediaService.state = MediaServices.State.CLOSED;
				} else {
					logger.log("Deregistration unsuccessful: " + this.status + " " + this.statusText);
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	TODO: is this function useful?
	*/
	MediaServices.prototype.anonymousSubscribe = function() {
		var mediaService = this;
		
		var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_ANONYMOUS 
			+ '/' + PRESENCE_RESOURCE_USER_SUBSCRIBE;
		
		logger.log("Anonymous subscribing...");
		
		var list = [];
		
		if (this._contactList) {
			for (var i in this._contactList.contact) {
				list.push("tel:+" + this._contactList.contact[i]._id);
			}
		}
		
		if (list.length == 0) {
			logger.log("No one to subscribe to");
			return;
		}
		
		var body = {
			entities : list
		};
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 202 Accepted
				if (req.status == 202) {
					logger.log("Anonymous subscribe successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Anonymous subscribe failed: " + json.reason);
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Obtain to the Presence information of your subscription list (contacts with follow relationship). Done automatically upon registration
	@function
	@return void
	@example
ms.subscribe();
	*/
	MediaServices.prototype.subscribe = function() {
		var mediaService = this;
		
		var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_SUBSCRIBE;
		
		logger.log("Subscribing...");
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 201 Created
				if (req.status == 201) {
					logger.log("Subscribe successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Subscribe failed: " + json.reason);
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Publish willingness, tagline and homepage
	@private
	*/
	MediaServices.prototype._publish = function(presenceData) {
		var mediaService = this;
		
		var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_PUBLISH;
		
		logger.log("Publishing services...");
		
		var body = {
			person : presenceData
		};
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 201 Created
				if (req.status == 201) {
					logger.log("Publish services successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Publish services failed: " + json.reason);
					
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Set the avatar for self.
	@function
	@param {File} avatar Image avatar file 
	@param {Function} [callback] Success/failure callback function
	@throws {TypeError} Invalid avatar file
	@return void
	@example
var avatar = document.getElementById("avatar");
ms.setAvatar(avatar.files[0], function(evt) {
	if (evt.success == true) {
		// Set avatar successful
	} else if (evt.failure == true) {
		// Set avatar unsuccessful
	}
});
	*/
	MediaServices.prototype.setAvatar = function(avatar, callback) {
		if (!(avatar instanceof File)) {
			throw new TypeError("Invalid avatar file");
		}
		if (avatar.type.indexOf("image") != 0) {
			throw new TypeError("Invalid avatar file");
		}
	
		var url = this._gwUrl + CONTENT_RESOURCE + '/' + CONTENT_RESOURCE_SETAVATAR;
		
		var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
		body.append("Filename", avatar.name);
		body.append("ClientId", this._sessionID);
		body.append("Filedata", avatar);
		body.append("Upload", "Submit Query");
		
		// Create and send a set avatar request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(body);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				var status = false;
				
				switch (req.status) {
					// Success response 201 Created (no previous avatar)
					case 201:
					// Success response 204 No Content
					case 204:
						logger.log("Set avatar successful");
						status = true;
				
						if (typeof(callback) == "function") {
							var event = {success : true, failure: false};
							callback(event);
						}
						break;
					default:
						var json = JSON.parse(req.responseText);
						logger.log("Set avatar failed: " + json.reason);
						
						if (typeof(callback) == "function") {
							var event = {success : false, failure: true};
							callback(event);
						}
						break;
				}
			}
		};
	};
	
	/**
	Delete the avatar for self.
	@function
	@return void
	@example
ms.deleteAvatar();
	*/
	MediaServices.prototype.deleteAvatar = function() {
		var mediaService = this;
		
		var url = this._gwUrl + CONTENT_RESOURCE + '/' + CONTENT_RESOURCE_DELETEAVATAR;
		
		// Create and send a set avatar request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("DELETE", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
	
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success respone 204 No Content
				if (req.status == 204) {
					logger.log("Delete avatar successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Delete avatar unsuccessful" + json.reason);
					
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Publish services. Done automatically upon successful registration.
	TODO: keep this private? We only publish the services the user used on registration.
	@private
	*/
	MediaServices.prototype._publishServices = function() {
		var mediaService = this;
		
		var url = this._gwUrl + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_USER + '/' + PRESENCE_RESOURCE_USER_PUBLISH;
		
		logger.log("Publishing services...");
		
		var _services = [];
		var tokens = this.mediaType.replace(/(\s)/g, "").split(",");
		
		// Check which services the user registered with and publish those
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i] == "audio") {
				var service = SERVICE.VOICE_CALL;
				service.serviceStatus = "open";
				_services.push(service);
			} else if (tokens[i] == "video") {
				var service = SERVICE.VIDEO_CALL;
				service.serviceStatus = "open";
				_services.push(service);
			} else if (tokens[i] == "ftp") {
				var service = SERVICE.FILE_TRANSFER;
				service.serviceStatus = "open";
				_services.push(service);
			} else if (tokens[i] == "chat") {
				var service = SERVICE.MESSAGING_SESSION_MODE;
				service.serviceStatus = "open";
				_services.push(service);
			} else {
				// Invalid service
				_services = [];
				break;
			}
		}
		
		if (_services.length < 1) {
			throw new Error("Invalid user services");
		}
		
		var body = {
			services : _services
		};
		
		// Create and send a publish services request
		var req = new _CreateXmlHttpReq(this._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 201 Created
				if (req.status == 201) {
					logger.log("Publish services successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Publish services failed: " + json.reason);
					
					_InternalError(mediaService, MediaServices.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Clean parameters on deregistration.
	@private
	*/
	MediaServices.prototype._clean = function() {
		// Clear channel
		this._channel = null;
		
		// Clear peer connection
		if (this._call) {
			if (this._call._pc && this._call._pc.close) {
				this._call._pc.close();
				this._call._pc = null;
			}
			delete this._call;
			this._call = null;
		}
		
		// Clear the FileTransfer hashmap
		if (this._ftp) {
			this._ftp.clear();
			delete this._ftp;
			this._ftp = null;
		}
		
		// Clear contact list
		if (this._contactList) {
			delete this._contactList;
			this._contactList = null;
		}
		
		// Clear Chat hashmap
		if (this._chat) {
			this._chat.clear();
			delete this._chat;
			this._chat = null;
		}
	};
	
	/**
	Creates a new outgoing call object to a given recipient. The Call will be initialised, but will not ring until the {@link OutgoingCall#ring} method is called.
	@function
	@param {String} recipient An identifier denoting the callee. This can be a WebID, a SIP URI or a tel: URI
	@param {Object} [mediaType] Defines the getUserMedia() type of the Call. If specified, must be of format {audio:true} or {video:true} or {audio:true,video:true}. If unspecified, inherits the full set of media types of the MediaServices object.
	@return {OutgoingCall} A newly initialised OutgoingCall object
	@throws {Error} Recipient must be defined, and must be a string
	@throws {Error} Invalid media types
	@example
var call = ms.createCall("user2", {video:true});
call.onaddstream = function(evt) {};
call.onbegin = function(evt) {};
call.onend = function(evt) {};
call.onerror = function(evt) {};
call.onremovestream = function(evt) {};
call.onstatechange = function(evt) {};
call.ring();
	*/
	MediaServices.prototype.createCall = function(recipient, mediaType) {
		if (typeof(recipient) != "string" || recipient == "")
			throw new Error("Recipient must be defined, and must be a string");
		logger.log("MediaServices.prototype.createCall.... " );
		mediaType = _ParseMediaType(this, mediaType);
		this._isModerator = true;
		
		this._call = new OutgoingCall(this, recipient, mediaType);
		this._call._url = this._gwUrl + AUDIOVIDEO_RESOURCE;
		
		return this._call;
	};

	/**
	Creates a new conference object. The Conference object will be ready to begin, join or query.
	@function
	@param {String} [mediaType] Specifies the getUserMedia() type of the conference. If specified, must be of format {audio:true} or {video:true} or {audio:true,video:true}. If unspecified, inherits the full set of media types of the MediaServices object.
	@param {String} [confID] Identifies the conference ID to be joined (if already existing). If this parameter is absent, a new conference must be created but not joined.
	@return {Conference} A newly initialised Conference object
	@throws {Error} The conference must be named
	@throws {Error} Invalid media types
	@example
var conf = ms.createConference({audio:true});
conf.onaddstream = function(evt) {};
conf.onbegin = function(evt) {};
conf.onend = function(evt) {};
conf.onerror = function(evt) {};
conf.onremovestream = function(evt) {};
conf.onstatechange = function(evt) {};
conf.begin();
	*/
	MediaServices.prototype.createConference = function(mediaType, confID) {
		mediaType = _ParseMediaType(this, mediaType);
		
		var url = this._gwUrl + CONFERENCE_RESOURCE;

		this._call = new Conference(this, confID, url, mediaType);
		this._isModerator = true;
		
		return this._call;
	};
	
	/**
	Creates a new OutgoingFileTransfer object to a destination user.
	@function
	@param {String} destination The recipient of this file transfer. The destination has to be a Tel URI (e.g. tel:+491728885008) or Sip URI (e.g. sip:491728885008@mns.ericsson.ca).
	@return {OutgoingFileTransfer} A new OutgoingFileTransfer object
	@throws {Error} Invalid destination
	@example
var ftp = service.createFileTransfer("tel:+491728885008");
ftp.onstatechange = function(evt) {};
ftp.onerror = function(evt) {};
ftp.onuploadprogress = function(evt) {};
ftp.sendFile(file.files[0]);
	*/
	MediaServices.prototype.createFileTransfer = function(destination) {
		if (typeof(destination) != "string" || destination == "")
			throw new Error("Invalid destination");
		
		var ft = new OutgoingFileTransfer(this, destination);
		ft._url = this._gwUrl + FILETRANSFER_RESOURCE;
		
		return ft;
	};
	
	/**
	Creates a new chat session with a given recipient. The Chat object will be initialised.
	@function
	@param {String} recipient An identifier denoting the recipient of the message. This can be a WebID, a SIP URI or a TEL URI.
	@return {Chat} A newly initialised Chat object.
	@throws {Error} Invalid recipient
	@example
var chat = service.createChat("sip:491728885004@mns.ericsson.ca");
chat.onbegin = function(evt) {};
chat.onmessage = function(evt) {};
chat.oncomposing = function(evt) {};
chat.onerror = function(evt) {};
chat.onstatechange = function(evt) {};
	*/
	MediaServices.prototype.createChat = function(recipient){
		if (typeof(recipient) != "string" || recipient == "" || recipient == this.username)
			throw new Error("Invalid recipient");
		
		var chat = new Chat(this, recipient);
		
		chat._url = this._gwUrl + CHAT_RESOURCE;
		
		return chat;
	};
	
	/**
	Creates a new group chat object with a given subjet and a list of members. Invitations to join the group chat will be sent upon calling {GroupChat#start}.
	@function
	@param {String} subject The subject title of this group chat conference
	@param {Array} members A list of members to be invited to this group chat session
	@return {GroupChat} A newly initialised GroupChat object.
	@throws {Error} Invalid subject
	@throws {Error} Invalid recipients
	@throws {Error} No recipients
	@example
var groupchat = service.createGroupChat("This is a new group chat!", ["sip:491728885004@mns.ericsson.ca", "sip:491728885005@mns.ericsson.ca"]);
groupchat.onbegin = function(evt) {};
groupchat.onmessage = function(evt) {};
groupchat.oncomposing = function(evt) {};
groupchat.onerror = function(evt) {};
groupchat.onstatechange = function(evt) {};
groupchat.onupdate = function(evt) {};
groupchat.onend = function(evt) {};
groupchat.start();
	*/
	MediaServices.prototype.createGroupChat = function(subject, members) {
		if (typeof(subject) != "string" || subject == "") {
			throw new Error("Invalid subject");
		}
		if (typeof(members) != "object" || !members || members.length == 0) {
			throw new Error("Invalid recipients");
		}
		
		if (members.indexOf(this.username) > -1) {
			members.splice(members.indexOf(this.username), 1);
			if (members.length == 0)
				throw new Error("No recipients");
		}
		
		var groupChat = new GroupChat(this, subject, members, this.username);
		
		groupChat._url = this._gwUrl + GROUP_CHAT_RESOURCE;
		groupChat._isOwner = true;
		
		return groupChat;
	};
	
	// Callback functions for MediaServices
	/**
	Called when the MediaServices object is ready to use.
	@event 
	@type function
	@param evt
	@example
ms.onready = function(evt) {
	// Media service is ready to use.
};
	*/
	MediaServices.prototype.onready = function(evt){}; // The MediaServices object is ready to use
	
	/**
	Called when MediaServices has encountered an error
	@event 
	@type function
	@param evt Error event
	@param {String} evt.type "error"
	@param {MediaServices.Error} evt.reason Error code
	@param {MediaServices} evt.target Proximal event target
	@example
var ms = new MediaServices(...);
ms.onerror = function(evt) {
	switch (evt) {
		case MediaServices.Error.NETWORK_FAILURE:
			// Handle
			break;
		case MediaServices.Error.INVALID_CREDENTIALS:
			// Handle
			break;
		// ...
	}
};
	*/
	MediaServices.prototype.onerror = function(evt){}; // An error occurred. See the event for details.
	
	/**
	Called when the MediaServices object has closed in an orderly fashion.
	@event 
	@type function
	@param evt
	@example
ms.onclose = function(evt) {
	// Media service has closed properly.
};
	*/
	MediaServices.prototype.onclose = function(evt){}; // The session has ended and this MediaServices object is no longer available to use
	
	/**
	Called when MediaServices changes its state.
	@event
	@type function
	@param evt Event describing the state change
	@param {Call.State} evt.newState New state
	@param {Call.State} evt.oldState Old state
	@example
ms.onstatechange = function(evt) {
	switch (evt.newState) {
		case MediaServices.State.INITIALISED:
			// Call state has changed to READY
			break;
		case MediaServices.State.REGISTERING:
			// Call state has changed to ENDED
			break;
		// ...
	}
};
	*/
	MediaServices.prototype.onstatechange = function(evt){}; // The MediaServices object has changed state
	
	/**
	Called when the MediaServices object receives a remote media event such as an incoming call, a conference invitation, a file transfer request, a chat message or a group chat request.
	@event
	@type function
	@param evt
	@param {IncomingCall} evt.call An IncomingCall object
	@param {Conference} evt.conf A Conference object
	@param {IncomingFileTransfer} evt.ftp An IncomingFileTransfer object
	@param {Chat} evt.chat A Chat object
	@param {GroupChat} evt.groupChat A GroupChat object
	@example
ms.oninvite = function(evt) {
	if (evt.call) {
		// We have an incoming call
		// This is a regular IncomingCall object that can be freely manipulated.
		evt.call.answer();
	} else if (evt.conf) {
		// Invited to a conf
		evt.conf.join();
	} else if (evt.ftp) {
		evt.ftp.accept();
		// or
		evt.ftp.cancel();
	} else if (evt.chat) {
		evt.chat.onbegin = function() {};
		evt.chat.onmessage = function() {};
	} else if (evt.groupChat) {
		evt.groupChat.accept();
		// or
		evt.groupChat.decline();
	}
};
	*/
	MediaServices.prototype.oninvite = function(evt){}; // An invitation to a call/conference has been received
	
	/**
	Call is a generic handler for calls. The abstract Call object handles signaling and termination of calls. These calls
	can be sessions to a conference or to another user. This is a private constructor.
	@class Call is a generic handler for calls and includes all methods for dealing with an ongoing call. The abstract Call 
	object can handle signaling and termination of calls.  These calls can be sessions to a conference or to another user. 
	For outgoing calls to other recipients, see {@link OutgoingCall}. For incoming calls from other users, see {@link IncomingCall}. <br />
	@property {Call.state} state The call's current state (read only).
	@property {MediaStream[]} localStreams Contains a list of local streams being sent on this call (read only).
	@property {MediaStream[]} remoteStreams Contains a list of remote streams being received on this call (read only).
	@property {String} mediaType Type of media for this call. This field can be changed until media has been established.
	@param {MediaServices} mediaServices The object that created this Call object.
	@param {String} recipient Call recipient
	@param {String} mediaType Media types supported in this call (e.g. "audio", "video" or "audio,video").
	*/
	Call = function(mediaServices, recipient, mediaType) {
		var _state;
		
		/**
		@field mediaType
		Call media type 
		*/
		Object.defineProperty(this, "mediaType", {
			get: function() { return mediaType; },
			set: function(newType) { 
				if (this._pc != null) 
					throw "Cannot change media type after established media.";
				mediaType = newType;
			}
		});

		/**
		@field state
		Call state
		*/
		Object.defineProperty(this, "state", {
			get: function()
			{
				return _state;
			},
			
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				if (typeof(this.onstatechange) == "function")
					this.onstatechange(evt);
					
				// Dispatch appropriate states
				switch (newState) {
					case Call.State.RINGING:
						if (this instanceof IncomingCall) {
							var evt = { call: this, conf: null };
							if (typeof(mediaServices.oninvite) == "function") { mediaServices.oninvite(evt); }
						}
						break;
					case Call.State.ENDED:
					case Conference.State.ENDED:
						if (typeof(this.onend) == "function") { this.onend(evt); }
						break;
					case Call.State.ONGOING:
					case Conference.State.IN_PROGRESS:
						if (typeof(this.onbegin) == "function") { this.onbegin(evt); }
						break;
					default:
						break;
				}
			}
		});

		/**
		@field remoteStreams
		Remote streams of the call
		*/
		Object.defineProperty(this, "remoteStreams", {
			get: function() {
				if (this._pc) { return this._pc.remoteStreams; }
				else { return []; }
			}
		});

		/**
		@field localStreams
		Local streams of the call
		*/
		Object.defineProperty(this, "localStreams", {
			get: function() {
				if (this._pc) { return this._pc.localStreams; }
				else { return []; }
			}
		});
		
		/**
		Call/conference recipients
		@private
		*/
		this.recipient = recipient;
		
		/**
		Media service object
		@private
		*/
		this._mediaServices = mediaServices;
		
		/**
		Base URL including session ID ("baseURL"/"sessionID"/)
		@private
		*/
		this._url = null;
		
		/**
		A reference to the local PeerConnection object. The call re-exposes the relevant elements.
		@private
		*/
		this._pc = null;
		
		/**
		Current call ID
		@private
		*/
		this._callID = null;
		
		/**
		Remote SDP object
		@private
		*/
		this._sdp = {};
		
		/**
		Array of Ice candidates
		@private
		*/
		this._candidates = [];
		
		/**
		Has OFFER been sent
		@private
		*/
		this._isSignalingSent = false;
		
		/**
		Mod ID
		@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
		@private
		*/
		this._DEPRECATEDmodID = null;
		
		/**
		ROAP handling object
		@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
		@private
		*/
		this._DEPRECATEDroap = new _DEPRECATEDRoap();
	};
	
	/**
	@namespace Describes the possible states of the call object.
	*/
	Call.State = {};
	
	/**
	Notifies that call object is ready for outgoing calls
	*/
	Call.State.READY = 0;
	
	/**
	Notifies that call object is ringing; an incoming call needs to be answered or an outgoing call needs the remote side to answer
	*/
	Call.State.RINGING = 1;
	
	/**
	Notifies that call object is in progress and media is flowing
	*/
	Call.State.ONGOING = 2;
	
	/**
	Notifies that call object has ended normally; the call was terminated in an expected and controlled manner
	*/
	Call.State.ENDED = 3;
	
	/**
	Notifies that call object has ended with an error; the call was terminated in an unexpected manner (see {@link Call.Error} for more details)
	*/
	Call.State.ERROR = 4;
	
	/**
	@namespace Describes the possible errors of the call object.
	*/
	Call.Error = {};
	
	/**
	General network failure
	*/
	Call.Error.NETWORK_FAILURE = 0;
	
	/**
	Peer Connection setup failure
	*/
	Call.Error.PEER_CONNECTION = 1;
	
	/**
	Webkit media error
	*/
	Call.Error.USER_MEDIA = 2;

	Call.prototype.getStringState = function(astate) {
	switch (astate) {
	case Call.State.READY:
		return "READY";
		break;
	case Call.State.RINGING:
		return "RINGING";
		break;
	case Call.State.ONGOING:
		return "ONGOING";
		break;
	case Call.State.ENDED:
		return "ENDED";
		break;

	default:
		return "ERROR";
		break;
	}
	};
	
	/**
	Terminates all media in the call. This can be called at any time
	@return void
	@throws {Error} No active call to end
	@example
call.end();
	*/
	Call.prototype.end = function() {
		var _call = this;
		var audiovideoURL = this._url + '/' + this._callID;
		
		logger.log("Leaving call...");
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("DELETE", audiovideoURL, true);
		req.setRequestHeader("X-http-method-override", "DELETE");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No content
				if (req.status == 204) {
					logger.log("Leave call successful");
					
					// Clear moderator flag
					_call._mediaServices._isModerator = null;
					
					_call.state = Call.State.ENDED;
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Leave call unsuccessful: " + json.reason);
					
					// 403 Forbidden, Call-ID does not exist
					if (req.status == 403) {
						throw new Error("No active call to end");
					} else {
						_InternalError(_call, Call.Error.NETWORK_FAILURE);
					}
				}
			}
		};
		
		if (this._pc && this._pc.close)
			this._pc.close();
		this._pc = null;
	};
	
	/**
	Creates a Peer Connection and triggers signaling when ready
	@private
	*/
	Call.prototype._createPeerConnection = function(callback) {
		var mt = this;
		logger.log("in createPeerConnection ");
		
		if (typeof(webkitPeerConnection00) == "undefined")
			throw "This is not Chrome 21+";
			
		// Get the user's media
		navigator.webkitGetUserMedia(mt.mediaType, function(stream) {
			// Create new PeerConnection
			mt._pc = new webkitPeerConnection00(mt._mediaServices.turnConfig, function(candidate, moreToFollow) {
				// Get all candidates before signaling
				if (candidate) {
					mt._sdp.sdp.addCandidate(candidate);
				}
				
				if (!moreToFollow && !mt._isSignalingSent) {
					mt._sendSignaling(mt._sdp.type, mt._sdp.sdp.toSdp());
					
					mt._isSignalingSent = true;
				}
			});
			
			// Add the local stream
			mt._pc.addStream(stream);
			
			// Propagate the event
			mt._pc.onaddstream = function(evt) { if (typeof(mt.onaddstream) == "function") { evt.call = mt; mt.onaddstream(evt);} };
			mt._pc.onremovestream = function(evt) { logger.log("ONREMOVESTREAM"); if (typeof(mt.onremovestream) == "function")  { evt.call = mt; mt.onremovestream(evt);} };
			mt._pc.onclose = function() { mt.onend(); };
			mt._pc.onopen = function() { mt.state = Call.State.ONGOING; };
			
			if (typeof(callback) === "function") {
				callback();
			}
		}, function(error) {
			logger.log("Error obtaining user media: " + error.toString());
			
			var callType = (mt instanceof Conference) ? Conference : Call;
			_InternalError(callType, callType.Error.USER_MEDIA);
		});
	};
	
	/**
	H2S signalling
	@private
	*/
	Call.prototype._sendSignaling = function(type, sdp) {
		var _call = this;
		var url = this._url;
		
		var callType = (_call instanceof Conference) ? Conference : Call;
		
		if (type == "OFFER") {
			logger.log("Sending OFFER");
			
			if (this instanceof Conference && !this.confID) {
				var body = _ParseSDP(null, sdp);
				
				// Starting a new conference
				var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
				
				req.open("POST", url, true);
				req.setRequestHeader("Content-Type", "application/json");
				req.setRequestHeader("Accept", "application/json, text/html");
				req.send(JSON.stringify(body, null, " "));
				req.onreadystatechange = function() {
					if (req.readyState == 4) {
						
						var json = JSON.parse(req.responseText);
						
						// Success response 202 Accepted
						if (req.status == 202) {
							// Get the conference ID
							var tokens = json.resourceURL.split("/");
							var index = tokens.indexOf("mediaconf");
							_call.confID = tokens[index + 1];
							
						} else {
							_InternalError(_call, _call.Error.NETWORK_FAILURE);
						}
					}
				};
			} else {
				// Audio video invite
				var body = _ParseSDP(this.recipient, sdp);
				
				var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
				//if(!this._mediaServices._isModerator){
				//	url= url + "/mod";
				//}				
				req.open("POST", url, true);
				req.setRequestHeader("Content-Type", "application/json");
				req.setRequestHeader("Accept", "application/json, text/html");
				req.send(JSON.stringify(body, null, " "));
			
				// On response
				req.onreadystatechange = function() {
					if (req.readyState == 4) {
						var json = JSON.parse(req.responseText);
						
						// Success response 201 Created
						if (req.status == 201) {
							logger.log("Audio video invite: " + json.state);
						} else if (req.status == 202) {
							// TODO: remove eventually, this is what is returned from webrtc_trial branch
						} else {
							logger.log("Audio video invite unsuccessful: " + json.reason);
							
							if (req.status == 400) {
								throw new Error("User not found");
							} else {
								_InternalError(_call, _call.Error.NETWORK_FAILURE);
							}
						}
					}
				};
			}
		} else if (type == "ANSWER") {
			logger.log("Sending ANSWER");
			
			if (this instanceof Conference) {
				url += "/" + this.confID;
			} else {
				url += "/" + this._callID;
			}
			
			var body = _ParseSDP(null, sdp);
			
			var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
			
			req.open("POST", url, true);
			req.setRequestHeader("Content-Type", "application/json");
			req.setRequestHeader("Accept", "application/json, text/html");
			req.send(JSON.stringify(body, null, " "));
			
			// On response
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					var json = JSON.parse(req.responseText);
					
					// Success response 200 OK
					if (req.status == 200) {
						logger.log("Accept invite: " + json.state);
					} else {
						logger.log("Accept invite unsuccessful: " + json.reason);
						
						_InternalError(_call, _call.Error.NETWORK_FAILURE);
					}
				}
			};
		}
	};
	
	/**
	Create offer
	@private
	*/
	Call.prototype._doOffer = function() {
		// Create offer
		var offer = this._pc.createOffer(this.mediaType);
		this._pc.setLocalDescription(this._pc.SDP_OFFER, offer);
		
		// Start Ice
		this._pc.startIce();
		
		this._sdp.type = "OFFER";
		this._sdp.sdp = offer;
	};
	
	/**
	Create answer
	@private
	*/
	Call.prototype._doAnswer = function() {
		var sd = new SessionDescription(this._sdp.sdp);
		
		// Receive offer
		this._pc.setRemoteDescription(this._pc.SDP_OFFER, sd);
		
		// Create answer
		var answer = this._pc.createAnswer(this._pc.remoteDescription.toSdp(), this.mediaType);
		this._pc.setLocalDescription(this._pc.SDP_ANSWER, answer);
		
		// Start Ice
		this._pc.startIce();
		
		this._sdp.type = "ANSWER";
		this._sdp.sdp = answer;
		
		// Process Ice candidates
		for (index in this._candidates) {
			var candidate = new IceCandidate(this._candidates[index].label, this._candidates[index].candidate);
			this._pc.processIceMessage(candidate);
		}
	};
	
	/**
	Creates a Peer Connection and triggers signaling when ready
	@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
	@private
	*/
	Call.prototype._DEPRECATEDcreatePeerConnection = function(callback, roapMessage) {
		var mt = this;
		
		console.log("Creating DEPRECATED PC");
			
		if (navigator.vendor != "Google Inc.")
		{
			console.log("Non-google vendor");
			mt._pc = new webkitDeprecatedPeerConnection(mt._mediaServices.turnConfig, function(sig) {
					logger.log("turnConfig: " + mt._mediaServices.turnConfig + "   sig: " + sig);
					mt._DEPRECATEDsendSignaling(sig, function(event) {
						if (typeof(callback) == "function") {
							callback(event);
						}
					});
			});
		}
		
		var gum = function() {
		navigator.webkitGetUserMedia((mt.mediaType.video ? "audio,video" : "audio"), function(stream) {
			try {
			
				if (navigator.vendor == "Google Inc.")
				{
				console.log("Google vendor");
				mt._pc = new webkitDeprecatedPeerConnection(mt._mediaServices.turnConfig, function(sig) {
				
					logger.log("turnConfig: " + mt._mediaServices.turnConfig + "   sig: " + sig);
					mt._DEPRECATEDsendSignaling(sig, function(event) {
						if (typeof(callback) == "function") {
							callback(event);
						}
					});
				});
				}
			} catch (e) {	
				mt._pc = new webkitPeerConnection00(mt._mediaServices.turnConfig, function(sig) {
					logger.log("turnConfig: " + mt._mediaServices.turnConfig + "   sig: " + sig);
					mt._DEPRECATEDsendSignaling(sig, function(event) {
						if (typeof(callback) == "function") {
							callback(event);
						}
					});
				});
			}
			console.log("Add local stream");
			
			// Add the local stream
			mt._pc.addStream(stream);
			
			// Propagate the event
			mt._pc.onaddstream = function(evt) { if (typeof(mt.onaddstream) == "function") { evt.call = mt; mt.onaddstream(evt);} };
			mt._pc.onremovestream = function(evt) { logger.log("ONREMOVESTREAM"); if (typeof(mt.onremovestream) == "function")  { evt.call = mt; mt.onremovestream(evt);} };
			mt._pc.onclose = function() { mt.onend(); };
			mt._pc.onopen = function() { mt.state = Call.State.ONGOING; };
			logger.log("Event propagated");
			
			if (roapMessage) {
				// Signal the ANSWER
				console.log("Submitting signalling");
				mt._pc.processSignalingMessage(roapMessage);
			}
		}, function(error) {
			logger.log("Error obtaining user media: " + error.toString());
			
			var callType = (mt instanceof Conference) ? Conference : Call;
			_InternalError(mt, callType.Error.USER_MEDIA);
		});
		
		};
		
		if (navigator.vendor != "Google Inc.")
			setTimeout(gum, 0);
		else
			gum();
	};
	
	/**
	H2S signalling
	@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
	@private
	*/
	Call.prototype._DEPRECATEDsendSignaling = function(sig, callback) {
		var _call = this;
		var roap = this._DEPRECATEDroap.parseROAP(sig);
		var url = this._url;
		var callType = (_call instanceof Conference) ? Conference : Call;
		logger.log("Roap Message Type: " + roap.messageType);
		if (roap.messageType == "OFFER") {
			logger.log("Got OFFER");
			
			if (roap.seq == 2)
			{
				logger.log("SEQ == 2; should generate auto-answer (I guess?)");
				var roapMessage = _call._DEPRECATEDroap.processRoapAnswer(_call._mediaServices, _call._DEPRECATEDroap._lastSdp, true);
				_call._pc.processSignalingMessage(roapMessage);
				return;
			}
			
			if (this instanceof Conference && !this.confID) {
				// Starting a new conference
				var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
				
				req.open("POST", url, true);
				req.setRequestHeader("Content-Type", "application/json");
				req.setRequestHeader("Accept", "application/json, text/html");
				req.send(JSON.stringify(roap.SDP, null, " "));
				req.onreadystatechange = function() {
					if (req.readyState == 4) {
						
						var json = JSON.parse(req.responseText);
						
						// Success response 202 Accepted
						if (req.status == 202) {
							// Get the conference ID
							var tokens = json.resourceURL.split("/");
							var index = tokens.indexOf("mediaconf");
							_call.confID = tokens[index + 1];
							
							var event = {success : true, failure: false};
							callback(event);
						} else {
							var event = {success : false, failure: true};
							callback(event);
						}
					}
				};
			} else {
				// Audio video invite
				var body = {
					to : this.recipient,
					sdp : roap.SDP.sdp,
					v : roap.SDP.sdp.v,
					o : roap.SDP.sdp.o,
					s : roap.SDP.sdp.s,
					t : roap.SDP.sdp.t
				};
				
				var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
//				if(!this._mediaServices._isModerator){
//					//var roapsdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
//					var remotesdp= roap.SDP.sdp;
//					for(mediaIndex in roap.SDP.sdp) {
//					   if(roap.SDP.sdp[mediaIndex].c == ""){
//						  roap.SDP.sdp[mediaIndex].c= "IN IP4 10.10.0.55";
//					   }
//					}
//
//					body.v= "0";
//					body.o= "- 0 0 IN IP4 127.0.0.1";
//					body.s= "";
//					body.t= "0 0";
//					
//					url= url + "/" + this._mediaServices._call._callID;// + "/mod";
//				}				
//				
				var stringBody= JSON.stringify(body, null, " ");
//				stringBody= stringBody.replace("RTP/AVPF", "RTP/AVP");
//				stringBody= stringBody.replace("ulpfec", "H264");
//				logger.log("about to send SDP: " + stringBody);

				req.open("POST", url, true);
				req.setRequestHeader("Content-Type", "application/json");
				req.setRequestHeader("Accept", "application/json, text/html");
				req.send(stringBody);
			
				// On response
				req.onreadystatechange = function() {
					if (req.readyState == 4) {
						var json = JSON.parse(req.responseText);
						
						// Success response 202 Accepted
						if (req.status == 202 || req.status == 201) {
							logger.log("Audio video invite: " + json.state);
						} else {
							logger.log("Audio video invite unsuccessful: " + req.status + " " + json.reason);
							
							if (req.status == 400) {
								throw new Error("User not found");
							} else {
								_InternalError(_call, callType.Error.NETWORK_FAILURE);
							}
						}
					}
				};
			}
		} else if (roap.messageType == "ANSWER") {
			logger.log("Got ANSWER");
			
			if (this instanceof Conference) {
				url += "/" + this.confID;
			} else {
				url += "/" + this._callID;
			}
			
			if (this._modID) {
			        url += "/mod/" + this._modID;
			}
			
			var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
							
			var stringBody= JSON.stringify(roap.SDP, null, " ");
//			stringBody= stringBody.replace("RTP/AVPF", "RTP/AVP");
//			stringBody= stringBody.replace("ulpfec", "H264");
//			logger.log("about to send SDP: " + stringBody);
//
			req.open("POST", url, true);
			req.setRequestHeader("Content-Type", "application/json");
			req.setRequestHeader("Accept", "application/json, text/html");
			req.send(stringBody);
			
			// On response
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					var json = JSON.parse(req.responseText);
					
					// Success response 200 OK
					if (req.status == 200) {
						logger.log("Accept invite: " + json.state);
					} else {
						logger.log("Accept invite unsuccessful: " + json.reason);
						_InternalError(_call, callType.Error.NETWORK_FAILURE);
					}
				}
			};
		} else if (roap.messageType == "OK") {
			logger.log("Got OK");
			
			if (_call instanceof Conference) {
				_call.state = callType.State.IN_PROGRESS;
			} else {
				_call.state = callType.State.ONGOING;
			}
		} else {
			logger.log("Got ERROR");
			logger.log(roap);
			throw new Error("Failed to setup peer connection");
		}
	};
	
	/**
	Called when the Call object changes its state.
	@event
	@type function
	@param evt An event describing the state change
	@param {String} evt.type "statechange"
	@param {Call.State} evt.newState The new state
	@param {Call.State} evt.oldState The old state
	@example
call.onstatechange = function(evt) {
	switch (evt.newState) {
		case Call.State.READY:
			// Call state has changed to READY
			break;
		case Call.State.ENDED:
			// Call state has changed to ENDED
			break;
		// ...
	}
};
	*/
	Call.prototype.onstatechange = function(evt){};
	
	/**
	Called when the call has begun, the call has started and media is now flowing.
	@event
	@type function
	@param evt
	@example
call.onbegin = function(evt) {
	// Call has begun
};
	*/
	Call.prototype.onbegin = function(evt){};
	
	/**
	Called when the call has ended. Media will no longer be flowing as the call was terminated.
	@event
	@type function
	@param evt
	@example
call.onend = function(evt) {
	// Call has ended
};
	*/
	Call.prototype.onend = function(evt){};
	
	/**
	Called when a remote stream is added.
	@event
	@type function
	@param evt An event containing the call object with localStreams and remoteStreams.
	@param {MediaStream} evt.stream The stream that was added.
	@param {Call} evt.call Call object containing the local and remote media streams list.
	@param {MediaStream[]} evt.call.localStreams Local media stream list.
	@param {MediaStream[]} evt.call.remoteStreams Remote media streams list.
	@example
var call = service.createCall(...);
call.onaddstream = function(evt) {
	if (evt.call.localStreams) {
		// Do stuff with the list of local media stream
	}
	if (evt.call.remoteStreams) {
		// Do stuff with the list of remote media stream
	}
};
	*/
	Call.prototype.onaddstream = function(evt){};
	
	/**
	Called when a remote stream is removed.
	@event
	@type function
	@param evt An event containing the call object with localStreams and remoteStreams.
	@param {MediaStream} evt.stream The stream that was removed.
	@param {MediaStream[]} evt.call.localStreams Local media stream list
	@param {MediaStream[]} evt.call.remoteStreams Remote media streams list
	@example
call.onremovestream = function(evt) {
	if (evt.call.localStreams) {
		// Perform actions with the list of local media stream.
	}
	if (evt.call.remoteStreams) {
		// Perform actions with the list of remote media stream.
	}
};
	*/
	Call.prototype.onremovestream = function(evt){};
	
	/**
	Called when the call has encountered an error. The call has encountered an unexpected behavior.
	@event
	@type function
	@param evt Error event
	@param {String} evt.type "error"
	@param {Call.Error} evt.reason Error code
	@param {Object} evt.target Proximal event target
	@example
call.onerror = function(evt) {
	switch (evt.reason) {
		case Call.Error.NETWORK_FAILURE:
			// Handle
			break;
		case Call.Error.PEER_CONNECTION:
			// Handle
			break;
		// ...
	}
};
	*/
	Call.prototype.onerror = function(evt){};
	
	/**
	The OutgoingCall objects can be used to initiate calling.
	@class <p>OutgoingCall objects are created by {@link MediaServices#createCall} and are used to initiate calls to other parties.</p>
	@extends Call
	@param {MediaServices} mediaServices Object that created this Call object.
	@param {String} recipient Call recipient
	@param {String} mediaType Media types supported in this call (i.e. "audio", "video" or "audio,video")
	*/
	OutgoingCall = function(mediaServices, recipient, mediaType) {
		// call parent constructor
		Call.prototype.constructor.call(this, mediaServices, recipient, mediaType);
		
		this.state = Call.State.READY;
		
		logger.log("OutgoingCall created");
	};
	
	OutgoingCall.prototype = new Call;
	OutgoingCall.prototype.constructor = OutgoingCall;
	
	/**
	Initiates the outgoing call, ringing the recipient.
	@function
	@return void
	@example
var call = ms.createCall("user2", "audio, video");
call.ring();
	*/
	OutgoingCall.prototype.ring = function() {
		var call = this;
		
		logger.log("OutgoingCall ringing...");
		
		try {
			this._createPeerConnection(function() {
				call._doOffer();
			});
		} catch (e) {
			console.log(e);
			this._DEPRECATEDcreatePeerConnection();
		}
		//this._DEPRECATEDcreatePeerConnection();
		this.state = Call.State.RINGING;
	};
	
	/**
	The IncomingCall objects are provided by MediaService on an incoming call. This is a private constructor.
	@class <p>The IncomingCall objects are provided by mediaServices on an incoming call and are used to answer them.</p>
	@extends Call
	@param {MediaServices} mediaServices Object that created this Call object.
	@param {String} recipient An identifier denoting the recipient; this can be a WebID, a SIP URI, or a tel: URI.
	@param {String} mediaType Media types supported in this conference (i.e. "audio", "video" or "audio,video").
	*/
	IncomingCall = function(mediaServices, recipient, mediaType) {
		mediaServices._isModerator= false;
		// call parent constructor
		Call.prototype.constructor.call(this, mediaServices, recipient, mediaType);
		
		/**
		Remote SDP
		@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
		@private
		*/
		this._DEPRECATEDsdp = null;
		
		this.state = Call.State.READY;
		
		logger.log("IncomingCall created");
	};
	
	IncomingCall.prototype = new Call;
	IncomingCall.prototype.constructor = IncomingCall;
	
	/**
	Acknowledges an incoming call and establishes media. Note that if the mediaType of this call is to be changed, it must be changed before a call to answer().
	@function
	@return void
	@example
service.oninvite = function(evt) {
	if (evt.call) {
		evt.call.answer();
	}
};
	*/
	IncomingCall.prototype.answer = function() {
		var call = this;
		try {
			this._createPeerConnection(function() {
				call._doAnswer();
			});
		} catch (e) {
			var roapMessage = this._DEPRECATEDroap.processRoapOffer(this._mediaServices, this._DEPRECATEDsdp);
			
			this._DEPRECATEDcreatePeerConnection(null, roapMessage);
		}
	};
	
	// Internal constructor.
	/**
	The Conference object allows interaction with a conference. It includes joining, leaving, ending, and moderating the conference (adding/removing participants).
	A conference object can only be created with {@link MediaServices#createConference} or {@link MediaServices}.oninvite.
	<p>
	The Conference object can be treated as a Call for the purposes of media control. It will elicit the same events for the purposes of a client joining the conference.
	Even if a client has access to a Conference object, it does not imply this client is a participant of the conference. Indeed the client can
	still use the other Conference methods like the moderator functions. Therefore a client can be the moderator of a conference in which he is not participating.</p>
	<p>This is a private constructor.</p>
	@class <p>The Conference object allows interaction with a conference, including joining, leaving, ending, and moderating the conference (adding/removing participants).
	A conference object can only be created with {@link MediaServices#createConference} or {@link MediaServices}.oninvite.
	<p>The Conference object can be treated as a Call for the purposes of media control. It will elicit the same events for the purposes of a client joining the conference.
	Even if a client has access to a Conference object, it does not imply this client is a participant of the conference. Indeed the client can
	still use the other Conference methods like the moderator functions. Therefore a client can be the moderator of a conference in which he is not participating.</p>
	@extends Call
	@property {Conference.State} confState The current state of the conference itself (read only).
	@property {String} confID The ID of this conference.
	@param {MediaServices} mediaServices The object that created this Conference object.
	@param {String} confId the ID of this conference.
	@param {String} url The URL to the MediaGateway.
	@param {String} mediaType The media types supported in this conference (e.g. "audio", "video" or "audio,video").
	@protected
	*/
	Conference = function(mediaServices, confId, url, mediaType) {
		Object.defineProperty(this, "confID", {
			get: function() {return confId;},
			set: function(newType) {confId = newType;}
		});
	
		Call.prototype.constructor.call(this, mediaServices, confId, mediaType);
		
		// Change the URL of the object. This will make the Call methods use the Conference URL for their method calls (signaling, etc)
		this._url = url;
		this.state = Conference.State.NEW;
		
		logger.log("Conference created");
	};
	
	/**
	@namespace Describes the possible states of the conference object. 
	*/
	Conference.State = {};
	
	/**
	This is a new Conference object and it has not yet been started; the begin() method should be called to begin this new conference.
	*/
	Conference.State.NEW = 0;
	
	/**
	The Conference object is in progress and users may join; the conference is ongoing.
	*/
	Conference.State.IN_PROGRESS = 2;
	
	/**
	The Conference object has ended; the conference was terminated in an expected and controlled manner.
	*/
	Conference.State.ENDED = 3;
		
	/**
	The Conference object has ended unexpectedly with an error; the conference was terminated in an unexpected manner (see {@link Conference.Error} for more details).
	*/
	Conference.State.ERROR = 4;
	
	/**
	@namespace Describes the possible errors of the conference object.
	*/
	Conference.Error = {};
	
	/**
	General network failure.
	*/
	Conference.Error.NETWORK_FAILURE = 0;
	
	/**
	Peer Connection setup failure
	*/
	Conference.Error.PEER_CONNECTION = 1;
	
	// Import all methods from Call
	Conference.prototype = new Call;
	Conference.prototype.constructor = Conference;
	
	/**
	Leaves the conference.
	@function
	@return void
	@throws {Error} No active conference to leave
	@example
conf.leave();
	*/
	Conference.prototype.leave = function() {
		var _conf = this;
		var conferenceURL = this._url + '/' + this.confID;
		
		logger.log("Leaving conference: " + this.confID + "...");
				
		// Create and send a leave conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("DELETE", conferenceURL, true);
		req.setRequestHeader("X-http-method-override", "DELETE");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				
				// Success response 202
				if (req.status == 204) {
					logger.log("End conference successful!");
					
					_conf.state = Conference.State.ENDED;
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("End conference unsuccessful: " + json.reason);
					
					if (req.status == 403) {
						throw new Error("No active conference to leave");
					} else {
						_InternalError(_conf, Conference.Error.NETWORK_FAILURE);
					}
				}
			}
		};
		
		if (this._pc && this._pc.close)
			this._pc.close();
		this._pc = null;
	};
	
	/**
	Joins the conference. Join a conference by establishing media according to the previous parameters.
	@function
	@return void
	@throws {Error} Invalid conference ID.
	@example
var conf = createConference(..., "confID");
conf.join(); // Joins conference with confID
	*/
	Conference.prototype.join = function() {
		var conf = this;
		
		logger.log("Joining conference: " + this.confID + "...");
		
		if (this.confID == "" || typeof(this.confID) != "string") {
			throw new Error("Invalid conference ID");
		}
		
		this.recipient = "conf:" + this.confID;
		
		try {
			this._createPeerConnection(function() {
				conf._doAnswer();
			});
		} catch (e) {
			this._DEPRECATEDcreatePeerConnection();
		}
	};
	
	/**
	Ends the conference. All participants are removed and new ones are unallowed to join. The caller must be authorized to moderate the conference to do so.
	@function
	@return void
	@example
conf.end();
	*/
	Conference.prototype.end = function() {
		// TODO: remove all users from the conference before leaving
		
		this.leave();
	};
	
	/**
	Forcibly removes a user from the conference.
	@function
	@param {String} user Specifies the name, SIP or tel URI of the user to be removed from the conference.
	@param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the user was removed or not.
	@return void
	@throws {TypeError} Invalid user
	@example
conf.removeUser("test2", function(evt) {
	if (evt.success) {
		// User has been removed successfully
	} else if (evt.failure) {
		// Removing user has failed due to evt.reason
	}
});
	*/
	Conference.prototype.removeUser = function(user, callback) {
		var _conf = this;
		var conferenceURL = this._url + '/' + this.confID + '/' + CONFERENCE_RESOURCE_REMOVE;
		
		logger.log("Removing participant " + user + " from conference " + this.confID + "...");
		
		if (typeof(user) != "string") {
			throw new TypeError("Invalid user");
		} else {
			var body = {
				members : [user]
			};
			
			// Create and send a remove user request
			var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
			
			req.open("POST", conferenceURL, true);
			req.setRequestHeader("Content-Type", "application/json");
			req.setRequestHeader("Accept", "application/json, text/html");
			req.send(JSON.stringify(body, null, " "));
		
			// On response
			req.onreadystatechange = function() {
				if (req.readyState == 4) {
					
					// Success response 202
					if (req.status == 202) {
						logger.log("Remove participant successful!");
						
						if (typeof(callback) == "function") {
							var event = {success : true, failure: false};
							callback(event);
						}
					} else {
						var json = JSON.parse(req.responseText);
						
						logger.log("Remove participant unsuccessful: " + json.reason);
						
						if (typeof(callback) == "function") {
							var event = {success : false, failure: true};
							callback(event);
						}
					}
				}
			};
		}
	};
	
	/**
	Adds a user to the conference.
	@function
	@param {String} user Defines the name, SIP or tel URI of the user to be added to the conference.
	@param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the user was added or not.
	@return void
	@throws {Error} Invalid user
	@example
conf.addUser("test2", function(evt) {
	if (evt.success) {
		// User has been added successfully
	} else if (evt.failure) {
		// Adding user has failed due to evt.reason
	}
});
	*/
	Conference.prototype.addUser = function(user, callback) {
		var _conf = this;
		var conferenceURL = this._url + '/' + this.confID + '/' + CONFERENCE_RESOURCE_ADD;
		
		logger.log("Adding participant " + user + " to conference " + this.confID + "...");
		
		if (typeof(user) != "string" || user == "") {
			throw new Error("Invalid user");
		} else {
			var body = {
				members : [user]
			};
			
			// Create and send an add participant request
			var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
			
			req.open("POST", conferenceURL, true);
			req.setRequestHeader("Content-Type", "application/json");
			req.setRequestHeader("Accept", "application/json, text/html");
			req.send(JSON.stringify(body, null, " "));
		
			// On response
			req.onreadystatechange = function() {
				if (req.readyState == 4) {
					// Success response 202
					if (req.status == 202) {
						logger.log("Add participant successful");
						
						if (typeof(callback) == "function") {
							var event = {success : true, failure: false};
							callback(event);
						}
					} else {
						var json = JSON.parse(req.responseText);
						logger.log("Add participant unsuccessful: " + json.reason);
						
						if (typeof(callback) == "function") {
							var event = {success : false, failure: true};
							callback(event);
						}
					}
				}
			};
		}
	};
	
	/**
	Begins the conference. The moderator automatically joins the conference on success.
	@function
	@param {function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the conference has successfully started or not.
	@return void
	@example
var conf = service.createConference(...);
conf.begin(function(evt) {
	if (evt.success == true) {
		// Conference has started successfully
	} else if (evt.failure == true) {
		// Conference has failed due to evt.reason
	}
)};
	*/
	Conference.prototype.begin = function(callback) {
		logger.log("Conference beginning...");
		var conf = this;
		
		try {
			this._createPeerConnection(function() {
				conf._doOffer();
			});
		} catch (e) {
			this._DEPRECATEDcreatePeerConnection(function(status) {
				if (typeof(callback) == "function") {
					callback(status);
				}
			});
		}
	};
	
	/**
	File Transfer contains information associated to the current file transfer session. This is a private constructor.
	@class <p>File Transfer contains information associated to the current file transfer session. A file transfer session can be initiated by 
	calling {@link MediaServices#createFileTransfer} and then {@link OutgoingFileTransfer#sendFile} which sends a file transfer request to the destination. </p>
	<p>Upon the recipient accepting, the file will be uploaded on the sending side and downloaded on the receiving side automatically.</p>
	@property {FileTransfer.state} state The file transfer's current state (read only).
	@property {String} name File name (read only).
	@property {String} size File size in bytes (read only).
	@property {String} type File type (read only).
	@param {MediaServices} mediaServices The object that created this File Transfer object.
	*/
	FileTransfer = function(mediaServices) {
		var _state = FileTransfer.State.IDLE;
		
		this._url = null;
		this._mediaServices = mediaServices;
		this._fileName = null;
		this._fileSize = null;
		this._fileType = null;
		this._id = null;
		
		/**
		@field state
		*/
		Object.defineProperty(this, "state", {
			get: function()
			{
				return _state;
			},
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				if (typeof(this.onstatechange) == "function")
					this.onstatechange(evt);
					
				switch (newState) {
					case FileTransfer.State.INVITATION_RECEIVED:
						var evt = { call: null, conf: null, ftp: this };
						if (typeof(mediaServices.oninvite) == "function") { mediaServices.oninvite(evt); }
						break;
					case FileTransfer.State.DOWNLOAD_COMPLETE:
						var evt = { ftp: this };
						if (typeof(this.onreceivedfile) == "function") { this.onreceivedfile(evt); }
					default:
						break;
				}
			}
		});
		
		/**
		@field name
		*/
		Object.defineProperty(this, "name", {
			get: function() { return this._fileName; }
		});
		
		/**
		@field size
		*/
		Object.defineProperty(this, "size", {
			get: function() { return this._fileSize; }
		});
		
		/**
		@field type
		*/
		Object.defineProperty(this, "type", {
			get: function() { return this._fileType; }
		});
	};
	
	/**
	Cancels an active file transfer or rejects a file transfer invitation.
	@function
	@return void
	@throws {Error} No active file transfer session
	@example
ftp.cancel();
	*/
	FileTransfer.prototype.cancel = function() {
		var url = this._url + '/' + FILETRANSFER_RESOURCE_TERMINATE + '/' + this._id;
		var ft = this;
		
		if (!this._id || this.state == FileTransfer.State.UPLOAD_COMPLETE ||
			this.state == FileTransfer.State.DOWNLOAD_COMPLETE) {
			throw new Error("No active file transfer session");
		}
		
		logger.log("Terminating file transfer...");
		
		// Create and send a cancel file transfer request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No Content
				if (req.status == 204) {
					logger.log("File transfer terminated");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("File transfer termination failed: " + json.reason);
					
					_InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	// Callback functions for MediaServices
	/**
	Called when FileTransfer changes its state.
	@event
	@type function
	@param evt Event describing the state change
	@param {FileTransfer.State} evt.newState New state
	@param {FileTransfer.State} evt.oldState Old state
	@example
ftp.onstatechange = function(evt) {
	switch (evt.newState) {
		case FileTransfer.State.INVITATION_SENT:
			// FileTransfer state has changed to INVITATION_SENT
			break;
		case FileTransfer.State.UPLOADING:
			// FileTransfer state has changed to UPLOADING
			break;
		// ...
	}
};
	*/
	FileTransfer.prototype.onstatechange = function(evt) {};
	
	/**
	Called when FileTransfer has encountered an error.
	@event
	@type function
	@param evt Error event
	@param {String} evt.type "error"
	@param {Call.Error} evt.reason Error code
	@param {Object} evt.target Proximal event target
	@example
ftp.onerror = function(evt) {
	switch (evt.reason) {
		case FileTransfer.Error.NETWORK_FAILURE:
			// Handle
			break;
		// ...
	}
};
	*/
	FileTransfer.prototype.onerror = function(evt) {};
	
	/**
	@namespace Describes the possible states of the FileTransfer object.
	*/
	FileTransfer.State = {};
	
	/**
	FileTransfer is idle and ready to be used.
	*/
	FileTransfer.State.IDLE = 0;
	
	/**
	A file transfer invitation has been sent.
	*/
	FileTransfer.State.INVITATION_SENT = 1;
	
	/**
	A file transfer invitation has been received
	*/
	FileTransfer.State.INVITATION_RECEIVED = 2;
	
	/**
	A file is currently being uploaded to the server.
	*/
	FileTransfer.State.UPLOADING = 3;
	
	/**
	A file is currently being downloaded from the server.
	*/
	FileTransfer.State.DOWNLOADING = 4;
	
	/**
	A file transfer upload has completed successfully.
	*/
	FileTransfer.State.UPLOAD_COMPLETE = 5;
	
	/**
	A file transfer download has completed successfully.
	*/
	FileTransfer.State.DOWNLOAD_COMPLETE = 6;
	
	/**
	A file transfer has been canceled or rejected.
	*/
	FileTransfer.State.CANCELED = 7;
	
	/**
	The file transfer has encountered an error. See {@link FileTransfer.Error} for more details
	*/
	FileTransfer.State.ERROR = 8;
	
	/**
	@namespace Describes the possible errors of the FileTransfer object.
	*/
	FileTransfer.Error = {};
	
	/**
	General network failure.
	*/
	FileTransfer.Error.NETWORK_FAILURE = 0;
	
	/**
	File size is larger than the limit
	*/
	FileTransfer.Error.FILE_SIZE_LIMIT = 1;
	
	/**
	The user cannot be found
	*/
	FileTransfer.Error.INVALID_USER = 2;
	
	/**
	The file transfer timed out
	*/
	FileTransfer.Error.TIMEOUT = 3;
	
	/**
	The OutgoingFileTransfer objects can be used to initiate a file transfer.
	@class <p>OutgoingFileTransfer objects are created by {@link MediaServices#createFileTransfer} and are used to initiate file transfer requests to other parties.</p>
	@extends FileTransfer
	@param {MediaServices} mediaServices Object that created this FileTransfer object.
	@param {String} destination File transfer destination (recipient).
	@property {String} to Outgoing file transfer recipient (read only).
	@property {File} file Reference to the current file being transfered (read only).
	*/
	OutgoingFileTransfer = function(mediaServices, destination) {
		FileTransfer.prototype.constructor.call(this, mediaServices);
		
		var _destination = destination;
		this._file = null;
		
		/**
		@field to
		Upload destination
		*/
		Object.defineProperty(this, "to", {
			get: function() { return _destination; }
		});
		
		/**
		@field file
		*/
		Object.defineProperty(this, "file", {
			get: function() { return this._file; }
		});
	};
	
	/**
	Called when a file upload is in progress.
	@event
	@type function
	@param evt
	@param {Number} evt.loaded The amount of bytes uploaded.
	@param {Number} evt.total The total amount of bytes to be uploaded.
	@example
ftp.onuploadprogress = function(evt) {
	console.log(event.loaded / event.total * 100 + "%");
};
	*/
	OutgoingFileTransfer.prototype.onuploadprogress = function(evt) {};
	
	OutgoingFileTransfer.prototype = new FileTransfer;
	OutgoingFileTransfer.prototype.constructor = OutgoingCall;
	
	/**
	Sends a file transfer request to the destination. The file will be automatically uploaded on acceptance.
	@function
	@return void
	@param {File} file A reference to the file being sent.
	@throws {TypeError} Invalid file
	@example
var file = document.getElementById("file");
ftp.sendFile(file.files[0]);
	*/
	OutgoingFileTransfer.prototype.sendFile = function(file) {
		if (!(file instanceof File)) {
			throw new TypeError("Invalid file");
		}
		
		var ft = this;
		this._file = file;
		this._fileType = file.type;
		this._fileName = file.name;
		this._fileSize = file.size;
		
		var url = this._url + '/' + FILETRANSFER_RESOURCE_SEND;
		
		logger.log("Initiating file transfer...");
		
		var body = {
			to : this.to,
			contentdisposition : "attachment",
			contenttype : this.type,
			filename : this.name,
			filesize : this.size
		};
		
		// Create and send a file transfer request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				var json = JSON.parse(req.responseText);
				// Success response 202 Accepted
				if (req.status == 202) {
					logger.log("File invitation sent, ID: " + json.ftId + ", state: " + json.state);
					
					ft.state = FileTransfer.State.INVITATION_SENT;
					
					// Put it in the hashmap
					ft._mediaServices._ftp.put(json.ftId, ft);
				} else {
					logger.log("File invitation failed: " + json.reason);
					
					_InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	H2S REST request for uploading a file. Upload occurs automatically upon acceptance.
	@function
	@return void
	@private
	*/
	OutgoingFileTransfer.prototype._uploadFile = function() {
		var url = this._url + '/' + FILETRANSFER_RESOURCE_UPLOAD + '/' + this._id;
		var ft = this;
		
		ft.state = FileTransfer.State.UPLOADING;
			
		logger.log("Uploading file...");
		
		// The body is a multipart/form-data payload
		var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
		body.append("Filename", this._fileName);
		body.append("ClientId", this._mediaServices._sessionID);
		body.append("Filedata", this._file);
		body.append("Upload", "Submit Query");
		
		// Create and send a file upload request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.upload.addEventListener("progress", function(evt) {
			var event = { "loaded": evt.loaded, "total": evt.total };
			ft.onuploadprogress(event);
		}, false);
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(body);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No Content
				if (req.status == 204) {
					logger.log("File uploaded");
					
					if (ft.state != FileTransfer.State.CANCELED) {
						ft.state = FileTransfer.State.UPLOAD_COMPLETE;
					}
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("File upload failed: " + json.reason);
					
					if (ft.state != FileTransfer.State.CANCELED &&
						ft.state != FileTransfer.State.ERROR) {
						ft.state = FileTransfer.State.CANCELED;
					}
				}
			}
		};
	};
	
	/**
	The IncomingFileTransfer objects are provided by MediaService on an incoming file transfer request. This is a private constructor.
	@class <p>The IncomingFileTransfer objects are provided by MediaService on an incoming file transfer request.</p>
	@extends FileTransfer
	@param {MediaServices} mediaServices Object that created this FileTransfer object.
	@param {String} from Initiator of file transfer.
	@property {String} rawData Raw data received (read only).
	@property {String} data Base 64 encoded data uri of the file (read only).
	@property {String} from Initiator of file transfer (read only).
	*/
	IncomingFileTransfer = function(mediaServices, from) {
		FileTransfer.prototype.constructor.call(this, mediaServices);
		
		this._from = from;
		this._rawData = null;
		this._data = null;
		
		/**
		@field Raw data received.
		*/
		Object.defineProperty(this, "rawData", {
			get: function() { return this._rawData; }
		});
		
		/**
		@field Base 64 encoded data received.
		*/
		Object.defineProperty(this, "data", {
			get: function() { return this._data; }
		});
		
		/**
		@field File transfer initiator
		*/
		Object.defineProperty(this, "from", {
			get: function() { return this._from; }
		});
		
	};
	
	/**
	Called when a file download is in progress.
	@event
	@type function
	@param evt
	@param {Number} evt.loaded The amount of bytes downloaded.
	@param {Number} evt.total The total amount of bytes to download.
	@example
ftp.ondownloadprogress = function(evt) {
	console.log(event.loaded / event.total * 100 + "%");
};
	*/
	IncomingFileTransfer.prototype.ondownloadprogress = function(evt) {};
	
	/**
	Called when the file transfer has finished (when the file has been fully downloaded).
	@event
	@type function
	@param evt
	@param {IncomingFileTransfer} evt.ftp The IncomingFileTransfer object.
	@param {String} evt.ftp.rawData Raw bit stream of the file.
	@param {String} evt.ftp.data Data URI of the file in base 64.
	@example
call.onreceivedfile = function(evt) {
	// Do stuff with evt.ftp.data
};
	*/
	IncomingFileTransfer.prototype.onreceivedfile = function(evt) {};
	
	IncomingFileTransfer.prototype = new FileTransfer;
	IncomingFileTransfer.prototype.constructor = IncomingFileTransfer;
	
	/**
	Accept an incoming file transfer invitation. The file will be automatically downloaded afterwards.
	@function
	@return void
	@throws {Error} No active file transfer session
	@example
ms.oninvite = function(evt) {
	if (evt.ftp) {
		evt.ftp.accept();
	}
};
	*/
	IncomingFileTransfer.prototype.accept = function() {
		if (this.state == FileTransfer.State.UPLOAD_COMPLETE ||
				this.state == FileTransfer.State.DOWNLOAD_COMPLETE) {
			throw new Error("No active file transfer session");
		}
		
		var url = this._url + '/' + FILETRANSFER_RESOURCE_ACCEPT + '/' + this._id;
		var ft = this;
		
		logger.log("IncomingFileTransfer accepting...");
		
		// Create and send an accept file transfer request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 201 Created
				if (req.status == 201) {
					logger.log("IncomingFileTransfer accepted");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("IncomingFileTransfer accept failed: " + json.reason);
					
					_InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	H2S REST request for downloading a file. Download occurs automatically when ready.
	@function
	@return void
	@private
	*/
	IncomingFileTransfer.prototype._downloadFile = function() {
		var url = this._url + '/' + FILETRANSFER_RESOURCE_GETFILE + '/' + this._id;
		var ft = this;
		var loaded = null;
		
		ft.state = FileTransfer.State.DOWNLOADING;
		
		logger.log("Downloading file...");
		
		// Create and send a download file transfer request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.addEventListener("progress", function(evt) {
			var event = { "loaded": evt.loaded, "total": ft.size };
			loaded = evt.loaded;
			ft.ondownloadprogress(event);
		}, false);
		req.open("GET", url, true);
		req.overrideMimeType("text/plain; charset=x-user-defined");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 200) {
					if (ft.state != FileTransfer.State.CANCELED && ft.state != FileTransfer.State.ERROR) {
						// We have a response and we are in a non-failure state
						if (req.responseText && loaded == ft.size) {
							// req.responseText is a binary stream of the file received
							ft._rawData = req.responseText;
							ft._data = 'data:' + ft.type + ';base64,' + _Base64encode(req.responseText);
							
							ft.state = FileTransfer.State.DOWNLOAD_COMPLETE;
						} else {
							if (ft.state != FileTransfer.State.CANCELED &&
									ft.state != FileTransfer.State.ERROR) {
								ft.state = FileTransfer.State.CANCELED;
							}
						}
					}
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Downloading file failed: " + json.reason);
					
					_InternalError(ft, FileTransfer.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Chat is a generic handler for a one-to-one chat. Chat allows the user to send and receive chat messages, 
	media messages (50 kB images), is-composing (typing) events. A Chat object can only be created by {@link MediaServices#createChat}. 
	This is a private constructor.
	@class Chat is a generic handler for a one-to-one chat. Chat allows the user to send and receive chat messages, 
	media messages (50 kB images), is-composing (typing) events. A Chat object can only be created by {@link MediaServices#createChat}. 
	This is a private constructor. <br />
	@property {Chat.State} state The chat session's current state (readonly).
	@property {String} recipient The recipient of this chat session (readonly).
	@param {MediaServices} mediaServices The parent MediaServices instance.
	@param {String} recipient The chat message recipient.
	*/
	Chat = function(mediaServices, recipient) {
		var _state = Chat.State.NEW;
		this._mediaServices = mediaServices;
		
		/**
		@field state
		The state of the call
		*/
		Object.defineProperty(this, "state", {
			get: function()
			{
				return _state;
			},
			
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				if (typeof(this.onstatechange) == "function")
					this.onstatechange(evt);
					
				if ((newState == Chat.State.ACTIVE || newState == GroupChat.State.IN_PROGRESS) && typeof(this.onbegin) == "function")
					this.onbegin(evt);
				if (newState == GroupChat.State.ENDED && typeof(this.onend) == "function")
					this.onend(evt);
			}
		});
		
		/**
		@field recipient
		The recipient of the chat session
		*/
		Object.defineProperty(this, "recipient", {
			get: function() { return this._recipient; }
		});
		
		/**
		Chat message recipient
		@private
		*/
		this._recipient = recipient;
		
		/**
		Lock used to determine if the user can send an is-composing request, or has to wait
		@private
		*/
		this._composingWait = false;
		
		/**
		The base URL including session ID ("baseURL"/"sessionID"/)
		@private
		*/
		this._url = null;
	};
	
	/**
	@namespace Describes the states of the chat object.
	*/
	Chat.State = {};
	
	/**
	A new Chat object has been initialised
	*/
	Chat.State.NEW = 0;
	
	/**
	A chat session is considered active when the chat initiator has sent at least 1 message to the recipient.
	Typing/idle is-composing events and media messages can only be sent in this state.
	*/
	Chat.State.ACTIVE = 1;
	
	/**
	The Chat object has encountered an error
	*/
	Chat.State.ERROR = 3;
	
	/**
	@namespace Describes the possible errors of the Chat object.
	*/
	Chat.Error = {};
	
	/**
	General network failure
	*/
	Chat.Error.NETWORK_FAILURE = 0;
	
	/**
	The recipient is an invalid user
	*/
	Chat.Error.INVALID_USER = 1;
	
	/**
	The recipient is offline and is unable to receive chat messages
	*/
	Chat.Error.USER_NOT_ONLINE = 2;
	
	/**
	Sends a chat message to the recipient. This function can be called at any time once a Chat object has been created.
	@function
	@return void
	@param {String} body The message to be sent.
	@throws {Error} No body
	@example
var chat = service.createChat("sip:491728885004@mns.ericsson.ca");
chat.send("Hello world!");
	*/
	Chat.prototype.send = function(body) {
		var chat = this;
		
		if(!body || typeof(body) != "string"){
			throw new Error("No body");
		}
		
		logger.log("Sending message...");
		
		var messageURL = this._url + '/' + CHAT_RESOURCE_SEND;
		
		// Clear the composing wait lock
		chat._composingWait = false;
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var message = null;
		if (this instanceof GroupChat) {
			message = {
				confId : this.confID,
				body : body
			};
		} else {
			message = {
				to : this.recipient,
				body : body,
				contentType : "text/plain",
				type : "session-message"
			};
		}
			
		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				var json = JSON.parse(req.responseText);
				// Success response 200 OK for Chat
				if (req.status == 200) {
					logger.log("Send message successful: msgId " + json.msgId);
					
					// Put the current Chat/GroupChat object in the HashMap
					if (chat.recipient) {
						if (!chat._mediaServices._chat.get(chat.recipient)) {
							chat._mediaServices._chat.put(chat.recipient, chat);
						}
					}
				}
				// Success response 202 Accepted for GroupChat
				else if (req.status == 202) {
					logger.log("Send message successful: msgId " + json.msgId);
				} else {
					if (req.status == 400) {
						_InternalError(chat, Chat.Error.INVALID_USER);
					} else {
						_InternalError(chat, Chat.Error.NETWORK_FAILURE);
					}
				}
			}
		};
		
	};
	
	/**
	Sends a typing is-composing notification to the other user(s)
	@function
	@return void
	@throws {Error} Unable to send composing event until the chat session is active
	@example
object.onkeypress = function() {
	chat.typing();
};
	*/
	Chat.prototype.typing = function() {
		// Don't send an is composing event if another one has been sent recently
		if (!this._composingWait && (this.state == Chat.State.ACTIVE || this.state == GroupChat.State.IN_PROGRESS)) {
			this._composingWait = true;
			this._sendComposing("active", 10);
		}
	};
	
	/**
	Sends an idle is-composing notification to the other user(s)
	@function
	@return void
	@throws {Error} Unable to send composing event until the chat session is active
	@example
chat.idle();
	*/
	Chat.prototype.idle = function() {
		// Send an idle if it was in the composing state
		if (this._composingWait && (this.state == Chat.State.ACTIVE || this.state == GroupChat.State.IN_PROGRESS)) {
			this._sendComposing("idle", 10);
			this._composingWait = false;
		}
	};
	
	/**
	Sends an is-composing event.
	@param {String} state "active" if typing, "idle" if not typing
	@param {Number} timer Refresh timer
	@throws {Error} Invalid state
	@private
	*/
	Chat.prototype._sendComposing = function(state, timer) {
		var chat = this;

		if (this.state != Chat.State.ACTIVE) {
			throw new Error("Unable to send composing event until the chat session is active");
		}
		if (state != "active" && state != "idle") {
			// Shouldn't happen
			throw new Error("Invalid state");
		}
		
		var messageURL = this._url + '/' + CHAT_RESOURCE_SEND_ISCOMPOSING;
		
		logger.log("Sending is-composing...");
		
		// Create and send a chat is composing request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var body = null;
		if (this instanceof GroupChat) {
			body = {
				confId : this.confID,
				state : state,
				refresh : timer
			};
		} else {
			body = {
				to : this.recipient,
				state : state,
				refresh : timer,
				contentType : "text/plain"
			};
		}			
			
		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No content
				if (req.status == 204) {
					logger.log("Sending is-composing successful");
					
					// Timer to prevent user from sending another request until timer expires
					setTimeout(function() { chat._composingWait = false; }, timer * 1000);
				} else {
					logger.log("Sending is-composing unsuccessful");
					
					var json = JSON.parse(req.responseText);
					
					if (req.status == 403 && json.reason == "no active session") {
						throw new Error("No active chat session");
					} else {
						_InternalError(chat, Chat.Error.NETWORK_FAILURE);
					}
				}
			}
		};
	};
	
	
	/**
	Sends a media message to the recipient. The media file is restricted to image file types and a maximum size of 50 kB.
	This method can only be called when the Chat object is in the active state. Larger file transfers should be handled with {@link FileTransfer}.
	@function
	@return void
	@param {File} file A reference to the media image file being sent.
	@throws {TypeError} Invalid file type
	@throws {Error} Unable to send a media message until the chat session is active
	@throws {Error} Media size too large
	@throws {Error} No active chat session
	@example
chat.sendMedia(file.files[0]);
	*/
	Chat.prototype.sendMedia = function(file) {
		var _chat = this;

		if (!(file instanceof File)) {
			throw new TypeError("Invalid file type");
		}
		if (this.state != Chat.State.ACTIVE || this.state != GroupChat.State.IN_PROGRESS) {
			throw new Error("Unable to send a media message until the chat session is active");
		}
		if (file.type.indexOf("image") == -1) {
			// We only accept image file types
			throw new TypeError("Invalid file type");
		}
		if (file.size > MAX_MEDIA_SIZE) {
			throw new Error("Media size too large, maximum: " + MAX_MEDIA_SIZE + " current: " + file.size);
		}
		
		logger.log("Sending media message...");
		
		var url = "";
		if (this instanceof GroupChat) {
			url = this._url + '/' + GROUP_CHAT_RESOURCE_SEND_MEDIA + this.confID;
		} else {
			url = this._url + '/' + CHAT_RESOURCE_SEND_MEDIA + this.recipient;
		}
		
		// The body is a multipart/form-data payload
		var body = new FormData(); // Chrome 7+, Firefox 4+, Internet Explorer 10+, Safari 5+
		body.append("Filename", file.name);
		body.append("ClientId", this._mediaServices._sessionID);
		body.append("Filedata", file);
		body.append("Upload", "Submit Query");	
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(body);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				var json = JSON.parse(req.responseText);
				// Success response 200 OK
				if (req.status == 200) {
					// Chat
					logger.log("Send media message successful: msgId " + json.msgId);
				} else if (req.status == 202) {
					// Group chat
					logger.log("Send media message successful: msgId " + json.msgId);
				} else {
					logger.log("Send media message unsuccessful");

					if (req.status == 403) {
						// 403 Forbidden with reason: "no active session"
						throw new Error("No active chat session");
					} else if (req.status == 413) {
						// File size too big (shouldn't happen)
						throw new Error(json.reason);
					} else {
						_InternalError(_chat, Chat.Error.NETWORK_FAILURE);
					}
				}
			}
		};
	};
	
	/**
	Retrieve the media message. This is done automatically upon media message channel event.
	@private
	*/
	Chat.prototype._getMedia = function(id, from) {
		var chat = this;
		var url = this._url + '/' + CHAT_RESOURCE_GET_MEDIA + id;
		
		logger.log("Getting media message...");
		
		// Create and send an add contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("GET", url, true);
		req.overrideMimeType("text/plain; charset=x-user-defined");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 200) {
					logger.log("Get media message successful");
					
					var mediaType = req.getResponseHeader("Content-Type");
					var evt = {
						from : from,
						type : mediaType,
						media : 'data:' + mediaType + ';base64,' + _Base64encode(req.responseText),
						size : req.getResponseHeader("Content-Length")
					};
					
					chat.onmessage(evt);
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Get media message unsuccessful: " + json.reason);
					_InternalError(_chat, Chat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Called when the Chat object changes its state.
	@event
	@type function
	@param evt An event describing the state change.
	@param {String} evt.type "statechange".
	@param {Chat.State} evt.newState New state.
	@param {Chat.State} evt.oldState Old state.
	@example
chat.onstatechange = function(evt) {
	switch (evt.newState) {
		case Chat.State.ACTIVE:
			// Chat state has changed to ACTIVE
			break;
		case Chat.State.ERROR:
			// Chat state has changed to ERROR
			break;
		// ...
	}
};
	*/
	Chat.prototype.onstatechange = function(evt) {};
	
	/**
	Called when the Chat object has begun and is in the active state. Sending and receiving of message/media/is-composing events can occur.
	@event
	@type function
	@param evt
	@example
chat.onbegin = function(evt) {
	// Chat has begun
};
	*/
	Chat.prototype.onbegin = function(evt) {};
	
	/**
	Called when a message is received in the event channel. The message can be either a chat message or media message.
	@event
	@type function
	@param evt An event containing a message or a media message
	@param {String} evt.from Composer of the message
	@param {String} [evt.message] Text message body
	@param {String} [evt.type] Media message type (jpeg, gif, png, etc)
	@param {String} [evt.media] Media message content (base 64 encoded data URI format)
	@param {String} [evt.size] Media message size in bytes
	@example
chat.onmessage = function(evt) {
	if (evt.message) {
		// Chat message
	} else if (evt.media) {
		// Media message
	}
};
	*/
	Chat.prototype.onmessage = function(evt) {};
	
	/**
	Called when a message has not been sent properly. TODO: Note that this is not implemented yet.
	@event
	@type function
	@param evt
	*/
	Chat.prototype.onmessagefailure = function(evt) {};
	
	/**
	Called when an is-composing message is received in the event channel
	@event
	@type function
	@param evt
	@param {String} evt.from Is-composing event originator
	@param {String} evt.state One of "active" (user is currently typing) or "idle" (user has stopped typing)
	@param {Number} evt.refresh The timer, in seconds, associated to this is-composing event. For example, an is-composing icon could be displayed for evt.refresh amount of time.
	@example
chat.oncomposing = function(evt) {
	if (evt.state == "active") {
		// User 'evt.from' is currently typing
	} else if (evt.state == "idle") {
		// User 'evt.from' has stopped typing
	}
};
	*/
	Chat.prototype.oncomposing = function(evt) {};
	
	/**
	Called when the Chat object has encountered an error, the chat message was terminated in an unexpected manner.
	@event
	@type function
	@param evt Error event.
	@param {String} evt.type "error".
	@param {Chat.Error} evt.reason Error code.
	@param {Object} evt.target Proximal event target.
	@example
chat.onerror = function(evt) {
	switch (evt.reason) {
		case Chat.Error.NETWORK_FAILURE:
			// Handle
			break;
		case Chat.Error.INVALID_USER:
			// Handle
			break;
		// ...
	}
};
	*/
	Chat.prototype.onerror = function(evt) {};
	
	/**
	GroupChat is a generic handler for chatting in a conference. GroupChat allows for sending and receiving chat messages, media messages, is-composing events.
	GroupChat users are allowed to freely leave and rejoin the group chat session as long as there is still 1 connected member in the conference.
	The administrator (creator) can invite new members into this group chat by calling {@link GroupChat#add}. This is a private constructor.
	@class GroupChat is a generic handler for chatting in a conference. GroupChat allows for sending and receiving chat messages, media messages, is-composing events.
	GroupChat users are allowed to freely leave and rejoin the group chat session as long as there is still 1 connected member in the conference.
	The administrator (creator) can invite new members into this group chat by calling {@link GroupChat#add}. This is a private constructor. <br />
	@extends Chat
	@property {Boolean} isOwner returns true if the user is the creator of the GroupChat
	@property {GroupChat.State} state The group chat session's current state (readonly)
	@property {String} subject The subject of the group chat
	@property {String} confID The current group chat's identifier
	@property {Array} members An array of members and their state (invited, connected, disconnected)
	@param {MediaServices} mediaServices Object that created this GroupChat object
	@param {String} subject The subject of the group chat
	@param {Array} recipients The group chat invites
	@param {String} owner The identifier of the owner of this group chat conference
	@param {String} [confID] Include this parameter if joining an active conference
	*/
	GroupChat = function(mediaServices, subject, recipients, owner, confID) {
		var _subject = subject,
			_confID = confID;
	
		this._members = [];
		
		this._isOwner = false;
	
		Chat.prototype.constructor.call(this, mediaServices, recipients);
		
		Object.defineProperty(this, "isOwner", {
			get: function() { return this._isOwner; }
		});
		
		/**
		@field subject
		The subject of the group chat
		*/
		Object.defineProperty(this, "subject", {
			get: function() { return _subject; },
			set: function(newSubject) {_subject = newSubject;}
		});
		
		/**
		@field confID
		The current group chat's identifier
		*/
		Object.defineProperty(this, "confID", {
			get: function() { return _confID; },
			set: function(newConfID) {_confID = newConfID;}
		});
		
		/**
		@field members
		An array of members and their state
		*/
		Object.defineProperty(this, "members", {
			get: function() { return this._members; }
		});
	};
	
	// Import all methods from Chat
	GroupChat.prototype = new Chat;
	GroupChat.prototype.constructor = GroupChat;
	
	/**
	@namespace Describes the states of GroupChat
	*/
	GroupChat.State = {};
	
	/**
	The GroupChat session is new.
	*/
	GroupChat.State.NEW = 0;
	
	/**
	The GroupChat session is ready.
	*/
	GroupChat.State.IN_PROGRESS = 1;
	
	/**
	The GroupChat sesion has ended.
	*/
	GroupChat.State.ENDED = 2;
	
	/**
	The GroupChat object encountered an error (see {@link GroupChat.Error} for more details).
	*/
	GroupChat.State.ERROR = 3;
	
	/**
	@namespace Describes the error of a GroupChat session.
	*/
	GroupChat.Error = {};
	
	/**
	General network failure
	*/
	GroupChat.Error.NETWORK_FAILURE = 0;
	
	/**
	The initiator starts the group chat session by sending group chat invitations to the specified members.
	@return void
	@example
var groupchat = service.createGroupChat("This is a new group chat!", ["sip:491728885004@mns.ericsson.ca", "sip:491728885005@mns.ericsson.ca"]);
groupchat.start();
	*/
	GroupChat.prototype.start = function() {
		var groupChat = this;
		
		var messageURL = this._url + '/' + GROUP_CHAT_CREATE;
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var message = {
			members : this.recipient,
			subject : this.subject
		};
		
		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
		
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 No content
				if (req.status == 202) {
					
					// Extract the confID from JSON body
					var json = JSON.parse(req.responseText);
					var confId = json.confId;
					groupChat.confID = confId;					
					
					// Put it in the HashMap
					groupChat._mediaServices._chat.put(confId, groupChat);
					
					// Update all members as "invited"
					for (var i = 0; i < groupChat.recipient.length; i++) {
						groupChat.members.push({ entity: groupChat.recipient[i], status: "invited" });
					}
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Create group chat fail reason: " + json.reason);						
					_InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Leave the current group chat session.
	@return void
	@throws {Error} No active group chat session to leave
	@example
groupchat.leave();
	*/
	GroupChat.prototype.leave = function() {
		var groupChat = this;
		
		if (!this.confID) {
			throw new Error("No active group chat session to leave");
		}
		
		var messageURL = this._url + '/' + GROUP_CHAT_LEAVE;
		
		logger.log("Leaving group chat...");
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var body = {
			confId : this.confID
		};

		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 No content
				if (req.status == 204) {
					groupChat.state = GroupChat.State.ENDED;
					
					// Remove it from the HashMap
					groupChat._mediaServices._chat.remove(groupChat.confID);
					
					logger.log("Leave group chat successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Leave group chat unsuccessful: " + json.reason);				
					
					_InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Add a participant(s) to the current group chat session. Only the administrator should be able to do this.
	@return void
	@param {Array} members A list of members to be added to the group chat session.
	@throws {Error} Failed to add member in an ongoing group chat session, no new member defined
	@throws {Error} Not allowed to add participant you are not the owner of the conference
	@throws {Error} Unable to add existing member to chat
	@example
groupchat.add(["sip:491728885004@mns.ericsson.ca"]);
	*/
	GroupChat.prototype.add = function(members) {
		var _groupChat = this;

		if (typeof(members) != "object" || !members || members.length == 0) {
			throw new Error("Failed to add member in an ongoing group chat session, no new member defined");
		}
		if (!this._isOwner) {
			throw new Error("Not allowed to add participant you are not the owner of the conference");
		}
		
		var newMembers = [];
		// Check if members to add already exist in the active recipient list
		for (var i = 0; i < members.length; i++ ) {
			var member = members[i];
			
			for (var j = 0; j < this.members.length; j++) {
				if (this.members[j].entity.indexOf(member) == -1) {
					// Doesn't exist
					newMembers.push(member);
					break;
				}
			}
		}
		
		if (newMembers.length == 0) {
			throw new Error("Unable to add existing member to chat");
		}
		
		logger.log("Adding participants to group chat");
		
		var messageURL = this._url + '/' + GROUP_CHAT_ADD;
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
				
		var message = {
			confId : this.confID,
			members : newMembers
		};
		
		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No content
				if (req.status == 204) {
					logger.log("Add participant successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Add participant unsuccessful: " + json.reason);
					
					_InternalError(_groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Join is used to re-join a group chat session for which the user has previously left.
	@return void
	@throws {Error} Invalid conference ID
	@example
groupChat.join();
	*/
	GroupChat.prototype.join = function() {
		var groupChat = this;
		
		if (!this.confID || typeof(this.confID) != "string") {
			throw new Error("Invalid conference ID");
		}
		
		logger.log("Joining group chat " + this.confID + "...");
		
		var messageURL = this._url + '/' + GROUP_CHAT_JOIN;
		
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var message = {
			confId : this.confID
		};

		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 202 Accepted
				if (req.status == 202) {
					logger.log("Join successful");
					
					groupChat.state = GroupChat.State.IN_PROGRESS;
					
					groupChat._mediaServices._chat.put(groupChat.confID, groupChat);
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Join unsuccessful: " + json.reason);
					
					_InternalError(groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Accept an invitation to a group chat session. The user will automatically join the active conference and will be able to start sending messages.
	@return void
	@throws {Error} Unable to join group chat with invalid ID
	@example
service.oninvite = function(evt) {
	if (evt.groupChat) {
		evt.groupChat.accept();
	}
};
	*/
	GroupChat.prototype.accept = function() {
		var _groupChat = this;
		
		if (!this.confID) {
			throw new Error("Unable to join group chat with invalid ID");
		}
		
		logger.log("Accepting...");
		
		var messageURL = this._url + '/' + GROUP_CHAT_ACCEPT;
			
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		var message = {
			confId : this.confID
		};
		
		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
		
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 201) {
					logger.log("Accept successful");
					
					// Put it in the HashMap
					_groupChat._mediaServices._chat.put(_groupChat.confID, _groupChat);
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Accept unsuccessful: " + json.reason);
					
					_InternalError(_groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
		
	};
	
	/**
	Decline an invitation to a group chat session.
	@return void
	@throws {Error} Failed to decline invitation to group chat, no conferenceID
	@example
service.oninvite = function(evt) {
	if (evt.groupChat) {
		evt.groupChat.decline();
	}
};
	*/
	GroupChat.prototype.decline = function() {
		var groupChat = this;
		
		if (!this.confID) {
			throw new Error("Failed to decline invitation to group chat, no conferenceID");
		}
		
		logger.log("Declining group chat invite...");
		
		var messageURL = this._url + '/' + GROUP_CHAT_DECLINE;
			
		// Create and send a create conference request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
				
		var message = {
			confId : this.confID
		};

		req.open("POST", messageURL, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(message, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No content
				if (req.status == 204) {
					groupChat.state = GroupChat.State.ENDED;
					
					logger.log("Decline group chat invite successful");
					
					// Remove it from the HashMap
					groupChat._mediaServices._chat.remove(groupChat.confID);
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Decline group chat invite unsuccessful: " + json.reason);
					
					_InternalError(_groupChat, GroupChat.Error.NETWORK_FAILURE);
				}
			}
		};
	};
	
	/**
	Called when the GroupChat has ended
	@event
	@type function
	@param evt
	@example
groupchat.onend = function(evt) {
	// GroupChat has ended
};
	*/
	GroupChat.prototype.onend = function(evt) {};
	
	/**
	Called when a user has joined/left the current group chat session
	@event
	@type function
	@param evt
	@param {Array} evt.members Array of members and their state
	@param {String} evt.members.entity Identifier of member in the group chat
	@param {String} evt.members.status Status of the member ("invited", "connected", "disconnected")
	@example
groupchat.onupdate = function(evt) {
	// A crude example...
	if (evt.members[0].status == "disconnected") {
		alert(evt.members[0].entity + "has disconnected from the chat");
	}
}
	*/
	GroupChat.prototype.onupdate = function(evt) {};

	/**
	A new ContactList object is created upon registration, assuming the user has an address book. The user's ContactList can be accessed from 
	{@link MediaServices.contactList}.
	@class
	@param {MediaServices} mediaServices The parent MediaServices instance.
	@property {Number} size The size of the contact list
	@property {Array} contact An array of Contact objects
	@property {ContactList.State} state The state of the contact list
	@example
var contactList = service.contactList;
contactList.onstatechange = function(evt) {};
contactList.onready = function(evt) {};
contactList.onpresenceinvite = function(evt) {};
contactList.update();
contactList.getAllAvatars();
	*/
	ContactList = function(mediaServices) {
		var _state = ContactList.State.NEW;
		
		this._url = null;
		
		/**
		An array of Contact objects
		*/
		this._contacts = [];
		
		/**
		Current syncId, used for contact list requests
		*/
		this._syncId = null;
		
		/**
		Parent MediaServices object
		*/
		this._mediaServices = mediaServices;
		
		/**
		@field size
		Amount of Contacts in ContactList
		*/
		Object.defineProperty(this, "size", {
			get: function() { return this._contacts.length; }
		});
		
		/**
		@field contact
		Contact array
		*/
		Object.defineProperty(this, "contact", {
			get: function() { return this._contacts; }
		});
		
		/**
		@field state
		*/
		Object.defineProperty(this, "state", {
			get: function()
			{
				return _state;
			},
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				if (typeof(this.onstatechange) == "function")
					this.onstatechange(evt);
					
				// Dispatch appropriate states
				if (newState == ContactList.State.READY && typeof(this.onready) == "function")
					this.onready({ contactList : this });
				// else if (newState == ContactList.State.UPDATED && typeof(this.onupdate) == "function")
					// this.onupdate({ contactList : this });
			}
		});
	};
	
	/**
	@namespace Describes the states of the ContactList object.
	*/
	ContactList.State = {};
	
	/**
	The ContactList has been initialized.
	*/
	ContactList.State.NEW = 0;
	
	/**
	The ContactList has been updated and is ready.
	*/
	ContactList.State.READY = 1;
	
	/**
	The ContactList has encountered an error.
	*/
	ContactList.State.ERROR = 2;
	
	/**
	Retrieves the network address book
	@function
	@return void
	@example
service.contactList.update();
	*/
	ContactList.prototype.update = function() {
		var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS;
		
		if (this._syncId) {
			// TODO: uncomment below
			// url += '?syncId=' + this._syncId;
		}
		
		logger.log("Updating contact list...");
		
		// Create and send an update contact list request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 202 Accepted
				if (req.status == 202) {
					logger.log("Update contact list finished");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Update contact list failed: " + json.reason);
				}
			}
		};
	};
	
	/**
	Builds contact list from a contactlist event
	@private
	*/
	ContactList.prototype._parseContactList = function(contacts) {
		var size = this.size;
		var isUpdated = false;
	
		for (var j = 0;; j++) {
			try {
				var contact = contacts[j];
				var isContactList = false;
				
				// Check ContactList for that contact
				for (var l = 0; l < this.size; l++) {
					if (this.contact[l]._id == _GetNumber(contact.uri)) {
						// Update the Presence relationship state
						this.contact[l]._presenceState = contact.state;
						isContactList = true;
						isUpdated = true;
					}
				}
				
				// Contact doesn't exist locally
				if (!isContactList) {
					// Create a new entry
					var info = {
						numbers : [{
							number : contact.uri
						}]
					};
					var newContact = new Contact(info);
					newContact._mediaServices = this._mediaServices;
					newContact._url = this._url;
					newContact._id = _GetNumber(contact.uri);
					
					if (contact.self == "true") {
						newContact._isSelf = true;
					}
					
					// Add to local ContactList (not network address book)
					this.contact.push(newContact);
				}
			} catch (error) {
				// No more contact updates
				break;
			}
		}
		
		// Change state to ready if contact list was updated
		if (this.size != size || isUpdated) {
			this.state = ContactList.State.READY;
		}
	};
	
	/**
	Builds contact list from the network address book. Called on address book channel event.
	@private
	*/
	ContactList.prototype._parseAddressBook = function(contacts) {
		var isUpdated = false;
	
		for (var i = 0;; i++) {
			try {
				var info = contacts[i];
				var contact = null;
				
				if (this._contacts[info.contactId]) {
					// Contact already exists, update him
					contact = this._contacts[info.contactId];
					contact.state = Contact.State.UPDATING;
					
					// Set info
					if (info.vcard) {
						contact.name = info.vcard.name;
						contact.emails = info.vcard.emails;
						contact.addresses = info.vcard.addresses;
						contact.note = info.vcard.note;
						contact.numbers = info.vcard.numbers;
						
						if (info.vcard.photo) {
							// photo is already base 64 encoded
							contact.photo = 'data:image/' + info.vcard.photoType + ';base64,' + info.vcard.photo;
						}
					}
				} else {
					// Contact doesn't exist in our list, create a new entry
					contact = new Contact(info.vcard);
					contact._url = this._url;
					contact._mediaServices = this._mediaServices;
				}
				
				// Set the contactId as the array location
				contact._contactId = info.contactId;
				
				var self = _GetNumber(this._mediaServices.username);
				
				// Get the main ID of that contact and check if it is self
				if (info.vcard.numbers) {
					var number = null;
					
					// Get the primary number of this contact
					for (var j in info.vcard.numbers) {
						if (info.vcard.numbers[j].primary) {
							number = _GetNumber("tel:" + info.vcard.numbers[j].number);
							
							if (number == self && !contact._id) {
								contact._isSelf = true;
								contact._id = _GetNumber("tel:" + info.vcard.numbers[j].number);
							}
						}
					}
					
					// No primary number, just grab the first one
					if (number == null) {
						number = _GetNumber("tel:" + info.vcard.numbers[0].number);
						
						if (number == self) {
							contact._isSelf = true;
						}
					}
					
					if (!contact._id) {
						contact._id = number;
					}
				}
				
				// Insert it into the contact list at the position of the ID if it doesn't exist yet
				if (!this._contacts[info.contactId]) {
					this._contacts[info.contactId] = contact;
				}
				
				contact.state = Contact.State.UPDATED;
				
				isUpdated = true;
			} catch (error) {
				// No more contacts in the list
				break;
			}
		}
		
		// Done parsing, callback to notify of changes
		if (isUpdated) {
			this.state = ContactList.State.READY;
		}
	};
	
	/**
	Parse Presence List event
	@private
	*/
	ContactList.prototype._parsePresenceList = function(userPresences) {
		var cl = this;
		var isUpdated = false;
		
		for (var i = 0;; i++) {
			try {
				var presence = userPresences[i];
				
				if (typeof(presence) == "undefined") {
					// No more userPresences
					break;
				}
				
				var user = _GetNumber(presence.entity);
				
				// Store presence information into contact the correct contact in our list
				for (var j = 0; j < this.size; j++) {
					if (this.contact[j]._id == user) {
						this.contact[j].state = Contact.State.UPDATING;
					
						// Get Avatar of users in the presence list
						if (presence.person.statusIconEtag == "0") {
							this.contact[j]._avatar = null;
							cl.state = ContactList.State.READY;
						} else if (presence.person.statusIconEtag) {
							if (!this.contact[j].avatar || presence.person.statusIconEtag != this.contact[j].presence.statusIconEtag) {
								this.contact[j].presence = presence.person;
								
								// TODO: there is a bug in H2S that returns the wrong statusIconUrl
								this.contact[j].presence.statusIconUrl = 
									presence.person.statusIconUrl.substring(presence.person.statusIconUrl.indexOf("content/getavatar/"), presence.person.statusIconUrl.length);
								this.contact[j].services = presence.services;
								
								// Get the avatar if no avatar or if the avatar has changed
								this.contact[j].getAvatar(function(status) {
									if (status.success == true) {
										cl.state = ContactList.State.READY;
									}
								});
							}
						}
						
						this.contact[j].presence = presence.person;
						this.contact[j].services = presence.services;
						
						// If self
						if (presence.self == "true") {
							this.contact[j]._isSelf = true;
							this._mediaServices._tagline = presence.person.freeText;
							this._mediaServices._homepage = presence.person.homepage;
							this._mediaServices._willingness = presence.person.willingness;
						}
						
						this.contact[j].state = Contact.State.UPDATED;
					} else {
						// TODO: user doesn't exist in our ContactList? Is this possible?
					}
				}
				
				isUpdated = true;
			} catch (error) {
				// No more userPresences
				break;
			}
		}
		
		// Done parsing, callback to notify of changes
		if (isUpdated) {
			this.state = ContactList.State.READY;
		}
	};
	
	/**
	Add user to network address book and local contact list.
	@param {Contact} contact The contact to add into our contact list
	@return void
	@throws {Error} Invalid contact
	@example
var contact = new Contact(info);
contactList.add(contact);
	*/
	ContactList.prototype.add = function(contact) {
		if (!contact || !(contact instanceof Contact)) {
			throw new Error("Invalid contact");
		}
		
		var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS;
		var cl = this;
		
		logger.log("Adding contact...");
		
		var body = {
			vcard : {
				name : contact.name,
				numbers : contact.numbers,
				emails : contact.emails,
				addresses : contact.addresses,
				note : contact.note
			},
			syncId : this._syncId
		};
		
		// Create and send an add contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				var json = JSON.parse(req.responseText);
				
				// Success response 201 Created
				if (req.status == 201) {
					logger.log("Add contact successful");
					cl._syncId = json.syncId;
					contact._contactId = json.contactId;
					
					// Put it in the array after add successful
					cl.contact[contact._contactId] = contact;
				} else {
					logger.log("Add contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Remove user from network address book and local contact list, and unfollows user as well.
	@function
	@param {Contact} contact Contact to remove
	@throws {Error} Invalid contact
	@throws {Error} Unable to perform action to self
	@return void
	@example
var contact = contactList.contact[0];
contactList.remove(contact);
	*/
	ContactList.prototype.remove = function(contact) {
		if (!contact || !(contact instanceof Contact)) {
			throw new Error("Invalid contact");
		}
		if (contact.isSelf) {
			throw new Error("Unable to perform action to self");
		}
		
		// Remove user from presence list
		contact.unfollow();
		
		if (contact._contactId === "") {
			// No contactId, the user isn't in the address book
			var contactIndex = this.contact.indexOf(contact);
			if (contactIndex != -1) {
				// Remove from local ContactList
				this.contact.splice(contactIndex, 1);
				logger.log("Remove contact successful");
				
				return;
			} else {
				throw new Error("Invalid contact");
			}
		}
		
		var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS + '/' + contact._contactId;
		
		logger.log("Removing contact...");
		
		var body = {
			syncId : this._syncId
		};
		
		// Create and send an add contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("DELETE", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.setRequestHeader("X-http-method-override", "DELETE");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 200) {
					logger.log("Remove contact successful");
					// cl._syncId = json.syncId;
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Remove contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Modify contact information.
	@function
	@param {Contact} contact Contact object with modified information
	@throws {Error} Invalid contact
	@throws {Error} Unable to perform action to self
	@return void
	@example
var contact = contactList.contact[0];
contact.name.given = "bob";
contactList.modify(contact);
	*/
	ContactList.prototype.modify = function(contact) {
		if (!contact || !(contact instanceof Contact)) {
			throw new Error("Invalid contact");
		}
		if (contact.isSelf) {
			throw new Error("Unable to perform action to self");
		}
		
		var url = this._url + ADDRESSBOOK_RESOURCE + '/' + ADDRESSBOOK_RESOURCE_CONTACTS + '/' + contact._contactId;
		var cl = this;
		
		logger.log("Modifying contact...");
		
		var body = {
			vcard : {
				name : contact.name,
				numbers : contact.numbers,
				emails : contact.emails,
				addresses : contact.addresses,
				note : contact.note
			},
			// contactId : contact.id,
			syncId : this._syncId
		};
		
		// Create and send an add contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 200) {
					logger.log("Modify contact successful");
					// cl._syncId = json.syncId;
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Modify contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Fetches all avatars of all users with a presence relationship.
	@function
	@return void
	@example
contactList.getAllAvatars();
	*/
	ContactList.prototype.getAllAvatars = function() {
		var cl = this;
	
		for (var i = 0; i < cl.contact.length; i++) {
			// Can only get avatars of users with presence relationship
			if (cl.contact[i].presence) {
				cl.contact[i].getAvatar(function(status) {
					if (status.success == true) {
						cl.state = ContactList.State.READY;
					}
				});
			}
		}
	};
	
	/**
	Called when the ContactList object changes its state.
	@event
	@type function
	@param evt An event describing the state change.
	@param {String} evt.type "statechange".
	@param {Chat.State} evt.newState New state.
	@param {Chat.State} evt.oldState Old state.
	@example
contactList.onstatechange = function(evt) {
	switch (evt.newState) {
		case ContactList.State.READY:
			// ContactList state has changed to READY
			break;
		case ContactList.State.ERROR:
			// ContactList state has changed to ERROR
			break;
		// ...
	}
};
	*/
	ContactList.prototype.onstatechange = function(evt) {};
	
	/**
	Called when the ContactList object is ready and has been updated with new Contact information.
	@event
	@type function
	@param evt
	@param {ContactList} evt.contactList The ContactList object
	@example
contactList.onready = function(evt) {
	if (evt.contactList) {
		// Do stuff with the ContactList and Contacts
	}
};
	*/
	ContactList.prototype.onready = function(evt) {};
	
	/**
	A presence follow request has been received
	@event
	@type function
	@param evt
	@param {Array} evt.contacts An array of Contact objects
	@example
contactList.onpresenceinvite = function(evt) {
	var contact = evt.contacts[0];
	contactList.add(contact);
	contact.follow();
};
	*/
	ContactList.prototype.onpresenceinvite = function(evt) {};
	
	/**
	TODO: to complete
	*/
	ContactList.prototype.onerror = function(evt) {};
	
	/**
	A new contact is created from a JSON object. This is a public constructor.
	@class A new contact is created from a JSON object. This is a public constructor.
	@param {Object} info An object containing a contact's info
	@property {Contact.State} state State of the contact
	@property {Object} name Object containing the name of the contact (has the following properties: name.given, name.family, name.middle, name.prefixes, name.suffixes)
	@property {Array} numbers Array containing the numbers of the contact (has the following properties: numbers.number, numbers.type, numbers.primary)
	@property {Array} emails Array containing the emails of the contact (has the following properties: emails.email, emails.type, emails.primary)
	@property {Array} addresses Array containing the addresses of the contact (has the following properties: addresses.type, addresses.pobox, addresses.street, addresses.ext-street, addresses.locality, addresses.region, addresses.postalcode, addresses.country)
	@property {String} note A note added to the contact
	@property {String} org Organization the contact belongs to
	@property {String} title The title of the contact
	@property {String} birthday The birthday date of the contact (format: yyyy-mm-dd)
	@property {String} photo A base 64 encoded data uri of the contact's photo
	@property {String} presenceState The state of the presence relationship with this contact (one of "active", "pending" or "terminated")
	@property {Object} presence The presence information of the contact (has the following properties: presence.willingness, presence.displayName, presence.statusIconUrl, presence.statusIconEtag, presence.freeText, presence.statusIconContentType, presence.statusIconFileSize, presence.homepage, presence.opdLinks)
	@property {Array} services An array of services published (as defined by RCS standards) by the contact (has the following properties: services.serviceStatus, services.serviceDescription, services.serviceVersion)
	@property {Boolean} isSelf Is this contact the user's self
	@property {Object} avatar A base 64 encoded data uri of the contact's avatar
	@example
var info = {
	"name":
		{"given": "givenName",
		"family": "familyName"},
	"addresses":[
		{
		"type": "HOME",
			"street": "a street",
			"locality": "a town",
			"region": "a region",
			"postalcode": "a postal code",
			"country": "a country"}],
	"numbers": [
		{
		"number": "1",
		"type": "MOBILE_HOME",
		"primary": "false"},
		{
		"number": "3",
		"type": "MOBILE_WORK",
		"primary": "true"},
		{
		"number": "2",
		"type": "HOME",
		"primary": "false"}],
	"emails": [
		{
		"email": "1@domain.com",
		"type": "WORK",
		"primary": "true"}],
	"note":"a note"
};
var contact = new Contact(info);
	*/
	Contact = function(info) {
		var _state = Contact.State.NEW,
			_name = null,
			_numbers = [],
			_emails = [],
			_addresses = [],
			_note = "",
			_org = "",
			_title = "",
			_birthday ="",
			_photo = "",
			_presence = null, // RCS Presence attributes for this contact
			_services = null; // RCS Presence services
		
		if (info) {
			_name = info.name;
			_numbers = info.numbers;
			_emails = info.emails;
			_addresses = info.addresses;
			_note = info.note;
			_org = info.org;
			_title = info.title;
			_birthday = info.birthday;
			
			if (info.photo) {
				_photo = 'data:image/' + info.photoType + ';base64,' + info.photo;
			}
		}
		
		this._mediaServices = null;
		
		/**
		H2S URL for Presence list
		*/
		this._url = null;
		
		/**
		Is the user self (boolean)
		*/
		this._isSelf = false;
		
		/**
		The contact's telephone number
		*/
		this._id = "";
		
		/**
		address book contactId (array location)
		*/
		this._contactId = "";
		
		/**
		active, pending, terminated
		*/
		this._presenceState = "";
		
		/**
		avatar file data uri base 64 encoded
		*/
		this._avatar = null;
		
		/**
		@field state
		*/
		Object.defineProperty(this, "state", {
			get: function() {
				return _state;
			},
			set: function(newState)
			{
				var evt = {type: "statechange", oldState : _state, state: newState};
				_state = newState;
				
				// TODO: do we need onstatechange
				// if (typeof(this.onstatechange) == "function")
					// this.onstatechange(evt);
				
				if (newState == Contact.State.UPDATING && typeof(this.onupdating) == "function") {
					this.onupdating({ contact : this });
				}
				else if (newState == Contact.State.UPDATED && typeof(this.onupdate) == "function") {
					this.onupdate({ contact : this });
				}
			}
		});
		
		/**
		@field name
		*/
		Object.defineProperty(this, "name", {
			get: function() { return _name; },
			set: function(name) { _name = name; }
		});
		
		/**
		@field numbers
		*/
		Object.defineProperty(this, "numbers", {
			get: function() { return _numbers; },
			set: function(numbers) { _numbers = numbers; }
		});
		
		/**
		@field emails
		*/
		Object.defineProperty(this, "emails", {
			get: function() { return _emails; },
			set: function(emails) { _emails = emails; }
		});
		
		/**
		@field addresses
		*/
		Object.defineProperty(this, "addresses", {
			get: function() { return _addresses; },
			set: function(addresses) { _addresses = addresses; }
		});
		
		/**
		@field note
		*/
		Object.defineProperty(this, "note", {
			get: function() { return _note; },
			set: function(note) { _note = note; }
		});
		
		/**
		@field org
		*/
		Object.defineProperty(this, "org", {
			get: function() { return _org; },
			set: function(org) { _org = org; }
		});
		
		/**
		@field title
		*/
		Object.defineProperty(this, "title", {
			get: function() { return _title; },
			set: function(title) { _title = title; }
		});
		
		/**
		@field birthday
		*/
		Object.defineProperty(this, "birthday", {
			get: function() { return _birthday; },
			set: function(birthday) { _birthday = birthday; }
		});
		
		/**
		@field photo
		Data URI format of the photo
		*/
		Object.defineProperty(this, "photo", {
			get: function() { return _photo; },
			set: function(photo) { _photo = photo; }
		});
		
		/**
		@field presenceState
		*/
		Object.defineProperty(this, "presenceState", {
			get: function() { return this._presenceState; }
		});
		
		/**
		@field presence
		Presence information
		*/
		Object.defineProperty(this, "presence", {
			get: function() { return _presence; },
			set: function(presence) { _presence = presence; }
		});
		
		/**
		@field services
		Services information from presence
		*/
		Object.defineProperty(this, "services", {
			get: function() { return _services; },
			set: function(services) { _services = services; }
		});
		
		/**
		@field isSelf
		*/
		Object.defineProperty(this, "isSelf", {
			get: function() { return this._isSelf; }
		});
		
		/**
		@field avatar
		*/
		Object.defineProperty(this, "avatar", {
			get: function() { return this._avatar; }
		});
	};
	
	/**
	@namespace Describes the states of the Contact object.
	*/
	Contact.State = {};
	
	/**
	The Contact object has been newly created
	*/
	Contact.State.NEW = 0;
	
	/**
	The Contact object is being updated after receiving new information from the server
	*/
	Contact.State.UPDATING = 1;
	
	/**
	The Contact object has been updated with new information
	*/
	Contact.State.UPDATED = 2;
	
	/**
	Subscribe to this contact's Presence.
	@function
	@return void
	@throws {Error} Unable to perform action to self
	@example
contact = contactList.contact[0];
contact.follow();
	*/
	Contact.prototype.follow = function() {
		if (this.isSelf) {
			throw new Error("Unable to perform action to self");
		}
	
		var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_ADD;
		
		logger.log("Following contact...");
		
		var body = {
			username : "tel:+" + this._id
		};
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No Content
				if (req.status == 204) {
					logger.log("Follow contact request sent");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Follow contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Unsubscribe from this contact's Presence
	@function
	@return void
	@throws {Error} Unable to perform action to self
	@example
contact = contactList.contact[0];
contact.unfollow();
	*/
	Contact.prototype.unfollow = function() {
		if (this.isSelf) {
			throw new Error("Unable to perform action to self");
		}
	
		var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_REMOVE;
		
		logger.log("Unfollowing contact...");
		
		var body = {
			username : "tel:+" + this._id
		};
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No Content
				if (req.status == 204) {
					logger.log("Unfollow contact successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Unfollow contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Ignore/block the Presence request from this contact
	@function
	@return void
	@throws {Error} Unable to perform action to self
	@example
contactList.onpresenceinvite = function(evt) {
	var contact = evt.contacts[0];
	contactList.add(contact);
	contact.block();
};
	*/
	Contact.prototype.block = function() {
		if (this.isSelf) {
			throw new Error("Unable to perform action to self");
		}
		
		var url = this._url + PRESENCE_RESOURCE + '/' + PRESENCE_RESOURCE_LIST + '/' + PRESENCE_RESOURCE_LIST_BLOCK;
		
		logger.log("Blocking contact...");
		
		var body = {
			username : "tel:+" + this._id
		};
		
		// Create and send a follow contact request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("POST", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.setRequestHeader("Content-Type", "application/json");
		req.send(JSON.stringify(body, null, " "));
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 204 No Content
				if (req.status == 204) {
					logger.log("Block contact successful");
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Block contact failed: " + json.reason);
					
					// TODO: error
				}
			}
		};
	};
	
	/**
	Fetch the contact's Presence avatar. The avatar will be stored in the Contact.avatar field, and will trigger an onupdate callback on success.
	@function
	@param {Function} [callback] A callback function, with signature <i>callback(evt)</i> to indicate whether the avatar was fetched successfully or not
	@throws {Error} User has no avatar
	@return void
	@example
contact.getAvatar(function(evt) {
	if (evt.success) {
		// Update the avatar of this contact
	}
});
	*/
	Contact.prototype.getAvatar = function(callback) {
		var contact = this;
		
		if (!this.presence.statusIconUrl)
			throw new Error("User has no avatar");
		
		var url = this._url + this.presence.statusIconUrl;
		
		logger.log("Getting avatar of " + this._id); 
		
		// Create and send a get avatar request
		var req = new _CreateXmlHttpReq(this._mediaServices._accessToken);
		
		req.open("GET", url, true);
		req.setRequestHeader("Accept", "application/json, text/html");
		req.overrideMimeType("text/plain; charset=x-user-defined");
		req.send(null);
	
		// On response
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				// Success response 200 OK
				if (req.status == 200) {
					logger.log("Get avatar successful");
					
					// Binary data in req.responseText
					var rawData = req.responseText;
					var imgType = req.getResponseHeader("Content-Type");
					
					var newAvatar = 'data:' + imgType + ';base64,' + _Base64encode(req.responseText);
					
					// Update only if different from old avatar
					if (contact._avatar != newAvatar) {
						contact.state = Contact.State.UPDATING;
						contact._avatar = newAvatar;
						
						if (typeof(callback) == "function") {
							var event = {success : true, failure: false};
							callback(event);
						}
						
						contact.state = Contact.State.UPDATED;
					}
				} else {
					var json = JSON.parse(req.responseText);
					logger.log("Get avatar failed: " + json.reason);
					
					if (typeof(callback) == "function") {
						var event = {success : false, failure: true};
						callback(event);
					}
				}
			}
		};
	};
	
	/**
	The contact has been updated successfully with new information
	@event
	@type function
	@param evt
	@example
contact.onupdate = function(evt) {
	// The contact has been updated
};
	*/
	Contact.prototype.onupdate = function(evt) {};
	
	/**
	The contact is currently being updated with new information
	@event
	@type function
	@param evt
	@example
contact.onupdating = function(evt) {
	// The contact is being updated
};
	*/
	Contact.prototype.onupdating = function(evt) {};
	
	/**
	Generate a general error callback
	@private
	*/
	_InternalError = function(obj, code) {
		try {
			if (obj instanceof MediaServices) {
				obj.state = MediaServices.State.ERROR;
			} else if (obj instanceof Conference) {
				obj.state = Conference.State.ERROR;
			} else if (obj instanceof Call) {
				obj.state = Call.State.ERROR;
			} else if (obj instanceof FileTransfer) {
				obj.state = FileTransfer.State.ERROR;
			} else if (obj instanceof Chat) {
				obj.state = Chat.State.ERROR;
			} else if (obj instanceof GroupChat) {
				obj.state = GroupChat.State.ERROR;
			} else if (obj instanceof ContactList) {
				obj.state = ContactList.State.ERROR;
			} else if (obj instanceof Contact) {
				obj.state = Contact.State.ERROR;
			}
			
			if (typeof(obj.onerror) == "function") {
				var event = {type: "error", reason: code, target: obj};
				obj.onerror(event);
			}
		} catch (error) {
			logger.log("Invalid ERROR");
		}
	};
	
	/**
	Base 64 encoding of a String
	Source: http://stackoverflow.com/questions/7370943/retrieving-binary-file-content-using-javascript-base64-encode-it-and-reverse-de
	@private
	@param {String} str Input raw data
	@return {String} Base 64 encoded string
	*/
	_Base64encode = function(str) {
		var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var out, i, len;
		var c1, c2, c3;

		len = str.length;
		i = 0;
		out = "";
		while (i < len) {
			c1 = str.charCodeAt(i++) & 0xff;
			if (i == len) {
				out += base64EncodeChars.charAt(c1 >> 2);
				out += base64EncodeChars.charAt((c1 & 0x3) << 4);
				out += "==";
				break;
			}
			c2 = str.charCodeAt(i++);
			if (i == len) {
				out += base64EncodeChars.charAt(c1 >> 2);
				out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
				out += base64EncodeChars.charAt((c2 & 0xF) << 2);
				out += "=";
				break;
			}
			c3 = str.charCodeAt(i++);
			out += base64EncodeChars.charAt(c1 >> 2);
			out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
			out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
			out += base64EncodeChars.charAt(c3 & 0x3F);
		}
		return out;
	};
	
	/**
	Parse the media types used in createCall/createConference. Also checks for invalid services. 
	For example, if the call is created as an audio/video call, but the user has registered with only audio, 
	the call will be reduced to an audio call.
	@private
	@param {MediaServices} mediaServices The parent MediaServices object
	@param {Object} mediaType Media services object(e.g. {audio:true,video:true})
	@return {Object} Mediatypes allowed for this call/conference
	*/
	function _ParseMediaType(mediaServices, mediaType) {
		var parentMedia = mediaServices.mediaType.replace(/(\s)/g, "").split(",");
		var _mediaType = {};
		
		// Inherit media type, if undefined
		if (typeof(mediaType) == "undefined" || Object.keys(mediaType).length == 0) {
			if (parentMedia.indexOf("audio") != -1)
				_mediaType.audio = true;
			if (parentMedia.indexOf("video") != -1)
				_mediaType.video = true;
			
			return _mediaType;
		} else if (typeof(mediaType) != "object" || mediaType == "") {
			throw new Error("Invalid media types");
		}
		
		// Assert media type is allowed. E.g. If parent is only registered for audio, disallow "video" in mediaType.
		if (mediaType.audio) {
			if (mediaType.audio == true && parentMedia.indexOf("audio") != -1)
				_mediaType.audio = true;
		}
		if (mediaType.video) {
			if (mediaType.video == true && parentMedia.indexOf("video") != -1)
				_mediaType.video = true;
		}
		
		return _mediaType;
	}
	
	/**
	Determine the type(s) of media in the SDP by inspeting the "m" field of the SDP
	@private
	@param {Object} sdp An object containing SDP attributes.
	@return {Array} mediaType An array of media types.
	*/
	function _ParseSDPMedia(sdp) {
		// TODO: can know the media type from the a=group:BUNDLE audio video line
		// Find the a=group:BUNDLE line
		// set mediaType.audio = true and/or mediaType.video = true
		
		var mediaType = {};
		
		for (var j = 0;; j++) {
			// Inspect the "m" field of the SDP
			try {
				var m = sdp[j].m;
				if (m.search("audio") != -1) {
					mediaType.audio = true;
				} else if (m.search("video") != -1) {
					mediaType.video = true;
				}
			} catch(error) {
				// Done
				break;
			}
		}
		
		return mediaType;
	}
	
	/**
	Get the number from a Tel or Sip uri
	@private
	*/
	function _GetNumber(uri) {
		if (uri.indexOf("tel:+") == 0) {
			// Tel uri
			return uri.substring(5, uri.length);
		} else if (uri.indexOf("sip:") == 0) {
			// Sip uri
			return uri.substring(4, uri.indexOf("@"));
		} else {
			return "";
		}
	}
	
	/**
	Create an HTTP request
	@private
	@return {XMLHttpRequest} xmlhttp An XML/HTTP request
	*/
	function _CreateXmlHttpReq(token) {
		var xmlhttp = null;

		if (window.XMLHttpRequest) {
			xmlhttp = new XMLHttpRequest();
		} else if (window.ActiveXObject) {
			// Users with ActiveX off
			try {
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (error) {
				// Do nothing
			}
		}

		if (token) {
			xmlhttp.o = xmlhttp.open;
			xmlhttp.open = function(a, b, c)
			{
				this.o(a,b + "?access_token=" + token,c);
				//this.setRequestHeader('Authorization', 'Bearer ' + token);
			};
		}
		
		return xmlhttp;
	}
	
	/**
	The event channel
	@private
	@param {MediaServices} The MediaServices object
	*/
	function _Channel(mediaService) {
		var timer = 2000,
			channel = this,
			_ms = mediaService;
		
		// Poll the channel
		this.pollChannel = function() {
			var channelURL = _ms._gwUrl + CHANNEL_RESOURCE;
			
			logger.log("Querying channel...");
			
			// Create and send a channel query request
			var req = new _CreateXmlHttpReq(mediaService._accessToken);
			
			req.open("GET", channelURL, true);
			req.setRequestHeader('Accept', 'application/json, text/html');
			//req.setRequestHeader('Cache-Control', 'no-cache');
			//req.setRequestHeader('Pragma', 'no-cache');
			req.send(null);
			
			// On response
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					// Success response 200 OK
					if (this.status == 200) {
						logger.log("Get channel successful: " + this.status + " " + this.statusText + " " + this.responseText);
					
						var json = JSON.parse(this.responseText);
						
						// Parse channel events
						for (var i = 0;; i++) {
							var eventObject = null;
							
							// Get the event
							try {
								eventObject = json.events.list[i].eventObject;
							} catch (error) {
								// No more events in the list, get out
								break;
							}
							
							var type = eventObject["@type"],
								state = eventObject.state,
								reason = eventObject.reason,
								from = eventObject.from;
							
							// Channel Handlers
							if (type == "media-conference") {
								// TODO: the code below is currently unused, since webrtc media-conference events go through audiovideo
								var sdp = eventObject.sdp,
									resourceURL = eventObject.resourceURL;
								
								// Tokenize the resourceURL
								var tokens = resourceURL.split("/");
								
								if (state.toLowerCase() == "session-open") {
									// Media conference session established
								} else if (state.toLowerCase() == "session-terminated") {
									// Media conference session terminated
								} else if (state.toLowerCase() == "invitation-received") {
									// conference invitation received
								} else if (state.toLowerCase() == "add-failed") {
									// Add participant failed
								} else if (state.toLowerCase() == "remove-failed") {
									// Remove participant failed
								} else if (state.toLowerCase() == "mod-received") {
									// Reinvite received
								} else {
									// Unhandled event
									logger.log("Unhandled media conference channel event: " + type + " " + state);
								}
							} else if (type == "audiovideo") {
								var sdp = eventObject.sdp,
									resourceURL = eventObject.resourceURL;
								
								// Tokenize the resourceURL
								var tokens = resourceURL.split("/");
								
								if (state.toLowerCase() == "session-open" || state.toLowerCase() == "session-modified" ) {
									// Audio video call session established
									var mediaConfIndex = tokens.indexOf("mediaconf");
									var audioVideoIndex = tokens.indexOf("audiovideo");
									
									if (mediaConfIndex != -1) {
										_ms._call.confID = tokens[mediaConfIndex + 1];
									} else if (audioVideoIndex != -1) {
										_ms._call._callID = tokens[audioVideoIndex + 1];
									}
									
										// DEPRECATED: to remove this if case
									try {	
										if (_ms._call._pc instanceof webkitDeprecatedPeerConnection) {
											var modIndex = tokens.indexOf("mod");
											if (modIndex != -1) {
												_ms._call._modID = tokens[modIndex + 1];
												
												if (_ms._isModerator) {
													// Nothing
												} else {
													if (sdp)
													{
														var roapMessage = _ms._call._DEPRECATEDroap.processRoapAnswer(_ms, sdp);
														_ms._call._pc.processSignalingMessage(roapMessage);
													}
													else
													{
														var roapMessage = _ms._call._DEPRECATEDroap.processRoapOK(_ms);
														_ms._call._pc.processSignalingMessage(roapMessage);
													}
												}
											} else {
												if (_ms._isModerator || (_ms._call instanceof Conference && !_ms._isModerator)) {
													var roapMessage = _ms._call._DEPRECATEDroap.processRoapAnswer(_ms, sdp);
													_ms._call._pc.processSignalingMessage(roapMessage);
												} else {
													var roapMessage = _ms._call._DEPRECATEDroap.processRoapOK(_ms);
													_ms._call._pc.processSignalingMessage(roapMessage);
												}
											}
										} else {
											if (_ms._isModerator || (_ms._call instanceof Conference && !_ms._isModerator)) {
												var sd = new SessionDescription(_SDPToString(sdp));
												
												// Get Ice candidates
												var candidates = _GetCandidates(sd.toSdp());
												_ms._call._candidates = candidates;
												
												// Receive ANSWER SDP of callee
												_ms._call._pc.setRemoteDescription(_ms._call._pc.SDP_ANSWER, sd);
												
												// Process the Ice Candidates
												for (index in candidates) {
													var candidate= new IceCandidate(candidates[index].label, candidates[index].candidate);
													_ms._call._pc.processIceMessage(candidate);
												}
											}
										}
									} catch (e) {
										if (_ms._isModerator || (_ms._call instanceof Conference && !_ms._isModerator)) {
											var sd = new SessionDescription(_SDPToString(sdp));
											
											// Get Ice candidates
											var candidates = _GetCandidates(sd.toSdp());
											_ms._call._candidates = candidates;
											
											// Receive ANSWER SDP of callee
											_ms._call._pc.setRemoteDescription(_ms._call._pc.SDP_ANSWER, sd);
											
											// Process the Ice Candidates
											for (index in candidates) {
												var candidate= new IceCandidate(candidates[index].label, candidates[index].candidate);
												_ms._call._pc.processIceMessage(candidate);
											}
										}
									}
								} else if (state.toLowerCase() == "session-terminated") {
									// Audio video call terminated
									if (_ms._call.state != Call.State.ENDED) {
										// Cleanup the Peer Connection
										if (_ms._call) {
											if (_ms._call._pc && _ms._call._pc.close) {
												_ms._call._pc.close();
												_ms._call._pc = null;
											}
										}
										
										// Clear moderator flag
										_ms._isModerator = null;
										
										_ms._call.state = Call.State.ENDED;										

									}
								} else if (state.toLowerCase() == "invitation-received") {
									// Receive audio video call invitation
									var index = tokens.indexOf("audiovideo");
									var mediaType = _ParseSDPMedia(sdp);
									_ms._isModerator= false;
									
									// Set the media type of the call invitation
									mediaType = _ParseMediaType(_ms, mediaType);
									
									// Create a new IncomingCall object and save the remote SDP
									_ms._call = new IncomingCall(_ms, from, mediaType);
									_ms._call._url = _ms._gwUrl + AUDIOVIDEO_RESOURCE;
									_ms._call._callID = tokens[index + 1];
									
									// Parse the SDP
									_ms._call._sdp.type = "ANSWER";
									_ms._call._sdp.sdp = _SDPToString(sdp);
									logger.log(_ms._call._sdp.sdp);
									
									// DEPRECATED: to remove
									_ms._call._DEPRECATEDsdp = sdp;
									
									// Grab the Ice candidates
									_ms._call._candidates = _GetCandidates(_ms._call._sdp.sdp);
									
									_ms._call.state = Call.State.RINGING;
								} else if (state.toLowerCase() == "mod-received") {
									// DEPRECATED: to remove (Reinvite received)
									var index = tokens.indexOf("mod");
									
									_ms._call._modID = tokens[index + 1];
									
									if (_ms._isModerator || (_ms._call instanceof Conference && !_ms._isModerator)) {
										var roapMessage = _ms._call._DEPRECATEDroap.processRoapOffer(_ms, sdp);
										_ms._call._pc.processSignalingMessage(roapMessage);
									}
								} else {
									// Unhandled event
									logger.log("Unhandled audio video channel event: " + type + " " + state);
								}
							} else if (type == "file-transfer") {
								var fileName = eventObject.fileName,
									fileSize = eventObject.fileSize,
									contentType = eventObject.contentType,
									ftId = eventObject.ftId;
							
								// Get the current file transfer object in the hashmap
								var ft = null;
								if (_ms._ftp) {
									ft = _ms._ftp.get(ftId);
								}
								
								if (state.toLowerCase() == "session-open" && ft) {
									if (ft instanceof OutgoingFileTransfer) {
										logger.log("Uploading...");
										
										// Automatically start uploading
										ft._id = ftId;
										ft._uploadFile();
									} else {
										logger.log("Downloading...");
										
										// Automatically start downloading
										ft._downloadFile();
									}
								} else if (state.toLowerCase() == "session-terminated" && ft) {
									var code = eventObject.code;
									
									// File transfer session terminated
									logger.log("session-terminated");
									
									if (ft.state != FileTransfer.State.ERROR &&
											ft.state != FileTransfer.State.CANCELED) {
										// If not in an error state, check what error code we've received
										switch (code) {
											case 487:
											case 603:
												ft.state = FileTransfer.State.CANCELED;
												break;
											case 403:
												_InternalError(ft, FileTransfer.Error.FILE_SIZE_LIMIT);
												break;
											case 486:
												_InternalError(ft, FileTransfer.Error.TIMEOUT);
												break;
											case 480:
											case 500:
												_InternalError(ft, FileTransfer.Error.INVALID_USER);
												break;
											default:
												break;
										}
									}
								} else if (state.toLowerCase() == "invitation-received") {
									// File transfer invitation received
									if (ft) {
										// Already had an old file transfer session from same user, remove it
										_ms._ftp.remove(ftId);
									} else {
										ft = new IncomingFileTransfer(_ms, from);
										ft._url = _ms._gwUrl + FILETRANSFER_RESOURCE;
										ft._id = ftId;
										ft._fileName = fileName;
										ft._fileSize = fileSize;
										ft._fileType = contentType;
										
										ft.state = FileTransfer.State.INVITATION_RECEIVED;
										
										// Put the new object in the hashmap
										_ms._ftp.put(ftId, ft);
									}
								}
							} else if (type == "address-book") {
								// An address book update
								var contacts = eventObject.contacts,
									abId = eventObject.abId; // TODO: unused
								
								_ms._contactList._syncId = eventObject.syncId;
								
								if (contacts) {
									_ms._contactList._parseAddressBook(contacts);
								}
							} else if (type == "message") {
								var	body = eventObject.body,
									contentType = eventObject.contentType,
									typeMessage = eventObject.type;
								
								if (typeMessage == "session-message") {
									// Check if it's a new chat session with another user
									if (_ms._chat.contains(from) == -1) {
										var newChat = new Chat(_ms, from);
										newChat._url = _ms._gwUrl + CHAT_RESOURCE;
										newChat.state = Chat.State.ACTIVE;
										
										var evt = {
											chat: newChat,
											call: null,										
											conf: null
										};
									
										_ms.oninvite(evt);
										
										var msg = {
											from: from,
											message: body
										};
										
										newChat.onmessage(msg);
										_ms._chat.put(from, newChat);
									} else {
										// Chat already exists
										var ongoingChat = _ms._chat.get(from);
										
										if (ongoingChat.state != Chat.State.ACTIVE) {
											ongoingChat.state = Chat.State.ACTIVE;
										}
										
										var evt = {
											from: from,
											message: body
										};
										
										ongoingChat.onmessage(evt); 
									}
								} else if (typeMessage == "message") {
									logger.log("PAGER MODE MESSAGE");
									
									// TODO: handle?
								}
							} else if (type == "composing") {
								var refresh = eventObject.refresh;
							
								var ongoingChat = _ms._chat.get(from);
								
								var evt = {
									from : from,
									state : state,
									refresh : refresh
								};
								
								ongoingChat.oncomposing(evt); 
							} else if (type == "media-message") {
								// Received a media-message
								var from = eventObject.from,
									contentType = eventObject.contentType,
									url = eventObject.url,
									size  = eventObject.size;
							
								var ongoingChat = _ms._chat.get(from);
								ongoingChat.state = Chat.State.ACTIVE;
								
								// Get the file ID from url
								var id = url.substring(url.indexOf("fileRef") + 8, url.length);
								
								// Get the file automatically
								ongoingChat._getMedia(id, from);
							} else if (type == "message-failure") {
								var to = eventObject.to,
									msgId = eventObject.msgId,
									code = eventObject.code;
								
								var ongoingChat = _ms._chat.get(to);
								
								switch (code) {
									case 480:
										_InternalError(ongoingChat, Chat.Error.USER_NOT_ONLINE);
										break;
									case 500:
										_InternalError(ongoingChat, Chat.Error.INVALID_USER);
										break;
									case 404:
									default:
										_InternalError(ongoingChat, Chat.Error.NETWORK_FAILURE);
										break;
								}
							} else if (type == "conference-invite"){
								// Group chat invitation
								var referredBy = eventObject.referredBy,
									confId = eventObject.confId,
									subject = eventObject.subject,
									members = eventObject.members;
								
								var newGroupChat = new GroupChat(_ms, subject, members, referredBy, confId);
								newGroupChat._url = _ms._gwUrl + GROUP_CHAT_RESOURCE;
								
								var evt = {
									groupChat: newGroupChat,
									chat: null,								
									call: null,
									conf: null
								};
							
								_ms.oninvite(evt);
							} else if (type == "conference-info") {
								// Group chat updated info (users and states)
								var userCount = eventObject.userCount,
									confId = eventObject.confId,
									users = eventObject.users,
									state = eventObject.state,
									reason = eventObject.reason;
								
								var ongoingGroupChat = _ms._chat.get(confId);
								
								if (ongoingGroupChat) {
									if (userCount == 0 || users.length == 0) {
										// Users declined group chat invite
										ongoingGroupChat.state = GroupChat.State.ENDED;
									} else {
										if (ongoingGroupChat.state != GroupChat.State.ENDED) {
											// The group chat is ongoing
											if (ongoingGroupChat.state != GroupChat.State.IN_PROGRESS) {
												ongoingGroupChat.state = GroupChat.State.IN_PROGRESS;
											}
											
											// Handle the members' statuses
											for (var j = 0; j < users.length; j++) {
												var l = 0;
												for (; l < ongoingGroupChat.members.length; l++) {
													// Received a disconnected event of self
													if (_ms.username == users[j].entity && users[j].status == "disconnected") {
														ongoingGroupChat.state = GroupChat.State.ENDED;
													}
													
													if (ongoingGroupChat.members[l].entity == users[j].entity) {
														ongoingGroupChat.members[l].status = users[j].status;
														break;
													}
												}
												
												// New user
												if (l == ongoingGroupChat.members.length) {
													ongoingGroupChat.members.push(users[j]);
												}
											}
											
											if (ongoingGroupChat.state != GroupChat.State.ENDED) {
												ongoingGroupChat.onupdate({ members : ongoingGroupChat.members });
											}
										} else {
											// The group chat has already ended
										}
									}
								}
							} else if (type == "conference-message") {
								// Group chat message received
								var from = eventObject.from,
									confId = eventObject.confId,
									body = eventObject.body;
									
								logger.log("GroupChat message: confId: " + confId + ", from: " + from + ", body: " + body);
								
								var ongoingGroupChat = _ms._chat.get(confId);
								
								var evt = {
									confId: confId,
									from: from,
									message: body
								};
								
								ongoingGroupChat.onmessage(evt);
							} else if (type == "conference-media-message") {
								// Group chat media message received
								var from = eventObject.from,
									confId = eventObject.confId,
									contentType = eventObject.contentType,
									url = eventObject.url,
									size = eventObject.size;
								
								var ongoingGroupChat = _ms._chat.get(confId);
								
								// Get the file ID from url
								var id = url.substring(url.indexOf("fileRef") + 8, url.length);
								
								// Get the file automatically
								ongoingGroupChat._getMedia(id,from);
							} else if (type == "conference-composing") {
								// Group chat is composing received
								var from = eventObject.from,
									confId = eventObject.confId,
									refresh = eventObject.refresh,
									state = eventObject.state;
									
								var ongoingGroupChat = _ms._chat.get(confId);
								
								var evt = {
									from: from,
									refresh : refresh,
									state : state
								};
								
								ongoingGroupChat.oncomposing(evt); 	
							} else if (type == "contactlist") {
								// List of users with a presence relationship
								var contacts = eventObject.contacts;
								
								if (contacts) {
									// Update our contact list
									_ms._contactList._parseContactList(contacts);
								}
							} else if (type == "presencelist") {
								// Presence information
								var userPresences = eventObject.userPresences;
								
								if (userPresences) {
									_ms._contactList._parsePresenceList(userPresences);
								}
							} else if (type == "anonymous-subscription") {
								// Event containing individual user with services/isIMSUser
								var isIMSUser = eventObject.isIMSUser;
								var services = eventObject.services;
								
								// TODO: implement if we need anonymous subscribe
							} else if (type == "watcherlist") {
								// List of Presence follow requests
								var contacts = eventObject.contacts;
								
								if (contacts) {
									// An array of Contacts with presence request
									var array = [];
									
									for (var j in contacts) {
										var uri = contacts[j].uri;
										var found = false;
										
										// Find that Contact in ContactList
										for (var l in _ms._contactList.contact) {
											if (_GetNumber(uri) == _ms._contactList.contact[l]._id) {
												array.push(_ms._contactList.contact[l]);
												found = true;
											}
										}
										
										// User not found, create a new contact
										if (found == false) {
											var info = {
												numbers : [{
													number : contacts[j].uri
												}]
											};
											
											var contact = new Contact(info);
											contact._mediaServices = _ms;
											contact._url = _ms._gwUrl;
											contact._id = _GetNumber(contacts[j].uri);
											array.push(contact);
										}
									}
									
									// Presence invite callback
									var evt = { contacts : array };
									_ms._contactList.onpresenceinvite(evt);
								}
							} else {
								// Unhandled event
								logger.log("Unhandled channel event: " + type + " " + state);
							}
						}
						
						// Poll again
						if (_ms._channel != null) {
							channel.pollChannel();
							timer = 2000;
						}
					}
					// Success response 204 No Content
					else if (this.status == 204) {
						logger.log("Get channel successful: " + this.status + " " + this.statusText + " " + this.responseText);
						
						// Poll again
						if (_ms._channel != null) {
							channel.pollChannel();
							timer = 2000;
						}
					}
					// Error response
					else {
						if (timer >= 128000) {
							// Try to logout since channel hasn't responded for 4 minutes
							_ms.unregister();
						} else {
							// If we are unable to poll the channel, attempt to poll for 2 minutes exponentially, then stop
							if (_ms._channel != null) {
								timer *= 2;
								logger.log("Get channel unsuccessful: " + this.responseText);
								setTimeout(function(){channel.pollChannel();},timer);
							}
						}
					}
				}
			};
		};
	}
	
	/**
	Build H2S signaling SDP object from SDP string
	@private
	@param {String} recipient The recipient of the call
	@param {String} Offer SDP
	@return {Object} The SDP in accepted H2S json format
	*/
	function _ParseSDP(recipient, sdp) {
		var SDP = {};
		
		if (recipient) {
			SDP = {
				to : recipient,
				sdp : []
			};
		} else {
			SDP = {
				sdp : []
			};
		}
		
		var sdp_string = JSON.stringify(sdp);
		// Get the v line
		var v_pattern = /v=(.*?)(?=\\r\\n)/g;
		var v_match = v_pattern.exec(sdp_string);

		// Get the o line
		var o_pattern = /o=(.*?)(?=\\r\\n)/g;
		var o_match = o_pattern.exec(sdp_string);

		// Get the s line
		var s_pattern = /s=(.*?)(?=\\r\\n)/g;
		var s_match = s_pattern.exec(sdp_string);

		// Get the t line
		var t_pattern = /t=(.*?)(?=\\r\\n)/g;
		var t_match = t_pattern.exec(sdp_string);

		// Get the a line
		var a_pattern = /a=(.*?)(?=\\r\\n)/g;
		var a_match = a_pattern.exec(sdp_string);
		
		// Get all media
		var media_pattern = /m=(.*)/g;
		var media_match = media_pattern.exec(sdp_string);
		var media = media_match[1];

		// Split all media
		var media_line_array = media.split("m=");
		
		for (var index in media_line_array) {
			var m = "m=" + media_line_array[index];
			var lines_array = m.split("\\r\\n");
			lines_array.pop();
			
			// For each media, split all the lines
			// Find the m, the c, and the a
			var m_struct = {};
			if (index == 0) {
				m_struct = {
					v : v_match[1],
					o : o_match[1],
					s : s_match[1],
					t : t_match[1],
					a : a_match[1],
					m : "",
					c : "",
					attributes : []
				};
			} else {
				m_struct = {
					m : "",
					c : "",
					attributes : []
				};
			}
			
			for(var i in lines_array) {
				var line = lines_array[i];
						
				if (line[0] == "m") {
					m_struct.m = line.substring(2);
				}
				
				if (line[0] == "c") {
					m_struct.c = line.substring(2);
				}
				
				if (line[0] == "a") { 
					var a_line = {
                                        	a : line.substring(2)
                                        }

					m_struct.attributes.push(a_line);
				}
			}
			
			SDP.sdp.push(m_struct);
		}
		
		logger.log(JSON.stringify(SDP,null, " "));
		
		return SDP;
	}
	
	
	/**
	Build SDP string from SDP object
	@private
	@param {Object} sdp H2S json SDP
	@returns {String} SDP as string
	*/
	function _SDPToString(sdp) {
		// TODO: H2S should return v= o= s= t= a= lines, parse them
		// Hardcode this for now
		var roapsdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\na=group:BUNDLE audio video\r\n";
		for (mediaIndex in sdp) {
			roapsdp += "m=" + sdp[mediaIndex].m + "\r\n";
			roapsdp += "c=" + sdp[mediaIndex].c + "\r\n";
			for(attributeIndex in sdp[mediaIndex].attributes) {
				roapsdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
			}
		}
		
		return roapsdp;
	}
	
	/**
	Retrieve candidates from sdp
	@private
	@param {String} sdp SDP as string
	@returns {Array} Array of Ice candidates
	*/
	function _GetCandidates(sdp) {
		var candidates = [];
		
		var lines = sdp.split("\r\n");
		var labelIndex = -1;
		
		for (i in lines) {
			if (lines[i].indexOf("m=") == 0) {
				labelIndex++;
			} else if (lines[i].indexOf("a=candidate") == 0) {
				candidates.push({label: labelIndex, candidate: lines[i]});
			}
		}
		
		return candidates;
	}
	
	
	/**
	ROAP message handling object
	@deprecated Not used for JSEP. To remove when ROAP is no longer supported.
	@private
	*/
	function _DEPRECATEDRoap() {
		// H2S roap object 
		var _H2SRoap = {
			messageType : "",
			SDP : [],
			offererSessionId : "" ,
			answererSessionId : "",
			
			reset : function() {
				messageType = "",
				SDP = [],
				offererSessionId = "" ,
				answererSessionId = "";
			}
		};
		
		// Parse a ROAP message and return an SDP
		this.parseROAP = function(message) {
			//message = message.replace("RTP/AVPF 103 104 0 8 106 105 13 126", "RTP/AVPF 103 104 0 106 105 13 126");
			var json = JSON.parse(message.slice(message.indexOf("{")), message.lastIndexOf("}"));
			
			_H2SRoap.reset();
			
			_H2SRoap.messageType = json.messageType;
			_H2SRoap.offererSessionId = json.offererSessionId;
			_H2SRoap.answererSessionId = json.answererSessionId;
			_H2SRoap.SDP = null;
			_H2SRoap.seq = json.seq;
				
			if (json.sdp) {
				var SDP = {
					v : "",
					o : "",
					s : "",
					t : "",
					sdp : []
				};
			
				var sdp_string = JSON.stringify(json.sdp);
				// Get the v line
				var v_pattern = /v=(.*?)(?=\\r\\n)/g;
				var v_match = v_pattern.exec(sdp_string);
				SDP.v = v_match[1];

				// Get the o line
				var o_pattern = /o=(.*?)(?=\\r\\n)/g;
				var o_match = o_pattern.exec(sdp_string);
				SDP.o = o_match[1];

				// Get the s line
				var s_pattern = /s=(.*?)(?=\\r\\n)/g;
				var s_match = s_pattern.exec(sdp_string);
				SDP.s = s_match[1];

				// Get the t line
				var t_pattern = /t=(.*?)(?=\\r\\n)/g;
				var t_match = t_pattern.exec(sdp_string);
				SDP.t = t_match[1];

				// Get all media
				var media_pattern = /m=(.*)/g;
				var media_match = media_pattern.exec(sdp_string);
				var media = media_match[1];

				// Split all media
				var media_line_array = media.split("m=");
				
				for (var index in media_line_array) {
					var m = "m=" + media_line_array[index];
					var lines_array = m.split("\\r\\n");
					lines_array.pop();
					
					// For each media, split all the lines
					// Find the m, the c, and the a
					var m_struct = {
						m : "",
						c : "",
						attributes : []
					};
					
					for(var i in lines_array) {
						var line = lines_array[i];
						
						if (line[0] == "m") {
							m_struct.m = line.substring(2);
						}
						
						if (line[0] == "c") {
							m_struct.c = line.substring(2);
						}
						if (line[0] == "a") { 
							var a_line = {
                                		        	a : line.substring(2)
		                                        }
		                	//if (line.indexOf("PCMA") != -1)
		                	//	continue;
		                		
							m_struct.attributes.push(a_line);
						}
						
					}
					
					SDP.sdp.push(m_struct);
				}
				
				_H2SRoap.SDP = SDP;
			}
			
			return _H2SRoap;
		};
		
		// Build the OFFER ROAP message and process it
		this.processRoapOffer = function(mediaServices, sdp) {
			logger.log("Processing an OFFER...");
			this._lastSdp = sdp;
			
			var offererSessionId = null;
			var answererSessionId = null;
			var seq = 1;
			if (mediaServices._isModerator || (mediaServices._call instanceof Conference && !mediaServices._isModerator)) {
				seq = 2;
				offererSessionId = _H2SRoap.offererSessionId;
				answererSessionId = _H2SRoap.answererSessionId;
			} else {
				offererSessionId = this.idGenerator();
				seq = 1;
			}
			var tieBreaker = this.tieBreakerGenerator();

			//build the sdp

			//build the ROAP message
			//the sdp has been set on invitation received
			var roapsdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
			for (mediaIndex in sdp) {
				roapsdp += "m=" + sdp[mediaIndex].m + "\r\n";
				roapsdp += "c=" + sdp[mediaIndex].c + "\r\n";
				for(attributeIndex in sdp[mediaIndex].attributes) {
					roapsdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
				}
			}

			var roapStruct = {
				"messageType" : "OFFER",
				"offererSessionId" : offererSessionId,
				"answererSessionId" : answererSessionId,
				"sdp" : roapsdp,
				"seq" : seq,
				"tieBreaker" : tieBreaker
			};

			var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
			
			return roapMessage;
		};
		
		// Build the ANSWER ROAP message and process it
		this.processRoapAnswer = function(mediaServices, sdp, reversed) {
			logger.log("Processing an ANSWER...");
			this._lastSdp = sdp;
			var offererSessionId = null;
			var answererSessionId = null;
			var seq = 2;

			if (mediaServices._isModerator || (mediaServices._call instanceof Conference && !mediaServices._isModerator)) {
				seq = 1;
				offererSessionId = _H2SRoap.offererSessionId;
				answererSessionId = this.idGenerator();
			} else {
				seq = 2;
				offererSessionId = _H2SRoap.offererSessionId;
				answererSessionId = _H2SRoap.answererSessionId;
			}
			
			if (reversed)
			{
				seq = 2;
				offererSessionId = _H2SRoap.answererSessionId;
				answererSessionId = _H2SRoap.offererSessionId;
				offererSessionId = _H2SRoap.offererSessionId;
				answererSessionId = _H2SRoap.answererSessionId;
			}

			//build the sdp

			//build the ROAP message
			//the sdp has been set on invitation received
			var roapsdp = "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=\r\nt=0 0\r\n";
			for(mediaIndex in sdp) {
				roapsdp += "m=" + sdp[mediaIndex].m + "\r\n";
				roapsdp += "c=" + sdp[mediaIndex].c + "\r\n";
				for(attributeIndex in sdp[mediaIndex].attributes) {
					roapsdp += "a=" + sdp[mediaIndex].attributes[attributeIndex].a + "\r\n";
				}
			}

			var roapStruct = {
				"messageType" : "ANSWER",
				"offererSessionId" : offererSessionId,
				"answererSessionId" : answererSessionId,
				"sdp" : roapsdp,
				"seq" : seq
			};

			var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
			
			return roapMessage;
		};
		
		// Build the OK ROAP message and process it
		this.processRoapOK = function(mediaServices) {
			logger.log("Processing an OK...");

			if(!_H2SRoap.answererSessionId) {
				_H2SRoap.answererSessionId = this.idGenerator();
			}
			var offererSessionId = _H2SRoap.answererSessionId;
			var answererSessionId = _H2SRoap.offererSessionId;
			var seq = 1;
			if (mediaServices._isModerator) {
				seq = 2;
			} else {
				seq = 1;
			}
			var roapStruct = {
				"messageType" : "OK",
				"offererSessionId" : offererSessionId,
				"answererSessionId" : answererSessionId,
				"seq" : seq
			};

			var roapMessage = "SDP\n" + JSON.stringify(roapStruct);
			logger.log("roap message: " + roapMessage);
			return roapMessage;
		};
		
		// The offererSessionId and the answererSessionId must be of 32 characters
		this.idGenerator = function() {
			var S4 = function() {
				return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
			};
			return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
		};
		
		// The tieBreaker must be of 10 digits
		this.tieBreakerGenerator = function() {
			var id = Math.floor(Math.random() * 90000) + 1000000000;
			return id;
		};
	}

	/**
	Hashmap implementation
	@private
	*/
	var _HashMap = function() {
		var obj = [];
		obj.size = function () {
			return this.length;
		};
		obj.isEmpty = function () {
			return this.length == 0;
		};
		obj.contains = function (key) {
			for (i in this) {
				if (this[i].key == key) {
					return i;
				}
			}
			return -1;
		};
		obj.get = function (key) {
			var i = this.contains(key);
			if (i !== -1) {
				return this[i].value;
			}
		};
		obj.put = function (key, value) {
			if (this.contains(key) == -1) {
				this.push({'key': key, 'value': value});
				return true;
			}
			return false;
		};
		obj.clear = function () {
			for (i in this) {
				this.pop(i);
			}
		};
		obj.remove = function(key) {
			var i = this.contains(key);
			if (i) {
				this.splice(i,1);
			}
		};
		obj.getAll = function() {
			return this;
		};
		return obj;
	};
})(window);
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
