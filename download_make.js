const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("make.exe");
https.get("https://github.com/mbuilov/gnumake-windows/releases/download/v4.4.1/make-4.4.1-x64.exe", {
    headers: { 'User-Agent': 'Node.js' }
}, function(response) {
    if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, { headers: { 'User-Agent': 'Node.js' } }, function(res2) {
            res2.pipe(file);
            file.on('finish', function() {
                file.close();
                console.log("Downloaded make.exe");
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', function() {
            file.close();
            console.log("Downloaded make.exe");
        });
    }
});
