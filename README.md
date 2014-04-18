# Objet d'ata #
#### Auto-persisting data objects ####

### Overview ###
Objet d'ata is a [node.js](http://nodejs.org/) library for generating data storage objects that are backed by an external database.

Code **is** art, and in keeping with that philosophy, Objet d'ata attempts to provide a syntax that is simple, easy to read and write, and as close to vanilla JavaScript as possible. It tries to get out of your way so that your can make your art as you see fit.

### Road Map ###

#### Initial Goals ####
To correctly handle basic JavaScript types using  [EJDB](http://ejdb.org/) as the underlying database. EJDB has been chosen as it mimics the syntax of the popular MongoDB and has the added benefit of being embeddable. As such it makes a great, lightweight testing environment.

#### Version 1.0 Desired Features ####
 - Pluggable architecture
 - Object definition using basic (custom) JSON syntax
 - Type support
    - Boolean
    - Number
    - String
    - Date
    - Array
    - Object
 - Database support
    - EJDB
 - Data Validation
 - Transactions
 - API Documentation

#### Future Feature Ideas ####
 - Object definition using JSON Schema
 - Type support
    - Regex
    - Function
    - Flags (stored as bits in a number on the database)
    - Child Objet d'ata (one-to-many, many-to-many database relationships)
 - Database support
    - MySQL
    - MongoDB
    - CouchDB
    - Redis

### API Guide ###
    // TODO: This section needs to be completed.

### Extending Objet d'ata for your project ###
    // TODO: This section needs to be completed.

### Hacking on Objet d'ata ###
    // TODO: This section needs to be completed.

### License ###
Objet d'ata is provided under the MIT License.

Copyright &copy; 2014 John P. Johnson II

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
