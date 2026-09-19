// Serves https://accsmarkets.org/ads.txt for Google AdSense verification.
export const dynamic = "force-static";

const ADS_TXT = "google.com, pub-5723217807710259, DIRECT, f08c47fec0942fa0\n";

export function GET() {
  return new Response(ADS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
