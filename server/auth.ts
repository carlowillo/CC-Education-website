import {createHash, timingSafeEqual} from 'node:crypto';
import type {RequestHandler} from 'express';

export function passwordGate(username: string, password: string): RequestHandler {
  const expected=createHash('sha256').update(`${username}:${password}`).digest();
  return (req,res,next)=>{
    const header=req.get('authorization')||'';
    let supplied='';
    if(header.startsWith('Basic ')) supplied=Buffer.from(header.slice(6),'base64').toString('utf8');
    const candidate=createHash('sha256').update(supplied).digest();
    if(timingSafeEqual(candidate,expected))return next();
    res.set('WWW-Authenticate','Basic realm="Education Reach internal preview", charset="UTF-8"');
    res.set('Cache-Control','no-store');
    res.status(401).send('Sign in to view the internal Education Reach preview.');
  };
}
