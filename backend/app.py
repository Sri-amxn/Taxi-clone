import os, re, hmac, hashlib, secrets, math, time, threading
from datetime import datetime, timezone
from functools import wraps
from decimal import Decimal, ROUND_HALF_UP
import requests
from flask import Flask, request, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO, join_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app=Flask(__name__)
app.config.update(SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL','sqlite:///taxi.db'), SQLALCHEMY_TRACK_MODIFICATIONS=False, SECRET_KEY=os.getenv('SECRET_KEY',secrets.token_hex(32)), SWAGGER={'title':'GenZ Taxi API','uiversion':3,'specs_route':'/api/docs/'})
db=SQLAlchemy(app); Migrate(app,db); socket=SocketIO(app,async_mode='threading')
limiter=Limiter(get_remote_address,app=app,default_limits=['300 per minute'])
Swagger(app)
signer=URLSafeTimedSerializer(app.config['SECRET_KEY'])
code_secret=os.getenv('USER_CODE_SECRET',app.config['SECRET_KEY'])
def now(): return time.time()
def money(x): return float(Decimal(str(x)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP))
class User(db.Model):
 __tablename__='USERS'
 id=db.Column(db.Integer,primary_key=True); mobile=db.Column(db.String(20),unique=True,nullable=False); password_hash=db.Column(db.String(256),nullable=False); user_code=db.Column(db.String(70),unique=True,nullable=False); role=db.Column(db.String(12)); status=db.Column(db.String(20),default='active'); created_at=db.Column(db.Float,default=now)
class Profile(db.Model):
 __tablename__='USER_PROFILES'
 user_id=db.Column(db.Integer,db.ForeignKey('USERS.id'),primary_key=True)
 name=db.Column(db.String(80),nullable=False)
class RideVerification(db.Model):
 __tablename__='RIDE_VERIFICATIONS'
 ride_id=db.Column(db.Integer,db.ForeignKey('RIDES.id'),primary_key=True)
 nonce=db.Column(db.String(64),nullable=False)
 expires=db.Column(db.Float,nullable=False)
 attempts=db.Column(db.Integer,default=0,nullable=False)
 verified=db.Column(db.Boolean,default=False,nullable=False)
def display_name(id):
 p=db.session.get(Profile,id)
 return p.name if p else 'Member'
def valid_name(value):
 if not isinstance(value,str) or not 2<=len(value.strip())<=80 or any(ord(c)<32 for c in value): raise ValueError('Name must contain 2–80 characters')
 return value.strip()
def ride_code(v):
 digest=hmac.new(code_secret.encode(),('trip:'+str(v.ride_id)+v.nonce).encode(),hashlib.sha256).digest()
 return str(int.from_bytes(digest[:8],'big')%1000000).zfill(6)
class Driver(db.Model):
 __tablename__='DRIVERS'
 id=db.Column(db.Integer,db.ForeignKey('USERS.id'),primary_key=True); status=db.Column(db.String(32),default='offline',index=True); updated=db.Column(db.Float,default=now)
class Location(db.Model):
 __tablename__='DRIVER_LOCATIONS'
 id=db.Column(db.Integer,db.ForeignKey('DRIVERS.id'),primary_key=True); lat=db.Column(db.Float); lng=db.Column(db.Float); accuracy=db.Column(db.Float); recorded=db.Column(db.Float); updated=db.Column(db.Float,index=True)
class Ride(db.Model):
 __tablename__='RIDES'
 id=db.Column(db.Integer,primary_key=True); rider_id=db.Column(db.Integer,db.ForeignKey('USERS.id')); driver_id=db.Column(db.Integer,db.ForeignKey('DRIVERS.id')); quote_id=db.Column(db.Integer,db.ForeignKey('FARE_QUOTES.id'),unique=True); status=db.Column(db.String(32),default='SEARCHING',index=True); created=db.Column(db.Float,default=now)
class Round(db.Model):
 __tablename__='RIDE_MATCH_ROUNDS'
 id=db.Column(db.Integer,primary_key=True); ride_id=db.Column(db.Integer,db.ForeignKey('RIDES.id')); number=db.Column(db.Integer); radius=db.Column(db.Integer); expires=db.Column(db.Float); outcome=db.Column(db.String(20),default='pending')
 __table_args__=(db.UniqueConstraint('ride_id','number'),)
class Invitation(db.Model):
 __tablename__='RIDE_INVITATIONS'
 id=db.Column(db.Integer,primary_key=True); ride_id=db.Column(db.Integer,db.ForeignKey('RIDES.id')); driver_id=db.Column(db.Integer,db.ForeignKey('DRIVERS.id')); status=db.Column(db.String(20),default='pending',index=True); expires=db.Column(db.Float,index=True)
 __table_args__=(db.UniqueConstraint('ride_id','driver_id'),)
class Quote(db.Model):
 __tablename__='FARE_QUOTES'
 id=db.Column(db.Integer,primary_key=True); user_id=db.Column(db.Integer,db.ForeignKey('USERS.id')); data=db.Column(db.JSON); expires=db.Column(db.Float)
class FareRule(db.Model):
 __tablename__='FARE_RULES'
 id=db.Column(db.Integer,primary_key=True); data=db.Column(db.JSON)
class Zone(db.Model):
 __tablename__='SURGE_ZONES'
 id=db.Column(db.Integer,primary_key=True); data=db.Column(db.JSON)
class Share(db.Model):
 __tablename__='REVENUE_SHARE_SETTINGS'
 id=db.Column(db.Integer,primary_key=True); driver_pct=db.Column(db.Float,default=85); company_pct=db.Column(db.Float,default=15); effective=db.Column(db.Float,default=now); admin_id=db.Column(db.Integer,db.ForeignKey('USERS.id'))
class Ledger(db.Model):
 __tablename__='REVENUE_LEDGER'
 id=db.Column(db.Integer,primary_key=True); ride_id=db.Column(db.Integer,db.ForeignKey('RIDES.id'),unique=True); driver_id=db.Column(db.Integer,db.ForeignKey('DRIVERS.id')); fare=db.Column(db.Float); driver_pct=db.Column(db.Float); company_pct=db.Column(db.Float); driver_amount=db.Column(db.Float); company_amount=db.Column(db.Float)
class DemoPayment(db.Model):
 __tablename__='DEMO_PAYMENTS'
 ride_id=db.Column(db.Integer,db.ForeignKey('RIDES.id'),primary_key=True)
 amount=db.Column(db.Float,nullable=False)
 paid_at=db.Column(db.Float,default=now,nullable=False)
 reference=db.Column(db.String(40),unique=True,nullable=False)
class Audit(db.Model):
 __tablename__='ADMIN_AUDIT_LOG'
 id=db.Column(db.Integer,primary_key=True); admin_id=db.Column(db.Integer); action=db.Column(db.String(50)); before=db.Column(db.JSON); after=db.Column(db.JSON); reason=db.Column(db.String(250)); created=db.Column(db.Float,default=now)
class Repository:
 @staticmethod
 def add(obj): db.session.add(obj); db.session.flush(); return obj
 @staticmethod
 def get(model,id):
  obj=db.session.get(model,id)
  if not obj: raise ValueError('Record not found')
  return obj

def profile(u): return dict(id=u.id,name=display_name(u.id),mobile=u.mobile,user_code=u.user_code,role=u.role)
def auth(role=None):
 def decorator(fn):
  @wraps(fn)
  def wrapped(*a,**kw):
   try: g.user=Repository.get(User,signer.loads(request.headers.get('Authorization','').removeprefix('Bearer '),max_age=3600))
   except (BadSignature,SignatureExpired,ValueError): return jsonify(error='Please sign in again'),401
   if g.user.status!='active' or (role and g.user.role!=role): return jsonify(error='Access denied'),403
   return fn(*a,**kw)
  return wrapped
 return decorator
@app.before_request
def request_id(): g.request_id=secrets.token_hex(8)
@app.after_request
def headers(r): r.headers['X-Request-ID']=g.request_id; return r
@app.errorhandler(ValueError)
def invalid(e): db.session.rollback(); return jsonify(error=str(e),request_id=g.request_id),400
@app.errorhandler(500)
def failed(e): db.session.rollback(); return jsonify(error='Request failed',request_id=g.request_id),500
def body():
 b=request.get_json(silent=True)
 if not isinstance(b,dict): raise ValueError('JSON object required')
 return b
def coordinates(value):
 try: lat,lng=map(float,value.split(',')) if isinstance(value,str) else map(float,value)
 except Exception: raise ValueError('Coordinates must be latitude,longitude')
 if not (-90<=lat<=90 and -180<=lng<=180): raise ValueError('Coordinates out of range')
 return [lat,lng]
def distance(a,b):
 p,q=map(math.radians,[a[0],b[0]]); d=math.radians(b[1]-a[1]); return 6371000*2*math.asin(min(1,math.sqrt(math.sin((q-p)/2)**2+math.cos(p)*math.cos(q)*math.sin(d/2)**2)))
class AuthService:
 @staticmethod
 def register(b):
  name=valid_name(b.get('name'))
  mobile=str(b.get('mobile','')).replace(' ','')
  if not re.fullmatch(r'\+[1-9]\d{7,14}',mobile): raise ValueError('Use international mobile format, e.g. +919876543210')
  if len(b.get('password',''))<10: raise ValueError('Password needs at least 10 characters')
  if b.get('role','rider') not in ('rider','driver'): raise ValueError('Invalid role')
  if User.query.filter_by(mobile=mobile).first(): raise ValueError('Account cannot be registered')
  role=b.get('role','rider'); digest=hmac.new(code_secret.encode(),(role+mobile).encode(),hashlib.sha256).hexdigest()
  code=('DRV-' if role=='driver' else 'RID-')+digest[:16]
  if User.query.filter_by(user_code=code).first(): code+=digest[16:32]
  u=Repository.add(User(mobile=mobile,password_hash=generate_password_hash(b['password']),user_code=code,role=role))
  Repository.add(Profile(user_id=u.id,name=name))
  if role=='driver': Repository.add(Driver(id=u.id))
  db.session.commit(); return profile(u)
@app.post('/api/auth/register')
@limiter.limit('5 per minute')
def register(): return jsonify(AuthService.register(body())),201
@app.post('/api/auth/login')
@limiter.limit('5 per minute')
def login():
 b=body(); u=User.query.filter_by(mobile=str(b.get('mobile','')).replace(' ','')).first()
 if not u or not check_password_hash(u.password_hash,b.get('password','')) or u.status!='active': return jsonify(error='Invalid credentials'),401
 return jsonify(token=signer.dumps(u.id),user=profile(u))
@app.get('/api/me')
@auth()
def me(): return jsonify(profile(g.user))
@app.put('/api/me')
@auth()
def update_profile():
 name=valid_name(body().get('name'))
 p=db.session.get(Profile,g.user.id)
 if p: p.name=name
 else: Repository.add(Profile(user_id=g.user.id,name=name))
 db.session.commit(); return jsonify(profile(g.user))
class FareService:
 @staticmethod
 def route(a,b):
  key=os.getenv('GOOGLE_MAPS_SERVER_KEY')
  if not key:
   if os.getenv('DEMO_MODE','0')!='1': raise ValueError('Routes API is not configured')
   km=distance(a,b)/1000*1.3
   return dict(km=round(km,2),minutes=round(km*3,1),baseline=round(km*3,1),demo=True,polyline=None)
  try:
   r=requests.post('https://routes.googleapis.com/directions/v2:computeRoutes',headers={'X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline'},json={'origin':{'location':{'latLng':{'latitude':a[0],'longitude':a[1]}}},'destination':{'location':{'latLng':{'latitude':b[0],'longitude':b[1]}}},'travelMode':'DRIVE','routingPreference':'TRAFFIC_AWARE','departureTime':datetime.now(timezone.utc).isoformat().replace('+00:00','Z')},timeout=10)
   r.raise_for_status(); routes=r.json().get('routes',[])
   if not routes: raise ValueError('No driving route found between these locations')
   route=routes[0]
   return dict(km=route['distanceMeters']/1000,minutes=float(route['duration'][:-1])/60,baseline=float(route['staticDuration'][:-1])/60,demo=False,polyline=route['polyline']['encodedPolyline'])
  except ValueError: raise ValueError('No valid driving route returned; check your locations')
  except requests.Timeout: raise ValueError('Google Routes timed out; please retry')
  except requests.RequestException: raise ValueError('Google Routes unavailable; check server key, billing, quota and API restrictions')
  except (KeyError,IndexError,TypeError): raise ValueError('Google Routes returned an incomplete route')
 @staticmethod
 def quote(a,b):
  route=FareService.route(a,b); rule=FareRule.query.first().data; multiplier=1.; reasons=[]; stamp=datetime.now(timezone.utc)
  for zone in Zone.query.all():
   z=zone.data
   if z['enabled'] and stamp.weekday() in z['days'] and z['start_hour']<=stamp.hour<z['end_hour'] and distance(a,z['center'])<=z['radius_m']:
    multiplier=max(multiplier,z['multiplier']); reasons.append(z['name'])
  if route['baseline'] and route['minutes']/route['baseline']>=1.5: multiplier=max(multiplier,1.2); reasons.append('Heavy traffic')
  multiplier=min(multiplier,rule['cap']) if rule['surge_enabled'] else 1
  base=rule['base']; dist=money(route['km']*rule['per_km']); duration=money(route['minutes']*rule['per_minute'])
  data=dict(origin=a,destination=b,**route,base=base,distance_amount=dist,duration_amount=duration,multiplier=multiplier,reasons=reasons,total=money(max(rule['minimum'],(base+dist+duration)*multiplier)),quoted_at=now())
  q=Repository.add(Quote(user_id=g.user.id,data=data,expires=now()+120)); db.session.commit(); return dict(id=q.id,expires=q.expires,**data)
@app.get('/api/maps/route')
@auth()
def route(): return jsonify(FareService.route(coordinates(request.args.get('origin')),coordinates(request.args.get('destination'))))
@app.get('/api/fares/quote')
@auth('rider')
def quote(): return jsonify(FareService.quote(coordinates(request.args.get('origin')),coordinates(request.args.get('destination'))))
TRANSITIONS={'offline':['available'],'available':['offline','temporarily_unavailable'],'temporarily_unavailable':['available','offline'],'ride_requested':['offline'],'ride_accepted':['arriving_at_pickup'],'arriving_at_pickup':['waiting_for_rider'],'waiting_for_rider':[],'ride_completed':['available','offline']}
class DriverService:
 @staticmethod
 def status(s):
  d=Repository.get(Driver,g.user.id)
  if s not in TRANSITIONS.get(d.status,[]): raise ValueError('Invalid status transition')
  if s=='available':
   loc=db.session.get(Location,d.id)
   if not loc or loc.updated<now()-90: raise ValueError('Share a fresh location before going available')
  if s=='offline':
   for i in Invitation.query.filter_by(driver_id=d.id,status='pending'): i.status='cancelled'
  d.status=s; d.updated=now(); db.session.commit(); return dict(status=s)
 @staticmethod
 def location(b):
  a=coordinates([b.get('lat'),b.get('lng')]); accuracy=float(b.get('accuracy',0)); captured=float(b.get('recorded',now()))
  if not math.isfinite(accuracy) or not 0<=accuracy<=10000 or abs(now()-captured)>90: raise ValueError('Invalid accuracy or timestamp')
  d=Repository.get(Driver,g.user.id)
  if d.status=='suspended': raise ValueError('Driver suspended')
  loc=db.session.get(Location,d.id)
  if loc and distance([loc.lat,loc.lng],a)>max(1000,(now()-loc.updated)*70): raise ValueError('Implausible location movement')
  if not loc: loc=Repository.add(Location(id=d.id))
  loc.lat,loc.lng=a; loc.accuracy=accuracy; loc.recorded=captured; loc.updated=now(); db.session.commit(); return dict(updated=loc.updated)
@app.put('/api/driver/location')
@auth('driver')
def location(): return jsonify(DriverService.location(body()))
@app.post('/api/driver/status')
@auth('driver')
def status(): return jsonify(DriverService.status(body().get('status')))
def ride_json(r):
 q=Repository.get(Quote,r.quote_id); rd=Round.query.filter_by(ride_id=r.id).order_by(Round.number.desc()).first()
 loc=db.session.get(Location,r.driver_id) if r.driver_id and r.status=='ASSIGNED' else None
 v=db.session.get(RideVerification,r.id)
 ledger=Ledger.query.filter_by(ride_id=r.id).first()
 payment=db.session.get(DemoPayment,r.id)
 return dict(id=r.id,status=r.status,payment=dict(status='simulated_paid',amount=payment.amount,reference=payment.reference,paid_at=payment.paid_at) if payment else dict(status='pending'),driver_id=r.driver_id,driver_name=display_name(r.driver_id) if r.driver_id else None,rider_name=display_name(r.rider_id),start_code=ride_code(v) if v and not v.verified and v.expires>now() and v.attempts<5 and g.user.id==r.rider_id else None,code_expires=v.expires if v else None,settlement=dict(driver_pct=ledger.driver_pct,company_pct=ledger.company_pct,driver_amount=ledger.driver_amount,company_amount=ledger.company_amount) if ledger else None,driver_location=dict(lat=loc.lat,lng=loc.lng,updated=loc.updated) if loc and loc.updated>now()-90 else None,quote=q.data,radius=rd.radius if rd else 500,expires=rd.expires if rd else now(),driver_status=db.session.get(Driver,r.driver_id).status if r.driver_id else None)
lock=threading.RLock()
class RideService:
 @staticmethod
 def matching(r,number):
  rd=Repository.add(Round(ride_id=r.id,number=number,radius=number*500,expires=now()+30)); q=Repository.get(Quote,r.quote_id)
  for d in Driver.query.filter_by(status='available'):
   loc=db.session.get(Location,d.id)
   if loc and loc.updated>=now()-90 and distance(q.data['origin'],[loc.lat,loc.lng])<=rd.radius and not Invitation.query.filter_by(ride_id=r.id,driver_id=d.id).first():
    Repository.add(Invitation(ride_id=r.id,driver_id=d.id,expires=rd.expires)); d.status='ride_requested'
    socket.emit('ride.requested',{'ride_id':r.id,'expires':rd.expires},to=str(d.id))
 @staticmethod
 def create(b):
  q=Repository.get(Quote,int(b.get('quote_id',0)))
  if q.user_id!=g.user.id or q.expires<=now(): raise ValueError('Quote expired or unavailable')
  if Ride.query.filter_by(quote_id=q.id).first() or Ride.query.filter(Ride.rider_id==g.user.id,Ride.status.in_(['SEARCHING','ASSIGNED'])).first(): raise ValueError('You already have an active ride')
  r=Repository.add(Ride(rider_id=g.user.id,quote_id=q.id)); RideService.matching(r,1); db.session.commit(); return ride_json(r)
 @staticmethod
 def action(id,action):
  with lock:
   r=Repository.get(Ride,id)
   if action=='cancel':
    if r.rider_id!=g.user.id or r.status!='SEARCHING': raise ValueError('Only searching rides can be cancelled')
    r.status='CANCELLED'
   elif action in ('accept','reject'):
    i=Invitation.query.filter_by(ride_id=id,driver_id=g.user.id,status='pending').first(); d=Repository.get(Driver,g.user.id); loc=db.session.get(Location,d.id)
    if not i or i.expires<=now() or r.status!='SEARCHING' or d.status!='ride_requested' or not loc or loc.updated<now()-90: raise ValueError('Invitation no longer available')
    i.status=action; d.status='available'
    if action=='accept':
     changed=Ride.query.filter_by(id=id,status='SEARCHING').update({'status':'ASSIGNED','driver_id':d.id})
     if changed!=1: raise ValueError('Ride already assigned')
     d.status='ride_accepted'; db.session.refresh(r)
     Repository.add(RideVerification(ride_id=r.id,nonce=secrets.token_hex(32),expires=now()+3600))
   elif action=='start':
    if r.driver_id!=g.user.id or r.status!='ASSIGNED': raise ValueError('Only the assigned driver can start this ride')
    d=Repository.get(Driver,g.user.id); v=db.session.get(RideVerification,id)
    if d.status!='waiting_for_rider' or not v or v.verified or v.expires<=now() or v.attempts>=5: raise ValueError('Code unavailable or locked. Ask the rider to renew it.')
    code=str(body().get('code',''))
    if not hmac.compare_digest(code,ride_code(v)):
     v.attempts+=1; db.session.commit(); raise ValueError('Incorrect ride code. Five attempts maximum.')
    v.verified=True; d.status='ongoing_ride'
   elif action=='renew-code':
    if r.rider_id!=g.user.id or r.status!='ASSIGNED': raise ValueError('Ride unavailable')
    d=Repository.get(Driver,r.driver_id); v=db.session.get(RideVerification,id)
    if d.status not in ('ride_accepted','arriving_at_pickup','waiting_for_rider'): raise ValueError('Trip already started')
    if not v: v=Repository.add(RideVerification(ride_id=id,nonce=secrets.token_hex(32),expires=now()+3600))
    v.nonce=secrets.token_hex(32); v.expires=now()+3600; v.attempts=0; v.verified=False
   elif action=='complete':
    if r.driver_id!=g.user.id: raise ValueError('Ride unavailable')
    if r.status=='COMPLETED': return ride_json(r)
    d=Repository.get(Driver,g.user.id)
    if d.status!='ongoing_ride': raise ValueError('Trip must be ongoing')
    share=Share.query.order_by(Share.id.desc()).first(); fare=Repository.get(Quote,r.quote_id).data['total']; amount=money(Decimal(str(fare))*Decimal(str(share.driver_pct))/100)
    Repository.add(Ledger(ride_id=id,driver_id=d.id,fare=fare,driver_pct=share.driver_pct,company_pct=share.company_pct,driver_amount=amount,company_amount=money(fare-amount))); r.status='COMPLETED'; d.status='available'; d.updated=now()
   else: raise ValueError('Unknown action')
   if r.status!='SEARCHING':
    for invitation in Invitation.query.filter_by(ride_id=id,status='pending'):
     invitation.status='cancelled'; other=Repository.get(Driver,invitation.driver_id)
     if other.status=='ride_requested': other.status='available'
   db.session.commit(); socket.emit('ride.updated',{'ride_id':id},to=str(r.rider_id)); return ride_json(r)
@app.post('/api/rides')
@auth('rider')
def create_ride(): return jsonify(RideService.create(body())),201
@app.get('/api/rides/<int:id>')
@auth()
def get_ride(id):
 r=Repository.get(Ride,id)
 if g.user.role!='admin' and g.user.id not in (r.rider_id,r.driver_id): return jsonify(error='Access denied'),403
 return jsonify(ride_json(r))
@app.get('/api/rides/<int:id>/route')
@auth()
@limiter.limit('10 per minute')
def live_route(id):
 r=Repository.get(Ride,id)
 if g.user.id not in (r.rider_id,r.driver_id) and g.user.role!='admin': return jsonify(error='Access denied'),403
 if r.status!='ASSIGNED': raise ValueError('Live ETA is available for assigned trips')
 q=Repository.get(Quote,r.quote_id).data; d=Repository.get(Driver,r.driver_id); loc=db.session.get(Location,d.id)
 if not loc or loc.updated<now()-90: raise ValueError('Driver location is stale; waiting for a fresh GPS update')
 leg='destination' if d.status=='ongoing_ride' else 'pickup'
 origin=[loc.lat,loc.lng]; destination=q['destination'] if leg=='destination' else q['origin']
 result=FareService.route(origin,destination); timestamp=now()
 return jsonify(**result,origin=origin,destination=destination,leg=leg,calculated_at=timestamp,arrival_at=timestamp+result['minutes']*60,traffic_delay_minutes=max(0,result['minutes']-result['baseline']))
@app.post('/api/rides/<int:id>/<action>')
@limiter.limit('15 per minute')
@auth()
def ride_action(id,action): return jsonify(RideService.action(id,action))
@app.post('/api/rides/<int:id>/simulate-payment')
@auth('rider')
@limiter.limit('10 per minute')
def simulate_payment(id):
 with lock:
  r=Repository.get(Ride,id)
  if r.rider_id!=g.user.id: return jsonify(error='Access denied'),403
  if r.status!='COMPLETED': raise ValueError('Finish the ride before simulating payment')
  payment=db.session.get(DemoPayment,id)
  if not payment:
   fare=Repository.get(Quote,r.quote_id).data['total']
   Repository.add(DemoPayment(ride_id=id,amount=fare,reference='DEMO-'+secrets.token_hex(10)))
   db.session.commit()
  socket.emit('ride.updated',{'ride_id':id},to=str(r.driver_id))
  return jsonify(ride_json(r))
@app.get('/api/dashboard')
@auth()
def dashboard():
 rides=Ride.query
 if g.user.role=='rider': rides=rides.filter_by(rider_id=g.user.id)
 if g.user.role=='driver': rides=rides.filter_by(driver_id=g.user.id)
 result=dict(rides=[ride_json(r) for r in rides.order_by(Ride.id.desc()).limit(30)])
 if g.user.role=='driver':
  share=Share.query.order_by(Share.id.desc()).first()
  result.update(revenue_share=dict(driver_pct=share.driver_pct,company_pct=share.company_pct),status=Repository.get(Driver,g.user.id).status,invitations=[dict(**ride_json(Repository.get(Ride,i.ride_id)),deadline=i.expires) for i in Invitation.query.filter(Invitation.driver_id==g.user.id,Invitation.status=='pending',Invitation.expires>now())],earnings=sum(x.driver_amount for x in Ledger.query.filter_by(driver_id=g.user.id)))
 return jsonify(result)
class AdminService:
 @staticmethod
 def settings(kind,b=None):
  if kind=='revenue-share':
   old=Share.query.order_by(Share.id.desc()).first(); previous=dict(driver_pct=old.driver_pct,company_pct=old.company_pct)
   if b is None: return previous
   a,c=Decimal(str(b.get('driver_pct'))),Decimal(str(b.get('company_pct')))
   if not a.is_finite() or not c.is_finite() or not 0<=a<=100 or a+c!=100: raise ValueError('Shares must total 100%')
   Repository.add(Share(driver_pct=float(a),company_pct=float(c),admin_id=g.user.id))
  elif kind=='fare-rules':
   row=FareRule.query.first(); previous=row.data
   if b is None: return previous
   for k in ('base','per_km','per_minute','minimum','cap'):
    if not isinstance(b.get(k),(float,int)) or not math.isfinite(b[k]) or b[k]<0: raise ValueError('Invalid fare rule')
   if not 1<=b['cap']<=5: raise ValueError('Cap must be between 1 and 5')
   row.data={k:b[k] for k in ('base','per_km','per_minute','minimum','cap','surge_enabled')}
  elif kind=='zones':
   if b is None: return [dict(id=z.id,**z.data) for z in Zone.query.all()]
   previous={}; coordinates(b.get('center'))
   if not 0<=b['start_hour']<b['end_hour']<=24 or not 1<=b['multiplier']<=5 or not 0<b['radius_m']<=100000 or any(d not in range(7) for d in b['days']): raise ValueError('Invalid zone schedule')
   Repository.add(Zone(data=b))
  else: raise ValueError('Unknown setting')
  if not str(b.get('reason','')).strip(): raise ValueError('A change reason is required')
  Repository.add(Audit(admin_id=g.user.id,action=kind,before=previous,after=b,reason=b['reason'])); db.session.commit(); return dict(saved=True)
@app.route('/api/admin/<kind>',methods=['GET','PUT','POST'])
@auth('admin')
def admin(kind):
 if kind=='drivers': return jsonify([dict(id=d.id,status=d.status,fresh=bool(db.session.get(Location,d.id) and db.session.get(Location,d.id).updated>now()-90)) for d in Driver.query.all()])
 if kind=='rides': return jsonify([ride_json(r) for r in Ride.query.all()])
 if kind=='audit': return jsonify([dict(id=a.id,action=a.action,reason=a.reason,before=a.before,after=a.after) for a in Audit.query.order_by(Audit.id.desc()).all()])
 return jsonify(AdminService.settings(kind,body() if request.method!='GET' else None))
@socket.on('connect')
def connect(auth_data):
 try:
  u=Repository.get(User,signer.loads((auth_data or {}).get('token',''),max_age=3600))
  if u.status!='active': return False
  join_room(str(u.id))
 except Exception: return False
def tick():
 with app.app_context(),lock:
  for rd in Round.query.filter(Round.outcome=='pending',Round.expires<=now()).all():
   r=Repository.get(Ride,rd.ride_id); rd.outcome='expired'
   for i in Invitation.query.filter_by(ride_id=r.id,status='pending'):
    i.status='expired'; d=Repository.get(Driver,i.driver_id)
    if d.status=='ride_requested': d.status='available'
    socket.emit('ride.expired',{'ride_id':r.id},to=str(d.id))
   if r.status=='SEARCHING':
    if rd.number>=10: r.status='NO_DRIVER_FOUND'
    else: RideService.matching(r,rd.number+1)
  db.session.commit()
def worker():
 while True:
  try: tick()
  except Exception: app.logger.exception('Matching worker failed')
  time.sleep(1)
@app.cli.command('init-demo')
def init_demo():
 if os.getenv('DEMO_MODE')!='1': raise ValueError('Enable DEMO_MODE for local initialization')
 db.create_all()
 if not FareRule.query.first(): Repository.add(FareRule(data=dict(base=40,per_km=14,per_minute=2,minimum=60,cap=2,surge_enabled=True)))
 if not Share.query.first(): Repository.add(Share(driver_pct=85,company_pct=15))
 db.session.commit(); print('Demo database initialized. Register rider/driver in the UI.')
@app.cli.command('upgrade-profiles-otp')
def upgrade_profiles_otp():
 # Additive schema upgrade; does not alter or delete existing user/ride data.
 Profile.__table__.create(db.engine,checkfirst=True)
 RideVerification.__table__.create(db.engine,checkfirst=True)
 print('Profile and ride-verification tables ready. Existing users can set names in Profile.')
@app.cli.command('upgrade-payments')
def upgrade_payments():
 DemoPayment.__table__.create(db.engine,checkfirst=True)
 print('Demo payment table ready; no real payments are processed.')
@app.cli.command('create-admin')
def create_admin():
 import getpass
 mobile=input('Admin mobile (+countrycode): '); password=getpass.getpass('Admin password: ')
 AuthService.register(dict(name=input('Display name: '),mobile=mobile,password=password,role='rider')); u=User.query.filter_by(mobile=mobile).first(); u.role='admin'; db.session.commit(); print('Admin created')
if __name__=='__main__':
 threading.Thread(target=worker,daemon=True).start(); socket.run(app,host='127.0.0.1',port=5000,allow_unsafe_werkzeug=True)
