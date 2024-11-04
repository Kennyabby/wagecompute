import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Function to render the application
const render = (Component) => {
  root.render(
    <BrowserRouter>
      <Component />
    </BrowserRouter>
  );
};

// Initial render
render(App);

// Register the service worker and set up the onUpdate callback
serviceWorkerRegistration.register({
  onUpdate: () => {
    if (module.hot) {
      // Hot Module Replacement (HMR) to load new components without full reload
      module.hot.accept('./App', () => {
        const NextApp = require('./App').default;
        render(NextApp);
      });
    } else {
      // Fallback to reload the page if HMR is not available
      window.location.reload();
    }
  }
});

// Optional: Measure performance in your app
reportWebVitals();
