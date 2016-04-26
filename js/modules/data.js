'use strict';

const $ = require('../../js/lib/jquery.js');

module.exports = {
	project: null,
	trees: null,
	treeCategories: null,
	languages: null,
	variables: null,
	customVariables: null,
	voices: null,
	characters: null,
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
			link: -1,
			editor: {
				x: x || 0,
				y: y || 0
			}
		});

		return newId;
	},
	updateNode(state, nodeElement) {
		const dataNodeId = nodeElement.data('id');
		const dataNode = this.getNodeByID(state.currentTree, dataNodeId);

		if (typeof dataNode !== 'undefined') {
			dataNode.type = nodeElement.find('select.nodetype option:selected').val();

			if (dataNode.type === 'text') {
				dataNode.name = nodeElement.find('[data-type="text"] input[data-name]').val();
				dataNode.voice = nodeElement.find('[data-type="text"] select[data-voice] option:selected').val();

				this.setText(state.currentLanguage, `$T${state.currentTree}N${dataNodeId}`, `${nodeElement.find('[data-type="text"] textarea[data-message]').val()}`);
			} else if (dataNode.type === 'set') {
				const validation = nodeElement.find('[data-type="set"] select[data-variable-set] option:selected').data('validation');
				dataNode.variable = nodeElement.find('[data-type="set"] select[data-variable-set] option:selected').val();
				dataNode.operation = nodeElement.find('[data-type="set"] select[data-operation] option:selected').val();

				if (validation === 'int' || validation === 'string') {
					dataNode.value = nodeElement.find(`[data-type="set"] input[data-${validation}]`).val();
				} else if (validation === 'bool' || validation === 'character') {
					dataNode.value = nodeElement.find(`[data-type="set"] select[data-${validation}] option:selected`).val();
				}
			} else if (dataNode.type === 'branch') {
				dataNode.variable = nodeElement.find('[data-type="branch"] select[data-variable-get] option:selected').val();
				dataNode.condition = nodeElement.find('[data-type="branch"] select[data-condition] option:selected').val();
				const validation = nodeElement.find('[data-type="branch"] select[data-variable-get] option:selected').data('validation');

				if (validation === 'int' || validation === 'string') {
					dataNode.value = nodeElement.find(`[data-type="branch"] input[data-${validation}]`).val();
				} else if (validation === 'bool' || validation === 'character') {
					dataNode.value = nodeElement.find(`[data-type="branch"] select[data-${validation}] option:selected`).val();
				}
			} else {
				throw new Error(`Error while updating node (${dataNodeId}): Invalid Node Type.`);
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
			if (node.link === id) {
				node.link = -1;
			}

			if (node.trueLink !== undefined && node.trueLink === id) {
				delete node.trueLink;
			}

			if (node.falseLink !== undefined && node.falseLink === id) {
				delete node.falseLink;
			}
		});
	},
	link(state) {
		if (state.link.isTrueLink === undefined) {
			this.getNodeByID(state.currentTree, state.link.linkingFrom.data('id')).link = state.link.linkTarget.data('id');
		} else if (state.link.isTrueLink) {
			this.getNodeByID(state.currentTree, state.link.linkingFrom.data('id')).trueLink = state.link.linkTarget.data('id');
		} else {
			this.getNodeByID(state.currentTree, state.link.linkingFrom.data('id')).falseLink = state.link.linkTarget.data('id');
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
	getCustomVariableByID(variableId) {
		for (let i = 0; i < this.customVariables.length; i++) {
			if (this.customVariables[i].id === variableId) {
				return this.customVariables[i];
			}
		}
	},
	addCustomVariable(name, valid) {
		let newId = 0;
		if (this.customVariables.length > 0) {
			newId = this.customVariables[this.customVariables.length - 1].id + 1;
		}

		this.customVariables.push({
			displayName: name,
			type: "custom",
			validation: valid,
			set: true,
			get: true,
			id: newId
		});

		return newId;
	},
	removeCustomVariable(variableId) {
		console.log(typeof variableId);
		for (let i = 0; i < this.customVariables.length; i++) {
			if (this.customVariables[i].id === variableId) {
				this.customVariables[i] = undefined;
			}
		}

		// filters out the undefined variables
		this.customVariables = this.customVariables.filter(Boolean);
	},
	duplicateCustomVariableExists(variableName) {
		for (let i = 0; i < this.customVariables.length; i++) {
			if (this.customVariables[i].displayName === variableName) {
				return true;
			}
		}

		return false;
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
