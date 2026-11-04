import json,sys,copy
def txt(w):
    pv=w.get('propertyValues',{})
    for k in('text','label','value'):
        v=pv.get(k)
        if isinstance(v,dict) and 'value' in v: return str(v['value'])
    return ''
def find_rows_holder(n,pred):
    """return the dict having 'rows' whose rows satisfy pred"""
    if isinstance(n,dict):
        if 'rows' in n and pred(n['rows']): return n
        for v in n.values():
            r=find_rows_holder(v,pred)
            if r: return r
    elif isinstance(n,list):
        for v in n:
            r=find_rows_holder(v,pred)
            if r: return r
def to_select(w,values,required=True):
    pv=w['propertyValues']
    pv.pop('type',None)
    pv['availableValues']={"type":"constant","value":values}
    pv['displayedKey']={"type":"constant"}
    pv['returnedKey']={"type":"constant"}
    pv['required']={"type":"constant","value":required}
    pv['placeholder']={"type":"constant","value":"Seleccione..."}
    w['id']='pbSelect'
def walk(n):
    if isinstance(n,dict):
        yield n
        for v in n.values(): yield from walk(v)
    elif isinstance(n,list):
        for v in n: yield from walk(v)
