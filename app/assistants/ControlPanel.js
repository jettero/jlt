/*jslint white: false, onevar: false
*/
/*global Mojo $ ControlPanelAssistant
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

// function ControlPanelAssistant() {{{
function ControlPanelAssistant() {
    Mojo.Log.info("ControlPanel()");
}
// }}}

// ControlPanelAssistant.prototype.setup = function() {{{
ControlPanelAssistant.prototype.setup = function() {
    Mojo.Log.info("ControlPanel::setup()");

    this.redLEDCount   = [];
    this.greenLEDCount = [];
    this.blueLEDCount  = [];

    this.blinkRedLED_2   = this.blinkRedLED_2.bind(this);
    this.blinkRedLED_3   = this.blinkRedLED_3.bind(this);
    this.blinkGreenLED_2 = this.blinkGreenLED_2.bind(this);
    this.blinkGreenLED_3 = this.blinkGreenLED_3.bind(this);
    this.blinkBlueLED_2  = this.blinkBlueLED_2.bind(this);
    this.blinkBlueLED_3  = this.blinkBlueLED_3.bind(this);

    this.postFixesSuccess = this.postFixesSuccess.bind(this);
    this.postFixesFailure = this.postFixesFailure.bind(this);

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
    Mojo.Event.listen($('trackingToggle'), Mojo.Event.propertyChange, this.trackingChanged);

    this.continuousOpts = {};
    this.continuousModel = { value: false };
    this.controller.setupWidget('continuousUpdates', this.continuousOpts, this.continuousModel);
    this.continuousChanged = this.continuousChanged.bindAsEventListener(this);
    Mojo.Event.listen($('continuousUpdates'), Mojo.Event.propertyChange, this.continuousChanged);

    this.URLAttributes = {
        hintText:      'http://mysite/cgi/path',
        textFieldName: 'postURL',
        maxLength:     2048,
        textCase:      Mojo.Widget.steModeLowerCase,
        autoFocus:     false,
        enterSubmits:  true,
        holdToEdit:    true, // otherwise it steals focus first thing
        multiline:     false
    };
    this.URLModel = { original: '', value: '' };
    this.controller.setupWidget('postURL', this.URLAttributes, this.URLModel);
    this.URLChanged = this.URLChanged.bind(this);
    Mojo.Event.listen($('postURL'), Mojo.Event.propertyChange, this.URLChanged);

    this.updateIntervalAttributes = {
        minValue: 5,
        maxValue: 7200,
        updateInterval: 0.1, // this is 100ms I guess, doesn't seem to do anything... who knows
        round: true
    };
    this.updateIntervalModel = { value: 900 };
    this.controller.setupWidget('updateInterval', this.updateIntervalAttributes, this.updateIntervalModel);
    this.updateIntervalChanged = this.updateIntervalChanged.bindAsEventListener(this);
    Mojo.Event.listen($("updateInterval"), Mojo.Event.propertyChange, this.updateIntervalChanged);

    this.bufferSizeAttributes = {
        minValue: 1,
        maxValue: 100,
        updateInterval: 0.1, // this is 100ms I guess, doesn't seem to do anything... who knows
        round: true
    };
    this.bufferSizeModel = { value: 10 };
    this.controller.setupWidget('bufferSize', this.bufferSizeAttributes, this.bufferSizeModel);
    this.bufferSizeChanged = this.bufferSizeChanged.bindAsEventListener(this);
    Mojo.Event.listen($("bufferSize"), Mojo.Event.propertyChange, this.bufferSizeChanged);

    this.continuousChanged();
    this.updateIntervalChanged();
    this.bufferSizeChanged();

    this.bufferFillOpts  = { };
    this.bufferFillModel = { value: 0 };
    this.controller.setupWidget('bufferFill', this.bufferFillOpts, this.bufferFillModel);
    this.buffer = [];

    this.restoring = false;
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

    this.blinkBlueLED(1500);
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

            } else {
                last.t.push(item.t);
            }

            this.blinkBlueLED(100);
            return;
        }
    }

    this.buffer.push(item);

    if( this.buffer.length > this.bufferSizeModel.value ) {
        while( this.buffer.length > this.bufferSizeModel.value ) {
            this.buffer.shift();
            this.blinkBlueLED(100);
            this.blinkRedLED(100);
        }

    } else {
        this.blinkBlueLED(100);
    }

    this.bufferFillModel.value = (1.0*this.buffer.length) / this.bufferSizeModel.value;
    this.controller.modelChanged(this.bufferFillModel);

    Mojo.Log.info( "ControlPanel::pushQueue() -- buffer-fullness: "
        + (this.bufferFillModel.value*100) + " items: " + this.buffer.length );
};
// }}}
// ControlPanelAssistant.prototype.rmQueue = function(item) {{{
ControlPanelAssistant.prototype.rmQueue = function(timestamp) {
    Mojo.Log.info("ControlPanel::rmQueue(timestamp=%d)", timestamp);

    for(var i=0; i<this.buffer.length; i++) {
        if( typeof this.buffer[i].t === "number"
            ? this.buffer[i].t    == timestamp      // there only is one timestamp
            : this.buffer[i].t[0] == timestamp ) {  // we're concerned with the first timestamp only

            // NOTE: I have no idea how garbage collection works in js, but I *wish*
            // this would recursively delete the object at pos[i]; who knows...
            delete this.buffer[i];

            // get rid of the undef
            this.buffer.splice(i,1);

            this.bufferFillModel.value = (1.0*this.buffer.length) / this.bufferSizeModel.value;
            this.controller.modelChanged(this.bufferFillModel);

            return; // we're all done here
        }
    }
};
// }}}

// ControlPanelAssistant.prototype.URLChanged = function() {{{
ControlPanelAssistant.prototype.URLChanged = function() {
    Mojo.Log.info("ControlPanel::URLChanged(): %s", this.URLModel.value);

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.updateIntervalChanged = function(event) {{{
ControlPanelAssistant.prototype.updateIntervalChanged = function(event) {
    var i = parseInt(this.updateIntervalModel.value);

    Mojo.Log.info("ControlPanel::updateIntervalChanged(): %d seconds", i);

    var s;
    if( i >= 900 ) {
        if( i >= 2700 ) {
            s = (parseFloat(i)/3600).toFixed(2) + " hours";

        } else {
            s = (parseFloat(i)/60).toFixed(2) + " minutes";
        }

    } else {
        s = i + " seconds";
    }

    $('updateIntervalCurrent').innerHTML = s;

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.bufferSizeChanged = function(event) {{{
ControlPanelAssistant.prototype.bufferSizeChanged = function(event) {
    var i = parseInt(this.bufferSizeModel.value);

    Mojo.Log.info("ControlPanel::bufferSizeChanged(): %d messages", i);

    $('bufferSizeCurrent').innerHTML = i + " messages";

    this.savePrefs();
};
// }}}
// ControlPanelAssistant.prototype.trackingChanged = function(event) {{{
ControlPanelAssistant.prototype.trackingChanged = function(event) {
    Mojo.Log.info("ControlPanel::trackingChanged()", this.trackingModel.value ? "on" : "off");

    if( this.trackingModel.value ) {
        if( this.continuousModel.value ) {

            this.trackingHandle = this.controller.serviceRequest('palm://com.palm.location', {
                method:"startTracking",
                parameters: {"subscribe":true},
                onSuccess: this.trackingSuccessResponseHandler,
                onFailure: this.trackingFailedResponseHandler
            });

            $("continuousUpdatesGroup").hide();

        } else {
            this.trackingLast = 0;

            // there's nothing to start here

            $("continuousUpdatesGroup").hide();
        }

    } else {
        if( this.trackingHandle ) {
            this.trackingHandle.cancel();
            this.trackingHandle = undefined;
        }

        // Let the buffer check loop send it all... it'll bottom it out eventually.
        // this.resetQueue();
        $("continuousUpdatesGroup").show();
    }
};
// }}}
// ControlPanelAssistant.prototype.continuousChanged = function(event) {{{
ControlPanelAssistant.prototype.continuousChanged = function(event) {
    Mojo.Log.info("ControlPanel::continuousChanged(): %s", this.continuousModel.value ? "on" : "off");

    if( this.continuousModel.value ) $('updateIntervalGroup').hide();
    else $('updateIntervalGroup').show();

    this.savePrefs();
};
// }}}

// ControlPanelAssistant.prototype.postFixesSuccess = function(transport) {{{
ControlPanelAssistant.prototype.postFixesSuccess = function(transport) {
    Mojo.Log.info("ControlPanel::postFixesSuccess(%d)", transport.status);

    if( transport.status >= 200 && transport.status < 300 ) {
        try {
            var rt = transport.responseText.evalJSON().fix_tlist;

            for(var i=0; i<rt.length; i++) {
                var t = rt[i];

                this.blinkGreenLED(100);
                this.rmQueue(t);
            }

        }

        catch(e) {
            Mojo.Log.info("ControlPanel::postFixesSuccess, error processing js: %s", e);
            this.blinkRedLED(400);
            this.blinkGreenLED(400);
        }

        this.runningRequest = undefined;

    } else {
        // if prototype doesn't know what happened, it thinks it's a success (eat my ass)

        this.postFixesFailure(transport);
        this.blinkRedLED(700);
        this.blinkGreenLED(700);
    }
};
// }}}
// ControlPanelAssistant.prototype.postFixesFailure = function(transport) {{{
ControlPanelAssistant.prototype.postFixesFailure = function(transport) {
    Mojo.Log.info("ControlPanel::postFixesFailure(%d)", transport.status);
    this.runningRequest = undefined;

    var t = new Template($L("Ajax Error: #{status}"));
    var m = t.evaluate(transport);
    var e = [m];

    // It probably isn't worth mentioning to the user...
    // network errors and things...
    Mojo.Log.info(e.join("... "));

    this.blinkRedLED(700);
    this.blinkGreenLED(700);
};
// }}}

// ControlPanelAssistant.prototype.bufferCheckLoop = function() {{{
ControlPanelAssistant.prototype.bufferCheckLoop = function() {
    if( this.runningRequest )
        return;

    if( this.buffer.length > 0 ) {
        Mojo.Log.info("ControlPanel::bufferCheckLoop() todo: %d [starting request]", this.buffer.length);

        this.runningRequest = new Ajax.Request(this.URLModel.value, {
            method: 'post',
            parameters: { fixes: Object.toJSON(this.buffer) },
            onSuccess: this.postFixesSuccess,
            onFailure: this.postFixesFailure
        });
    }
};
// }}}
// ControlPanelAssistant.prototype.trackingLoop = function() {{{
ControlPanelAssistant.prototype.trackingLoop = function() {
    if( !this.trackingModel.value || this.continuousModel.value )
        return;

    var now = (new Date()).getTime()/1000;

    if( this.trackingLast + this.updateIntervalModel.value < now ) {
        Mojo.Log.info("ControlPanel::trackingLoop() [loop true]");
        this.trackingLast = now;

        if( !this.trackingFixRunning ) {
            this.trackingFixRunning = true;

            this.blinkBlueLED(100);

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
                    maximumAge: this.updateIntervalModel.value-1,
                }
            });
        }
    }
};
// }}}

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

    this.trackingFixRunning = false;

    var item = {
        t:  result.timestamp,
        ll: [ result.latitude, result.longitude ],
        ha: result.horizAccuracy,
        va: result.vertAccuracy,
        al: result.altitude,
        vv: [ result.velocity, result.heading ]
    };

    this.pushQueue(item);
};
// }}}
// ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {{{
ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {
    var errCode = result.errorCode;
    var errStr  = this.errCodeToStr(errCode);

    this.trackingFixRunning = false;

    Mojo.Log.info("ControlPanel::trackingFailedResponseHandler() = %s (%d)", errStr, errCode);

    this.blinkRedLED(700);
    this.blinkBlueLED(700);
};
// }}}

// ControlPanelAssistant.prototype.restorePrefs = function() {{{
ControlPanelAssistant.prototype.restorePrefs = function() {
    this.dbo.simpleGet("prefs",
        function(prefs) {
            Mojo.Log.info("restoring prefs: %s", Object.toJSON(prefs));

            if( prefs === null )
                return;

            this.restoring = true;

            this.updateIntervalModel.value = prefs.updateInterval;
            this.bufferSizeModel.value     = prefs.bufferSize;
            this.continuousModel.value     = prefs.continuous;
            this.URLModel.value            = prefs.URL;

            this.controller.modelChanged(this.updateIntervalModel);
            this.controller.modelChanged(this.bufferSizeModel);
            this.controller.modelChanged(this.continuousModel);
            this.controller.modelChanged(this.URLModel);

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
    Mojo.Log.info("save() restoring=%s (aborts when true)", this.restoring ? "true" : "false");

    if( this.restoring )
        return;

    var prefs = {
        URL:            this.URLModel.value,
        continuous:     this.continuousModel.value,
        updateInterval: this.updateIntervalModel.value,
        bufferSize:     this.bufferSizeModel.value
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

// LED functions {{{
// ControlPanelAssistant.prototype.blinkRedLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkRedLED_2 = function() {
    $("r_led").src = "images/red_led.png";
    setTimeout(this.blinkRedLED_3, 100);
};
// }}}
// ControlPanelAssistant.prototype.blinkRedLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkRedLED_3 = function() {
    this.redLEDCount.shift();
    if( this.redLEDCount.length > 0 ) {
        $("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, this.redLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkRedLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkRedLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.redLEDCount.push(duration);

    if( this.redLEDCount.length == 1 ) {
        $("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, duration);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkGreenLED_2 = function() {
    $("g_led").src = "images/green_led.png";
    setTimeout(this.blinkGreenLED_3, 100);
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkGreenLED_3 = function() {
    this.greenLEDCount.shift();
    if( this.greenLEDCount.length > 0 ) {
        $("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, this.greenLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkGreenLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkGreenLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.greenLEDCount.push(duration);

    if( this.greenLEDCount.length == 1 ) {
        $("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, duration);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED_2 = function() {{{
ControlPanelAssistant.prototype.blinkBlueLED_2 = function() {
    $("b_led").src = "images/blue_led.png";
    setTimeout(this.blinkBlueLED_3, 100);
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED_3 = function() {{{
ControlPanelAssistant.prototype.blinkBlueLED_3 = function() {
    this.blueLEDCount.shift();
    if( this.blueLEDCount.length > 0 ) {
        $("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, this.blueLEDCount[0]);
    }
};
// }}}
// ControlPanelAssistant.prototype.blinkBlueLED = function(duration) {{{
ControlPanelAssistant.prototype.blinkBlueLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.blueLEDCount.push(duration);

    if( this.blueLEDCount.length == 1 ) {
        $("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, duration);
    }
};
// }}}
// }}}
