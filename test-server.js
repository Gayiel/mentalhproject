import express from 'express';
const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.send('Minimal test server is running!');
});

app.listen(PORT, () => {
  console.log(`[test-server] Minimal server listening on port ${PORT}. Process ID: ${process.pid}`);
});
