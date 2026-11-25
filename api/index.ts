// A single protected Express function serves HTML, assets and APIs on Vercel.
// There is deliberately no public static-site builder that could bypass login.
export const config={maxDuration:60};
import {createApp} from '../server/app.js';
import {serveStaticApp} from '../server/static.js';
const app=await createApp({serverless:true});
serveStaticApp(app);
export default app;
