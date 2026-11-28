export async function GET() {
  // Compatibilité avec les anciennes versions de l’application qui enregistraient
  // encore ce service worker à la racine. Le worker PWA + Firebase est désormais
  // un seul et même fichier : /sw.js.
  return new Response("importScripts('/sw.js');\n", {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-store',
    },
  });
}
