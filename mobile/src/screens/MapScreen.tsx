import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Switch,
  Platform,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apartmentsApi, swipeApi } from '../services/api';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { resolveMapCoords } from '../constants/cityCenters';
import SwipeHouseLogo from '../components/SwipeHouseLogo';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { useColors } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75 > 300 ? 300 : width * 0.75;
const CARD_MARGIN = 8;

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
  promoted: boolean;
  approxLocation: boolean;
  rawApartment: any; // Keep reference to raw data for card rendering
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

// Leaflet HTML injection script supporting active price pins, glows, and clicks
export function buildHtml(markers: AptMarker[], tama38Url: string): string {
  const markersJson = jsonForInlineScript(markers);
  const tama38UrlJson = jsonForInlineScript(tama38Url);
  
  return `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f8f9ff; }
    .apt-popup { font-family: sans-serif; text-align: right; direction: rtl; min-width: 140px; }
    .apt-popup .price { color: #006b5f; font-weight: 700; font-size: 15px; }
    .apt-popup .meta  { color: #74777f; font-size: 12px; margin-top: 2px; }
    .apt-popup .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .apt-popup .badge { display: inline-block; background: #FFD700; color: #00091b; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-bottom: 4px; }
    .apt-popup .approx { color: #FFD700; font-size: 11px; margin-top: 4px; }
    .tama-layer { fill: #f59e0b; fill-opacity: 0.18; stroke: #f59e0b; stroke-width: 1.5; }
    
    /* Price marker bubble styling matching Stitch spec */
    .price-marker-div {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var markers = ${markersJson};
  var tama38Url = ${tama38UrlJson};
  var tamaLayer = null;
  var markerLayersMap = {};

  var defaultLat = markers.length ? markers[0].lat : 32.08;
  var defaultLng = markers.length ? markers[0].lng : 34.78;

  var map = L.map('map', { zoomControl: false }).setView([defaultLat, defaultLng], 13);

  // Top-right zoom controls (Stitch map clean design)
  L.control.zoom({ position: 'topright' }).addTo(map);

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

  // Draw custom SVG price markers (Teal for normal, Deep Navy for active)
  function makeIcon(apt, isActive) {
    var price = apt.price;
    var label = '₪' + (price >= 1000 ? (price/1000).toFixed(1) + 'k' : price);
    var promoted = !!apt.promoted;
    
    var w = isActive ? 80 : (promoted ? 70 : 64);
    var h = isActive ? 34 : (promoted ? 28 : 24);
    
    // Stitch colors: active = deep navy blue (#002045), normal promoted = gold, normal = teal (#006b5f)
    var fill = isActive ? '#002045' : (promoted ? '#FFD700' : '#006b5f');
    var textFill = isActive ? '#ffffff' : (promoted ? '#00091b' : '#ffffff');
    var stroke = isActive ? '#ffffff' : (promoted ? '#00091b' : 'none');
    var sw = isActive ? 3 : (promoted ? 2 : 0);
    
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + (h + 6) + '">'
      + '<filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#002045" flood-opacity="0.25"/></filter>'
      + '<rect rx="' + (h/2) + '" ry="' + (h/2) + '" x="' + (sw/2) + '" y="' + (sw/2) + '" width="' + (w - sw) + '" height="' + h + '" fill="' + fill + '"'
      + (stroke !== 'none' ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '')
      + ' filter="url(#shadow)"'
      + '/>'
      + '<text x="' + (w/2) + '" y="' + (h/2 + 4) + '" font-size="' + (isActive ? 11 : 10) + '" font-family="system-ui, -apple-system, sans-serif" font-weight="800" '
      + 'fill="' + textFill + '" text-anchor="middle">' + label + '</text>'
      // Small pointer tip
      + '<path d="M ' + (w/2 - 5) + ' ' + h + ' L ' + (w/2) + ' ' + (h + 5) + ' L ' + (w/2 + 5) + ' ' + h + ' Z" fill="' + fill + '" />'
      + '</svg>';

    return L.divIcon({
      html: svg,
      className: 'price-marker-div',
      iconSize: [w, h + 6],
      iconAnchor: [w/2, h + 6],
      popupAnchor: [0, -(h + 8)],
    });
  }

  var markerGroup = L.featureGroup().addTo(map);

  markers.forEach(function(apt) {
    if (apt.lat == null || apt.lng == null || isNaN(apt.lat) || isNaN(apt.lng)) return;
    
    var m = L.marker([apt.lat, apt.lng], {
      icon: makeIcon(apt, false),
      zIndexOffset: apt.promoted ? 500 : 0
    });

    var badge = apt.promoted ? '<div class="badge">מודעה מומלצת</div>' : '';
    var approx = apt.approxLocation ? '<div class="approx">מיקום משוער לפי עיר</div>' : '';
    
    m.bindPopup(
      '<div class="apt-popup">'
      + badge
      + '<div class="title">' + escapeHtml(apt.title) + '</div>'
      + '<div class="price">₪' + Number(apt.price).toLocaleString() + '/חודש</div>'
      + '<div class="meta">' + escapeHtml(apt.rooms) + ' חדרים · ' + escapeHtml(apt.city) + '</div>'
      + approx
      + '</div>'
    );

    // Marker click event for Carousel Sync
    m.on('click', function() {
      postToHost({ type: 'marker_click', id: apt.id });
      highlightMarker(apt.id, true);
    });

    markerGroup.addLayer(m);
    markerLayersMap[apt.id] = m;
  });

  if (markerGroup.getLayers().length > 0) {
    map.fitBounds(markerGroup.getBounds().pad(0.15));
  }

  // Highlight selected pin on the map
  function highlightMarker(activeId, animate) {
    Object.keys(markerLayersMap).forEach(function(id) {
      var layer = markerLayersMap[id];
      var apt = markers.find(function(a) { return a.id === id; });
      if (!apt) return;
      
      if (id === activeId) {
        layer.setIcon(makeIcon(apt, true));
        layer.setZIndexOffset(1000);
        layer.openPopup();
        if (animate) {
          map.setView(layer.getLatLng(), 14, { animate: true });
        }
      } else {
        layer.setIcon(makeIcon(apt, false));
        layer.setZIndexOffset(apt.promoted ? 500 : 0);
      }
    });
  }

  // Exposed function called from host
  window.selectMarker = function(id) {
    highlightMarker(id, true);
  };

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
              layer.bindPopup('<b>תמ״א 38</b><br/>' + escapeHtml(p.address || p.street || ''));
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
  const colors = useColors();
  const navigation = useNavigation<any>();
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const carouselRef = useRef<FlatList>(null);
  
  const [tamaOn, setTamaOn] = useState(false);
  const [tamaStatus, setTamaStatus] = useState<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>('idle');
  const [activeAptId, setActiveAptId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const { data: feedData, isPending: feedLoading } = useQuery({
    queryKey: ['apartments-feed-map'],
    queryFn: () => apartmentsApi.getFeed({ limit: 120 }).then((r) => r.data),
  });

  // Format markers matching feedData
  const markers: AptMarker[] = useMemo(() => {
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
        rawApartment: a,
      } satisfies AptMarker;
    });

    mapped.sort((x: AptMarker, y: AptMarker) => {
      if (x.promoted === y.promoted) return 0;
      return x.promoted ? 1 : -1;
    });
    return mapped;
  }, [feedData]);

  // Set first marker active initially
  useEffect(() => {
    if (markers.length > 0 && activeAptId === null) {
      setActiveAptId(markers[0].id);
    }
  }, [markers]);

  const html = useMemo(() => buildHtml(markers, TAMA38_URL), [markers]);

  // Handle map selection triggers
  function handleSelectMarkerOnMap(id: string) {
    if (Platform.OS === 'web') {
      const w = iframeRef.current?.contentWindow as { selectMarker?: (id: string) => void } | null;
      w?.selectMarker?.(id);
    } else {
      webRef.current?.injectJavaScript(`window.selectMarker("${id}"); true;`);
    }
  }

  // Handle Carousel Scroll events to sync markers
  const handleCarouselScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_MARGIN * 2));
    if (index >= 0 && index < markers.length) {
      const activeApt = markers[index];
      if (activeApt && activeApt.id !== activeAptId) {
        setActiveAptId(activeApt.id);
        handleSelectMarkerOnMap(activeApt.id);
      }
    }
  }, [markers, activeAptId]);

  // Geolocation center reset
  const handleResetLocation = () => {
    if (markers.length > 0) {
      const center = markers[0];
      handleSelectMarkerOnMap(center.id);
      const index = markers.findIndex(m => m.id === center.id);
      if (index !== -1 && carouselRef.current) {
        carouselRef.current.scrollToIndex({ index, animated: true });
      }
    }
  };

  const toggleFavorite = async (apartmentId: string) => {
    const isFav = !!favorites[apartmentId];
    try {
      if (!isFav) {
        await swipeApi.record(apartmentId, 'like');
        setFavorites(prev => ({ ...prev, [apartmentId]: true }));
        showAlert('הצלחה', 'הדירה נוספה למועדפים שלך!');
      } else {
        await swipeApi.record(apartmentId, 'dislike');
        setFavorites(prev => ({ ...prev, [apartmentId]: false }));
        showAlert('הצלחה', 'הדירה הוסרה מהמועדפים.');
      }
    } catch {
      setFavorites(prev => ({ ...prev, [apartmentId]: !isFav }));
    }
  };

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

  // Communication events from WebView
  function handleMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tama_loaded') setTamaStatus('loaded');
      else if (msg.type === 'tama_empty') setTamaStatus('empty');
      else if (msg.type === 'tama_error') setTamaStatus('error');
      else if (msg.type === 'marker_click') {
        const id = msg.id;
        setActiveAptId(id);
        const index = markers.findIndex(m => m.id === id);
        if (index !== -1 && carouselRef.current) {
          carouselRef.current.scrollToIndex({ index, animated: true });
        }
      }
    } catch {
      // ignore
    }
  }

  // Listen to message events on web iframe
  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    )
      return;
    const onMsg = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg.type !== 'string') return;
      } catch {
        return;
      }
      handleMessage({ nativeEvent: { data: event.data } });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [markers]);

  const tamaHint =
    tamaStatus === 'loading' ? 'טוען נתוני תמ"א 38…' :
    tamaStatus === 'loaded'  ? 'שכבת תמ"א 38 פעילה' :
    tamaStatus === 'empty'   ? 'אין נתוני תמ"א 38 באזור' :
    tamaStatus === 'error'   ? 'שגיאה בטעינת תמ"א 38' : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* MAP STITCH TOP BAR OVERLAY */}
      <View style={styles.topOverlayBar}>
        <View style={styles.searchPillContainer}>
          <TouchableOpacity style={styles.searchIconBtn}>
            <Ionicons name="location-outline" size={18} color="#74777f" />
          </TouchableOpacity>
          <View style={styles.searchTextContainer}>
            <Text style={styles.pillInput}>תל אביב-יפו, ישראל</Text>
            <Text style={styles.pillSubtext}>מפת מודעות פעילה</Text>
          </View>
          <TouchableOpacity 
            style={styles.tuneBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="options-outline" size={18} color="#002045" />
          </TouchableOpacity>
        </View>

        {/* Filters and View toggle row */}
        <View style={styles.controlsRow}>
          {/* TAMA toggle */}
          <View style={styles.tamaWrapper}>
            <Text style={styles.tamaLabel}>תמ"א 38</Text>
            <Switch
              value={tamaOn}
              onValueChange={handleTamaToggle}
              trackColor={{ false: Dark.switchTrackOff, true: '#005db6' }}
              thumbColor={C.onInverse.primary}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          {/* View switcher toggle */}
          <View style={styles.viewTogglePill}>
            <TouchableOpacity 
              style={styles.toggleBtnInactive} 
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.85}
            >
              <Ionicons name="list-outline" size={14} color="#43474e" style={{ marginLeft: 4 }} />
              <Text style={styles.toggleTextInactive}>רשימה</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleBtnActive} activeOpacity={0.85}>
              <Ionicons name="map" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
              <Text style={styles.toggleTextActive}>מפה</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tamaHint ? (
          <View style={styles.tamaStatusHint}>
            <Text style={styles.tamaStatusHintText}>{tamaHint}</Text>
          </View>
        ) : null}
      </View>

      {/* Map container */}
      {feedLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={dirApp.secondary} />
          <Text style={[styles.loadingText, dirType.body]}>טוען דירות על המפה…</Text>
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

      {/* Location Reset FAB */}
      <TouchableOpacity 
        style={styles.locationFab} 
        onPress={handleResetLocation}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={24} color="#002045" />
      </TouchableOpacity>

      {/* Swipeable Snap Carousel Overlay (Stitch Map View Bottom Slider) */}
      {!feedLoading && markers.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={markers}
            keyExtractor={(item) => `carousel-${item.id}`}
            snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH - CARD_MARGIN * 2) / 2 }}
            onMomentumScrollEnd={handleCarouselScroll}
            renderItem={({ item }) => {
              const isSelected = item.id === activeAptId;
              const isFav = !!favorites[item.id];
              return (
                <View style={[
                  styles.carouselCard,
                  isSelected && styles.carouselCardSelected
                ]}>
                  {/* Card visual thumb */}
                  <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: item.id })}
                    style={styles.cardImageContainer}
                  >
                    <Image 
                      source={{ uri: item.rawApartment.images?.[0]?.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80' }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                    
                    {/* Favorite Heart Button */}
                    <TouchableOpacity 
                      style={styles.heartBtnOverlay} 
                      onPress={() => toggleFavorite(item.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={isFav ? "heart" : "heart-outline"} 
                        size={16} 
                        color={isFav ? C.danger : "#ffffff"} 
                      />
                    </TouchableOpacity>

                    {item.promoted && (
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>מומלץ</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Details */}
                  <View style={styles.cardDetails}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardPrice}>₪{item.price.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.city} {item.rawApartment.street ? `· ${item.rawApartment.street}` : ''}</Text>

                    <View style={styles.cardSpecsRow}>
                      <View style={styles.cardSpecItem}>
                        <Ionicons name="resize-outline" size={12} color="#74777f" style={{ marginLeft: 3 }} />
                        <Text style={styles.cardSpecText}>{item.rawApartment.sizeSqm || 60} מ״ר</Text>
                      </View>
                      <View style={styles.cardSpecItem}>
                        <Ionicons name="bed-outline" size={12} color="#74777f" style={{ marginLeft: 3 }} />
                        <Text style={styles.cardSpecText}>{item.rooms} חדרים</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  topOverlayBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    padding: 10,
    zIndex: 99,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchPillContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchIconBtn: {
    padding: 4,
  },
  searchTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pillInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b1c30',
    textAlign: 'right',
  },
  pillSubtext: {
    fontSize: 9,
    color: '#43474e',
    marginTop: 1,
  },
  tuneBtn: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#c4c6cf',
    paddingRight: 10,
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
  },
  tamaWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  tamaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005db6',
  },
  viewTogglePill: {
    flexDirection: 'row',
    padding: 2,
    backgroundColor: '#e5eeff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#c4c6cf',
  },
  toggleBtnActive: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#002045',
    borderRadius: 14,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  toggleBtnInactive: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toggleTextInactive: {
    color: '#43474e',
    fontSize: 10,
    fontWeight: '600',
  },
  tamaStatusHint: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  tamaStatusHintText: {
    fontSize: 9,
    color: '#74777f',
    fontWeight: '600',
  },

  map: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#74777f',
    fontSize: 14,
  },

  // FAB
  locationFab: {
    position: 'absolute',
    bottom: 210,
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 90,
  },

  // Swipeable snapping carousel layout
  carouselContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    zIndex: 90,
  },
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c4c6cf',
    marginHorizontal: CARD_MARGIN,
    padding: 10,
    flexDirection: 'row-reverse',
    gap: 12,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  carouselCardSelected: {
    borderColor: '#002045',
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  cardImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  heartBtnOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardBadgeText: {
    color: '#002045',
    fontSize: 8,
    fontWeight: '800',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#002045',
    flex: 1,
    textAlign: 'right',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#005db6',
    marginRight: 6,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#74777f',
    textAlign: 'right',
    marginTop: 2,
  },
  cardSpecsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#e5eeff',
    paddingTop: 6,
  },
  cardSpecItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  cardSpecText: {
    fontSize: 10,
    color: '#43474e',
    fontWeight: '600',
  },
});
