define([
  "require",
  "namespace",

  // Libs
  "use!backbone",

  // Modules
  "modules/leaguevine",
  "modules/navigation",
  "modules/title",
],
function(require, namespace, Backbone, Leaguevine, Navigation, Title) {
	var app = namespace.app;
	var Game = namespace.module();
	
	Game.Model = Backbone.Model.extend({
		defaults: {
			id: "",
			team_1_score: "",
			team_2_score: "",
			start_time: "",
			season: {},
			tournament: {},
			team_1: {name: ""},
			team_2: {name: ""}
			//pool, swiss_round, bracket
            
		},
		urlRoot: Leaguevine.API.root + "games",
		parse: function(resp, xhr) {
			resp = Backbone.Model.prototype.parse(resp);
			return resp;
		},
		toJSON: function() {
			//TODO: Remove attributes that are not stored (gameevents)
			var game = _.clone(this.attributes);

            // Add a formatted start time 
            // TODO: Put this function in namespace?
            game.start_time_string = "";
            if (game.start_time != "" ){ //parse the start time and make it human-readable
                arr = game.start_time.split(/[- :T]/);
                start_time_utc = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4]); //Parse the ISOformat start time
                tz_minutes_offset = new Date().getTimezoneOffset() //The offset in minutes from GMT/UTC
                start_time = new Date(start_time_utc.getTime() + (tz_minutes_offset * 60 * 1000)); //Start time using user's system clock
                minutes = start_time.getMinutes();
                if (minutes < 10) {minutes = '0' + minutes;} //Make the minutes field two digits
                game.start_time_string = start_time.getHours() + ':' + minutes + ' ' + start_time.toLocaleDateString();
            }

            return game
		},
	});
	
	Game.Collection = Backbone.Collection.extend({
		model: Game.Model,
		comparator: function(game) {// Define how items in the collection will be sorted.
		  return game.get("start_time");
		},
		urlRoot: Leaguevine.API.root + "games",
		url: function(models) {
			var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
			url += '/?'
			if ( models && models.length ) {
				url += 'game_ids=' + JSON.stringify(models.pluck('id')) + '&';
			}
			if (this.season_id) {
				url += 'season_id=' + this.season_id + '&';
			}
			if (this.tournament_id) {
				url += 'tournament_id=' + this.tournament_id + '&';
			}
			if (this.team_1_id || this.team_2_id) {
				url += 'team_ids=%5B';
				if (this.team_1_id){url += this.team_1_id;}
				if (this.team_1_id && this.team_2_id){url += ',';}
				if (this.team_2_id){url += this.team_2_id;}
				url += '%5D&';
			}
			return url.substr(0,url.length-1);
		},
		parse: function(resp, xhr) {
			resp = Backbone.Collection.prototype.parse(resp);
			return resp;
		},
		initialize: function(models, options) {
			if (options) {
				if (options.season_id) {this.season_id = options.season_id;}
				if (options.tournament_id) {this.tournament_id = options.tournament_id;}
				if (options.team_1_id) {this.team_1_id = options.team_1_id;}
				if (options.team_2_id) {this.team_2_id = options.team_2_id;}
    		}
		}
	});
	
	Game.Router = Backbone.Router.extend({
		routes : {
			"games": "findGames", //List all games.
			"games/:gameId": "showGame" //Show detail for one game.
		},
		findGames: function () {
			var myLayout = app.router.useLayout("nav_content");// Get the layout from a layout cache.
			// Layout from cache might have different views set. Let's (re-)set them now.
			myLayout.view(".navbar", new Navigation.Views.Navbar());
			myLayout.view(".titlebar", new Title.Views.Titlebar({title: "Games"}));
			myLayout.view(".content", new Game.Views.Find());
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		},
		showGame: function (gameId) {
			var myLayout = app.router.useLayout("nav_detail_list");// Get the layout. Has .navbar, .detail, .list_children
			//Prepare the data.
			game = new Game.Model({id: gameId});
			game.fetch({
				success: function (model, response) {
                    // After the game has been fetched, render the nav-bar so the back button says tournament
                    // if the game is part of a tournament
                    var myLayout = app.router.useLayout("div");
                    myLayout.view("div", new Game.Views.Titlebar({model: model}));
                    myLayout.render(function(el) {$(".titlebar").html(el)});
               }
            });

			//TODO: Get some game stats.
			
			myLayout.setViews({
				".navbar": new Navigation.Views.Navbar({href: "#editgame/"+gameId, name: "Edit"}),
				".detail": new Game.Views.Detail( {model: game}),
				".list_children": new Game.Views.Multilist({model: game})//TODO: add stats					
			});
			myLayout.view(".titlebar", new Game.Views.Titlebar({model: game}));
			myLayout.render(function(el) {$("#main").html(el);});// Render the layout, calling each subview's .render first.
		}
	});
	Game.router = new Game.Router();// INITIALIZE ROUTER

	//
	// VIEWS
	//
	Game.Views.Item = Backbone.View.extend({
		template: "games/item",
		tagName: "li",//Creates a li for each instance of this view. Note below that this li is inserted into a ul.
		serialize: function() {return this.model.toJSON();} //render looks for this to manipulate model before passing to the template.
	});
	Game.Views.Titlebar = Backbone.View.extend({
        template: "layouts/div", //Use an empty template for rendering since it's just a wrapper around Title.Views.Titlebar
        render: function(layout) { //Render the title for the game depending on if it is in a tournament or not
            var view = layout(this);
            var tournamentId = this.model.get('tournament_id');
            var left_btn_href = "#games";
            var left_btn_txt = "Games";
            if (tournamentId != null) {
                //Set the back button to point to this game's tournament if it is part of a tournament
                left_btn_href = "#tournaments/" + tournamentId;
                left_btn_txt = "Tournament";
            }
            this.setViews(
                {"div": new Title.Views.Titlebar({
                    title: "Game", 
                    left_btn_href: left_btn_href, 
                    left_btn_class: "back", 
                    left_btn_txt: left_btn_txt
                })
            });
            return view.render(function(el) {});
        },
		initialize: function() {
    		this.bind("change", function() {
      			this.render();
    		}, this);
  		}
    });
    Game.Views.Find = Backbone.View.extend({
        template: "games/find"
    });
	Game.Views.List = Backbone.LayoutManager.View.extend({
		template: "games/list",
		className: "games-wrapper",
		render: function(layout) {
			var view = layout(this); //Get this view from the layout.
			this.collection.each(function(game) {//for each game in the collection.
				view.insert("ul", new Game.Views.Item({//Inserts the game into the ul in the list template.
					model: game//pass each game to a Item view instance.
				}));
			});
			return view.render({ count: this.collection.length });
		},
		initialize: function() {
			this.collection.bind("reset", function() {
				this.render();
			}, this);
		},
	});
	Game.Views.Detail = Backbone.LayoutManager.View.extend({  	
		template: "games/detail",
		render: function(layout) {
            game = this.model.toJSON();
			return layout(this).render(game);
		},
		initialize: function() {
    		this.model.bind("change", function() {
      			this.render();
    		}, this);
  		}
	});
	Game.Views.Multilist = Backbone.View.extend({
		template: "games/multilist",
		events: {
			"click .bteam_stats": "showTeamStats",
			"click .bplayer_stats": "showPlayerStats",
		},
		showTeamStats: function(ev){
			$('.lplayer_stats').hide();
			$('.lteam_stats').show();
            $('.list_children button').removeClass('is_active');
            $('button.bteam_stats').addClass('is_active');
			console.log("TODO: Show Team Stats")
		},
		showPlayerStats: function(ev){
			$('.lteam_stats').hide();
			$('.lplayer_stats').show();
            $('.list_children button').removeClass('is_active');
            $('button.bplayer_stats').addClass('is_active');
			console.log("TODO: Show Player Stats")
		},
		render: function(layout) {
			var view = layout(this);
			/*this.setViews({
				".players_list": new Player.Views.List( {collection: this.options.players} ),
				".games_list": new Game.Views.List( {collection: this.options.games} )
			});*/
			return view.render().then(function(el) {
				$('.lplayer_stats').hide();
			});
		},
		initialize: function() {
			//this.options.stats.bind("reset", function() {this.render();}, this);
		}
	});
	
	return Game;// Required, return the module for AMD compliance
});
