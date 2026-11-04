import React,{useState,useRef} from 'react';
import {Alert,Switch} from 'antd';
const editable=['offline','available','ride_requested','ride_completed','temporarily_unavailable'];
export function Availability({status,request,onChanged}){
 const [busy,setBusy]=useState(false);const busyRef=useRef(false);const [note,setNote]=useState('');const [error,setError]=useState('');
 const canChange=editable.includes(status);
 async function change(online){
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
  try{
   if(online){
    setNote('Getting your location…');
    if(!navigator.geolocation)throw Error('Location is unavailable in this browser. Use a browser with location support.');
    const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,e=>reject(Error(e.code===1?'Allow location access in your browser and device settings, then try again.':e.code===3?'Location request timed out. Try again near a window or on your phone.':'Your device could not find its location. Check location services and try again.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    setNote('Saving your location…');
    await request('/driver/location','PUT',{lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,recorded:position.timestamp/1000});
   }
   setNote(online?'Going online…':'Going offline…');
   await request('/driver/status','POST',{status:online?'available':'offline'});
   await onChanged();setNote(online?'You’re online and ready for requests.':'You’re offline. New ride requests are paused.');
  }catch(e){setError(e.message||'Could not update availability. Please retry.');setNote('')}
  finally{setBusy(false);busyRef.current=false}
 }
 return <div aria-live="polite"><Switch aria-label="Driver online availability" loading={busy} disabled={!canChange||busy} checked={['available','ride_requested','ride_accepted','arriving_at_pickup','waiting_for_rider','ongoing_ride'].includes(status)} checkedChildren="Online" unCheckedChildren="Offline" onChange={change}/>{!canChange&&<p className="muted">{status==='suspended'?'Your account is suspended. Contact support to restore access.':'Complete your accepted trip before going offline.'}</p>}{canChange&&!note&&!error&&<p className="muted">Switch off whenever you’re not on an accepted trip. Going online requires location access.</p>}{note&&<p role="status">{note}</p>}{error&&<Alert type="error" showIcon message={error}/>}</div>
}
