import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ClientList from './ClientList';
import ClientDetail from './ClientDetail';

export default function ClientRoutes() {
  return (
    <Routes>
      <Route index element={<ClientList />} />
      <Route path=":id" element={<ClientDetail />} />
    </Routes>
  );
}
