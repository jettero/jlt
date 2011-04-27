/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Mojo $ ControlPanelAssistant clearTimeout setInterval setTimeout WebviewDialog Ajax ExtraInfoDialog
*/

/*
** I'm not totally sure what to do with the LEDs yet, but I'm
** going to try to write a strategy so it becomes clearer:
**
** 1. Blue is GPS and GPS buffer status.
** 2. Green is Webs and Web statuses.
** 3. Red indicates an error of some kind.
**
** I'm thinking of lighting the red with the blue/green to indicate what type
** of error... Various blinkings could probably be used to indicate things.
*/

var short_blink    =  200;
var medium_blink   =  750;
var long_blink     = 1200;
var blink_off_time =  100;

// function ControlPanelAssistant() {{{
function ControlPanelAssistant() {
    Mojo.Log.info("ControlPanel()");
}
// }}}

// ControlPanelAssistant.prototype.setup = function() {{{
ControlPanelAssistant.prototype.setup = function() {
    Mojo.Log.info("ControlPanel::setup()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.menuSetup();

    this.redLEDCount   = [];
    this.greenLEDCount = [];
    this.blueLEDCount  = [];

    this.fixCount = 0;
    this.ackCount = 0;
    this._request_no = 0;

    // eog $(find ../usr.palm.frameworks/ -name \*.png | grep menu-icon)
    this.sendModel = { label: "Send", icon: 'send',          submenu: 'send-submenu' };
    this.noteModel = { label: "Note", icon: 'conversation',  submenu: 'note-submenu' };

    this.commandMenuModel = { label: 'ControlPanel Command Menu', items: [ this.noteModel ] };
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenuModel);

    this.sendSubmenu = { label: 'Send Submenu', items: [{label: "email", command: 'send@@email'}, {label: "IM or SMS", command: "send@@imsms"}] };
    this.noteSubmenu = { label: 'Note Submenu', items: [{label: "set trip tag", command: "set-tag"}, {label: 'send POI', command: "send-poi"}] };

	this.controller.setupWidget('send-submenu', undefined, this.sendSubmenu);
	this.controller.setupWidget('note-submenu', undefined, this.noteSubmenu);

    this.blinkRedLED_2   = this.blinkRedLED_2.bind(this);
    this.blinkRedLED_3   = this.blinkRedLED_3.bind(this);
    this.blinkGreenLED_2 = this.blinkGreenLED_2.bind(this);
    this.blinkGreenLED_3 = this.blinkGreenLED_3.bind(this);
    this.blinkBlueLED_2  = this.blinkBlueLED_2.bind(this);
    this.blinkBlueLED_3  = this.blinkBlueLED_3.bind(this);

    this.postFixesSuccess = this.postFixesSuccess.bind(this);
    this.postFixesFailure = this.postFixesFailure.bind(this);
    this.postFixes4xxFail = this.postFixes4xxFail.bind(this);

    this.trackingLoop    = this.trackingLoop.bind(this);
    this.bufferCheckLoop = this.bufferCheckLoop.bind(this);
    this.everySecond     = function() {
            this.trackingLoop();
            this.bufferCheckLoop();
        }.bind(this);

    setInterval(this.everySecond, 1100);
    // Longer than a second because the timer seems a bit fast on the EMU...
    // probably doesn't matter very much anyway.

    this.trackingSuccessResponseHandler = this.trackingSuccessResponseHandler.bind(this);
    this.trackingFailedResponseHandler  = this.trackingFailedResponseHandler.bind(this);

    var options = {
        name:    "JLTOptions",
        version: 1,
        replace: false // opening existing if possible
    };

    this.dbo = new Mojo.Depot(options, function(){}, function(t,r){
        Mojo.Controller.errorDialog("Can't open location database (#" + r.message + ").");
    });

    Mojo.Log.info("restoring=true (1)");
    this.restoring = true;

    this.trackingOpts = {};
    this.trackingModel = { value: false };
    this.controller.setupWidget('trackingToggle', this.trackingOpts, this.trackingModel);
    this.trackingChanged = this.trackingChanged.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get('trackingToggle'), Mojo.Event.propertyChange, this.trackingChanged);

    this.continuousOpts = {};
    this.continuousModel = { value: true }; // this probably works better, only concern is battery
    this.controller.setupWidget('continuousUpdates', this.continuousOpts, this.continuousModel);
    this.continuousChanged = this.continuousChanged.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get('continuousUpdates'), Mojo.Event.propertyChange, this.continuousChanged);

    this.startupOpts = {};
    this.startupModel = { value: false };
    this.controller.setupWidget('startupTrackingEnabled', this.startupOpts, this.startupModel);
    Mojo.Event.listen(this.controller.get('startupTrackingEnabled'), Mojo.Event.propertyChange,
        function(){ this.savePrefs(); }.bind(this));

    this.postURLAttributes = {
        hintText:      'http://db.JGPS.me/input',
        textFieldName: 'postURL',
        maxLength:     2048,
        textCase:      Mojo.Widget.steModeLowerCase,
        autoFocus:     false,
        enterSubmits:  true,
        holdToEdit:    true, // otherwise it steals focus first thing
        multiline:     false
    };
    this.postURLModel = { value: '' };
    this.controller.setupWidget('postURL', this.postURLAttributes, this.postURLModel);
    this.postURLChanged = this.postURLChanged.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get('postURL'), Mojo.Event.propertyChange, this.postURLChanged);

    this.viewURLAttributes = {
        hintText:      'http://mysite/cgi/location',
        textFieldName: 'viewURL',
        maxLength:     2048,
        textCase:      Mojo.Widget.steModeLowerCase,
        autoFocus:     false,
        enterSubmits:  true,
        holdToEdit:    true, // otherwise it steals focus first thing
        multiline:     false
    };
    this.viewURLModel = { value: '' };
    this.controller.setupWidget('viewURL', this.viewURLAttributes, this.viewURLModel);
    this.viewURLChanged = this.viewURLChanged.bindAsEventListener(this);
    this.viewURLTapped  = this.viewURLTapped.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get('viewURL'), Mojo.Event.propertyChange, this.viewURLChanged);
    Mojo.Event.listen(this.controller.get('viewURL'), Mojo.Event.tap, this.viewURLTapped);

    this.intervalSubmenu = { label: 'Interval Submenu', items: [
        '5s', '10s', '15s', '1m', '3m', '5m', '10m', '1hour'
    ]};
	this.controller.setupWidget('interval-submenu', undefined, this.intervalSubmenu);

    var intervalAttributes = {
        label: "interval",
        choices: [
            {label: "5 seconds",    value:    5},
            {label: "10 seconds",   value:   10},
            {label: "15 seconds",   value:   15},
            {label: "30 seconds",   value:   30},
            {label: "1 minute",     value:   60},
            {label: "3 minutes",    value:  180},
            {label: "5 minutes",    value:  300},
            {label: "10 minutes",   value:  600},
            {label: "15 minutes",   value:  900},
            {label: "30 minutes",   value: 1800},
            {label: "1 hour",       value: 3600}
        ]
    };
    this.updateIntervalModel = {value: 10, disabled: false};
    this.controller.setupWidget('updateInterval', intervalAttributes, this.updateIntervalModel);
    this.updateIntervalChanged = this.updateIntervalChanged.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("updateInterval"), Mojo.Event.propertyChange, this.updateIntervalChanged);

    this.bufferSizeAttributes = {
        minValue: 1,
        maxValue: 20,
        updateInterval: 0.1, // this is 100ms I guess, doesn't seem to do anything... who knows
        round: true
    };
    this.bufferSizeModel = { value: 5 };
    this.controller.setupWidget('bufferSize', this.bufferSizeAttributes, this.bufferSizeModel);
    this.bufferSizeChanged = this.bufferSizeChanged.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("bufferSize"), Mojo.Event.propertyChange, this.bufferSizeChanged);

    this.continuousChanged();
    this.updateIntervalChanged();
    this.bufferSizeChanged();

    this.bufferFillOpts  = { };
    this.bufferFillModel = { value: 0 };
    this.controller.setupWidget('bufferFill', this.bufferFillOpts, this.bufferFillModel);
    this.buffer = [];

    this.restoring = false;

    this.doneAuthing = this.doneAuthing.bind(this);

    for( var _k in this ) {
        if( _k.match(/Model$/) )
            this[_k].def = this[_k].value;
    }
};
// }}}
// ControlPanelAssistant.prototype.activate = function(event) {{{
ControlPanelAssistant.prototype.activate = function(event) {
    Mojo.Log.info("ControlPanel::activate()");

    this.restorePrefs();
};
// }}}
// ControlPanelAssistant.prototype.deactivate = function(event) {{{
ControlPanelAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("ControlPanel::deactivate()");

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.cleanup = function(event) {{{
ControlPanelAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("ControlPanel::cleanup()");

    // XXX: What needs to be cleaned up?  Seriously.  Does any of this clean
    // itself up? or do you have to go through and destroy each object and
    // click handler?

    if( this.trackingHandle )
        this.trackingHandle.cancel();
};
// }}}

// ControlPanelAssistant.prototype.resetQueue = function() {{{
ControlPanelAssistant.prototype.resetQueue = function() {
    this.buffer = [];
    this.bufferFillModel.value = 0;
    this.controller.modelChanged(this.bufferFillModel);

    this.blinkBlueLED(long_blink);
    this.updateAction("reset queue");
};
// }}}
// ControlPanelAssistant.prototype.pushQueue = function(item) {{{

function veryClose(x,i) {
    if( Math.abs( x-i ) < 0.00001 )
        return true;

    return false;
}

ControlPanelAssistant.prototype.pushQueue = function(item) {
    if( !this.trackingModel.value )
        return;

    if( this.buffer.length > 0 ) {
        var last = this.buffer[this.buffer.length -1];

        if( veryClose(last.ll[0], item.ll[0]) && veryClose(last.ll[1], item.ll[1]) && veryClose(last.al, item.al) ) {
            if( typeof last.t === "number" ) {
                last.t = [last.t, item.t];

                this.blinkBlueLED(short_blink);
                return;

            } else if( last.t.length < this.bufferSizeModel.tcv ) {
                last.t.push(item.t);

                this.blinkBlueLED(short_blink);
                return;
            }
        }
    }

    this.buffer.push(item);
    this.updateAction("got fix");

    if( this.buffer.length > this.bufferSizeModel.cv ) {
        while( this.buffer.length > this.bufferSizeModel.cv ) {
            this.buffer.shift();
            this.blinkBlueLED(short_blink);
            this.blinkRedLED(short_blink);
        }

    } else {
        this.blinkBlueLED(short_blink);
    }

    this.bufferFillModel.value = (1.0*this.buffer.length) / this.bufferSizeModel.cv;
    this.controller.modelChanged(this.bufferFillModel);

    Mojo.Log.info( "ControlPanel::pushQueue() -- buffer-fullness: "
        + (this.bufferFillModel.value*100) + " items: " + this.buffer.length );
};
// }}}
// ControlPanelAssistant.prototype.rmQueue = function(item) {{{
ControlPanelAssistant.prototype.rmQueue = function(timestamp) {
    Mojo.Log.info("ControlPanel::rmQueue(timestamp=%d) [bl: %d]", timestamp, this.buffer.length);

    for(var i=this.buffer.length-1; i>=0; i--) {
        if( typeof this.buffer[i].t === "number" ) {
            if( this.buffer[i].t === timestamp ) {
                delete this.buffer[i];
                this.buffer.splice(i,1);
                this.ackCount ++;
                this.bufferFillModel.value = (1.0*this.buffer.length) / this.bufferSizeModel.cv;
                this.controller.modelChanged(this.bufferFillModel);
                Mojo.Log.info("ControlPanel::rmQueue(timestamp=%d) [bl: %d; dequeued single [i].t]",
                    timestamp, this.buffer.length);
                return;

            }

        } else {
            for(var j=this.buffer[i].t.length-1; j>=0; j--) {
                if( this.buffer[i].t[j] === timestamp ) {
                    delete this.buffer[i].t[j];
                    this.buffer[i].t.splice(j,1);
                    this.ackCount ++;

                    Mojo.Log.info("ControlPanel::rmQueue(timestamp=%d) [bl: %d; dequeued array [i].t[j]]",
                        timestamp, this.buffer.length);

                    if( this.buffer[i].t.length < 1 ) {
                        delete this.buffer[i];
                        this.buffer.splice(i,1);
                        this.bufferFillModel.value = (1.0*this.buffer.length) / this.bufferSizeModel.cv;
                        this.controller.modelChanged(this.bufferFillModel);
                        Mojo.Log.info("ControlPanel::rmQueue(timestamp=%d) [bl: %d; nuked array]",
                            timestamp, this.buffer.length);
                    }

                    return;
                }
            }
        }
    }
};
// }}}

/* {{{ */ ControlPanelAssistant.prototype.setToken = function(token) {
    Mojo.Log.info("ControlPanel::setToken(): %s", token);

    this._token = token;
    this.savePrefs();
};

/*}}}*/

// ControlPanelAssistant.prototype.postURLChanged = function() {{{
ControlPanelAssistant.prototype.postURLChanged = function() {
    Mojo.Log.info("ControlPanel::postURLChanged(): %s", this.postURLModel.value);

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.viewURLChanged = function() {{{
ControlPanelAssistant.prototype.viewURLChanged = function() {
    Mojo.Log.info("ControlPanel::viewURLChanged(): %s", this.viewURLModel.value);

    if( this.viewURLModel.value && this.viewURLModel.value.match(/[a-zA-Z]/) ) {
        this.commandMenuModel.items = [ this.noteModel, this.sendModel ];
        this.controller.modelChanged(this.commandMenuModel);

    } else {
        this.commandMenuModel.items = [ this.noteModel ];
        this.controller.modelChanged(this.commandMenuModel);
    }

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.viewURLTapped = function() {{{
ControlPanelAssistant.prototype.viewURLTapped = function() {
    var url = this.viewURLModel.value;
    Mojo.Log.info("ControlPanel::viewURLTapped(): %s", url);

    if( url && url.match(/[a-zA-Z]/) ) {
        this.controller.serviceRequest("palm://com.palm.applicationManager", {
            method: "open",
            parameters:  {
               id: 'com.palm.app.browser',
               params: { target: url }
            }
        });
    }
};
// }}}
// ControlPanelAssistant.prototype.updateIntervalChanged = function(event) {{{
ControlPanelAssistant.prototype.updateIntervalChanged = function(event) {
    var sv = this.updateIntervalModel.value;

    Mojo.Log.info("ControlPanel::updateIntervalChanged(): %d seconds", sv);

    this.updateIntervalModel.value = parseInt(sv, 10);
    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.bufferSizeChanged = function(event) {{{
ControlPanelAssistant.prototype.bufferSizeChanged = function(event) {
    this.bufferSizeModel.cv = parseInt(this.bufferSizeModel.value, 10) * 5;
    this.bufferSizeModel.tcv = this.bufferSizeModel.cv * 3;

    Mojo.Log.info("ControlPanel::bufferSizeChanged(): %d messages", this.bufferSizeModel.cv);

    $('bufferSizeCurrent').innerHTML = this.bufferSizeModel.cv + " messages";

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.trackingChanged = function(event) {{{
ControlPanelAssistant.prototype.trackingChanged = function() {
    Mojo.Log.info("ControlPanel::trackingChanged()", this.trackingModel.value ? "on" : "off");

    this._request_no = 0;

    if( this.trackingModel.value ) {
        if( this.continuousModel.value ) {

            this.trackingHandle = this.controller.serviceRequest('palm://com.palm.location', {
                method:"startTracking",
                parameters: {"subscribe":true},
                onSuccess: this.trackingSuccessResponseHandler,
                onFailure: this.trackingFailedResponseHandler
            });

        }

        this.trackingLast = 0;
        this.controller.get("continuousUpdatesGroup").hide();
        $$("div.explanation").each(function(i){i.hide();});

    } else {
        if( this.trackingHandle ) {
            this.trackingHandle.cancel();
            delete this.trackingHandle;
        }

        // Let the buffer check loop send it all... it'll bottom it out eventually.
        // this.resetQueue();

        this.controller.get("continuousUpdatesGroup").show();
        $$("div.explanation").each(function(i){i.show();});
    }
};
// }}}
// ControlPanelAssistant.prototype.continuousChanged = function(event) {{{
ControlPanelAssistant.prototype.continuousChanged = function(event) {
    Mojo.Log.info("ControlPanel::continuousChanged(): %s", this.continuousModel.value ? "on" : "off");

    /*
    ** if( this.continuousModel.value ) $('updateIntervalGroup').hide();
    ** else $('updateIntervalGroup').show();
    */

    this.savePrefs();
};
// }}}

/* {{{ */ ControlPanelAssistant.prototype.doneAuthing = function(token) {
    if( this.runningRequest ) {
        Mojo.Log.info("ControlPannel::doneAuthing [request still running, coming back in a couple seconds]");
        setTimeout(function(){ this.doneAuthing(); }.bind(this), 2e3);
        return;
    }

    Mojo.Log.info("ControlPannel::doneAuthing [done]");
    this._authing = false;
    this.setToken(token);
};

/*}}}*/

// ControlPanelAssistant.prototype.postFixesSuccess = function(transport) {{{
ControlPanelAssistant.prototype.postFixesSuccess = function(transport) {
    Mojo.Log.info("ControlPanel::postFixesSuccess() %d: %s", transport.status, transport.statusText);

    if( transport.status >= 200 && transport.status < 300 ) {
        var js;

        try {
            var rt = (js = transport.responseText.evalJSON()).fix_tlist;

            if( rt ) {
                for(var i=0; i<rt.length; i++) {
                    var t = rt[i];

                    this.blinkGreenLED(short_blink);
                    this.rmQueue(t);

                    this.updateReads();
                    this.updateAction("posted fixes");
                }
            }
        }

        catch(e) {
            Mojo.Log.info("ControlPanel::postFixesSuccess, error processing js: %s", e);
            this.blinkRedLED(medium_blink);
            this.blinkGreenLED(medium_blink);
            this.updateAction("response error");
        }

        delete this.runningRequest;

        if( js ) {
            var meta = js.meta;

            if( meta ) {

                // NOTE: "" + meta.blarg is a weak (very) way of sanitizing the inputs.

                if( meta.auth_url ) {
                    Mojo.Log.info("ControlPannel::postFixesSuccess found auth_url in meta section: %s", meta.auth_url);

                    if( !this._authing ) {
                        Mojo.Log.info("ControlPannel::postFixesSuccess opening auth_url dialog");

                        this._authing = true;

                        this.SC.showScene("Webview", {
                            title: "Authentication Requested",
                            URL: "" + meta.auth_url,
                            donecb: this.doneAuthing
                        });

                    } else {
                        Mojo.Log.info("ControlPannel::postFixesSuccess auth_url dialog already running");
                    }
                }

                if( !this.postURLModel.value ) {
                    this.postURLModel.value = "http://db.JGPS.me/input";
                    this.controller.modelChanged(this.postURLModel);
                    this.savePrefs();
                }

                if( meta.view_url ) {
                    Mojo.Log.info("ControlPannel::postFixesSuccess found view_url in meta section: %s", meta.view_url);

                    this.viewURLModel.value = "" + meta.view_url;
                    this.controller.modelChanged(this.viewURLModel);
                    this.viewURLChanged(); // tell the prefs system to save this
                }

                // TODO: other things should probably be configurable this way also
            }
        }

    } else {
        // if prototype doesn't know what happened, it thinks it's a success (eat my ass)

        this.postFixesFailure(transport);
        this.blinkRedLED(medium_blink);
        this.blinkGreenLED(medium_blink);
        this.updateAction("HTTP error");
    }
};
// }}}
// ControlPanelAssistant.prototype.postFixesFailure = function(transport) {{{
ControlPanelAssistant.prototype.postFixesFailure = function(transport) {
    Mojo.Log.info("ControlPanel::postFixesFailure() %d: %s", transport.status, transport.statusText);

    setTimeout(function(){ delete this.runningRequest; }.bind(this), 2e3);

    this.blinkRedLED(short_blink);
    this.blinkGreenLED(short_blink);
    this.updateAction("HTTP error");
};
// }}}
// ControlPanelAssistant.prototype.postFixes4xxFail = function(transport) {{{
ControlPanelAssistant.prototype.postFixes4xxFail = function(transport) {
    var s,st,error;
    Mojo.Log.info("ControlPanel::postFixes4xxFail() %d: %s", s=transport.status, st=transport.statusText);

    if( st ) {
        error = st;

        if( !error.match(s) )
            error = s + " " + error;

    } else {
        switch(s) {
            case 403:
                error = "400 permission denied";
                break;

            case 404:
                error = "400 resource not found";
                break;

            default:
                error = s + " error unknown";
        }
    }

    Mojo.Log.info("ControlPanel::postFixes4xxFail() [dialog]: ", error);
    Mojo.Controller.errorDialog("Error posting fixes: " + error);

    this.updateAction("http suspended");

    setTimeout(function(){ delete this.runningRequest; }.bind(this), 2e3);

    this._4xxFailURL = this.postURLModel.value;

    this.trackingModel.value = false;
    this.controller.modelChanged(this.trackingModel);

    this.blinkRedLED(long_blink);
    this.blinkGreenLED(long_blink);
    this.updateAction("HTTP error");
};
// }}}

// ControlPanelAssistant.prototype.bufferCheckLoop = function() {{{
ControlPanelAssistant.prototype.bufferCheckLoop = function() {
    // Mojo.Log.info("ControlPanel::bufferCheckLoop() ... thingking (%d, %s)", this.buffer.length, this.runningRequest ? "true" : "false");

    if( this._4xxFailURL ) {
        if( this._4xxFailURL === this.postURLModel.value )
            return;

        delete this._4xxFailURL;
    }

    if( this.runningRequest )
        return;

    if( this._authing ) {
        Mojo.Log.info("ControlPanel::bufferCheckLoop() [skipping request since we are authing] buflen=%d", this.buffer.length);

        if( this.trackingModel.value ) {
            Mojo.Log.info("ControlPanel::bufferCheckLoop() [disabling tracking because we are authing] buflen=%d", this.buffer.length);

            // NOTE: I actually have mixed feelings about this.  should
            // probably be an option.  If the buffer is big enough it may be
            // worth collecting data while the user is unauthed.

            this.trackingModel.value = false;
            this.controller.modelChanged(this.trackingModel);
            this.trackingChanged();
        }

        // If we're authing, there's really no reason to keep trying to post data to the collector

        return;
    }

    if( this.buffer.length > 0 ) {
        this.updateAction("HTTP running");

        var p = { fixes: Object.toJSON(this.buffer) };

        if( this._request_no === 0 )
            p.send_view_url = true;

        if( this._token )
            p.token = this._token;

        Mojo.Log.info("ControlPanel::bufferCheckLoop() todo: %d [starting request] fixes params: %s",
            this.buffer.length, Object.toJSON(p));

        this._request_no ++;
        this.runningRequest = new Ajax.Request(this.postURLModel.value||"http://db.JGPS.me/input", {
            method: 'post',

            parameters: p,

            on403: this.postFixes4xxFail,
            on404: this.postFixes4xxFail,

            onSuccess:   this.postFixesSuccess,
            onFailure:   this.postFixesFailure,
            onException: this.postFixesFailure
        });
    }
};
// }}}
// ControlPanelAssistant.prototype.trackingLoop = function() {{{
ControlPanelAssistant.prototype.trackingLoop = function() {
    if( !this.trackingModel.value || this.continuousModel.value )
        return;

    var now = (new Date()).getTime()/1000;

    // Mojo.Log.info("(tL:%d + uIMv:%d):%d < now:%d",
    //     this.trackingLast, this.updateIntervalModel.value,
    //     (this.trackingLast+this.updateIntervalModel.value),
    //     now );

    if( this.trackingLast + this.updateIntervalModel.value < now ) {
        Mojo.Log.info("ControlPanel::trackingLoop() [loop true]");
        this.trackingLast = now;

        if( !this.trackingFixRunning ) {
            this.trackingFixRunning = true;

            this.blinkBlueLED(short_blink);
            this.updateAction("request fix");

            this.controller.serviceRequest('palm://com.palm.location', {
                method:     "getCurrentPosition",
                onSuccess:  this.trackingSuccessResponseHandler,
                onFailure:  this.trackingFailedResponseHandler,
                parameters: {
                    // 1: high (100m or less), 2: default medium (350m or less), 3: low
                    accuracy: 2,

                    // 1: 5sec, 2: default 5-20 sec, 3: 20+sec
                    responseTimeA: 2,

                    // max age of cached result, default 0: do not use cached result
                    maximumAge: this.updateIntervalModel.value - 1
                }
            });
        }
    }
};
// }}}

/* {{{ */ ControlPanelAssistant.prototype.validateItem = function(item) {
    if( !item.t ) {
        Mojo.Log.error("ControlPanel::validateItem(): [fail] no timestamp");
        return false;
    }

    if( (typeof item.ll !== 'object') || !item.ll[0] || !item.ll[1] ) {
        Mojo.Log.error("ControlPanel::validateItem(): [fail] bad location");
        return false;
    }

    // ... we can maybe do other things here at some point ...
    // (This was mainly to fix https://github.com/jettero/jlt/issues/#issue/3)

    return true;
};

/*}}}*/

// ControlPanelAssistant.prototype.trackingSuccessResponseHandler = function(result) {{{
ControlPanelAssistant.prototype.trackingSuccessResponseHandler = function(result) {
    /* var asJSON = Object.toJSON(result);
    ** Mojo.Log.info("ControlPanel::trackingSuccessResponseHandler(): %s", asJSON);
    */

    /*
    ** 2010-01-05T23:36:28.366243Z [177865] qemux86 user.notice LunaSysMgr:
    ** {LunaSysMgrJS}: com.jettero.jlt: Info:
    ** ControlPanel::trackingSuccessResponseHandler(): {"errorCode": 0,
    ** "timestamp": 1262734588363, "latitude": 37.392809987068176, "longitude":
    ** -122.04046189785004, "horizAccuracy": 0.5, "heading": 0, "velocity": 0,
    ** "altitude": 500, "vertAccuracy": 0.5},
    ** file:///var/usr/palm/applications/com.jettero.jlt/index.html:0
    */

    if( this.continuousModel.value ) {
        // If we're in continuous mode, we check the updateinterval to see if
        // it's too soon to post this fix.  This is similar to what
        // trackingLoop does.

        var now = (new Date()).getTime()/1000;

        // NOTE: Since continuous fixes don't always come every second, it
        // makes sense to use a fuzzy interval match, but how wide should the
        // interval be?  Here, we pretend to be a few seconds in the future.

        var fake_dt = parseInt(0.1 * this.updateIntervalModel.value, 10);
        if( fake_dt <  1 ) fake_dt = 1;
        if( fake_dt > 30 ) fake_dt = 30;

        if( this.trackingLast + this.updateIntervalModel.value < (now+fake_dt) )
            this.trackingLast = now; // fall through and record fix

        else return; // too soon
    }

    this.trackingFixRunning = false;
    this.fixCount ++;

    this.updateReads();

    var item = {
        t:  result.timestamp,
        ll: [ result.latitude, result.longitude ],
        ha: result.horizAccuracy,
        va: result.vertAccuracy,
        al: result.altitude,
        vv: [ result.velocity, result.heading ]
    };

    if( this._poi ) {
        item.poi = this._poi;
        this._poi = false;
    }

    if( this._tag )
        item.tag = this._tag;

    if( !this.validateItem( item ) ) {
        this.blinkRedLED(short_blink);
        this.blinkBlueLED(short_blink);
        this.updateAction("skip bad fix");
        return;
    }

    this.pushQueue(item);
    this.updateFixDesc(result.latitude, result.longitude, result.altitude, result.velocity, result.heading, item.poi, item.tag);
};
// }}}
// ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {{{
ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {
    var errCode = result.errorCode;
    var errStr  = this.errCodeToStr(errCode);

    this.trackingFixRunning = false;

    Mojo.Log.info("ControlPanel::trackingFailedResponseHandler() = %s (%d)", errStr, errCode);

    this.blinkRedLED(medium_blink);
    this.blinkBlueLED(medium_blink);
    this.updateAction("fix error");
};
// }}}

// ControlPanelAssistant.prototype.restorePrefs = function() {{{
ControlPanelAssistant.prototype.restorePrefs = function() {
    Mojo.Log.info("ControlPannel::restorePrefs())");

    this.dbo.simpleGet("prefs",
        function(prefs) {
            Mojo.Log.info("restoring prefs: %s", Object.toJSON(prefs));

            if( prefs === null )
                return;

            this.restoring = true;

            this.updateIntervalModel.value = prefs.updateInterval;
            this.bufferSizeModel.value     = prefs.bufferSize;
            this.continuousModel.value     = prefs.continuous;
            this.viewURLModel.value        = prefs.viewURL;
            this._token                    = prefs.token;
            this.postURLModel.value        = prefs.postURL;
            this.startupModel.value        = prefs.startupModel;

            this.controller.modelChanged(this.updateIntervalModel);
            this.controller.modelChanged(this.bufferSizeModel);
            this.controller.modelChanged(this.continuousModel);
            this.controller.modelChanged(this.postURLModel);
            this.controller.modelChanged(this.viewURLModel);
            this.controller.modelChanged(this.startupModel);

            this.viewURLChanged(); // this does some additional stuff, the others don't really do

            this.bufferSizeChanged();
            this.updateIntervalChanged();
            this.continuousChanged();

            this.restoring = false;

            Mojo.Log.info("restored prefs: %s", Object.toJSON(prefs));

        }.bind(this),

        function(transaction, error) {
            Mojo.Controller.errorDialog("ERROR restoring prefs (#" + error.message + ").");

        }.bind(this)
    );
};
// }}}
// ControlPanelAssistant.prototype.savePrefs = function() {{{
ControlPanelAssistant.prototype.savePrefs = function() {
    Mojo.Log.info("ControlPannel::savePrefs() restoring=%s (aborts when true)", this.restoring ? "true" : "false");

    if( this.restoring )
        return;

    var prefs = {
        postURL:        this.postURLModel.value,
        viewURL:        this.viewURLModel.value,
        continuous:     this.continuousModel.value,
        updateInterval: this.updateIntervalModel.value,
        bufferSize:     this.bufferSizeModel.value,
        startup:        this.startupModel.value,
        token:          this._token
    };

    this.dbo.simpleAdd("prefs", prefs,
        function() {
            Mojo.Log.info("saved prefs: %s", Object.toJSON(prefs) );

        }.bind(this),

        function(transaction,result) {
            Mojo.Controller.errorDialog("ERROR saving prefs (#" + result.message + ").");
        }.bind(this)
    );
};
// }}}
// ControlPanelAssistant.prototype.resetMe = function() {{{
ControlPanelAssistant.prototype.resetMe = function() {
    Mojo.Log.info("ControlPannel::resetMe()");

    this.controller.showAlertDialog({
        onChoose: function(value) {
            if( value === "reset" ) {
                Mojo.Log.info("ControlPannel::resetMe() [resetting]");

                Mojo.Log.info("   killing tracking");
                this.trackingModel.value = false;
                this.controller.modelChanged(this.trackingModel);
                this.trackingChanged();

                Mojo.Log.info("   resetting counts");
                this.fixCount = 0;
                this.ackCount = 0;

                this.postURLModel.value        = this.postURLModel.def;
                this.viewURLModel.value        = this.viewURLModel.def;
                this.continuousModel.value     = this.continuousModel.def;
                this.updateIntervalModel.value = this.updateIntervalModel.def;
                this.bufferSizeModel.value     = this.bufferSizeModel.def;
                this._token = '';

                Mojo.Log.info("   resetting models [postURLModel: %s]",        this.postURLModel.value);
                Mojo.Log.info("   resetting models [viewURLModel: %s]",        this.viewURLModel.value);
                Mojo.Log.info("   resetting models [continuousModel: %s]",     this.continuousModel.value);
                Mojo.Log.info("   resetting models [updateIntervalModel: %s]", this.updateIntervalModel.value);
                Mojo.Log.info("   resetting models [bufferSizeModel: %s]",     this.bufferSizeModel.value);

                // this.savePrefs(); // these three below all save anyway

                this.continuousChanged();
                this.updateIntervalChanged();
                this.bufferSizeChanged();

                this.controller.modelChanged( this.postURLModel        );
                this.controller.modelChanged( this.viewURLModel        );
                this.controller.modelChanged( this.continuousModel     );
                this.controller.modelChanged( this.updateIntervalModel );
                this.controller.modelChanged( this.bufferSizeModel     );

            } else {
                Mojo.Log.info("ControlPannel::resetMe() [equivocating]");
            }

        }.bind(this),

        title:   "Reset all Settings",
        message: "Are you sure you want to reset everything?",
        choices:[
            {label: "Reset",  value:"reset",  type:'negative'},
            {label: "Cancel", value:"cancel", type:'dismiss'}
        ]
    });
};
// }}}
// ControlPanelAssistant.prototype.clearToken = function() {{{
ControlPanelAssistant.prototype.clearToken = function() {
    Mojo.Log.info("ControlPannel::clearToken()");

    this.controller.showAlertDialog({
        onChoose: function(value) {
            if( value === "clear" ) {
                this.setToken('');

            } else {
                Mojo.Log.info("ControlPannel::resetMe() [equivocating]");
            }

        }.bind(this),

        title:   "Clear Token",
        message: "Are you sure you want to clear the authentication token?",
        choices:[
            {label: "Clear",  value:"clear",  type:'negative'},
            {label: "Cancel", value:"cancel", type:'dismiss'}
        ]
    });
};
// }}}

// ControlPanelAssistant.prototype.errCodeToStr = function(errorCode) {{{
ControlPanelAssistant.prototype.errCodeToStr = function(errorCode) {
    var res = {
        0: "Success",
        1: "Timeout",
        2: "Position_Unavailable",
        3: "Unknown",
        4: "GPS_Permanent_Error (no more GPS fix in this case, but can still get the Cell and Wi-Fi fixes)",
        5: "LocationServiceOFF - No Location source available. Both Google and GPS are off.",
        6: "Permission Denied - The user has not accepted the terms of use for the Google Location Service, or the Google Service is off.",
        7: "The application already has a pending message",
        8: "The application has been temporarily blacklisted."
    };

    if( res[errorCode] === undefined )
        return "something bad happened, error unknown";

    return res[errorCode];
};
// }}}

/* {{{ */ ControlPanelAssistant.prototype.handleCommand = function(event) {
    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*[@][@]\s*/);

        switch (s_a[0]) {
            case 'send':
                Mojo.Log.info("handleCommand(send: %s)", s_a[1]);
                if( !this.viewURLModel.value ) {

                    this.controller.get("viewURL")._mojoController.assistant.makeTextfieldEditable();
                    Mojo.Controller.errorDialog("Please set a view URL first.");

                    // I'd like to set focus to the view textfield, but the
                    // method isn't exposed and there's no (known) way to get
                    // the widget object, only the HTMLDIV. :(
                    //
                    // var vu = this.controller.???("viewURL");
                    // vu.disabled = false;
                    // vu.updateEnabledState();
                    // vu.focus();

                    // this (and some source diving in palmInitFramework330.js)
                    // is how I found the widget controller and object ref:

                    /// /// for(var k in this.controller.get("viewURL"))
                    /// ///     Mojo.Log.info("hrm: %s", k);

                    /// /// for(var k in this.controller.get("viewURL").mojo)
                    /// ///     Mojo.Log.info("hrm2: %s", k);

                    /// /// for(var k in this.controller.get("viewURL")._mojoController)
                    /// ///     Mojo.Log.info("hrm3: %s", k);

                    /// /// for(var k in this.controller.get("viewURL")._mojoController.assistant)
                    /// ///     Mojo.Log.info("hrm4: %s", k);

                    return;
                }

                switch(s_a[1]) {
                    case "email":
                        this.controller.serviceRequest("palm://com.palm.applicationManager", {
                                method: 'open',
                                parameters: {
                                    id: "com.palm.app.email",
                                    params: {
                                        summary: "[JLT] Track My Location in Real-Time",
                                        text: "<p>I have an app on my phone that lets me upload tracking information to websites."
                                        + "  The information can be tracked real time if you know the URL for it.<p.It is located here:<br><br>"
                                        + "<a href='" + this.viewURLModel.value + "'>" + this.viewURLModel.value + "</a>"
                                    }
                                }
                            }
                        );
                        break;

                    case "imsms":
                        this.controller.serviceRequest('palm://com.palm.applicationManager', {
                             method: 'launch',
                             parameters: {
                                 id: 'com.palm.app.messaging',
                                 params: {
                                     messageText: 'You can track my location realtime here: ' + this.viewURLModel.value
                                 }
                             }
                         });

                    default:
                        Mojo.Log.info("handleCommand(unknown send-command target elm[1]: %s)", Object.toJSON(s_a));
                        break;
                }

                break;

            case 'set-tag':
                Mojo.Log.info("handleCommand(set-tag)");
                this.controller.showDialog({
                    template: 'dialogs/tag',
                    assistant: new ExtraInfoDialog(this.controller, {maxLength: 64, hintText: "trip name"},

                        function(info){
                            this._tag = info;
                            this.trackingLast = 0; // try to update right away so we can show the start of the tag
                        }.bind(this),

                        function() {
                            this._tag = false;
                            this.trackingLast = 0; // try to update right away so we can show the end of the tag
                        }.bind(this)
                    )
                });
                break;

            case 'send-poi':
                Mojo.Log.info("handleCommand(send-poi)");
                this.controller.showDialog({
                    template: 'dialogs/poi',
                    assistant: new ExtraInfoDialog(this.controller, {maxLength: 240, hintText: "This is so cool! :-P"},

                        function(info){
                            this._poi = info;
                            this.trackingLast = 0; // try to update right away so we get the POI in the right place
                        }.bind(this),

                        function() { this._poi = false; }.bind(this)

                        // not going to show anything anyway... no need to reset trackingLast
                    )
                });
                break;

            default:
                Mojo.Log.info("handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }

};

/*}}}*/

/* {{{ */ ControlPanelAssistant.prototype.updateReads = function() {
    var d1 = this.controller.get("desc1");

    var to = 10e3;
        to += this.updateIntervalModel.value * 1e3;

    d1.innerHTML = this.fixCount + " reads, " + this.ackCount + " posted";

    if( this.d1TimeoutID )
        clearTimeout(this.d1TimeoutID);

    this.d1TimeoutID = setTimeout(function(){ d1.innerHTML = ""; }, to);
};

/*}}}*/
/* {{{ */ ControlPanelAssistant.prototype.updateAction = function(action) {
    var d2 = this.controller.get("desc2");

    d2.innerHTML = action;

    if( this.d2TimeoutID )
        clearTimeout(this.d2TimeoutID);

    this.d2TimeoutID = setTimeout(function(){ d2.innerHTML = ""; }, 2e3);
};

/*}}}*/
/* {{{ */ ControlPanelAssistant.prototype.updateFixDesc = function(lat,lon,alt,vel,head,poi,tag) {
    var d3 = this.controller.get("desc3");

    var to = 7e3;
    if( !this.continuousModel.value )
        to += this.updateIntervalModel.value * 1e3;

    lat = lat.toFixed(5) + "⁰";
    lon = lon.toFixed(5) + "⁰";
    alt = alt + "m";
    vel = vel.toFixed(0) + "m/s";

    d3.innerHTML = [ "[" + lat + "," + lon + "]", "(" + vel, "@", head + "⁰)", alt ].join(" ");

    if( poi || tag ) {
        d3.innerHTML += "<br>";

        if(tag) d3.innerHTML += "tag: " + tag + (poi ? "; " : "");
        if(poi) d3.innerHTML += "poi: " + poi;
    }

    if( this.d3TimeoutID )
        clearTimeout(this.d3TimeoutID);

    this.d3TimeoutID = setTimeout(function(){ d3.innerHTML = ""; }, to);
};

/*}}}*/

// LED functions {{{
// ControlPanelAssistant.prototype.blinkRedLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkRedLED_2 = function() {
    this.controller.get("r_led").src = "images/red_led.png";
    setTimeout(this.blinkRedLED_3, blink_off_time);
};
// }}}
// ControlPanelAssistant.prototype.blinkRedLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkRedLED_3 = function() {
    this.redLEDCount.shift();
    if( this.redLEDCount.length > 0 ) {
        this.controller.get("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, this.redLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkRedLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkRedLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.redLEDCount.push(duration);

    if( this.redLEDCount.length === 1 ) {
        this.controller.get("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, duration);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkGreenLED_2 = function() {
    this.controller.get("g_led").src = "images/green_led.png";
    setTimeout(this.blinkGreenLED_3, blink_off_time);
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkGreenLED_3 = function() {
    this.greenLEDCount.shift();
    if( this.greenLEDCount.length > 0 ) {
        this.controller.get("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, this.greenLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkGreenLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.greenLEDCount.push(duration);

    if( this.greenLEDCount.length === 1 ) {
        this.controller.get("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, duration);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkBlueLED_2 = function() {
    this.controller.get("b_led").src = "images/blue_led.png";
    setTimeout(this.blinkBlueLED_3, blink_off_time);
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkBlueLED_3 = function() {
    this.blueLEDCount.shift();
    if( this.blueLEDCount.length > 0 ) {
        this.controller.get("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, this.blueLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkBlueLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.blueLEDCount.push(duration);

    if( this.blueLEDCount.length === 1 ) {
        this.controller.get("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, duration);
    }
};
// }}}
// }}}

Mojo.Log.info('loaded(ControlPanelAssistant.js)');
