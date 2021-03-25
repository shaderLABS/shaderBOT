module.exports = {
    apps: [
        {
            name: 'shaderBOT-server',
            script: 'src/index.js',
            node_args: '-r dotenv/config',
        },
    ],
};
