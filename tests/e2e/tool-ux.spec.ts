import { test, expect } from '@playwright/test';
const input = (key: string) => `input[data-path="scenarios.0.${key}"]`;

test('U01 金額逐字編輯、游標、刪除與無效貼上', async ({page}) => {
  await page.goto('/tools/personal-loan/');
  const amount=page.locator(input('principal'));
  await amount.fill(''); await amount.pressSequentially('1234567');
  await expect(amount).toHaveValue('1,234,567');
  await amount.press('Home'); await amount.press('ArrowRight'); await amount.press('ArrowRight');
  await amount.press('9'); await expect(amount).toHaveValue('19,234,567');
  expect(await amount.evaluate(e=>(e as HTMLInputElement).selectionStart)).toBe(2);
  await amount.fill('1234'); await amount.press('Home'); await amount.press('ArrowRight'); await amount.press('ArrowRight');
  await amount.press('Backspace'); await expect(amount).toHaveValue('234');
  await amount.fill('1234.'); await expect(amount).toHaveValue('1,234.');
  await amount.pressSequentially('50'); await expect(amount).toHaveValue('1,234.50');
  await amount.fill('NT$1234'); await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
  await expect(amount).toHaveValue('NT$1234'); await expect(amount).toHaveAttribute('aria-invalid','true');
  await amount.fill(''); await expect(amount).toHaveValue('');
});

test('U02 U03 房貸預設、年月精確往返及明細收合',async({page})=>{
 await page.goto('/tools/mortgage/');
 await expect(page.locator('#f-scenarios-0-inputMode')).toHaveValue('price-ltv');
 await expect(page.locator(input('ltv'))).toHaveValue('80');
 const wrap=page.locator('[data-field="scenarios.0.termMonths"]');
 for(const months of [360,365,1,600]){
  await wrap.getByRole('button',{name:'個月',exact:true}).click();
  await page.locator(input('termMonths')).fill(String(months));
  await wrap.getByRole('button',{name:'年',exact:true}).click();
  await expect(page.locator(input('termMonths'))).toHaveValue(String(Math.floor(months/12)));
  await expect(page.locator('#f-scenarios-0-termMonths-extra')).toHaveValue(String(months%12));
  await wrap.getByRole('button',{name:'個月',exact:true}).click();
  await expect(page.locator(input('termMonths'))).toHaveValue(String(months));
 }
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator('details.schedule-details')).not.toHaveAttribute('open','');
 await page.locator('details.schedule-details summary').click();
 await expect(page.getByRole('table',{name:'逐月攤還表',exact:true}).locator('tbody tr')).toHaveCount(600);
});

test('U04 累積模式標籤、權重及比較不引用配置',async({page})=>{
 await page.goto('/tools/portfolio/'); await page.locator('#f-mode').selectOption('accumulation');
 await expect(page.locator('.tab-badge').first()).toContainText('每月');
 await expect(page.locator('.tool-compare')).not.toContainText('可投資資產');
 await expect(page.locator('.tool-compare')).not.toContainText('套用至其他方案');
 await page.locator(input('accAssets.0.weight')).fill('60');
 await expect(page.locator('[data-weight-summary]')).toContainText('還差 10%');
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator('.tool-results')).not.toContainText('accAssets');
 await expect(page.locator('.tool-results')).toContainText('長期目標資產配置');
});

test('U05 退休預設收入與必要起領年齡',async({page})=>{
 await page.goto('/tools/retirement/');
 await expect(page.locator('.adv-pill')).toContainText('無其他退休收入');
 await page.locator('#advanced-settings-box summary').click();
 await expect(page.locator(input('monthlyIncome'))).toHaveValue('0');
 await page.locator(input('monthlyIncome')).fill('10000');
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator(input('incomeStartAge'))).toHaveAttribute('aria-invalid','true');
 await page.locator(input('incomeStartAge')).fill('65');
 await expect(page.locator('.adv-pill')).toContainText('65 歲');
});

test('U08 U09 信貸快捷期數、單選鍵盤及限制原因',async({page})=>{
 await page.goto('/tools/personal-loan/');
 await page.getByRole('button',{name:'84 個月',exact:true}).click();
 await expect(page.locator(input('termMonths'))).toHaveValue('84');
 await expect(page.locator('[data-month-hint]')).toContainText('84 個月＝7 年');
 const radios=page.getByRole('radio'); await expect(radios).toHaveCount(2);
 await radios.first().focus(); await radios.first().press('ArrowRight'); await expect(radios.nth(1)).toBeChecked();
 await page.getByRole('button',{name:'＋ 複製目前方案'}).click();
 await expect(page.locator('.scenario-tabs')).toContainText('最多 3 個方案');
});

test('U01 五工具金額欄位與模式均採千分位，非金額不受影響',async({page})=>{
 for(const tool of ['mortgage','personal-loan','stock-pledge','retirement','portfolio']){
  await page.goto(`/tools/${tool}/`); await expect(page.locator('#tool-root')).toHaveAttribute('data-ready','true');
  const advanced=page.locator('#advanced-settings-box'); if(await advanced.count()) await advanced.locator('summary').click();
  const otherBefore = await page.locator('#tool-root input[data-kind]:not([data-kind="amount"])').evaluateAll(els => els.map(e=>(e as HTMLInputElement).value));
  const fields=page.locator('input[data-kind="amount"]:visible');
  const count=await fields.count(); expect(count).toBeGreaterThan(0);
  for(let i=0;i<count;i++){await fields.nth(i).fill('1234567.50'); await expect(fields.nth(i)).toHaveValue('1,234,567.50');}
  expect(await page.locator('#tool-root input[data-kind]:not([data-kind="amount"])').evaluateAll(els => els.map(e=>(e as HTMLInputElement).value))).toEqual(otherBefore);
  if(tool==='portfolio'){
   await page.locator('#f-mode').selectOption('accumulation');
   await page.locator(input('initial')).fill('2345678'); await expect(page.locator(input('initial'))).toHaveValue('2,345,678');
  }
 }
});

test('U01 U07 信貸格式、JSON及完整CSV數值一致',async({page})=>{
 const fs=await import('node:fs/promises');
 await page.goto('/tools/personal-loan/');
 await page.locator(input('principal')).fill('120000');
 await page.locator(input('annualRate')).fill('0');
 await page.locator(input('fee')).fill('0');
 await page.getByRole('button',{name:'12 個月',exact:true}).click();
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator('.card-featured').first()).toContainText('10,000');
 await expect(page.locator('details.schedule-details')).not.toHaveAttribute('open','');
 const csvPromise=page.waitForEvent('download'); await page.locator('.btn-csv-download').click();
 const csv=await csvPromise; const rows=(await fs.readFile((await csv.path())!,'utf8')).trim().split(/\r?\n/);
 expect(rows).toHaveLength(13); expect(rows[1]).toContain('10000'); expect(rows[12]).toMatch(/,0(?:\.00)?$/);
 await page.locator('.storage-management summary').click();
 const jsonPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'匯出設定檔（JSON）'}).click();
 const json=JSON.parse(await fs.readFile((await (await jsonPromise).path())!,'utf8'));
 expect(json.inputs.scenarios[0].principal).toBe('120,000'); expect(json.inputs.scenarios[0].termMonths).toBe('12');
 await page.locator(input('principal')).fill('555');
 await page.locator('#import-file').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});
 await expect(page.locator(input('principal'))).toHaveValue('120,000'); await expect(page.locator('.card-featured').first()).toContainText('10,000');
});

test('U02 U03 舊房貸模式JSON還原、重設預設及寬限期界線',async({page})=>{
 await page.goto('/tools/mortgage/'); await page.locator('.storage-management summary').click();
 const legacy={schemaVersion:1,toolId:'mortgage',inputs:{scenarios:[{name:'舊方案',inputMode:'price-down',price:'12000000',downPayment:'2400000',termMonths:'365',method:'annuity',graceMonths:'0',fee:'0',segments:[{startMonth:'1',annualRate:'2.2'}]}]}};
 await page.locator('#import-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await expect(page.locator('#f-scenarios-0-inputMode')).toHaveValue('price-down');
 await expect(page.locator(input('price'))).toHaveValue('12,000,000');
 await expect(page.locator(input('termMonths'))).toHaveValue('30'); await expect(page.locator('#f-scenarios-0-termMonths-extra')).toHaveValue('5');
 await page.locator('#advanced-settings-box summary').click();
 await page.locator(input('graceMonths')).fill('365'); await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator(input('graceMonths'))).toHaveAttribute('aria-invalid','true');
 await page.locator(input('graceMonths')).fill('364'); await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator(input('graceMonths'))).not.toHaveAttribute('aria-invalid','true');
 await page.getByRole('button',{name:'清空重設',exact:true}).click();
 await expect(page.locator('#f-scenarios-0-inputMode')).toHaveValue('price-ltv'); await expect(page.locator(input('ltv'))).toHaveValue('80');
 await page.getByRole('button',{name:'載入範例資料',exact:true}).click();
 await expect(page.locator('#f-scenarios-0-inputMode')).toHaveValue('price-ltv');
});

test('U04 切換模式保留獨立數值與不相干比較基準',async({page})=>{
 await page.goto('/tools/portfolio/');
 await page.locator(input('assets.0.value')).fill('2345678');
 await page.locator('#f-mode').selectOption('accumulation');
 await expect(page.locator('.tool-compare .notice-warn')).toHaveCount(0);
 await page.locator(input('initial')).fill('750000');
 await expect(page.locator('.tool-compare .notice-warn')).toContainText('期初投入');
 await page.locator('#f-mode').selectOption('allocation');
 await expect(page.locator(input('assets.0.value'))).toHaveValue('2,345,678');
 await page.locator('#f-mode').selectOption('accumulation'); await expect(page.locator(input('initial'))).toHaveValue('750,000');
});

test('U05 舊退休收入本機儲存保留，零收入不要求起領年齡',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('larry-lab:v1:tool:retirement',JSON.stringify({schemaVersion:1,toolId:'retirement',inputs:{unit:'real',scenarios:[{name:'舊收入範例',currentAge:'35',retireAge:'60',endAge:'90',assets:'2000000',monthlyContribution:'25000',monthlySpending:'45000',monthlyIncome:'10000',incomeStartAge:'65',inflation:'3',returnBefore:'5',returnAfter:'5'}]}})));
 await page.goto('/tools/retirement/'); await expect(page.locator('.adv-pill')).toContainText('65 歲');
 await page.locator('#advanced-settings-box summary').click(); await expect(page.locator(input('monthlyIncome'))).toHaveValue('10,000');
 await page.locator(input('monthlyIncome')).fill('0'); await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator(input('incomeStartAge'))).toBeHidden(); await expect(page.locator('.tool-results [role="alert"]')).toHaveCount(0);
});

test('U01 真正剪貼簿貼上與中段選取取代',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.goto('/tools/personal-loan/'); const amount=page.locator(input('principal'));
 await page.evaluate(()=>navigator.clipboard.writeText('1234567.0200'));
 await amount.focus(); await amount.press('ControlOrMeta+A'); await amount.press('ControlOrMeta+V');
 await expect(amount).toHaveValue('1,234,567.0200');
 await amount.press('Home'); await amount.press('ArrowRight'); await amount.press('Shift+ArrowRight'); await amount.press('Shift+ArrowRight'); await amount.press('9');
 await expect(amount).toHaveValue('1,934,567.0200');
 await page.evaluate(()=>navigator.clipboard.writeText('1,2,3'));
 await amount.press('ControlOrMeta+A'); await amount.press('ControlOrMeta+V');
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(amount).toHaveValue('1,2,3'); await expect(amount).toHaveAttribute('aria-invalid','true');
});

test('U03 非法年月不捨入，切換時保留可修正的原始輸入',async({page})=>{
 await page.goto('/tools/mortgage/'); const years=page.locator(input('termMonths'));
 await years.fill('30.5'); await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(years).toHaveAttribute('aria-invalid','true');
 await page.locator('[data-field="scenarios.0.termMonths"]').getByRole('button',{name:'個月',exact:true}).click();
 await expect(years).toHaveValue('30.5'); await expect(page.locator('.status')).toContainText('先修正');
});

test('U01 非法逗號刪除不連帶刪數字，組字結束後重新編排ASCII金額',async({page})=>{
 await page.goto('/tools/personal-loan/'); const amount=page.locator(input('principal'));
 await amount.fill('1,23'); await amount.press('Home'); await amount.press('ArrowRight'); await amount.press('ArrowRight'); await amount.press('Backspace');
 await expect(amount).toHaveValue('123');
 await amount.fill('1,234');
 await amount.evaluate(el=>{
  const field=el as HTMLInputElement;
  field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
  field.value='1,9234'; field.setSelectionRange(3,3);
  field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'9',isComposing:true}));
  field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'9'}));
 });
 await expect(amount).toHaveValue('19,234');
});

test('U09 延遲重算後仍保留方向鍵選取方案焦點',async({page})=>{
 await page.clock.install(); await page.goto('/tools/personal-loan/');
 await page.locator(input('principal')).fill('123456');
 const first=page.getByRole('radio').first(); await first.focus(); await first.press('ArrowRight');
 await page.clock.runFor(400); await expect(page.getByRole('radio').nth(1)).toBeFocused();
});

test('U03 非法年月草稿複製與JSON匯入後仍可編輯原文字',async({page})=>{
 const fs=await import('node:fs/promises');
 await page.goto('/tools/mortgage/'); await page.locator(input('termMonths')).fill('30.5');
 await page.getByRole('button',{name:'＋ 複製目前方案'}).click();
 await expect(page.locator('input[data-path="scenarios.2.termMonths"]')).toHaveValue('30.5');
 await page.locator('.storage-management summary').click();
 const promise=page.waitForEvent('download'); await page.getByRole('button',{name:'匯出設定檔（JSON）'}).click();
 const json=await fs.readFile((await(await promise).path())!,'utf8');
 await page.locator('#import-file').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.locator(input('termMonths'))).toHaveValue('30.5');
});

test('U03 年空白但額外月份有值時不會漏算寬限期',async({page})=>{
 await page.goto('/tools/mortgage/'); await page.locator('#advanced-settings-box summary').click();
 const field=page.locator('[data-field="scenarios.0.graceMonths"]'); await field.getByRole('button',{name:'年',exact:true}).click();
 await page.locator(input('graceMonths')).fill(''); await page.locator('#f-scenarios-0-graceMonths-extra').fill('5');
 await page.getByRole('button',{name:'查看試算結果 ↓'}).click();
 await expect(page.locator('.tool-compare')).toContainText('5 個月');
 await expect(page.locator('.tool-results [role="alert"]')).toHaveCount(0);
});

test('U01 同額舊JSON的兩個方案不因千分位顯示產生假差異',async({page})=>{
 await page.goto('/tools/mortgage/'); await page.locator('.storage-management summary').click();
 const scenario={name:'原方案',inputMode:'price-ltv',price:'12000000',ltv:'80',termMonths:'360',method:'annuity',graceMonths:'0',fee:'15000',monthlyIncome:'120000',otherMonthlyDebt:'0',segments:[{startMonth:'1',annualRate:'2.2'}]};
 const data={schemaVersion:1,toolId:'mortgage',inputs:{scenarios:[scenario,{...scenario,name:'相同條件'}]}};
 await page.locator('#import-file').setInputFiles({name:'same.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await expect(page.locator('.tool-compare .notice-warn')).toHaveCount(0);
});
