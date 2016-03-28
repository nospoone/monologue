'use strict';

const $ = require('../js/lib/jquery.js');
const dialog = require('remote').require('dialog');
const browserWindow = require('remote').require('browser-window').getFocusedWindow();
const app = {
	bootstrap() {
		$('#splash h2').text(require('../js/modules/greetings.js').getRandomGreeting());

		app.events.bindWindowControlEvents();
		app.events.bindScrollControlEvents();
		app.events.bindMenuControlEvents();
		app.events.bindSplashEvents();
		app.events.bindNodeEvents();
		app.events.bindTreeChangeEvents();
		app.events.bindModalEvents();

		// file.startAutosaveLoop();
		$('#tool-bar select').chosen();

		// debug autoload
		// app.file.openProject(app.state, app.data, 'E:\\_dev\\monologue\\_ref\\testproject.mpf');
		// app.view.loadProject(app.state, app.data, app.events);

		app.draw.canvas.element = $('#canvas')[0];
		app.draw.canvas.context = app.draw.canvas.element.getContext('2d');
		requestAnimationFrame(app.rafLoop);
	},
	rafLoop() {
		app.draw.loop(app.state, app.data);
		requestAnimationFrame(app.rafLoop);
	},
	events: {
		bindWindowControlEvents() {
			const scope = 'nav#menu-bar';

			$('span.close', scope).on('click', () => {
				browserWindow.close();
			});

			$('span.minimize', scope).on('click', () => {
				browserWindow.minimize();
			});

			$('span.maximize', scope).on('click', e => {
				if (browserWindow.isMaximized()) {
					browserWindow.unmaximize();
					$(e.target).removeClass('maximized');
				} else {
					browserWindow.maximize();
					$(e.target).addClass('maximized');
				}
			});
		},
		bindScrollControlEvents() {
			$('canvas, section#nodes, .node header').on('mousedown', e => {
				if ($(e.target).prop('id') === 'nodes' || $(e.target).prop('id') === 'canvas') {
					app.state.dragging = true;
					$('body').addClass('dragging');

					e.preventDefault();
					e.stopPropagation();
					return false;
				} else if ($(e.target).is('header')) {
					app.state.dragging = true;
					app.state.draggedNode = $(e.target).closest('.node').data('id');

					e.preventDefault();
					e.stopPropagation();
					return false;
				}
			});

			$('canvas, section#nodes').on('mousemove', e => {
				if (($(e.target).prop('id') === 'nodes' || $(e.target).prop('id') === 'canvas') && app.state.draggedNode === null) {
					if (app.state.dragging) {
						app.state.position.x -= app.state.lastMousePosition.x - e.clientX;
						app.state.position.y -= app.state.lastMousePosition.y - e.clientY;
						app.state.dirty = true;
					}

					app.state.lastMousePosition.x = e.clientX;
					app.state.lastMousePosition.y = e.clientY;

					e.preventDefault();
					e.stopPropagation();
					return false;
				} else if ($(e.target).is('header') || app.state.draggedNode !== null) {
					if (app.state.dragging) {
						const currentDataNode = app.data.getNodeByID(app.state.currentTree, app.state.draggedNode);
						currentDataNode.editor.x -= app.state.lastMousePosition.x - e.clientX;
						currentDataNode.editor.y -= app.state.lastMousePosition.y - e.clientY;
						app.state.dirty = true;
					}

					app.state.lastMousePosition.x = e.clientX;
					app.state.lastMousePosition.y = e.clientY;
					app.state.dirty = true;

					e.preventDefault();
					e.stopPropagation();
					return false;
				}
			});

			$('canvas, section#nodes').on('mousemove', e => {
				app.state.linkMousePosition.x = e.clientX;
				app.state.linkMousePosition.y = e.clientY;
			});

			$('canvas, section#nodes').on('mouseup', e => {
				app.state.dragging = false;
				app.state.draggedNode = null;
				$('body').removeClass('dragging');

				e.preventDefault();
				e.stopPropagation();
				return false;
			});

			$('canvas, section#nodes, .node header').on('dblclick', e => {
				if ($(e.target).prop('id') === 'nodes' || $(e.target).prop('id') === 'canvas') {
					app.view.addNode(app.state.currentTree, app.data, app.events, e.clientX - app.state.position.x - 100, e.clientY - app.state.position.y - 45);
					app.state.dirty = true;
				}
			});

			$(window).on('mousewheel', e => {
				if ($(e.target).prop('id') === 'nodes' || $(e.target).prop('id') === 'canvas') {
					if (e.originalEvent.wheelDelta < 0) {
						app.state.zoom -= app.state.zoom * 0.05;
					} else {
						app.state.zoom += app.state.zoom * 0.05;
					}

					// replace with some kind of clamp?
					if (app.state.zoom < 0.5) {
						app.state.zoom = 0.5;
					} else if (app.state.zoom > 1) {
						app.state.zoom = 1;
					}

					app.state.dirty = true;
				}
			});
		},
		bindMenuControlEvents() {
			const scope = 'nav#tool-bar ';
			let subscope = '';

			$('.menu', scope + subscope).on('click', e => {
				$(e.target).closest('.menu').toggleClass('open');
				app.view.displayAnimate($('.dropdown'), 'shown', 'open');
			});

			$('.node-menu', scope + subscope).on('click', e => {
				$(e.target).closest('.node-menu').toggleClass('open');
				app.view.displayAnimate($('.node-dropdown'), 'shown', 'open');
			});

			subscope = '.dropdown';
			$('.save-project', scope + subscope).on('click', () => {
				app.file.saveProject(app.data, app.view, app.state);
				$('nav#tool-bar .menu').click();
			});

			$('.variables', scope + subscope).on('click', () => {
				app.view.showModal(app.view, '.variable-settings');
				$('nav#tool-bar .menu').click();
			});

			$('select.languages').chosen().change(e => {
				app.view.changeLanguage(app.state, app.data, $(e.target).find(':selected').val());
			});

			subscope = '.node-dropdown';
			$('.tree-settings', scope + subscope).on('click', () => {
				app.view.showModal(app.view, '.trees');
				$('nav#tool-bar .node-menu').click();
			});
		},
		bindSplashEvents() {
			const scope = 'div#splash';
			$('span.open', scope).on('click', e => {
				const file = dialog.showOpenDialog(browserWindow, {
					title: 'Open Project...',
					properties: ['openFile'],
					filters: [
						{name: 'Monologue Project File', extensions: ['mpf']}
					]
				});

				if (file !== undefined) {
					app.file.openProject(app.state, app.data, file[0]);
					app.view.loadProject(app.state, app.data, app.events);
				}

				e.preventDefault();
				e.stopPropagation();
				return false;
			});
		},
		bindNodeEvents() {
			$('section#nodes, .modal').on('change blur', 'select', e => {
				if ($(e.target).find(':selected').val() === 'placeholder') {
					$(e.target).addClass('placeholder');
				}
			});

			$('section#nodes, .modal').on('click', 'select', e => {
				$(e.target).removeClass('placeholder');
			});

			$('section#nodes').on('change', 'select.nodetype', e => {
				const newType = $(e.target).find(':selected').val();
				const parent = $(e.target).closest('.node');

				parent.find('.controls:not(.hidden)').addClass('hidden');
				parent.find(`.controls[data-type='${newType}']`).removeClass('hidden');

				if (newType === 'branch' && parent.find('span.connectTo').length < 2) {
					parent.find('.links').append('<span class="connectTo"></span>');
					parent.addClass('branch');
				} else if (newType !== 'branch' && parent.find('span.connectTo').length > 1) {
					parent.find('.links span.connectTo').last().remove();
					parent.removeClass('branch');
				}

				app.data.updateNode(app.state, parent);
			});

			$('section#nodes').on('change', '.controls input, .controls textarea, .controls select', e => {
				app.data.updateNode(app.state, $(e.target).closest('.node'));
			});

			$('section#nodes').on('focus', '.controls input, .controls textarea, .controls select', e => {
				$(e.target).addClass('dirty');
			});

			$('section#nodes').on('click', '.links span.connectTo', e => {
				app.state.link.linking = true;
				app.state.link.isTrueLink = undefined;
				app.state.link.linkingFrom = $(e.target).closest('.node');

				if (app.state.link.linkingFrom.hasClass('branch')) {
					app.state.link.isTrueLink = $(e.target).index() === 0 || $(e.target).index() === 2;
				}

				e.preventDefault();
				e.stopPropagation();
				return false;
			});

			$('section#nodes').on('click', 'span.remove-node', e => {
				app.view.removeNode(app.state, app.data, $(e.target).closest('.node'));

				e.preventDefault();
				e.stopPropagation();
				return false;
			});

			$('section#nodes').on('mouseenter', '.links span.connectFromTrigger, .links span.connectFrom', e => {
				if (app.state.link.linking) {
					app.state.link.linkTarget = $(e.target).closest('.node');
				}
			});

			$('section#nodes').on('mouseleave', '.links span.connectFromTrigger, .links span.connectFrom', () => {
				app.state.link.linkTarget = null;
			});

			$('section#nodes').on('click', '.links span.connectFromTrigger, .links span.connectFrom', () => {
				if (app.state.link.linking) {
					if (app.state.link.linkingFrom.hasClass('branch')) {
						app.data.link(app.state);
					} else {
						app.data.link(app.state);
					}

					app.state.link.linking = false;
					app.state.link.linkingFrom = null;
					app.state.link.linkTarget = null;
				}
			});
		},
		bindTreeChangeEvents() {
			$('select.trees').chosen().change(e => {
				const treeId = $(e.target).find(':selected').data('tree');

				if (treeId === undefined) {
					$('section#nodes .tree').addClass('hidden');
					app.state.currentTree = -1;
				} else {
					app.state.currentTree = treeId;
					$('section#nodes .tree').addClass('hidden');
					$(`section#nodes .tree[data-id='${treeId}']`).removeClass('hidden');
				}

				app.state.dirty = true;
			});
		},
		bindModalEvents() {
			// VARIABLE SETTINGS
			const variableSettings = '.variable-settings';
			const validCharsRegex = new RegExp(/^[a-zA-ZÀ-ÿ0-9 ]+$/);

			$('select[data-project-variables]', variableSettings).on('change', () => {
				if ($('select[data-project-variables] option:selected', variableSettings).length > 0) {
					$('span.remove-variable', variableSettings).removeClass('disabled');
				} else {
					$('span.remove-variable', variableSettings).addClass('disabled');
				}
			});

			$('span.add-variable', variableSettings).on('click', () => {
				const variableNameInput = $('input[data-project-new-variable]', variableSettings);
				const variableName = variableNameInput.val();

				$('span.error', variableSettings).addClass('hidden');
				variableNameInput.removeClass('error');

				if (variableName.length > 0) {
					if (validCharsRegex.test(variableName)) {
						if (app.data.duplicateCustomVariableExists(variableName)) {
							variableNameInput.addClass('error').focus();
							$('span.error.duplicate', variableSettings).removeClass('hidden');
						} else {
							const newId = app.data.addCustomVariable(variableName, $('select[data-project-new-variable-type] option:selected', variableSettings).val());
							$('select[data-project-variables]').append(`<option value='${newId}'>${variableName}</option>`);
							variableNameInput.val('').trigger('blur');
						}
					} else {
						variableNameInput.addClass('error').focus();
						$('span.error.invalid', variableSettings).removeClass('hidden');
					}
				} else {
					variableNameInput.addClass('error').focus();
					$('span.error.empty', variableSettings).removeClass('hidden');
				}
			});

			$('span.remove-variable', variableSettings).on('click', () => {
				if ($('select[data-project-variables] option:selected', variableSettings).length > 0) {
					app.data.removeCustomVariable(parseInt($('select[data-project-variables] option:selected', variableSettings).val(), 10));
					$('select[data-project-variables] option:selected', variableSettings).remove();
					$('select[data-project-variables]', variableSettings).trigger('change');
				}
			});

			$('span.close', variableSettings).on('click', () => {
				app.view.hideModal(app.view);
				if ($('select[data-project-variables]', variableSettings).find('option:selected').length > 0) {
					$('select[data-project-variables]', variableSettings).find('option:selected').prop('selected', false);
					$('select[data-project-variables]', variableSettings).trigger('change');
				}
			});

			// TREES
			const trees = '.modal.trees';
			$('span.close', trees).on('click', () => {
				app.view.hideModal(app.view);
				if ($('select[data-project-trees]', trees).find('option:selected').length > 0) {
					$('select[data-project-trees]', trees).find('option:selected').prop('selected', false);
					$('select[data-project-trees]', trees).trigger('change');
				}
			});

			$('select[data-project-trees]', trees).on('change', () => {
				if ($('select[data-project-trees] option:selected', trees).length > 0) {
					$('span.remove-tree', trees).removeClass('disabled');
				} else {
					$('span.remove-tree', trees).addClass('disabled');
				}
			});

			$('span.remove-tree', trees).on('click', () => {
				if ($('select[data-project-trees] option:selected', trees).length > 0) {
					app.data.removeTree(app.state, parseInt($('select[data-project-trees] option:selected', trees).data('tree'), 10));
					$('select[data-project-trees] option:selected', trees).remove();
					$('select[data-project-trees]', trees).trigger('change');
				}
			});

			$('span.add-tree', trees).on('click', () => {
				const treeNameInput = $('input[data-project-new-tree]', trees);
				const treeCategory = $('select[data-new-tree-category] option:selected', trees).val();
				const treeName = treeNameInput.val();

				$('span.error', trees).addClass('hidden');
				treeNameInput.removeClass('error');

				if (treeName.length > 0) {
					if (validCharsRegex.test(treeName)) {
						if (app.data.duplicateTreeExists(treeName, treeCategory)) {
							treeNameInput.addClass('error').focus();
							$('span.error.duplicate', trees).removeClass('hidden');
						} else {
							const newId = app.data.addTree(treeName, treeCategory);
							$(`select[data-project-trees] optgroup[data-tree-category-id='${treeCategory}']`, trees).append(`<option data-tree='${newId}'>${treeName}</option>`);
							app.view.addNode(newId, app.data, app.events, 0, 0);
							treeNameInput.val('').trigger('blur');
						}
					} else {
						treeNameInput.addClass('error').focus();
						$('span.error.invalid', trees).removeClass('hidden');
					}
				} else {
					treeNameInput.addClass('error').focus();
					$('span.error.empty', trees).removeClass('hidden');
				}
			});
		},
		nodeSelectChange(select, resetValues) {
			select = (select !== undefined && select.type !== 'change') ? select : $(this);
			resetValues = (resetValues === undefined) ? true : resetValues;
			const validation = select.find('option:selected').data('validation');

			select.parent().find('[data-validates]').hide();
			select.parent().find(`[data-${validation}]`).show();

			if (resetValues) {
				select.parent().find('option[data-validates]').prop('selected', false);
				select.parent().find('select[data-operation] option[default], select[data-character] option[default], select[data-condition] option[default], select[data-bool] option[default]').prop('selected', 'selected').blur();
				select.parent().find('input[type=text]').val('');
			}
		}
	},
	draw: require('../js/modules/draw.js'),
	view: require('../js/modules/view.js'),
	file: require('../js/modules/file.js'),
	data: require('../js/modules/data.js'),
	state: {
		position: {
			x: 0,
			y: 0
		},
		lastMousePosition: {
			x: 0,
			y: 0
		},
		linkMousePosition: {
			x: 0,
			y: 0
		},
		link: {
			linking: false,
			linkingFrom: null,
			linkTarget: null
		},
		zoom: 1,
		dragging: false,
		draggedNode: null,
		currentTree: 0,
		currentLanguage: 'enUS'
	}
};

$(() => {
	app.bootstrap();
	window.app = app;
});
