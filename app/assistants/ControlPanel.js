function ControlPanelAssistant() {
    Mojo.Log.info("ControlPanel()");
}

ControlPanelAssistant.prototype.setup = function() {
    Mojo.Log.info("ControlPanel::setup()");
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
}
