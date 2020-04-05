
 


function nowTime(logString) 
{
    function add_10(num) {
        if (num < 10) {
            num = '0' + num
        }
        return num;
    } 

    var myDate = new Date();
    var nowTime = myDate.getFullYear() + '-' + add_10(myDate.getMonth()) + '-' + myDate.getDate() + ' ' 
                    + add_10(myDate.getHours()) + ':' + add_10(myDate.getMinutes()) + ':' + add_10(myDate.getSeconds());

    return nowTime;
}

function consoleLog(logString) 
{
    // function add_10(num) {
    //     if (num < 10) {
    //         num = '0' + num
    //     }
    //     return num;
    // } 

    // var myDate = new Date();
    // var nowTime = myDate.getFullYear() + '-' + add_10(myDate.getMonth()) + '-' + myDate.getDate() + ' ' 
    //                 + add_10(myDate.getHours()) + ':' + add_10(myDate.getMinutes()) + ':' + add_10(myDate.getSeconds());

    console.log('[' + nowTime() + '] ' + logString); 
}

//#############################################################################################################################################

//#############################################################################################################################################

var CSyncLog = {
    "consoleLog":consoleLog,  
    "nowTime":nowTime,
};

module.exports = CSyncLog;
