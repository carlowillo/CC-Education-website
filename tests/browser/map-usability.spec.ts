import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Initiative} from '../../src/types';

async function openOffline(page:Page){
 const body=readFileSync(new URL('../../artifacts/education-reach-preview.html',import.meta.url),'utf8');
 await page.route('http://127.0.0.1:3000/usability-preview.html',route=>route.fulfill({contentType:'text/html',body}));
 await page.goto('http://127.0.0.1:3000/usability-preview.html');
 await expect(page.getByText('70 / 70 sites · combined driving coverage')).toBeVisible();
}
test('offline place labels, collapsible controls and a docked detail panel keep the map readable',async({page})=>{
 await openOffline(page);
 await expect(page.locator('.place-label').filter({hasText:/^London$/})).toBeVisible();
 await expect(page.locator('.initiative-cluster').first()).toBeVisible();
 await page.getByRole('button',{name:'Expand map',exact:true}).click();
 await expect(page.locator('.map-stage')).toHaveClass(/is-expanded/);
 await page.keyboard.press('Escape');await expect(page.locator('.map-stage')).not.toHaveClass(/is-expanded/);
 await expect(page.locator('#journey-settings')).toBeHidden();
 await page.getByRole('button',{name:'Journey settings',exact:true}).click();
 await expect(page.locator('#journey-settings')).toBeVisible();
 const settings=await page.locator('#journey-settings').boundingBox(),map=await page.locator('.map-area').boundingBox();
 expect(settings!.y+settings!.height).toBeLessThanOrEqual(map!.y+1);
 await page.getByRole('button',{name:'Close journey settings'}).click();
 await page.getByRole('button',{name:'Map key & layers'}).click();
 await page.getByLabel('Place labels',{exact:false}).uncheck();await expect(page.locator('.place-label')).toHaveCount(0);
 await page.getByLabel('Place labels',{exact:false}).check();await expect(page.locator('.place-label').filter({hasText:/^London$/})).toBeVisible();
 await page.getByRole('button',{name:'Map key & layers'}).click();
 await page.getByRole('button',{name:'Hide filters',exact:true}).click();await expect(page.locator('.sidebar')).toBeHidden();
 await page.getByRole('button',{name:'Show filters',exact:true}).click();await expect(page.locator('.sidebar')).toBeVisible();
 await page.getByRole('button',{name:'Initiative list'}).click();await page.getByLabel('Filter initiative list').fill('School 9');
 await page.locator('.list-items').getByRole('button',{name:/School 9 DE22/}).click();
 const canvas=await page.locator('.map-area').boundingBox(),detail=await page.locator('.detail-card').boundingBox();
 expect(canvas!.x+canvas!.width).toBeLessThanOrEqual(detail!.x+1);
 expect(await page.locator('.detail-card dd').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
 await page.screenshot({path:'/tmp/education-reach-docked-details.png',fullPage:true});
 await page.getByRole('button',{name:'Close initiative details'}).click();
 await page.getByRole('button',{name:'UK overview',exact:true}).click();
 await page.screenshot({path:'/tmp/education-reach-readable-map.png',fullPage:true});
});

test('co-located initiatives can be expanded and individually selected with the keyboard',async({page})=>{
 const source:Initiative[]=JSON.parse(readFileSync(new URL('../../data/initiatives.json',import.meta.url),'utf8'));
 const locations=JSON.parse(readFileSync(new URL('../../data/locations.json',import.meta.url),'utf8')).locations;
 const rows=source.filter(r=>['8','55','23'].includes(r.id)).map(r=>({...r,location:locations[r.postcode.replace(/\s/g,'')]}));
 await page.route('**/api/initiatives',route=>route.fulfill({json:rows}));
 await page.route('**/api/coverage-saved',route=>route.fulfill({json:{features:[],arrivalLondon:null}}));
 await page.route('**/api/status',route=>route.fulfill({json:{routingReady:false,precise:3,total:3}}));
 await page.goto('/');
 const cluster=page.locator('.initiative-cluster').filter({hasText:'2 initiatives'});
 await expect(cluster).toBeVisible();await cluster.focus();await cluster.press('Enter');
 if(await cluster.isVisible()){await cluster.focus();await cluster.press('Enter');}
 await expect(page.getByRole('button',{name:/School 8 · DE55/})).toBeVisible();
 await expect(page.getByRole('button',{name:/School 55 · DE55/})).toBeVisible();
 await page.getByRole('button',{name:/School 55 · DE55/}).click();
 await expect(page.getByRole('heading',{name:'School 55',exact:true})).toBeVisible();
});

test('mobile details sit below the map and settings do not overflow the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await openOffline(page);
 await page.getByRole('button',{name:'Journey settings',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Close journey settings'}).click();
 await page.getByRole('button',{name:'Initiative list'}).click();await page.getByLabel('Filter initiative list').fill('School 23');
 await page.locator('.list-items').getByRole('button',{name:/School 23 E7/}).click();
 const map=await page.locator('.map-area').boundingBox(),details=await page.locator('.detail-card').boundingBox();
 expect(map!.y+map!.height).toBeLessThanOrEqual(details!.y+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/education-reach-readable-mobile.png',fullPage:true});
});
