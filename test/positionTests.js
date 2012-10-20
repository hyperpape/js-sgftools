var reader = require('./reader.js');
var tests = require('./tests.js');
var Diagram = require('../lib/diagrams.js').Diagram;

var gameObjects = reader.processSavedDiagrams('./newdiagrams');
var fragments = gameObjects.fragments;

exports.numberChildrenTest = function (test) {
    tests.numberChildren(test, fragments[0], 11);
    tests.numberChildren(test, fragments[1], 2);
    test.done();
};

exports.adjacentTest = function (test) {
    tests.adjacent(test, fragments[0].children[0], '1,1', ['1,2', '2,1']);
    tests.adjacent(test, fragments[0].children[0], '2,2',
                   ['1,2', '2,1', '2,3', '3,2']);
    tests.adjacent(test, fragments[0].children[0], '19,19',
                   ['18,19', '19,18']);
    test.done();
}

exports.OccupationTests = {

    occupationTest1: function (test) {
        tests.isOccupiedTest(test, fragments[0].children[0], [4,4], true);
        test.done();
    },

    occupationTest2: function (test) {
        tests.isOccupiedTest(test, fragments[0].children[0], [4,4],
                             Diagram.BLACK);
        test.done();
    },

    occupationTest3: function (test) {
        tests.isOccupiedTest(test, fragments[0].children[0], [3,3], false);
        test.done();
    },

    occupationTest4: function (test) {
        tests.isOccupiedTest(test, fragments[0].children[0], [6,3], false);
        test.done();
    },

    occupationTest5: function (test) {
        tests.isOccupiedTest(test, fragments[0].children[3], [6,3],
                             Diagram.WHITE);
        test.done();
    }
};

exports.movesAddStonesTest = function (test) {
    for (var i = 0, ilen = fragments[0].children.length; i < ilen; i++) {
        tests.stoneCount(test, fragments[0].children[i], 4 + i);
    }
    test.done();
};

exports.markersStoneCountTest = function (test) {
    tests.stoneCount(test, fragments[3].children[0], 12);
    tests.stoneCount(test, fragments[4].children[0], 4);
    test.done();
};

exports.captureCountTest = function (test) {
    tests.captureCount(test, fragments[6].children[1], 1);
    tests.captureCount(test, fragments[2].children[2], 1);
    tests.captureCount(test, fragments[5].children[1], 1);
    test.done();
};

exports.captureStoneReducesStoneCount = function (test) {
    tests.stoneCount(test, fragments[5].children[0], 10);
    tests.stoneCount(test, fragments[5].children[1], 10);
    tests.stoneCount(test, fragments[5].children[2], 11);
    tests.stoneCount(test, fragments[5].children[3], 12);
    tests.stoneCount(test, fragments[5].children[4], 13);
    tests.stoneCount(test, fragments[5].children[5], 13);
    test.done();
};

exports.placeMovePlacesStone = function (test) {
    tests.placeMoveTest(test, fragments[6].children[1], [19, 13], Diagram.WHITE);
    tests.placeMoveTest(test, fragments[0].children[0], '5,5', Diagram.WHITE,
                        {stoneCount: 5});
    test.done();

};

exports.placeMoveCaptures = function (test) {
    tests.placeMoveTest(test, fragments[6].children[1], [19, 13], Diagram.WHITE,
                        {stoneCount: 23});
    tests.placeMoveTest(test, fragments[7].children[0], '5,5', Diagram.WHITE,
                        {stoneCount: 20});
    tests.placeMoveTest(test, fragments[7].children[0], '3,17', Diagram.WHITE,
                        {stoneCount: 20});
    test.done();
};

exports.getGroupTest = function (test) {
    var groupStones = {};
    groupStones['19,14'] = 2;
    var group = { liberties: ['19,15'],
                  stones: groupStones,
                  color: Diagram.BLACK
                };
    tests.getGroupTest(test, fragments[6].children[1], '19,14', group);
    test.done();
};