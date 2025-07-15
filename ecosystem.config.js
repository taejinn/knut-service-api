module.exports = {
    apps: [{
        name: 'knut-api',
        script: './dist/main.js',
        instances: 3,
        exec_mode: 'cluster'
}]
}