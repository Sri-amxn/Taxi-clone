import os
os.environ.update(DATABASE_URL='sqlite://',DEMO_MODE='1',SECRET_KEY='test-secret',USER_CODE_SECRET='test-code-secret')
from app import app,db,User,FareRule,Share,Repository,tick

def test_complete_workflow():
 with app.app_context():
  db.create_all(); Repository.add(FareRule(data=dict(base=40,per_km=14,per_minute=2,minimum=60,cap=2,surge_enabled=True))); Repository.add(Share(driver_pct=85,company_pct=15)); db.session.commit()
 c=app.test_client()
 def account(mobile,role):
  b=dict(name='Test Member',mobile=mobile,password='strong-test-password',role=role)
  assert c.post('/api/auth/register',json=b).status_code==201
  r=c.post('/api/auth/login',json=b).json
  return {'Authorization':'Bearer '+r['token']}
 rider=account('+919876543210','rider'); driver=account('+919876543211','driver')
 assert c.get('/api/admin/revenue-share',headers=rider).status_code==403
 assert c.get('/api/me').status_code==401
 assert c.put('/api/driver/location',headers=driver,json=dict(lat=100,lng=77)).status_code==400
 assert c.put('/api/driver/location',headers=driver,json=dict(lat=12.9784,lng=77.6408)).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='available')).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='offline')).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='offline')).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='available')).status_code==200
 q=c.get('/api/fares/quote?origin=12.9784,77.6408&destination=12.9756,77.6067&origin_label=Pickup&destination_label=Destination',headers=rider).json
 r=c.post('/api/rides',headers=rider,json=dict(quote_id=q['id'])); assert r.status_code==201,r.json
 id=r.json['id']; assert r.json['radius']==500
 assert r.json['quote']['origin_label']=='Pickup'
 assert r.json['requested_at']>0
 assert len(c.get('/api/dashboard',headers=driver).json['invitations'])==1
 assert c.post(f'/api/rides/{id}/accept',headers=driver).status_code==200
 assert c.post(f'/api/rides/{id}/accept',headers=driver).status_code==400
 for status in ['arriving_at_pickup','waiting_for_rider']:
  assert c.post('/api/driver/status',headers=driver,json=dict(status=status)).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='ongoing_ride')).status_code==400
 code=c.get(f'/api/rides/{id}',headers=rider).json['start_code']
 assert len(code)==6
 assert c.get(f'/api/rides/{id}',headers=driver).json['start_code'] is None
 assert c.post(f'/api/rides/{id}/start',headers=rider,json=dict(code=code)).status_code==400
 assert c.post(f'/api/rides/{id}/start',headers=driver,json=dict(code='wrong')).status_code==400
 assert c.post(f'/api/rides/{id}/start',headers=driver,json=dict(code=code)).status_code==200
 assert c.post(f'/api/rides/{id}/start',headers=driver,json=dict(code=code)).status_code==400
 assert c.get(f'/api/rides/{id}',headers=rider).json['start_code'] is None
 assert c.put('/api/me',headers=rider,json=dict(name='Updated Rider')).json['name']=='Updated Rider'
 assert c.put('/api/me',headers=rider,json=dict(name='')).status_code==400
 assert c.post('/api/driver/status',headers=driver,json=dict(status='offline')).status_code==400
 assert c.post(f'/api/rides/{id}/complete',headers=driver).status_code==200
 assert c.post(f'/api/rides/{id}/complete',headers=driver).status_code==200
 completed=c.get(f'/api/rides/{id}',headers=rider).json
 assert completed['quote']['completed_at']>0
 assert completed['quote']['total']==q['total']
 assert completed['quote']['driver_name_snapshot']=='Test Member'
 from app import Ledger
 with app.app_context():
  assert Ledger.query.count()==1
  ledger=Ledger.query.first(); assert round(ledger.driver_amount+ledger.company_amount,2)==ledger.fare

def test_google_route_contract(monkeypatch):
 from app import FareService
 monkeypatch.setenv('GOOGLE_MAPS_SERVER_KEY','test-only')
 captured={}
 class Response:
  def raise_for_status(self): pass
  def json(self): return {'routes':[{'distanceMeters':2500,'duration':'600s','staticDuration':'400s','polyline':{'encodedPolyline':'example'}}]}
 def post(url,**kwargs): captured.update(kwargs); return Response()
 monkeypatch.setattr('app.requests.post',post)
 result=FareService.route([12,77],[13,78])
 assert result['minutes']==10 and result['km']==2.5 and result['demo'] is False
 assert captured['json']['routingPreference']=='TRAFFIC_AWARE'
 assert captured['json']['departureTime'].endswith('Z')
 assert captured['timeout']==10

def test_missing_google_key_fails_outside_demo(monkeypatch):
 import pytest
 from app import FareService
 monkeypatch.delenv('GOOGLE_MAPS_SERVER_KEY',raising=False)
 monkeypatch.setenv('DEMO_MODE','0')
 with pytest.raises(ValueError,match='not configured'): FareService.route([12,77],[13,78])

def test_code_expiry_lockout_and_renewal():
 from app import RideVerification,Ride,Driver,Quote,signer,now,limiter
 limiter.enabled=False
 with app.app_context():
  rider=User.query.filter_by(role='rider').first(); driver=User.query.filter_by(role='driver').first()
  q=Repository.add(Quote(user_id=rider.id,data={},expires=now()+120))
  r=Repository.add(Ride(rider_id=rider.id,driver_id=driver.id,quote_id=q.id,status='ASSIGNED'))
  Repository.add(RideVerification(ride_id=r.id,nonce='test-nonce',expires=now()-1))
  db.session.get(Driver,driver.id).status='waiting_for_rider'; db.session.commit()
  id=r.id; headers={'Authorization':'Bearer '+signer.dumps(driver.id)}; rh={'Authorization':'Bearer '+signer.dumps(rider.id)}
 c=app.test_client()
 assert c.post(f'/api/rides/{id}/start',headers=headers,json={'code':'000000'}).status_code==400
 assert c.post(f'/api/rides/{id}/renew-code',headers=headers).status_code==400
 assert c.post(f'/api/rides/{id}/renew-code',headers=rh).status_code==200
 code=c.get(f'/api/rides/{id}',headers=rh).json['start_code']
 for _ in range(5): assert c.post(f'/api/rides/{id}/start',headers=headers,json={'code':'invalid'}).status_code==400
 assert c.post(f'/api/rides/{id}/start',headers=headers,json={'code':code}).status_code==400
 assert c.get(f'/api/rides/{id}',headers=rh).json['start_code'] is None
 assert c.post(f'/api/rides/{id}/renew-code',headers=rh).status_code==200
 new_code=c.get(f'/api/rides/{id}',headers=rh).json['start_code']
 assert c.post(f'/api/rides/{id}/start',headers=headers,json={'code':new_code}).status_code==200
 limiter.enabled=True


def test_quotes_follow_traffic_and_expire(monkeypatch):
 from app import FareService,signer,Quote,now
 from flask import g
 with app.app_context():
  rider=User.query.filter_by(role='rider').first(); headers={'Authorization':'Bearer '+signer.dumps(rider.id)}
 c=app.test_client()
 route=dict(km=2,minutes=10,baseline=10,demo=False,polyline='test')
 monkeypatch.setattr(FareService,'route',staticmethod(lambda a,b:dict(route)))
 path='/api/fares/quote?origin=19,72&destination=19.1,72.1&origin_label=Station&destination_label=Office'
 normal=c.get(path,headers=headers).json
 assert normal['total']==88 and normal['multiplier']==1
 route['minutes']=20
 traffic=c.get(path,headers=headers).json
 assert traffic['total']==129.6 and traffic['multiplier']==1.2
 assert traffic['origin_label']=='Station' and 'Heavy traffic' in traffic['reasons']
 with app.app_context():
  assert db.session.get(Quote,normal['id']).data['total']==88
  q=db.session.get(Quote,traffic['id']); q.expires=now()-1; db.session.commit()
 assert c.post('/api/rides',headers=headers,json={'quote_id':traffic['id']}).status_code==400
