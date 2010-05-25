/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewDialog
*/

function WebviewDialog(sceneController,title,url,donecb) {
    Mojo.Log.info("WebviewDialog()");

    this.controller = sceneController;
    this.url        = url;
    this.donecb     = donecb;
    this.title      = title;

    this.donebutton = this.donebutton.bind(this);
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

    this.controller.get("title").innerHTML = this.title;

    Mojo.Event.listen(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

WebviewDialog.prototype.donebutton = function() {
    Mojo.Log.info("WebviewDialog::donebutton()");

    this.widget.mojo.close();

    if( this.donecb )
        this.donecb();
}

WebviewDialog.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('web-finished'), Mojo.Event.tap, this.donebutton);
};

Mojo.Log.info('loaded(WebviewDialog.js)');
