/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewAssistnat
*/

function WebviewAssistant(args) {
    Mojo.Log.info("WebviewAssistant(title: %s, URL: %s)", args.title, args.URL);

    this.title  = args.title;
    this.URL    = args.URL;
    this.donecb = args.donecb;

    this.donebutton   = this.donebutton.bind(this);
    this.titlechanged = this.titlechanged.bind(this);
    this.docloaded    = this.docloaded.bind(this);

    this.SC = Mojo.Controller.stageController.assistant;

    // eog $(find ../usr.palm.frameworks/ -name \*.png | grep menu-icon)
    this.tokenModel = { label: "ID", icon: 'info', command: 'enter-token' };
    this.commandMenuModel = { label: 'Webview Command Menu', items: [ this.tokenModel ] };
}

WebviewAssistant.prototype.setup = function() {
    Mojo.Log.info("WebviewAssistant::setup()");

	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.controller.setupWidget("webview-node",
        this.attributes = {
            url: this.URL,
            minFontSize: 18
        },

        this.model = {
            /* this isn't really used for anything that I can see */
        }

    );

    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);

    // no point in attaching to this, unless further experiments are in store...
    // Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadStopped,  this.docloaded);

    this.controller.get("web-title").innerHTML = this.title;
};

WebviewAssistant.prototype.docloaded = function() {
    Mojo.Log.info("WebviewAssistant::docloaded()");

    // NOTE: there is no way to get the contents of the webview, any cookies,
    // nonces or tokens from it.  ... it simply cannot be done.  Pfft.  Unless
    // you're writing a web browser, what good is this stupid widget?  Oh, and
    // webos already has a web browser.


    // this doesn't help at all.
    // this.controller.get("webview-node").setAcceptCookies(true);

    // this doesn't help at all
    // this.controller.get("webview-node").copy(function(copy){
    // this.controller.get("webview-node")._mojoController.assistant.adapter.copy(function(copy){
    //     Mojo.Log.info("copy: " + copy);
    // });
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

            default:
                Mojo.Log.info("handleCommand(unknown command: %s)", Object.toJSON(s_a));
                break;
        }
    }
};

Mojo.Log.info('loaded(WebviewAssistant.js)');
