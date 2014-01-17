"use strict"

/**
 * Class: BIMSURFER.ProjectRevision
 */
BIMSURFER.ProjectRevision = BIMSURFER.Class({
	CLASS: 'BIMSURFER.ProjectRevision',
	SYSTEM: null,
	events: null,

	project: null,
	scene: null,
	ifcTypes: null,
	loadedTypes: null,
	visibleTypes: null,

	sceneLoaded: false,

	__construct: function(system, project, serverRevision) {
		this.SYSTEM = system;
		this.project = project;

		this.ifcTypes = new Array();
		this.loadedTypes = new Array();
		this.visibleTypes = new Array();

		this.events = new BIMSURFER.Events(this);
		this.events.register('sceneLoaded', function() {
			this.project.events.trigger('revisionSceneLoaded', [], this);
		});

		jQuery.extend(this, serverRevision);
	},

	loadScene: function() {
		var _this = this;

		var step = function(params, state, progressLoader) {
			_this.SYSTEM.events.trigger('progressChanged', state.progress);
		};
		var done = function(params, state, progressLoader) {
			progressLoader.unregister();

			_this.SYSTEM.events.trigger('progressBarStyleChanged', BIMSURFER.Constants.ProgressBarStyle.Marquee);

			var url = _this.project.server.server.generateRevisionDownloadUrl({
				serializerOid : _this.project.server.getSerializer('org.bimserver.geometry.jsonshell.SceneJs3ShellSerializerPlugin').oid,
				laid : params.laid
			});

			$.ajax({
				url: url,
				dataType: 'json',
				success: function(scene) {
					_this.scene = scene;
					_this.ifcTypes = _this.scene.data.ifcTypes;
					_this.ifcTypes.sort();
					_this.scene.data.ifcTypes = new Array();
					_this.sceneLoaded = true;
					_this.SYSTEM.events.trigger('progressDone');
					_this.events.trigger('sceneLoaded');
				},
				error: function(a,b,c,d,e) {
					console.debug('Todo: Error');
					console.debug('ERROR');
					console.debug(a,b,c,d,e);
				}
			});

			return _this.scene;
		}

		this.project.server.server.call("Bimsie1ServiceInterface", "download", {
			roid : this.oid,
			serializerOid : this.project.server.getSerializer('org.bimserver.geometry.jsonshell.SceneJs3ShellSerializerPlugin').oid,
			showOwn : true,
			sync: false
		}, function(laid) {
			if(!BIMSURFER.Util.isset(laid)) {
				console.error('Error loading project:', _this.oid, revisionId);
				return;
			}
			_this.SYSTEM.events.trigger('progressStarted', 'Preparing project');
			new BIMSURFER.ProgressLoader(_this.SYSTEM, _this.project.server.server, laid, step, done, {laid: laid}, false);
		});
	},

	show: function(types) {
		if(this.sceneLoaded) {
			this.SYSTEM.showRevision(this, types);
		}
		else
		{
			var sceneLoaded = function() {
				this.events.unregister('sceneLoaded', sceneLoaded);
				this.SYSTEM.loadScene(this);
				this.SYSTEM.showRevision(this, types);
			};
			this.events.register('sceneLoaded', sceneLoaded);
			this.loadScene();
		}
	},

	hide: function() {
		this.SYSTEM.hideRevision(this);
	}
});