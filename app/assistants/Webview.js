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

    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewLoadStopped,  this.docloaded);

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
        this.donecb();
        delete this.donecb;
    }

    this.SC.popScene(); // bye!!
};

WebviewAssistant.prototype.deactivate = function() {
    Mojo.Log.info("WebviewAssistant::deactivate()");

    if( this.donecb ) {
        this.donecb();
        delete this.donecb;
    }

};

WebviewAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

Mojo.Log.info('loaded(WebviewAssistant.js)');
