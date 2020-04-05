 
const mysql  = require('mysql');  

var CSyncDB = {
	init:function(callback)
	{
		this.host      = "182.92.10.163";    
		this.user      = "root";    
		this.password  = "root";   
		this.port      = "3306";    
		this.database  = "FFT";  

		this.connection = mysql.createConnection({     
		  host     : this.host,       
		  user     : this.user,              
		  password : this.password,       
		  port: this.port,                   
		  database: this.database, 
		}); 
		this.connection.connect(); 

		callback();
	}, 
 

	execSelectSql:function(sqlStr, callback)
	{   

		// console.log('\t\t sqlStr - ['+sqlStr+']');
		this.connection.query(sqlStr, function (err, rows, fields) {
			if(err){
				console.log('[sql ERROR] - ',err.message);
				return;
			} 
			callback(rows);
		});
	},
	execUpSql:function(sqlStr, callback)
	{   

		// console.log('\t\t sqlStr - ['+sqlStr+']');
		this.connection.query(sqlStr, function (err, result) {
			if(err){
				console.log('[sql ERROR] - ',err.message);
				return;
			} 
			callback(result.affectedRows);
		});
		 
	},
	execUpSqlParams:function(sqlStr, params, callback)
	{   

		// console.log('\t\t sqlStr - ['+sqlStr+']');
		this.connection.query(sqlStr, params, function (err, result) {
			if(err){
				console.log('[sql ERROR] - ',err.message);
				return;
			} 
			callback(result.affectedRows);
		});
		 
	},
	
} 

module.exports=CSyncDB;
