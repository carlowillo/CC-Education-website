import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Initiative} from '../../src/types';

test('real dataset, filters, data quality, missing-provider safeguard and exports',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/coverage-saved',route=>route.fulfill({json:{features:[],arrivalLondon:null}}));
 await page.route('**/api/status',route=>route.fulfill({json:{routingReady:false,precise:0,total:132}}));
 await page.goto('/');
 await expect(page.getByText('90 initiatives in this view')).toBeVisible();
 await expect(page.locator('.initiative-cluster, .initiative-pin').first()).toBeVisible();
 await page.getByRole('button',{name:'Journey settings',exact:true}).click();
 await page.getByRole('button',{name:'Calculate 45-minute areas'}).click();
 await expect(page.getByRole('heading',{name:'Connect travel coverage.'})).toBeVisible();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Initiative list'}).click();
 await page.getByLabel('Filter initiative list').fill('School 1');
 await page.locator('.list-items').getByRole('button',{name:/School 1 HS1/}).click();
 await expect(page.getByRole('heading',{name:'School 1',exact:true})).toBeVisible();
 await expect(page.getByText('Postcode centroid, not a verified entrance.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Close initiative details'}).click();
 await page.getByLabel('Open').check(); // already checked: remains current provision
 await page.getByLabel('Open').uncheck();
 await expect(page.getByText('132 initiatives in this view')).toBeVisible();
 await page.getByLabel('Strong Christian ethos',{exact:false}).check();
 await expect(page.getByText('17 initiatives in this view')).toBeVisible();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export filtered data'}).click();await expect((await dl).suggestedFilename()).toBe('education-reach-filtered.csv');
 await page.getByRole('button',{name:'Data quality',exact:false}).click();
 await expect(page.getByRole('heading',{name:'Good coverage starts with good data.'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'P03',exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/education-reach-data-quality.png',fullPage:true});
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.getByRole('button',{name:'UK overview'}).click();
 await page.screenshot({path:'/tmp/education-reach-desktop.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('mobile map and accessible filter drawer',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Christian education. Within reach.'})).toBeVisible();
 await page.getByRole('button',{name:'Filters',exact:true}).click();
 await expect(page.getByLabel('Open')).toBeVisible();
 await page.getByRole('button',{name:'Close filters'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/education-reach-mobile.png',fullPage:true});
});

test('API preserves internal dataset and fails clearly without routing credentials',async({request})=>{
 const data=await request.get('/api/initiatives');expect((await data.json()).length).toBe(132);
 expect((await data.json()).filter((r:Initiative)=>r.location?.precision==='postcode').length).toBe(79);
 expect(data.headers()['cache-control']).toBe('no-store');
 const cov=await request.post('/api/coverage',{data:{ids:['66'],mode:'driving',arrival:'2026-12-01T08:30'}});
 const status=await (await request.get('/api/status')).json();
 expect(cov.status()).toBe(status.routingReady?400:503);
 expect((await cov.json()).error).toContain(status.routingReady?'precise full postcodes':'TRAVELTIME_APP_ID');
 const search=await request.get('/api/postcode/invalid');expect(search.status()).toBe(400);
 const crossOrigin=await request.post('/api/geocode',{headers:{origin:'https://untrusted.example'},data:{}});expect(crossOrigin.status()).toBe(403);
 const nonJson=await request.post('/api/geocode',{form:{}});expect(nonJson.status()).toBe(415);
});

test('fixture coverage uses both travel modes and checks postcode membership',async({page})=>{
 // Deliberate fixtures: these validate UI integration, not a live provider response.
 const source=JSON.parse(readFileSync(new URL('../../data/initiatives.json',import.meta.url),'utf8')) as Initiative[];
 const rows=source.map(r=>r.id==='1'?{...r,location:{lat:58.21,lng:-6.38,precision:'postcode',label:r.postcode,source:'Test fixture'}}:r);
 await page.route('**/api/initiatives',route=>route.fulfill({json:rows}));
 await page.route('**/api/coverage-saved',route=>route.fulfill({json:{features:[],arrivalLondon:null}}));
 await page.route('**/api/status',route=>route.fulfill({json:{routingReady:true,precise:1,total:132}}));
 const modes:string[]=[];
 await page.route('**/api/coverage',route=>{
  const b=route.request().postDataJSON();modes.push(b.mode);
  expect(b.ids).toEqual(['1']);expect(b.includePlanned).toBe(false);
  return route.fulfill({json:{errors:[],features:[{type:'Feature',properties:{id:'1',name:'School 1',mode:b.mode,arrival:'2026-12-01T08:30:00Z',minutes:45},geometry:{type:'MultiPolygon',coordinates:[[[[-6.6,58],[-6.1,58],[-6.1,58.5],[-6.6,58.5],[-6.6,58]]]]}}]}});
 });
 await page.route('**/api/postcode/HS12YN',route=>route.fulfill({json:{lat:58.21,lng:-6.38,postcode:'HS1 2YN'}}));
 await page.goto('/');
 await page.getByRole('button',{name:'Journey settings',exact:true}).click();
 await page.getByRole('button',{name:'Calculate 45-minute areas'}).click();
 await expect(page.getByText('1 / 1 sites · combined driving coverage')).toBeVisible();
 await page.getByLabel('Search a full UK postcode').fill('HS12YN');await page.getByRole('button',{name:'Find postcode'}).click();
 await expect(page.getByText('Within 45 minutes of 1 selected initiative by car.')).toBeVisible();
 await page.getByRole('button',{name:'Public transport',exact:true}).click();
 await expect(page.getByText('Location view · travel areas not calculated')).toBeVisible();
 await page.getByRole('button',{name:'Calculate 45-minute areas'}).click();
 await expect(page.getByText('Within 45 minutes of 1 selected initiative by public transport.')).toBeVisible();
 expect(modes).toEqual(['driving','public_transport']);
});
