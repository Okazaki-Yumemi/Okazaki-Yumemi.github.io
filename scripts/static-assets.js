'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Keep the original asset URLs and a single authoritative copy of each file.
hexo.extend.generator.register('original-images', function () {
  const directory = path.join(hexo.base_dir, 'images');
  const approved = JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'public-images.json'), 'utf8'));
  return approved.map(name => ({
    path: `images/${name}`,
    data: () => fs.createReadStream(path.join(directory, name))
  }));
});

hexo.extend.generator.register('local-theme-vendors', function () {
  const vendors = path.join(hexo.base_dir, 'node_modules');
  const fontawesome = path.join(vendors, '@fortawesome/fontawesome-free');
  const routes = [{
    path: 'assets/vendor/fontawesome/css/all.min.css',
    data: () => fs.createReadStream(path.join(fontawesome, 'css/all.min.css'))
  }, {
    path: 'assets/vendor/fontawesome/LICENSE.txt',
    data: () => fs.createReadStream(path.join(fontawesome, 'LICENSE.txt'))
  }, {
    path: 'assets/vendor/medium-zoom.min.js',
    data: () => fs.createReadStream(path.join(vendors, 'medium-zoom/dist/medium-zoom.min.js'))
  }, {
    path: 'assets/vendor/medium-zoom-LICENSE',
    data: () => fs.createReadStream(path.join(vendors, 'medium-zoom/LICENSE'))
  }];
  for (const name of fs.readdirSync(path.join(fontawesome, 'webfonts'))) {
    routes.push({
      path: `assets/vendor/fontawesome/webfonts/${name}`,
      data: () => fs.createReadStream(path.join(fontawesome, 'webfonts', name))
    });
  }
  return routes;
});
