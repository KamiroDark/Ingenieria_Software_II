import json,sys
from cleanform import *
# uso: fixform.py newFormN "Seccion1;Seccion2" "ruta.campo=A,B,C" ... [--keepcheck ruta]
form=sys.argv[1]; keep=set(sys.argv[2].split(';')) if sys.argv[2] else set()
selects={};keepchk=set();req=set()
a=sys.argv[3:]
i=0
while i<len(a):
    if a[i]=='--keepcheck': keepchk.add(a[i+1]); i+=2
    elif a[i]=='--req': req.add(a[i+1]); i+=2
    else:
        k,v=a[i].split('=',1); selects[k]=v.split(','); i+=1
SECTIONS={'Estudio Riesgo','Estudio Interno','Estudios Centrales','Estudios Tributarios','Estudio Capacidad','Estudios Antecedentes','Aprobacion Final','Firma Pagare','Desembolso'}
p=f"C:/BonitaStudioCommunity-2025.2-u0/workspace/bancoelbosque/app/web_page/{form}/{form}.json"
d=json.load(open(p,encoding='utf-8'))
h=find_rows_holder(d['rows'],lambda rows:any(isinstance(r,list) and len(r)==1 and r[0].get('id')=='pbTitle' and txt(r[0]) in SECTIONS for r in rows))
out=[];cur=None
for r in h['rows']:
    w=r[0] if r else {}
    if w.get('id')=='pbTitle' and txt(w) in SECTIONS: cur=txt(w)
    if cur is not None and cur not in keep: continue
    if cur is None and w.get('id')=='pbCheckbox' and w['propertyValues']['value']['value'] not in keepchk: continue
    out.append(r)
print(len(h['rows']),'->',len(out)); h['rows']=out
# dentro de secciones conservadas: quitar checkbox no deseados
for w in list(walk(d['rows'])):
    if w.get('id')=='pbInput':
        v=w['propertyValues']['value']['value']
        if v in selects: to_select(w,selects[v])
        if v in req: w['propertyValues']['required']={"type":"constant","value":True}
open(p,'w',encoding='utf-8',newline='').write(json.dumps(d,indent=2,ensure_ascii=False))
