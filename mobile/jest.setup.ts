import '@testing-library/jest-native/extend-expect';

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = require('react-native');
  return { Image: RN.Image };
});

jest.mock('expo-av', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Video: () => React.createElement(View),
    ResizeMode: { CONTAIN: 'contain' },
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
