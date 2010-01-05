/*jslint white: false, onevar: false
*/
/*global Mojo $ ControlPanelAssistant
*/

function ControlPanelAssistant() {
    Mojo.Log.info("ControlPanel()");
}

ControlPanelAssistant.prototype.setup = function() {
    Mojo.Log.info("ControlPanel::setup()");

    /*
    this.trackingHandle = this.controller.serviceRequest('palm://com.palm.location', {
        method:"startTracking",
        parameters: {"subscribe":true},
        onSuccess: this.trackingSuccessResponseHandler.bind(this),
        onFailure: this.trackingFailedResponseHandler.bind(this)
    });
    */

    this.redLEDCount   = [];
    this.greenLEDCount = [];
    this.blueLEDCount  = [];

    this.blinkRedLED_2   = this.blinkRedLED_2.bind(this);
    this.blinkRedLED_3   = this.blinkRedLED_3.bind(this);
    this.blinkGreenLED_2 = this.blinkGreenLED_2.bind(this);
    this.blinkGreenLED_3 = this.blinkGreenLED_3.bind(this);
    this.blinkBlueLED_2  = this.blinkBlueLED_2.bind(this);
    this.blinkBlueLED_3  = this.blinkBlueLED_3.bind(this);

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

ControlPanelAssistant.prototype.resetQueue = function() {
    this.buffer = [];
    this.bufferFillModel.value = 0;
    this.controller.modelChanged(this.bufferFillModel);

    this.blinkBlueLED(1500);
};

ControlPanelAssistant.prototype.pushQueue = function(item) {
    this.buffer.push(item);

    if( this.buffer.length > this.bufferSizeModel.value ) {
        while( this.buffer.length > this.bufferSizeModel.value ) {
            this.buffer.shift();
            this.blinkBlueLED(100);
        }

    } else {
        this.bufferFillModel.value = this.buffer.length / this.bufferFillModel.value;
        this.controller.modelchanged(this.bufferFillModel);
        this.blinkBlueLED(500);
    }
};

ControlPanelAssistant.prototype.URLChanged = function() {
    Mojo.Log.info("ControlPanel::URLChanged(): %s", this.URLModel.value);

    this.savePrefs();
};

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

ControlPanelAssistant.prototype.bufferSizeChanged = function(event) {
    var i = parseInt(this.bufferSizeModel.value);

    Mojo.Log.info("ControlPanel::bufferSizeChanged(): %d messages", i);

    $('bufferSizeCurrent').innerHTML = i + " messages";

    this.savePrefs();
};

ControlPanelAssistant.prototype.trackingChanged = function(event) {
    Mojo.Log.info("ControlPanel::trackingChanged()", this.trackingModel.value ? "on" : "off");

    this.blinkRedLED(100);
    this.blinkGreenLED(100);
    this.blinkBlueLED(100);

    if( this.trackingModel.value ) {
        $("continuousUpdatesGroup").hide();

    } else {
        this.resetQueue();
        $("continuousUpdatesGroup").show();
    }
};

ControlPanelAssistant.prototype.continuousChanged = function(event) {
    Mojo.Log.info("ControlPanel::continuousChanged(): %s", this.continuousModel.value ? "on" : "off");

    if( this.continuousModel.value ) $('updateIntervalGroup').hide();
    else $('updateIntervalGroup').show();

    this.savePrefs();
};

ControlPanelAssistant.prototype.trackingSuccessResponseHandler = function(result) {
    var asJSON = Object.toJSON(result);

    Mojo.Log.info("ControlPanel::trackingSuccessResponseHandler(): %s", asJSON);
};

ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {
    var errCode = result.errorCode;
    var errStr  = this.errCodeToStr(errCode);

    Mojo.Log.info("ControlPanel::trackingFailedResponseHandler() = %s (%d)", errStr, errCode);
};

ControlPanelAssistant.prototype.activate = function(event) {
    Mojo.Log.info("ControlPanel::activate()");

    this.restorePrefs();
};

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

ControlPanelAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("ControlPanel::deactivate()");

    this.savePrefs();
};

ControlPanelAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("ControlPanel::cleanup()");

    // XXX: What needs to be cleaned up?  Seriously.  Does any of this clean
    // itself up? or do you have to go through and destroy each object and
    // click handler?

    if( this.trackingHandle )
        this.trackingHandle.cancel();
};

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

ControlPanelAssistant.prototype.blinkRedLED_2 = function() {
    $("r_led").src = "images/red_led.png";
    setTimeout(this.blinkRedLED_3, 100);
};

ControlPanelAssistant.prototype.blinkRedLED_3 = function() {
    this.redLEDCount.shift();
    if( this.redLEDCount.length > 0 ) {
        $("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, this.redLEDCount[0]);
    }
};

ControlPanelAssistant.prototype.blinkRedLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.redLEDCount.push(duration);

    if( this.redLEDCount.length == 1 ) {
        $("r_led").src = "images/red_led_lighted.png";
        setTimeout(this.blinkRedLED_2, duration);
    }
};

ControlPanelAssistant.prototype.blinkGreenLED_2 = function() {
    $("g_led").src = "images/green_led.png";
    setTimeout(this.blinkGreenLED_3, 100);
};

ControlPanelAssistant.prototype.blinkGreenLED_3 = function() {
    this.greenLEDCount.shift();
    if( this.greenLEDCount.length > 0 ) {
        $("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, this.greenLEDCount[0]);
    }
};

ControlPanelAssistant.prototype.blinkGreenLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.greenLEDCount.push(duration);

    if( this.greenLEDCount.length == 1 ) {
        $("g_led").src = "images/green_led_lighted.png";
        setTimeout(this.blinkGreenLED_2, duration);
    }
};

ControlPanelAssistant.prototype.blinkBlueLED_2 = function() {
    $("b_led").src = "images/blue_led.png";
    setTimeout(this.blinkBlueLED_3, 100);
};

ControlPanelAssistant.prototype.blinkBlueLED_3 = function() {
    this.blueLEDCount.shift();
    if( this.blueLEDCount.length > 0 ) {
        $("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, this.blueLEDCount[0]);
    }
};

ControlPanelAssistant.prototype.blinkBlueLED = function(duration) {
    if( duration === undefined ) duration = 500;
    if( duration < 100 ) duration = 100;
    this.blueLEDCount.push(duration);

    if( this.blueLEDCount.length == 1 ) {
        $("b_led").src = "images/blue_led_lighted.png";
        setTimeout(this.blinkBlueLED_2, duration);
    }
};
