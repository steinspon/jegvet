'use strict';

var fs = require('node:fs');
var http = require('node:http');
var path = require('node:path');
var url = require('node:url');

var root = path.resolve(__dirname, '..');
var port = Number(process.argv[2]) || 5500;

var contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function send(response, status, body, type) {
  response.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  response.end(body);
}

http.createServer(function (request, response) {
  var parsed = url.parse(request.url || '/');
  var pathname = decodeURIComponent(parsed.pathname || '/');
  var relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  var filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    send(response, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, function (statError, stat) {
    if (statError || !stat.isFile()) {
      send(response, 404, 'Not found');
      return;
    }

    var extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
  });
}).listen(port, '127.0.0.1', function () {
  process.stdout.write('Serving ' + root + ' on http://127.0.0.1:' + port + '\n');
});
