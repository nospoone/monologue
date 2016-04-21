'use strict';

const remote = require('remote');
const fs = remote.require('fs');
const path = remote.require('path');
const tsv = remote.require('tsv');
const $ = require('../../js/lib/jquery.js');

module.exports = {
	currentProjectFile: null,
	saving: false,
	openProject(state, data, file) {
		const parsedFile = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}));

		data.project = parsedFile.project;
		data.variables = parsedFile.project.variables;
		data.customVariables = parsedFile.project.customVariables;
		data.treeCategories = parsedFile.project.treeCategories;
		data.voices = parsedFile.project.voices;
		data.characters = parsedFile.project.characters;
		data.trees = parsedFile.trees;
		data.translations = parsedFile.translations;
		this.currentProjectFile = file;

		state.position.x = data.project.state.position.x;
		state.position.y = data.project.state.position.y;
		state.zoom = data.project.state.zoom;
		state.currentTree = data.project.state.currentTree;
	},
	saveProject(data, view, state, auto) {
		auto = auto || false;
		if (!this.saving) {
			this.saving = true;

			view.showStatusMessage((auto) ? 'Auto-saving...' : 'Saving...');

			$('.node input.dirty, .node textarea.dirty').trigger('change').removeClass('dirty');

			const saveData = {project: data.project, trees: data.trees, translations: data.translations};
			saveData.project.variables = data.variables;
			saveData.project.customVariables = data.customVariables;
			saveData.project.state.position.x = state.position.x;
			saveData.project.state.position.y = state.position.y;
			saveData.project.state.zoom = state.zoom;
			saveData.project.state.currentTree = state.currentTree;

			fs.writeFileSync(this.currentProjectFile, JSON.stringify(saveData));

			// this should really be elsewhere as a separate option
			// larger projects will take forever to output this
			// as the tsv module isn't async
			view.showStatusMessage('Exporting...');
			this.exportTSVs(data);

			this.saving = false;
		}
	},
	exportTSVs(data) {
		data.translations.forEach(language => {
			const firstHalf = Object.keys(language)[0].substr(0, 2);
			const secondHalf = Object.keys(language)[0].substr(2, 2);

			// save path needs to have a setting somewhere (project settings?)
			const location = path.join(path.dirname(this.currentProjectFile), `${firstHalf}-${secondHalf}.tsv`);

			language[Object.keys(language)[0]].forEach(text => {
				while (text.content.indexOf('\n') > -1) {
					text.content = text.content.replace("\n", "<N>");
				}
			});

			fs.writeFileSync(location, tsv.stringify(language[Object.keys(language)[0]]));
		});
	}
};
