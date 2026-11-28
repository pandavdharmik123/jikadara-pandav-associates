import api from '../../services/api';

export async function fetchMoeDashboard() {
  const { data } = await api.get('/moe/dashboard');
  return data;
}

export async function fetchMoeTemplates() {
  const { data } = await api.get('/moe/templates');
  return data;
}

export async function updateMoeTemplate(id, payload) {
  const { data } = await api.put(`/moe/templates/${id}`, payload);
  return data;
}

export async function fetchMoeDocuments(params = {}) {
  const { data } = await api.get('/moe/documents', { params });
  return data;
}

export async function fetchMoeDocument(id) {
  const { data } = await api.get(`/moe/documents/${id}`);
  return data;
}

export async function createMoeDocument(payload) {
  const { data } = await api.post('/moe/documents', payload);
  return data;
}

export async function updateMoeDocument(id, payload) {
  const { data } = await api.put(`/moe/documents/${id}`, payload);
  return data;
}

export async function duplicateMoeDocument(id) {
  const { data } = await api.post(`/moe/documents/${id}/duplicate`);
  return data;
}

export async function deleteMoeDocument(id) {
  const { data } = await api.delete(`/moe/documents/${id}`);
  return data;
}

export async function generateMoePreviewDocxBlob(formData, templateFileName) {
  const res = await api.post(
    '/moe/preview-docx',
    { formData, templateFileName },
    { responseType: 'arraybuffer' }
  );
  return res.data;
}

export async function downloadMoeDocx(id, filename) {
  const res = await api.get(`/moe/documents/${id}/docx`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(filename || 'moe-document').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadMoePdf(id, filename) {
  const res = await api.get(`/moe/documents/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(filename || 'moe-document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
