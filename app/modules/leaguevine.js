define([
  "namespace",

  // Libs
  "use!backbone"

  // Modules

  // Plugins
],

function(namespace, Backbone) {
	/*
	 * This module defines the API properties.
	 */
    var app = namespace.app;

  	// Create a new module
  	var Leaguevine = namespace.module();

  	Leaguevine.Router = Backbone.Router.extend({
		
		routes: {
			"access_:hash": "token_received"
		},
		
		token_received: function(hash) {//route matched by oauth/:hash
			hash = hash.split("&"); //break the URL hash into its segments.
			_.each(hash, function(element){ //For each segment...
				var pair = element.split("="); //Get the key and value.
				var temp_obj = {};
				temp_obj[pair[0]]=pair[1]; //Put the key and value into a temp object.
				_.extend(app.api,temp_obj); //Extend/overwrite our app.api with the key/value of the temp object.
			});
			localStorage.setItem('auth_object', JSON.stringify(app.api));
			//TODO: After token is received, navigate to the most recent page.
			Backbone.history.navigate('teams', true);//After the token has been updated, navigate to some index site.
		}
	});
    Leaguevine.router = new Leaguevine.Router();// INITIALIZE ROUTER

  	Leaguevine.API = {	
            root: "http://api.playwithlv.com/v1/",
            base: "http://playwithlv.com/oauth2/authorize/?response_type=token&scope=universal",
            client_id: "5b830cb7c788b095c94732c8ca03cb",
            redirect_uri: "http://localhost:8000/",
            season_id: 20041,
            d_token: function() {//Modules will reference this dynamic token			
            if (!this.token) {
                var stored_api = JSON.parse(localStorage.getItem('auth_object')); //Pull our token out of local storage if it exists.
                _.extend(this,stored_api);
            }
            if (!this.token) {
                window.location = this.base + "&client_id=" + this.client_id + "&redirect_uri=" + this.redirect_uri;
            }
            else {
                return this.token;
            }
        }
    };

    if (typeof localSettings != 'undefined' && 
        typeof localSettings.Leaguevine != 'undefined' && 
        typeof localSettings.Leaguevine.API != 'undefined') {
        _.extend(Leaguevine.API, localSettings.Leaguevine.API);
    }
		
	return Leaguevine;
});
