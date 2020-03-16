const { execSync } = require('child_process');
const { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync, unlinkSync } = require('fs');
const camelCase = require('camelcase');
const { updateFile } = require('../utils/fileHelpers');
const readmeUpdater = require('../utils/readmeUpdater');
const envUpdater = require('../utils/envUpdater');
const gitignoreUpdater = require('../utils/gitignoreUpdater');
const indexUpdater = require('../utils/indexUpdater');
const entryFileUpdater = require('../utils/entryFileUpdater');
const componentUpdater = require('../utils/componentUpdater');
const vuetifyUpdater = require('../utils/vuetifyUpdater');
const getLicenseText = require('../utils/getLicenseText');
const getPackageExtension = require('../utils/getPackageExtension');
const getEslintignore = require('../utils/getEslintignore');
const getEslintrc = require('../utils/getEslintrc');

module.exports = (api, options) => {

    const packageName = api.generator.pkg.name;
    options.appName = camelCase(packageName, { pascalCase: true });

    const { appName, addLicense, createScript, scriptId, scriptType, timezone } = options;

    const usesTypescript = api.hasPlugin('typescript');
    const usesEslint = api.hasPlugin('eslint');

    api.extendPackage(getPackageExtension(api, options));

    api.render('./templates');

    api.postProcessFiles(files => {

        if (!existsSync(api.resolve('dist'))) {
            mkdirSync(api.resolve('dist'));
        }

        console.log('🔑 Launching clasp login...');
        execSync('echo lauching clasp login...');
        if (createScript) {
            console.log('📝 Creating new script...');
            execSync('echo creating new script...');
            execSync(`clasp create --type ${scriptType} --title "${appName}" --rootDir ./dist`);
        } else {
            console.log('📝 Setting up existing script...');
            execSync('echo setting up existing script...');
            execSync(`clasp create --title "${appName}" --parentId "${scriptId}" --rootDir ./dist`);
        }
        
        console.log('📝 Changing files...');
        execSync('echo changing files...');

        if (!files['README.md']) files['README.md'] = '\n ';
        if (!files['.env']) files['.env'] = '\n ';
        if ('dist/dummy.txt' in files) delete files['dist/dummy.txt'];
        if (usesTypescript) {
            delete files['src/server/ErrorHandler.js'];
            delete files['src/server/Service.js'];
        } else {
            delete files['src/server/ErrorHandler.ts'];
            delete files['src/server/Service.ts'];
        }

        updateFile(files, 'README.md', content => readmeUpdater(content, options));
        updateFile(files, 'public/index.html', content => indexUpdater(content, options));
        updateFile(files, '.env', content => envUpdater(content, options));
        updateFile(files, '.gitignore', content => gitignoreUpdater(content, options));
        updateFile(files, api.entryFile, content => entryFileUpdater(content, { usesTypescript }));
        updateFile(files, 'src/components/HelloWorld.vue', content => componentUpdater(content, options));

        if (addLicense) files['LICENSE'] = getLicenseText(options);

        if (usesTypescript && 'src/plugins/vuetify.ts' in files) updateFile(files, 'src/plugins/vuetify.ts', content => vuetifyUpdater(content, options));

        if (usesEslint) {
            files['.eslintignore'] = getEslintignore();
            files['src/server/.eslintrc.json'] = getEslintrc(api);
        }
    });

    api.onCreateComplete(() => {
        copyFileSync(api.resolve('dist', 'appsscript.json'), api.resolve('src', 'server', 'appsscript.json'));
        unlinkSync(api.resolve('dist', 'appsscript.json'));
        let scriptConfig = JSON.parse(readFileSync(api.resolve('src', 'server', 'appsscript.json'), { encoding: 'utf-8' }));
        scriptConfig.timeZone = timezone;
        writeFileSync(api.resolve('src', 'server', 'appsscript.json'), JSON.stringify(scriptConfig));
    });
}