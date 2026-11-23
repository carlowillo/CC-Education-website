import {expect,type Page} from '@playwright/test';
export async function expectSelected(page:Page,count:number){
 await expect(page.locator('.selection-summary strong')).toHaveText(String(count));
 await expect(page.locator('.selection-summary span')).toHaveText(count===1?'initiative selected':'initiatives selected');
}
export async function expectCoverage(page:Page){
 // Selected areas can be outside the viewport after a postcode zoom.
 await expect(page.locator('.coverage-area')).not.toHaveCount(0,{timeout:20000});
 await expect(page.locator('.map-feedback').filter({hasText:'Updating coverage…'})).toHaveCount(0,{timeout:20000});
}
