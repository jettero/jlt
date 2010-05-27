/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewDialog
*/

function WebviewAssistant() {
    Mojo.Log.info("WebviewAssistant()");

    this.ready = false;

    this.donebutton   = this.donebutton.bind(this);
    this.titlechanged = this.titlechanged.bind(this);
}

WebviewAssistant.prototype.setup = function() {
    Mojo.Log.info("WebviewAssistant::setup()");

    this.controller.setupWidget("webview-node",
        this.attributes = {
            url: "file:///tmp/404",
            minFontSize: 18
        },

        this.model = {
        }

    );

    Mojo.Event.listen(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);
};

WebviewAssistant.prototype.titlechanged = function(title) {
    Mojo.Log.info("WebviewAssistant::titlechanged(%s)", title);

    if( title.match(/\[done\]/) )
        this.donebutton(); // if the title says [done] press the done button
};

WebviewAssistant.prototype.donebutton = function() {
    Mojo.Log.info("WebviewAssistant::donebutton()");

    this.widget.mojo.close();

    if( this.donecb )
        this.donecb();
};

WebviewAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

Mojo.Log.info('loaded(WebviewAssistant.js)');
