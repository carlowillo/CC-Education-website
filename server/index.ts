import {createApp,host} from './app.js';
const app=await createApp();
import {serveStaticApp} from './static.js';
if(process.env.NODE_ENV==='production'||process.env.VERCEL){serveStaticApp(app);}
else{
 const {createServer}=await import('vite');
 const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
 app.use(vite.middlewares);
}
const port=Number(process.env.PORT||3000);
app.listen(port,host,()=>console.log(`Education Reach running on port ${port}`)).on('error',()=>{console.error('Could not start the server. Check that the port is available and permitted.');process.exit(1);});
