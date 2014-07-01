'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
ObjetDAta = require('../../..');

describe('ObjetDAta', function () {
    var testObject;

    it('should have the [ Utility ] property', function () {
        expect(ObjetDAta).to.have.property('Utility');
        expect(ObjetDAta.Utility).to.be.a('function');
    });

    it('should have the [ Database ] property', function () {
        expect(ObjetDAta).to.have.property('Database');
        expect(ObjetDAta.Database).to.be.a('function');
    });

    describe('static .registerPlugin()', function () {
        var pluginConstructor,  plugin, realPlugins;
        beforeEach(function () {
            plugin = {
                type : 'random',
                name : 'test'
            };
            pluginConstructor = sinon.stub().returns(plugin);

            realPlugins = {};
            Object.keys(ObjetDAta.prototype.plugins).forEach(function (key) {
                realPlugins[key] = ObjetDAta.prototype.plugins[key];
                delete ObjetDAta.prototype.plugins[key];
            });
        });

        afterEach(function () {
            Object.keys(ObjetDAta.prototype.plugins).forEach(function (key) {
                delete ObjetDAta.prototype.plugins[key];
            });
            Object.keys(realPlugins).forEach(function (key) {
                ObjetDAta.prototype.plugins[key] = realPlugins[key];
            });
        });

        it('should instantiate provided plugin', function () {
            ObjetDAta.registerPlugin(pluginConstructor);
            expect(pluginConstructor.calledWithNew()).to.be.true;
        });

        it('should add the plugin instance to [ prototype.plugins ] using the plugin\'s provided type and name', function () {
            expect(ObjetDAta.prototype.plugins).to.deep.equal({});
            ObjetDAta.registerPlugin(pluginConstructor);
            expect(Object.keys(ObjetDAta.prototype.plugins)).to.deep.equal(['random']);
            expect(Object.keys(ObjetDAta.prototype.plugins.random)).to.deep.equal(['test']);
        });

        it('should support adding multiple plugins under a single type', function () {
            expect(ObjetDAta.prototype.plugins).to.deep.equal({});
            ObjetDAta.registerPlugin(function () {
                this.type = 'category';
                this.name = 'doSomeStuff';
            });
            ObjetDAta.registerPlugin(function () {
                this.type = 'category';
                this.name = 'doSomeOtherStuff';
            });
            expect(Object.keys(ObjetDAta.prototype.plugins)).to.deep.equal(['category']);
            expect(Object.keys(ObjetDAta.prototype.plugins.category)).to.deep.equal(['doSomeStuff', 'doSomeOtherStuff']);
        });

        describe('on subclass', function () {
            var subPluginConstructor,  subPlugin;
            function TestClass () {}

            beforeEach(function () {
                ObjetDAta.setDefinition(TestClass, {
                    properties : {
                        first : {type : 'string'}
                    }
                });
                subPlugin = {
                    type : 'other',
                    name : 'self'
                };
                subPluginConstructor = sinon.stub().returns(subPlugin);
            });

            it('should instantiate the provided plugin', function () {
                TestClass.registerPlugin(subPluginConstructor);
                expect(subPluginConstructor.calledWithNew()).to.be.true;
            });

            it('should add the plugin instance to [ prototype.plugins ] using the plugin\'s provided type and name', function () {
                ObjetDAta.registerPlugin(pluginConstructor);
                expect(Object.keys(ObjetDAta.prototype.plugins)).to.deep.equal(['random']);
                expect(Object.keys(ObjetDAta.prototype.plugins.random)).to.deep.equal(['test']);
                expect(TestClass.prototype.plugins).to.deep.equal({});
                TestClass.registerPlugin(subPluginConstructor);
                expect(Object.keys(ObjetDAta.prototype.plugins)).to.deep.equal(['random']);
                expect(Object.keys(ObjetDAta.prototype.plugins.random)).to.deep.equal(['test']);
                expect(Object.keys(TestClass.prototype.plugins)).to.deep.equal(['other']);
                expect(Object.keys(TestClass.prototype.plugins.other)).to.deep.equal(['self']);
            });
        });
    });

    describe('static .setDefinition()', function () {
        function TestClass () {}
        ObjetDAta.setDefinition(TestClass, {
            properties : {
                name : {type : 'string'}
            }
        });

        beforeEach(function () {
            testObject = new TestClass();
        });

        it('should cause the provided class to extend itself', function () {
            expect(testObject).to.be.an.instanceof(TestClass);
            expect(testObject).to.be.an.instanceof(ObjetDAta);
        });

        it('should set the definition on the subclass\'s constructor', function () {
            expect(TestClass).to.have.property('definition');
        });

        it('should set another [ .setDefinition() ] on the subclass\'s constructor', function () {
            expect(TestClass).to.have.property('setDefinition');
            expect(TestClass.setDefinition).to.have.be.a('function');
        });

        it('should set a static [ .registerPlugin() ] on the subclass\'s constructor', function () {
            expect(TestClass).to.have.property('registerPlugin');
            expect(TestClass.registerPlugin).to.have.be.a('function');
        });

        it('should set the special [ plugins ] property on the subclass', function () {
            expect(Object.getOwnPropertyDescriptor(TestClass.prototype, 'plugins')).to.deep.equal({
                value : {},
                writable : false,
                enumerable : false,
                configurable : false
            });
        });

        it('should preserve everything on the prototype of the subclass', function () {
            function SubClass() {}
            SubClass.prototype.deepThought = {answer : 42};
            ObjetDAta.setDefinition(SubClass, {});
            expect(SubClass.prototype).to.have.property('deepThought');
            expect(SubClass.prototype.deepThought).to.deep.equal({answer : 42});
        });

        describe('subclass\'s static .setDefinition()', function () {
            var subTestObject, subSubTestObject;
            function SubTestClass () {}
            TestClass.setDefinition(SubTestClass, {
                properties : {
                    first : {type : 'string'}
                }
            });

            function SubSubTestClass () {}
            SubTestClass.setDefinition(SubSubTestClass, {
                properties : {
                    first : {type : 'string'}
                }
            });

            beforeEach(function () {
                subTestObject = new SubTestClass();
                subSubTestObject = new SubSubTestClass();
            });

            it('should cause the provided class to extend itself', function () {
                expect(subTestObject).to.be.an.instanceof(SubTestClass);
                expect(subTestObject).to.be.an.instanceof(TestClass);
                expect(subTestObject).to.be.an.instanceof(ObjetDAta);

                expect(subSubTestObject).to.be.an.instanceof(SubSubTestClass);
                expect(subSubTestObject).to.be.an.instanceof(SubTestClass);
                expect(subSubTestObject).to.be.an.instanceof(TestClass);
                expect(subSubTestObject).to.be.an.instanceof(ObjetDAta);
            });

            it('should set the definition on the subclass\'s constructor', function () {
                expect(SubTestClass).to.have.property('definition');
                expect(SubSubTestClass).to.have.property('definition');
            });

            it('should set another [ .setDefinition() ] on the subclass\'s constructor', function () {
                expect(SubTestClass).to.have.property('setDefinition');
                expect(SubTestClass.setDefinition).to.have.be.a('function');
                expect(SubSubTestClass).to.have.property('setDefinition');
                expect(SubSubTestClass.setDefinition).to.have.be.a('function');
            });

            it('should set a static [ .registerPlugin() ] on the subclass\'s constructor', function () {
                expect(SubTestClass).to.have.property('registerPlugin');
                expect(SubTestClass.registerPlugin).to.have.be.a('function');
                expect(SubSubTestClass).to.have.property('registerPlugin');
                expect(SubSubTestClass.registerPlugin).to.have.be.a('function');
            });

            it('should set the [ plugins ] property on the subclass', function () {
                expect(Object.getOwnPropertyDescriptor(SubTestClass.prototype, 'plugins')).to.deep.equal({
                    value : {},
                    writable : false,
                    enumerable : false,
                    configurable : false
                });
                expect(Object.getOwnPropertyDescriptor(SubSubTestClass.prototype, 'plugins')).to.deep.equal({
                    value : {},
                    writable : false,
                    enumerable : false,
                    configurable : false
                });
            });
        });
    });

    describe('when subclass has no definition', function () {
        function TestClass () {}
        TestClass.prototype = new ObjetDAta();

        beforeEach(function () {
            testObject = new TestClass();
        });

        describe('.initialize()', function () {
            it('should throw an error', function () {
                try {
                    testObject.initialize();
                    expect(false, 'initialize() did not throw an error.').to.be.true;
                } catch (error) {
                    expect(error).to.be.an.instanceof(Error);
                    expect(error.message).to.equal('Error: ObjetDAta.prototype.initialize(): The subclass ' +
                    'must extend ObjetDAta using the ObjetDAta.setDefinition() function.');
                }
            });
        });
    });

    describe('when subclass has a valid definition', function () {
        function TestClass () {}
        ObjetDAta.setDefinition(TestClass, {
            properties : {
                name : {type : 'string'}
            }
        });

        describe('.initialize()', function () {
            beforeEach(function () {
                sinon.spy(ObjetDAta, 'Utility');
            });
            afterEach(function () {
                ObjetDAta.Utility.restore();
            });

            it('should invoke [ ObjetDAta.Utility ] with itself as the first parameter', function () {
                testObject = new TestClass().initialize();
                expect(ObjetDAta.Utility.called).to.be.true;
                expect(ObjetDAta.Utility.firstCall.args[0]).to.deep.equal(testObject);
            });

            describe('should invoke [ ObjetDAta.Utility ] with a config object as the second parameter', function () {
                it('with the definition property as the return value of this.getDefinition()', function () {
                    testObject = new TestClass().initialize();
                    expect(ObjetDAta.Utility.firstCall.args[1].definition).to.deep.equal({
                        properties : {
                            name : {
                                type : 'string'
                            }
                        }
                    });
                });

                it('with the db property set to the first passed property', function () {
                    testObject = new TestClass().initialize({name : 'a database'});
                    expect(ObjetDAta.Utility.firstCall.args[1].db).to.deep.equal({
                        name : 'a database'
                    });
                });
            });

            it('should return [ this ]', function () {
                var initReturn, testObject = new TestClass();
                initReturn = testObject.initialize();
                expect(initReturn).to.deep.equal(testObject);
            });
        });

        describe('static  util wrapper function', function () {
            var util;
            beforeEach(function () {
                testObject = new TestClass().initialize();
                util = testObject[' util'];
                sinon.stub(util, 'isPersistencePending');
                sinon.stub(util, 'whenFullyPersisted');
            });

            describe('.isPersistencePending', function () {
                it('should wrap  util.isPersistencePending', function () {
                    util.isPersistencePending.returns('should be a boolean');
                    expect(ObjetDAta.isPersistencePending(testObject)).to.equal('should be a boolean');
                    expect(util.isPersistencePending.called).to.be.true;
                });
            });

            describe('.whenFullyPersisted', function () {
                it('should wrap  util.whenFullyPersisted', function () {
                    util.whenFullyPersisted.returns('should be a promise');
                    expect(ObjetDAta.whenFullyPersisted(testObject)).to.equal('should be a promise');
                    expect(util.whenFullyPersisted.called).to.be.true;
                });
            });
        });
    });

    describe('out of the box plugins', function () {
        it('should provide a [ type ] plugin named [ string ]', function () {
            expect(ObjetDAta.prototype.plugins.type).to.have.property('string');
        });
    });
});
