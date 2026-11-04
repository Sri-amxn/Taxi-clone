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
 loadMaps().then(async()=>{const {PlaceAutocompleteElement}=await google.maps.importLibrary('places');if(disposed)return;widget=new PlaceAutocompleteElement();widget.setAttribute('aria-label',label);host.current.replaceChildren(widget);listener=async event=>{try{const place=event.placePrediction.toPlace();await place.fetchFields({fields:['location','formattedAddress']});if(!disposed&&place.location)callback.current(`${place.location.lat()},${place.location.lng()}`,place.formattedAddress);}catch{setError('Address lookup failed. Try again or use coordinates.')}};widget.addEventListener('gmp-select',listener);widget.addEventListener('gmp-error',()=>setError('Address search unavailable. Check Places API (New) access.'));}).catch(e=>!disposed&&setError(e.message));
 return()=>{disposed=true;if(widget&&listener)widget.removeEventListener('gmp-select',listener);host.current?.replaceChildren()};},[label]);
 return <div><div ref={host}/>{error&&<small role="alert">{error}</small>}</div>;
}
function markerIcon(type){
 const car='<path d="M11 23l3-9h20l3 9v12h-5v-4H16v4h-5z" fill="white"/><path d="M17 17h14l2 6H15z" fill="#14281f"/><circle cx="16" cy="27" r="2" fill="#14281f"/><circle cx="32" cy="27" r="2" fill="#14281f"/>';
 const person='<circle cx="24" cy="17" r="6" fill="white"/><path d="M13 34c0-13 22-13 22 0z" fill="white"/>';
 const flag='<path d="M17 36V12m1 2h16l-4 6 4 6H18" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="22" fill="${type==='driver'?'#132d24':type==='destination'?'#ff6238':'#5928ed'}" stroke="white" stroke-width="3"/>${type==='driver'?car:type==='destination'?flag:person}</svg>`;
 return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(44,44),anchor:new google.maps.Point(22,22)};
}
export function LiveMap({quote,driverLocation,currentLocation,onPick,radius,role='rider'}){
 const host=useRef();const map=useRef();const own=useRef();const circle=useRef();const picker=useRef(onPick);picker.current=onPick;const overlays=useRef([]);const traffic=useRef();const driver=useRef();const [error,setError]=useState('');const [ready,setReady]=useState(false);const [trafficOn,setTrafficOn]=useState(true);
 useEffect(()=>{let disposed=false;loadMaps().then(m=>{if(disposed)return;map.current=new m.Map(host.current,{center:{lat:0,lng:0},zoom:2,mapTypeControl:false,streetViewControl:false});map.current.addListener('click',e=>picker.current?.(`${e.latLng.lat()},${e.latLng.lng()}`));traffic.current=new m.TrafficLayer();traffic.current.setMap(map.current);setReady(true)}).catch(e=>!disposed&&setError(e.message));return()=>{disposed=true;overlays.current.forEach(x=>x.setMap(null));driver.current?.setMap(null);traffic.current?.setMap(null)}},[]);
 useEffect(()=>{if(!ready)return;own.current?.setMap(null);circle.current?.setMap(null);if(currentLocation){const position={lat:currentLocation.lat,lng:currentLocation.lng};own.current=new google.maps.Marker({map:map.current,position,title:onPick?'Zone center':'Your location',icon:markerIcon(role)});if(!quote){map.current.panTo(position);map.current.setZoom(14)}if(radius)circle.current=new google.maps.Circle({map:map.current,center:position,radius:Number(radius),fillColor:'#6558e8',fillOpacity:.15,strokeColor:'#6558e8',strokeWeight:2});}return()=>{own.current?.setMap(null);circle.current?.setMap(null)}},[ready,currentLocation?.lat,currentLocation?.lng,radius,!!quote]);
 useEffect(()=>{if(!ready)return;traffic.current.setMap(trafficOn?map.current:null)},[ready,trafficOn]);
 useEffect(()=>{
  if(!ready)return;overlays.current.forEach(x=>x.setMap(null));overlays.current=[];
  if(!quote)return;
  const bounds=new google.maps.LatLngBounds();
  [quote.origin,quote.destination].forEach(([lat,lng],i)=>{overlays.current.push(new google.maps.Marker({map:map.current,position:{lat,lng},icon:markerIcon(i?'destination':quote.leg==='pickup'?'driver':'rider'),title:i?'Destination':'Start'}));bounds.extend({lat,lng})});
  let frame;let stopped=false;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let line;
  if(quote.polyline){
   const path=google.maps.geometry.encoding.decodePath(quote.polyline);
   overlays.current.push(new google.maps.Polyline({map:map.current,path,strokeColor:'#ffffff',strokeWeight:10,strokeOpacity:.9}));
   line=new google.maps.Polyline({map:map.current,path,strokeColor:role==='driver'?'#154f3c':'#5528ef',strokeWeight:5,icons:[{icon:{path:google.maps.SymbolPath.CIRCLE,scale:6,fillColor:'#d7ff3f',fillOpacity:1,strokeColor:'#152b25',strokeWeight:2},offset:'0%'}]});overlays.current.push(line);
   const animate=t=>{if(stopped)return;const icons=line.get('icons');icons[0].offset=`${(t%6000)/60}%`;icons[0].icon.scale=5+Math.sin(t/200)*1.5;line.set('icons',icons);frame=requestAnimationFrame(animate)};
   const motion=()=>{cancelAnimationFrame(frame);if(!reduced.matches)frame=requestAnimationFrame(animate)};motion();reduced.addEventListener('change',motion);line.removeMotion=()=>reduced.removeEventListener('change',motion);
  }
  map.current.fitBounds(bounds,60);
  return()=>{stopped=true;cancelAnimationFrame(frame);line?.removeMotion?.();overlays.current.forEach(x=>x.setMap(null));overlays.current=[]};
 },[ready,quote?.polyline,JSON.stringify(quote?.origin),JSON.stringify(quote?.destination),role]);
 useEffect(()=>{driver.current?.setMap(null);if(ready&&driverLocation)driver.current=new google.maps.Marker({map:map.current,position:{lat:driverLocation.lat,lng:driverLocation.lng},icon:markerIcon('driver'),title:'Assigned driver · latest GPS update'});},[ready,driverLocation?.lat,driverLocation?.lng]);
 return <section>{error&&<Alert type="warning" message={error} showIcon/>}{!currentLocation&&!quote&&<p className="muted">Allow location access or search an address to center your map.</p>}<div ref={host} className={error?"map map-unavailable":"map"}/>{ready&&<p><Switch checked={trafficOn} onChange={setTrafficOn} size="small"/> Show live traffic <small> · Coverage varies by location</small></p>}</section>;
}
export function TripMap({ride,request,role}){
 const [route,setRoute]=useState(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function refresh(){setBusy(true);try{const result=await request(`/rides/${ride.id}/route`);setRoute(result);setError('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{refresh();const timer=setInterval(refresh,60000);return()=>clearInterval(timer)},[ride.id,ride.driver_status]);
 const display=route||ride.quote;
 return <><LiveMap quote={display} driverLocation={ride.driver_location} role={role}/><div className="route-legend"><span>● Pickup</span><span className="route-track"/><span>⚑ Destination</span></div><small className="muted">Moving light shows route direction, not vehicle position.</small>{error&&<Alert message={error} type="warning"/>}{route&&<p>{route.leg==='pickup'?'Driver to pickup':'Trip to destination'} · {route.km.toFixed(1)} km · estimated {Math.ceil(route.minutes)} min · {Math.ceil(route.traffic_delay_minutes)} min traffic delay<br/>Estimated arrival {new Date(route.arrival_at*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · updated {new Date(route.calculated_at*1000).toLocaleTimeString()}<br/><small>Estimates change with traffic. Your confirmed fare stays unchanged.</small></p>}<Button loading={busy} onClick={refresh}>Refresh ETA</Button></>;
}

export function useCurrentLocation(){
 const [location,setLocation]=useState(null);const [error,setError]=useState('');
 useEffect(()=>{if(!navigator.geolocation){setError('This browser does not support location. Search for your pickup instead.');return;}
 const id=navigator.geolocation.watchPosition(p=>{setLocation({lat:p.coords.latitude,lng:p.coords.longitude});setError('')},()=>setError('Location unavailable. Allow location access or search for an address.'),{enableHighAccuracy:true,timeout:15000,maximumAge:15000});
 return()=>navigator.geolocation.clearWatch(id)},[]);
 return {location,error};
}
export function ZonePicker({value,onChange,radius}){
 const {location,error}=useCurrentLocation();const [address,setAddress]=useState('');
 const parsed=value?.split(',').map(Number);const center=parsed?.length===2&&parsed.every(Number.isFinite)?{lat:parsed[0],lng:parsed[1]}:location;
 return <div><AddressSearch label="Search surge area" onChange={(v,label)=>{onChange(v);setAddress(label)}}/><p>{address||'Search an area or click its center on the map.'}</p>{error&&!value&&<small>{error}</small>}<LiveMap currentLocation={center} onPick={v=>{onChange(v);setAddress('Selected map location')}} radius={radius}/>{value&&<small>Zone center selected · adjust radius below</small>}</div>;
}
