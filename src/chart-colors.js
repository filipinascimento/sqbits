// Dark qualitative colors for thin marks on the atlas's light backgrounds.
// Assign colors without replacement among the (at most 12) plotted series;
// hashing category names independently can give two series the same color.
export const seriesPalette=Object.freeze([
 '#0072b2','#b84e00','#007d59','#a43773','#7153a5','#8c6500',
 '#007b8a','#a52a3a','#354b86','#627719','#80503a','#4d5660',
]);
const dashes=['','8 3','2 3','10 3 2 3','12 4','4 3 1 3'];
const styles=seriesPalette.map((color,i)=>Object.freeze({color,dash:dashes[i%dashes.length]}));

export function createSeriesStyles(categories=[]){
 const assignments=new Map(categories.slice(0,styles.length).map((category,i)=>[category,i]));
 let active=new Set();
 return {
  sync(categories){
   const next=new Set(categories);if(next.size>styles.length)throw new RangeError('Plot up to 12 categories at once');
   // Keep the colors of series already on screen; allocate remaining colors
   // to newly selected categories, including past selections returning later.
   const ordered=[...active].filter(c=>next.has(c)).concat([...next].filter(c=>!active.has(c))),used=new Set();
   for(const category of ordered){
    let slot=assignments.get(category);
    if(slot==null||used.has(slot))slot=styles.findIndex((_,i)=>!used.has(i));
    assignments.set(category,slot);used.add(slot);
   }
   active=next;
  },
  get(category){
   if(assignments.has(category))return styles[assignments.get(category)];
   // Unplotted rows may reuse colors; sync resolves every collision before
   // a row joins the plot. Remembered assignments survive population filters.
   let hash=2166136261;for(const c of String(category))hash=Math.imul(hash^c.charCodeAt(0),16777619);
   return styles[(hash>>>0)%styles.length];
  },
 };
}
