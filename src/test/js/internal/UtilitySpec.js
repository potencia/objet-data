'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
DataObject = require('../../../..');

function ChildClass () {}

function GrandchildClass () {}

describe('DataObject.Utility', function () {
    var obj, util;

    it('should have the special [ pluginDefaults ] property', function () {
        var descriptor = Object.getOwnPropertyDescriptor(DataObject.Utility, 'pluginDefaults');
        expect(descriptor.value).to.be.an('object');
        expect(descriptor.writable).to.be.false;
        expect(descriptor.enumerable).to.be.false;
        expect(descriptor.configurable).to.be.false;
    });

    describe('constructor', function () {
        beforeEach(function () {
            obj = {};
        });

        it('should set the [ .obj ] property', function () {
            util = new DataObject.Utility({specialValue : 'very very special'}, {});
            expect(util).to.have.property('obj');
            expect(util.obj.specialValue).to.equal('very very special');
        });

        it('should set itself as the special [ #util ] property on [ .obj ]', function () {
            expect(Object.getOwnPropertyDescriptor(obj, '#util')).to.be.undefined;
            util = new DataObject.Utility(obj, {db : {name : 'a database'}});
            expect(Object.getOwnPropertyDescriptor(obj, '#util')).to.deep.equal({
                value : util,
                writable : false,
                enumerable : false,
                configurable : false
            });
        });

        it('should set the [ .db ] property', function () {
            util = new DataObject.Utility(obj, {db : {foo : true}});
            expect(util).to.have.property('db');
            expect(util.db).to.deep.equal({foo : true});
        });

        it('should set the [ .collection ] property', function () {
            util = new DataObject.Utility(obj, {definition : {collection : 'the collection name'}});
            expect(util).to.have.property('collection');
            expect(util.collection).to.equal('the collection name');
        });

        it('should set the [ .properties ] property', function () {
            util = new DataObject.Utility(obj, {definition : {properties : {'name' : {type : 'string'}}}});
            expect(util).to.have.property('properties');
            expect(util.properties).to.have.property('name');
        });

        it('should create accessors for all appropriate properties', function () {
            var descriptor;
            util = new DataObject.Utility(obj, {definition : {properties : {
                'name' : {type : 'string'},
                'age' : {type : 'number'}
            }}});
            descriptor = Object.getOwnPropertyDescriptor(obj, 'name');
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.a('function');
            descriptor = Object.getOwnPropertyDescriptor(obj, 'age');
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.a('function');
        });
    });

    describe('.getPluginProperty()', function () {
        var realPluginDefaults;
        beforeEach(function () {
            Object.keys(DataObject.prototype.plugins).forEach(function (key) {
                delete DataObject.prototype.plugins[key];
            });
            realPluginDefaults = {};
            Object.keys(DataObject.Utility.pluginDefaults).forEach(function (key) {
                realPluginDefaults[key] = DataObject.Utility.pluginDefaults[key];
                delete DataObject.Utility.pluginDefaults[key];
            });
            DataObject.setDefinition(ChildClass, {});
            ChildClass.setDefinition(GrandchildClass, {});
            obj = new GrandchildClass().initialize();
            util = obj['#util'];
        });
        afterEach(function () {
            Object.keys(DataObject.Utility.pluginDefaults).forEach(function (key) {
                delete DataObject.Utility.pluginDefaults[key];
            });
            Object.keys(realPluginDefaults).forEach(function (key) {
                DataObject.Utility.pluginDefaults[key] = realPluginDefaults[key];
            });
        });

        it('should retrieve the property from [ this.obj.plugins ] if possible', function () {
            Object.defineProperty(obj, 'plugins', {
                value : {
                    test : {
                        plain : {
                            answer : 42
                        }
                    }
                }
            });
            expect(util.getPluginProperty('test', 'plain', 'answer')).to.equal(42);
        });

        it('should retrieve the property from the prototype chain of [ this.obj ] if necessary', function () {
            function RootPluginOne () {
                this.type = 'root';
                this.name = 'plugin';
                this.hoo = 'rah';
            }
            function RootPluginTwo () {
                this.type = 'root';
                this.name = 'otherPlugin';
                this.hoo = 'hah';
            }
            function RootPluginThree () {
                this.type = 'child';
                this.name = 'plugin';
                this.tea = true;
            }
            function RootPluginFour () {
                this.type = 'grandchild';
                this.name = 'plugin';
                this.other = 'inherited';
            }
            function ChildPlugin () {
                this.type = 'child';
                this.name = 'plugin';
                this.tea = undefined;
            }
            function GrandchildPlugin () {
                this.type = 'grandchild';
                this.name = 'plugin';
                this.answer = 42;
            }
            DataObject.registerPlugin(RootPluginOne);
            DataObject.registerPlugin(RootPluginTwo);
            DataObject.registerPlugin(RootPluginThree);
            DataObject.registerPlugin(RootPluginFour);
            ChildClass.registerPlugin(ChildPlugin);
            GrandchildClass.registerPlugin(GrandchildPlugin);
            expect(util.getPluginProperty('root', 'plugin', 'hoo')).to.equal('rah');
            expect(util.getPluginProperty('root', 'otherPlugin', 'hoo')).to.equal('hah');
            expect(util.getPluginProperty('child', 'plugin', 'tea')).to.be.undefined;
            expect(util.getPluginProperty('grandchild', 'plugin', 'answer')).to.equal(42);
            expect(util.getPluginProperty('grandchild', 'plugin', 'other')).to.equal('inherited');
        });

        it('should retrieve the property from the default if possible and necessary', function () {
            DataObject.Utility.pluginDefaults.restaurant = {
                universe : 'end'
            };
            expect(util.getPluginProperty('restaurant', 'anyPlugin', 'universe')).to.equal('end');
        });

        it('should throw an error when [ type ] is not valid', function () {
            try {
                util.getPluginProperty('typeNotThere', 'plugin', 'property');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.equal('DataObject.Utility.prototype.getPluginProperty(): The type [ typeNotThere ] is not valid.');
            }
        });

        it('should throw an error when [ plugin ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            DataObject.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'anything', 'property');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.equal('DataObject.Utility.prototype.getPluginProperty(): Could not find a plugin [ anything ] of type [ test ].');
            }
        });

        it('should throw an error when [ property ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            DataObject.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'something', 'whereAreYou');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.equal('DataObject.Utility.prototype.getPluginProperty(): Plugin [ something ] of type [ test ] has no property ' +
                '[ whereAreYou ].');
            }
        });
    });

    describe('type plugin defaults', function () {
        beforeEach(function () {
            DataObject.setDefinition(ChildClass, {});
            util = new ChildClass().initialize()['#util'];
        });

        describe('type.createAccessor()', function () {
            var createAccessor;
            beforeEach(function () {
                createAccessor = util.getPluginProperty('type', 'anyPlugin', 'createAccessor');
            });

            it('should exist', function () {
                expect(createAccessor).to.be.a('function');
            });

            it('should create a read / write accessor property on the [ obj ] named [ key ]', function () {
                var descriptor;
                obj = {};
                createAccessor(util, obj, 'dent');
                descriptor = Object.getOwnPropertyDescriptor(obj, 'dent');
                expect(descriptor.enumerable).to.be.true;
                expect(descriptor.configurable).to.be.false;
                expect(descriptor.get).to.be.a('function');
                expect(descriptor.set).to.be.a('function');
            });

            describe('created property', function () {
                beforeEach(function () {
                    obj = {};
                    createAccessor(util, obj, 'name');
                });

                it('should return the value on [ util.data ] under its [ key ]', function () {
                    util.data = {
                        name : 'Arthur'
                    };
                    expect(obj.name).to.equal('Arthur');
                });

                it('should set the value on [ util.data ] under its [ key ]', function () {
                    expect(util.data).to.deep.equal({});
                    obj.name = 'Dent';
                    expect(util.data.name).to.equal('Dent');
                });
            });
        });
    });
});
