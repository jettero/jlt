/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo setTimeout $A hex_md5
*/

var CHANGELOG = [
    [ '2011-04-26', '0.9.2', "Fixed the getComment bug, finally." ],
    [ '2011-04-26', '0.9.2', "Added this changelog" ]
];

var CHANGELOG_KEY    = "K:" + hex_md5(CHANGELOG.each(function(c){ return c.join("-"); }).join("|"));
var CHANGELOG_COOKIE = new Mojo.Model.Cookie("ChangeLog");

function ChangeLogAssistant() {
    Mojo.Log.info("ChangeLog()");
    CHANGELOG = $A(CHANGELOG);
}

ChangeLogAssistant.prototype.setup = function() {
    Mojo.Log.info("ChangeLog::setup()");

    var clv = CHANGELOG_COOKIE.get();

    this.OKModel          = { label: "OK, I read this.", command: CHANGELOG_KEY };
    this.DoneModel        = { label: "Done",             command: CHANGELOG_KEY };
    this.commandMenuModel = { label: 'ChangeLog Commands', items: [ ] };

    if( clv === CHANGELOG_KEY ) {
        this.commandMenuModel.items = [ {}, this.DoneModel, {} ];

    } else {
        setTimeout(function(){
            this.commandMenuModel.items = [ {}, this.OKModel, {} ];
            this.controller.modelChanged(this.commandMenuModel);

        }.bind(this), 4e3);
    }

    this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    this.changelogModel = {listTitle: 'ChangeLog', items: CHANGELOG.map(function(i){ return {
        'date': i[0], version: i[1], text: i[2] };})};

    this.changelogAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'misc/li-changelog',
    };

    this.controller.setupWidget('changelog', this.changelogAttrs, this.changelogModel);
};

ChangeLogAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("ChangeLog::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        if( s_a[0].match(/^K:[a-f0-9]{32}$/) ) {
            Mojo.Log.info("ChangeLog::handleCommand() K, read this");
            CHANGELOG_COOKIE.put(s_a[0]);
            Mojo.Controller.stageController.popScene();
            return;

        } else {
            Mojo.Log.info("ChangeLog::handleCommand(unknown command: %s)", Object.toJSON(s_a));
        }
    }

};

Mojo.Log.info('loaded(ChangeLog.js)');
