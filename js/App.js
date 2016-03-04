(function ($) {
	'use strict';

	var App = {
		Bootstrap : function () {
			App.Remote = require('remote');
			App.Dialog = App.Remote.require("dialog");
			App.BrowserWindow = App.Remote.require("browser-window").getFocusedWindow();
			App.Canvas.Element = $("#canvas")[0];
			App.Canvas.Context = App.Canvas.Element.getContext("2d");
			App.File.FS = App.Remote.require('fs');

			$("#splash h2").text(greetings[Math.floor(Math.random() * greetings.length)]);

			App.Events.BindWindowControlEvents();
			App.Events.BindScrollControlEvents();
			App.Events.BindMenuControlEvents();
			App.Events.BindSplashEvents();
			App.Events.BindNodeEvents();
			App.Events.BindTreeChangeEvents();
			App.Events.BindModalEvents();
			// App.File.StartAutosaveLoop();

			$("#tool-bar select").chosen();

			App.File.OpenProject("E:\\_dev\\monologue\\testproject.mpf");

			requestAnimationFrame(App.Draw.Loop);
		},
		Events : {
			BindWindowControlEvents : function () {
				var scope = "nav#menu-bar";

				$("span.close", scope).on('click', function () {
					App.BrowserWindow.close();
				});

				$("span.maximize", scope).on('click', function () {
					if (App.BrowserWindow.isMaximized()) {
						App.BrowserWindow.unmaximize();
						$(this).removeClass("maximized");
					} else {
						App.BrowserWindow.maximize();
						$(this).addClass("maximized");
					}
				});

				$("span.minimize", scope).on('click', function () {
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
							var currentDataNode = App.Data.GetNodeByID(App.State.CurrentTree, App.State.DraggedNode);
							currentDataNode.editor.X -= App.State.LastMousePosition.X - e.clientX;
							currentDataNode.editor.Y -= App.State.LastMousePosition.Y - e.clientY;
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

				$("canvas, section#nodes").on('mousemove', function (e) {
					App.State.LinkMousePosition.X = e.clientX;
					App.State.LinkMousePosition.Y = e.clientY;
				})

				$("canvas, section#nodes").on('mouseup', function (e) {
						App.State.Dragging = false;
						App.State.DraggedNode = null;
						$("body").removeClass("dragging");

						e.preventDefault();
						e.stopPropagation();
						return false;
				});

				$("canvas, section#nodes, .node header").on('dblclick', function (e) {
					if ($(e.target).prop("id") === "nodes" || $(e.target).prop("id") === "canvas") {
						App.View.AddNode(e.clientX - App.State.Position.X - 100, e.clientY - App.State.Position.Y - 45);
					}
				});

				$(window).on('mousewheel', function (e) {
					if ($(e.target).prop("id") === "nodes" || $(e.target).prop("id") === "canvas") {
						if (e.originalEvent.wheelDelta < 0) {
							App.State.Zoom -= App.State.Zoom * 0.05;
						} else {
							App.State.Zoom += App.State.Zoom * 0.05;
						}

						App.State.Zoom = App.State.Zoom < 0.5 ? 0.5 : App.State.Zoom > 1 ? 1 : App.State.Zoom;
						App.State.Dirty = true;
					}
				});
			},
			BindMenuControlEvents : function () {
				var scope = "nav#tool-bar ";
				var subscope = "";

				$(".menu", scope + subscope).on('click', function () {
					$(this).toggleClass("open");
					App.View.DisplayAnimate($(".dropdown"), "shown", "open");
				});

				$(".node-menu", scope + subscope).on('click', function () {
					$(this).toggleClass("open");
					App.View.DisplayAnimate($(".node-dropdown"), "shown", "open");
				});

				var subscope = ".dropdown";
				$(".save-project", scope + subscope).on('click', function () {
					App.File.SaveProject();
					$("nav#tool-bar .menu").click();
				});

				$(".variables", scope + subscope).on('click', function () {
					App.View.ShowModal(".variable-settings");
					$("nav#tool-bar .menu").click();
				});

				$("select.languages").chosen().change(function () {
					App.View.ChangeLanguage($(this).find(":selected").val());
				});

				var subscope = ".node-dropdown";
				$(".tree-settings", scope + subscope).on('click', function () {
					App.View.ShowModal(".trees");
					$("nav#tool-bar .node-menu").click();
				});
			},
			BindSplashEvents : function () {
				var scope = "div#splash";
				$("span.open", scope).on('click', function (e) {
					var file = App.Dialog.showOpenDialog(App.BrowserWindow, { 
						title : "Open Project...",  
						properties: [ 'openFile' ],
						filters : [
							{ name : 'Monologue Project File', extensions: ['mpf'] }
						]
					});

					if (file !== undefined) {
						App.File.OpenProject(file[0]);
					}

					e.preventDefault();
					e.stopPropagation();
					return false;
				});
			},
			BindNodeEvents : function () {
				$("section#nodes, .modal").on('change blur', 'select', function () {
					if ($(this).find(":selected").val() === "placeholder") {
						$(this).addClass("placeholder");
					}
				});

				$("section#nodes, .modal").on('click', 'select', function () {
					$(this).removeClass("placeholder");
				});

				$('section#nodes').on('change', "select.nodetype", function () {
					var newType = $(this).find(":selected").val();
					var parent = $(this).closest(".node");

					parent.find(".controls:not(.hidden)").addClass("hidden");
					parent.find(".controls[data-type=" + newType + "]").removeClass("hidden");

					if (newType == "branch" && parent.find('span.connectTo').length < 2) {
						parent.find('.links').append("<span class='connectTo'></span>");
						parent.addClass("branch");
					} else if (newType != "branch" && parent.find('span.connectTo').length > 1) {
						parent.find('.links span.connectTo').last().remove();
						parent.removeClass("branch");
					}

					App.Data.UpdateNode(parent);
				});

				$('section#nodes').on('change', '.controls input, .controls textarea, .controls select', function () {
					App.Data.UpdateNode($(this).closest(".node"));
				})

				$('section#nodes').on('focus', '.controls input, .controls textarea, .controls select', function () {
					$(this).addClass("dirty");
				})

				$("section#nodes").on('click', '.links span.connectTo', function (e) {
					App.State.Link.Linking = true;
					App.State.Link.LinkingFrom = $(this).closest(".node");

					if (App.State.Link.LinkingFrom.hasClass("branch")) {
						App.State.Link.IsTrueLink = $(e.target).index() === 0 || $(e.target).index() === 2;
					}

					e.preventDefault();
					e.stopPropagation();
					return false;
				});

				$("section#nodes").on('click', 'span.remove-node', function (e) {
					App.View.RemoveNode($(this).closest(".node"));

					e.preventDefault();
					e.stopPropagation();
					return false;
				});

				$("section#nodes").on('mouseenter', '.links span.connectFromTrigger, .links span.connectFrom', function () {
					if (App.State.Link.Linking) {
						App.State.Link.LinkTarget = $(this).closest(".node");
					}
				});

				$("section#nodes").on('mouseleave', '.links span.connectFromTrigger, .links span.connectFrom', function () {
					App.State.Link.LinkTarget = null;
				});

				$("section#nodes").on('click', '.links span.connectFromTrigger, .links span.connectFrom', function () {
					if (App.State.Link.Linking) {
						if (App.State.Link.LinkingFrom.hasClass("branch")) {
							App.Data.Link(App.State.Link.LinkingFrom, App.State.Link.LinkTarget, App.State.Link.IsTrueLink);
						} else {
							App.Data.Link(App.State.Link.LinkingFrom, App.State.Link.LinkTarget);
						}

						App.State.Link.Linking = false;
						App.State.Link.LinkingFrom = null;
						App.State.Link.LinkTarget = null;
					}
				});
			},
			BindTreeChangeEvents : function () {
				$("select.trees").chosen().change(function () {
					var treeId = $(this).find(":selected").data('tree');

					App.State.CurrentTree = treeId;
					$('section#nodes .tree').addClass('hidden');
					$('section#nodes .tree[data-id=' + treeId + ']').removeClass('hidden');
					
					App.State.Dirty = true;
				});
			},
			BindModalEvents : function () {
				// VARIABLE SETTINGS
				var variableSettings = ".variable-settings",
					validCharsRegex = new RegExp(/^[a-zA-ZÀ-ÿ0-9 ]+$/);

				$("select[data-project-variables]", variableSettings).on("change", function onProjectVariableChange() {
					if ($("select[data-project-variables] option:selected", variableSettings).length > 0) {
						$("span.remove-variable", variableSettings).removeClass("disabled");
					} else {
						$("span.remove-variable", variableSettings).addClass("disabled");
					}
				});

				$("span.add-variable", variableSettings).on("click", function onAddCustomVariableClick() {
					var variableNameInput = $("input[data-project-new-variable]", variableSettings),
						variableName = variableNameInput.val();

					$("span.error", variableSettings).addClass("hidden");
					variableNameInput.removeClass("error");

					if (variableName.length > 0) {
						if (validCharsRegex.test(variableName)) {
							if (!App.Data.DuplicateCustomVariableExists(variableName)) {
								var newId = App.Data.AddCustomVariable(variableName, $("select[data-variable-type] option:selected", variableSettings).val());
								$("select[data-project-variables]").append("<option value='" + newId + "'>" + variableName + "</option>");
								variableNameInput.val("").trigger("blur");
							} else {
								variableNameInput.addClass("error").focus();
								$("span.error.duplicate", variableSettings).removeClass("hidden");
							}
						} else {
							variableNameInput.addClass("error").focus();
							$("span.error.invalid", variableSettings).removeClass("hidden");
						}
					} else {
						variableNameInput.addClass("error").focus();
						$("span.error.empty", variableSettings).removeClass("hidden");
					}
				});

				$("span.remove-variable", variableSettings).on("click", function onRemoveCustomVariableClick() {
					if ($("select[data-project-variables] option:selected", variableSettings).length > 0) {
						App.Data.RemoveCustomVariable($("select[data-project-variables] option:selected", variableSettings).val());
						$("select[data-project-variables] option:selected", variableSettings).remove();
						$("select[data-project-variables]", variableSettings).trigger("change");
					}
				});

				$("span.close", variableSettings).on("click", function closeVariableModals() {
					App.View.HideModal();
					if ($("select[data-project-variables]", variableSettings).find("option:selected").length > 0) {
						$("select[data-project-variables]", variableSettings).find("option:selected").prop("selected", false);
						$("select[data-project-variables]", variableSettings).trigger("change");
					}
				});

				// TREES
				var trees = ".trees";
				$("span.close", trees).on("click", function closeVariableModals() {
					App.View.HideModal();
					if ($("select[data-project-trees]", trees).find("option:selected").length > 0) {
						$("select[data-project-trees]", trees).find("option:selected").prop("selected", false);
						$("select[data-project-trees]", trees).trigger("change");
					}
				});

				$("select[data-project-trees]", trees).on("change", function onProjectTreeChange() {
					if ($("select[data-project-trees] option:selected", trees).length > 0) {
						$("span.remove-tree", trees).removeClass("disabled");
					} else {
						$("span.remove-tree", trees).addClass("disabled");
					}
				});

				$("span.remove-tree", trees).on("click", function onRemoveTreeClick() {
					if ($("select[data-project-trees] option:selected", trees).length > 0) {
						// App.Data.RemoveTree($("select[data-project-trees] option:selected", trees).val());
						$("select[data-project-trees] option:selected", trees).remove();
						$("select[data-project-trees]", trees).trigger("change");
					}
				});
			},
			NodeSelectChange : function (select, resetValues) {
				var select = (select !== undefined && select.type !== "change") ? select : $(this),
					validation = select.find("option:selected").data("validation"),
					resetValues = (resetValues === undefined) ? true : resetValues;

				select.parent().find("[data-validates]").hide();
				select.parent().find("[data-" + validation + "]").show();

				if (resetValues) {
					select.parent().find("option[data-validates]").prop("selected", false);
					select.parent().find("select[data-operation] option[default], select[data-character] option[default], select[data-condition] option[default], select[data-bool] option[default]").prop("selected", "selected").blur();
					select.parent().find("input[type=text]").val("");
				}
			}
		},
		Draw : {
			Loop : function () {
				App.Draw.Resize();

				if (App.State.Dirty) {
					App.Draw.ScrollElements();
				}

				App.Draw.DrawLinks();
				requestAnimationFrame(App.Draw.Loop);
			},
			ScrollElements : function () {
				$("body").css({ backgroundPosition : App.State.Position.X + "px " + App.State.Position.Y + "px" });
				$("section#nodes").css({ transform : "translate(" + App.State.Position.X + "px, " + App.State.Position.Y + "px)" });
				$("section#nodes .tree").css({ transform : "scale(" + App.State.Zoom + ")" });

				if (App.Data.Trees) {
					$.each($("section#nodes .tree[data-id=" + App.State.CurrentTree + "] .node:not(.template)"), function () {
						var coords = App.Data.GetNodeCoordinates(App.State.CurrentTree, $(this).data("id"));
						$(this).css({ transform : "translate(" + coords.X + "px, " + coords.Y + "px)" });
					});
				}

				App.State.Dirty = false;
			},
			DrawLinks : function () {
				$.each($("section#nodes .tree[data-id=" + App.State.CurrentTree + "] .node:not(.template)"), function () {
					var id = $(this).data('id');
					var currentDataNode = App.Data.GetNodeByID(App.State.CurrentTree, id);

					if ($(this).hasClass("branch")) {
						if (currentDataNode.trueLink !== undefined) {
							var cp1X, cp1Y, cp2X, cp2Y,
								currentNode = $(this);

							var link = currentDataNode.trueLink;
							var fromElem = currentNode.find(".links span.connectTo:eq(0)"),
								fromPos = fromElem.offset();

							fromX = fromPos.left;
							fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

							var toElem = $("section#nodes .tree[data-id=" + App.State.CurrentTree + "] .node:not(.template)").filter(function () {
									return $(this).data('id') === link;
								}).find("span.connectFrom"),
								toPos = toElem.offset();

							toX = toPos.left;
							toY = toPos.top + (toElem.outerHeight() / 2) - 35;

							App.Draw.DrawBezier(fromX, fromY, toX, toY);
						} 

						if (currentDataNode.falseLink !== undefined) {
							var cp1X, cp1Y, cp2X, cp2Y,
								currentNode = $(this);

							var link = currentDataNode.falseLink;
							var fromElem = currentNode.find(".links span.connectTo:eq(1)"),
								fromPos = fromElem.offset();

							fromX = fromPos.left;
							fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

							var toElem = $("section#nodes .tree[data-id=" + App.State.CurrentTree + "] .node:not(.template)").filter(function () {
									return $(this).data('id') === link;
								}).find("span.connectFrom"),
								toPos = toElem.offset();

							toX = toPos.left;
							toY = toPos.top + (toElem.outerHeight() / 2) - 35;

							App.Draw.DrawBezier(fromX, fromY, toX, toY);
						}
					} else {
						if (currentDataNode.link != -1) {
							var cp1X, cp1Y, cp2X, cp2Y,
								currentNode = $(this);

							var link = currentDataNode.link;
							var fromElem = currentNode.find(".links span.connectTo:eq(0)"),
								fromPos = fromElem.offset();

							fromX = fromPos.left;
							fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

							var toElem = $("section#nodes .tree[data-id=" + App.State.CurrentTree + "] .node:not(.template)").filter(function () {
									return $(this).data('id') === link;
								}).find("span.connectFrom"),
								toPos = toElem.offset();

							toX = toPos.left;
							toY = toPos.top + (toElem.outerHeight() / 2) - 35;

							App.Draw.DrawBezier(fromX, fromY, toX, toY);
						}
					}
				});

				if (App.State.Link.Linking) {
					var fromX, fromY, toX, toY, fromElem, fromPos, toElem, toPos;

					if (App.State.Link.LinkingFrom.hasClass("branch")) {
						if (App.State.Link.IsTrueLink) {
							fromElem = App.State.Link.LinkingFrom.find(".links span.connectTo:eq(0)");
						} else {
							fromElem = App.State.Link.LinkingFrom.find(".links span.connectTo:eq(1)");
						}
					} else {
						fromElem = App.State.Link.LinkingFrom.find(".links span.connectTo");
					}

					fromPos = fromElem.offset();
					fromX = fromPos.left;
					fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

					if (App.State.Link.LinkTarget !== null) {
						var toElem = App.State.Link.LinkTarget.find("span.connectFrom"),
							toPos = toElem.offset();

						toX = toPos.left;
						toY = toPos.top + (toElem.outerHeight() / 2) - 35;
					} else {
						toX = App.State.LinkMousePosition.X;
						toY = App.State.LinkMousePosition.Y - 35;
					}

					App.Draw.DrawBezier(fromX, fromY, toX, toY);
				}
			},
			Resize : function () {
				var windowSize = App.BrowserWindow.getContentSize();

				App.Canvas.Element.width = App.WindowSize.Width = windowSize[0];
				App.Canvas.Element.height = App.WindowSize.Height = windowSize[1] - 35;
			},
			DrawBezier : function (fromX, fromY, toX, toY) {
				var cp1X = fromX + (toX - fromX) / 3,
					cp2X = fromX + ((toX - fromX) / 3) * 2,
					cp1Y = fromY,
					cp2Y = toY;

				App.Canvas.Context.beginPath();
				App.Canvas.Context.moveTo(fromX, fromY);
				App.Canvas.Context.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, toX, toY);
				App.Canvas.Context.lineWidth = 3 * App.State.Zoom;
				App.Canvas.Context.strokeStyle = "#ECF0F1";
				App.Canvas.Context.stroke();
			},
			CurrentDisplayedNodes : null
		},
		View : {
			LoadProject : function () {
				App.View.AnimateWithCallback($("#splash .content"), "shown", function () {
					App.View.AnimateWithCallback($("#splash .icon"), "shown", function () {
						$("h1").text("Monologue - " + App.Data.Project.name);

						App.View.GenerateTreesCategories();
						App.View.GenerateTrees();
						App.View.GenerateLanguages();
						App.View.GenerateNodes();
						App.View.GenerateModalInformations();
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
			ShowStatusMessage : function (message) {
				$("#status-bar span.message").text(message);
				App.View.AnimateWithCallback($("#status-bar"), "hidden", function () {
					setTimeout(function () {
						$("#status-bar").addClass("hidden");
					}, 1000)
				}, true);
			},
			GenerateNodes : function () {
				App.Data.Variables.forEach(function (variable) {
					if (variable.set) {
						$(".node.template select[data-variable-set] optgroup[data-" + variable.origin + "]").append("<option data-validation='" + variable.validation + "' value='" + variable.id + "'>" + variable.displayName + "</option>").trigger("chosen:updated");
					}

					if (variable.get) {
						$(".node.template select[data-variable-get] optgroup[data-" + variable.origin + "]").append("<option data-validation='" + variable.validation + "' value='" + variable.id + "'>" + variable.displayName + "</option>").trigger("chosen:updated");
					}
				});

				$.each($(".node.template optgroup"), function () {
					if ($(this).children().length === 0) {
						$(this).remove();
					}
				})

				App.Data.Voices.forEach(function (voice) {
					$(".node.template select[data-voice]").append("<option value='" + voice.displayName + "'>" + voice.displayName + "</option>");
				});

				App.Data.Characters.forEach(function (character) {
					$(".node.template select[data-character]").append("<option value='" + character.id + "'>" + character.displayName + "</option>");
				});

				$.each($("section#nodes .tree"), function () {
					var tree = $(this);
					App.Data.Trees[tree.data('id')].nodes.forEach(function (e, i, a) {
						var node = $(".node.template").clone().removeClass('template');
						e.type = (e.type.length > 0) ? e.type : "default";
						node.data('id', e.id);
						node.find("select.nodetype option[value=" + e.type + "]").attr("selected", "selected");
						node.find(".controls[data-type=" + e.type + "]").removeClass("hidden");

						if (e.type === "text") {
							node.find("[data-type='text'] input[data-name]").val(e.name);
							node.find("[data-type='text'] select[data-voice] option[value='" + e.voice + "']").prop("selected", "selected");
							node.find("[data-type='text'] textarea[data-message]").val(App.Data.GetText(App.State.CurrentLanguage, "$T" + tree.data('id') + "N" + e.id));
						} else if (e.type === "branch") {
							node.addClass("branch");
							node.find('.links').append("<span class='connectTo'></span>");

							if (e.variable !== undefined && e.variable !== "") {
								node.find("[data-type='branch'] select[data-variable-get] option[value='" + e.variable + "']")
								if (e.value !== undefined && node.find("[data-type='branch'] select[data-variable-get] option[value='" + e.variable + "']").length > 0) {
									var variable = node.find("[data-type='branch'] select[data-variable-get] option[value='" + e.variable + "']");
									switch (variable.data('validation')) {
										case 'int':
										case 'string':
											node.find("[data-type='branch'] input[data-" + variable.data('validation') + "]").val(e.value);
											break;
										case 'bool':
										case 'character':
											node.find("[data-type='branch'] select[data-" + variable.data('validation') + "] option[value='" + e.value + "']").prop("selected", "selected");
											node.find("[data-type='branch'] select[data-" + variable.data('validation') + "] option[value='" + e.value + "']").prop("selected", "selected").parent().removeClass("placeholder");
											break;
										default:
											console.error("Invalid validation type.");
											break;
									}
								}
							}

							if (e.condition !== undefined) {
								node.find("[data-type='branch'] select[data-condition] option[value='" + e.condition + "']").prop("selected", "selected").parent().removeClass("placeholder");
							}
						} else if (e.type === "set") {
							if (e.variable !== undefined && e.variable !== "") {
								node.find("[data-type='set'] select[data-variable-set] option[value='" + e.variable + "']").prop("selected", "selected").parent().removeClass("placeholder");
								if (e.value !== undefined && node.find("[data-type='set'] select[data-variable-set] option[value='" + e.variable + "']").length > 0) {
									var variable = node.find("[data-type='set'] select[data-variable-set] option[value='" + e.variable + "']");
									switch (variable.data('validation')) {
										case 'int':
										case 'string':
											node.find("[data-type='set'] input[data-" + variable.data('validation') + "]").val(e.value);
											break;
										case 'bool':
										case 'character':
											node.find("[data-type='set'] select[data-" + variable.data('validation') + "] option[value='" + e.value + "']").prop("selected", "selected");
											node.find("[data-type='set'] select[data-" + variable.data('validation') + "] option[value='" + e.value + "']").prop("selected", "selected").parent().removeClass("placeholder");
											break;
										default:
											console.error("Invalid validation type.");
											break;
									}
								}
							}

							if (e.operation !== undefined) {
								node.find("[data-type='set'] select[data-operation] option[value='" + e.operation + "']").prop("selected", "selected").parent().removeClass("placeholder");
							}
						}

						if (i === 0) {
							node.find("span.remove-node").remove();
							node.find("span.connectFrom, span.connectFromTrigger").remove();
						}


						App.Events.NodeSelectChange(node.find("select[data-variable-get]").chosen({ width: "100%" }).change(App.Events.NodeSelectChange), false);
						App.Events.NodeSelectChange(node.find("select[data-variable-set]").chosen({ width: "100%" }).change(App.Events.NodeSelectChange), false);
						node.find("select[data-voice]").chosen({ width: "100%" });

						node.appendTo(tree);
					});
				});
			},
			GenerateTrees : function () {
				App.Data.Trees.forEach(function (tree, index) {
					var visibility = (App.State.CurrentTree == tree.id) ? "" : " hidden";
					$("section#nodes").append("<section class='tree" + visibility + "' data-id='" + tree.id + "'></section>");

					if (App.State.CurrentTree == tree.id) {
						$("select.trees").append("<option data-tree='" + tree.id + "' selected='selected'>" + tree.displayName + "</option>");
					} else {
						$("select.trees").append("<option data-tree='" + tree.id + "'>" + tree.displayName + "</option>");
					}

					$.each($("select[data-project-trees] optgroup"), function () {
						if ($(this).data('tree-category-id') === tree.categoryId) {
							$(this).append("<option data-tree='" + tree.id + "'>" + tree.displayName + "</option>");
						}
					});
				});

				$("select.trees").trigger("chosen:updated");
			},
			AddNode : function (x, y) {
				var newId = App.Data.AddNode(x, y);
				var node = $(".node.template").clone().removeClass('template');
				node = $(".node.template").clone().removeClass('template').data('id', newId);
				node.appendTo("section#nodes .tree[data-id=" + App.State.CurrentTree + "]");
				App.Events.NodeSelectChange(node.find("select[data-variable-get]").chosen({ width: "100%" }).change(App.Events.NodeSelectChange));
				App.Events.NodeSelectChange(node.find("select[data-variable-set]").chosen({ width: "100%" }).change(App.Events.NodeSelectChange));
				node.find("select[data-voice]").chosen({ width: "100%" });
				App.State.Dirty = true;
			},
			GenerateLanguages : function () {
				App.Data.Project.languages.forEach(function (language, index) {
					$('<option value="' + language.code + '">' + language.displayName + '</option>').appendTo('select.languages');
				});
				
				$('select.languages').trigger("chosen:updated");
			},
			ChangeLanguage : function (newLanguage) {
				$.each($("section#nodes .tree .node select.nodetype option[value='text']:selected"), function () {
					$(this).closest('.node').find('textarea').val(App.Data.GetText(newLanguage, "$T" + $(this).closest('.tree').data('id') + "N" + $(this).closest('.node').data('id')));
				});

				App.State.CurrentLanguage = newLanguage;
			},
			GenerateModalInformations : function () {
				$("input[data-project-title]").val(App.Data.Project.name);

				App.Data.CustomVariables.forEach(function (variable) {
					$("select[data-project-variables]").append("<option value='" + variable.id + "'>" + variable.displayName + "</option>");
				});
			},
			GenerateTreesCategories : function () {
				App.Data.TreeCategories.forEach(function (tree) {
					$("select[data-project-trees]").append('<optgroup label="' + tree.displayName + '" data-tree-category-id="' + tree.id + '"></optgroup>')
					$("select[data-new-tree-category]").append('<option value="' + tree.id + '">' + tree.displayName + '</option>');
				});
			},
			RemoveNode : function (nodeElement) {
				App.Data.RemoveNode(nodeElement.data("id"));
				nodeElement.remove();
			},
			ShowModal : function (modalClass) {
				$(".overlay").removeClass("invisible");
				setTimeout(function () {
					App.View.AnimateWithCallback($(".overlay"), "hidden", function () {
						App.View.DisplayAnimate($(modalClass), "invisible", "hidden");
					}, true);
				}, 1);
			},
			HideModal : function () {
				App.View.AnimateWithCallback($(".overlay"), "hidden", function () {
					$(".overlay").addClass("invisible");
					$(".overlay .modal").addClass("invisible hidden");
				});
			}
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
				X : 0,
				Y : 0
			},
			LastMousePosition : {
				X : 0,
				Y : 0
			},
			LinkMousePosition : {
				X : 0,
				Y : 0
			},
			Link : {
				Linking : false,
				LinkingFrom : null,
				LinkTarget : null
			},
			Zoom : 1,
			Dragging : false,
			DraggedNode : null,
			CurrentTree : 0,
			CurrentLanguage : "enUS"
		},
		File : {
			OpenProject : function (file) {
				var d = JSON.parse(App.File.FS.readFileSync(file, { encoding : "utf8" }));
				App.Data.Project = d.project;
				App.Data.Variables = d.project.variables;
				App.Data.CustomVariables = d.project.customVariables;
				App.Data.TreeCategories = d.project.treeCategories;
				App.Data.Voices = d.project.voices;
				App.Data.Characters = d.project.characters;
				App.Data.Trees = d.trees;
				App.Data.Translations = d.translations;
				App.File.CurrentProjectFile = file;
				App.State.Position.X = App.Data.Project.state.position.X;
				App.State.Position.Y = App.Data.Project.state.position.Y;
				App.State.Zoom = App.Data.Project.state.zoom;
				App.State.CurrentTree = App.Data.Project.state.currentTree;

				App.View.LoadProject();
			},
			SaveProject : function (auto) {
				auto = auto || false;
				if (!App.File.Saving) {
					App.File.Saving = true;
					App.View.ShowStatusMessage((auto) ? "Auto-saving..." : "Saving...");

					$(".node input.dirty, .node textarea.dirty").trigger('change').removeClass('dirty');

					var data = { project : App.Data.Project, trees : App.Data.Trees, translations : App.Data.Translations };
					data.project.variables = App.Data.Variables;
					data.project.customVariables = App.Data.CustomVariables;
					data.project.state.position.X = App.State.Position.X;
					data.project.state.position.Y = App.State.Position.Y;
					data.project.state.zoom = App.State.Zoom;
					data.project.state.currentTree = App.State.CurrentTree;

					App.File.FS.writeFileSync(App.File.CurrentProjectFile, JSON.stringify(data));
					App.File.ExportTSVs();
					
					App.File.Saving = false;
				}
			},
			StartAutosaveLoop : function () {
				setInterval(function () {
					App.File.SaveProject(true);
				}, 60000)
			},
			ExportTSVs : function () {
				var TSV = require('tsv'),
					path = App.Remote.require('path');

				App.Data.Translations.forEach(function (language) {
					var lang = Object.keys(language)[0].substr(0, 2) + "-" + Object.keys(language)[0].substr(2, 2);

					//TODO(romeo): export to the correct place (settings?)
					App.File.FS.writeFileSync(path.dirname(App.File.CurrentProjectFile) + "/" + lang + ".tsv", TSV.stringify(language[Object.keys(language)[0]]));
				});
			},
			FS : null,
			CurrentProjectFile : null,
			Saving : false
		},
		Data : {
			Project : null,
			Trees : null,
			Languages : null,
			Variables : null,
			CustomVariables : null,
			Voices : null,
			Characters : null,
			GetNodeCoordinates : function (treeId, nodeId) {
				var node = App.Data.GetNodeByID(treeId, nodeId);

				return {
					X : node.editor.X,
					Y : node.editor.Y
				}
			},
			AddNode : function (x, y) {
				var newId = App.Data.Trees[App.State.CurrentTree].nodes[App.Data.Trees[App.State.CurrentTree].nodes.length - 1].id + 1;
				App.Data.Trees[App.State.CurrentTree].nodes.push({
					id : newId,
					link : -1,
					editor : {
						X : x || 0,
						Y : y || 0
					}
				});

				return newId;
			},
			UpdateNode : function (nodeElement) {
				var dataNode = App.Data.GetNodeByID(App.State.CurrentTree, nodeElement.data('id'));

				if (typeof dataNode !== 'undefined') {
					dataNode.type = nodeElement.find('select.nodetype option:selected').val();
					switch (dataNode.type) {
						case "text":
							dataNode.name = nodeElement.find('[data-type="text"] input[data-name]').val();
							dataNode.voice = nodeElement.find('[data-type="text"] select[data-voice] option:selected').val();
							App.Data.SetText(App.State.CurrentLanguage, "$T" + App.State.CurrentTree + "N" + nodeElement.data('id'), nodeElement.find('[data-type="text"] textarea[data-message]').val());
							break;
						case "set":
							dataNode.variable = nodeElement.find('[data-type="set"] select[data-variable-set] option:selected').val();
							dataNode.operation = nodeElement.find('[data-type="set"] select[data-operation] option:selected').val();

							var validation = nodeElement.find('[data-type="set"] select[data-variable-set] option:selected').data('validation');
							if (validation === "int" || validation === "string") {
								dataNode.value = nodeElement.find('[data-type="set"] input[data-' + validation + ']').val();
							} else if (validation === "bool" || validation === "character") {
								dataNode.value = nodeElement.find('[data-type="set"] select[data-' + validation + '] option:selected').val();
							}

							break;
						case "branch":
							dataNode.variable = nodeElement.find('[data-type="branch"] select[data-variable-get] option:selected').val();
							dataNode.condition = nodeElement.find('[data-type="branch"] select[data-condition] option:selected').val();

							var validation = nodeElement.find('[data-type="branch"] select[data-variable-get] option:selected').data('validation');
							if (validation === "int" || validation === "string") {
								dataNode.value = nodeElement.find('[data-type="branch"] input[data-' + validation + ']').val();
							} else if (validation === "bool" || validation === "character") {
								dataNode.value = nodeElement.find('[data-type="branch"] select[data-' + validation + '] option:selected').val();
							}

							break;
					}
				}
			},
			RemoveNode : function (id) {
				for (var i = 0; i < App.Data.Trees.length; i++) {
					if (App.Data.Trees[i].id == App.State.CurrentTree) {
						var tree = App.Data.Trees[i];
						for (var j = 0; j < tree.nodes.length; j++) {
							if (tree.nodes[j].id == id) {
								tree.nodes[j] = undefined;
							}
						}
					}
				}

				// this removes the undefined nodes
				for (var i = 0; i < App.Data.Trees.length; i++) {
					if (App.Data.Trees[i].id == App.State.CurrentTree) {
						App.Data.Trees[i].nodes = App.Data.Trees[i].nodes.filter(Boolean);
					}
				}

				App.Data.Trees[App.State.CurrentTree].nodes.forEach(function (node) {
					if (node.link == id) {
						node.link = -1;
					}

					if (node.trueLink !== undefined && node.trueLink == id) {
						delete node.trueLink;
					}

					if (node.falseLink !== undefined && node.falseLink == id) {
						delete node.falseLink;
					}
				});
			},
			Link : function (elementFrom, elementTo, isTrueLink) {
				if (isTrueLink === undefined) {
					App.Data.GetNodeByID(App.State.CurrentTree, elementFrom.data('id')).link = elementTo.data('id');
				} else {
					if (isTrueLink) {
						App.Data.GetNodeByID(App.State.CurrentTree, elementFrom.data('id')).trueLink = elementTo.data('id');
					} else {
						App.Data.GetNodeByID(App.State.CurrentTree, elementFrom.data('id')).falseLink = elementTo.data('id');
					}
				}
			},
			GetText : function (language, key) {
				for (var i = 0; i < App.Data.Translations.length; i++) {
					if (App.Data.Translations[i][language] !== undefined) {
						var lang = App.Data.Translations[i][language];
						for (var j = 0; j < lang.length; j++) {
							if (lang[j].flag == key) {
								return lang[j].content;
							}
						}
					}
				}
			},
			SetText : function (language, key, text) {
				for (var i = 0; i < App.Data.Translations.length; i++) {
					if (App.Data.Translations[i][language] !== undefined) {
						var lang = App.Data.Translations[i][language];
						for (var j = 0; j < lang.length; j++) {
							if (lang[j].flag == key) {
								lang[j].content = text
								return;
							} else if (lang[j].flag != key && j == lang.length - 1) {
								lang.push({
									"flag" : key,
									"content" : text
								});
								return;
							}
						}
					}
				}
			},
			GetNodeByID : function (treeId, nodeId) {
				for (var i = 0; i < App.Data.Trees.length; i++) {
					if (App.Data.Trees[i].id == treeId) {
						var tree = App.Data.Trees[i];
						for (var j = 0; j < tree.nodes.length; j++) {
							if (tree.nodes[j] !== undefined && tree.nodes[j].id == nodeId) {
								return tree.nodes[j];
							}
						}
					}
				}
			},
			GetCustomVariableByID : function (variableId) {
				for (var i = 0; i < App.Data.CustomVariables.length; i++) {
					if (App.Data.CustomVariables[i].id == variableId) {
						return App.Data.CustomVariables[i];
					}
				}
			},
			AddCustomVariable : function (name, validation) {
				var newId = 0;
				if (App.Data.CustomVariables.length > 0) {
					newId = App.Data.CustomVariables[App.Data.CustomVariables.length - 1].id + 1;
				}

				App.Data.CustomVariables.push({
					"displayName": name,
					"type": "custom",
					"validation" : validation,
					"set": true,
					"get": true,
					"id": newId
				});

				return newId;
			},
			RemoveCustomVariable : function (variableId) {
				for (var i = 0; i < App.Data.CustomVariables.length; i++) {
					if (App.Data.CustomVariables[i].id == variableId) {
						App.Data.CustomVariables[i] = undefined;
					}
				}

				// filters out the undefined variables
				App.Data.CustomVariables = App.Data.CustomVariables.filter(Boolean);
			},
			DuplicateCustomVariableExists : function (variableName) {
				for (var i = 0; i < App.Data.CustomVariables.length; i++) {
					if (App.Data.CustomVariables[i].displayName == variableName) {
						return true;
					}
				}

				return false;
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