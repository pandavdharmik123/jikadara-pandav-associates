import api from '../../services/api';

export async function fetchSurfacyTemplates() {
  const { data } = await api.get('/surfacy/templates');
  return data;
}

export async function fetchSurfacyCases(params = {}) {
  const { data } = await api.get('/surfacy/cases', { params });
  return data;
}

export async function fetchSurfacyCase(id) {
  const { data } = await api.get(`/surfacy/cases/${id}`);
  return data;
}

export async function createSurfacyCase(payload) {
  const { data } = await api.post('/surfacy/cases', payload);
  return data;
}

export async function updateSurfacyCase(id, payload) {
  const { data } = await api.put(`/surfacy/cases/${id}`, payload);
  return data;
}

export async function duplicateSurfacyCase(id) {
  const { data } = await api.post(`/surfacy/cases/${id}/duplicate`);
  return data;
}

export async function deleteSurfacyCase(id) {
  const { data } = await api.delete(`/surfacy/cases/${id}`);
  return data;
}

export async function generatePreviewDocxBlob(formData, templateFileName) {
  const res = await api.post(
    '/surfacy/preview-docx',
    { formData, templateFileName },
    { responseType: 'arraybuffer' }
  );
  return res.data;
}

export async function downloadSurfacyDocx(id, filename) {
  const res = await api.get(`/surfacy/cases/${id}/docx`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(filename || 'surfacy-filing').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadSurfacyPdf(id, filename) {
  const res = await api.get(`/surfacy/cases/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(filename || 'surfacy-filing').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
