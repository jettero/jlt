/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Mojo Ajax setTimeout clearTimeout
*/

(function(){
    var callInProgress = function(xmlhttp) {
        switch (xmlhttp.readyState) {
            case 1:
            case 2:
            case 3:
                return true;

            // Case 4 and 0
            default:
                return false;
        }
    };

    var now = function() {
        var d = new Date();
        var t = d.getTime();
        var n = Math.round( t/1000.0 );

        return n;
    };

    var ajaxTimeout = 10e3;

    Ajax.Responders.register({
        onCreate: function(request) {
            var f;

            request.before = now();
            request.timeoutId = setTimeout(
                f = function() {
                    if (callInProgress(request.transport)) {
                        Mojo.Log.info("AJAX-ext Timeout fired dt=%d", now() - request.before);
                        request.transport.abort();

                    } else {
                        Mojo.Log.info("AJAX-ext Timeout fired dt=%d — but no call was in progress", now() - request.before);
                    }
                },

                ajaxTimeout
            );
        },

        onComplete: function(request) {
            Mojo.Log.info("AJAX-ext Timeout cleared normally dt=%d", now() - request.before);
            clearTimeout(request.timeoutId);
        }
    });

}());
