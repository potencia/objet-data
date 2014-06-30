'use strict';

var expect = require('chai').expect,
tools = require('../../tools'),
plugin = new (require('../../../../main/js/plugins/type/string'))(),
ObjetDAta = require('../../../../..');

describe('type plugin: string', function () {
    it('should have a [ validate ] function', function () {
        expect(plugin).to.have.property('validate');
        expect(plugin.validate).to.be.a('function');
    });

    it('should have a [ convertOnSave ] property that is undefined', function () {
        expect(plugin).to.have.ownProperty('convertOnSave');
        expect(plugin.convertOnSave).to.be.undefined;
    });

    it('should have a [ convertOnLoad ] property that is undefined', function () {
        expect(plugin).to.have.ownProperty('convertOnLoad');
        expect(plugin.convertOnLoad).to.be.undefined;
    });

    describe('.validate()', function () {
        it('should return true when passed values of type [ string ]', function () {
            expect(plugin.validate('test')).to.be.true;
            expect(plugin.validate('value')).to.be.true;
        });

        it('should return false when passed values of any type other than [ string ]', function () {
            expect(plugin.validate(undefined)).to.be.false;
            expect(plugin.validate(null)).to.be.false;
            expect(plugin.validate(true)).to.be.false;
            expect(plugin.validate(42)).to.be.false;
            expect(plugin.validate([])).to.be.false;
            expect(plugin.validate({})).to.be.false;
            expect(plugin.validate(new Date())).to.be.false;
            expect(plugin.validate(/.*/)).to.be.false;
            expect(plugin.validate(function () {})).to.be.false;
        });
    });

    describe('when used in a definition', function () {
        var obj, db;
        before(function () {
            db = new ObjetDAta.Database('ejdb', {
                dbFile : 'target/db/stringSpec',
                openMode : {
                    writer : true,
                    create : true,
                    truncate : true
                }
            });
            obj = tools.createTestObject(db, {
                collection : 'test',
                properties : {
                    name : {type : 'string'}
                }
            });
        });

        after(function (done) {
            db.close()
            .then(function () {})
            .done(done);
        });

        it('should provide string related functionality', function (done) {
            var id;
            obj.name = 'John Johnson II';
            ObjetDAta.whenFullyPersisted(obj)
            .then(function () {
                id = obj.id;
                return tools.getData(obj);
            })
            .then(function (data) {
                expect(data.memory, 'Memory is incorrect').to.deep.equal({
                    name : 'John Johnson II'
                });
                expect(data.persisted, 'Persisted is incorrect').to.deep.equal({
                    name : 'John Johnson II'
                });
            })
            .then(function () {
                obj.name = 'Some guy, you know?';
                return ObjetDAta.whenFullyPersisted(obj);
            })
            .then(function () {
                expect(obj.id).to.equal(id);
                return tools.getData(obj);
            })
            .then(function (data) {
                expect(data.memory, 'Memory is incorrect').to.deep.equal({
                    name : 'Some guy, you know?'
                });
                expect(data.persisted, 'Persisted is incorrect').to.deep.equal({
                    name : 'Some guy, you know?'
                });
            })
            .fail(function (reason) {
                return new Error(reason);
            })
            .done(done);
        });
    });
});
