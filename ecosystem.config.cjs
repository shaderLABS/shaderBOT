module.exports = {
    apps: [
        {
            name: 'shaderBOT',
            script: 'build/index.js',
            node_args: '-r dotenv/config',
            time: true,
        },
    ],
};
