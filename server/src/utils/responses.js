export const sendSuccess = (res, data, message = 'Request successful') =>
  res.json({ success: true, data, message });

export const sendError = (res, message = 'Something went wrong', status = 400) =>
  res.status(status).json({ success: false, data: null, message });
