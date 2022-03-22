const webpack = require('webpack');

module.exports = {
    entry: './browser.js',
    target: 'web',
    output: {
        path: __dirname + "/dist/",
        filename: 'tydidsp2p.bundle.js',
        libraryTarget: 'var',
        library: 'EntryPoint'
    },
    plugins: [
       // Work around for Buffer is undefined:
       // https://github.com/webpack/changelog-v5/issues/10
       new webpack.ProvidePlugin({
           Buffer: ['buffer', 'Buffer'],
       }),
       new webpack.ProvidePlugin({
           process: 'process/browser',
       }),
   ],
    resolve:  {
      fallback: {
        "fs": false,
        "tls": false,
        "net": false,
        "path": false,
        "zlib": false,
        "http": false,
        "https": false,
        "stream": false,
        "crypto": false,
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify
    }
  }
};
