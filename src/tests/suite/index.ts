import * as fs from 'fs';
import * as path from 'path';
import Mocha from 'mocha';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
    });

    const suiteDir = __dirname;
    for (const file of fs.readdirSync(suiteDir)) {
        if (file.endsWith('.test.js')) {
            mocha.addFile(path.join(suiteDir, file));
        }
    }

    return new Promise((resolve, reject) => {
        mocha.run(failures => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}
