/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewAssistnat ExtraInfoDialog PalmSystem
*/

function WebviewAssistant(args) {
    Mojo.Log.info("WebviewAssistant(title: %s, URL: %s)", args.title, args.URL);

    this.title  = args.title;
    this.URL    = args.URL;
    this.donecb = args.donecb;

    this.donebutton   = this.donebutton.bind(this);
    this.titlechanged = this.titlechanged.bind(this);

    this.progress = this.progress.bind(this);
    this.started  = this.started.bind(this);
    this.stopped  = this.stopped.bind(this);

    this.SC = Mojo.Controller.stageController.assistant;

    // eog $(find ../usr.palm.frameworks/ -name \*.png | grep menu-icon)

    this.reloadModel      = { label: 'Reload', icon: 'refresh', command: 'refresh' };
    this.stopModel        = { label: 'Stop', icon: 'load-progress', command: 'stop' };
    this.tokenModel       = { label: "ID", icon: 'info', command: 'enter-token' };
    this.commandMenuModel = { label: 'Webview Command Menu', items: [ this.tokenModel, this.reloadModel ] };
}

WebviewAssistant.prototype.setup = function() {
    Mojo.Log.info("WebviewAssistant::setup()");

	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.controller.setupWidget("token", {}, {});
    this.controller.setupWidget("webview-node",
        this.attributes = {
            url: this.URL,
            minFontSize: 18
        },

        this.model = {
            /* this isn't really used for anything that I can see */
        }

    );

    this.controller.get("web-title").innerHTML = this.title;

    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);

    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadProgress, this.progress);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadStarted, this.started);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadStopped, this.stopped);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadFailed, this.stopped);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewDidFinishDocumentLoad, this.stopped);

};

WebviewAssistant.prototype.titlechanged = function(title) {
    Mojo.Log.info("WebviewAssistant::titlechanged(%s)", title);

    if( title.match(/\[done\]/) )
        this.donebutton(); // if the title says [done] press the done button
};

WebviewAssistant.prototype.donebutton = function() {
    Mojo.Log.info("WebviewAssistant::donebutton()");

    if( this.donecb ) {
        this.donecb(this._token);
        delete this.donecb;
    }

    this.SC.popScene(); // bye!!
};

WebviewAssistant.prototype.deactivate = function() {
    Mojo.Log.info("WebviewAssistant::deactivate()");

    if( this.donecb ) {
        this.donecb(this._token);
        delete this.donecb;
    }

};

WebviewAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

WebviewAssistant.prototype.handleCommand = function(event) {
    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*[@][@]\s*/);

        switch (s_a[0]) {
            case 'enter-token':
                Mojo.Log.info("handleCommand(enter-token)");
                this.controller.showDialog({
                    template: 'dialogs/token',
                    assistant: new ExtraInfoDialog(this.controller, {maxLength: 64, hintText: "auth token"},
                        function(info){
                            this._token = info;
                            this.donebutton();

                        }.bind(this)
                    )
                });
                break;

            case 'refresh':
                this.controller.get("webview-node")._mojoController.assistant.reloadPage();
                break;

            case 'stop':
                this.controller.get("webview-node")._mojoController.assistant.stopLoad();
                break;

            default:
                Mojo.Log.info("handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }
};

// NOTE: started, stopped, finished and progress are all ripped from the
// UIWidgets example, basically unchanged !!!

WebviewAssistant.prototype.started = function() {
    this.commandMenuModel.items.pop(this.reloadModel);
    this.commandMenuModel.items.push(this.stopModel);
    this.controller.modelChanged(this.commandMenuModel);

    this.currLoadProgressImage = 0;
    this.currentLoadPercent    = 0;
};

WebviewAssistant.prototype.stopped = function() {
    this.commandMenuModel.items.pop(this.stopModel);
    this.commandMenuModel.items.push(this.reloadModel);
    this.controller.modelChanged(this.commandMenuModel);
};

WebviewAssistant.prototype.progress = function(event) {
    var percent = event.progress;

    try {
        var w_node = this.controller.get("webview-node");
        var w_mojo = w_node.mojo;

        var t_node = this.controller.get("token");
        var t_mojo = t_node.mojo;

        w_mojo.copy(function(a){
            if( a ) {
                if(PalmSystem && PalmSystem.paste) {
                    t_mojo.focus();
                    PalmSystem.paste();
                    var val = t_mojo.getValue();
                    if( val ) {
                        this._t_val = val;
                        t_mojo.setValue("");
                    }
                }

                Mojo.Log.info("_t_val: %s", this._t_val);
            }
        }.bind(this));

    } catch(e) {
        Mojo.Log.logException(e, e.description);
    }

    try {
        if (percent > 100) {
            percent = 100;

        } else if (percent < 0) {
            percent = 0;
        }

        if( percent < this.currentLoadPercent )
            return;

        this.currentLoadPercent = percent;

        // Convert the percentage complete to an image number
        // Image must be from 0 to 23 (24 images available)
        var image = Math.round(percent / 3.9);
        if (image > 26)
            image = 26;

        Mojo.Log.info("[webview progress computer] percent: %d; image: %d", percent, image);

        if (image < this.currLoadProgressImage)
            return;

        // Has the progress changed?
        if (this.currLoadProgressImage != image) {
            var icon = this.controller.select('div.load-progress')[0];

            if( icon )
                icon.setStyle({'background-position': "0px -" + (image * 48) + "px"});

            this.currLoadProgressImage = image;
        }

    } catch (e) {
        Mojo.Log.logException(e, e.description);
    }

};

Mojo.Log.info('loaded(WebviewAssistant.js)');
