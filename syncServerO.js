 

const async = require("async");

const syncLog         = require("./CSyncLog.js");  
const syncServerDBApp = require("./CSyncServerDBApp.js");

const syncDB = require('./CSyncDB.js');  
syncDB.init(function() { });

//#############################################################################################################################################

//#############################################################################################################################################


//-----------------------------------------------------------------------------
var http = require('http');

var httpFuncArr = {
    "syncfilesList":function(req, callBack){
        syncfilesList(req, callBack) ;
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

        // syncLog.consoleLog('syncServer body string:  ' + post);
        // var reqObj = querystring.parse(post);

        try {
            var reqObj = eval('(' + post + ')'); 
            var method = reqObj.method;
            syncLog.consoleLog('syncServer method:', method);

            httpFuncArr[method](reqObj, function(response){
                // var ress  = {}; 
                // ress.msssg = "hi this is the sync ...."; 
                // ress.response = response;
                // res.end(JSON.stringify(ress));
                res.end(JSON.stringify(response));
            }); 
        }
        catch(err) { 
            syncLog.consoleLog('[post eval] err:' + err);
            syncLog.consoleLog('syncFile server body string::[' + post +"]"); 
        }
    });
}

var httpServer = http.createServer(httpCallBack);
var portIO = 7786;

httpServer.listen(portIO);
syncLog.consoleLog("//#############################################################################################################################################");
syncLog.consoleLog("syncServer started......");


syncLog.consoleLog('syncServer listening on ' + portIO + "!");

//#############################################################################################################################################

//#############################################################################################################################################
//-----------------------------------------------------------------------------

var CSyncServerHandle = require('./CSyncServerHandleO.js'); 

var sync = new CSyncServerHandle();
sync.init();

function syncfilesList(reqStr, callBack)
{
    syncLog.consoleLog(" ");  
    syncLog.consoleLog("< ==================================================================================================== >"); 
    syncLog.consoleLog(" sync started ");  
    syncLog.consoleLog("< ==================================================================================================== >");  
    syncLog.consoleLog(" ");  
    
    // syncLog.consoleLog("sync  on syncfilesList -----  reqStr:"+reqStr);
    syncLog.consoleLog("sync  on syncfilesList:"); 
    // var req = eval('(' + reqStr + ')');  
    var req = reqStr;  

    
    async.waterfall([
        function (next){
            syncServerDBApp.getDBContainerArr(req.userID, function(containerArr){
                req.containerArr = containerArr;
                next(null, req);
            });
        },
        function(req, next){
            syncServerDBApp.recDevice({"userID":req.userID, "deviceID":req.deviceID}, function(){
                next(null, req);
            })
        },
        function(req, next){
            sync.sync(req, function(res){ 
                // syncLog.consoleLog("sync  res -----  res.containerArr:"+JSON.stringify(res));
                next(null, res);
            }); 
        }],
        function (error, result) 
        { 

            callBack(result);
            syncLog.consoleLog(" "); 
            syncLog.consoleLog("sync on \'syncfilesList\' -----  result sended successfully ");  
            syncLog.consoleLog("**************************************************************************************************");
        }
    );  
}

//#############################################################################################################################################

//#############################################################################################################################################

var http = require('http');
var server = http.createServer();

var portIO = 3586;
server.listen(portIO);

var io = require('socket.io');
var socket = io.listen(server);
syncLog.consoleLog("//#############################################################################################################################################");
syncLog.consoleLog("syncServer socketio started......");
syncLog.consoleLog('syncServer socketio listening on port ' + portIO + "!"); 

//#############################################################################################################################################

//#############################################################################################################################################


socket.on('connection', function(client){ 

    //暂停不用，目前使用http
    // client.on('syncfilesList', function(reqStr) { 
    //     syncfilesList(reqStr, function(){
    //     }); 
    // });
 
    
//#############################################################################################################################################

//#############################################################################################################################################

    client.on('userLogin', function(req) {  

        userLogin(req,  function(userLoginRT){

            // var res = {
            //     "res":userLoginRT,
            //     // "userInfo":userInfo,
            // }
            client.emit('userLogin', userLoginRT);
        });
    });
    
    client.on('userRegCheck', function(req) { 
        userRegCheck(req, function(userRegCheckRT){

            client.emit('userRegCheck', userRegCheckRT);
        })
    });

    client.on('userRegister', function(req) {  

        userReg(req, function(res){

            client.emit('userRegister', res);
        })
    });

    client.on('userInfoUpgrade', function(req) { 

        userInfoUpgrade(req, function(res){
            client.emit('userInfoUpgrade', res);
        })
        
    });

    client.on('userInfoAvatar', function(req) { 

        userInfoAvatar(req, function(res){
            client.emit('userInfoAvatar', {"res":1}); 
        })
        
    });

});

//#############################################################################################################################################

//#############################################################################################################################################


function userLogin(req, cb){


    var strSql = "select  USERID";
    strSql = strSql + " from T_USR_USER T1  ";
    strSql = strSql + " where  T1.userid = '" + req.userID + "'  and  pwd = '" + req.pwd  +"'"; 

    syncLog.consoleLog('\t\t\t userLogin select  strSql - ['+strSql+']');
    syncDB.execSelectSql(strSql, function(rows){ 

        var res = {
            "userID":req.userID,
            "pwd":req.uPwd, 
        };

        if (rows.length == 0){  
            
            syncLog.consoleLog('\t\t\t userLogin  user check is  false');
                res.userLogin = false;

            syncLog.consoleLog('userLogin res:'+ JSON.stringify(res));  
            cb(res); 
        } else{   
            syncLog.consoleLog('\t\t\t userLogin  user check is  true');
                res.userLogin = true;

            syncLog.consoleLog('userLogin res:'+ JSON.stringify(res));  
            cb(res);
        }  
    });
}
 
function userRegCheck(req, cb){
    var strSql = "select count(*)";
    strSql = strSql + " from T_USR_USER T1  ";
    strSql = strSql + " where  T1.userid = '" + req.userID +"'"; 

    syncDB.execSelectSql(strSql, function(rows){ 
        
        r = rows[0] 
        if (r[0] == 0)
        {
            cb(false); 
        }else{
            cb(true); 
        } 
    });
}

function userReg(req, cb){
    var strSql = "insert into T_USR_USER(USERID, pwd) "
    strSql = strSql + " values( '"+ req.userID +"', '"+ req.pwd + "');";  

    syncDB.execUpSql(strSql,  function(rows){   
        syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows); 
        cb();
    })
}

function userInfoUpgrade(req, cb){

    async.waterfall([
        function (next){
            // syncLog.consoleLog(''); 
            var strDelSql = "delete from T_USR_USERINFO  where  USERID = '"+ req.userID + "'"; 
            syncLog.consoleLog('\t\t userInfoUpgrade strDelSql:['+ strDelSql +']'); 

            syncDB.execUpSql(strDelSql, function(rows){
                // var traceinfo = 'sync index deleted ';
                // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows);
                next(null, req);
            })
        },
        function(req, next){
            
            var strSql = "insert into T_USR_USERINFO(USERID, userName, sign, headPic, nickName, userKey, STATUS) values "
            strSql = strSql + "  ('"+ req.userID +"', '"+ req.userName + "', '" + req.sign+"', '"+req.avatar+"', '";
            strSql = strSql + req.nickName+ "', '"+req.userKey +"',1);";   

            // syncLog.consoleLog('\t\t userInfoUpgrade strSql:['+ strSql +']'); 
             syncDB.execUpSql(strSql,  function(rows){ 
                // var traceinfo = 'sync index info will be appended ----------- ';
                // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows); 
                next(null, rows);
            })
        }],
        function (error, result) 
        { 
            cb();
        } 
    )
}

function userInfoAvatar(avatarObj, cb){

    async.waterfall([
        function (next){
            // syncLog.consoleLog(''); 
            var strDelSql = "delete from T_USR_USERINFO_AVATAR  where  USERID = '"+ avatarObj.userID + "'"; 
            syncLog.consoleLog('\t\t userInfoAvatar del strDelSql:['+ strDelSql +']'); 

            syncDB.execUpSql(strDelSql, function(rows){
                // var traceinfo = 'sync index deleted ';
                // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows);
                next(null, {});
            })
        },
        function(req, next){
            
            var strSql = "insert into T_USR_USERINFO_AVATAR(USERID, headPic, STATUS) values "
            strSql = strSql + "  ('"+ avatarObj.userID +"', '" +avatarObj.avatar + "',1);";   

            // syncLog.consoleLog('\t\t userInfoAvatar ins strSql:['+ strSql +']'); 
             syncDB.execUpSql(strSql,  function(rows){  
                // syncLog.consoleLog('\t\t userInfoAvatar affectedRows:', rows.affectedRows); 
                next(null, rows);
            })
        }],
        function (error, result) 
        { 
            cb();
        } 
    )
}




//#############################################################################################################################################

//#############################################################################################################################################

