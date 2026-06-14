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
import CircleGeom from 'ol/geom/Circle';
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
  shareExactLocation?: boolean;
}

const ProfileMap: React.FC<ProfileMapProps> = ({ lat, lon, zoom = 13, height = 320, shareExactLocation = true }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const vectorRef = useRef<any>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const center = fromLonLat([Number(lon), Number(lat)]);

    const view = new View({ center, zoom });
    const tile = new TileLayer({ source: new OSM() });

    // Initial empty vector source; features will be managed by separate effect
    const vectorSource = new VectorSource({ features: [] });
    const vectorLayer = new VectorLayer({ source: vectorSource });
    vectorRef.current = vectorSource;

    const map = new Map({ target: elRef.current, layers: [tile, vectorLayer], view, controls: [] });
    mapRef.current = map;

    return () => {
      try { map.setTarget(); } catch (e) { console.debug('ProfileMap: cleanup failed', e); }
      mapRef.current = null;
      vectorRef.current = null;
    };
  }, []);

  // Update features (marker or privacy circle) when coords or privacy toggle change
  useEffect(() => {
    if (!vectorRef.current) return;
    const source = vectorRef.current;
    source.clear();

    const center = fromLonLat([Number(lon), Number(lat)]);

    if (shareExactLocation) {
      const marker = new Feature(new Point(center));
      marker.setStyle(new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#38bdf8' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }));
      source.addFeature(marker);
    } else {
      const radiusInMeters = 500;
      const radiusInProjectedUnits = radiusInMeters * Math.cos(lat * Math.PI / 180);
      const circleGeom = new CircleGeom(center, radiusInProjectedUnits);
      const circleFeature = new Feature(circleGeom);
      circleFeature.setStyle(new Style({
        fill: new Fill({ color: 'rgba(107, 114, 128, 0.1)' }),
        stroke: new Stroke({ color: '#6b7280', width: 2, lineDash: [5, 5] }),
      }));
      source.addFeature(circleFeature);
    }
  }, [lat, lon, shareExactLocation]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getView().animate({ center: fromLonLat([Number(lon), Number(lat)]), zoom });
    }
  }, [lat, lon, zoom]);

  return <div ref={elRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />;
};

export default ProfileMap;
