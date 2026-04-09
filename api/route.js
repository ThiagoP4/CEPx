

export async function GET(request) {
  return new Response(JSON.stringify({ message: "Olá do Backend no Next!" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  
}