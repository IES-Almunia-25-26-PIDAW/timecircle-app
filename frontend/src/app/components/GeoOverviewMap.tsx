import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { fromLonLat } from 'ol/proj';
import CircleGeom from 'ol/geom/Circle';
import { Style, Fill, Stroke } from 'ol/style';

interface Cell { lat: number; lon: number; count?: number }

interface Props {
  center?: { lat: number; lon: number };
  zoom?: number;
  userCells?: Cell[];
  serviceCells?: Cell[];
  height?: number | string;
}

const GeoOverviewMap: React.FC<Props> = ({ center = { lat: 40.4168, lon: -3.7038 }, zoom = 6, userCells = [], serviceCells = [], height = 360 }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const vectorRef = useRef<any>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const view = new View({ center: fromLonLat([center.lon, center.lat]), zoom });
    const tile = new TileLayer({ source: new OSM() });

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({ target: elRef.current, layers: [tile, vectorLayer], view, controls: [] });
    mapRef.current = map;
    vectorRef.current = vectorSource;

    return () => {
      try { map.setTarget(); } catch (e) { console.error('Error occurred while clearing map target', e) }
      mapRef.current = null;
      vectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!vectorRef.current) return;
    const source = vectorRef.current;
    source.clear();

    const makeFeature = (cell: Cell, color: string, minRadius = 1000) => {
      const coord = fromLonLat([Number(cell.lon), Number(cell.lat)]);
      const radius = Math.max(minRadius, (cell.count || 1) * 600);
      const f = new Feature({ geometry: new CircleGeom(coord, radius) });
      f.setStyle(new Style({
        fill: new Fill({ color: color === '#10b981' ? 'rgba(16,185,129,0.18)' : 'rgba(56,189,248,0.12)' }),
        stroke: new Stroke({ color, width: 2 }),
      }));
      return f;
    };

    userCells.forEach((c: Cell) => source.addFeature(makeFeature(c, '#10b981', 1200)));
    serviceCells.forEach((c: Cell) => source.addFeature(makeFeature(c, '#38bdf8', 1000)));
  }, [userCells, serviceCells]);

  return <div ref={elRef} style={{ width: '100%', height }} />;
};

export default GeoOverviewMap;
