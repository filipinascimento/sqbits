"""Conservative whole-description aliases, never a substring chemistry classifier.

Qualifiers removed here are removed only from the composition grouping key. They
remain in the immutable observation, evidence and the fix ledger. Unknown residue,
comparisons, alternatives, negation and unspecified materials are not inferred.
"""
from __future__ import annotations
import re, unicodedata
from dataclasses import dataclass

@dataclass(frozen=True)
class Resolution:
    value: str
    rule: str

RULES = {
 'element-alias': 'Equivalent element name/symbol, spelling, capitalization or typography. Film, role and preparation qualifiers remain in the original observation; this groups composition only.',
 'compound-alias': 'Equivalent explicitly named compound or alloy. Stoichiometries and unspecified compositions stay separate; no constituent-element substring matching.',
 'material-variant': 'Equivalent explicitly reported material variant; granular aluminium and alpha/beta tantalum remain distinct from their parent materials.',
 'junction-stack': 'Equivalent explicitly stated slash-separated layer stack; layer order and barrier composition are preserved.',
 'substrate-alias': 'Equivalent explicitly named substrate composition. Orientation, resistivity, purity and preparation remain in the raw description and their separate design properties.',
 'substrate-structure': 'Equivalent explicitly named substrate structure or surface class. Oxidized silicon, SOI, silicon dioxide and bare silicon remain distinct.',
 'unresolved': 'Description is ambiguous, comparative, generic or outside the controlled whole-description alias grammar. Original wording is retained; no chemistry or missing value is inferred.',
}

def key(value):
    s=unicodedata.normalize('NFKC',value).casefold()
    s=s.replace('–','-').replace('−','-').replace('‑','-').replace('μ','µ')
    return re.sub(r'\s+',' ',s).strip().strip(' .')

def body(aliases):
    a='(?:'+'|'.join(re.escape(key(a)) for a in aliases)+')'
    return a+r'(?:\s*\(\s*'+a+r'\s*\))?'

ELEMENTS = {
 'Al':['Al','aluminum','aluminium'], 'Nb':['Nb','niobium'],
 'Ta':['Ta','tantalum'], 'Ti':['Ti','titanium'], 'Pb':['Pb','lead'],
 'Re':['Re','rhenium'], 'V':['V','vanadium'], 'Cu':['Cu','copper'],
 'Au':['Au','gold'], 'Pt':['Pt','platinum'], 'Pd':['Pd','palladium'],
 'In':['In','indium'], 'Sn':['Sn','tin'], 'Ag':['Ag','silver'],
 'Ru':['Ru','ruthenium'], 'W':['W','tungsten'], 'Mo':['Mo','molybdenum'],
}
COMPOUNDS = {
 'NbTiN':['NbTiN','niobium titanium nitride','niobium-titanium nitride'],
 'NbN':['NbN','niobium nitride'], 'TiN':['TiN','titanium nitride'],
 'NbTi':['NbTi','niobium titanium','niobium-titanium'],
 'TaN':['TaN','tantalum nitride'], 'ZrN':['ZrN','zirconium nitride'],
 'AlN':['AlN','aluminum nitride','aluminium nitride'],
 'NbSe2':['NbSe2','niobium diselenide'], 'Nb3Sn':['Nb3Sn'],
 'CoSi2':['CoSi2','cobalt disilicide'], 'V3Si':['V3Si','V3 Si'],
 'MgB2':['MgB2','magnesium diboride'],
 'MoRe (ratio unspecified)':['MoRe','molybdenum rhenium','molybdenum-rhenium'],
 'MoGe (ratio unspecified)':['MoGe','molybdenum germanium','molybdenum-germanium'],
 'WSi (ratio unspecified)':['WSi','tungsten silicide'],
 'AuPd (ratio unspecified)':['AuPd'],
 'YBCO (oxygen content unspecified)':['YBCO','yttrium barium copper oxide','YBa2Cu3O7-x'],
 'Bi2212':['Bi2212','Bi-2212'],
 'AlOx':['AlOx'], 'Al2O3':['Al2O3'],
 'Al oxide (stoichiometry unspecified)':['aluminum oxide','aluminium oxide'],
 'Nb oxide (stoichiometry unspecified)':['NbOx','niobium oxide'],
 'SiO2':['SiO2','silicon dioxide','silica'], 'Si3N4':['Si3N4'],
 'Silicon nitride (stoichiometry unspecified)':['SiN','silicon nitride'],
 'LiNbO3':['LiNbO3','lithium niobate','LN'],
 'InAs':['InAs','indium arsenide'], 'InSb':['InSb','indium antimonide'],
}
SUBSTRATES = {
 'Silicon':['Si','silicon','c-Si'], 'Sapphire':['sapphire'],
 'Al2O3 (phase unspecified)':['Al2O3','alumina','aluminum oxide','aluminium oxide'],
 'α-Al2O3':['α-Al2O3','alpha-Al2O3'],
 'Silicon dioxide / silica':['SiO2','silicon dioxide','silica'],
 'Quartz':['quartz'], 'α-quartz':['α-quartz','alpha-quartz'],
 'GaAs':['GaAs','gallium arsenide'], 'InP':['InP','indium phosphide'],
 'Diamond':['diamond'], 'MgO':['MgO','magnesium oxide'],
 'Germanium':['Ge','germanium'], 'Silicon carbide':['SiC','silicon carbide'],
 'Si3N4':['Si3N4'], 'Silicon nitride (stoichiometry unspecified)':['SiN','silicon nitride'],
 'LiNbO3':['LiNbO3','lithium niobate','LN'],
 'SrTiO3':['SrTiO3','strontium titanate'], 'LaAlO3':['LaAlO3','lanthanum aluminate'],
 'KTaO3':['KTaO3','KTO','potassium tantalate'], 'NdGaO3':['NdGaO3'],
 'GaN':['GaN','gallium nitride'], 'KCl':['KCl','potassium chloride'],
 'Glass (composition unspecified)':['glass'],
}
# Entire description must match after removing this explicit whitelist.
MATERIAL_QUALIFIERS = r'\b(?:superconducting|thin[- ]films?|films?|trilayer film|electrodes?|layers?|wires?|shell|bulk|nominally|pure|high[- ]purity|oxygen[- ]free|epitaxial|single[- ]cryst(?:al|alline)|polycrystalline|evaporated|sputtered|mbe[- ]grown|capacitor pads?|ground planes?|circuit|resonator|leads|deposition)\b'
SUBSTRATE_QUALIFIERS = r'\b(?:substrates?|wafers?|chips?|crystals?|single[- ]cryst(?:al|alline)|crystalline|intrinsic|undoped|high[- ]resistivity|high[- ]resistance|high[- ]resistive|highly resistive|semi[- ]insulating|double[- ]side[d]?[- ]polished|double[- ]polished|polished|annealed|fresh|hemex[- ]grade|hemex|hem|heat exchanger method|efg|grade|c[- ]plane|a[- ]plane|r[- ]plane|r[- ]cut|c[- ]axis|float[- ]zone|fz|natural|isotopically purified|degenerately doped|p[- ]doped|n[- ]doped)\b'
BLOCKED = re.compile(r'\b(?:not|without|versus|compared|rather|instead|or|unknown|unspecified|unstated|proxy)\b')

def simplify(s,kind):
    # Thickness and crystal orientations are qualifiers, not composition aliases.
    s=re.sub(r'(?<![\w.])\d+(?:\.\d+)?\s*[- ]?(?:nm|µm|um|mm)\s*[- ]?(?:thick)?\b',' ',s)
    s=re.sub(r'\(\s*(?:100|110|111|001|0001|1-102)\s*\)',' ',s)
    s=re.sub(MATERIAL_QUALIFIERS if kind=='material' else SUBSTRATE_QUALIFIERS,' ',s)
    return re.sub(r'\s+',' ',s).strip(' ,;.')

MATERIAL_PATTERNS = [(c,re.compile(body(a))) for c,a in {**COMPOUNDS,**ELEMENTS}.items()]
SUBSTRATE_PATTERNS = [(c,re.compile(body(a))) for c,a in SUBSTRATES.items()]

def normalize(value,kind):
    s=key(value)
    if BLOCKED.search(s):return Resolution(value,'unresolved')
    if kind=='material':
        for c,a in [('grAl',['grAl','granular aluminum','granular aluminium','all-grAl']),('α-Ta',['α-Ta','alpha-Ta','alpha tantalum','α-Ta (tantalum)','tantalum in BCC alpha-phase','single-phase α-Ta','single-phase α-Ta (tantalum)']),('β-Ta',['β-Ta','beta-Ta','beta tantalum'])]:
            if re.fullmatch(body(a),simplify(s,kind)):return Resolution(c,'material-variant')
        # Only an explicit stack separator establishes stack semantics.
        parts=re.sub(r'\b(?:superconducting|trilayer film)\b','',s).strip().split('/')
        if len(parts)>1:
            resolved=[normalize(p,'material') for p in parts]
            if all(p.rule!='unresolved' for p in resolved):return Resolution('/'.join(p.value for p in resolved),'junction-stack')
        t=simplify(s,kind)
        for electrode in ['Al','Nb']:
            m=re.fullmatch(body(ELEMENTS[electrode])+r'\s*-\s*(alox|al2o3)\s*-\s*'+body(ELEMENTS[electrode]),t)
            if m:return Resolution(electrode+'/'+('AlOx' if m[1]=='alox' else 'Al2O3')+'/'+electrode,'junction-stack')
        for c,pattern in MATERIAL_PATTERNS:
            if pattern.fullmatch(t):return Resolution(c,'element-alias' if c in ELEMENTS else 'compound-alias')
    elif kind=='substrate':
        # Parenthetical chemistry explicitly identifies sapphire; unqualified
        # Al2O3 never acquires a sapphire crystal-phase claim here.
        s=re.sub(r'\bsapphire\s*\(\s*al2o3\s*\)|\bal2o3\s*\(\s*sapphire\s*\)','sapphire',s)
        t=simplify(s,kind)
        if re.fullmatch(r'(?:silicon[- ]on[- ]insulator|soi)(?:\s*\(soi\))?',t):return Resolution('Silicon on insulator','substrate-structure')
        if re.fullmatch(r'(?:thermally )?oxidized (?:si|silicon)',t):return Resolution('Oxidized silicon','substrate-structure')
        if re.fullmatch(r'(?:si/sio2|silicon/silicon dioxide)',t):return Resolution('Si/SiO2','substrate-structure')
        if re.fullmatch(r'(?:sio2/si|silicon dioxide/silicon)',t):return Resolution('SiO2/Si','substrate-structure')
        for c,pattern in SUBSTRATE_PATTERNS:
            if pattern.fullmatch(t):return Resolution(c,'substrate-alias')
    else:raise ValueError(kind)
    return Resolution(value,'unresolved')
