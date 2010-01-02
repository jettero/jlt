function StageAssistant() {
	Mojo.Log.info("StageAssistant()")
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()")

    this.controller.assistant.showScene('panel', 'ControlPanel');
}

StageAssistant.prototype.showScene = function (directory, sceneName, args) {
	Mojo.Log.info("StageAssistant()::showScene(%s, %s)", directory, sceneName)

	if (args === undefined) {
		this.controller.pushScene({name: sceneName, sceneTemplate: directory + "/" + sceneName});

	} else {
		this.controller.pushScene({name: sceneName, sceneTemplate: directory + "/" + sceneName}, args);
	}
};

Mojo.Log.info('loaded(stage-assistant.js)');
