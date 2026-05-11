import React from 'react';
import {
  View, Text, StyleSheet,
  SafeAreaView, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apartmentsApi } from '../services/api';
import { C, Dark } from '../theme';
import { resolveMapCoords } from '../constants/cityCenters';

// TAMA 38 resource IDs from data.gov.il (urban renewal zones)
const TAMA38_URL =
  'https://data.gov.il/api/3/action/datastore_search' +
  '?resource_id=be5b7935-3922-4f71-8c2a-e83b8e2a22e6&limit=500';

export interface AptMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: number;
  rooms: number;
  city: string;
  /** משכיר/מודעה במנוי פרימיום — מסומן בולט ומעל שאר הסיכות */
  promoted: boolean;
  /** נקודה לפי מרכז עיר (אין lat/lng במסד) */
  approxLocation: boolean;
}

function jsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case '<':      return '\\u003c';
      case '>':      return '\\u003e';
      case '&':      return '\\u0026';
      case '\u2028': return '\\u2028';
      case '\u2029': return '\\u2029';
      default:       return char;
    }
  });
}

/** Leaflet + OpenStreetMap — free; street labels follow local languages outside Israel. */
export function buildHtml(markers: AptMarker[], tama38Url: string): string {
  const markersJson = jsonForInlineScript(markers);
  const tama38UrlJson = jsonForInlineScript(tama38Url);
  return `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${C.navy}; }
    .apt-popup { font-family: sans-serif; text-align: right; direction: rtl; min-width: 140px; }
    .apt-popup .price { color: ${C.cyan}; font-weight: 700; font-size: 15px; }
    .apt-popup .meta  { color: ${C.textMut}; font-size: 12px; margin-top: 2px; }
    .apt-popup .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .apt-popup .badge { display: inline-block; background: ${C.gold}; color: ${C.navy}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-bottom: 4px; }
    .apt-popup .approx { color: ${C.gold}; font-size: 11px; margin-top: 4px; }
    .tama-layer { fill: ${C.statusTone.caution}; fill-opacity: 0.18; stroke: ${C.statusTone.caution}; stroke-width: 1.5; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var markers = ${markersJson};
  var tama38Url = ${tama38UrlJson};
  var tamaLayer = null;

  var defaultLat = markers.length ? markers[0].lat : 32.08;
  var defaultLng = markers.length ? markers[0].lng : 34.78;

  var map = L.map('map', { zoomControl: true }).setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function makeIcon(apt) {
    var price = apt.price;
    var promoted = !!apt.promoted;
    var label = '₪' + (price >= 1000 ? Math.round(price/1000) + 'K' : price);
    var w = promoted ? 78 : 64;
    var h = promoted ? 32 : 24;
    var fill = promoted ? '${C.gold}' : '${C.cyan}';
    var stroke = promoted ? '${C.onInverse.primary}' : 'none';
    var sw = promoted ? 2.5 : 0;
    var fs = promoted ? 12 : 11;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + (h + 4) + '">'
      + (promoted ? '<filter id="glow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${C.gold}" flood-opacity="0.7"/></filter>' : '')
      + '<rect rx="9" ry="9" x="' + (sw/2) + '" y="' + (sw/2) + '" width="' + (w - sw) + '" height="' + h + '" fill="' + fill + '"'
      + (stroke !== 'none' ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '')
      + (promoted ? ' filter="url(#glow)"' : '') + '/>'
      + '<text x="' + (w/2) + '" y="' + (h/2 + 5) + '" font-size="' + fs + '" font-family="sans-serif" font-weight="800" '
      + 'fill="${C.navy}" text-anchor="middle">' + label + '</text></svg>';
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [w, h + 4],
      iconAnchor: [w/2, h + 4],
      popupAnchor: [0, -(h + 6)],
    });
  }

  var markerGroup = L.featureGroup().addTo(map);

  markers.forEach(function(apt) {
    if (apt.lat == null || apt.lng == null || isNaN(apt.lat) || isNaN(apt.lng)) return;
    var pr = !!apt.promoted;
    var m = L.marker([apt.lat, apt.lng], {
      icon: makeIcon(apt),
      zIndexOffset: pr ? 800 : 0,
    });
    var badge = pr ? '<div class="badge">מודעה בולטת</div>' : '';
    var approx = apt.approxLocation
      ? '<div class="approx">מיקום משוער לפי עיר</div>' : '';
    m.bindPopup(
      '<div class="apt-popup">'
      + badge
      + '<div class="title">' + escapeHtml(apt.title) + '</div>'
      + '<div class="price">₪' + Number(apt.price).toLocaleString() + '/חודש</div>'
      + '<div class="meta">' + escapeHtml(apt.rooms) + ' חדרים · ' + escapeHtml(apt.city) + '</div>'
      + approx
      + '</div>'
    );
    markerGroup.addLayer(m);
  });

  if (markerGroup.getLayers().length > 0) {
    map.fitBounds(markerGroup.getBounds().pad(0.15));
  }

  function postToHost(obj) {
    var s = JSON.stringify(obj);
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(s);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(s, '*');
      }
    } catch (e) {}
  }

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
            postToHost({ type: 'tama_empty' });
            return;
          }
          tamaLayer = L.geoJSON({ type:'FeatureCollection', features: features }, {
            style: function(){ return { className: 'tama-layer' }; },
            onEachFeature: function(feature, layer){
              var p = feature.properties || {};
              layer.bindPopup('<b>TAMA 38</b><br/>' + escapeHtml(p.address || p.street || ''));
            }
          }).addTo(map);
          postToHost({ type: 'tama_loaded', count: features.length });
        })
        .catch(function(){
          postToHost({ type: 'tama_error' });
        });
    } else if (!show && tamaLayer) {
      map.removeLayer(tamaLayer);
      tamaLayer = null;
    }
  };
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const webRef = React.useRef<WebView>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [tamaOn, setTamaOn] = React.useState(false);
  const [tamaStatus, setTamaStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>('idle');

  const { data: feedData, isPending: feedLoading } = useQuery({
    queryKey: ['apartments-feed-map'],
    queryFn: () => apartmentsApi.getFeed({ limit: 120 }).then((r) => r.data),
  });

  const markers: AptMarker[] = React.useMemo(() => {
    const list = feedData?.apartments ?? [];
    const mapped = list.map((a: any) => {
      const coords = resolveMapCoords(a.id, a.city, a.latitude, a.longitude);
      const promoted = !!(a.landlord?.isPremium === true);
      return {
        id: a.id,
        lat: coords.lat,
        lng: coords.lng,
        title: a.title,
        price: Number(a.price),
        rooms: Number(a.rooms),
        city: a.city ?? '',
        promoted,
        approxLocation: coords.approx,
      } satisfies AptMarker;
    });
    /** סיכות רגילות ראשונות, בולטות (פרימיום) מעל הכול */
    mapped.sort((x: AptMarker, y: AptMarker) => {
      if (x.promoted === y.promoted) return 0;
      return x.promoted ? 1 : -1;
    });
    return mapped;
  }, [feedData]);

  const html = React.useMemo(() => buildHtml(markers, TAMA38_URL), [markers]);

  function handleTamaToggle(value: boolean) {
    setTamaOn(value);
    if (value) setTamaStatus('loading');
    else setTamaStatus('idle');
    if (Platform.OS === 'web') {
      const w = iframeRef.current?.contentWindow as { toggleTama38?: (v: boolean) => void } | null;
      w?.toggleTama38?.(value);
    } else {
      webRef.current?.injectJavaScript(`window.toggleTama38(${value}); true;`);
    }
  }

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMsg = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('tama_')) return;
      } catch {
        return;
      }
      handleMessage({ nativeEvent: { data: event.data } });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function handleMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tama_loaded') setTamaStatus('loaded');
      else if (msg.type === 'tama_empty') setTamaStatus('empty');
      else if (msg.type === 'tama_error') setTamaStatus('error');
    } catch {
      /* ignore malformed WebView message */
    }
  }

  const tamaHint =
    tamaStatus === 'loading' ? 'טוען נתוני תמ"א 38…' :
    tamaStatus === 'loaded'  ? 'שכבת תמ"א 38 פעילה' :
    tamaStatus === 'empty'   ? 'אין נתוני תמ"א 38 באזור' :
    tamaStatus === 'error'   ? 'שגיאה בטעינת תמ"א 38' : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Ionicons name="map-outline" size={18} color={C.onInverse.primary} />
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
            trackColor={{ false: Dark.switchTrackOff, true: C.gold }}
            thumbColor={C.onInverse.primary}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {feedLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.cyan} />
          <Text style={styles.loadingText}>טוען דירות…</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <View style={styles.map}>
          {React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: html,
            title: 'מפת דירות',
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              flex: 1,
              minHeight: 320,
            } as object,
            sandbox:
              'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
          })}
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
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: Dark.border,
  },
  toolbarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarTitle: { color: C.onInverse.primary, fontSize: 16, fontWeight: '700' },
  countBadge:   { backgroundColor: C.cyan, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countText:    { color: C.navy, fontSize: 11, fontWeight: '700' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tamaLabel:    { color: C.gold, fontSize: 12, fontWeight: '700' },
  tamaHint:     { color: C.textMut, fontSize: 10, maxWidth: 100, textAlign: 'right' },
  map:          { flex: 1 },
  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText:  { color: C.textMut, fontSize: 14 },
});
