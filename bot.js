	var config = require('./config');

	var tmi = require("tmi.js");
	const sleep = require('sleep-async')();

	const MongoClient = require('mongodb').MongoClient;
	const assert = require('assert');

	// Connection URL
	const url = 'mongodb://localhost:27017';

	// Database Name
	const dbName = 'saucissons';


	// Use connect method to connect to the server
	MongoClient.connect(url, function(err, client) {
	  assert.equal(null, err);
	  console.log("Connected successfully to mongodb server");

	  const db = client.db(dbName);

	  var options = {
	    options: {
	        debug: true
	    },
	    connection: {
	        reconnect: true
	    },
	    identity: {
	        username: config.username,
	        password: config.password
	    },
	    channels: ["JulienRoch"]
	};

	var saucissons = [];

	var addSaucisson = function(name){

		const collection = db.collection('saucissons');
		collection.find({'name': name}).toArray(function(err, arr) {
		    assert.equal(err, null);

		    if(arr.length == 0){
		    	collection.insertOne({name: name, count: 1}, function(err, res) {
			    if (err) throw err;
			    console.debug("user " + name + " registered in the saucisson's database");
			  });
		    } else {
		    	collection.updateOne({name: name}, { $inc: { count: 1 } }, function(err, result) {
			    assert.equal(err, null);
			    assert.equal(1, result.result.n);
			  });  
		    }

	  	});
	};

	var getSaucissonCount = function(name, callback){
		const collection = db.collection('saucissons');
		collection.find({'name': name}).toArray(function(err, arr) {
		    assert.equal(err, null);
		    if(arr.length == 0){
		    	callback(0);
		    } else {
		    	callback(arr[0].count);  
		    }
	  	});
	};

	var useSaucisson = function(channel, name, displayName, message){
		getSaucissonCount(name, function(c){
			if(c > 0){
				// message will be buffered
				const collection = db.collection('used_saucissons');
				collection.insertOne({channel: channel, name: name, displayName: displayName, message: message}, function(err, res) {
			    if (err) throw err;
			    	console.debug("user " + name + " usesd a saucisson in " + channel);
			  	});

				// 
			}
		});
	}

	var client = new tmi.client(options);

	// Connect the client to the server..
	client.connect();

	// say hi!

	client.on("join", function (channel, username, self) {

	    client.action(channel, "Salut " + username + "! tu vas peut être gagner un saucisson, qui sait...").then(function(data) {
		    sleep.sleep(5000, function(){
		    	addSaucisson(username)
		    	client.action(channel, "Bravo " + username + "! tu as gagné un saucisson à l'ail des ours... C'est bon mais maintenant tu as une haleine de chacal.")
			});
	    // data returns [channel]
		}).catch(function(err) {
	    //
		});
	});

	client.on("chat", function(channel, user, message, self){

		if(message === "!saucissons"){

			getSaucissonCount(user['username'], function(v){
				client.action(channel, user['display-name'] + ", tu as " + v + " saucissons.");
			});
		} else if(message === "!add_saucissons"){
			addSaucisson(user['username']);
		} else {
			 // apero
			 var m = message.match('^!apero\s?(.*)$')
			 if(m){
			 	useSaucisson(channel, user['username'], user['display-name'], m[1]);
			 }
		}

	});

	// express
	const express = require('express')
	const app = express()
	// set the view engine to ejs
	app.set('view engine', 'ejs');
	app.use(express.static('public'))

	app.get('/:channel', (req, res) => {
		res.render('pages/channel', {channel: req.params.channel});
	});

	app.get('/api/:channel', (req, res) => {
		var channel = req.params.channel;
		console.log("retrieving pending saucissons for channel: " + channel)

		const collection = db.collection('used_saucissons');
		collection.find({'channel': '#' + channel}).toArray(function(err, arr) {
		    assert.equal(err, null);

		    collection.deleteMany({_id:{$in: arr.map(function(e){return e._id})}}, function(err, res){
		    	assert.equal(err, null);
		    });

		    res.json(arr);
		});
		

	})

	app.listen(3000, () => console.log('Example app listening on port 3000!'))


	});





