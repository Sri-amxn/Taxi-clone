import React, {useEffect,useRef,useState} from 'react';
import {Alert,Button,Switch} from 'antd';
let loading;
export function loadMaps(){
 const key=import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
 if(!key)return Promise.reject(Error('Add your Google Maps browser key to frontend/.env.local and restart Vite.'));
 if(!loading)loading=new Promise((resolve,reject)=>{
  if(window.google?.maps){resolve(window.google.maps);return;}
  const script=document.createElement('script');
  const timer=setTimeout(()=>reject(Error('Google Maps timed out. Check network access and API restrictions.')),15000);
  window.gm_authFailure=()=>{clearTimeout(timer);reject(Error('Google Maps rejected the key. Check billing, enabled APIs and website restrictions.'));};
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places,geometry`;
  script.onload=()=>{clearTimeout(timer);resolve(window.google.maps)};
  script.onerror=()=>{clearTimeout(timer);reject(Error('Google Maps could not load. Check network access.'))};
  document.head.appendChild(script);
 });
 return loading;
}
export function AddressSearch({onChange,label}){
 const host=useRef();const callback=useRef(onChange);callback.current=onChange;const [error,setError]=useState('');
 useEffect(()=>{let disposed=false;let widget;let listener;
 loadMaps().then(async()=>{const {PlaceAutocompleteElement}=await google.maps.importLibrary('places');if(disposed)return;widget=new PlaceAutocompleteElement();widget.setAttribute('aria-label',label);host.current.replaceChildren(widget);listener=async event=>{try{const place=event.placePrediction.toPlace();await place.fetchFields({fields:['location','formattedAddress']});if(!disposed&&place.location)callback.current(`${place.location.lat()},${place.location.lng()}`);}catch{setError('Address lookup failed. Try again or use coordinates.')}};widget.addEventListener('gmp-select',listener);widget.addEventListener('gmp-error',()=>setError('Address search unavailable. Check Places API (New) access.'));}).catch(e=>!disposed&&setError(e.message));
 return()=>{disposed=true;if(widget&&listener)widget.removeEventListener('gmp-select',listener);host.current?.replaceChildren()};},[label]);
 return <div><div ref={host}/>{error&&<small role="alert">{error}</small>}</div>;
}
export function LiveMap({quote,driverLocation}){
 const host=useRef();const map=useRef();const overlays=useRef([]);const traffic=useRef();const driver=useRef();const [error,setError]=useState('');const [ready,setReady]=useState(false);const [trafficOn,setTrafficOn]=useState(true);
 useEffect(()=>{let disposed=false;loadMaps().then(m=>{if(disposed)return;map.current=new m.Map(host.current,{center:{lat:12.9756,lng:77.6067},zoom:13,mapTypeControl:false,streetViewControl:false});traffic.current=new m.TrafficLayer();traffic.current.setMap(map.current);setReady(true)}).catch(e=>!disposed&&setError(e.message));return()=>{disposed=true;overlays.current.forEach(x=>x.setMap(null));driver.current?.setMap(null);traffic.current?.setMap(null)}},[]);
 useEffect(()=>{if(!ready)return;traffic.current.setMap(trafficOn?map.current:null)},[ready,trafficOn]);
 useEffect(()=>{if(!ready||!quote)return;overlays.current.forEach(x=>x.setMap(null));overlays.current=[];const bounds=new google.maps.LatLngBounds();[quote.origin,quote.destination].forEach(([lat,lng],i)=>{overlays.current.push(new google.maps.Marker({map:map.current,position:{lat,lng},label:i?'B':'A'}));bounds.extend({lat,lng})});if(quote.polyline)overlays.current.push(new google.maps.Polyline({map:map.current,path:google.maps.geometry.encoding.decodePath(quote.polyline),strokeColor:'#6558e8',strokeWeight:5}));map.current.fitBounds(bounds,60)},[ready,quote?.polyline,JSON.stringify(quote?.origin),JSON.stringify(quote?.destination)]);
 useEffect(()=>{driver.current?.setMap(null);if(ready&&driverLocation)driver.current=new google.maps.Marker({map:map.current,position:{lat:driverLocation.lat,lng:driverLocation.lng},label:'D',title:'Assigned driver · latest GPS update'});},[ready,driverLocation?.lat,driverLocation?.lng]);
 return <section>{error&&<Alert type="warning" message={error} showIcon/>}<div ref={host} className="map"/>{ready&&<p><Switch checked={trafficOn} onChange={setTrafficOn} size="small"/> Show live traffic <small> · Coverage varies by location</small></p>}</section>;
}
export function TripMap({ride,request}){
 const [route,setRoute]=useState(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function refresh(){setBusy(true);try{const result=await request(`/rides/${ride.id}/route`);setRoute(result);setError('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{refresh();const timer=setInterval(refresh,60000);return()=>clearInterval(timer)},[ride.id,ride.driver_status]);
 const display=route||ride.quote;
 return <><LiveMap quote={display} driverLocation={ride.driver_location}/>{error&&<Alert message={error} type="warning"/>}{route&&<p>{route.leg==='pickup'?'Driver to pickup':'Trip to destination'} · {route.km.toFixed(1)} km · estimated {Math.ceil(route.minutes)} min · {Math.ceil(route.traffic_delay_minutes)} min traffic delay<br/>Estimated arrival {new Date(route.arrival_at*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · updated {new Date(route.calculated_at*1000).toLocaleTimeString()}<br/><small>Estimates change with traffic. Your confirmed fare stays unchanged.</small></p>}<Button loading={busy} onClick={refresh}>Refresh ETA</Button></>;
}
