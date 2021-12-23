module.exports = {
    apps: [
        {
            name: 'shaderBOT-server',
            script: 'build/index.js',
            node_args: '-r dotenv/config',
        },
    ],
};
