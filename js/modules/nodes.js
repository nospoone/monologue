'use strict';

const remote = require('remote');
const fs = remote.require('fs');
const path = remote.require('path');
const app = remote.app;
const raw = [];
const $ = require('../../js/lib/jquery.js');

const field = {
	type: {
		input: 'input',
		textarea: 'textarea',
		select: 'select'
	}
};

module.exports = {
	init(nodesUsed) {
		const files = fs.readdirSync(path.join(app.getAppPath(), '../../../../../nodes/'));
		for (const file of files) {
			raw.push(JSON.parse(fs.readFileSync(path.join(app.getAppPath(), '../../../../../nodes/', file), {encoding: 'utf-8'})));
		}

		for (const node of raw) {
			if (nodesUsed.indexOf(node.id.toLowerCase()) > -1) {
				$('.project-settings select.right').append(`<option value='${node.id}'>${node.name}</option>`);
				$('section#nodes .node.template .select select.nodetype').append(`<option value='${node.id}'>${node.name}</option>`);
			} else {
				$('.project-settings select.left').append(`<option value='${node.id}'>${node.name}</option>`);
			}
		}
	},
	getMarkupArray() {
		const markupArray = [];
		for (const node of raw) {
			node.fields.sort((a, b) => {
				return a.position - b.position;
			});

			if (node.fields.length > 0) {
				for (const field of node.fields) {
					markupArray[node.id] = markupArray[node.id] || [];
					markupArray[node.id].push(this.generateMarkupFromType(field.type, field.placeholder, field.binding, field.maxlength, field.values));
				}
			}
		}

		return markupArray;
	},
	generateMarkupFromType(type, placeholder, binding, maxlength, values) {
		let properties = ' ';
		let select = '';
		properties += (typeof placeholder !== undefined || placeholder.length > 0) ? `placeholder='${placeholder}'` : '';
		properties += (typeof binding !== undefined || binding.length > 0) ? `data-binding='${binding}'` : '';
		properties += (typeof maxlength !== undefined || parseInt(maxlength, 10) !== -1) ? ` maxlength='${maxlength}'` : '';

		switch (type) {
			case field.type.input:
				return $(`<input type="text"${properties} />`);
			case field.type.textarea:
				return $(`<textarea${properties} /></textarea>`);
			case field.type.select:
				select = `<select${properties} >`;
				for (let i = 0; i < values.length; i++) {
					select += `<option value='${i}'>${values[i]}</option>`;
				}

				return $(select);
			default:
				throw new Error(`Failed to generate markup: type '${type}' is invalid.`);
		}
	}
};
