// const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');

//Change testProj to database name you want to use
const url = 'mongodb://localhost:27017/testProj';

const dbName = 'testProj';

module.exports = {

	connectToServer: function(){
		return new Promise((resolve, reject) => {
			resolve(mongoose.connect(url, {useNewUrlParser: true}).then(
				() => { console.log("\nConnection successful---------\n"); },
				err => { console.log("\nFailed to connect.  Err: " + err); }

			));
		});
	},

	closeConnection: function(){
		mongoose.connection.close();
		console.log('\nConnection closed successfully\n');
	}

};
