import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Listing } from "@/lib/types";
import { getCityCenter, getListingCoords } from "@/lib/coords";
import { formatWon } from "@/lib/format";

type LeafletModule = typeof import("leaflet")["default"];
type LeafletMapInstance = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;
type LeafletClusterGroup = import("leaflet").MarkerClusterGroup;

interface Props {
  listings: Listing[];
  city?: Listing["city"];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  initialZoom?: number;
}

function pricePinIcon(L: LeafletModule, rent: number, active: boolean) {
  const label = formatWon(rent);
  const bg = active ? "var(--primary)" : "#ffffff";
  const fg = active ? "var(--primary-foreground)" : "var(--foreground)";
  const border = active ? "var(--primary)" : "var(--border)";
  return L.divIcon({
    className: "ger-price-pin",
    html: `<div style="
      background:${bg};color:${fg};border:1.5px solid ${border};
      padding:4px 9px;border-radius:9999px;font-size:12px;font-weight:700;
      box-shadow:0 2px 6px rgba(0,0,0,0.15);white-space:nowrap;
      transform:translate(-50%,-100%);position:absolute;left:0;top:0;
    ">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function LeafletMap({ listings, city, selectedId, onSelect, className, initialZoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const clusterRef = useRef<LeafletClusterGroup | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const leafletRef = useRef<LeafletModule | null>(null);
  const onSelectRef = useRef(onSelect);
  const cityRef = useRef(city);
  const zoomRef = useRef(initialZoom);
  const [ready, setReady] = useState(false);
  onSelectRef.current = onSelect;
  cityRef.current = city;
  zoomRef.current = initialZoom;

  // Init map once
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current || typeof window === "undefined") return;

      const { default: L } = await import("leaflet");
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: getCityCenter(cityRef.current),
        zoom: zoomRef.current ?? 12,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 50,
      });
      map.addLayer(cluster);
      mapRef.current = map;
      clusterRef.current = cluster;
      setReady(true);
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
      leafletRef.current = null;
      markersRef.current.clear();
      setReady(false);
    };
  }, []);

  // Re-center on city change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setView(getCityCenter(city), initialZoom ?? 12, { animate: true });
  }, [city, initialZoom, ready]);

  // Sync markers with listings
  useEffect(() => {
    const cluster = clusterRef.current;
    const L = leafletRef.current;
    if (!ready || !cluster || !L) return;
    cluster.clearLayers();
    markersRef.current.clear();

    listings.forEach((l) => {
      const coords = getListingCoords(l);
      const marker = L.marker(coords, {
        icon: pricePinIcon(L, l.monthlyRent, l.id === selectedId),
      });
      marker.on("click", () => onSelectRef.current(l.id));
      markersRef.current.set(l.id, marker);
      cluster.addLayer(marker);
    });
  }, [listings, selectedId, ready]);

  return (
    <div
      ref={containerRef}
      className={
        className ?? "h-[60vh] min-h-[360px] w-full overflow-hidden rounded-2xl border bg-muted z-0"
      }
    />
  );
}
