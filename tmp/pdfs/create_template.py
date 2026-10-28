from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from pypdf import PdfReader
from pathlib import Path
out=Path('output/pdf/SmartLessonPlanner_Lesson_Plan_Template.pdf')
c=canvas.Canvas(str(out),pagesize=A4)
c.setTitle('SmartLessonPlanner | Reusable Lesson Plan Template')
c.setAuthor('SmartLessonPlanner')
W,H=A4
navy=HexColor('#173B49'); teal=HexColor('#237A78'); ink=HexColor('#334955'); line=HexColor('#B9CCD1')
M=42; CW=W-84
names=[]
def text(x,y,s,size=9,color=ink,font='Helvetica'):
 c.setFillColor(color); c.setFont(font,size); c.drawString(x,y,s)
def page(n,title,sub):
 c.setFillColor(navy); c.rect(0,H-113,W,113,fill=1,stroke=0)
 text(M,H-32,'SMART LESSON PLANNER',10,white,'Helvetica-Bold')
 text(M,H-61,title,22,white,'Helvetica-Bold')
 text(M,H-84,sub,9,white)
 c.setStrokeColor(line); c.line(M,36,W-M,36)
 text(M,23,'REUSABLE TEMPLATE  |  A4  |  Fill digitally or print',8)
 text(W-106,23,f'{n:02d} / 04',8)
def section(y,label):
 c.setFillColor(HexColor('#EAF3F3')); c.rect(M,y-8,CW,25,fill=1,stroke=0)
 text(M+10,y,label,10,navy,'Helvetica-Bold')
def field(name,label,x,top,w,h,hint=None):
 names.append(name)
 text(x,top,label,9,ink,'Helvetica-Bold')
 if hint: text(x,top-13,hint,7.5)
 y=top-(26 if hint else 10)-h
 c.acroForm.textfield(name=name,tooltip=label,x=x,y=y,width=w,height=h,fontName='Helvetica',fontSize=10,textColor=ink,borderColor=line,fillColor=white,borderWidth=.7,borderStyle='solid',forceBorder=True,fieldFlags='multiline' if h>30 else '',value='')
 return y
page(1,'Lesson overview','Plan the learning target, lesson content, and required resources.')
section(699,'01  CLASS & LESSON DETAILS')
gap=16; half=(CW-gap)/2
field('teacherName',"Teacher's name",M,660,half,24)
field('section','Section / class',M+half+gap,660,half,24)
field('subject','Subject',M,601,half,24)
field('gradeLevel','Grade level',M+half+gap,601,half,24)
third=(CW-24)/3
for i,(key,label) in enumerate([('term','Term / quarter'),('week','Week'),('planType','Plan type')]): field(key,label,M+i*(third+12),542,third,24)
field('lessonTitle','Lesson title',M,483,CW,29)
section(418,'02  LEARNING TARGETS & CONTENT')
field('learningCompetencies','Learning competencies',M,379,CW,62,'Use the exact curriculum wording and code, when available.')
field('objectives','Learning objectives',M,267,CW,74,'State observable outcomes and how learners will demonstrate them.')
field('subjectMatter','Subject matter',M,143,CW,64)
c.showPage()
page(2,'Learning experience','Use this page for Detailed or Semi-Detailed plans; use page 4 for ILAW delivery.')
section(699,'03  RESOURCES & ACTIVITIES')
field('learningResources','Learning resources',M,660,CW,75,'List books, page numbers, links, equipment, and other materials.')
field('activities','Learning activities',M,535,CW,135,'For each activity: title, learner task, grouping, materials, and time.')
section(344,'04  TEACHING & LEARNING PROCEDURE')
field('procedure','Procedure',M,305,CW,200,'Sequence: review, motivation, instruction, practice, application, and closure.')
text(M,57,'Detailed: include teacher prompts and expected responses. Semi-Detailed: use key steps.',8)
c.showPage()
page(3,'Evidence & reflection','Connect assessment to objectives, then record follow-up and teaching insights.')
section(699,'05  ASSESSMENT & FOLLOW-UP')
field('assessment','Assessment',M,660,CW,123,'Specify the task, evidence of learning, criteria, and feedback approach.')
field('assignment','Assignment',M,487,CW,85,'Give clear instructions, expected output, and completion requirements.')
section(346,'06  REFLECTION & NOTES')
field('reflection','Reflection',M,307,CW,108,'After teaching: what worked, who needs support, and what should change?')
field('additionalNotes','Additional notes',M,149,CW,69,'Record accommodations, remediation, enrichment, or other reminders.')
c.showPage()
page(4,'ILAW planning extension','Optional page: complete for an ILAW plan alongside the shared planning sections.')
section(699,'07  STANDARDS')
field('ilaw.contentStandard','Content standard',M,660,CW,53)
field('ilaw.performanceStandard','Performance standard',M,575,CW,53)
section(475,'08  ILAW LEARNING SEQUENCE')
field('ilaw.preLesson','Pre-lesson',M,436,CW,60)
field('ilaw.flow','Lesson flow',M,344,CW,90)
field('ilaw.integration','Integration',M,222,CW,60)
field('ilaw.extendedLearning','Ways forward / extended learning',M,130,CW,60)
c.showPage(); c.save()
r=PdfReader(out)
assert len(r.pages)==4
fields=r.get_fields()
assert set(fields)==set(names) and len(names)==24
for p in r.pages:
 for ref in p.get('/Annots',[]):
  a=ref.get_object(); assert a.get('/AP',{}).get('/N') is not None
print(f'Created {out}: 4 pages, {len(fields)} validated fillable text fields')

