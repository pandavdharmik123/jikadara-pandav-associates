import api from './api';

export async function listFormBuilderRecords(params) {
  const { data } = await api.get('/form-builder/records', { params });
  return data;
}

export async function getFormBuilderRecord(id) {
  const { data } = await api.get(`/form-builder/records/${id}`);
  return data.record;
}

export async function createFormBuilderRecord(payload) {
  const { data } = await api.post('/form-builder/records', payload);
  return data.record;
}

export async function updateFormBuilderRecord(id, payload) {
  const { data } = await api.put(`/form-builder/records/${id}`, payload);
  return data.record;
}

export async function deleteFormBuilderRecord(id) {
  const { data } = await api.delete(`/form-builder/records/${id}`);
  return data;
}
