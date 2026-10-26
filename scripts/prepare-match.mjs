// Existing gameplay regressions acknowledge the real private briefing before testing the round.
export async function prepareMatch(pages){
 await Promise.all(pages.map(p=>p.waitForFunction(()=>window.gameState?.status==='briefing',null,{timeout:90000})));
 for(const p of pages)await p.getByRole('button',{name:'Ready',exact:true}).click();
}
