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

    this.trackingOpts = {};
    this.trackingModel = { value: false };
    this.controller.setupWidget('trackingToggle', this.trackingOpts, this.trackingModel);		
    this.controller.get('trackingToggle').observe(Mojo.Event.propertyChange, this.trackingChanged.bind(this));

    this.continuousOpts = {};
    this.continuousModel = { value: true };
    this.controller.setupWidget('continuousUpdates', this.continuousOpts, this.continuousModel);		
    this.controller.get('continuousUpdates').observe(Mojo.Event.propertyChange, this.continuousChanged.bind(this));

    this.URLAttributes = {
        hintText:      'http://mysite/cgi/path',
        textFieldName: 'postURL',
        maxLength:     2048,
        multiline:     false
    };
    this.URLModel = { value: '' };
    this.controller.setupWidget('postURL', this.URLAttributes, this.URLModel);

    this.updateIntervalAttributes = {
        modelProperty: 'value',
        maxValue: 3600*2,
        minValue: 5,
        round: true,
        updateInterval: 0.1
    };
    this.updateIntervalModel = { value: 1800 };
    this.controller.setupWidget('updateInterval', this.updateIntervalAttributes, this.updateIntervalModel);
    Mojo.Event.listen($('updateInterval'), 'mojo-property-change', this.updateIntervalChanged.bindAsEventListener(this));
    this.updateIntervalChanged();
}

ControlPanelAssistant.prototype.updateIntervalChanged = function() {
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
}

ControlPanelAssistant.prototype.trackingChanged = function() {
    Mojo.Log.info("ControlPanel::trackingChanged()", this.trackingModel.value ? "on" : "off");
}

ControlPanelAssistant.prototype.continuousChanged = function() {
    Mojo.Log.info("ControlPanel::continuousChanged(): %s", this.continuousModel.value ? "on" : "off");
}

ControlPanelAssistant.prototype.trackingSuccessResponseHandler = function(result) {
    var asJSON = Object.toJSON(result);
    Mojo.Log.info("ControlPanel::trackingSuccessResponseHandler(): %s", asJSON);
}

ControlPanelAssistant.prototype.trackingFailedResponseHandler = function(result) {
    var errCode = result.errorCode;
    var errStr  = this.errCodeToStr(errCode);
    Mojo.Log.info("ControlPanel::trackingFailedResponseHandler() = %s (%d)", errStr, errCode);
}

ControlPanelAssistant.prototype.activate = function(event) {
    Mojo.Log.info("ControlPanel::activate()");
}

ControlPanelAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("ControlPanel::deactivate()");
}

ControlPanelAssistant.prototype.cleanup = function(event) {
    // XXX: What needs to be cleaned up?  Seriously.  Does any of this clean
    // itself up? or do you have to go through and destroy each object and
    // click handler?

    this.trackingHandle.cancel();
}

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

    if( res[errorCode] == undefined )
        return "something bad happened, error unknown";

    return res[errorCode];
}
