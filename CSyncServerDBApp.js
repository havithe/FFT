
const syncLog    = require("./CSyncLog.js");  

const syncDB = require('./CSyncDB.js');  
syncDB.init(function() { });


//#############################################################################################################################################

//#############################################################################################################################################

function getDBContainerArr(userID, callback)
{

	var strSql = "select CONTAINER, PATH from T_APP_CONTAINER where  STATUS= 'A' and USERID = '" + userID +"'";
	// syncLog.consoleLog('\t\t\t  getDBContainerArr  strSql - ['+strSql+']');
	syncDB.execSelectSql(strSql, function(rows){
		var containerArr = {};
		for(var i in rows)
		{
			var containerID = rows[i].CONTAINER;
			containerArr[containerID] = rows[i].PATH;
		}   
		callback(containerArr);
	});
};


function recDevice(param, callback){

	var strSql = "select USERID, DEVICEID  from T_APP_DEVICE_INFO where  STATUS= 'A' and USERID = '" + param.userID +"'";
    strSql = strSql + " and DEVICEID = '" + param.deviceID + "'"; 

	// syncLog.consoleLog('\t\t\t  recDevice  strSql - ['+strSql+']');
	syncDB.execSelectSql(strSql, function(rows){

        if (rows.length == 0)
        {   
            var strInsSql = "insert into T_APP_DEVICE_INFO(USERID, DEVICEID, SEQ, SEQ_NUM, STATUS)"
            strInsSql = strInsSql + " select '"+ param.userID +"', '"+ param.deviceID + "', T1.seq,T2.seq_num, 'A'";
            strInsSql = strInsSql + " from ";
            strInsSql = strInsSql + " (select ifnull(max(seq), 0) + 1 as seq from T_APP_DEVICE_INFO where USERID='" + param.userID + "') T1, "; 
            strInsSql = strInsSql + " T_PUB_DEVICE_SEQ T2 ";
            strInsSql = strInsSql + " where T1.seq = T2.seq ";   

            // syncLog.consoleLog('\t\t recDevice strInsSql:['+ strInsSql +']'); 

            syncDB.execUpSql(strInsSql,  function(rows){ 
                // var traceinfo = 'sync index info will be appended ----------- ';
                // syncLog.consoleLog('\t\t'+traceinfo + '  affectedRows:', rows.affectedRows);  
                callback();
            }) 
        }else{   
            // syncLog.consoleLog('\t\t recDevice strSql:['+ strSql +'], is not  0 rowS'); 
            // syncLog.consoleLog('\t\t recDevice strSql rows:['+ JSON.stringify(rows) +'] '); 
            callback();

        } 
	});
}


function recDeviceRe(param, callback)
{
    var strSql =  " select T1.seq, T2.seq_num";
    strSql = strSql + " from ";
    strSql = strSql + " (select ifnull(max(seq), 0) + 1 as seq from T_APP_DEVICE_INFO where USERID='" + param.userID + "') T1, "; 
    strSql = strSql + " T_PUB_DEVICE_SEQ T2 ";
    strSql = strSql + " where T1.seq = T2.seq ";   

	// syncLog.consoleLog('\t\t\t  recDevice  strSql - ['+strSql+']');
	syncDB.execSelectSql(strSql, function(rows){
        var SEQ = rows[0][0];
        var SEQ_NUM = rows[0][1];

        var strInsSql = "insert into T_APP_DEVICE_INFO(USERID, DEVICEID, SEQ, SEQ_NUM, STATUS)"
        strInsSql = strInsSql + " values('"+ param.userID +"', '"+ param.deviceID + "', "+ SEQ + "," + SEQ_NUM + ", 'A')";

        // syncLog.consoleLog('\t\t recDevice strInsSql:['+ strInsSql +']'); 

        syncDB.execUpSql(strInsSql,  function(rows){ 
            callback(SEQ_NUM);
        }) 
	});
}

function getDeviceSeqNum(userID, deviceID, callback)
{
    var strSql = "select SEQ_NUM from T_APP_DEVICE_INFO "; 
    strSql = strSql + " where  STATUS= 'A' and DEVICEID = '" +  deviceID + "' and USERID='" + userID + "'"; 
    // syncLog.consoleLog('\t\t\t upFileIndexExpress select  strSql - ['+strSql+']');

    syncDB.execSelectSql(strSql, function(rows){
        var SEQ_NUM = 0;
        if (rows.length == 0){  
            recDeviceRe({"userID":userID,  "deviceID":deviceID, }, function (SEQ_NUMX){
                callback(SEQ_NUMX); 
            });
        } 
        else
        {  
            var r = rows[0];
            callback(r["SEQ_NUM"]); 
        }  
    })
}

var syncServerDBApp = {
    "getDBContainerArr":getDBContainerArr, 
    "recDevice":recDevice, 
    "getDeviceSeqNum":getDeviceSeqNum,
};


module.exports = syncServerDBApp;
