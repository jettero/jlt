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

    this.SC = Mojo.Controller.stageController.assistant;
}

WebviewAssistant.prototype.setup = function() {
    Mojo.Log.info("WebviewAssistant::setup()");

    this.controller.setupWidget("webview-node",
        this.attributes = {
            url: this.URL,
            minFontSize: 18
        },

        this.model = {
        }

    );

    Mojo.Event.listen(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);

    this.controller.get("web-title").innerHTML = title;
};

WebviewAssistant.prototype.titlechanged = function(title) {
    Mojo.Log.info("WebviewAssistant::titlechanged(%s)", title);

    if( title.match(/\[done\]/) )
        this.donebutton(); // if the title says [done] press the done button
};

WebviewAssistant.prototype.donebutton = function() {
    Mojo.Log.info("WebviewAssistant::donebutton()");

    if( this.donecb )
        this.donecb();

    this.SC.popScene(); // bye!!
};

WebviewAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

Mojo.Log.info('loaded(WebviewAssistant.js)');
