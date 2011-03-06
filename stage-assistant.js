/*jslint white: false, onevar: false
*/
/*global Mojo $ StageAssistant
*/

var OPT;

function StageAssistant() {
	Mojo.Log.info("StageAssistant()");

    // OPT = Mojo.loadJSONFile(Mojo.appPath + "runtime_options.json");
    OPT = {};
}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("StageAssistant()::setup()");

    this.controller.assistant.showScene('ControlPanel');

    /* DEBUG
    ** this.showScene("Webview", {
    **     title: "Frobby Debug",
    **     URL: "https://voltar.org/id?tr=1",
    **     donecb: function(){}
    ** });
    */

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

        if( a = event.command.match(/reset/) )
            OPT._thisScene.resetMe();

        if( a = event.command.match(/clear-token/) )
            OPT._thisScene.clearToken();

        if( a = event.command.match(/^json-gps/) )
            if( OPT._thisScene )
                OPT._thisScene.controller.serviceRequest("palm://com.palm.applicationManager", {
                    method: "open",
                    parameters:  {
                       id: 'com.palm.app.browser',
                       params: { target: "http://db.JGPS.me/user" }
                    }
                });
    }
};

StageAssistant.prototype.menuSetup = function() {
    OPT._thisScene = this;

    this.appMenuModel = {
        visible: true,
        items: [
            Mojo.Menu.editItem,
            { label: "JGPS.me", command: 'json-gps'      }
            { label: "Help",    command: 'myshow-Help'   },
            { label: "About",   command: 'myshow-About'  },
        ]
    };

    if( this.resetMe )
        this.appMenuModel.items.push({ label: "Reset all Settings", command: 'factory-reset' });

    if( this.clearToken )
        this.appMenuModel.items.push({ label: "Clear Token", command: 'clear-token' });

    this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
};

Mojo.Log.info('loaded(stage-assistant.js)');
