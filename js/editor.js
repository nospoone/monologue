'use strict';

const $ = require('../js/lib/jquery.js');
const uuid = require('../js/editor/uuid.js');
const dialog = require('remote').require('dialog');
const fs = require('remote').require('fs');
const browserWindow = require('remote').require('browser-window').fromId(parseInt(window.location.href.split("?")[1].split("=")[1], 10));

const editor = {
	bootstrap() {
		$('#menu-bar h1').text('Monologue - Node Editor');
		editor.bindEvents();
		editor.data.createNode();
	},
	bindEvents() {
		// Drag & Drop
		$('.controls .draggable').on('dragstart', editor.events.dragstart);
		$('.node.preview .controls, .node.preview .controls .blockholder').on('dragover', editor.events.dragover);
		$('.node.preview .controls, .node.preview .controls .blockholder').on('drop', editor.events.drop);

		// Controls
		$('.node.preview .controls').on('mousedown', 'select, input, textarea', editor.subcontrols.open);
		$('section.subcontrols select').on('change', editor.subcontrols.checkEnum);
		$('.node.preview .conditions').on('mousedown mouseup click', e => {
			e.preventDefault();
			e.stopPropagation();
		});

		// Subcontrols
		$('section.buttons .up').on('click', editor.events.moveControlUp);
		$('section.buttons .down').on('click', editor.events.moveControlDown);
		$('section.buttons .delete').on('click', editor.events.deleteControl);

		// Prop changes
		$('[data-prop]', 'section.controls, section.subcontrols').on('keyup change', editor.events.onPropChange);
		$('[data-prop="type"]', 'section.controls, section.subcontrols').on('change', editor.events.changeNodeType);

		// Window controls
		$('nav#menu-bar span.close').on('click', editor.events.close);
		$('nav#menu-bar span.minimize').on('click', editor.events.minimize);
		$('nav#menu-bar span.maximize').on('click', editor.events.maximize);

		// Node controls
		$('section.controls span.open').on('click', editor.events.open);
		$('section.controls span.save').on('click', editor.events.save);
		$('section.controls span.reset').on('click', editor.events.reset);
	},
	events: {
		close() {
			require('electron').ipcRenderer.send('closeNodeEditor');
		},
		minimize() {
			browserWindow.minimize();
		},
		maximize(e) {
			if (browserWindow.isMaximized()) {
				browserWindow.unmaximize();
				$(e.target).removeClass('maximized');
			} else {
				browserWindow.maximize();
				$(e.target).addClass('maximized');
			}
		},
		open() {
			const file = dialog.showOpenDialog(browserWindow, {
				title: 'Open Node Definition...',
				properties: ['openFile'],
				filters: [
					{name: 'Monologue Node Definition', extensions: ['mnd']}
				]
			});

			if (file !== undefined) {
				editor.resetNode();
				editor.subcontrols.close();

				editor.data.fromJSON(fs.readFileSync(file[0], {encoding: 'utf8'}));
				$('select.nodetype option:selected').text(editor.data.raw.name);
				$('.controls input#name').val(editor.data.raw.name);
				$(`.control select#type option[value='${editor.data.raw.type}']`).prop('selected', true);
				editor.events.changeNodeType(null, editor.data.raw.type);

				for (let i = 0; i < editor.data.raw.fields.length; i++) {
					$('.node.preview .controls').append(editor.generateControlMarkup(editor.data.raw.fields[i].type, editor.data.raw.fields[i].id, editor.data.raw.fields[i].placeholder));
				}
			}
		},
		save() {
			const file = dialog.showSaveDialog(browserWindow, {
				title: 'Save Node Definition...',
				filters: [
					{name: 'Monologue Node Definition', extensions: ['mnd']}
				]
			});

			if (file !== undefined) {
				fs.writeFileSync(file, editor.data.getJSON());
			}
		},
		reset() {
			const confirm = dialog.showMessageBox(browserWindow, {
				type: 'warning',
				buttons: ['Yes', 'No'],
				title: 'Reset Confirmation',
				message: 'Are you sure?',
				detail: "Resetting the current node will erase all data. Work will be lost if the current node hasn't been saved."
			});

			if (confirm === 0) {
				editor.resetNode();
				editor.subcontrols.close();
			}
		},
		dragstart(e) {
			e.originalEvent.dataTransfer.setData('text/plain', $(e.target).data('type'));
		},
		dragover(e) {
			e.preventDefault();
			e.stopPropagation();

			if ($(e.target).hasClass('blockholder')) {
				return;
			}

			const target = $(e.target);
			if (target.hasClass('controls')) {
				// TODO: sorting when dragging over empty space although not super important
			} else if (e.offsetY > (target.height() / 2) && !target.next().hasClass('blockholder')) {
				$('.blockholder').remove();
				target.after(`<div class='blockholder ${e.originalEvent.dataTransfer.getData('text/plain')}'></div>`);
			} else if (e.offsetY < (target.height() / 2) && !target.prev().hasClass('blockholder')) {
				$('.blockholder').remove();
				target.before(`<div class='blockholder ${e.originalEvent.dataTransfer.getData('text/plain')}'></div>`);
			}
		},
		drop(e) {
			e.preventDefault();
			e.stopPropagation();

			const controlType = e.originalEvent.dataTransfer.getData('text/plain');
			const element = editor.generateControlMarkup(controlType);

			if ($('.blockholder').length > 0) {
				$('.blockholder').replaceWith(element);
			} else {
				$('.node.preview .controls').append(element);
			}

			editor.data.add(element.data('id'), element.index(), controlType);
		},
		onPropChange(e) {
			const newValue = ($(e.target).prop('tagName').toLowerCase() === 'select') ? $(e.target).find('option:selected').val() : $(e.target).val();
			const targetProp = $(e.target).data('prop');

			if (targetProp === 'name') {
				$('select.nodetype option:selected').text(newValue);
			}

			if (targetProp === 'placeholder') {
				if (editor.state.getCurrentControl().prop('tagName').toLowerCase() === 'select') {
					editor.state.getCurrentControl().find('[default]').text(newValue);
				} else {
					editor.state.getCurrentControl().prop('placeholder', newValue);
				}
			}

			if (targetProp === 'name' || targetProp === 'type') {
				editor.data.setProp(targetProp, newValue);
			} else {
				editor.data.setProp(targetProp, newValue, editor.state.currentControlId);
			}
		},
		moveControlUp() {
			const control = editor.state.getCurrentControl();
			if (control.prev().length > 0) {
				const swapped = control.prev().detach();
				control.after(swapped);
				editor.subcontrols.checkPrevNext();

				editor.data.setProp('position', control.index(), editor.state.currentControlId);
			}

			editor.subcontrols.setCorrectControlOrder();
		},
		moveControlDown() {
			const control = editor.state.getCurrentControl();
			if (control.next().length > 0) {
				const swapped = control.next().detach();
				control.before(swapped);
				editor.subcontrols.checkPrevNext();

				editor.data.setProp('position', control.index(), editor.state.currentControlId);
			}

			editor.subcontrols.setCorrectControlOrder();
		},
		deleteControl() {
			$(`[data-id='${editor.state.currentControlId}`).remove();
			editor.data.delete(editor.state.currentControlId);
			editor.state.currentControlId = null;
			editor.subcontrols.close();
		},
		changeNodeType(e, value) {
			const newValue = (typeof value === 'undefined') ? $(e.target).find('option:selected').val() : value;
			$('.node.preview').removeClass('normal branch set');
			$('.node.preview').addClass(newValue);
		}
	},
	generateControlMarkup(type, id, value) {
		id = (typeof id === 'undefined') ? uuid.generate() : id;

		switch (type) {
			case editor.controlType.input:
				return $(`<input data-id='${id}' data-type='${type}' type='text', placeholder='${value}' />`);
			case editor.controlType.textarea:
				return $(`<textarea data-id='${id}' data-type='${type}', placeholder='${value}'></textarea>`);
			case editor.controlType.select:
				return $(`<select class='placeholder' data-id='${id}' data-type='${type}'><option default selected>${value}</option></select>`);
			default:
				throw new Error(`Control markup generation failed: control type '${type}' non-existant.`);
		}
	},
	resetNode() {
		editor.data.reset();
		$('section#nodes .controls').empty();
		$('select.nodetype option:selected').text('');
		$('.controls input#name').val('');
		$('.control select#type option:selected').prop('selected', false);
		editor.events.changeNodeType(null, 'normal');
	},
	subcontrols: {
		open(e) {
			e.preventDefault();
			e.stopPropagation();

			editor.state.currentControlId = $(e.target).data('id');
			editor.state.currentControlType = $(e.target).data('type');
			editor.subcontrols.show(editor.state.currentControlId, editor.state.currentControlType);

			$('section.subcontrols').addClass('open');
			$('input, textarea, select', '#nodes.preview').removeClass('active');
			$(e.target).addClass('active');
		},
		close() {
			$('section.subcontrols').removeClass('open');
			$('input, textarea, select', '#nodes.preview').removeClass('active');
		},
		show(id, type) {
			$.each($('section.subcontrols [data-prop]'), (i, e) => {
				const element = $(e);
				if (element.data('prop') === 'validation') {
					element.find(`option[value='${editor.data.getProp(element.data('prop'), id)}']`).prop('selected', true);
				} else {
					element.val(editor.data.getProp(element.data('prop'), id));
				}
			});

			$.each($('section.subcontrols [data-for]'), (i, e) => {
				$(e).hide();
				const types = $(e).data('for').split(',');
				types.forEach(element => {
					if (type === element) {
						$(e).show();
					}
				});
			});

			editor.subcontrols.checkPrevNext();
			editor.subcontrols.checkEnum();
		},
		checkPrevNext() {
			$('.up, .down', 'section.subcontrols section.buttons').addClass('disabled');
			if (editor.state.getCurrentControl().prev().length > 0) {
				$('.up', 'section.subcontrols section.buttons').removeClass('disabled');
			}

			if (editor.state.getCurrentControl().next().length > 0) {
				$('.down', '.subcontrols section.buttons').removeClass('disabled');
			}
		},
		checkEnum() {
			if ($('[data-prop="validation"] option:selected').val() === 'enum') {
				$('.control[data-values]').show();
			} else {
				$('.control[data-values]').hide();
			}
		},
		setCorrectControlOrder() {
			$.each($('input, select, textarea', '.node.preview .controls'), (i, e) => {
				editor.data.setProp('position', $(e).index(), $(e).data('id'));
			});
		}
	},
	state: {
		currentControlId: -1,
		getCurrentControl() {
			return $(`[data-id='${editor.state.currentControlId}']`);
		}
	},
	data: {
		raw: [],
		createNode() {
			editor.data.raw = {
				name: '',
				type: 'normal',
				fields: []
			};
		},
		delete(id) {
			editor.data.raw.fields = editor.data.raw.fields.filter(e => {
				return e.id !== id;
			});
		},
		add(id, position, type) {
			editor.data.raw.fields.push({
				id,
				position,
				type,
				placeholder: '',
				binding: '',
				validation: (type === 'select') ? 'bool' : 'string',
				maxlength: -1,
				values: []
			});
		},
		reset() {
			editor.data.raw = {
				name: '',
				type: '',
				fields: []
			};
		},
		setProp(prop, value, id) {
			if (id === undefined) {
				editor.data.raw[prop] = value;
			} else if (prop === "maxlength" || prop === "position") {
				editor.data.raw.fields[editor.data.getControlIndexById(id)][prop] = parseInt(value, 10);
			} else if (prop === "values") {
				value = value.split('\n').filter(e => {
					return e.length > 0;
				});

				editor.data.raw.fields[editor.data.getControlIndexById(id)][prop] = value;
			} else {
				editor.data.raw.fields[editor.data.getControlIndexById(id)][prop] = value;
			}
		},
		getProp(prop, id) {
			if (id === undefined) {
				return editor.data.raw[prop];
			} else if (prop === "values") {
				return editor.data.raw.fields[editor.data.getControlIndexById(id)][prop].join('\n');
			}

			return editor.data.raw.fields[editor.data.getControlIndexById(id)][prop];
		},
		getControlIndexById(id) {
			for (const field of editor.data.raw.fields) {
				if (field.id === id) {
					return editor.data.raw.fields.indexOf(field);
				}
			}

			throw new Error(`Element with id '${id}' not found.`);
		},
		getJSON() {
			return JSON.stringify(editor.data.raw);
		},
		fromJSON(jsonString) {
			editor.data.raw = JSON.parse(jsonString);
		}
	},
	controlType: {
		input: 'input',
		textarea: 'textarea',
		select: 'select'
	}
};

$(() => {
	editor.bootstrap();
	window.editor = editor;
});
