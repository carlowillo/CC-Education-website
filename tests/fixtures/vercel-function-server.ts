import {createServer} from 'node:http';
import app from '../../api/index.ts';
createServer(app).listen(Number(process.env.PORT),'127.0.0.1');
