jest.mock('../src/services/api', () => ({
  apartmentsApi: {
    getFeed: jest.fn(),
  },
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { buildHtml } from '../src/screens/MapScreen';

describe('MapScreen HTML builder', () => {
  it('keeps marker data from breaking out of the inline script', () => {
    const payload = '</script><script>window.ReactNativeWebView.postMessage("pwned")</script>';

    const html = buildHtml(
      [{
        id: 'apt-1',
        lat: 32.08,
        lng: 34.78,
        title: payload,
        price: 7000,
        rooms: 3,
        city: payload,
        promoted: false,
        approxLocation: false,
        rawApartment: null,
      }],
      `https://example.test/tama?q=${payload}`
    );

    expect(html).not.toContain(payload);
    expect(html).toContain('\\u003c/script\\u003e\\u003cscript\\u003e');

    const markersAssignment = html.match(/var markers = (.*);/);
    expect(markersAssignment).not.toBeNull();
    expect(JSON.parse(markersAssignment![1])[0].title).toBe(payload);
  });
});
