import express from 'express';
import path from 'node:path';
import {root} from './data.js';
export function serveStaticApp(app:express.Express){
 app.use(express.static(path.join(root,'dist')));
 app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));
}
