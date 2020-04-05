const syncLog         = require("./CSyncLog.js"); 

var async = require("async");
const crypto = require('crypto');
const fs  = require('fs'); 

var fs_root = "/opt/FFTS/fileLib";

function md5(str) {
　　var ret = crypto.createHash('md5').update(str.toString()).digest("hex");
　　return ret;
}


function makeDirS(dir, callback) 
{
	var res = {};

	if (fs.existsSync(dir) == true){ 

        res.dir =  dir; 
        res.msg = 'makeDirS, path is existed! dir ' + dir; 
	}else{
        try{
            syncLog.consoleLog('\t\t\tmakeDirS  dir:[' + dir + "]");
            fs.mkdirSync(dir);
        }
        catch(err) { 
            res.err = err;
        }
    }
    // syncLog.consoleLog(res);
    callback(res);

}

function getServerContainerRoot (userID, containerID) 
{
	return fs_root + "/" + md5(userID)  + "/" + containerID;

}


function makeSContentIDPath (containerRoot, contentID, callback) 
{
	var paths = contentID.split('/');
	paths.pop();

	var spath = "";
 
	async.eachSeries(paths, function(pathT, nextT)
	{
		if (pathT == ""){
        	nextT(null); 
		} else{
			spath = spath  + "/" + pathT;
			var path = containerRoot + spath;   
            syncLog.consoleLog('makeSContentIDPath path:'+path);

            makeDirS(path, function(res)
            {
                if (res.err){
                    nextT(res); 
                }
                else
                {
                    nextT(null); 
                }
			});  
		} 
	},
	function(err)
    {
        if (err){
            callback(err); 
        } else{
            callback({});
        }
    })
}
function  makePath (containerRoot, contentID, callback) 
{
    async.waterfall([
        function (next){ 
            makeDirS(containerRoot, function(res){
                if (res.err){
                    next({"err":res.err, "subDir":path}, null); 
                }
                else
                {
                    next(null, null); 
                }
            });   
        },
        function (req, next){ 
            makeSContentIDPath(containerRoot, contentID, function(res){
                if (res.err){
                    next({"err":res.err,}, null); 
                }
                else
                {
                    next(null, null); 
                }
            });
        }], 
        function(err)
        {  
            callback(err);
        }
    ) 
}
    
var CSyncUtil = {    
 
    getServerContainerRoot: function  (userID, containerID) 
    {
        return fs_root + "/" + md5(userID)  + "/" + containerID;

    },
	getFileType:function( contentID )  
	{
		var fileExt = contentID.substring(contentID.lastIndexOf('.')+1);
		fileExt = fileExt.toLowerCase();
		// syncLog.consoleLog("fileExt:"+fileExt);
		var fileTypArr={
			"jpg":"pic",
			"png":"pic",
			"jpeg":"pic",
			"gif":"pic",
			// "mmap":"pic",
			"txt":"txt",
			"sql":"txt",
			"js":"txt",
			"css":"txt",
			"htm":"txt",
			"html":"txt",
        }
        
        if (!fileTypArr[fileExt]){
            return "N";
        }

		return fileTypArr[fileExt];
	},
 
	getFileName:function(containerRoot, contentID) 
	{
		return containerRoot + "/" + contentID;
	},

	getServerFileName:function(userID, containerID, contentID) 
	{
        var root = fs_root + "/" + md5(userID)  + "/" + containerID; 
		return root + "/" + contentID;
	},

	makeDir:function(dir, callback) 
	{
		makeDirS(dir, function(res)
        {
            if (res.err){
                callback({"err":res.err, "subDir":path}); 
            } 
        });  
	},
	makePath:makePath,
	makeServPath:function(userID, containerID, contentID, callback) 
	{
		var containerRoot = getServerContainerRoot(userID, containerID);
        async.waterfall([
            function (next){
				var userRoot = fs_root + "/" + md5(userID);
				// syncLog.consoleLog('makeServPath  userRoot:' + userRoot);

				makeDirS(userRoot, function(res){
                    if (res.err){
                        // syncLog.consoleLog('\t makeServPath userRoot makeDirS err:' + err);
                        next({"err":res.err, "subDir":userRoot}, null); 
                    }  
                    else
                    {
                        next(null, null); 
                    }
				});

            },
            function(req, next){

				makeDirS(containerRoot, function(res){
                    if (res.err){
                        // syncLog.consoleLog('\t makeServPath userRoot makeDirS err:' + err);
                        next({"err":res.err, "subDir":containerRoot}, err); 
                    }  
                    else
                    {
                        next(null, null); 
                    }
				});
            },
            function(req, next){

				makeSContentIDPath(containerRoot, contentID, function(res){
                    if (res.err){
                        next({"err":res.err,}, null); 
                    }
                    else
                    {
                        next(null, null); 
                    } 
				});

            }],
            function (error, result) 
            {
            	if( error ) { 
		            syncLog.consoleLog('makeServPath failed:'+ error);
		        	callback(error);
		        } else { 
		        	callback(); 
		        }
            }
        ); 
    },
    isFolder:function (path, cb1, cb2) 
	{
		// syncLog.consoleLog(' isFolder path:'+ path);
		fs.stat(path, function(err, stats)
        {
            if(err){
                    syncLog.consoleLog(' isFolder err:'+ err);

            }else{
                if (stats.isDirectory())
    			{
    				cb1();
    			}else{

    				cb2();
    			}
    
            }

		}) 

	}
	 
}
 

module.exports = CSyncUtil;

