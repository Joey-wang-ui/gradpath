"""Build a portable Albers map from retained state geometry and IPEDS campus points."""
import hashlib
import json
import math
from pathlib import Path

DATA=Path(__file__).resolve().parents[1]/'frontend'/'data'
STATE_CODES=dict(zip('Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split('|'),'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split()))
REGIONS={**dict.fromkeys('CT ME MA NH RI VT NJ NY PA DE DC MD'.split(),'east'),**dict.fromkeys('IL IN IA KS MI MN MO NE ND OH SD WI'.split(),'midwest'),**dict.fromkeys('AL AR FL GA KY LA MS NC OK SC TN TX VA WV'.split(),'south'),**dict.fromkeys('AK AZ CA CO HI ID MT NV NM OR UT WA WY'.split(),'west')}

def albers(lon,lat):
    p1,p2,p0=map(math.radians,(29.5,45.5,37.5));phi=math.radians(lat);lam=math.radians(lon+96)
    n=(math.sin(p1)+math.sin(p2))/2;c=math.cos(p1)**2+2*n*math.sin(p1)
    rho=math.sqrt(c-2*n*math.sin(phi))/n;r0=math.sqrt(c-2*n*math.sin(p0))/n
    return rho*math.sin(n*lam),-(r0-rho*math.cos(n*lam))

def rings(feature):
    g=feature['geometry'];return [r for p in g['coordinates'] for r in p] if g['type']=='MultiPolygon' else g['coordinates']

def build_map(schools,data_dir=DATA):
    source=json.loads((data_dir/'map-source.json').read_text());raw=(data_dir/source['sourceFile']).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=source['sha256']:raise ValueError('Map source checksum mismatch')
    features=[f for f in json.loads(raw)['features'] if f['properties']['name'] in STATE_CODES]
    # Insets use their own extent; no institutions in this catalogue are in AK/HI.
    transforms={}
    for group,box in [('main',(35,20,1050,560)),('Alaska',(50,535,190,145)),('Hawaii',(290,594,120,70))]:
        fs=[f for f in features if (f['properties']['name']==group if group!='main' else f['properties']['name'] not in {'Alaska','Hawaii'})]
        def raw_point(lon,lat):
            if group=='Alaska':return (lon-360 if lon>0 else lon),-lat
            if group=='Hawaii':return lon,-lat
            return albers(lon,lat)
        points=[raw_point(*p[:2]) for f in fs for r in rings(f) for p in r]
        xmin,ymin=map(min,zip(*points));xmax,ymax=map(max,zip(*points));bx,by,bw,bh=box
        scale=min(bw/(xmax-xmin),bh/(ymax-ymin));ox=bx+(bw-(xmax-xmin)*scale)/2;oy=by+(bh-(ymax-ymin)*scale)/2
        transforms[group]=(xmin,ymin,scale,ox,oy)
    def project(lon,lat,group='main'):
        if group=='Alaska':x,y=(lon-360 if lon>0 else lon),-lat
        elif group=='Hawaii':x,y=lon,-lat
        else:x,y=albers(lon,lat)
        xmin,ymin,scale,ox,oy=transforms[group];return round(ox+(x-xmin)*scale,2),round(oy+(y-ymin)*scale,2)
    states=[]
    for f in features:
        name=f['properties']['name'];group=name if name in {'Alaska','Hawaii'} else 'main';parts=[];pts=[]
        for ring in rings(f):
            xy=[project(*p[:2],group) for p in ring];pts.extend(xy);parts.append('M'+'L'.join(f'{x},{y}' for x,y in xy)+'Z')
        xs,ys=zip(*pts);states.append({'name':name,'code':STATE_CODES[name],'path':''.join(parts),'labelX':round((min(xs)+max(xs))/2,2),'labelY':round((min(ys)+max(ys))/2,2)})
    points=[]
    for s in schools:
        lat,lon=s.get('latitude'),s.get('longitude')
        if not isinstance(lat,(int,float)) or not isinstance(lon,(int,float)) or not (-90<=lat<=90 and -180<=lon<=180):raise ValueError(f'Missing/invalid sourced coordinates: {s["id"]}')
        group={'AK':'Alaska','HI':'Hawaii'}.get(s['stateCode'],'main');x,y=project(lon,lat,group)
        if not(0<=x<=1120 and 0<=y<=720):raise ValueError('Campus falls outside the supported map extent')
        points.append({'id':s['id'],'x':x,'y':y,'region':REGIONS[s['stateCode']]})
    return {'width':1120,'height':720,'projection':'Albers contiguous USA with Alaska/Hawaii insets','source':source,'states':states,'points':points}
