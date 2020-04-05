
 
const syncLog    = require("./CSyncLog.js");  

const fs = require('fs'); 

var CLocalFs = {  
	lsFs:function(path, callback)  
	{
		fs.readdir(path, function (err, files) 
		{
			var response = {
				path:path,
				status:"success"
			}; 

			if (err) 
			{
				console.log("lsFs ----- readdir failed ");
				response.Status = "failed";	
				response.Info = "failed to list file[" + path + "]\n";  
			}
			else
			{   
				folderArr = new Array();
				filesArr = new Array();

				for (var x in files){

					// console.log(files[x]);
					var stat = fs.lstatSync(path+"/"+files[x]);
					if (stat.isDirectory()){ 

						folderArr.push(files[x]);
					}
					else
					{
						filesArr.push(files[x]);
					}

				}

				response.folderArr = folderArr;
				response.filesArr = filesArr;
				response.info = "success in list files of -" + path + "- ";  
			}
			callback(JSON.stringify(response));
			// callback(response);
		});
	},
	readFile:function(file, callback)  
	{

		fs.readFile(file,  function(err, data){
			if (err) throw err;
			callback(data);
		}); 
	},
	delFile:function(file, callback)  {

		fs.unlink(file, function (err) {
            var response = {
                message:'File delete successfully', 
                fileName:file ,
            };

			if (err) 
			{ 
                var message = 'failed to delete file: [' + file + ']';
                syncLog.consoleLog(message);
                response.message = message;
                response.err = err;
			} 
            // callback(JSON.stringify(response));
            callback(response);
		}) 
	}
}

module.exports=CLocalFs;
