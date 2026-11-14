export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const apiMessage = error?.response?.data?.error;
  if (apiMessage && typeof apiMessage === 'string') return apiMessage;

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Unable to reach the server. Check your internet connection and try again.';
  }

  if (error.response?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (typeof error.message === 'string' && error.message) return error.message;
  return fallback;
}
