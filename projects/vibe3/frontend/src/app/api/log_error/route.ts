export async function POST(req: Request) {
  const { error, page, operation } = await req.json();
  console.error({
    page,
    operation,
    error,
  });
  return new Response("OK");
}
