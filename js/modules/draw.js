'use strict';

const browserWindow = require('remote').require("browser-window").getFocusedWindow();
const $ = require('../../js/lib/jquery.js');

module.exports = {
	canvas: {
		element: null,
		context: null
	},
	loop(state, data) {
		this.resize();

		if (state.currentTree !== -1) {
			if (state.dirty) {
				this.scrollElements(state, data);
			}

			// this.drawLinks(state, data);
		}
	},
	scrollElements(state, data) {
		$('body').css({backgroundPosition: `${state.position.x}px ${state.position.y}px`});
		$('section#nodes').css({transform: `translate(${state.position.x}px, ${state.position.y}px)`});
		$('section#nodes .tree').css({transform: `scale(${state.zoom})`});

		if (data.trees) {
			$.each($(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`), (key, element) => {
				const coords = data.getNodeCoordinates(state.currentTree, $(element).data('id'));
				$(element).css({transform: `translate(${coords.x}px, ${coords.y}px)`});
			});
		}

		state.dirty = false;
	},
	drawLinks(state, data) {
		// review this to go through links
		$.each($(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`), (key, element) => {
			const currentNode = $(element);
			const id = currentNode.data('id');
			const currentDataNode = data.getNodeByID(state.currentTree, id);

			let fromX;
			let fromY;
			let toX;
			let toY;

			if (currentNode.hasClass("branch")) {
				if (currentDataNode.trueLink !== undefined) {
					const link = currentDataNode.trueLink;
					const fromElem = currentNode.find(".links span.connectTo:eq(0)");
					const fromPos = fromElem.offset();

					fromX = fromPos.left;
					fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

					// find correct node element for ID
					const toElem = $(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`).filter(index => {
						return $(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`).eq(index).data('id') === link;
					}).find("span.connectFrom");
					const toPos = toElem.offset();

					toX = toPos.left;
					toY = toPos.top + (toElem.outerHeight() / 2) - 35;

					this.drawBezier(state, fromX, fromY, toX, toY);
				}

				if (currentDataNode.falseLink !== undefined) {
					const link = currentDataNode.falseLink;
					const fromElem = currentNode.find(".links span.connectTo:eq(1)");
					const fromPos = fromElem.offset();

					fromX = fromPos.left;
					fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

					const toElem = $(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`).filter(function () {
						return $(this).data('id') === link;
					}).find("span.connectFrom");
					const toPos = toElem.offset();

					toX = toPos.left;
					toY = toPos.top + (toElem.outerHeight() / 2) - 35;

					this.drawBezier(state, fromX, fromY, toX, toY);
				}
			} else if (currentDataNode.link !== -1) {
				const link = currentDataNode.link;
				const fromElem = currentNode.find(".links span.connectTo:eq(0)");
				const fromPos = fromElem.offset();

				fromX = fromPos.left;
				fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

				const toElem = $(`section#nodes .tree[data-id="${state.currentTree}"] .node:not(.template)`).filter(function () {
					return $(this).data('id') === link;
				}).find("span.connectFrom");
				const toPos = toElem.offset();

				toX = toPos.left;
				toY = toPos.top + (toElem.outerHeight() / 2) - 35;

				this.drawBezier(state, fromX, fromY, toX, toY);
			}
		});

		if (state.link.linking) {
			let toX;
			let toY;
			let fromElem;

			if (state.link.linkingFrom.hasClass("branch")) {
				if (state.link.isTrueLink) {
					fromElem = state.link.linkingFrom.find(".links span.connectTo:eq(0)");
				} else {
					fromElem = state.link.linkingFrom.find(".links span.connectTo:eq(1)");
				}
			} else {
				fromElem = state.link.linkingFrom.find(".links span.connectTo");
			}

			const fromPos = fromElem.offset();
			const fromX = fromPos.left;
			const fromY = fromPos.top + (fromElem.outerHeight() / 2) - 35;

			if (state.link.linkTarget === null) {
				toX = state.linkMousePosition.x;
				toY = state.linkMousePosition.y - 35;
			} else {
				const toElem = state.link.linkTarget.find("span.connectFrom");
				const toPos = toElem.offset();

				toX = toPos.left;
				toY = toPos.top + (toElem.outerHeight() / 2) - 35;
			}

			this.drawBezier(state, fromX, fromY, toX, toY);
		}
	},
	resize() {
		const windowSize = browserWindow.getContentSize();

		this.canvas.element.width = windowSize[0];
		this.canvas.element.height = windowSize[1] - 35;
	},
	drawBezier(state, fromX, fromY, toX, toY) {
		const cp1X = fromX + (toX - fromX) / 3;
		const cp2X = fromX + ((toX - fromX) / 3) * 2;
		const cp1Y = fromY;
		const cp2Y = toY;

		this.canvas.context.beginPath();
		this.canvas.context.moveTo(fromX, fromY);
		this.canvas.context.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, toX, toY);
		this.canvas.context.lineWidth = 3 * state.zoom;
		this.canvas.context.strokeStyle = "#ECF0F1";
		this.canvas.context.stroke();
	}
};
