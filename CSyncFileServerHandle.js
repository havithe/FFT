

const syncLog    = require("./CSyncLog.js");  

const async    = require("async");
const fs       = require('fs');
const syncUtil = require('./CSyncUtil.js');
const syncServerDBApp = require("./CSyncServerDBApp.js"); 

var FileIndex  = require("./FileIndex.js");

var syncDB     = require('./CSyncDB.js');  
syncDB.init(function() {}); 
//#############################################################################################################################################

//#############################################################################################################################################
 

function OnTransmitFile(req, fileCb, callback){  
    async.waterfall([
        function (next){
            syncServerDBApp.getDBContainerArr(req.userID, function(containerArr){
                req.containerArr = containerArr;
                next(null, req);
            });
        },
        function(req, next){
            fileCb(req, function(res){
                // syncLog.consoleLog(" "); 
                // syncLog.consoleLog("  syncFileServerHandle " + req.method + "  result -- :[" + JSON.stringify(res) +"]");                
                next(null, res);
            });
        },
        function(req, next){
            var x = req; 
            if (x.syncStatus === "failed"){
                next(x, null);
            }else{
                FileIndex.upFileIndexExpress(x, function(){
                    next(null, req);
                }); 
            }
        }],
        function (error, result) 
        { 
            if( error ) { 
                syncLog.consoleLog('\t  ' + req.method + ' is  failed');
                callback(error);
            } else { 
                syncLog.consoleLog('\t  ' + req.method + ' is succeed, file: [' + result.contentID + '], syncCode:[' + result.syncCode + '], contentSize:[' + result.contentSize + ']');
                syncLog.consoleLog('');
                
                callback(result);
            }
         }
     ); 
} 

function OnPutFile(req, dumpFileCb, callback){     
    req.method = "dumpFile";
    OnTransmitFile(req, dumpFileCb, callback); 
} 

function OnGetFile(req, getFileCb, callback){
    req.method = "getFile";
    OnTransmitFile(req, getFileCb, callback);  
} 

// function getFile (req, res, callback) 
function getFile (req, callback) 
{ 
    var x = req;
    // syncLog.consoleLog("sync  on CSyncServerHandle.prototype -----  req:"+JSON.stringify(req));

    var fname = syncUtil.getServerFileName(x.userID, x.containerID, x.contentID); 
    fs.readFile(fname, function (err, data) {
        var response = {
            "userID":x.userID, 
            "deviceID":x.deviceID, 
            "containerID":x.containerID, 
            "contentID":x.contentID,  
            "contentSize":0,
            "upindex":1,   
            "base64flg":true,
            "syncCode":x.syncCode, 
            "syncStatus":"success", 
            "fileName":fname, 
        };  

        if (err) 
        {
            // syncLog.consoleLog(err); 
            response.syncStatus = "failed";	
            response.syncInfo = "failed to open file: [" + fname + '] err:['+ err + "]";  
        }
        else
        {  
            response.syncInfo = "success in getFile file: [" + x.contentID + "]";   
            var dBuffer = new Buffer.from(data).toString('base64');  
            
            response.data = dBuffer; 

            var stats = fs.lstatSync(fname);   
            response.contentSize = stats.size; 	
        }
        callback(response);
    })
}

//#############################################################################################################################################

//#############################################################################################################################################

// function dumpFile(req, res, callback) 
function dumpFile(req, callback) 
{
    var x = req;

    var fileType = syncUtil.getFileType(x.contentID);

    // syncLog.consoleLog('\t dumpFile fname:[' + x.contentID +"], fileType:["+ fileType +"]"); 
    // syncLog.consoleLog(" ");
    // syncLog.consoleLog("************************************************************************************************** ---dumpFile");
    async.waterfall([
        function (next){
            // syncLog.consoleLog('\t dumpFile contentID:[' + x.contentID + "]\tcontainerID:[" + x.containerID 
            //                 + ']\tbase64flg:['+ x.base64flg + ']\tfileType:['+ fileType + ']'); 
            // syncUtil.makePath(x.containerArr[x.containerID], x.contentID); 
            syncUtil.makeServPath(x.userID, x.containerID, x.contentID, function(err){
                if (err){                    
                    // syncLog.consoleLog('\t dumpFile makeServPath :[' + err +"]"); 
                    next(err, null);
                }else{
                // syncLog.consoleLog('\t dumpFile makeServPath :[' + err +"]"); 
                next(null, null);
                }
            });  
        },
        function(req, next){
            var dataBuffer = "";
            if (x.base64flg == true) {
                dataBuffer = new Buffer.from(x.data, 'base64'); 
                if ((fileType == 'txt'))
                {
                    dataBuffer = new Buffer.from(x.data, 'base64').toString();
                } 
            }

            var fname = syncUtil.getFileName(x.containerArr[x.containerID], x.contentID);
            // syncLog.consoleLog('\t dumpFile fname:[' + fname +"], contentSize:["+x.contentSize+"]"); 

            fs.writeFile(fname, dataBuffer,  function (err) { 
                var response = {
                    "userID":x.userID, 
                    "deviceID":x.deviceID, 
                    "containerID":x.containerID, 
                    "contentID":x.contentID,  
                    "contentSize":x.contentSize,  
                    "upindex":1,   
                    "syncCode":x.syncCode, 
                    "syncStatus":"success", 
                    "fileName":fname,
                }; 

                if (err) 
                {
                    // syncLog.consoleLog(err); 
                    response.syncStatus = "failed";	
                    response.syncInfo = "failed to put file: [" + x.contentID + ", err:"+ err +"]";  
                }
                else
                { 
                    response.syncInfo = "success in putting file: [" + x.contentID + "]";  
                }
                
                next(null, response);
            })
        }],
        function (error, result) 
        { 
            callback(result); 
        }
    );
} 

//#############################################################################################################################################

//#############################################################################################################################################

var syncFileServerHandle = {
    "getFile":getFile, 
    "dumpFile":dumpFile, 
    "OnGetFile":OnGetFile,
    "OnPutFile":OnPutFile,
};

module.exports = syncFileServerHandle;

