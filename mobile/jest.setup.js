// Mock expo-secure-store for unit tests
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    setItemAsync: jest.fn(async (key, value) => {
      store[key] = value;
    }),
    getItemAsync: jest.fn(async (key) => {
      return store[key] ?? null;
    }),
    deleteItemAsync: jest.fn(async (key) => {
      delete store[key];
    }),
  };
});

// Mock AsyncStorage for unit tests
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    setItem: jest.fn(async (key, value) => {
      store[key] = value;
    }),
    getItem: jest.fn(async (key) => {
      return store[key] ?? null;
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    getAllKeys: jest.fn(async () => {
      return Object.keys(store);
    }),
    multiGet: jest.fn(async (keys) => {
      return keys.map(key => [key, store[key] ?? null]);
    }),
    multiSet: jest.fn(async (keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        store[key] = value;
      });
    }),
    multiRemove: jest.fn(async (keys) => {
      keys.forEach(key => delete store[key]);
    }),
  };
});
