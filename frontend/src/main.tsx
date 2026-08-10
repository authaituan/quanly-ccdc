import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Bug có sẵn từ scaffold trước đó (không thuộc phase FE-02): App.tsx dùng
// <Routes>/<Link> nhưng chưa từng được bọc trong <BrowserRouter>, khiến
// MỌI route crash ngay khi mount ("useRoutes() may be used only in the
// context of a <Router>"). Phát hiện khi verify runtime thật ở phase
// FE-02 - sửa vì không sửa thì /assets (và mọi route khác) không thể chạy.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
