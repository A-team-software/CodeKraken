import React from 'react';
import { mountApp } from './mountApp';
import { AdminPage } from './page';

mountApp(React.createElement(React.StrictMode, null, React.createElement(AdminPage)));
