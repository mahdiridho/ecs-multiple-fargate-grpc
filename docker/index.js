const express = require('express');
const app = express();
const PORT = 4001;

app.get('/', (req, res) => {
  res.send('Hello from Fargate GrpcContainer!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
