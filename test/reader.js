var fs = require('fs');
var Fragment = require('../lib/fragments.js').Fragment;
var PositionList = require('../lib/positionlist.js').PositionList;

function readSavedDiagrams (target) {
    var diagramsString = fs.readFileSync(target, 'utf-8');
    var diagramPattern = /\[go\][^\[\]]*\[\/go\]/g;
    var diagrams = diagramsString.match(diagramPattern);
    return diagrams.map(function (x) { return x.replace(/\[\/?go\]/g, ""); });
}

function processSavedDiagrams (target) {
    var results = {};
    var diagrams = readSavedDiagrams(target);

    var positionList = new PositionList();
    var fragments = [];

    for (var i = 0, ilen = diagrams.length; i < ilen; i++) {
        fragments.push(new Fragment(diagrams[i], positionList));
    }

    results.diagrams = diagrams;
    results.fragments = fragments;
    results.positionList = positionList;

    return results;
}

exports.readSavedDiagrams = readSavedDiagrams;
exports.processSavedDiagrams = processSavedDiagrams;