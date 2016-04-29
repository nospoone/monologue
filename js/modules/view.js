'use strict';

const $ = require('../../js/lib/jquery.js');
let nodeMarkupCache = [];

module.exports = {
	loadProject(state, data, events, nodes) {
		this.animateWithCallback($('#splash .content'), 'shown', () => {
			this.animateWithCallback($('#splash .icon'), 'shown', () => {
				$('h1').text(`Monologue - ${data.project.name}`);

				nodes.init(data.nodes);
				nodeMarkupCache = nodes.getMarkupArray(data);
				this.generateTreesCategories(data);
				this.generateTrees(state, data);
				this.generateLanguages(data);
				this.generateNodes(state, data, events, nodes);
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
	generateNodes(state, data, events, nodes) {
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
				e.type = (e.type === undefined) ? 'text' : e.type;
				const node = this.generateNodeMarkup(e, $('.node.template').clone().removeClass('template'), i, nodes);
				node.data('id', e.id);
				node.find(`select.nodetype option[value='${e.type}']`).attr('selected', 'selected');
				events.nodeSelectChange(node.find('select[data-variable-get]').chosen({width: '100%'}).change(events.nodeSelectChange), false);
				events.nodeSelectChange(node.find('select[data-variable-set]').chosen({width: '100%'}).change(events.nodeSelectChange), false);
				node.appendTo(tree);
			});
		});
	},
	generateNodeMarkup(nodeData, nodeElement, index, nodes) {
		nodeElement.find('.controls').empty();
		nodeElement.find('.controls').removeClass('empty');
		nodeElement.removeClass('normal branch set');

		if (typeof nodeMarkupCache[nodeData.type] !== 'undefined' && nodeMarkupCache[nodeData.type].length > 0) {
			for (const field of nodeMarkupCache[nodeData.type]) {
				nodeElement.find('.controls').append(field.clone());
			}
		} else {
			nodeElement.find('.controls').addClass('empty');
		}

		if (index === 0) {
			nodeElement.find('span.remove-node').remove();
			nodeElement.find('span.connectFrom, span.connectFromTrigger').remove();
		}

		if (nodes.getNodeById(nodeData.type).type === 'branch') {
			nodeElement.addClass('branch');
		} else if (nodes.getNodeById(nodeData.type).type === 'set') {
			nodeElement.addClass('set');
		} else {
			nodeElement.addClass('normal');
		}

		return nodeElement;
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
			$("select[data-project-variables]").append(`<option data-validation='${variable.validation}' value='${variable.id}'>${variable.displayName}</option>`);
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
