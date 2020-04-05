

const syncLog    = require("./CSyncLog.js");  

const syncServerDBApp = require("./CSyncServerDBApp.js");

var async = require("async");
var syncDB = require('./CSyncDB.js');  
syncDB.init(function() {  }); 
//#############################################################################################################################################

//#############################################################################################################################################



var FileIndex = {
    FileIndexArr:{ }, 
    upFileIndexExpress:function (syncParam, callback)
    {
        var syncCodeMap = {
            '000': 'DD', 
            '001': 'DD', 
            '010': 'R', 
            '011': 'D', 
            '021': 'D', 
            '031': 'DD', 
            '020': 'R', 
            '030': 'DD', 
            '100': 'DD', 
            '101': 'A', 
            '110': 'R', 
            '111': 'A', 
            // '120': 'R', 
            '121': 'A', 
            // '130': 'DD', 
            '131': 'A', 
        }; 
 
        var syncCodeSeqnumMap = {
            '120': {"0":"A", "1":"R", },  
            '130': {"0":"A", "1":"DD", }, 
        };

        var SEQ_NUM = 2;
        var STATUS  = syncCodeMap[syncParam.syncCode];

        // syncLog.consoleLog("\t\t\t  upFileIndexExpress syncCode:["+syncParam.syncCode+"]");

        async.waterfall([
            function (next){
                // syncLog.consoleLog('');

                syncServerDBApp.getDeviceSeqNum(syncParam.userID, syncParam.deviceID, function(SEQ_NUMX)
                { 
                    SEQ_NUM = SEQ_NUMX; 
                    
                    var strSql = "select T1.SEQ_NUM as T1SEQ_NUM, T2.SEQ_NUM as T2SEQ_NUM, mod(T1.SEQ_NUM, T2.SEQ_NUM) as modSEQ_NUM ";
                    strSql = strSql + " from T_APP_SYNC T1 , T_APP_DEVICE_INFO T2 ";
                    strSql = strSql + " where T1.UPINDEX = 1 and  T1.userid = '" + syncParam.userID + "'";
                    // strSql = strSql + " and T1.DEVICEID = '" + syncParam.deviceID + "'";
                    strSql = strSql + " and T2.userid = '" + syncParam.userID + "'";
                    strSql = strSql + " and T2.DEVICEID = '" + syncParam.deviceID + "'";
                    strSql = strSql + " and containerID = '" + syncParam.containerID + "'";
                    strSql = strSql + " and CONTENTID = '"+ syncParam.contentID + "'";

                    // syncLog.consoleLog('\t\t\t upFileIndexExpress select  strSql - ['+strSql+']');
                    syncDB.execSelectSql(strSql, function(rows)
                    {
                        if (rows.length === 0)
                        {   
                            // syncLog.consoleLog('\t\t\t  upFileIndexExpress  select sql  rows.length == 0 ');
                            SEQ_NUM = SEQ_NUMX;
                        } 
                        else
                        {  
                            r = rows[0];

                            var f = function (x, seqNum, seqNumx){
                                var statusMap = {"A":1, "D":1,};
                                // syncLog.consoleLog("\t\t\t  f  STATUS:["+ x +"]");

                                return (x in statusMap) ? seqNumx:seqNum; 
                            }

                            var statusSeqfuncs = {
                                "00":function () {
                                    STATUS  = syncCodeMap[syncParam.syncCode];
                                    SEQ_NUM = f(STATUS, r["T1SEQ_NUM"], SEQ_NUMX);
                                },
                                "01":function () {
                                    STATUS  = syncCodeSeqnumMap[syncParam.syncCode]['0'];
                                    SEQ_NUM = f(STATUS, r["T1SEQ_NUM"], SEQ_NUMX); 
                                },
                                "10":function () {
                                    STATUS  = syncCodeMap[syncParam.syncCode];
                                    SEQ_NUM = f(STATUS, r["T1SEQ_NUM"] * r["T2SEQ_NUM"], SEQ_NUMX); 
                                    
                                },
                                "11":function () {
                                    STATUS  = syncCodeSeqnumMap[syncParam.syncCode]['1'];
                                    SEQ_NUM = f(STATUS, r["T1SEQ_NUM"] * r["T2SEQ_NUM"], SEQ_NUMX); 

                                }
                            };
                            
                            var bit1  = (r["modSEQ_NUM"] === 0) ? '0':'1';
                            var bit2  = (syncParam.syncCode in syncCodeSeqnumMap) ? '1':'0'; 
                            var bCode = bit1 + bit2;
                            // syncLog.consoleLog("\t\t\t  upFileIndexExpress modSEQ_NUM:["+r["modSEQ_NUM"]+"]");

                            // syncLog.consoleLog("\t\t\t  upFileIndexExpress bit1:["+bit1+"]");
                            // syncLog.consoleLog("\t\t\t  upFileIndexExpress bit2:["+bit2+"]");
                            // syncLog.consoleLog("\t\t\t  upFileIndexExpress bCode:["+bCode+"]");

                            statusSeqfuncs[bCode]();

                            // if (r["modSEQ_NUM"] === 0)
                            // {
                            //     SEQ_NUM = r["T1SEQ_NUM"];
                            //     if (syncParam.syncCode in syncCodeSeqnumMap){
                            //         STATUS = syncCodeSeqnumMap[syncParam.syncCode][0];
                            //     }
                            // }
                            // else
                            // {
                            //     SEQ_NUM = r["T1SEQ_NUM"] * r["T2SEQ_NUM"];   
                            //     if (syncParam.syncCode in syncCodeSeqnumMap){ 
                            //         STATUS = syncCodeSeqnumMap[syncParam.syncCode][1];
                            //     }
                            // }

                        }

                        var x =  {"SEQ_NUM":SEQ_NUM, "STATUS":STATUS, }; 
                        // syncLog.consoleLog("\t\t\t  upFileIndexExpress SEQ_NUMx:["+JSON.stringify(x)+"]");
                        next(null, x); 
                    })  
                });
            },
            function(req, next){
                var strUpSql = "update T_APP_SYNC set upindex = upindex-1"
                strUpSql = strUpSql + " where contentID = '"+ syncParam.contentID+"'"; 
                strUpSql = strUpSql + " and containerID = '"+ syncParam.containerID+"'"; 
                strUpSql = strUpSql + " and userID = '"+ syncParam.userID + "'"; 
                
                // syncLog.consoleLog('\t\t\t  upFileIndexExpress strUpSql:['+ strUpSql +']'); 

                syncDB.execUpSql(strUpSql, function(rows){ 
                    var traceinfo = 'sync index updated ';
                    // syncLog.consoleLog('\t\t '+traceinfo + '  affectedRows:', rows.affectedRows);
                    next(null, req);
                });
            },
            function(req, next){
                var strDelSql = "delete from T_APP_SYNC where deviceID = ? and containerID = ? and contentID = ? and USERID = ?";
                var params1 = [syncParam.deviceID, syncParam.containerID, syncParam.contentID, syncParam.userID];
        
                // syncLog.consoleLog('\t\t upFileIndexExpress strDelSql:['+ strDelSql +']'); 

                syncDB.execUpSqlParams(strDelSql, params1, function(rows){
                    // var traceinfo = 'sync index deleted ';
                    // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows);
                    next(null, req);
                })
            },
            function(req, next){
                
                var strSql = "insert into T_APP_SYNC(CONTENTID, CONTAINERID, DEVICEID, CONTENTSIZE, UPINDEX, SEQ_NUM, STATUS, USERID) "
                strSql = strSql + " select '"+ syncParam.contentID +"', '"+ syncParam.containerID + "', '" + syncParam.deviceID+"', "+syncParam.contentSize+", 1,";
                strSql = strSql + req.SEQ_NUM+", '"+req.STATUS+"', '"+syncParam.userID +"'";
                strSql = strSql + " from T_APP_DEVICE_INFO T2 ";
                strSql = strSql + " where T2.DEVICEID = '"+ syncParam.deviceID +"'";  

                // syncLog.consoleLog('\t\t upFileIndexExpress strSql:['+ strSql +']'); 
                // syncLog.consoleLog('\t\t upFileIndexExpress contentID:['+ syncParam.contentID +'] status is setted: ['+ syncCodeMap[syncParam.syncCode] +'],  by deviceID:[' +syncParam.deviceID +"]");
                syncDB.execUpSql(strSql,  function(rows){ 
                    // var traceinfo = 'sync index info will be appended ----------- ';
                    // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows); 
                    next(null, rows);
                })
            }],
            function (error, result) 
            {
                callback();
            }
        );
    }
}

//#############################################################################################################################################

//#############################################################################################################################################



module.exports = FileIndex;
