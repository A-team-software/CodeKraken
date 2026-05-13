import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './features/themeSlice';
import gitReducer from './features/gitSlice';
import taskReducer from './features/taskSlice';
import configReducer from './features/configSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    git: gitReducer,
    task: taskReducer,
    config: configReducer,
  },
});
