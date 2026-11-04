import os
os.environ.update(DATABASE_URL='sqlite://',DEMO_MODE='1',SECRET_KEY='test-secret',USER_CODE_SECRET='test-code-secret')
from app import app,db,User,FareRule,Share,Repository,tick

def test_complete_workflow():
 with app.app_context():
  db.create_all(); Repository.add(FareRule(data=dict(base=40,per_km=14,per_minute=2,minimum=60,cap=2,surge_enabled=True))); Repository.add(Share(driver_pct=85,company_pct=15)); db.session.commit()
 c=app.test_client()
 def account(mobile,role):
  b=dict(mobile=mobile,password='strong-test-password',role=role)
  assert c.post('/api/auth/register',json=b).status_code==201
  r=c.post('/api/auth/login',json=b).json
  return {'Authorization':'Bearer '+r['token']}
 rider=account('+919876543210','rider'); driver=account('+919876543211','driver')
 assert c.get('/api/admin/revenue-share',headers=rider).status_code==403
 assert c.get('/api/me').status_code==401
 assert c.put('/api/driver/location',headers=driver,json=dict(lat=100,lng=77)).status_code==400
 assert c.put('/api/driver/location',headers=driver,json=dict(lat=12.9784,lng=77.6408)).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='available')).status_code==200
 q=c.get('/api/fares/quote?origin=12.9784,77.6408&destination=12.9756,77.6067',headers=rider).json
 r=c.post('/api/rides',headers=rider,json=dict(quote_id=q['id'])); assert r.status_code==201,r.json
 id=r.json['id']; assert r.json['radius']==500
 assert len(c.get('/api/dashboard',headers=driver).json['invitations'])==1
 assert c.post(f'/api/rides/{id}/accept',headers=driver).status_code==200
 assert c.post(f'/api/rides/{id}/accept',headers=driver).status_code==400
 for status in ['arriving_at_pickup','waiting_for_rider','ongoing_ride']:
  assert c.post('/api/driver/status',headers=driver,json=dict(status=status)).status_code==200
 assert c.post('/api/driver/status',headers=driver,json=dict(status='offline')).status_code==400
 assert c.post(f'/api/rides/{id}/complete',headers=driver).status_code==200
 assert c.post(f'/api/rides/{id}/complete',headers=driver).status_code==200
 from app import Ledger
 with app.app_context():
  assert Ledger.query.count()==1
  ledger=Ledger.query.first(); assert round(ledger.driver_amount+ledger.company_amount,2)==ledger.fare
