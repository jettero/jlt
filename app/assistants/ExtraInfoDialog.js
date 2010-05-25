/*jslint white: false, onevar: false
*/
/*global Mojo $ ExtraInfoDialog
*/

function ExtraInfoDialog(sceneController,attrs,gocb,stopcb) {
    Mojo.Log.info("ExtraInfoDialog()");

    this.controller = sceneController;
    this.attrs = attrs ? attrs : {};

    this.go   = this.go.bind(this);
    this.stop = this.stop.bind(this);

    this.gocb = gocb;
    this.stopcb = stopcb;
}

ExtraInfoDialog.prototype.setup = function(widget) {
    Mojo.Log.info("ExtraInfoDialog::setup()");

    this.widget = widget;

    this.tfAttributes = {
        hintText:      'hint text here',
        textFieldName: 'eid-tf',
        maxLength:     64,
        textCase:      Mojo.Widget.steModeLowerCase,
        autoFocus:     true,
        enterSubmits:  true,
        multiline:     false
    };

    for( var k in this.attrs )
        this.tfAttributes[k] = this.attrs[k];

    this.tfModel = { original: '', value: '' };
    this.controller.setupWidget('eid-tf', this.tfAttributes, this.tfModel);

    Mojo.Event.listen(this.controller.get('go-b'),   Mojo.Event.tap, this.go);
    Mojo.Event.listen(this.controller.get('stop-b'), Mojo.Event.tap, this.stop);

};

ExtraInfoDialog.prototype.go = function() {
    Mojo.Log.info("ExtraInfoDialog::go()");

    this.widget.mojo.close();

    if( this.gocb )
        this.gocb(this.tfModel.value);
};

ExtraInfoDialog.prototype.stop = function() {
    Mojo.Log.info("ExtraInfoDialog::stop()");

    this.widget.mojo.close();

    if( this.stopcb )
        this.stopcb();
};

ExtraInfoDialog.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.get('go-b'),   Mojo.Event.tap, this.go);
	Mojo.Event.stopListening(this.controller.get('stop-b'), Mojo.Event.tap, this.stop);
};

Mojo.Log.info('loaded(ExtraInfoDialog.js)');
