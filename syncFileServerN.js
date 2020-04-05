 

const async                = require("async");

const syncLog              = require("./CSyncLog.js");   
const syncFileServerHandle = require('./CSyncFileServerHandle.js');  

//#############################################################################################################################################

//#############################################################################################################################################

//-----------------------------------------------------------------------------
// function dumpFile(req, res, callback) 
function dumpFile(req, callback) 
{
    syncFileServerHandle.OnPutFile(req, syncFileServerHandle.dumpFile,
        function(response){ 
            callback(response);
        }
    ); 
}

// function getFile(req, res, callback) 
function getFile(req, callback) 
{ 

    syncFileServerHandle.OnGetFile(req, syncFileServerHandle.getFile,
        function(response){ 
            callback(response);
        }
    );
}

//#############################################################################################################################################

//#############################################################################################################################################

var http = require('http');

var httpFuncArr = {
    "putFile":function(req, callback){
        dumpFile(req, callback) ;
    },
    "getFile":function(req, callback){
        getFile(req, callback) ;
    },
};

function httpCallBack(req, res)
{
    // syncLog.consoleLog('syncFile server req: '+ req);  
    // syncLog.consoleLog('syncFile server req: '+ JSON.stringify(req)); 

    var post = '';     
    req.on('data', function (chunk) {
        post += chunk;
    });

    req.on('end', function () {

        // syncLog.consoleLog('syncFile server body string:  ' + post); 
        // var reqObj = eval('(' + post + ')'); 
        try {
            var reqObj = eval('(' + post + ')'); 

            var method = reqObj.method;
            // syncLog.consoleLog('syncFile server method:', method);

            httpFuncArr[method](reqObj, function(response){

                var ress  = {}; 
                ress.response = response;

                res.end(JSON.stringify(ress));
            }); 
        }
        catch(err) { 
            syncLog.consoleLog('[post eval] err:' + err);
            syncLog.consoleLog('syncFile server body string:[' + post +"]"); 
        }
    });
}

var httpServer = http.createServer(httpCallBack);
// var portIO = 7786;
var portIO = 7777;
httpServer.listen(portIO);

syncLog.consoleLog("//#############################################################################################################################################");
syncLog.consoleLog("syncFile server started......");
syncLog.consoleLog('syncFile server listening on ' + portIO + "!");


//#############################################################################################################################################

//#############################################################################################################################################

