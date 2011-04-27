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

    if( CHANGELOG_COOKIE.get() !== CHANGELOG_KEY )
        this.controller.assistant.showScene("ChangeLog");

    /* DEBUG
    ** this.showScene("Webview", {
    **     title: "Frobby Debug",
    **     URL: "https://voltar.org/id?tr=1",
    **     donecb: function(){}
    ** });
    */

    this._count = 0;

};

StageAssistant.prototype.popScene = function() {
    this.controller.popScene();
    this._count --;
};

StageAssistant.prototype.showScene = function (sceneName, args) {
	Mojo.Log.info("StageAssistant()::showScene(%s) [ss: %d]", sceneName, this._count);

    if( this._count < 2 ) {
        if (args === undefined) {
            this.controller.pushScene({name: sceneName, sceneTemplate: sceneName});

        } else {
            this.controller.pushScene({name: sceneName, sceneTemplate: sceneName}, args);
        }

    } else {
        if (args === undefined) {
            this.controller.swapScene({name: sceneName, sceneTemplate: sceneName});

        } else {
            this.controller.swapScene({name: sceneName, sceneTemplate: sceneName}, args);
        }
    }

    this._count ++;
};

StageAssistant.prototype.handleCommand = function(event) {
    var controller = Mojo.Controller.stageController.activeScene().assistant;

    if(event.type === Mojo.Event.command) {
        Mojo.Log.info("executing menu command: %s", event.command);
        var a;
        if( a = event.command.match(/^myshow-(.+)/) )
            Mojo.Controller.stageController.assistant.showScene(a[1]);

        if( a = event.command.match(/reset/) )
            controller.resetMe();

        if( a = event.command.match(/clear-token/) )
            controller.clearToken();

        if( a = event.command.match(/^json-gps/) )
            if( controller )
                controller.controller.serviceRequest("palm://com.palm.applicationManager", {
                    method: "open",
                    parameters:  {
                       id: 'com.palm.app.browser',
                       params: { target: "http://db.JGPS.me/user" }
                    }
                });
    }
};

StageAssistant.prototype.menuSetup = function() {
    this.appMenuModel = {
        visible: true,
        items: [
            Mojo.Menu.editItem,
            { label: "JGPS.me", command: 'json-gps'      },
            { label: "Help",    command: 'myshow-Help'   },
            { label: "About",   command: 'myshow-About'  }
        ]
    };

    if( this.resetMe )
        this.appMenuModel.items.push({ label: "Reset all Settings", command: 'factory-reset' });

    if( this.clearToken )
        this.appMenuModel.items.push({ label: "Clear Token", command: 'clear-token' });

    this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
};

Mojo.Log.info('loaded(stage-assistant.js)');
