import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/assets',{recursive:true});
for(const name of await readdir('node_modules/helios-web/dist/assets')) if(name.endsWith('.js')) await copyFile(`node_modules/helios-web/dist/assets/${name}`,`public/assets/${name}`);
