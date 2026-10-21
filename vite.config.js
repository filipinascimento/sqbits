import {defineConfig,createLogger} from 'vite';
const logger=createLogger();const warn=logger.warn.bind(logger);
logger.warn=(message,options)=>{if(!message.includes('new URL("data:'))warn(message,options);};
const warnOnce=logger.warnOnce.bind(logger);
logger.warnOnce=(message,options)=>{if(!message.includes('new URL("data:'))warnOnce(message,options);};
export default defineConfig({base:'/sqbits/',customLogger:logger,build:{target:'es2022',chunkSizeWarningLimit:5000},server:{port:5194},preview:{port:5194}});
