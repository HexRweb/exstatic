const {stat} = require('fs-extra');
const PluginBase = require('@exstatic/plugin-base');
const {url} = require('../lib/utils');
const File = require('../lib/file/virtual-file.js');

class Sitemap extends PluginBase {
	static date(unstructuredDate) {
		return new Date(unstructuredDate).toISOString();
	}

	async write(fileList) {
		// @todo: limit entries per sitemap to 1000
		const filesInSitemap = fileList.filter(file => file.meta.sitemap !== false);
		let sitemap = '';

		await Promise.all(filesInSitemap.map(async file => {
			const fileMeta = await stat(file.source);

			file.meta.sitemap = Object.assign({
				lastModified: fileMeta.mtime
			}, file.meta.sitemap);

			sitemap += `
			<url>
				<loc>${url(file.parent.instance.url, file.meta.path)}</loc>
				<lastmod>${Sitemap.date(file.meta.sitemap.lastModified)}</lastmod>
			</url>
			`;

			return file;
		}));

		sitemap = `
			<?xml version="1.0" encoding="UTF-8"?>
			<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
				${sitemap}
			</urlset>
		`.replace(/[\n\t]/g, '');

		const sitemapFile = new File({
			source: '/sitemap.xml',
			meta: {
				path: '/sitemap.xml'
			},
			fileManager: fileList[0].parent,
			data: sitemap
		});

		fileList.push(sitemapFile);
		return fileList;
	}
}

module.exports = new Sitemap();
