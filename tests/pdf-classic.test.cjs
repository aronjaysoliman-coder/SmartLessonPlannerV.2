const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./load-typescript.cjs');
const {createEmptyLessonPlan}=load('lib/types.ts');
const {buildClassicLayout,buildClassicHtml,classicSections,wrapClassicText,CLASSIC_PDF}=load('lib/pdf-classic.ts');
const base=()=>createEmptyLessonPlan('teacher',{lessonTitle:'Fractions',subject:'Mathematics',gradeLevel:'Grade 4',teacherName:'José Muñoz',section:'Sampaguita',term:'Term 1',week:'Week 3',objectives:['Compare halves and quarters'],assessment:'Draw a model',procedure:'Review, model, practice',activities:[{id:'a',title:'Fraction strips',type:'Pair work',description:'Compare the models.',materials:'Paper circles',durationMinutes:15}]});
function pageText(pages){return pages.flatMap(page=>page.items.filter(item=>item.kind==='text').map(item=>item.text)).join('\n');}

test('classic export includes metadata, numbering, all lesson fields, activity materials and durations',()=>{
 const plan={...base(),learningCompetencies:'Compare fractions',subjectMatter:'Equal parts',learningResources:'Textbook',assignment:'Home practice',reflection:'Revisit quarters',additionalNotes:'Use larger models'};
 const text=pageText(buildClassicLayout(plan));
 for(const expected of ['DETAILED LESSON PLAN','José Muñoz','Grade 4 - Sampaguita','Term 1 - Week 3','I. Learning','Compare fractions','Equal parts','Textbook','15 min','Materials: Paper circles','Home practice','Revisit quarters','Use larger models','Page 1 of 1'])assert.ok(text.includes(expected),expected);
});
test('long procedures continue onto numbered pages without losing or duplicating any markers',()=>{
 const plan={...base(),procedure:Array.from({length:150},(_,i)=>`Step ${i}: compare concrete fraction models, explain the results, and write an observation. END${i}END`).join('\n\n')};
 const pages=buildClassicLayout(plan);assert.ok(pages.length>2);
 const text=pageText(pages);
 for(let i=0;i<150;i++)assert.equal(text.split(`END${i}END`).length-1,1);
 assert.ok(text.includes('(continued)'));
 pages.forEach((page,index)=>{
  const footer=page.items.find(item=>item.kind==='text'&&item.text.includes('SmartLessonPlanner | Page'));
  assert.equal(footer.text,`SmartLessonPlanner | Page ${index+1} of ${pages.length}`);
  for(const item of page.items){
   if(item.kind==='rect'){assert.ok(item.y+item.height<=CLASSIC_PDF.height-61);assert.ok(item.x+item.width<=CLASSIC_PDF.width-CLASSIC_PDF.margin+0.01)}
   if(item.kind==='text')assert.ok(item.y<CLASSIC_PDF.height-20);
  }
 });
});
test('ILAW includes every ILAW section while other plan formats ignore stale ILAW content',()=>{
 const plan={...base(),planType:'ILAW',ilaw:{contentStandard:'STANDARD-A',performanceStandard:'PERFORMANCE-A',preLesson:'PRE-A',flow:'FLOW-A',integration:'INTEGRATION-A',extendedLearning:'EXTENDED-A'}};
 const text=pageText(buildClassicLayout(plan));
 for(const value of Object.values(plan.ilaw))assert.ok(text.includes(value));
 assert.ok(text.includes('ILAW LESSON PLAN'));
 const detailed=pageText(buildClassicLayout({...plan,planType:'Detailed'}));assert.ok(!detailed.includes('STANDARD-A'));assert.ok(detailed.includes('Review, model, practice'));
 assert.ok(pageText(buildClassicLayout({...plan,planType:'Semi-Detailed'})).includes('SEMI-DETAILED LESSON PLAN'));
});
test('native vector HTML uses the same pages and escapes teacher content instead of interpreting markup',()=>{
 const plan={...base(),lessonTitle:'Fractions <script>alert(1)</script> & models',procedure:'Teacher: "Read <one half> & compare."'};
 const html=buildClassicHtml(plan);
 assert.equal((html.match(/<svg /g)||[]).length,buildClassicLayout(plan).length);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&amp;'));
 assert.ok(html.includes('José Muñoz'));assert.ok(html.includes('@page{size:A4 portrait;margin:0}'));
});
test('long unbroken text and explicit paragraph breaks are wrapped without clipping or dropping content',()=>{
 const token='A'.repeat(1500);const lines=wrapClassicText(token,200,10.5);
 assert.equal(lines.join(''),token);assert.ok(lines.length>10);
 assert.deepEqual(wrapClassicText('First\n\nSecond',300,10.5),['First','','Second']);
 const sections=classicSections(base());assert.ok(sections.some(section=>section.label.includes('Reflection'))===false);
});

test('ILAW uses a landscape grid with blue section bands and retains long assessment content across pages',()=>{
 const {classicPageSize}=load('lib/pdf-classic.ts');
 const plan={...base(),planType:'ILAW',assessment:Array.from({length:180},(_,i)=>`Question ${i}: explain a respectful response. UNIQUE${i}END`).join('\n'),ilaw:{contentStandard:'Verified content standard',performanceStandard:'Verified performance standard',preLesson:'Prepare',flow:'Explore and discuss',integration:'Filipino',extendedLearning:'Home practice'}};
 const size=classicPageSize(plan),pages=buildClassicLayout(plan),text=pageText(pages);
 assert.ok(size.width>size.height);assert.ok(pages.length>2);
 for(const name of ['Intentions','Learning Experience','Assessment','Ways Forward','SCHOOL LOGO'])assert.ok(text.includes(name),name);
 for(let i=0;i<180;i++)assert.equal(text.split(`UNIQUE${i}END`).length-1,1);
 assert.ok(pages.some(page=>page.items.some(item=>item.kind==='rect'&&item.color?.join(',')==='194,230,242')));
 for(const page of pages)for(const item of page.items){
  if(item.kind==='rect'){assert.ok(item.y+item.height<=size.height-33);assert.ok(item.x+item.width<=size.width-27)}
  if(item.kind==='text')assert.ok(item.y<size.height-15);
 }
 const html=buildClassicHtml(plan);assert.ok(html.includes('A4 landscape'));assert.ok(html.includes('rgb(194,230,242)'));assert.ok(html.includes('font-style="italic"'));
});

test('jsPDF and native ILAW exports share page dimensions even if jsPDF starts in portrait',()=>{
 const {jsPDF}=require('jspdf');const {renderClassicPdf}=load('lib/pdf-classic-renderer.ts');
 const plan={...base(),planType:'ILAW'};const pdf=new jsPDF({unit:'pt',format:'a4'});
 renderClassicPdf(pdf,plan);
 assert.ok(pdf.internal.pageSize.getWidth()>pdf.internal.pageSize.getHeight());
 assert.equal(pdf.getNumberOfPages(),buildClassicLayout(plan).length);
});
