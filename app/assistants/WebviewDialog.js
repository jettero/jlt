/*jslint white: false, onevar: false
*/
/*global Mojo $ WebviewDialog
*/

function WebviewDialog(sceneController,url,donecb) {
    Mojo.Log.info("WebviewDialog()");

    this.controller = sceneController;
    this.url        = url;
    this.donecb     = donecb;
}

WebviewDialog.prototype.setup = function(widget) {
    Mojo.Log.info("WebviewDialog::setup()");

    this.widget = widget;

    this.controller.setupWidget("WebId",
        this.attributes = {
            url: 'http://kfr.me/',
            minFontSize: 18
        },

        this.model = {
        }

    );
};

WebviewDialog.prototype.cleanup = function() {
};

Mojo.Log.info('loaded(WebviewDialog.js)');
