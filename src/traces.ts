export type VisualNode = { id:string; value:string; x:number; y:number; state?:'active'|'found'|'muted'|'visited'; sub?:string };
export type Edge = { id:string; from:string; to:string; active?:boolean; curved?:boolean };
export type Pointer = { id:string; label:string; x:number; y:number; color?:string };
export type Frame = { title:string; text:string; line:number; nodes:VisualNode[]; edges:Edge[]; pointers:Pointer[]; memory?:[string,string][]; memoryLabel?:string; result?:string; focus?:string; stats?:string };
const node = (v:unknown,i:number,total:number,y=135):VisualNode => ({id:`n${i}`,value:String(v),x:350+(i-(total-1)/2)*Math.min(90,590/Math.max(total,1)),y,sub:String(i)});
export function buildFrames(id:string, raw:string):Frame[] {
 const d=JSON.parse(raw); const frames:Frame[]=[];
 const add=(f:Frame)=>frames.push(structuredClone(f));
 const base=(title:string,text:string,line:number,nodes:VisualNode[]):Frame=>({title,text,line,nodes,edges:[],pointers:[]});
 if(id==='two-sum'||id==='binary-search') {
  if(!Array.isArray(d.nums)||d.nums.length>9||!d.nums.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v))||typeof d.target!=='number'||!Number.isFinite(d.target)) throw Error('Use up to 9 finite numbers in nums and a numeric target.');
  const nums:number[]=d.nums; const ns=nums.map((v,i)=>node(v,i,nums.length));
  if(id==='two-sum') {
   const seen=new Map<number,number>(); add({...base('Find two numbers',`Our target is ${d.target}. Let’s look for two blocks that add up to it.`,0,ns),stats:`target = ${d.target}`,memoryLabel:'MEMORY · value → index',memory:[]});
   for(let i=0;i<nums.length;i++) {
    const need=d.target-nums[i]; const f=base(`Pick up ${nums[i]}`,`We have ${nums[i]}. Its missing partner is ${d.target} − ${nums[i]} = ${need}.`,2,ns.map((n,j)=>({...n,state:j===i?'active':j<i?'visited':undefined})));
    f.nodes[i].y=110; f.pointers=[{id:'i',label:`i = ${i}`,x:ns[i].x,y:54}]; f.memory=[...seen].map(([v,j])=>[String(v),String(j)]);f.memoryLabel='MEMORY · value → index'; f.stats=`${nums[i]} + ? = ${d.target}`; add(f);
    if(seen.has(need)) { const j=seen.get(need)!; f.title='The pair clicks!';f.text=`${need} + ${nums[i]} = ${d.target}. Return indices [${j}, ${i}].`;f.line=5;f.nodes.forEach((n,k)=>{if(k!==i&&k!==j){n.state='muted';n.y=215;}});f.nodes[j].state='found';f.nodes[i].state='found';f.nodes[j].x=295;f.nodes[i].x=405;f.nodes[j].y=f.nodes[i].y=110;f.pointers=[{id:'partner',label:'index '+j,x:295,y:54},{id:'i',label:'index '+i,x:405,y:54}];f.edges=[{id:'pair',from:`n${j}`,to:`n${i}`,active:true}];f.result=`[${j}, ${i}]`;f.stats=`${need} + ${nums[i]} = ${d.target}`;add(f);return frames; }
    f.title=`Remember ${nums[i]}`;f.text=`${need} is not in memory yet. Save ${nums[i]} at index ${i} so a future number can find it.`;f.line=4;seen.set(nums[i],i);f.memory=[...seen].map(([v,j])=>[String(v),String(j)]);add(f);
   }
   add({...base('No matching pair','No two different positions add up to this target.',5,ns),result:'No pair'});
  } else {
   if(nums.some((v,i)=>i>0&&v<=nums[i-1])) throw Error('Binary Search needs unique numbers sorted from smallest to largest.');
   let l=0,r=nums.length-1;add({...base('Start with the whole array',`Find ${d.target}. Each comparison will remove half of the remaining places.`,0,ns),stats:`target = ${d.target}`});
   while(l<=r) { const mid=Math.floor((l+r)/2); const f=base(`Check the middle: ${nums[mid]}`,`${nums[mid]} ${nums[mid]===d.target?'equals':nums[mid]<d.target?'is smaller than':'is larger than'} ${d.target}.`,2,ns.map((n,i)=>({...n,state:i<l||i>r?'muted':i===mid?'active':undefined,y:i<l||i>r?175:135})));
    f.pointers=[{id:'left',label:'L',x:ns[l].x-13,y:66},{id:'mid',label:'mid',x:ns[mid].x,y:46},{id:'right',label:'R',x:ns[r].x+13,y:66,color:'#9cacf9'}];f.stats=`window: ${l} … ${r}`;add(f);
    if(nums[mid]===d.target){f.title='Found it!';f.text=`The target ${d.target} lives at index ${mid}.`;f.line=5;f.nodes[mid].state='found';f.result=String(mid);add(f);return frames;}
    if(nums[mid]<d.target){l=mid+1;f.line=3;f.title='Let the left half go';f.text='Everything to the left is too small. Move the left boundary past the middle.';}else{r=mid-1;f.line=4;f.title='Let the right half go';f.text='Everything to the right is too large. Move the right boundary before the middle.';}
    f.nodes=f.nodes.map((n,i)=>({...n,state:i<l||i>r?'muted':undefined,y:i<l||i>r?175:135}));add(f);
   }add({...base('The search space is empty',`${d.target} is not in this array. Return −1.`,5,ns.map(n=>({...n,state:'muted'}))),result:'−1'});
  }
 } else if(id==='reverse-list') {
  if(!Array.isArray(d.values)||d.values.length>7||!d.values.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)))throw Error('Use up to 7 finite numbers in values.');
  const ns=d.values.map((v:number,i:number)=>node(v,i,d.values.length,145));
  const edges:Edge[]=ns.slice(0,-1).map((n:VisualNode,i:number)=>({id:`e${i}`,from:n.id,to:ns[i+1].id}));
  const f=base('Follow the chain','Each arrow points to the next node. We will turn the arrows around one by one.',0,ns);f.edges=edges;f.memoryLabel='POINTERS';f.memory=[['prev','null'],['curr',ns[0]?.value??'null']];add(f);
  for(let i=0;i<ns.length;i++) {
   f.nodes.forEach((n,j)=>{n.state=j===i?'active':j<i?'visited':undefined;});f.pointers=[{id:'curr',label:'current',x:ns[i].x,y:60},...(i>0?[{id:'prev',label:'previous',x:ns[i-1].x,y:78,color:'#9cacf9'}]:[])];
   f.title='Save the next friend';f.text=`Before changing node ${ns[i].value}, remember ${ns[i+1]?.value??'null'} so we do not lose the rest of the chain.`;f.line=1;f.memory=[['prev',ns[i-1]?.value??'null'],['curr',ns[i].value],['next',ns[i+1]?.value??'null']];add(f);
   f.edges=f.edges.filter(e=>e.from!==ns[i].id);if(i>0)f.edges.push({id:`e${i-1}`,from:ns[i].id,to:ns[i-1].id,active:true});
   f.title='Turn the arrow around';f.text=`Node ${ns[i].value} now points to ${ns[i-1]?.value??'null'}, the previous node.`;f.line=2;f.nodes[i].y=120;add(f);
   f.nodes[i].y=145;f.nodes[i].state='visited';f.title='Move along the chain';f.text='Previous moves here. Current moves to the saved next node.';f.line=4;f.memory=[['prev',ns[i].value],['curr',ns[i+1]?.value??'null']];add(f);
  }
  f.title='A new head, a reversed chain';f.text=ns.length?'Start at the last node and follow the arrows backward. The links are now reversed.':'The empty list stays empty.';f.line=5;f.result=JSON.stringify([...d.values].reverse());f.nodes.forEach(n=>n.state='found');f.pointers=ns.length?[{id:'head',label:'new head',x:ns[ns.length-1].x,y:60}]:[];add(f);
 } else if(id==='palindrome') {
  if(typeof d.text!=='string'||d.text.length>50)throw Error('Use a text string of up to 50 characters (13 after cleaning).');
  const s=d.text.toLowerCase().replace(/[^a-z0-9]/g,'');if(s.length>13)throw Error('For the animation, use up to 13 letters or digits after cleaning.');
  const ns=[...s].map((v,i)=>node(v,i,s.length));add(base('Clean up the word',`Ignoring spaces, punctuation, and case gives “${s}”.`,0,ns));let l=0,r=s.length-1;
  while(l<r){const f=base(`Compare ${s[l]} and ${s[r]}`,s[l]===s[r]?'These letters match. Both readers can move one step closer.':'These letters are different. This is not a palindrome.',2,ns.map((n,i)=>({...n,state:i===l||i===r?'active':i<l||i>r?'visited':undefined,y:i===l||i===r?115:135})));f.pointers=[{id:'left',label:'left',x:ns[l].x,y:52},{id:'right',label:'right',x:ns[r].x,y:52,color:'#9cacf9'}];f.edges=[{id:'compare',from:ns[l].id,to:ns[r].id,curved:true,active:true}];add(f);if(s[l]!==s[r]){f.result='false';f.line=3;f.title='Not a mirror';add(f);return frames;}l++;r--;}
  add({...base('A perfect mirror','Every pair matched. The two readers have met in the middle.',5,ns.map(n=>({...n,state:'found'}))),result:'true'});
 } else if(id==='parentheses') {
  if(typeof d.text!=='string'||d.text.length>10||/[^()[\]{}]/.test(d.text))throw Error('Use up to 10 brackets: ( ) [ ] { }.');
  const chars=[...d.text];const ns=chars.map((v,i)=>node(v,i,chars.length,92));const stack:{char:string,index:number}[]=[];const pairs:Record<string,string>={')':'(',']':'[','}':'{'};
  add({...base('A last-in, first-out stack','Opening brackets move onto the stack. Their matching closing brackets take them back off.',0,ns),memoryLabel:'STACK · bottom → top',memory:[]});
  for(let i=0;i<chars.length;i++) {const f=base(`Read ${chars[i]}`,'',1,ns.map((n,j)=>({...n,state:j===i?'active':j<i?'muted':undefined})));f.pointers=[{id:'read',label:'read',x:ns[i].x,y:25}];f.memoryLabel='STACK · bottom → top';
   for(const item of stack)f.nodes[item.index]={...f.nodes[item.index],x:350,y:220-stack.indexOf(item)*38,state:'visited'};
   if('([{'.includes(chars[i])) {stack.push({char:chars[i],index:i});f.nodes[i].x=350;f.nodes[i].y=220-(stack.length-1)*38;f.title=`Push ${chars[i]} onto the stack`;f.text='An opening bracket joins the top. It must close before anything underneath it.';f.line=2;f.memory=stack.map((s,j)=>[String(j),s.char]);add(f);}
   else { const top=stack.pop();f.memory=stack.map((s,j)=>[String(j),s.char]);if(!top||top.char!==pairs[chars[i]]){f.title='These brackets do not match';f.text=`Expected ${pairs[chars[i]]} at the top, but found ${top?.char??'an empty stack'}.`;f.line=4;f.result='false';add(f);return frames;}f.nodes[i].x=410;f.nodes[i].y=180;f.nodes[top.index].x=290;f.nodes[top.index].y=180;f.nodes[i].state=f.nodes[top.index].state='found';f.edges=[{id:`match${i}`,from:`n${top.index}`,to:`n${i}`,active:true}];f.title=`Pop ${top.char}: a matching pair`;f.text=`${top.char}${chars[i]} fits together. Remove the top opening bracket from the stack.`;f.line=3;add(f);}
  } add({...base(stack.length?'Some brackets are still open':'Every bracket has a partner',stack.length?'The stack still contains opening brackets. Return false.':'The stack is empty and all pairs matched in order. Return true.',5,ns.map(n=>({...n,state:stack.length?'muted':'found'}))),result:String(stack.length===0),memoryLabel:'STACK',memory:stack.map((s,j)=>[String(j),s.char])});
 } else if(id==='graph-bfs') {
  const g=d.graph;if(!g||typeof g!=='object'||Array.isArray(g)||typeof d.start!=='string'||!Object.hasOwn(g,d.start))throw Error('Provide a graph object and a start node that exists in it.');
  const keys=Object.keys(g);if(keys.length>8||keys.some(k=>k.length>4||!Array.isArray(g[k])||g[k].some((v:unknown)=>typeof v!=='string'||!keys.includes(v))))throw Error('Use up to 8 nodes with labels up to 4 characters. Every neighbor must exist in graph.');
  const preset=[[350,60],[220,140],[480,140],[140,235],[300,235],[540,235]];
  const ns:VisualNode[]=keys.map((k,i)=>({id:k,value:k,x:keys.length===6?preset[i][0]:350+210*Math.sin(i/keys.length*2*Math.PI),y:keys.length===6?preset[i][1]:145-100*Math.cos(i/keys.length*2*Math.PI)}));
  const edges:Edge[]=keys.flatMap(k=>g[k].map((v:string)=>({id:`${k}-${v}`,from:k,to:v})));
  const queue=[d.start],seen=new Set(queue),order:string[]=[];const f=base('Start close, then explore further',`Put ${d.start} in the queue. A queue visits the earliest arrival first.`,0,ns);f.edges=edges;f.memoryLabel='QUEUE · front → back';f.memory=queue.map((v,i)=>[String(i),v]);add(f);
  while(queue.length){const curr=queue.shift()!;order.push(curr);f.nodes.forEach(n=>n.state=n.id===curr?'active':order.includes(n.id)?'visited':seen.has(n.id)?'found':undefined);f.title=`Visit ${curr}`;f.text=`${curr} leaves the front of the queue. Visit order: ${order.join(' → ')}.`;f.line=2;f.focus=curr;f.memory=queue.map((v,i)=>[String(i),v]);f.stats=`visited: ${order.join(' → ')}`;f.edges.forEach(e=>e.active=false);add(f);
   for(const next of g[curr]){if(!seen.has(next)){seen.add(next);queue.push(next);f.nodes.find(n=>n.id===next)!.state='found';f.edges.forEach(e=>e.active=e.from===curr&&e.to===next);f.title=`Discover ${next}`;f.text=`Follow the arrow from ${curr} to ${next}. Add ${next} to the back of the queue and mark it seen.`;f.line=4;f.focus=next;f.memory=queue.map((v,i)=>[String(i),v]);add(f);}}
  }f.title='The neighborhood is explored';f.text='The queue is empty. Every reachable node was visited exactly once.';f.line=5;f.result=JSON.stringify(order);f.focus=undefined;f.nodes.forEach(n=>n.state=seen.has(n.id)?'found':'muted');add(f);
 }
 return frames;
}


