 
  
const syncLog    = require("./CSyncLog.js");  

const async = require("async");
const fs  = require('fs'); 
const lfs = require('./CLocalFs.js'); 
 
var syncUtil = require('./CSyncUtil.js'); 
var syncDB = require('./CSyncDB.js'); 

syncDB.init(function() { 
}); 

const libOnUsed = 'A';
const libReaded = 'R';
const libDeled = 'deleted';

const OnReaded = 'R';
var CONTENTSTATUS = {
    "OnUsed":'A',
    "OnReaded":'R',
    "OnDeled":'deleted',
};

var containerSync = {}; 
var removeLibArr = new Array();
var appendLibArr = new Array();
var removeServLibArr = new Array();
var appendServLibArr = new Array();  

//#############################################################################################################################################

//#############################################################################################################################################


//#############################################################################################################################################

//###################################################### sync db app start #######################################################################


var FileIndex = require("./FileIndex.js");



function listlib(userID, deviceID, callback) 
{
    // syncLog.consoleLog('');
    var strSql = "select CONTAINER, PATH, UPINDEX, USERID, STATUS, DEVICEID FROM T_APP_CONTAINER  where  UPINDEX= 1 ";
    strSql = strSql + "and USERID = '" + userID + "'";   
    // syncLog.consoleLog('\t\t\t  listlib  strSql - ['+strSql+']');
    
    syncDB.execSelectSql(strSql, function(rows){

        if (rows.length == 0){  
            callback({}) ;

        } else{ 
            var serverArr = {};
            // syncLog.consoleLog('');
            for (x in rows)
            {
                r = rows[x];
                syncLog.consoleLog('\t\t CONTAINER in server:['+r["CONTAINER"] + ']');

                var devCode = (r["DEVICEID"] === deviceID)?'1':'0';
                var statusCode = {'A': '1', 'R': '1', 'deleted':'0'}; 
                
                serverArr[r["CONTAINER"]] = {"upIndex":r["UPINDEX"], "status":r["STATUS"], "PATH":r["PATH"], "DEVICEID":r["DEVICEID"], "syncCode":statusCode[r["STATUS"]]+devCode};
            }  
            // syncLog.consoleLog('');
            // syncLog.consoleLog("CSyncServerHandle.listlib serverArr:["+JSON.stringify(serverArr)+"]");
            callback(serverArr) ; 
        }

    }); 
} 

function removeContainerInDB (userID, containerID, cb) 
{
    var strSql = "update  T_APP_CONTAINER  set STATUS = '" +CONTENTSTATUS["OnDeled"] + "'"
                strSql = strSql + " where  CONTAINER = '"+containerID + "'";   
                strSql = strSql + " and USERID = '" + userID + "'";   

    var traceinfo = 'CONTAINER  will be removed ';

    syncDB.execSelectSql(strSql, function(rowsx){ 
        // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rowsx.affectedRows);
        cb();
    });
}
    
function removeServLibs(paramsIn, callback)
{ 
    // syncLog.consoleLog("");
    var containerArr = paramsIn.containerArr; 
    async.each(paramsIn.removeServLibArr, function(containerID, next){  

        var root = syncUtil.getServerContainerRoot(paramsIn.userID, containerID);
        delete containerArr[containerID];  

        syncLog.consoleLog('\tlib :['+ containerID + '] is deleted ,root path is deleted : [' + root + ']'); 
        removeContainerInDB(paramsIn.userID, containerID, function(){
            next();
        });  
    
    },
    function(err)
    {
        if( err ) {
            syncLog.consoleLog('sync removeServLibs -----  A file failed to process');
        } else {
            syncLog.consoleLog("\tsync removeServLibs processed successfully ----- removeServLibArr:"+JSON.stringify(paramsIn.removeServLibArr)); 
           callback(containerArr); 
        }
    }) 
}   


// CSyncServerHandle.prototype.recContainer2DBExpress = function (containerID, path) 
function recContainer2DBExpress (paramsIn, cb)
{
    var strDelSql = "delete from T_APP_CONTAINER where CONTAINER = '" + paramsIn.containerID + "'";  
    strDelSql = strDelSql + " and USERID = '" + paramsIn.userID + "'";   
    syncLog.consoleLog('recContainer2DBExpress  ------   strDelSql:'+ strDelSql);

    syncDB.execSelectSql(strDelSql,  function(rows){
        // var traceinfo = 'recContainer2DBExpress lib deleted ';
        // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows);
            
        var strSql = "insert into  T_APP_CONTAINER(CONTAINER, PATH, UPINDEX, STATUS, DEVICEID, USERID) "
                    strSql = strSql + " values('" + paramsIn.containerID;
                    strSql = strSql + "', '"+ paramsIn.path;
                    strSql = strSql + "',1,'A','"+ paramsIn.deviceID;
                    strSql = strSql + "', '" + paramsIn.userID;
                    strSql = strSql + "');";   

        syncLog.consoleLog('recContainer2DBExpress  ------   strSql:'+ strSql);
        syncDB.execSelectSql(strSql, function(rowsx){ 
            traceinfo = 'recContainer2DBExpress info will be appended ';
            syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rowsx.affectedRows);
            cb();
        });
    })

}

function appendServLibs(paramsIn, cb)
{
    // syncLog.consoleLog("");
    var containerArr = paramsIn.containerArr;
    async.each(paramsIn.appendServLibArr, function(containerID, next){  

        var root = syncUtil.getServerContainerRoot(paramsIn.userID, containerID);
        // syncLog.consoleLog('\tcontainerID \'s root path is added : [' + root + ']'); 
        containerArr[containerID] = root; 

        syncLog.consoleLog('\tcontainerID \'s path is added : [' + containerArr[containerID] + ']'); 
        var params = {
            userID:paramsIn.userID, 
            containerID:containerID, 
            path:root, 
            deviceID:paramsIn.deviceID,
        } ;

        recContainer2DBExpress(params, function(){
            next();
        }); 
    },
    function(err)
    {
        if( err ) {
            syncLog.consoleLog('sync appendServLibs failed ');
        } else {
            syncLog.consoleLog("\tsync appendServLibs processed successfully ----- appendServLibArr:"+JSON.stringify(paramsIn.appendServLibArr)); 
            cb(containerArr); 
        }
    }) 
} 

function listContentByDevID(userID, containerID, deviceID,  callback) 
{
    var strSql = "select CONTENTID, T1.DEVICEID, UPINDEX, T1.STATUS, CONTENTSIZE , mod(T1.SEQ_NUM, T2.SEQ_NUM) as SEQ_NUM ";
    strSql = strSql + " from T_APP_SYNC T1 , T_APP_DEVICE_INFO T2 ";
    strSql = strSql + " where UPINDEX = 1 and  T1.userid = T2.userid  ";
    strSql = strSql + " and T2.DEVICEID = '" + deviceID + "'"; 
    // strSql = strSql + " and T1.DEVICEID = '" + deviceID + "'";                
    strSql = strSql + " and T1.containerID = '"+ containerID + "'"; 
    strSql = strSql + " and T1.USERID = '"+ userID +"'"; 

    syncLog.consoleLog("");
    // syncLog.consoleLog('listContentByDevID strSql: [' + strSql + ']'); 

    syncDB.execSelectSql(strSql, function(rows){
        syncLog.consoleLog("\t listContentByDevID: --"+containerID + ': [rows.rowCount] - [' +rows.length +']'); 

        if (rows.length == 0){  
            callback({}) ;
        } else{ 
            // syncLog.consoleLog('\t listContentByDevID --- rows : ['  + JSON.stringify(rows)+']'); 
            var serverArr = {};
            for (x in rows)
            {
                r = rows[x];
                // syncLog.consoleLog('\t listContentByDevID --- row : ['  + JSON.string÷ify(r)+']'); 

                var devCode = (r["DEVICEID"] == deviceID)?'1':'0'; 
                var statusCode = {'A': '1', 'R': '2', 'D':'0', 'DD':'3',};   
                // syncLog.consoleLog('\t syncCode: [' + statusCode[r["STATUS"]] + devCode + ']'+"\t CONTENTID:"+r["CONTENTID"]);   

                serverArr[r["CONTENTID"]] = {
                    "upIndex":r["UPINDEX"], 
                    "status":r["STATUS"], 
                    "contentSize":r["CONTENTSIZE"], 
                    "deviceID":r["DEVICEID"], 
                    "syncCode":statusCode[r["STATUS"]] + devCode,
                    "seqNum":r["SEQ_NUM"],
                };
            }
            // syncLog.consoleLog('\t serverArr: [' + JSON.stringify(serverArr) + ']');   
            callback(serverArr) ; 
        }
    });  
}
//#############################################################################################################################################

//###################################################### sync db app end #######################################################################

function minusArr(Arr1, Arr2)
{ 

    // syncLog.consoleLog("minusArr -------------------Arr1:"+ JSON.stringify(Arr1) );
    // syncLog.consoleLog("minusArr -------------------Arr2:"+ JSON.stringify(Arr2) );
// if (Arr1===null) Arr1 = {};
// if (Arr2===null) Arr2 = {};

    var r1 = [];
    var r2 = []
    var r3 = [];
    for (var x in Arr1)
    {
        if (Arr2[x] === undefined)
        {
            // r1.push(Arr1[x]); 
            r1.push(x); 
        }
        else{
            // r2.push(Arr1[x]); 
            r2.push(x); 

        }
    }
    for (var x in Arr2)
    {
        if (Arr1[x] === undefined)
        {
            // r3.push(Arr2[x]); 
            r3.push(x); 
        }
    }
    var res = {
        "r1":r1,
        "r2":r2,
        "r3":r3,
    }

    // syncLog.consoleLog("");
    // syncLog.consoleLog("minusArr -------------------res:"+ JSON.stringify(res)); 
    return res;
}



function delServArr(paramsIn, callback)
{ 
        // 刚刚本地删除了
        //deleted in this device, now delete it from server 
        
        // syncLog.consoleLog("deleted in this device, now delete it from server x:[" + paramsIn.contentID +"]");
        paramsIn.outResContent.delServArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        callback();
}

var syncContentFuncArr ={
    "000":function(paramsIn, cb){

        paramsIn.outResContent.syncStatusChgArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
    "001":function(paramsIn, cb){ 
        paramsIn.outResContent.syncStatusChgArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
    "010": function(paramsIn, cb){
        //create or update by another device and no be get by this device 
        //get it now
 
        paramsIn.outResContent.getArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb(); 
    },
    "011":function(paramsIn, cb){

        // // 刚刚本地删除了
        delServArr(paramsIn, function(){
            cb();
        }); 
    },
    "020":function(paramsIn, cb){
        
        if (paramsIn.seqNum != 0){
    
            paramsIn.outResContent.getArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            }); 
            cb(); 
        }else{

            delServArr(paramsIn, function(){
                cb();
            }); 
        }
    },
    "021":function(paramsIn, cb){
        // // 刚刚本地删除了
        delServArr(paramsIn, function(){
            cb();
        }); 
    },
    "030":function(paramsIn, cb){
        if (paramsIn.seqNum != 0){
            paramsIn.outResContent.syncStatusChgArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            });  
        }else{
            // do nothing  
        }
        cb();
    },
    "031":function(paramsIn, cb){
        // do nothing  
        cb();
    },
    "100":function(paramsIn, cb){

        // x is deleted by another 
        //deleted in other device, now delete it in this device
        paramsIn.outResContent.delArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        });
        // change status in syncdb
        paramsIn.outResContent.syncStatusChgArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 

        cb();  
    },
    "101":function(paramsIn, cb){
 
        paramsIn.outResContent.putArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
    "110":function(paramsIn, cb){ 
        
        // syncLog.consoleLog("\tsyncContentsR2 110 --------- paramsIn :"+   paramsIn.contentID);  
        paramsIn.outResContent.getArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb(); 
    },
    "111":function(paramsIn, cb){

        paramsIn.outResContent.putArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
    "120":function(paramsIn, cb){
        
        if (paramsIn.seqNum != 0){
            paramsIn.outResContent.getArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            }); 
        } else{
            if (0 === paramsIn.sizeChangeFlg){
            }else{
                paramsIn.outResContent.putArr.push({
                    "syncCode":paramsIn.syncCode,
                    "contentID":paramsIn.contentID,
                }); 
            }
        }
        cb(); 
    },
    "121":function(paramsIn, cb){

        paramsIn.outResContent.putArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
    "130":function(paramsIn, cb){
        if (paramsIn.seqNum != 0){

            // x is deleted by another 
            //deleted in other device, now delete it in this device
            paramsIn.outResContent.delArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            });
            // change status in syncdb
            paramsIn.outResContent.syncStatusChgArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            }); 
        }else{
            paramsIn.outResContent.putArr.push({
                "syncCode":paramsIn.syncCode,
                "contentID":paramsIn.contentID,
            }); 
        }
        cb();  
    },
    "131":function(paramsIn, cb){
        paramsIn.outResContent.putArr.push({
            "syncCode":paramsIn.syncCode,
            "contentID":paramsIn.contentID,
        }); 
        cb();
    },
};
 
function syncContentsR1 (minusRes, outResContent, callback) { 
 
    // syncLog.consoleLog("\t########################################################################################## ---syncContentsR1");
    // syncLog.consoleLog("\tsyncContentsR1 -------- r1:" + JSON.stringify(minusRes.r1));
    async.each(minusRes.r1, function(x, next)
    {
        // syncLog.consoleLog("syncContents r1 ----- x:"+ x); 
        // syncLog.consoleLog(x+' is not founded in the server, it is a new guy');     
        // x is not founded in the server, it is a new guy
        // outResContent.putArr.push(x);  

        outResContent.putArr.push({
            "syncCode":"111",
            "contentID":x,
        }); 
        syncLog.consoleLog("\tsyncContentsR1 --------- X:["+ x + "], syncCode:[111]"); 
        next(null);
    },
    function(err)
    {
        if( err ) {
            syncLog.consoleLog('sync r1  failed to process'); 
        } else {
            callback();
        }
    })
}

function syncContentsR3 (paramsIn, outResContent, callback) {
    
    // syncLog.consoleLog("\t########################################################################################## ---syncContentsR3");
    // syncLog.consoleLog("\tsyncContentsR3 -------- containerID:"+paramsIn.containerID);
    async.each(paramsIn.r3, function(x, next)
    {
        var syncCode = "0" + paramsIn.serverArr[x]["syncCode"]; 
        var seqNum   = paramsIn.serverArr[x]["seqNum"]; 

        syncLog.consoleLog("\tsyncContentsR3 --------- X:["+ x + "], syncCode:["+syncCode + "]"); 
        syncContentFuncArr[syncCode]({ "contentID":x, "outResContent":outResContent, "syncCode":syncCode, "seqNum":seqNum,}, 
        function(){ 
            next(null);
        });
    },
    function(err)
    {
        if( err ) {
            syncLog.consoleLog('syncContentsR3  failed to process'); 
        } else {
            callback();
        }
    }) 
}

function syncContentsR2 (paramsIn, outResContent, callback) {
    // syncLog.consoleLog("\t########################################################################################## ---syncContentsR2");
    // syncLog.consoleLog("\tsyncContentsR2 -------- containerID:"+paramsIn.containerID);
    async.each(paramsIn.r2, function(x, next)
    { 
        var syncCode= "1" + paramsIn.serverArr[x]["syncCode"]; 
        var seqNum   = paramsIn.serverArr[x]["seqNum"]; 

        var RcontentSize =  paramsIn.serverArr[x]["contentSize"]; 
        var LcontentSize =  paramsIn.localList[x]; 
 
        syncLog.consoleLog("\tsyncContentsR2 --------- X:["+ x + "], syncCode:["+syncCode + "]"); 
        // syncLog.consoleLog("\t syncContentsR2 -------- syncCode:["+ syncCode + "]");
        // syncLog.consoleLog("\t syncContentsR2 -------- RcontentSize:["+ RcontentSize + "],  LcontentSize:["+ LcontentSize + "]");
        
        var syncCodeMap = {"111":"", "121":"",};

        if ((syncCode in syncCodeMap)&&(RcontentSize == LcontentSize)) 
        { 
            next(null);
        }
        else
        { 
            var sizeChangeFlg = 0;
            if (RcontentSize != LcontentSize){
                sizeChangeFlg = 1;
                syncLog.consoleLog("\t   -------- content is changed! ");
            } 

            // syncLog.consoleLog("\t   -------- X:["+ x + "], syncCode:"+syncCode); 
            syncLog.consoleLog("\t   -------- RcontentSize:["+ RcontentSize + "],  LcontentSize:["+ LcontentSize + "]");
            syncContentFuncArr[syncCode]({
                "contentID":x, 
                "outResContent":outResContent, 
                "syncCode":syncCode, 
                "seqNum":seqNum,
                "sizeChangeFlg":sizeChangeFlg,
                // "sizeChangeFlg":sizeChangeFlg,
            }, 
            function(){
                next(null);
            });
        }

    },
    function(err)
    {
        if( err) {
            syncLog.consoleLog('syncContentsR2  failed to process'); 
        } else {
            callback();
        }
    })  
}

//一键同步所有，按照列表进行同步，放弃单个文件同步功能，见SYNC-SD.mmap
// CSyncServerHandle.prototype.syncContents = function(req, callback) 
function syncContents (req, callback) //******************************
{
    // req = {"deviceID":paramsIn.deviceID, "containerID":libT, "localList":paramsIn.clientlib[libT], "userID":paramsIn.userID,"outRes":outRes,} 
    // syncLog.consoleLog("syncContents  --------------- syncContents:"+JSON.stringify(req)); 

    var localList = req.localList;
    var delArr = new Array();
    var getArr = new Array();
    var putArr = new Array();
    var delServArr = new Array(); 
    var syncStatusChgArr = new Array(); 

    var outResContent = {
        "delArr":delArr,
        "getArr":getArr,
        "putArr":putArr,
        "delServArr":delServArr,
        "syncStatusChgArr":syncStatusChgArr,
    };

    listContentByDevID(req.userID, req.containerID, req.deviceID, function (serverArr)
    {
        async.waterfall([
            function (next){
                var res = minusArr(localList, serverArr);

                // syncLog.consoleLog("");
                // syncLog.consoleLog("syncContents ---------lib:["+req.containerID+"]--  minusArr:"+JSON.stringify(res)); 
                next(null, res);
            },
            function(res, next){ 
                syncContentsR1(res, outResContent, function(){
                    next(null, res);
                }); 
            },
            function(res, next){
                var paramsIn = {"r3":res.r3, "serverArr":serverArr, "containerID":req.containerID, "deviceID":req.deviceID, "userID":req.userID, };
                syncContentsR3(paramsIn, outResContent, function(){
                    next(null, res);
                }); 
               
            },
            function(res, next){  
                var paramsIn = {"r2":res.r2, "localList":localList, "serverArr":serverArr, "containerID":req.containerID, "deviceID":req.deviceID,  "userID":req.userID,};
                syncContentsR2(paramsIn,  outResContent, function(){
                    next(null, res);
                }); 
                
            }],
            function (error, result) 
            {
                var response = {
                    "containerID":req.containerID,
                    "getArr":outResContent.getArr, 
                    "putArr":outResContent.putArr, 
                    "delArr":outResContent.delArr, 
                    "delServ":outResContent.delServArr,
                    "syncStatusChgArr":outResContent.syncStatusChgArr,
                };

                // syncLog.consoleLog("syncContents response  -------  "+ JSON.stringify(response));
                // syncLog.consoleLog("syncContents response.containerID  -------  "+  response.containerID);
                callback(response);  
            }
    );
    });

}

function appendLib(paramsIn, callback){

    var libX = paramsIn.containerID; 
    var deviceID = paramsIn.deviceID; 
    var userID = paramsIn.userID; 

    syncLog.consoleLog("sync appendLib -----  deviceID:" +deviceID); 
    syncLog.consoleLog("sync appendLib -----  libX:" +libX); 

    paramsIn.outRes.appendLibArr.push(libX); 
    syncLog.consoleLog("sync appendLib -----  appendLibArr:" +JSON.stringify(appendLibArr));  
    
    listContentByDevID(userID, libX, deviceID, function(filesArr){
        // syncLog.consoleLog("sync appendLib -----  filesArr:"+JSON.stringify(filesArr)); 

        var files = new Array();
        for (var file in filesArr){ 
            files.push({
                "syncCode":paramsIn.syncCode,
                "contentID":file,
            });   
        }
        paramsIn.outRes.containerSync[libX] =  {"delFileArr":[],"getFileArr":files,"putFileArr":[],};  
        callback();
    });
}


var syncLibFuncArr ={
    "000":function(paramsIn, cb){
        // do nothing	本地没有，远端删除（其他设备） 
        syncLog.consoleLog("sync r3 -----  do nothing" +JSON.stringify(paramsIn.containerID));  
        cb();
    },
    "001":function(paramsIn, cb){
        // do nothing	本地没有，远端删除（本设备）  
        syncLog.consoleLog("sync r3 -----  do nothing" +JSON.stringify(paramsIn.containerID));  
        cb();
    },
    "010": function(paramsIn, cb){
        // get Arr	本地没有，远端更新（来其他设备）
        //appended in other device, now append it to this device
        paramsIn.syncCode = "010";
        appendLib(paramsIn, function(){
            cb();
        });
    },
    "011":function(paramsIn, cb){
        // 刚刚本地删除了
        //deleted in this device, now delete it from server

        var libX = paramsIn.containerID; 
        syncLog.consoleLog("sync r3 -----  removeServLibArr.push :"+ libX); 
        paramsIn.outRes.removeServLibArr.push(libX); 
        //remove lib in server is enough, files in those lib will be remove by server other function 
        cb();
    },
    "100":function(paramsIn, cb){
        // x is deleted by another 
        //deleted in other device, now delete it in this device
        var libX = paramsIn.containerID;
        paramsIn.outRes.removeLibArr.push(libX);
        syncLog.consoleLog("sync r1 -----  removeLibArr:" +JSON.stringify(paramsIn.outRes.removeLibArr));  
        cb();

    },

    "101":function(paramsIn, cb){

        //appended in this device, now append it to server
        paramsIn.syncCode = "101";
        appendServLib(paramsIn, function(){
            cb();
        });  
    },

    "110":function(paramsIn, cb){ 
        syncContents(paramsIn, function(res)
        {
            // syncLog.consoleLog("\t r2toContainerSync  -----110---- paramsIn:"+JSON.stringify(paramsIn));
            // syncLog.consoleLog("\t r2toContainerSync  -----110---- res:"+JSON.stringify(res));
            
            var x = {
                "delFileArr":res.delArr,
                "getFileArr":res.getArr,
                "putFileArr":res.putArr,
                "delServ":res.delServ,
                "syncStatusChgArr":res.syncStatusChgArr,
            } ;
            // syncLog.consoleLog("\t r2toContainerSync  110 outRes--x:"+JSON.stringify(x)); 

            paramsIn.outRes.containerSync[paramsIn.containerID] = x;

            // syncLog.consoleLog("\t r2toContainerSync  110 outRes:"+JSON.stringify(paramsIn.outRes)); 
            cb(res);
        });  
    },

    "111":function(paramsIn, cb){
        syncContents(paramsIn, function(res)
        {
            // syncLog.consoleLog("\t r2toContainerSync  -----111---- paramsIn:"+JSON.stringify(paramsIn));
            // syncLog.consoleLog("\t r2toContainerSync  -----111---- res:"+JSON.stringify(res));
            paramsIn.outRes.containerSync[paramsIn.containerID] = {
                "delFileArr":res.delArr,
                "getFileArr":res.getArr,
                "putFileArr":res.putArr,
                "delServ":res.delServ,
                "syncStatusChgArr":res.syncStatusChgArr,
            } ;
 
            // syncLog.consoleLog("\t r2toContainerSync  -----111---- outRes:"+JSON.stringify(paramsIn.outRes)); 
            cb(res);
        });  
    },
};

function appendServLib(paramsIn, callback){

    var libX = paramsIn.containerID; 
    var localList = paramsIn.localList; 

    paramsIn.outRes.appendServLibArr.push(libX); 
    syncLog.consoleLog("appendServLib --------------- appendServLibArr:" +JSON.stringify(appendServLibArr)); 

    //put files
    var files = new Array();
    for (var file in localList) {
        // files.push(file); 
        files.push({
            "syncCode":paramsIn.syncCode,
            "contentID":file,
        });   
    }
    paramsIn.outRes.containerSync[libX] =  {"delFileArr":[],"getFileArr":[],"putFileArr":files,}; 
    callback();
}

function r1toContainerSync(paramsIn, outRes, cb) { 
 
    var r1 = paramsIn.r1; 
    // syncLog.consoleLog("sync r1 -----   minusArr r1 start :"+JSON.stringify(r1)); 
    async.each(r1, function(libT, next)
    {
        appendServLib({"containerID":libT, "localList":paramsIn.clientlib[libT], outRes,}, function(){
            next();
        })
    },
    function(err)
    {
        if( err) {
            syncLog.consoleLog('sync r1  failed to process'); 
        } else {
            cb();
        }
    })

}
 
function r3toContainerSync(paramsIn, outRes, cb) { 
    var r3 = paramsIn.r3;  

    // syncLog.consoleLog("sync r3 -----   minusArr r3 start :"+JSON.stringify(r3)); 
    async.each(r3, function(libT, next3){ 
        var syncCode= "0" + paramsIn.libArr[libT]["syncCode"]; 
        // syncLog.consoleLog("r3toContainerSync -------------------syncCode:"+syncCode);
        syncLibFuncArr[syncCode]({ "deviceID":paramsIn.deviceID, "containerID":libT, "libArr":paramsIn.libArr, "userID":paramsIn.userID, "outRes":outRes, }, 
        function(){
            next3();
        });
    },
    function(err)
    {
        if( err) {
            
            syncLog.consoleLog('sync r3 -----  A file failed to process');
        } else {
            cb();
        }
    });
}

function r2toContainerSync(paramsIn, outRes, cb) {
    
    var r2 = paramsIn.r2;
    // syncLog.consoleLog("sync r2 -----  minusArr r2 start  paramsIn:"+JSON.stringify(paramsIn)); 
    async.each(r2, function(libT, next)
    {
 
        // syncLog.consoleLog("sync r2 -----  libT :"+ libT); 
        var syncCode= "1" + paramsIn.libArr[libT]["syncCode"]; 
        // syncLog.consoleLog("r2toContainerSync -------------------syncCode:"+syncCode);
        
        syncLibFuncArr[syncCode]({"deviceID":paramsIn.deviceID, "containerID":libT, "localList":paramsIn.clientlib[libT], "userID":paramsIn.userID,"outRes":outRes,}, 
        function(res){

            // syncLog.consoleLog("\t r2toContainerSync ---------------  outRes:"+JSON.stringify(outRes)); 
            next();
        }); 
    },
    function(err)
    {
        if( err ) {
            syncLog.consoleLog('sync r2 -----  A file failed to process');
        } else {
            // syncLog.consoleLog("\t r2toContainerSync   outRes:"+JSON.stringify(outRes)); 
            cb();
        }
    }) 
}

//#############################################################################################################################################

function procSyncStatusChg(paramsIn, callback){
    async.each(paramsIn.syncStatusChgArr, function(contentID, nextpp)
    {  
        var params = {  
            userID:paramsIn.userID, 
            deviceID:paramsIn.deviceID,
            containerID:paramsIn.containerID, 
            contentID:contentID.contentID, 
            contentSize:0,
            upindex:1,   
            syncCode:contentID.syncCode,  
        };
        FileIndex.upFileIndexExpress(params, function(){
            // response.SyncStatusChgArrProceed = SyncStatusChgArrProceed;
            nextpp(null, null);
        });  

    }, 
    function(err) {
        if( err ) {
            //   syncLog.consoleLog('A file failed to process');
        } else {
            callback();
        }
    })
} 

function procDelServArr(paramsIn, callback){

    async.each(paramsIn.delServ, function(delServCID, nextp)
    {
        // "delServ":res.delServArr,
        var params = {
            userID:paramsIn.userID, 
            deviceID:paramsIn.deviceID,
            containerID:paramsIn.containerID,
            contentID:delServCID.contentID,  
            contentSize:0,
            upindex:1,  
            syncCode:delServCID.syncCode,  
        }
        delServFileArr(params, function(){ 
            nextp(null, null);
        }); 
    }, 
    function(err) {
        if( err ) {
            //   syncLog.consoleLog('A file failed to process');
        } else {
            // syncLog.consoleLog("\t  delServ is over ....");
            callback();
        }
    })
}
function delServFileArr(paramsIn, callback)
{
    // syncLog.consoleLog("\t procDelServArr   paramsIn:"+JSON.stringify(paramsIn)); 
    var delfile = syncUtil.getServerFileName(paramsIn.userID, paramsIn.containerID, paramsIn.contentID);

    delservFile(delfile, function(res){
        // syncLog.consoleLog(res);   
        if (res.err){

        }else{
            FileIndex.upFileIndexExpress(paramsIn, function(){  
                callback();
            });
        }
    }); 
}  

function delservFile(file, callback)
{  
    if (fs.existsSync(file) == false){
        syncLog.consoleLog("\t delservFile file is not exist file:" + file); 
        callback({msg:"file is not exist"});
    }else{
        lfs.delFile(file, function(res){
            // syncLog.consoleLog(res);
            syncLog.consoleLog("\t delservFile " + res.message+", file:[" + res.fileName +"]" );
            callback(res);
        })
    } 

} 


//-----------------------------------------------------------------------------------------------------------
function CSyncServerHandle ()
{  
    this.containerArr = {};
}
 
CSyncServerHandle.prototype.init = function () 
{ 
} 
//一键同步所有，按照列表进行同步，放弃单个文件同步功能，见SYNC-SD.mmap
CSyncServerHandle.prototype.sync = function(req, callback)  
{ 
    // syncLog.consoleLog("CSyncServerHandle.sync req:"+JSON.stringify(req)+"");
    syncLog.consoleLog("-----------------------------------------------------------------------------");  


    var outRes = {
        "containerSync":containerSync,
        "removeLibArr":removeLibArr,
        "appendLibArr":appendLibArr,
        "removeServLibArr":removeServLibArr,
        "appendServLibArr":appendServLibArr,
    };

    var containerArr = req.containerArr;
    var clientlib = req.container;
    var userID = req.userID;
    
    // syncLog.consoleLog("CSyncServerHandle.sync clientlib:"+JSON.stringify(clientlib)+"");
    listlib(req.userID, req.deviceID, function(libArr)
    {
        async.waterfall([
            function (next){
                var res = minusArr(clientlib, libArr);
                syncLog.consoleLog("sync  --------------------  minusArr:"+JSON.stringify(res));  
                next(null, res);
            },
            function(res, next){
                var paramsIn = {"r1":res.r1, "clientlib":clientlib,};
                r1toContainerSync(paramsIn, outRes, function(){
                    // syncLog.consoleLog("\t r1toContainerSync   outRes:"+JSON.stringify(outRes)); 
                    next(null, res);
                }); 
            },
            function(res, next){ 

                var paramsIn = {"r3":res.r3, "libArr":libArr, "deviceID":req.deviceID, "userID":userID,};
                r3toContainerSync(paramsIn, outRes, function(){
                    // syncLog.consoleLog("\t r3toContainerSync   outRes:"+JSON.stringify(outRes)); 
                    next(null, res);
                }) ;
            },
            function(res, next){ 
                var paramsIn = {"r2":res.r2, "clientlib":clientlib, "libArr":libArr, "deviceID":req.deviceID, "userID":userID,};
                r2toContainerSync(paramsIn, outRes, function(){
                    // syncLog.consoleLog("\t r2toContainerSync   outRes:"+JSON.stringify(outRes)); 
                    next(null, res);
                }); 
            }],
            function (error, result) 
            {
                var syncTime = syncLog.nowTime;
                var response = { 
                    "syncstatus":"A", 
                    "syncTime":syncTime,
                    "deviceID":req.deviceID, 
                    "removeLibArr":outRes.removeLibArr,
                    "appendLibArr":outRes.appendLibArr,
                    "removeServLibArr":outRes.removeServLibArr,
                    "appendServLibArr":outRes.appendServLibArr,
                    "containerSync":outRes.containerSync,
                    "userID":userID, 
                };

                syncLog.consoleLog(" ");
                syncLog.consoleLog("**************************************************************************************************");
                syncLog.consoleLog("\tsync final result:"); 
                showsyncFinishedStatus(response.containerSync) 
                syncLog.consoleLog("**************************************************************************************************");

                callback(response);

                var syncLastProcParam = {
                    "containerArr":containerArr,
                    "outRes":outRes,
                    "deviceID":req.deviceID,
                    "userID":userID,

                };
                syncLastJobProc(syncLastProcParam, function(){

                    syncLog.consoleLog(" "); 
                    syncLog.consoleLog("sync syncLastProc: delServArr and syncStatusChgArr is finished..."); 
                    syncLog.consoleLog("**************************************************************************************************"); 
                    
                    syncLog.consoleLog(" ");  
                    syncLog.consoleLog("< ==================================================================================================== >"); 
                    syncLog.consoleLog(" sync task is accomplished... ");  
                    syncLog.consoleLog("< ==================================================================================================== >");  
                    syncLog.consoleLog(" ");  
                    
                });
                
            }
        );
    });
} 
function syncLastJobProc(paramsIn, callback){
    var outRes = paramsIn.outRes;
    async.waterfall([
        function (next){

            // "appendServLibArr":appendServLibArr,
            var params1 = {
                userID:paramsIn.userID,
                appendServLibArr:outRes.appendServLibArr, 
                containerArr:paramsIn.containerArr, 
                deviceID:paramsIn.deviceID,
            };

            appendServLibs(params1, function(containerArrP){

                // response.containerArr = containerArrP;
                next(null, null);
            });
        },
        function (req, next){
            // "removeServLibArr":removeServLibArr,
            var params2 = {
                userID:paramsIn.userID,
                removeServLibArr:outRes.removeServLibArr,  
                containerArr:paramsIn.containerArr, 
            };
            removeServLibs(params2, function(containerArrP){
                // response.containerArr = containerArrP;
                next(null, null);
            }); 

        }, 
        function (reql, next){
            // syncLog.consoleLog("********************* procDelServArr&syncStatusChgArr ********************************************");
            // "delServ":res.delServArr,
            // "syncStatusChgArr":res.syncStatusChgArr,
            async.eachOf(outRes.containerSync, function (libX, key, callbackF){  
                async.waterfall([
                    function (nextX){  
                        if (libX.delServ === undefined){
                            nextX(null, null);
                        }else{
                            // syncLog.consoleLog("\tprocDelServArr  async.eachOf key:["+key+"], libX.delServ:"+JSON.stringify(libX.delServ)); 
                            procDelServArr(
                                {
                                    delServ:libX.delServ,
                                    userID:paramsIn.userID,
                                    deviceID:paramsIn.deviceID, 
                                    containerID:key, 
                                },
                                function(){
                                    // response.DelServArrProceed = DelServArrProceed;
                                    // syncLog.consoleLog("\t  delServ is over ....");
                                    nextX(null, null);
                                }
                            )
                        } 
                    },
                    function (reql, nextX){
                        
                        if (libX.syncStatusChgArr === undefined){
                            nextX(null, null);
                        }else{
                            // syncLog.consoleLog("\t  procSyncStatusChg paramsIn:[" + JSON.stringify(libX.syncStatusChgArr) +"]"); 
                            procSyncStatusChg(
                                {
                                    syncStatusChgArr:libX.syncStatusChgArr,
                                    userID:paramsIn.userID,
                                    deviceID:paramsIn.deviceID, 
                                    containerID:key, 
                                },
                                function(){ 
                                    // response.SyncStatusChgArrProceed = SyncStatusChgArrProceed;
                                    // syncLog.consoleLog("\t  procSyncStatusChg is over ....");
                                    nextX(null, null);
                                }
                            ) 
                        }
                    }],
                    function (error, result) 
                    {
                        callbackF();
                    }
                ); 
            },
            function (error, result) 
            {
                next(null, null);
            })
        }],
        function (error, result) 
        {
            // syncLog.consoleLog(" "); 
            // syncLog.consoleLog("\tsync syncLastProc is successfully"); 
            callback();
             
        }
    );
}
 
function showsyncFinishedStatus(sr)
{

    // syncLog.consoleLog(" showsyncFinishedStatus ----------- sr : "+ JSON.stringify(sr)); 
    for (var container in sr){

        syncLog.consoleLog("\tcontainer:["+ container+"]"); 
        var taskContainer = sr[container];

        syncLog.consoleLog("\t\tputFileArr length:["+ taskContainer.putFileArr.length+"]");  
        syncLog.consoleLog("\t\tgetFileArr length:["+ taskContainer.getFileArr.length+"]");  
    }
} 
 
module.exports=CSyncServerHandle; 
