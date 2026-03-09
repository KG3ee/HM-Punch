import { buildNestApplication } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const app = await buildNestApplication();
  const port = Number(process.env.PORT || 4001);
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
