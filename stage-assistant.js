function StageAssistant() {
	Mojo.Log.info("StageAssistant()")
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()")

    // this.controller.assistant.showScene('ControlPanel');
    this.controller.assistant.showScene('About');
}

StageAssistant.prototype.showScene = function (sceneName, args) {
	Mojo.Log.info("StageAssistant()::showScene(%s)", sceneName)

	if (args === undefined) {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName});

	} else {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName}, args);
	}
};

Mojo.Log.info('loaded(stage-assistant.js)');
