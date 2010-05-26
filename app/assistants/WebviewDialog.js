/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewDialog
*/

function WebviewDialog(sceneController,title,url,donecb) {
    Mojo.Log.info("WebviewDialog()");

    this.controller = sceneController;
    this.title      = title;
    this.url        = url;
    this.donecb     = donecb;

    this.donebutton   = this.donebutton.bind(this);
    this.titlechanged = this.titlechanged.bind(this);
}

WebviewDialog.prototype.setup = function(widget) {
    Mojo.Log.info("WebviewDialog::setup()");

    this.widget = widget;

    this.controller.setupWidget("webview-node",
        this.attributes = {
            url: this.url,
            minFontSize: 18
        },

        this.model = {
        }

    );

    this.controller.get("web-title").innerHTML = this.title;

    Mojo.Event.listen(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
    Mojo.Event.listen(this.controller.get('webview-node'), Mojo.Event.webViewTitleChanged, this.titlechanged);
};

WebviewDialog.prototype.titlechanged = function(title) {
    Mojo.Log.info("WebviewDialog::titlechanged(%s)", title);

    if( title.match(/\[done\]/) )
        this.donebutton(); // if the title says [done] press the done button
};

WebviewDialog.prototype.donebutton = function() {
    Mojo.Log.info("WebviewDialog::donebutton()");

    this.widget.mojo.close();

    if( this.donecb )
        this.donecb();
};

WebviewDialog.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

Mojo.Log.info('loaded(WebviewDialog.js)');
