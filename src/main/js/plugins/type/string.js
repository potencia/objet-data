'use strict';

function StringPlugin () {
    this.type = 'type';
    this.name = 'string';

    this.convertOnSave = undefined;
    this.convertOnLoad = undefined;

    this.validate = function (value) {
        return typeof value === 'string';
    };
}

module.exports = StringPlugin;