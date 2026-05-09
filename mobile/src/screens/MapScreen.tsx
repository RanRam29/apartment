import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Switch,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apartmentsApi } from '../services/api';

// TAMA 38 resource IDs from data.gov.il (urban renewal zones)
const TAMA38_URL =
  'https://data.gov.il/api/3/action/datastore_search' +
  '?resource_id=be5b7935-3922-4f71-8c2a-e83b8e2a22e6&limit=500';

interface AptMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: number;
  rooms: number;
  city: string;
}

function jsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&  ]/g, (char) => {
    switch (char) {
      case '<': return '\\u003c';
      case '>': return '\\u003e';
      case '&': return '\\u0026';
      case ' ': return '\\u2028';
      case ' ': return '\\u2029';
      default: return char;
    }
  });
}

export function buildHtml(markers: AptMarker[], tama38Url: string): string {
  const markersJson = jsonForInlineScript(markers);
  const tama38UrlJson = jsonForInlineScript(tama38Url);
  return `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #1A1A2E; }
    .apt-popup { font-family: sans-serif; text-align: right; direction: rtl; min-width: 140px; }
    .apt-popup .price { color: #6C5CE7; font-weight: 700; font-size: 15px; }
    .apt-popup .meta  { color: #555; font-size: 12px; margin-top: 2px; }
    .apt-popup .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .tama-layer { fill: #F39C12; fill-opacity: 0.18; stroke: #F39C12; stroke-width: 1.5; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var markers = ${markersJson};
  var tama38Url = ${tama38UrlJson};
  var tamaLayer = null;
  var tamaVisible = false;

  // Default centre — Tel Aviv
  var defaultLat = markers.length ? markers[0].lat : 32.08;
  var defaultLng = markers.length ? markers[0].lng : 34.78;

  var map = L.map('map', { zoomControl: true }).setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  // Custom apartment icon
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function makeIcon(price) {
    var label = '₪' + (price >= 1000 ? Math.round(price/1000) + 'K' : price);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="28">'
      + '<rect rx="8" ry="8" width="64" height="24" fill="#6C5CE7"/>'
      + '<text x="32" y="16" font-size="11" font-family="sans-serif" font-weight="700" '
      + 'fill="#fff" text-anchor="middle">' + label + '<\/text><\/svg>';
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [64, 28],
      iconAnchor: [32, 28],
      popupAnchor: [0, -30],
    });
  }

  var markerGroup = L.featureGroup().addTo(map);

  markers.forEach(function(apt) {
    if (!apt.lat || !apt.lng) return;
    var m = L.marker([apt.lat, apt.lng], { icon: makeIcon(apt.price) });
    m.bindPopup(
      '<div class="apt-popup">'
      + '<div class="title">' + escapeHtml(apt.title) + '<\/div>'
      + '<div class="price">₪' + apt.price.toLocaleString() + '/חודש<\/div>'
      + '<div class="meta">' + escapeHtml(apt.rooms) + ' חדרים · ' + escapeHtml(apt.city) + '<\/div>'
      + '<\/div>'
    );
    markerGroup.addLayer(m);
  });

  if (markerGroup.getLayers().length > 0) {
    map.fitBounds(markerGroup.getBounds().pad(0.15));
  }

  // TAMA 38 layer toggle — called from React Native
  window.toggleTama38 = function(show) {
    if (show && !tamaLayer) {
      fetch(tama38Url)
        .then(function(r){ return r.json(); })
        .then(function(data) {
          var records = (data.result && data.result.records) || [];
          var features = records
            .filter(function(r){ return r.geometry; })
            .map(function(r){
              try { return { type:'Feature', geometry: JSON.parse(r.geometry), properties: r }; }
              catch(e){ return null; }
            })
            .filter(Boolean);
          if (!features.length) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'tama_empty'}));
            return;
          }
          tamaLayer = L.geoJSON({ type:'FeatureCollection', features: features }, {
            style: function(){ return { className: 'tama-layer' }; },
            onEachFeature: function(feature, layer){
              var p = feature.properties || {};
              layer.bindPopup('<b>TAMA 38</b><br/>' + escapeHtml(p.address || p.street || ''));
            }
          }).addTo(map);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'tama_loaded', count: features.length}));
        })
        .catch(function(){
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'tama_error'}));
        });
    } else if (!show && tamaLayer) {
      map.removeLayer(tamaLayer);
      tamaLayer = null;
    }
  };
<\/script>
</body>
</html>`;
}

export default function MapScreen() {
  const webRef = React.useRef<WebView>(null);
  const [tamaOn, setTamaOn] = React.useState(false);
  const [tamaStatus, setTamaStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>('idle');

  const { data: feedData, isLoading } = useQuery({
    queryKey: ['apartments-feed-map'],
    queryFn: () => apartmentsApi.getFeed({ limit: 100 }).then((r) => r.data),
  });

  const markers: AptMarker[] = React.useMemo(() => {
    const list = feedData?.apartments ?? [];
    return list
      .filter((a: any) => a.latitude && a.longitude)
      .map((a: any) => ({
        id:    a.id,
        lat:   Number(a.latitude),
        lng:   Number(a.longitude),
        title: a.title,
        price: Number(a.price),
        rooms: Number(a.rooms),
        city:  a.city,
      }));
  }, [feedData]);

  const html = React.useMemo(() => buildHtml(markers, TAMA38_URL), [markers]);

  function handleTamaToggle(value: boolean) {
    setTamaOn(value);
    if (value) setTamaStatus('loading');
    else setTamaStatus('idle');
    webRef.current?.injectJavaScript(`window.toggleTama38(${value}); true;`);
  }

  function handleMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tama_loaded') setTamaStatus('loaded');
      else if (msg.type === 'tama_empty') setTamaStatus('empty');
      else if (msg.type === 'tama_error') setTamaStatus('error');
    } catch {}
  }

  const tamaHint =
    tamaStatus === 'loading' ? 'טוען נתוני תמ"א 38…' :
    tamaStatus === 'loaded'  ? 'שכבת תמ"א 38 פעילה' :
    tamaStatus === 'empty'   ? 'אין נתוני תמ"א 38 באזור' :
    tamaStatus === 'error'   ? 'שגיאה בטעינת תמ"א 38' : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Ionicons name="map-outline" size={18} color="#fff" />
          <Text style={styles.toolbarTitle}>מפת דירות</Text>
          {markers.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{markers.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.toolbarRight}>
          {tamaHint ? <Text style={styles.tamaHint}>{tamaHint}</Text> : null}
          <Text style={styles.tamaLabel}>תמ"א 38</Text>
          <Switch
            value={tamaOn}
            onValueChange={handleTamaToggle}
            trackColor={{ false: '#3A3A5E', true: '#F39C12' }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>טוען דירות…</Text>
        </View>
      ) : (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          // Allow external tile + CDN requests
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#22223A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  toolbarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  countBadge:   { backgroundColor: '#6C5CE7', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tamaLabel:    { color: '#F39C12', fontSize: 12, fontWeight: '700' },
  tamaHint:     { color: '#A0A0B2', fontSize: 10, maxWidth: 100, textAlign: 'right' },
  map:          { flex: 1 },
  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText:  { color: '#A0A0B2', fontSize: 14 },
});
