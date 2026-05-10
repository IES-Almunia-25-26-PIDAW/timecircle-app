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
  const [hoveredService, setHoveredService] = useState<any | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const navigate = useNavigate();

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

    const clearHideTimer = () => {
      if (cardHideTimeoutRef.current) {
        clearTimeout(cardHideTimeoutRef.current);
        cardHideTimeoutRef.current = null;
      }
    };

    const hideCard = (immediate = false) => {
      clearHideTimer();
      const clearCard = () => {
        hoveredFeatureIdRef.current = null;
        setHoveredFeatureId(null);
        setHoveredService(null);
      };

      if (immediate) {
        clearCard();
        return;
      }

      cardHideTimeoutRef.current = window.setTimeout(() => {
        clearCard();
        cardHideTimeoutRef.current = null;
      }, 80);
    };

    const showCard = (svc: any) => {
      if (!svc) return;
      clearHideTimer();
      const svcId = String(svc.id ?? '');
      if (hoveredFeatureIdRef.current === svcId) return;
      hoveredFeatureIdRef.current = svcId;
      setHoveredFeatureId(svcId);
      setHoveredService(svc);
    };

    const onPointerMove = (evt: any) => {
      if (!mapRef.current) return;
      const feature = mapRef.current.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
      if (feature) {
        const svc = feature.get('service');
        showCard(svc);
        map.getTargetElement().style.cursor = 'pointer';
      } else {
        map.getTargetElement().style.cursor = '';
        hideCard();
      }
    };

    const onClick = (evt: any) => {
      if (!mapRef.current) return;
      const feature = mapRef.current.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
      const svc = feature?.get('service');
      if (svc?.id) {
        navigate(`/services/${svc.id}`);
        return;
      }
      hideCard(true);
    };

    const onMouseLeave = () => {
      map.getTargetElement().style.cursor = '';
      hideCard(true);
    };

    map.on('pointermove', onPointerMove);
    map.on('singleclick', onClick);
    mapEl.addEventListener('mouseleave', onMouseLeave);

    // Expose a few handles for quick console debug.
    try {
      (window as any).__tc_map = map;
      (window as any).__tc_vector = vectorSource;
    } catch (e) { /* ignore in non-browser envs */ }

    return () => {
      try {
        map.un('pointermove', onPointerMove);
        map.un('singleclick', onClick);
        mapEl.removeEventListener('mouseleave', onMouseLeave);
        clearHideTimer();
        map.setTarget(undefined);
      } catch (e) { /* ignore */ }
      mapRef.current = null;
      vectorRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    if (!vectorRef.current) return;
    const source = vectorRef.current as any;
    source.clear();
    services.forEach((s) => {
      const lat = s?.user?.latitude;
      const lon = s?.user?.longitude;
      if (lat == null || lon == null) return;
      const coord = fromLonLat([Number(lon), Number(lat)]);
      const marker = new Feature(new Point(coord));
      marker.set('service', s);
      marker.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: '#38bdf8' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }));
      source.addFeature(marker);
    });
  }, [services]);

  useEffect(() => {
    if (mapRef.current) {
      try { mapRef.current.getView().animate({ center: fromLonLat([center.lon, center.lat]) }); } catch (e) { /* ignore */ }
    }
  }, [center]);

  const serviceTitle = hoveredService?.title || '';
  const userName = hoveredService?.user?.name || hoveredService?.user?.username || '';
  const category = hoveredService?.category?.name || '';
  const credits = hoveredService?.credits ?? '';
  const distance = hoveredService?.distance_km ? `${hoveredService.distance_km} km` : '';
  const avatar = hoveredService?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || 'user')}&backgroundColor=b6e3f4`;
  const rating = hoveredService?.user?.rating ? parseFloat(hoveredService.user.rating).toFixed(1) : '';

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
      <div ref={elRef} style={{ width: '100%', height }} />
      {hoveredService && (
        <div
          className="pointer-events-none absolute left-3 bottom-3 z-10 w-[min(260px,calc(100%-24px))] rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-sm transition-all duration-100"
          data-service-id={hoveredFeatureId ?? undefined}
        >
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
        </div>
      )}
    </div>
  );
};

export default NearbyServicesMap;
