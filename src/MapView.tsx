import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type {GeoJsonObject} from 'geojson';
import {Compass} from 'lucide-react';
import type {Coverage,Initiative} from './types';
import type {CombinedCoverage} from './coverage';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

const colours:Record<string,string>={fully:'#21725a',strong:'#b07824',unclassified:'#677487'};
type Place={name:string;lat:number;lng:number;population:number;capital:boolean;rank:number;minZoom?:number};
const overview=L.latLngBounds([[49.7,-8.8],[61,2]]);
type Props={rows:Initiative[];coverage:(Coverage|CombinedCoverage)[];selected:Initiative|null;onSelect:(r:Initiative)=>void;searchPoint:{lat:number;lng:number}|null;roads:boolean;labels:boolean};

export function MapView({rows,coverage,selected,onSelect,searchPoint,roads,labels}:Props){
 const el=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),markers=useRef<L.MarkerClusterGroup|null>(null),shapes=useRef<L.LayerGroup|null>(null),labelsLayer=useRef<L.LayerGroup|null>(null),home=useRef<L.Layer|null>(null);
 const markerById=useRef(new Map<string,L.Marker>()),selectedId=useRef<string|undefined>(undefined);selectedId.current=selected?.id;
 const [places,setPlaces]=useState<Place[]>([]),[tileError,setTileError]=useState(false);
 useEffect(()=>{
  const m=L.map(el.current!,{maxZoom:18,zoomControl:false,attributionControl:true,zoomAnimation:!matchMedia('(prefers-reduced-motion: reduce)').matches});map.current=m;
  m.fitBounds(overview,{padding:[30,25]});
  m.createPane('referenceLabels');m.getPane('referenceLabels')!.style.zIndex='450';m.getPane('referenceLabels')!.style.pointerEvents='none';
  L.control.zoom({position:'bottomright'}).addTo(m);
  labelsLayer.current=L.layerGroup().addTo(m);shapes.current=L.layerGroup().addTo(m);
  markers.current=L.markerClusterGroup({maxClusterRadius:42,showCoverageOnHover:false,spiderfyOnMaxZoom:true,spiderfyDistanceMultiplier:1.7,animate:false,removeOutsideVisibleBounds:true,iconCreateFunction:cluster=>{
   const count=cluster.getChildCount();cluster.options.title=`${count} initiatives. Zoom in to explore.`;
   return L.divIcon({className:'initiative-cluster',html:`<span aria-hidden="true">${count}</span><span class="sr-only">${count} initiatives. Zoom in to explore.</span>`,iconSize:[40,40]});
  }}).addTo(m);
  m.on('movestart',()=>markers.current?.eachLayer(layer=>{if('closeTooltip' in layer)(layer as L.Marker).closeTooltip();}));
  let alive=true;
  fetch('/api/basemap').then(r=>r.json()).then(data=>{if(alive){L.geoJSON(data,{style:{color:'#b5c7be',weight:1,fillColor:'#f5f5eb',fillOpacity:1},interactive:false}).addTo(m).bringToBack();m.attributionControl.addAttribution('Natural Earth');}}).catch(()=>{});
  fetch('/api/places').then(r=>r.json()).then(data=>{if(alive)setPlaces(data.places||[]);}).catch(()=>{});
  const resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(el.current!);
  return()=>{alive=false;resize.disconnect();m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current;if(!m||!roads)return;
  setTileError(false);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:18}).addTo(m);
  tiles.on('tileerror',()=>setTileError(true));return()=>{tiles.remove();};
 },[roads]);
 useEffect(()=>{
  const m=map.current;if(!m)return;
  function draw(){
   labelsLayer.current?.clearLayers();if(!labels||roads&&!tileError)return;
   const zoom=m!.getZoom(),size=m!.getSize(),rect=m!.getContainer().getBoundingClientRect();
   const occupied:{x:number;y:number;w:number;h:number}[]=Array.from(m!.getContainer().querySelectorAll('.initiative-cluster,.initiative-pin')).map(icon=>{const b=icon.getBoundingClientRect();return {x:b.x-rect.x,y:b.y-rect.y,w:b.width,h:b.height};});
   for(const place of places){
    if(place.minZoom&&zoom<place.minZoom)continue;
    if(!place.minZoom&&zoom<6&&!place.capital&&place.population<15000)continue;
    const p=m!.latLngToContainerPoint([place.lat,place.lng]);
    if(p.x<12||p.y<20||p.x>size.x-18||p.y>size.y-12)continue;
    const width=Math.min(180,place.name.length*7.5+12),height=20;
    let box:{x:number;y:number;w:number;h:number}|undefined;
    for(const [dx,dy] of [[10,-10],[-width-10,-10],[28,-30],[-width-28,-30],[28,15],[-width-28,15],[10,-45],[-width-10,-45],[10,35],[-width-10,35],[45,-10],[-width-45,-10],[10,55],[-width-10,55]]){
     const candidate={x:p.x+dx,y:p.y+dy,w:width,h:height};
     if(candidate.x<5||candidate.y<5||candidate.x+width>size.x-5||candidate.y+height>size.y-5)continue;
     if(!occupied.some(b=>candidate.x<b.x+b.w+6&&candidate.x+width+6>b.x&&candidate.y<b.y+b.h+3&&candidate.y+height+3>b.y)){box=candidate;break;}
    }
    if(!box)continue;occupied.push(box);
    const text=document.createElement('span');text.textContent=place.name;
    const edgeX=Math.max(box.x,Math.min(p.x,box.x+width)),edgeY=Math.max(box.y,Math.min(p.y,box.y+height));
    if(Math.hypot(edgeX-p.x,edgeY-p.y)>18)L.polyline([[place.lat,place.lng],m!.containerPointToLatLng([edgeX,edgeY])],{pane:'referenceLabels',color:'#71877b',weight:1,opacity:.5,interactive:false}).addTo(labelsLayer.current!);
    L.marker([place.lat,place.lng],{pane:'referenceLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'place-label',html:text,iconSize:[width,height],iconAnchor:[p.x-box.x,p.y-box.y]})}).addTo(labelsLayer.current!);
   }
  }
  let frame=0;const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
  schedule();m.on('zoomend moveend resize',schedule);markers.current?.on('spiderfied unspiderfied animationend',schedule);
  return()=>{cancelAnimationFrame(frame);m.off('zoomend moveend resize',schedule);markers.current?.off('spiderfied unspiderfied animationend',schedule);};
 },[places,labels,roads,tileError,rows]);
 useEffect(()=>{
  const group=markers.current;if(!group)return;markerById.current.clear();group.clearLayers();
  for(const row of rows){
   if(!row.location)continue;
   const title=`${row.name} · ${row.postcode}${row.location.precision!=='postcode'?' · approximate location':''}`;
   const dot=document.createElement('span');dot.className=`pin-dot ${row.location.precision==='postcode'?'precise':'approximate'}`;dot.style.setProperty('--pin-color',colours[row.ethos]);
   const marker=L.marker([row.location.lat,row.location.lng],{title,keyboard:true,icon:L.divIcon({className:'initiative-pin',html:dot,iconSize:[28,28],iconAnchor:[14,14]})});
   const tooltip=document.createElement('span');tooltip.textContent=title;marker.bindTooltip(tooltip,{direction:'top',offset:[0,-9]});
   marker.on('add',()=>{const icon=marker.getElement();icon?.setAttribute('aria-label',title);icon?.querySelector('.pin-dot')?.classList.toggle('is-selected',selectedId.current===row.id);});
   marker.on('click',()=>onSelect(row));markerById.current.set(row.id,marker);group.addLayer(marker);
  }
 },[rows,onSelect]);
 useEffect(()=>{for(const [id,marker] of markerById.current)marker.getElement()?.querySelector('.pin-dot')?.classList.toggle('is-selected',id===selected?.id);},[selected,rows]);
 useEffect(()=>{
  shapes.current?.clearLayers();
  for(const feature of coverage)L.geoJSON(feature as GeoJsonObject,{style:{color:'#278469',weight:1.3,fillColor:'#66b390',fillOpacity:.22},interactive:false}).addTo(shapes.current!);
 },[coverage]);
 useEffect(()=>{if(selected?.location)map.current?.setView([selected.location.lat,selected.location.lng],Math.max(10,map.current.getZoom()),{animate:false});},[selected]);
 useEffect(()=>{
  home.current?.remove();if(searchPoint&&map.current){home.current=L.circleMarker([searchPoint.lat,searchPoint.lng],{radius:9,color:'#fff',fillColor:'#304e91',fillOpacity:1,weight:3}).addTo(map.current);map.current.setView([searchPoint.lat,searchPoint.lng],10);}
 },[searchPoint]);
 return <><div ref={el} className="map-canvas" aria-label="Map of Christian education initiatives"/><button className="map-reset" aria-label="UK overview" onClick={()=>map.current?.fitBounds(overview,{padding:[30,25],animate:false})} title="Show the UK"><Compass size={18}/><span>UK overview</span></button>{tileError&&roads&&<div className="tile-note">Street tiles unavailable. Offline labels and country outlines remain available.</div>}</>;
}
