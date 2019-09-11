const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const mongoConnect = require('./dbConnect');
const d3Chart = require('./d3Visuals');
const AuditEvent = require('./models/auditevent');

//Full cmd below:
//Running on single machine if ip and user/pass are known:
//const cmd = 'meshcmd AmtAuditLog --host ipAddress --user admin --pass P@ssw0rd --tls --uuidoutput'

//Running using a software distribution platform(i.e. SCCM) to deliver .exe and cmd to remote machine
// const cmd = 'meshcmd.exe AmtAuditLog --uuidoutput --json';

// const meshcmdPath = 'C:/Your/File/Path';

//Parse parameter input from command line for audit log folder path
let args = process.argv.slice(2);
const auditLogFilesPath = args[0];

//Queries for output
let sessionQuery = [
	{'$match': { event : 'KVM Session Started',
				 kvmSessionTimeMs: {'$gte': 120000}
}},
	{'$group': {
		_id: '$deviceName',
		avgKVM: { $avg : '$kvmSessionTimeMs'},
		count: { $sum : 1}}},
	{'$sort': {count: -1}}
];

let countQuery = [
	{'$match': {'event' : 
		{'$in' : ['KVM Session Started', 'Performed Power Down', 
					'Performed Power Up', 'Performed Reset', 
					'SoL Session Opened']}}
					// ,{'kvmSessionTimeMs' : {$gte: 60000}}
	},
	{'$group': {
		_id: '$event', 
		count: {$sum: 1}}
	}
];

let findInvalidQuery = {event : 'ACL Access with Invalid Credentials'};

run();

async function run(){
	
	//Example code for running from single local machine when IP Address are known
	//Otherwise, a platform such as SCCM and a batch file are required
	// try{

	// 	const {stdout, stderr } = await exec(cmd, {cwd: meshcmdPath});
	// 	console.log(stdout);
	// 	// console.log(stderr);
	// }
	// //Currently always throws Command Failed error but still produces correct output
	// catch (error){
	// 	//Error contains stdout info
	// 	console.log(error.stdout);
	// }
	
	//Flow for reading/saving files and creating visuals. This is all that is
	//needed if files are in a central location
	try{

		//Connect to database
		await mongoConnect.connectToServer();

		//Read files and store trimmed data in an array
		let dataArray = await readAllFiles(auditLogFilesPath);

		//Insert array data into database
		await insertDocuments(dataArray);
		
		//Define fields to return from Event Group By query
		// let fieldsArr = ['KVM Session Started', 'Performed Power Down', 
		// 					'Performed Power Up', 'Performed Reset', 
		// 					'SoL Session Opened'];

		//Query db to find event counts
		let countResult = await queryAggregate(countQuery);

		//Convert to format D3 can use for charting
		let chartDataArr = convertToKeyValue(countResult);

		console.log('\n' + 'Totals Check:');
		console.log(chartDataArr);

		let sessionTimeResult = await queryAggregate(sessionQuery);

		//Put printable data into an array for d3 because d3 will not all
		//creation of tables within a svg
		let kvmSessionArr = ['Average KVM Session Times by Device', '', '', 'Device Name', 'Average Session', 'Times Accessed'];
		let sesHeightCount = 80;
		sessionTimeResult.forEach(function(obj){
			kvmSessionArr.push(obj._id);
			kvmSessionArr.push(convertToHrs(Math.floor(obj.avgKVM)));
			kvmSessionArr.push(obj.count);
			sesHeightCount += 40;
		});

		let findInvResult = await queryFind(findInvalidQuery);


		let invalidAccessArr = ['Unauthorized Access Attempts', '', '', 'User', 'Device Name', 'Local Time'];
		let invHeightCount = 40;
		findInvResult.forEach(function(obj){
			invalidAccessArr.push(obj.user);
			invalidAccessArr.push(obj.deviceName);
			invalidAccessArr.push(convertUTCDateToLocalDate(obj.time));
			invHeightCount += 40;
		});

		//Create graphics and save to file
		d3Chart.createPieChart(chartDataArr)
			.then(d3Chart.createText(kvmSessionArr, 3, 450, sesHeightCount))
			.then(d3Chart.createText(invalidAccessArr, 3, 775, invHeightCount))
			.then( () => { mongoConnect.closeConnection(); } ); //Close
	}
	catch(error){
		console.log(error)
;	}
}

//Read files to an array while cleaning data
function readAllFiles(path){
	return new Promise((resolve, reject) => {
		
		let parsedArray = [];
		console.log('Start Reading--------');

		//Loop through files in path
		fs.readdirSync(path).forEach(file => {

			process.stdout.write('Starting ' + file + ' Load --------------');
			
			//Convert JSON to readable format
			let content = JSON.parse(fs.readFileSync(path + file));

			//Filter data coming into db
			content.auditevents.forEach(function(auditLogEvent, index){
				//Prevent record entry, no value add from Set Boot Options event
				let counter = 1;

				switch (auditLogEvent.Event){
					//Find time spent in KVM
					case 'KVM Session Started':
						while(counter <= 15){
							if(counter === 15 || (index + counter) > content.auditevents.length ){
								reject(console.log('No closing KVM Session Time found'));
								return;
							}
							 if(content.auditevents[index + counter].Event == 'KVM Session Ended'){
								// console.log(auditLogEvent.Time)
								let timeSpent = new Date(content.auditevents[index + counter].Time)
													 - new Date(auditLogEvent.Time)
								// console.log(timeSpent);
								parsedArray.push({
									systemId: content.systemid,
									deviceName: content.hostname,								
									event: auditLogEvent.Event,
									kvmSessionTimeHrs: convertToHrs(timeSpent),
									kvmSessionTimeMs: timeSpent,
									user: auditLogEvent.Initiator,
									time: auditLogEvent.Time
								});	
								counter = 0;
								break;						
							}
							counter++;
						}
						break;

					//Don't insert these document events
					case 'Set Boot Options':
						break;

					//If not related to KVM
					default:
						parsedArray.push({
							systemId: content.systemid,
							deviceName: content.hostname,
							event: auditLogEvent.Event,
							kvmSessionTimeHrs: null,
							kvmSessionTimeMs: null,							
							user: auditLogEvent.Initiator,
							time: auditLogEvent.Time
						});
				}
			})
			process.stdout.write(' DONE\n');
		});
		resolve(parsedArray);
	})
}

//Change this to a transaction?
function insertDocuments(array){
	return new Promise((resolve, reject) => {
		//Insert log documents into AuditEvent collection
		AuditEvent.insertMany(array, {ordered : false}).then(
			() => { 
				console.log('\nInserted Every Record---------'); 
				resolve(console.log('OKAY'));
			},
			err => { 
				//Handle duplicate inserts and keep application running
				if(err.code === 11000){
					console.log('\nError: ' + err.name + '; ErrorCode:' + err.code 
						+ '; A total of ' + err.writeErrors.length + 
						' duplicate documents were blocked.');
					resolve(console.log('CODE 11000 OKAY')); 
				}
				//Other non-duplicate error, reject promise, handle in try catch
				else
					reject(err);
			}
		);
	});
}

//Pass query to Mongo Aggregate query
function queryAggregate(query){
	return new Promise((resolve, reject) =>{	

		//Perform group by count of data
		let result = AuditEvent.aggregate(query)
		resolve(result);
	});
}

function queryFind(query){
	return new Promise((resolve, reject) =>{	

		//Perform group by count of data
		let result = AuditEvent.find(query)
		resolve(result);
	});
}

//D3 accepts Key:Value pairs for datapoints
//Convert Mongoose query result arrays to format
function convertToKeyValue(array){

	let tmpArray = {};

	array.forEach(function(auditEvent){

		let tmpFieldName = auditEvent._id;
		tmpArray[tmpFieldName] = auditEvent.count;
	});

	return tmpArray;
}

//Used to find total KVM session time. Subtract UTC from UTC then turn ms result into hrs
function convertToHrs(milliseconds){

	let seconds = Math.floor((milliseconds / 1000) % 60),
		minutes = Math.floor((milliseconds / (1000 * 60)) % 60),
		hours = Math.floor((milliseconds / (1000 * 60 * 60)));

	seconds = (seconds < 10) ? '0' + seconds : seconds;
	minutes = (minutes < 10) ? '0' + minutes : minutes;
	hours = (hours < 10) ? '0' + hours : hours;

	return hours + ':' + minutes + 'm:' + seconds + 's';
}

function convertToMs(time){

	let timeArr = time.split(":");
	return (timeArr[0] * 1000 * 60 * 60) + (timeArr[1] * 1000 * 60) + (timeArr[2] * 1000);
}

function convertUTCDateToLocalDate(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds()));
}