// src/ga.js
import ReactGA from 'react-ga';

export const initGA = () => {
  ReactGA.initialize('G-BYFL168WNE');
};

export const logPageView = () => {
  ReactGA.set({ page: window.location.pathname });
  ReactGA.pageview(window.location.pathname);
};

export const logEvent = (category = '', action = '', label = '') => {
  if (category && action) {
    ReactGA.event({ category, action, label });
  }
};
