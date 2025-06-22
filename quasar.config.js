const
	{configure} = require('quasar/wrappers'),
	wasm = require('vite-plugin-wasm'),
	topLevelAwait = require('vite-plugin-top-level-await')

module.exports = configure(() => {
	return {
		css: ['app.scss', 'fonts.scss'],
		preFetch: true,
		extras: ['mdi-v7'],
		framework: {
			iconSet: 'mdi-v7',
			plugins: ['Dialog', 'Notify'],
			config: {dark: 'auto'}
		},
		devServer: {
			host: '0.0.0.0',
			port: 80,
			open: false
		},
		build: {
			distDir: 'out',
			publicPath: '/pre-chat',
			useFilenameHashes: false,
			minify: true,
			vitePlugins: [wasm(), topLevelAwait()]
		}
	}
})
