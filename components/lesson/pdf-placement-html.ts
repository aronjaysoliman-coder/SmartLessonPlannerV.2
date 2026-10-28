export function createPdfPlacementHtml(base64Pdf: string): string {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
body{font:14px Arial,sans-serif;margin:0;padding:12px;background:#f1f5f9;color:#0f172a}
.hint{margin:0 0 10px}.page{position:relative;margin:0 auto 16px;background:white;box-shadow:0 2px 8px #0003;touch-action:none}
canvas{display:block;width:100%;height:auto}.box{position:absolute;border:2px solid #16316b;background:#16316b22;pointer-events:none}
</style></head><body><p class="hint">Drag over the area where the selected lesson-plan field should appear.</p><div id="pages"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
(async()=>{try{
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const raw=atob('${base64Pdf}');
  const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  const container=document.getElementById('pages');
  for(let number=1;number<=pdf.numPages;number++){
    const page=await pdf.getPage(number);const viewport=page.getViewport({scale:1.15});
    const wrap=document.createElement('div');wrap.className='page';wrap.dataset.page=number;
    wrap.style.width=viewport.width+'px';wrap.style.maxWidth='100%';
    const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
    wrap.appendChild(canvas);container.appendChild(wrap);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    let start=null,box=null;
    wrap.addEventListener('pointerdown',event=>{if(event.target!==canvas)return;const rect=wrap.getBoundingClientRect();start={x:event.clientX-rect.left,y:event.clientY-rect.top};box=document.createElement('div');box.className='box';wrap.appendChild(box);wrap.setPointerCapture(event.pointerId);});
    wrap.addEventListener('pointermove',event=>{if(!start||!box)return;const rect=wrap.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;box.style.left=Math.min(start.x,x)+'px';box.style.top=Math.min(start.y,y)+'px';box.style.width=Math.abs(x-start.x)+'px';box.style.height=Math.abs(y-start.y)+'px';});
    wrap.addEventListener('pointerup',event=>{if(!start||!box)return;const rect=wrap.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,left=Math.min(start.x,x),top=Math.min(start.y,y),width=Math.abs(x-start.x),height=Math.abs(y-start.y);start=null;if(width<12||height<8){box.remove();return;}const result={page:number,x:left/rect.width,y:top/rect.height,width:width/rect.width,height:height/rect.height};const message=JSON.stringify(result);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);window.parent.postMessage({source:'pdf-field-placement',data:result},'*');});
  }
}catch(error){document.body.innerHTML='<p>Could not preview this PDF. Please try a non-encrypted PDF.</p>';}})();
</script></body></html>`;
}
