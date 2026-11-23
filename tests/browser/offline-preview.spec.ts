import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {expectSelected,expectCoverage} from './helpers';

async function openOffline(page:Page){
 // Managed Chromium blocks file URLs. Serve the unchanged self-contained file
 // as a local fixture, without claiming direct file-URL validation.
 const body=readFileSync(new URL('../../artifacts/education-reach-preview.html',import.meta.url),'utf8');
 await page.route('http://127.0.0.1:3000/download-preview.html',route=>route.fulfill({contentType:'text/html',body}));
 await page.goto('http://127.0.0.1:3000/download-preview.html');
 await expectSelected(page,90);
 await expectCoverage(page);
}

test('standalone HTML has a simple map and working filters without external assets',async({page})=>{
 const errors:string[]=[],external:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,route=>{external.push(route.request().url());return route.abort();});
 await openOffline(page);
 await expect(page.getByRole('heading',{name:'Christ-centred education. Within reach.'})).toBeVisible();
 await expect(page.locator('.initiative-cluster, .initiative-pin').first()).toBeVisible();
 await expect(page.locator('.arrival-summary, .coverage-summary, .map-caption')).toHaveCount(0);
 await expect(page.locator('.selection-summary strong')).toHaveCount(1);
 await page.getByRole('button',{name:'Map settings',exact:true}).click();
 await page.getByRole('button',{name:'Hide saved coverage'}).click();
 await expect(page.locator('.coverage-area')).toHaveCount(0);await expectSelected(page,90);
 await page.getByRole('button',{name:'Show saved coverage'}).click();await expectCoverage(page);
 await expect(page.getByRole('button',{name:'Live recalculation requires server'})).toBeDisabled();
 await page.getByRole('button',{name:'Close journey settings'}).click();
 await page.getByRole('button',{name:'Public transport',exact:true}).click();await expectCoverage(page);
 await page.getByRole('button',{name:'Driving',exact:true}).click();await expectCoverage(page);
 await page.getByRole('button',{name:'Coverage details',exact:true}).click();
 await expect(page.getByText('90 of 90 eligible selected initiatives',{exact:false})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export combined coverage'}).click();
 expect((await download).suggestedFilename()).toBe('education-reach-combined.geojson');
 await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('checkbox',{name:/^Open \d+$/}).uncheck();await expectSelected(page,132);
 await page.getByLabel('Strong Christian ethos',{exact:false}).check();await expectSelected(page,17);await expectCoverage(page);
 await page.getByRole('button',{name:'Reset',exact:true}).click();await expectSelected(page,90);
 await page.getByRole('button',{name:'UK overview'}).click();
 await page.screenshot({path:'/tmp/education-reach-download-preview.png',fullPage:true});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('the selected count and coverage respond to provision, support and organisation filters',async({page})=>{
 await openOffline(page);
 await page.getByLabel('Home Education Hub',{exact:false}).check();await expectSelected(page,14);await expectCoverage(page);
 await page.getByRole('button',{name:'Coverage details',exact:true}).click();
 await expect(page.getByText('14 of 14 eligible selected initiatives',{exact:false})).toBeVisible();
 await expect(page.getByText('11 selected locations are estimates',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.locator('summary').filter({hasText:'Our level of support'}).click();
 await page.getByLabel('High - inspired the vision',{exact:false}).check();await expectSelected(page,10);await expectCoverage(page);
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.locator('summary').filter({hasText:'Connected organisation'}).click();
 await page.getByLabel('Christian Schools Trust',{exact:false}).check();await expectSelected(page,25);await expectCoverage(page);
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.getByRole('checkbox',{name:/^Open \d+$/}).uncheck();await expectSelected(page,132);await expectCoverage(page);
 await page.getByRole('button',{name:'Coverage details',exact:true}).click();
 await expect(page.getByText('132 of 132 eligible selected initiatives',{exact:false})).toBeVisible();
});

test('real estimated areas, postcode matches and developing stages work through optional controls',async({page})=>{
 await openOffline(page);
 await expect(page.locator('.coverage-area.open.estimated')).toHaveCount(1);
 await page.getByLabel('Search a full UK postcode').fill('NP76AW');await page.getByRole('button',{name:'Find postcode'}).click();
 await expect(page.locator('.search-result').getByRole('button',{name:/School 45 \(estimated\) · Open/})).toBeVisible();
 await expect(page.locator('.search-match-context')).toContainText('use estimated locations');
 await page.getByRole('button',{name:'Map settings',exact:true}).click();
 await page.getByLabel('Include estimated locations',{exact:true}).uncheck();
 await expectSelected(page,90);await expect(page.locator('.coverage-area.estimated')).toHaveCount(0);
 await expect(page.locator('.search-result').getByRole('button',{name:/School 45 \(estimated\)/})).toHaveCount(0);
 await page.getByLabel('Include estimated locations',{exact:true}).check();
 await page.getByRole('button',{name:'Close journey settings'}).click();
 await page.getByRole('button',{name:'Clear search'}).click();
 await page.getByRole('checkbox',{name:/^Open \d+$/}).uncheck();await expectSelected(page,132);await expectCoverage(page);
 await expect(page.locator('.coverage-area.developing.estimated')).toHaveCount(1);
 await expect(page.locator('.coverage-area.unknown.estimated')).toHaveCount(1);
 await page.getByRole('button',{name:'Public transport',exact:true}).click();await expectCoverage(page);
 await page.getByRole('button',{name:'Map key & layers'}).click();
 await page.screenshot({path:'/tmp/education-reach-all-stages-coverage.png',fullPage:true});
 await page.getByRole('button',{name:'Map key & layers'}).click();
 await page.getByRole('checkbox',{name:/^Gathering a team \d+$/}).check();await expectSelected(page,16);await expectCoverage(page);
 await expect(page.locator('.coverage-area.open')).toHaveCount(0);await expect(page.locator('.coverage-area.unknown')).toHaveCount(0);
});
