'use strict';

const $ = require('../../js/lib/jquery.js');

module.exports = {
	project: null,
	trees: null,
	treeCategories: null,
	variables: null,
	nodes: [],
	getNodeCoordinates(treeId, nodeId) {
		const node = this.getNodeByID(treeId, nodeId);

		return {
			x: node.editor.x,
			y: node.editor.y
		};
	},
	addNode(treeId, x, y) {
		const currentTree = this.getTreeByID(treeId);

		let newId = 0;
		if (currentTree.nodes.length > 0) {
			newId = currentTree.nodes[currentTree.nodes.length - 1].id + 1;
		}

		currentTree.nodes.push({
			id: newId,
			editor: {
				x: x || 0,
				y: y || 0
			}
		});

		return newId;
	},
	changeNode(state, nodeElement, newType) {
		const dataNodeId = nodeElement.data('id');
		const dataNode = this.getNodeByID(state.currentTree, dataNodeId);

		this.unlink(state, dataNodeId);
		delete dataNode.conditions;
		delete dataNode.elements;
		dataNode.type = newType;
	},
	updateNode(state, nodeElement, nodes) {
		const dataNodeId = nodeElement.data('id');
		const dataNode = this.getNodeByID(state.currentTree, dataNodeId);

		if (typeof dataNode !== 'undefined') {
			dataNode.type = nodeElement.find('select.nodetype option:selected').val();
			const nodeType = nodes.getNodeById(dataNode.type).type;

			dataNode.elements = {};
			$.each(nodeElement.find('.controls [data-binding]'), (i, e) => {
				switch ($(e).prop('tagName')) {
					case 'INPUT':
						dataNode.elements[$(e).data('binding')] = $(e).val();
						break;
					case 'TEXTAREA':
						this.setText(state.currentLanguage, `$T${state.currentTree}N${dataNodeId}E${i}`, $(e).val());
						dataNode.elements[$(e).data('binding')] = `$T${state.currentTree}N${dataNodeId}E${i}`;
						break;
					case 'SELECT':
						dataNode.elements[$(e).data('binding')] = ($(e).find('option:selected').val() === 'placeholder') ? '' : $(e).find('option:selected').val();
						break;
					default:
						break;
				}
			});

			if (nodeType === 'branch') {
				dataNode.nodetype = 'branch';
				dataNode.conditions = dataNode.conditions || [];
				$.each(nodeElement.find('.conditions .branch .value'), (i, e) => {
					dataNode.conditions[i] = dataNode.conditions[i] || {};
					dataNode.conditions[i].variable = $(e).parent().find('select[data-variable-get] option:selected').val();
					dataNode.conditions[i].condition = $(e).find('select[data-condition] option:selected').val();

					const validation = $(e).parent().find('select[data-variable-get] option:selected').data('validation');

					if (validation === 'int') {
						dataNode.conditions[i].value = $(e).find('input[data-int]').val();
					} else if (validation === 'string') {
						dataNode.conditions[i].value = $(e).find('input[data-string]').val();
					} else if (validation === 'bool') {
						dataNode.conditions[i].value = $(e).find('select[data-bool] option:selected').val();
					} else if (validation === 'enum') {
						dataNode.conditions[i].value = $(e).find('select[data-enum] option:selected').val();
					}
				});
			} else if (nodeType === 'set') {
				dataNode.nodetype = 'set';
				dataNode.set = {
					variable: nodeElement.find('.set select[data-variable-set] option:selected').val(),
					operation: nodeElement.find('.set .value select[data-operation] option:selected').val()
				};

				const validation = nodeElement.find('.set select[data-variable-set] option:selected').data('validation');
				if (validation === 'int') {
					dataNode.set.value = nodeElement.find('.set .value input[data-int]').val();
				} else if (validation === 'string') {
					dataNode.set.value = nodeElement.find('.set .value input[data-string]').val();
				} else if (validation === 'bool') {
					dataNode.set.value = nodeElement.find('.set .value select[data-bool] option:selected').val();
				} else if (validation === 'enum') {
					dataNode.set.value = nodeElement.find('.set .value select[data-enum] option:selected').val();
				}
			} else {
				dataNode.nodetype = 'normal';
			}
		}
	},
	removeNode(state, id) {
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].id === state.currentTree) {
				const tree = this.trees[i];
				for (let j = 0; j < tree.nodes.length; j++) {
					if (tree.nodes[j].id === id) {
						tree.nodes[j] = undefined;
					}
				}
			}
		}

		// this removes the undefined nodes
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].id === state.currentTree) {
				this.trees[i].nodes = this.trees[i].nodes.filter(Boolean);
			}
		}

		this.trees[state.currentTree].nodes.forEach(node => {
			if (typeof node.conditions !== 'undefined' && node.conditions.length > 0) {
				for (const condition of node.conditions) {
					if (typeof condition.link !== 'undefined' && condition.link === id) {
						condition.link = -1;
					}
				}
			}
		});
	},
	// removes all links from/to this node
	unlink(state, id) {
		this.trees[state.currentTree].nodes.forEach(node => {
			if (typeof node.conditions !== 'undefined' && node.conditions.length > 0) {
				for (const condition of node.conditions) {
					if (condition !== null && typeof condition.link !== 'undefined' && condition.link === id) {
						condition.link = -1;
					}
				}
			}
		});
	},
	link(state, nodes) {
		const nodeFrom = this.getNodeByID(state.currentTree, state.link.linkingFrom.data('id'));
		nodeFrom.conditions = nodeFrom.conditions || [];
		nodeFrom.conditions[state.link.linkIndex] = {};
		nodeFrom.conditions[state.link.linkIndex].link = state.link.linkTarget.data('id');
		this.updateNode(state, state.link.linkingFrom, nodes);
	},
	bumpLinks(state, id, elseLinked) {
		const nodeFrom = this.getNodeByID(state.currentTree, id);
		if (typeof nodeFrom.conditions === 'undefined') {
			nodeFrom.conditions = [];
		} else if (elseLinked) {
			nodeFrom.conditions[nodeFrom.conditions.length] = nodeFrom.conditions[nodeFrom.conditions.length - 1];
			nodeFrom.conditions[nodeFrom.conditions.length - 2] = undefined;
		} else {
			nodeFrom.conditions.push(undefined);
		}
	},
	getText(language, key) {
		for (let i = 0; i < this.translations.length; i++) {
			if (this.translations[i][language] !== undefined) {
				const lang = this.translations[i][language];
				for (let j = 0; j < lang.length; j++) {
					if (lang[j].flag === key) {
						return lang[j].content;
					}
				}
			}
		}
	},
	setText(language, key, text) {
		for (let i = 0; i < this.translations.length; i++) {
			if (this.translations[i][language] !== undefined) {
				const lang = this.translations[i][language];
				for (let j = 0; j < lang.length; j++) {
					if (lang[j].flag === key) {
						lang[j].content = text;
						return;
					} else if (lang[j].flag !== key && j === lang.length - 1) {
						lang.push({flag: key, content: text});
						return;
					}
				}
			}
		}
	},
	getNodeByID(treeId, nodeId) {
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].id === treeId) {
				const tree = this.trees[i];
				for (let j = 0; j < tree.nodes.length; j++) {
					if (tree.nodes[j] !== undefined && tree.nodes[j].id === nodeId) {
						return tree.nodes[j];
					}
				}
			}
		}
	},
	getTreeByID(treeId) {
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].id === treeId) {
				return this.trees[i];
			}
		}
	},
	getVariableByID(variableId) {
		for (let i = 0; i < this.variables.length; i++) {
			if (this.variables[i].id === variableId) {
				return this.variables[i];
			}
		}
	},
	addVariable(displayName, validation, get, set) {
		let id = 0;
		if (this.variables.length > 0) {
			id = this.variables[this.variables.length - 1].id + 1;
		}

		this.variables.push({
			displayName,
			validation,
			set,
			get,
			id
		});

		return id;
	},
	removeVariable(variableId) {
		for (let i = 0; i < this.variables.length; i++) {
			if (this.variables[i].id === variableId) {
				this.variables[i] = undefined;
			}
		}

		// filters out the undefined variables
		this.variables = this.variables.filter(Boolean);
	},
	duplicateVariableExists(variableName) {
		for (let i = 0; i < this.variables.length; i++) {
			if (this.variables[i].displayName === variableName) {
				return true;
			}
		}

		return false;
	},
	getVariableValuesById(id) {
		const values = this.getVariableByID(parseInt(id, 10)).values;
		return (typeof values === 'undefined') ? [] : values;
	},
	addVariableValue(id, value, displayName) {
		const variable = this.getVariableByID(parseInt(id, 10));
		variable.values = variable.values || [];
		variable.values.push({
			value,
			displayName
		});
	},
	duplicateVariableValueExists(id, value, displayName) {
		const values = this.getVariableValuesById(id);
		value = (isNaN(parseInt(value, 10))) ? value : parseInt(value, 10);
		for (const val of values) {
			if (val.value === value || val.displayName === displayName) {
				return true;
			}
		}

		return false;
	},
	removeVariableValue(id, value) {
		value = (isNaN(parseInt(value, 10))) ? value : parseInt(value, 10);
		for (let i = 0; i < this.variables.length; i++) {
			if (this.variables[i].id === parseInt(id, 10)) {
				for (let j = 0; j < this.variables[i].values.length; j++) {
					if (this.variables[i].values[j].value === value) {
						this.variables[i].values[j] = undefined;
					}
				}

				// filters out the undefined variables
				this.variables[i].values = this.variables[i].values.filter(Boolean);
			}
		}
	},
	addTree(treeName, catId) {
		let newId = 0;
		if (this.trees.length > 0) {
			newId = this.trees[this.trees.length - 1].id + 1;
		}

		this.trees.push({
			id: newId,
			categoryId: catId,
			displayName: treeName,
			nodes: []
		});

		$('section#nodes').append(`<section class='tree' data-id='${newId}'></section>`);
		$(`select.trees optgroup[data-tree-category-id="${catId}"]`).append(`<option data-tree="${newId}">${treeName}</option>`);
		$('select.trees').trigger('chosen:updated');

		return newId;
	},
	removeTree(state, treeId) {
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].id === treeId) {
				this.trees[i] = undefined;
			}
		}

		// filters out the undefined variables
		this.trees = this.trees.filter(Boolean);

		// remove tree refs
		$(`select.trees option[data-tree="${treeId}"]`).remove();
		$(`#nodes .tree[data-id="${treeId}"]`).remove();

		// invalidate the current tree if we just deleted it
		if (state.currentTree === treeId) {
			$("select.trees").val('').trigger('change');
		}

		$("select.trees").trigger("chosen:updated");
	},
	duplicateTreeExists(treeName, categoryId) {
		for (let i = 0; i < this.trees.length; i++) {
			if (this.trees[i].categoryId === parseInt(categoryId, 10) && this.trees[i].displayName.toLowerCase() === treeName.toLowerCase()) {
				return true;
			}
		}

		return false;
	}
};
