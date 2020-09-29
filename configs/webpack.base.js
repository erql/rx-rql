const path = require('path');
const package = require('../package.json');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../dist'),
        library: package.name,
        libraryTarget: 'umd',
        publicPath: '/dist/',
        umdNamedDefine: true
    },
    module: {
        rules: [
            {
                test: /.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'configs/tsconfig.esm.json'
                        }

                    }
                ]
            },
        ]
    },
    resolve: {
        extensions: ['.ts']
    },
    externals: [
        // externalisation of rxjs
        // copied from https://github.com/jayphelps/webpack-rxjs-externals/
        function rxjsExternals(context, request, callback) {
            if (request.match(/^rxjs(\/|$)/)) {
                const parts = request.split('/');

                return callback(null, {
                    root: parts,
                    commonjs: request,
                    commonjs2: request,
                    amd: request
                });
            }

            callback();
        }
    ]
};
