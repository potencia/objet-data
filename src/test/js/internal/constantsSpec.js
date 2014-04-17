'use strict';

var expect = require('chai').expect,
constants = require('../../../main/js/internal/constants');

describe('Central constants', function () {
    it('should have the [ U ] property set to [ #util ]', function () {
        expect(constants).to.have.property('U');
        expect(constants.U).to.equal('#util');
    });

    it('should have the [ S ] property set to [ #state ]', function () {
        expect(constants).to.have.property('S');
        expect(constants.S).to.equal('#state');
    });
});
