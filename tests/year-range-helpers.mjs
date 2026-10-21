// Set native range inputs for tests whose subject is another visualization.
// Pointer, touch and keyboard gestures are exercised in year-range-smoke.mjs.
export async function setYearRange(page,lo,hi,root='#year-range'){
 await page.locator(root).evaluate((el,[lo,hi])=>{
  const [a,b]=el.querySelectorAll('input[type=range]');a.value=String(lo);b.value=String(hi);
  for(const input of [a,b])input.dispatchEvent(new Event('input',{bubbles:true}));
  b.dispatchEvent(new Event('change',{bubbles:true}));
 },[lo,hi]);
}
