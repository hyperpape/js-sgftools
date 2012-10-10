var jsdom = require('jsdom');
var fs = require('fs');

if (process.argvar.length >= 4) {
    var url = process.argv[2];
    var file = process.argv[3];

    initialPage(url, function (x) { writeDiagrams(file, x); });
}

// load an initial page, and start scraping the thread it's a part of
function initialPage (url, callback) {
    jsdom.env(url, function (err, window) {
        if (err) {
            console.log(err);
        } else {
            getL19Thread(window.document, getPage, callback);
        }
    });
}

function getPage (url, stack) {
    console.log('requesting ' + url);
    jsdom.env(url, function (err, window) {
        if (err) {
            console.log("getPage error\n" + err + '\n');
        } else {
            stack.handle(window.document, url);
        }
    });
}

function writeDiagrams (file, diagrams) {
    fs.writeFile(file, diagrams.join('\n\n'), function (err) {
        if (err) {
            console.log("error writing files " + err);
        } else {
            console.log("wrote " + diagrams.length +  "diagrams to " + file);
        }
    });
}



