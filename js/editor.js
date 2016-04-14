'use strict';

const $ = require('../js/lib/jquery.js');

$(() => {
	console.log('caca');
	$(".draggable").on('drag', () => {
		console.log('drag');
	});
});