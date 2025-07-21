module.exports = (req, res, next) => {
  const apiKey = req.get('x-api-key');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
  }
  next();
}; 