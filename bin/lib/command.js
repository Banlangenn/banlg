module.exports = class Command {
    constructor(options) {
        options = options || {}
        this.name = options.name || 'egg-init'
    }
    run(cwd, args) {
        const argv = this.argv = this.getParser().parse(args || []);
        this.cwd = cwd;
    }
    getParser() {
        return yargs
          .usage('init egg project from boilerplate.\nUsage: $0 [dir] --type=simple')
          .options(this.getParserOptions())
          .alias('h', 'help')
          .version()
          .help();
      }
}