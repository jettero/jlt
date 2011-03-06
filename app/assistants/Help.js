/*jslint white: false, onevar: false
*/
/*global Mojo $
*/

function HelpAssistant() {
    Mojo.Log.info("Help()");
}

HelpAssistant.prototype.setup = function() {
    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.menuSetup();
};

Mojo.Log.info('loaded(Help.js)');
