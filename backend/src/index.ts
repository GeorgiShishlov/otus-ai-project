import app from './app';
import { startRecurringJob } from './jobs/recurringJob';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  startRecurringJob();
});
