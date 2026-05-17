import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { useNavigate } from 'react-router';
import { Service } from '../data/mockData';

interface Props {
  services?: any[];
  center?: { lat: number; lon: number };
  zoom?: number;
  height?: number | string;
}

const NearbyServicesMap: React.FC<Props> = ({
  services = [],
  center = { lat: 40.4168, lon: -3.7038 },
  zoom = 12,
  height = 360,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const vectorRef = useRef<any>(null);
  const cardHideTimeoutRef = useRef<any>(null);
  const hoveredFeatureIdRef = useRef<string | null>(null);
  const [hoveredServices, setHoveredServices] = useState<any[] | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(false);
  // note: pinnedRef.current is used for pinned state; avoid duplicate React state

  const clearHideTimer = () => {
    if (cardHideTimeoutRef.current) {
      clearTimeout(cardHideTimeoutRef.current);
      cardHideTimeoutRef.current = null;
    }
  };

  const hideCard = (immediate = false) => {
    // If the card is pinned, ignore non-immediate hide requests so it stays visible
    if (!immediate && pinnedRef.current) return;
    clearHideTimer();
    const clearCard = () => {
      hoveredFeatureIdRef.current = null;
      setHoveredFeatureId(null);
      setHoveredServices(null);
      pinnedRef.current = false;
    };

    if (immediate) {
      clearCard();
      return;
    }

    cardHideTimeoutRef.current = globalThis.setTimeout(() => {
      clearCard();
      cardHideTimeoutRef.current = null;
    }, 80);
  };

  const showCard = (svcs: any[]) => {
    if (!svcs || svcs.length === 0) return;
    clearHideTimer();
    const svcId = svcs.map((s: any) => String(s.id ?? '')).join('|');
    if (hoveredFeatureIdRef.current === svcId) return;
    hoveredFeatureIdRef.current = svcId;
    setHoveredFeatureId(svcId);
    setHoveredServices(svcs);
  };

  useEffect(() => {
    if (!elRef.current) return;
    const mapEl = elRef.current;
    const view = new View({ center: fromLonLat([center.lon, center.lat]), zoom });
    const tile = new TileLayer({ source: new OSM() });

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({ target: elRef.current, layers: [tile, vectorLayer], view, controls: [] });
    mapRef.current = map;
    vectorRef.current = vectorSource;

    

    const onPointerMove = (evt: any) => {
      if (!mapRef.current) return;
      if (pinnedRef.current) return; // when pinned, don't update hover state
      const features: any[] = [];
      mapRef.current.forEachFeatureAtPixel(evt.pixel, (f: any) => { features.push(f); return false; });
      if (features.length > 0) {
        const svcs = features.map(f => f.get('service'));
        showCard(svcs);
        map.getTargetElement().style.cursor = 'pointer';
      } else {
        map.getTargetElement().style.cursor = '';
        hideCard();
      }
    };

    const onClick = (evt: any) => {
      if (!mapRef.current) return;
      const features: any[] = [];
      mapRef.current.forEachFeatureAtPixel(evt.pixel, (f: any) => { features.push(f); return false; });
      const svcs = features.map(f => f.get('service'));
      if (svcs.length === 1 && svcs[0]?.id) {
        // single marker: navigate to service page
        navigate(`/services/${svcs[0].id}`);
        // ensure card is unpinned/hidden
        pinnedRef.current = false;
        hideCard(true);
        return;
      }
      if (svcs.length > 1) {
        // multiple markers: show and pin the card listing
        showCard(svcs);
        pinnedRef.current = true;
        return;
      }
      // clicked empty space -> unpin and hide
      if (pinnedRef.current) {
        pinnedRef.current = false;
      }
      hideCard(true);
    };

    const onMouseLeave = () => {
      map.getTargetElement().style.cursor = '';
      hideCard();
    };

    map.on('pointermove', onPointerMove);
    map.on('singleclick', onClick);
    mapEl.addEventListener('mouseleave', onMouseLeave);

    // Expose a few handles for quick console debug.
    try {
      (globalThis as any).__tc_map = map;
      (globalThis as any).__tc_vector = vectorSource;
    } catch (e) { console.debug('NearbyServicesMap: globalThis handles not available', e); }

    return () => {
      try {
        map.un('pointermove', onPointerMove);
        map.un('singleclick', onClick);
        mapEl.removeEventListener('mouseleave', onMouseLeave);
        clearHideTimer();
        map.setTarget();
      } catch (e) { console.debug('NearbyServicesMap: cleanup failed', e); }
      mapRef.current = null;
      vectorRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    if (!vectorRef.current) return;
    const source = vectorRef.current;
    source.clear();
    services.forEach((s: Service) => {
      const lat = s?.user?.latitude;
      const lon = s?.user?.longitude;
      if (lat == null || lon == null) return;
      const coord = fromLonLat([Number(lon), Number(lat)]);
      const marker = new Feature(new Point(coord));
      marker.set('service', s);
      const isRequest = s?.type === 'request';
      const fillColor = isRequest ? '#8b5cf6' : '#38bdf8';
      marker.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }));
      source.addFeature(marker);
    });
  }, [services]);

  useEffect(() => {
    if (mapRef.current) {
      try { mapRef.current.getView().animate({ center: fromLonLat([center.lon, center.lat]) }); } catch (e) { console.debug('NearbyServicesMap: animate failed', e); }
    }
  }, [center]);

  // Attach interaction handlers to the card DOM node (avoids JSX non-interactive listener warnings)
  useEffect(() => {
    const el = cardRef.current as HTMLElement | null;
    if (!el) return;

    const _onFocus = () => clearHideTimer();
    const _onBlur = () => { if (!pinnedRef.current) hideCard(true); };
    const _onPointerEnter = () => clearHideTimer();
    const _onPointerLeave = () => { if (!pinnedRef.current) hideCard(true); };
    const _onTouchStart = () => clearHideTimer();
    const _onTouchEnd = () => { if (!pinnedRef.current) hideCard(true); };
    const _onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (pinnedRef.current) { pinnedRef.current = false; }
        hideCard(true);
      }
    };

    el.addEventListener('focus', _onFocus);
    el.addEventListener('blur', _onBlur);
    el.addEventListener('pointerenter', _onPointerEnter);
    el.addEventListener('pointerleave', _onPointerLeave);
    el.addEventListener('touchstart', _onTouchStart);
    el.addEventListener('touchend', _onTouchEnd);
    el.addEventListener('keydown', _onKeyDown);

    return () => {
      el.removeEventListener('focus', _onFocus);
      el.removeEventListener('blur', _onBlur);
      el.removeEventListener('pointerenter', _onPointerEnter);
      el.removeEventListener('pointerleave', _onPointerLeave);
      el.removeEventListener('touchstart', _onTouchStart);
      el.removeEventListener('touchend', _onTouchEnd);
      el.removeEventListener('keydown', _onKeyDown);
    };
  }, [cardRef.current]);

  const single = hoveredServices?.length === 1 ? hoveredServices[0] : null;
  const serviceTitle = single?.title || '';
  const userName = single?.user?.name || single?.user?.username || '';
  const category = single?.category?.name || '';
  const credits = single?.credits ?? '';
  const distance = single?.distance_km ? `${single.distance_km} km` : '';
  const avatar = single?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || 'user')}&backgroundColor=b6e3f4`;
  const rating = single?.user?.rating ? Number.parseFloat(single.user.rating).toFixed(1) : '';

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
      <div ref={elRef} style={{ width: '100%', height }} />
      {hoveredServices && hoveredServices.length > 0 && (
        <dialog
          ref={cardRef as any}
          open
          aria-label="Servicios cercanos"
          className="absolute left-3 bottom-3 z-10 w-[min(320px,calc(100%-24px))] rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-sm transition-all duration-100"
          data-service-id={hoveredFeatureId ?? undefined}
        >
          <div className="p-2">
            {hoveredServices.length === 1 ? (
              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  <img src={avatar} className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{serviceTitle}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {category}{category && userName ? ' · ' : ''}{userName}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700 dark:bg-teal-500/15 dark:text-teal-200">
                    {credits} cr
                  </span>
                  {distance && <span className="text-slate-500 dark:text-slate-400">{distance}</span>}
                  {rating && <span className="ml-auto font-medium text-amber-500">★ {rating}</span>}
                </div>
              </div>
            ) : (
              <div className="p-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-white px-2 py-1">{hoveredServices.length} servicios aquí</div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-auto">
                  {hoveredServices.map((s, idx) => {
                    const uName = s?.user?.name || s?.user?.username || '';
                    const av = s?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uName || 'user')}&backgroundColor=b6e3f4`;
                    return (
                      <div key={s.id ?? idx} className="px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <button
                          onClick={() => navigate(`/services/${s.id}`)}
                          className="w-full flex items-center gap-3 text-left text-sm text-slate-900 dark:text-white"
                        >
                          <img src={av} className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" alt="" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{s.title}</div>
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{s.category?.name} · {uName}</div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
};

export default NearbyServicesMap;
