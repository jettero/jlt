function TestAssistant() {
    Mojo.Log.info("Test()");
}

TestAssistant.prototype.setup = function() {
    Mojo.Log.info("Test::setup()");

    this.updateIntervalAttributes = {
        minValue: 5,
        maxValue: 7200,
        updateInterval: 0.1, // this is 100ms I guess, doesn't seem to do anything... who knows
        round: true
    };
    this.updateIntervalModel = { value: 3600 };
    this.controller.setupWidget('updateInterval', this.updateIntervalAttributes, this.updateIntervalModel);
    this.updateIntervalChanged = this.updateIntervalChanged.bindAsEventListener(this);
    Mojo.Event.listen($("updateInterval"), Mojo.Event.propertyChange, this.updateIntervalChanged);

    this.updateIntervalModel.value = 7200;
    this.controller.modelChanged();
    this.controller.modelChanged(this.updateIntervalModel);
};

TestAssistant.prototype.updateIntervalChanged = function(event) {
    var i = parseInt(this.updateIntervalModel.value);

    Mojo.Log.info("Test::updateIntervalChanged(): %d seconds", i);
};

TestAssistant.prototype.activate = function(event) {
    Mojo.Log.info("Test::activate()");
};

TestAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("Test::deactivate()");
};

TestAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("Test::cleanup()");
};
