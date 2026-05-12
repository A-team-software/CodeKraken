import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './features/themeSlice';
import gitReducer from './features/gitSlice';
import taskReducer from './features/taskSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    git: gitReducer,
    task: taskReducer,
  },
});
