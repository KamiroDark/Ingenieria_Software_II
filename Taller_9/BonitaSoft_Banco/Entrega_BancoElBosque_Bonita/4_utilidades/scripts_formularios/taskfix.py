import json, sys, subprocess, os
from cleanform import *

BASE = "C:/BonitaStudioCommunity-2025.2-u0/workspace/bancoelbosque/app/web_page"
TOOLS = os.environ['TEMP'] + "/bonita_tools"
OPTS_ESTADO = "APROBADO,DEVUELTO,RECHAZADO"


def fix(n, keep, selects=(), keepchk=(), req=()):
    args = [sys.executable, TOOLS + "/fixform.py", f"newForm{n}", keep] + list(selects)
    for k in keepchk:
        args += ["--keepcheck", k]
    for k in req:
        args += ["--req", k]
    env = dict(os.environ, PYTHONPATH=TOOLS, PYTHONIOENCODING="utf-8")
    r = subprocess.run(args, env=env, capture_output=True, text=True)
    print(n, r.stdout.strip(), r.stderr.strip()[-300:])


def load(n):
    p = f"{BASE}/newForm{n}/newForm{n}.json"
    return p, json.load(open(p, encoding='utf-8'))


def save(p, d):
    open(p, 'w', encoding='utf-8', newline='').write(json.dumps(d, indent=2, ensure_ascii=False))


def widgets(d, val):
    return [w for w in walk(d['rows']) if (w.get('propertyValues', {}).get('value') or {}).get('value') == val]


def setprop(w, k, v, t="constant"):
    w['propertyValues'][k] = {"type": t, "value": v}


def setlabel(w, text):
    w['propertyValues']['label'] = {"type": "interpolation", "value": text}


def remove_widgets(d, vals):
    holders = [x for x in walk(d['rows']) if isinstance(x, dict) and isinstance(x.get('rows'), list)]
    for h in holders:
        h['rows'] = [r for r in h['rows'] if not (isinstance(r, list) and any(
            isinstance(w, dict) and (w.get('propertyValues', {}).get('value') or {}).get('value') in vals for w in r))]


def single_list(n, collection, varname, entidad):
    p, d = load(n)
    cont = [w for w in walk(d['rows']) if w.get('id') == 'pbContainer'
            and (w['propertyValues'].get('repeatedCollection') or {}).get('value') == 'solicitud.' + collection][0]
    cont['propertyValues']['repeatedCollection']['value'] = varname
    cont['rows'] = [r for r in cont['rows'] if not any(x.get('id') == 'pbButton' for x in r)]
    for r in cont['rows']:
        for w in r:
            v = (w['propertyValues'].get('value') or {}).get('value')
            if v == '$item.entidad':
                setprop(w, 'readOnly', True)
            if v in ('$item.resultado', '$item.estado'):
                setprop(w, 'required', True)
    h = find_rows_holder(d['rows'], lambda rows: any(isinstance(r, list) and any(x is cont for x in r) for r in rows))
    h['rows'] = [r for r in h['rows'] if not any(x.get('id') == 'pbButton' for x in r)]
    row = [{"entidad": entidad, "resultado": None, "estado": None, "motivo": None}]
    d['variables'][varname] = {"type": "json", "value": [json.dumps(row, ensure_ascii=False)], "exposed": False}
    fo = d['variables']['formOutput']['value']
    d['variables']['formOutput']['value'] = [
        l.replace('$data.solicitud.' + collection + '.map', '$data.' + varname + '.map') for l in fo]
    save(p, d)


# 5 DIAN
fix(5, "Estudios Tributarios", ['$item.resultado=AL_DIA,ATRASADO', '$item.estado=' + OPTS_ESTADO])
single_list(5, 'estudiosTributarios', 'tributarios', 'DIAN')

# 9 Antecedentes
fix(9, "Estudios Antecedentes", ['$item.resultado=REQUERIDO,NO_REQUERIDO', '$item.estado=' + OPTS_ESTADO])
single_list(9, 'estudiosAntecedentes', 'antecedentes', 'Policía')

# 10 Director
fix(10, "Aprobacion Final", ['solicitud.aprobacionFinal.estado=' + OPTS_ESTADO])

# 6 Capacidad
fix(6, "Estudio Capacidad", ['solicitud.estudioCapacidad.estado=' + OPTS_ESTADO])
p, d = load(6)
w = widgets(d, 'solicitud.estudioCapacidad.capacidadEndeudamiento')[0]
w['propertyValues']['value'] = {"type": "variable", "value": "capacidad"}
setprop(w, 'readOnly', True)
setlabel(w, "Capacidad de endeudamiento (calculada: (ingresos - gastos fijos) x 0,35)")
d['variables']['capacidad'] = {"type": "expression", "value": [
    "if (!$data.solicitud) { return undefined; }",
    "const it = Number($data.solicitud.ingresosTotales) || 0;",
    "const gf = Number($data.solicitud.gastosFijos) || 0;",
    "return Math.max(0, Math.round((it - gf) * 0.35 * 100) / 100);"], "exposed": False}
old = 'capacidadEndeudamiento: $data.solicitud.estudioCapacidad.capacidadEndeudamiento !== undefined ? $data.solicitud.estudioCapacidad.capacidadEndeudamiento : null'
new = 'capacidadEndeudamiento: $data.capacidad !== undefined ? $data.capacidad : null'
d['variables']['formOutput']['value'] = [l.replace(old, new) for l in d['variables']['formOutput']['value']]
save(p, d)

# 7 Decision del cliente
fix(7, "Estudio Capacidad", [], ["solicitud.decisionReducirMonto"])
p, d = load(7)
setlabel(widgets(d, 'solicitud.decisionReducirMonto')[0], "El cliente acepta reducir el monto solicitado")
save(p, d)

# 8 Actualizar monto
fix(8, "Estudio Capacidad", [], [], ["solicitud.montoSolicitado"])
p, d = load(8)
w = widgets(d, 'solicitud.montoSolicitado')[0]
setprop(w, 'min', 1)
setlabel(w, "Nuevo monto solicitado")
save(p, d)

# 11 Agendar firma
fix(11, "Firma Pagare", [], [])
p, d = load(11)
remove_widgets(d, {'solicitud.firmaPagare.numeroPagare', 'solicitud.firmaPagare.firmado'})
w = widgets(d, 'solicitud.firmaPagare.fecha')[0]
setprop(w, 'required', True)
setprop(w, 'dateFormat', 'dd/MM/yyyy')
setprop(w, 'placeholder', 'dd/mm/aaaa')
w = widgets(d, 'solicitud.firmaPagare.hora')[0]
setprop(w, 'required', True)
setprop(w, 'placeholder', 'HH:mm (formato 24 h)')
save(p, d)

# 12 Registrar firma
fix(12, "Firma Pagare", [], ["solicitud.firmaPagare.firmado"])
p, d = load(12)
setlabel(widgets(d, 'solicitud.firmaPagare.firmado')[0], "El pagare fue firmado por el cliente")
save(p, d)

# 13 Desembolso
fix(13, "Desembolso", ['solicitud.desembolso.medio=EFECTIVO,CHEQUE,TRANSFERENCIA'])
p, d = load(13)
w = widgets(d, 'solicitud.desembolso.monto')[0]
w['propertyValues']['value'] = {"type": "variable", "value": "montoDesembolso"}
setprop(w, 'readOnly', True)
setlabel(w, "Monto a desembolsar (monto solicitado)")
for k, cond in (('solicitud.desembolso.numeroCheque', "CHEQUE"),
                ('solicitud.desembolso.numeroCuentaDestino', "TRANSFERENCIA"),
                ('solicitud.desembolso.bancoDestino', "TRANSFERENCIA")):
    w = widgets(d, k)[0]
    w['propertyValues']['hidden'] = {"type": "expression",
                                     "value": "$data.solicitud.desembolso.medio !== '" + cond + "'"}
d['variables']['montoDesembolso'] = {"type": "expression",
                                     "value": ["return $data.solicitud ? $data.solicitud.montoSolicitado : undefined;"],
                                     "exposed": False}
reps = [
    ('monto: $data.solicitud.desembolso.monto !== undefined ? $data.solicitud.desembolso.monto : null',
     'monto: $data.montoDesembolso !== undefined ? $data.montoDesembolso : null'),
    ('numeroCheque: $data.solicitud.desembolso.numeroCheque !== undefined ? $data.solicitud.desembolso.numeroCheque : null',
     "numeroCheque: $data.solicitud.desembolso.medio === 'CHEQUE' && $data.solicitud.desembolso.numeroCheque !== undefined ? $data.solicitud.desembolso.numeroCheque : null"),
    ('numeroCuentaDestino: $data.solicitud.desembolso.numeroCuentaDestino !== undefined ? $data.solicitud.desembolso.numeroCuentaDestino : null',
     "numeroCuentaDestino: $data.solicitud.desembolso.medio === 'TRANSFERENCIA' && $data.solicitud.desembolso.numeroCuentaDestino !== undefined ? $data.solicitud.desembolso.numeroCuentaDestino : null"),
    ('bancoDestino: $data.solicitud.desembolso.bancoDestino !== undefined ? $data.solicitud.desembolso.bancoDestino : null',
     "bancoDestino: $data.solicitud.desembolso.medio === 'TRANSFERENCIA' && $data.solicitud.desembolso.bancoDestino !== undefined ? $data.solicitud.desembolso.bancoDestino : null"),
]
fo = d['variables']['formOutput']['value']
for a, b in reps:
    fo = [l.replace(a, b) for l in fo]
d['variables']['formOutput']['value'] = fo
save(p, d)
print("listo")
