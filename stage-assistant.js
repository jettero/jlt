/*jslint white: false, onevar: false
*/
/*global Mojo $ StageAssistant
*/

function StageAssistant() {
	Mojo.Log.info("StageAssistant()");
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()");

    this.controller.assistant.showScene('ControlPanel');
};

StageAssistant.prototype.popScene = function() {
    this.controller.popScene();
};

StageAssistant.prototype.showScene = function (sceneName, args) {
	Mojo.Log.info("StageAssistant()::showScene(%s)", sceneName);

	if (args === undefined) {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName});

	} else {
		this.controller.pushScene({name: sceneName, sceneTemplate: sceneName}, args);
	}
};

StageAssistant.prototype.handleCommand = function(event) {
    // this.controller = Mojo.Controller.stageController.activeScene();
    // I have this bound to the current scene, so ... this isn't necessary

    if(event.type === Mojo.Event.command) {
        Mojo.Log.info("executing mehu command: %s", event.command);
        var a;
        if( a = event.command.match(/^myshow-(.+)/) )
            Mojo.Controller.stageController.assistant.showScene(a[1]);
    }
};

StageAssistant.prototype.menuSetup = function() {
    this.appMenuModel = {
        visible: true,
        items: [
            { label: "Help",  command: 'myshow-Help' },
            { label: "About", command: 'myshow-About' }
        ]
    };

    this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
};

Mojo.Log.info('loaded(stage-assistant.js)');
