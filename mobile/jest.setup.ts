import '@testing-library/jest-native/extend-expect';

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = require('react-native');
  return { Image: RN.Image };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
