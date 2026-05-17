import React, { useEffect, useRef } from 'react';
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

interface ProfileMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  height?: number | string;
}

const ProfileMap: React.FC<ProfileMapProps> = ({ lat, lon, zoom = 13, height = 320 }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const center = fromLonLat([Number(lon), Number(lat)]);

    const view = new View({ center, zoom });
    const tile = new TileLayer({ source: new OSM() });

    const marker = new Feature(new Point(center));
    marker.setStyle(new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#38bdf8' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    }));

    const vectorSource = new VectorSource({ features: [marker] });
    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({ target: elRef.current, layers: [tile, vectorLayer], view, controls: [] });
    mapRef.current = map;

    return () => {
      try { map.setTarget(); } catch (e) { console.debug('ProfileMap: cleanup failed', e); }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getView().animate({ center: fromLonLat([Number(lon), Number(lat)]), zoom });
    }
  }, [lat, lon, zoom]);

  return <div ref={elRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />;
};

export default ProfileMap;
