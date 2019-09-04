#!/usr/bin/env node
'use strict';
// tslint:disable-next-line:no-var-requires
const Command = require('./../lib/command.js')

async function command() {
    try {
        await new Command({dev: false}).run(process.cwd(), process.argv.slice(2))
    } catch (error) {
        console.error(error.stack)
        process.exit(1)
    }
}
command()
