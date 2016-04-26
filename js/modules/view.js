'use strict';

const $ = require('../../js/lib/jquery.js');
let nodeMarkupCache = [];

module.exports = {
	loadProject(state, data, events, nodes) {
		this.animateWithCallback($('#splash .content'), 'shown', () => {
			this.animateWithCallback($('#splash .icon'), 'shown', () => {
				$('h1').text(`Monologue - ${data.project.name}`);

				nodeMarkupCache = nodes.getMarkupArray(data);
				this.generateTreesCategories(data);
				this.generateTrees(state, data);
				this.generateLanguages(data);
				this.generateNodes(state, data, events);
				this.generateModalInformations(data);
				state.dirty = true;

				this.animateWithCallback($('#splash'), 'shown', () => {
					$('#splash').addClass('gone');
				});
			});
		}, true);
	},
	displayAnimate(element, blockClass, opacityClass) {
		element.toggleClass(blockClass);
		setTimeout(() => {
			element.toggleClass(opacityClass);
		}, 1);
	},
	animateWithCallback(element, cssClass, callback, remove) {
		remove = remove || false;

		if (remove) {
			element.one("webkitTransitionEnd", callback).removeClass(cssClass);
		} else {
			element.one("webkitTransitionEnd", callback).addClass(cssClass);
		}
	},
	showStatusMessage(message) {
		$('#status-bar span.message').text(message);
		this.animateWithCallback($('#status-bar'), 'hidden', () => {
			setTimeout(() => {
				$('#status-bar').addClass('hidden');
			}, 1000);
		}, true);
	},
	generateNodes(state, data, events) {
		data.variables.forEach(variable => {
			if (variable.set) {
				$(`.node.template select[data-variable-set]`).append(`<option data-validation='${variable.validation}' value='${variable.id}'>${variable.displayName}</option>`).trigger("chosen:updated");
			}

			if (variable.get) {
				$(`.node.template select[data-variable-get]`).append(`<option data-validation='${variable.validation}' value='${variable.id}'>${variable.displayName}</option>`).trigger("chosen:updated");
			}
		});

		$.each($('section#nodes .tree'), (key, element) => {
			const tree = $(element);

			data.getTreeByID(parseInt(tree.data('id'), 10)).nodes.forEach((e, i) => {
				const node = $('.node.template').clone().removeClass('template');

				e.type = (e.type === undefined) ? 'text' : e.type;
				node.data('id', e.id);
				node.find(`select.nodetype option[value='${e.type}']`).attr('selected', 'selected');

				console.log(nodeMarkupCache[e.type]);
				/*
				if (e.type === 'text') {
					node.find('[data-type="text"] input[data-name]').val(e.name);
					node.find(`[data-type='text'] select[data-voice] option[value='${e.voice}']`).prop('selected', 'selected');
					node.find('[data-type="text"] textarea[data-message]').val(data.getText(state.currentLanguage, `$T${tree.data('id')}N${e.id}`));
				} else if (e.type === 'branch') {
					node.addClass('branch');
					node.find('.links').append('<span class="connectTo"></span>');

					if (e.variable !== undefined && e.variable !== '') {
						node.find(`[data-type='branch'] select[data-variable-get] option[value='${e.variable}']`).prop('selected', 'selected');
						if (e.value !== undefined && node.find(`[data-type='branch'] select[data-variable-get] option[value='${e.variable}']`).length > 0) {
							const variable = node.find(`[data-type='branch'] select[data-variable-get] option[value='${e.variable}']`);

							switch (variable.data('validation')) {
								case 'int':
								case 'string':
									node.find(`[data-type='branch'] input[data-${variable.data('validation')}]`).val(e.value);
									break;
								case 'bool':
								case 'character':
									node.find(`[data-type='branch'] select[data-${variable.data('validation')}] option[value='${e.value}']`).prop("selected", "selected").parent().removeClass('placeholder');
									break;
								default:
									throw new Error('Error while generating nodes: Invalid validation type.');
							}
						}
					}

					if (e.condition !== undefined) {
						node.find(`[data-type='branch'] select[data-condition] option[value='${e.condition}']`).prop('selected', 'selected').parent().removeClass('placeholder');
					}
				} else if (e.type === 'set') {
					if (e.variable !== undefined && e.variable !== '') {
						node.find(`[data-type='set'] select[data-variable-set] option[value='${e.variable}']`).prop('selected', 'selected').parent().removeClass('placeholder');
						if (e.value !== undefined && node.find(`[data-type='set'] select[data-variable-set] option[value='${e.variable}']`).length > 0) {
							const variable = node.find(`[data-type='set'] select[data-variable-set] option[value='${e.variable}']`);
							switch (variable.data('validation')) {
								case 'int':
								case 'string':
									node.find(`[data-type='set'] input[data-${variable.data('validation')}]`).val(e.value);
									break;
								case 'bool':
								case 'character':
									node.find(`[data-type='set'] select[data-${variable.data('validation')}] option[value='${e.value}']`).prop('selected', 'selected');
									node.find(`[data-type='set'] select[data-${variable.data('validation')}] option[value='${e.value}']`).prop('selected', 'selected').parent().removeClass('placeholder');
									break;
								default:
									throw new Error('Error while generating nodes: Invalid validation type.');
							}
						}
					}

					if (e.operation !== undefined) {
						node.find(`[data-type='set'] select[data-operation] option[value='${e.operation}']`).prop('selected', 'selected').parent().removeClass('placeholder');
					}
				}
				*/

				if (i === 0) {
					node.find('span.remove-node').remove();
					node.find('span.connectFrom, span.connectFromTrigger').remove();
				}

				events.nodeSelectChange(node.find('select[data-variable-get]').chosen({width: '100%'}).change(events.nodeSelectChange), false);
				events.nodeSelectChange(node.find('select[data-variable-set]').chosen({width: '100%'}).change(events.nodeSelectChange), false);

				node.appendTo(tree);
			});
		});
	},
	generateTrees(state, data) {
		data.treeCategories.forEach(treeCategory => {
			// double quotes as quickfix to escape ' in tree names
			$('select.trees').append(`<optgroup label="${treeCategory.displayName}" data-tree-category-id='${treeCategory.id}'></optgroup>`);
		});

		data.trees.forEach(tree => {
			const visibility = (state.currentTree === tree.id) ? '' : ' hidden';
			$('section#nodes').append(`<section class='tree${visibility}' data-id='${tree.id}'></section>`);

			if (state.currentTree === tree.id) {
				$(`select.trees optgroup[data-tree-category-id='${tree.categoryId}']`).append(`<option data-tree='${tree.id}' selected='selected'>${tree.displayName}</option>`);
			} else {
				$(`select.trees optgroup[data-tree-category-id='${tree.categoryId}']`).append(`<option data-tree='${tree.id}'>${tree.displayName}</option>`);
			}

			$.each($('select[data-project-trees] optgroup'), (key, element) => {
				if (parseInt($(element).data('tree-category-id'), 10) === parseInt(tree.categoryId, 10)) {
					$(element).append(`<option data-tree='${tree.id}'>${tree.displayName}</option>`);
				}
			});
		});

		$('select.trees').trigger('chosen:updated');
	},
	addNode(treeId, data, events, x, y) {
		const newId = data.addNode(treeId, x, y);
		const node = $('.node.template').clone().removeClass('template').data('id', newId);

		node.appendTo(`section#nodes .tree[data-id='${treeId}']`);
		events.nodeSelectChange(node.find('select[data-variable-get]').chosen({width: '100%'}).change(events.nodeSelectChange));
		events.nodeSelectChange(node.find('select[data-variable-set]').chosen({width: '100%'}).change(events.nodeSelectChange));
		node.find('select[data-voice]').chosen({width: '100%'});

		if (newId === 0) {
			node.find('span.remove-node').remove();
			node.find('span.connectFrom, span.connectFromTrigger').remove();
		}
	},
	generateLanguages(data) {
		data.project.languages.forEach(language => {
			$(`<option value="${language.code}">${language.displayName}</option>`).appendTo('select.languages');
		});

		$('select.languages').trigger('chosen:updated');
	},
	changeLanguage(state, data, newLanguage) {
		$.each($('section#nodes .tree .node select.nodetype option[value="text"]:selected'), (key, element) => {
			$(element).closest('.node').find('textarea').val(data.getText(newLanguage, `$T${$(element).closest('.tree').data('id')}N${$(element).closest('.node').data('id')}`));
		});

		state.currentLanguage = newLanguage;
	},
	generateModalInformations(data) {
		$("input[data-project-title]").val(data.project.name);

		data.variables.forEach(variable => {
			$("select[data-project-variables]").append(`<option value='${variable.id}'>${variable.displayName}</option>`);
		});
	},
	generateTreesCategories(data) {
		data.treeCategories.forEach(tree => {
			// double quotes for escaping singles in tree names (gotta sanitize here)
			$("select[data-project-trees]").append(`<optgroup label="${tree.displayName}" data-tree-category-id='${tree.id}'></optgroup>`);
			$("select[data-new-tree-category]").append(`<option value='${tree.id}'>${tree.displayName}</option>`);
		});
	},
	removeNode(state, data, nodeElement) {
		data.removeNode(state, nodeElement.data("id"));
		nodeElement.remove();
	},
	showModal(view, modalClass) {
		$(".overlay").removeClass("invisible");

		setTimeout(() => {
			view.animateWithCallback($(".overlay"), "hidden", () => {
				view.displayAnimate($(modalClass), "invisible", "hidden");
			}, true);
		}, 1);
	},
	hideModal(view) {
		view.animateWithCallback($(".overlay"), "hidden", () => {
			$(".overlay").addClass("invisible");
			$(".overlay .modal").addClass("invisible hidden");
		});
	}
};
