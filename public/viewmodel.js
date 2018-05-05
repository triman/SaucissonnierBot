function viewmodel(channel){
	var self = this;
	self.cheers = ko.observableArray([]);


	var displayUntilExpired = function(cheer){
		setTimeout(function() {
			self.cheers.remove(cheer);
		}, 15000);
	};	

	self.refresh = function(){
		$.getJSON("/api/" + channel, function(data){
			console.log(data);

			data.forEach(function(c){
				self.cheers.push(c);
				displayUntilExpired(c);
			});
		});
	}

	setInterval(self.refresh, 1000);

	
}