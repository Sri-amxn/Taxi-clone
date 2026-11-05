import React from 'react';
import {Descriptions,Tag} from 'antd';
export const coordinateText=value=>Array.isArray(value)&&value.length===2?value.map(n=>Number(n).toFixed(6)).join(', '):'Not recorded';
const amount=n=>Number.isFinite(n)?`₹${n.toFixed(2)}`:'Not recorded';
const date=n=>n?new Date(n*1000).toLocaleString():'Not recorded';
export function TripDetails({ride}){const q=ride.quote;return <div className="trip-details"><Descriptions title="Journey details" size="small" column={{xs:1,sm:2,md:2}} items={[
 {key:'pickup',label:'Pickup',children:<>{q.origin_label||'Saved pickup coordinates'}<br/><small>{coordinateText(q.origin)}</small></>},
 {key:'dropoff',label:'Destination',children:<>{q.destination_label||'Saved destination coordinates'}<br/><small>{coordinateText(q.destination)}</small></>},
 {key:'driver',label:'Driver',children:ride.driver_name||'Not assigned'},
 {key:'rider',label:'Rider',children:ride.rider_name||'Not recorded'},
 {key:'booked',label:'Requested',children:date(ride.requested_at)},
 {key:'completed',label:'Completed',children:date(q.completed_at)},
 {key:'distance',label:'Quoted road distance',children:Number.isFinite(q.km)?`${q.km.toFixed(2)} km`:'Not recorded'},
 {key:'duration',label:'Quoted travel time',children:Number.isFinite(q.minutes)?`${Math.ceil(q.minutes)} min (estimate)`:'Not recorded'},
 {key:'traffic',label:'Quoted traffic delay',children:q.demo?'Demo — no live traffic':Number.isFinite(q.baseline)?`${Math.max(0,Math.ceil(q.minutes-q.baseline))} min above baseline`:'Not recorded'},
 {key:'source',label:'Route source',children:<Tag>{q.demo?'Demo estimate':'Google Routes estimate'}</Tag>},
 ]}/><Descriptions title="Fare breakdown at booking" size="small" column={{xs:1,sm:2}} items={[
 {key:'base',label:'Base fare',children:amount(q.base)},
 {key:'distance',label:'Distance charge',children:amount(q.distance_amount)},
 {key:'time',label:'Time charge',children:amount(q.duration_amount)},
 {key:'multiplier',label:'Surge multiplier',children:`${q.multiplier??1}×`},
 {key:'reason',label:'Surge reason',children:q.multiplier>1?q.reasons?.join(', ')||'Configured surge':'Standard pricing'},
 {key:'minimum',label:'Minimum fare',children:amount(q.minimum_fare)},
 {key:'total',label:'Confirmed total',children:<strong>{amount(q.total)}</strong>},
 {key:'quoted',label:'Quote calculated',children:date(q.quoted_at)},
 ]}/>{ride.settlement&&<p>Recorded allocation: driver {ride.settlement.driver_pct}% ({amount(ride.settlement.driver_amount)}) · company {ride.settlement.company_pct}% ({amount(ride.settlement.company_amount)}).</p>}<p className="muted">Distance and duration are the saved booking estimates, not measured trip mileage or actual travel time. Older trips may only have coordinates.</p></div>}
