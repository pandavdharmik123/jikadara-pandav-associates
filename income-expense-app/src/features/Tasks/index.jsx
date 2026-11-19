import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';

export default function TaskRoutes() {
  return (
    <Routes>
      <Route index element={<TaskList />} />
      <Route path=":id" element={<TaskDetail />} />
    </Routes>
  );
}
