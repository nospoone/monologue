'use strict';

const $ = require('../js/lib/jquery.js');
const uuid = require('../js/editor/uuid.js');

const editor = {
	bootstrap() {
		$('#menu-bar h1').text('Monologue - Node Editor');
		editor.bindEvents();
		editor.data.createNode();
	},
	bindEvents() {
		// node name
		$('.controls [data-node-name]').on('change keyup', () => {
			$('.preview [data-node-name]').text($('.controls [data-node-name]').val());
		});

		// Drag & Drop
		$('.controls .draggable').on('dragstart', editor.events.dragstart);
		$('.node.preview .controls, .node.preview .controls .blockholder').on('dragover', editor.events.dragover);
		$('.node.preview .controls, .node.preview .controls .blockholder').on('drop', editor.events.drop);

		// Controls
		$('.node.preview .controls').on('mousedown', 'select, input, textarea', editor.subcontrols.open);
		$('section.subcontrols select').on('change', editor.subcontrols.checkEnum);

		// Subcontrols
		$('section.buttons .up').on('click', editor.events.moveControlUp);
		$('section.buttons .down').on('click', editor.events.moveControlDown);
		$('section.buttons .delete').on('click', editor.events.deleteControl);

		// Prop changes
		$('[data-prop]', 'section.controls, section.subcontrols').on('change', editor.events.onPropChange);
	},
	events: {
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
				// TODO: when dragging over empty space
				// although not super important
			} else if (e.offsetY > (target.height() / 2) && !target.next().hasClass('blockholder')) {
				// dropping after the target
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

			editor.data.add(element.data('id'));
		},
		onPropChange(e) {
			console.log($(e.target).data('prop'));
		},
		moveControlUp() {
			if (editor.state.getCurrentControl().prev().length > 0) {
				const swapped = editor.state.getCurrentControl().prev().detach();
				editor.state.getCurrentControl().after(swapped);
				editor.subcontrols.checkPrevNext();
			}
		},
		moveControlDown() {
			if (editor.state.getCurrentControl().next().length > 0) {
				const swapped = editor.state.getCurrentControl().next().detach();
				editor.state.getCurrentControl().before(swapped);
				editor.subcontrols.checkPrevNext();
			}
		},
		deleteControl() {
			$(`[data-id='${editor.state.currentControlId}`).remove();
			editor.data.delete(editor.state.currentControlId);
			editor.state.currentControlId = null;
			editor.subcontrols.close();
		}
	},
	generateControlMarkup(type) {
		switch (type) {
			case editor.controlType.input:
				return $(`<input data-id='${uuid.generate()}' data-type='${type}' type='text' />`);
			case editor.controlType.textarea:
				return $(`<textarea data-id='${uuid.generate()}' data-type='${type}'></textarea>`);
			case editor.controlType.select:
				return $(`<select data-id='${uuid.generate()}' data-type='${type}'></select>`);
			default:
				throw new Error(`Control markup generation failed: control type '${type}' non-existant.`);
		}
	},
	subcontrols: {
		open(e) {
			e.preventDefault();
			e.stopPropagation();

			editor.state.currentControlId = $(e.target).data('id');
			editor.state.currentControlType = $(e.target).data('type');
			editor.subcontrols.show(editor.state.currentControlType);

			$('section.subcontrols').addClass('open');
			$('input, textarea, select', '#nodes.preview').removeClass('active');
			$(e.target).addClass('active');
		},
		close() {
			$('section.subcontrols').removeClass('open');
			$('input, textarea, select', '#nodes.preview').removeClass('active');
		},
		show(type) {
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
			if ($('[data-validation] option:selected').val() === 'enum') {
				$('.control[data-values]').show();
			} else {
				$('.control[data-values]').hide();
			}
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
				id: '',
				name: '',
				type: '',
				fields: [],
				conditions: []
			};
		},
		delete(id) {
			editor.data.raw.fields = editor.data.raw.fields.filter(e => {
				return e.id !== id;
			});
		},
		add(id) {
			editor.data.raw.fields.push({
				id,
				position: '',
				label: '',
				binding: '',
				type: '',
				validation: '',
				maxlength: -1,
				values: []
			});
		},
		prop(prop, value, id) {
			if (id === undefined) {
				editor.data.raw[prop] = value;
			} else {
				editor.data.raw.fields[editor.data.getControlIndexById(id)][prop] = value;
			}
		},
		getControlIndexById(id) {
			for (const field of editor.data.raw.fields) {
				if (field.id === id) {
					return editor.data.raw.fields.indexOf(field);
				}
			}

			throw new Error(`Element with id '${id}' not found.`);
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
