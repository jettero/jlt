function StageAssistant() {
	Mojo.Log.info("StageAssistant()")
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()")

    // this.appController = Mojo.Controller.getAppController();
    // this.indexStageController = this.appController.getActiveStageController();
    //
    // this.indexStageController.setupWidget("loading",
    //     this.attributes = { spinnerSize: 'large' },
    //     this.model      = { spinning: false }
    // );

    this.controller.assistant.showScene('jlt', 'panel');
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
