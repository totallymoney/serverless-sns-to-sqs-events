"use strict";

module.exports.hello = async event => {
	console.log(JSON.stringify(event));
};
