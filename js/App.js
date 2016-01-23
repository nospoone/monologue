(function ($) {
	'use strict';

	var App = {
		Bootstrap : function () {
			App.Remote = require('remote');
			App.Dialog = App.Remote.require("dialog");
			App.BrowserWindow = App.Remote.require("browser-window").getFocusedWindow();
			App.Canvas.Element = $("#canvas")[0];
			App.Canvas.Context = App.Canvas.Element.getContext("2d");

			$("#splash h2").text(greetings[Math.floor(Math.random() * greetings.length)]);

			App.Events.BindWindowControlEvents();
			App.Events.BindScrollControlEvents();
			App.Events.BindMenuControlEvents();
			App.Events.BindSplashEvents();

			$("select", "#tool-bar").chosen();

			// App.File.OpenProject("C:\\testproject.json");

			requestAnimationFrame(App.Draw.Loop);
		},
		Events : {
			BindWindowControlEvents : function () {
				$("span.close").on('click', function () {
					App.BrowserWindow.close();
				});

				$("span.maximize").on('click', function () {
					if (App.BrowserWindow.isMaximized()) {
						App.BrowserWindow.unmaximize();
						$(this).removeClass("maximized");
					} else {
						App.BrowserWindow.maximize();
						$(this).addClass("maximized");
					}
				});

				$("span.minimize").on('click', function () {
					App.BrowserWindow.minimize();
				});
			},
			BindScrollControlEvents : function () {
				$("canvas, section#nodes, .node header").on('mousedown', function (e) {
					if ($(e.target).prop("id") === "nodes" || $(e.target).prop("id") === "canvas") {
						App.State.Dragging = true;
						$("body").addClass("dragging");

						e.preventDefault();
						e.stopPropagation();
						return false;
					} else if ($(e.target).is("header")) {
						App.State.Dragging = true;
						App.State.DraggedNode = $(e.target).closest(".node").data("id");

						e.preventDefault();
						e.stopPropagation();
						return false;
					}

				});

				$("canvas, section#nodes").on('mousemove', function (e) {
					if (($(e.target).prop("id") === "nodes" || $(e.target).prop("id") === "canvas") && App.State.DraggedNode === null) {
						if (App.State.Dragging) {
							App.State.Position.X -= App.State.LastMousePosition.X - e.clientX;
							App.State.Position.Y -= App.State.LastMousePosition.Y - e.clientY;
							App.State.Dirty = true;
						}
						
						App.State.LastMousePosition.X = e.clientX;
						App.State.LastMousePosition.Y = e.clientY;

						e.preventDefault();
						e.stopPropagation();
						return false;
					} else if ($(e.target).is("header") || App.State.DraggedNode !== null) {
						if (App.State.Dragging) {
							App.Data.Trees[App.State.CurrentTree].nodes[App.State.DraggedNode].editor.X -= App.State.LastMousePosition.X - e.clientX;
							App.Data.Trees[App.State.CurrentTree].nodes[App.State.DraggedNode].editor.Y -= App.State.LastMousePosition.Y - e.clientY;
							App.State.Dirty = true;
						}

						App.State.LastMousePosition.X = e.clientX;
						App.State.LastMousePosition.Y = e.clientY;
						App.State.Dirty = true;
						
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
				});

				$("canvas, section#nodes").on('mouseup', function (e) {
						App.State.Dragging = false;
						App.State.DraggedNode = null;
						$("body").removeClass("dragging");

						e.preventDefault();
						e.stopPropagation();
						return false;
				});
			},
			BindMenuControlEvents : function () {
				var scope = "nav#tool-bar";

				$(".menu", scope).on('click', function () {
					$(this).toggleClass("open");
					App.View.DisplayAnimate($(".dropdown"), "shown", "open");
				})
			},
			BindSplashEvents : function () {
				var scope = "div#splash";
				$("span.open", scope).on('click', function (e) {
					var file = App.Dialog.showOpenDialog(App.BrowserWindow, { 
						title : "Open Project...",  
						properties: [ 'openFile' ],
						filters : [
							{ name : 'Monologue Project File', extensions: ['mpf', 'json'] }
						]
					});

					if (file !== undefined) {
						App.File.OpenProject(file[0]);
					}

					e.preventDefault();
					e.stopPropagation();
					return false;
				});
			}
		},
		Draw : {
			Loop : function () {
				App.Draw.Resize();

				if (App.State.Dirty) {
					App.Draw.ScrollElements();
				}

				App.Draw.DrawLines();
				requestAnimationFrame(App.Draw.Loop);
			},
			ScrollElements : function () {
				$("body").css({ backgroundPosition : App.State.Position.X + "px " + App.State.Position.Y + "px" });
				$("section#nodes").css({ transform : "translate(" + App.State.Position.X + "px, " + App.State.Position.Y + "px)" });

				if (App.Data.Trees) {
					$.each($("section#nodes .node:not(.template)"), function () {
						var coords = App.Data.GetNodeCoordinates(App.State.CurrentTree, $(this).data("id"));
						$(this).css({ transform : "translate(" + coords.X + "px, " + coords.Y + "px)" });
					});
				}

				App.State.Dirty = false;
			},
			DrawLines : function () {
				/*
				App.Canvas.Context.beginPath();
				App.Canvas.Context.moveTo(0, 0);
				App.Canvas.Context.lineTo(App.WindowSize.Width, App.WindowSize.Height);
				App.Canvas.Context.lineWidth = 3;
				App.Canvas.Context.stroke();
				App.Canvas.Context.beginPath();
				App.Canvas.Context.moveTo(0, App.WindowSize.Height);
				App.Canvas.Context.quadraticCurveTo(0, App.WindowSize.Width / 2, App.WindowSize.Width, 0);
				App.Canvas.Context.lineWidth = 3;
				App.Canvas.Context.stroke();
				*/

				var node = $("#nodes .node:first-child");
				var x = node.offset().left + node.outerWidth();
				var y = node.offset().top + (node.outerHeight() / 2) - 35;

				var node2 = $("#nodes .node:not(:first-child)");
				var toX = node2.offset().left;
				var toY = node2.offset().top + (node2.outerHeight() / 2) - 35;

				//var toX = 200 + App.State.Position.X;
				//var toY = 200 + App.State.Position.Y;

				var cp1X = x + (toX - x) / 3;
				var cp2X = x + ((toX - x) / 3) * 2;
				var cp1Y = y;
				var cp2Y = toY;

				App.Canvas.Context.beginPath();
				App.Canvas.Context.moveTo(x, y);
				App.Canvas.Context.bezierCurveTo(cp1X, y, cp2X, toY, toX, toY);
				App.Canvas.Context.lineWidth = 3;
				App.Canvas.Context.strokeStyle = "#ECF0F1";
				App.Canvas.Context.stroke();
			},
			Resize : function () {
				var windowSize = App.BrowserWindow.getContentSize();

				App.Canvas.Element.width = App.WindowSize.Width = windowSize[0];
				App.Canvas.Element.height = App.WindowSize.Height = windowSize[1] - 35;
			}
		},
		View : {
			LoadProject : function () {
				App.View.AnimateWithCallback($("#splash .content"), "shown", function () {
					App.View.AnimateWithCallback($("#splash .icon"), "shown", function () {
						$("h1").text("Monologue - " + App.Data.Project.name);
						App.State.Dirty = true;

						App.View.AnimateWithCallback($("#splash"), "shown", function () {
							$("#splash").addClass("gone");
						});
					})
				}, true);
			},
			DisplayAnimate : function (element, blockClass, opacityClass) {
				element.toggleClass(blockClass);
				setTimeout(function () {
					element.toggleClass(opacityClass);
				}, 1);
			},
			AnimateWithCallback : function (element, cssClass, callback, remove) {
				remove = remove || false;

				if (remove) {
					element.one("webkitTransitionEnd", callback).removeClass(cssClass);
				} else {
					element.one("webkitTransitionEnd", callback).addClass(cssClass);
				}
			},
			NodeTemplate : $(".node.template")
		},
		Canvas : {
			Element : null,
			Context : null
		},
		WindowSize : {
			Width : 0,
			Height : 0
		},
		State : {
			Position : {
				X : 150,
				Y : 150
			},
			LastMousePosition : {
				X : 0,
				Y : 0
			},
			Velocity : 0,
			Amplitude : 0,
			Dragging : false,
			DraggedNode : null,
			CurrentTree : 0
		},
		File : {
			OpenProject : function (file) {
				var fs = App.Remote.require('fs');
				var d = JSON.parse(fs.readFileSync(file, { encoding : "utf8"}));
				App.Data.Project = d.project;
				App.Data.Trees = d.trees;
				App.View.LoadProject();
			}
		},
		Data : {
			Project : null,
			Trees : null,
			GetNodeCoordinates : function (treeId, nodeId) {
				return {
					X : App.Data.Trees[treeId].nodes[nodeId].editor.X,
					Y : App.Data.Trees[treeId].nodes[nodeId].editor.Y
				}
			}
		},
		Remote : null,
		BrowserWindow : null,
		Dialog : null,
	};

	$(function () {
		App.Bootstrap();
		window.App = App;
	});
})(require('../js/jquery.js'));