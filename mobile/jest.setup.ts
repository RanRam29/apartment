import '@testing-library/jest-native/extend-expect';

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = require('react-native');
  return { Image: RN.Image };
});

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const createMockPlayer = () => ({
    loop: false,
    muted: false,
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  });
  return {
    VideoView: () => React.createElement(View),
    useVideoPlayer: jest.fn(() => createMockPlayer()),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
