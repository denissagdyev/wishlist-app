import { NextResponse } from "next/server";

type MetaResponse = {
  name: string | null;
  imageUrl: string | null;
  price: number | null;
  message?: string;
};

function extractMetaContent(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractMetaName(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractTitle(html: string): string | null {
  const ogTitle =
    extractMetaContent(html, "og:title") ?? extractMetaContent(html, "twitter:title");
  if (ogTitle) return ogTitle.trim();

  const metaTitle =
    extractMetaName(html, "title") ?? extractMetaName(html, "og:site_name");
  if (metaTitle) return metaTitle.trim();

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) return h1Match[1].trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
}

function extractImage(html: string): string | null {
  const ogImage =
    extractMetaContent(html, "og:image") ??
    extractMetaContent(html, "twitter:image") ??
    extractMetaContent(html, "twitter:image:src") ??
    extractMetaName(html, "image");
  if (ogImage) return ogImage.trim();

  // запасной вариант — первый <img src="...">
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch?.[1]) return imgMatch[1].trim();

  return null;
}

function extractPrice(html: string): number | null {
  const metaPrice =
    extractMetaContent(html, "product:price:amount") ??
    extractMetaName(html, "price") ??
    extractMetaName(html, "product:price:amount") ??
    extractMetaName(html, "twitter:data1");

  const itempropPriceMatch = html.match(
    /<meta[^>]+itemprop=["']price["'][^>]*content=["']([^"']+)["'][^>]*>/i
  );
  const rawItemprop = itempropPriceMatch?.[1];

  const dataPriceMatch = html.match(
    /data-price=["']([\d\s.,]+)["'][^>]*>/i
  );
  const rawDataPrice = dataPriceMatch?.[1];

  const firstCandidate = metaPrice ?? rawItemprop ?? rawDataPrice;
  if (firstCandidate) {
    const normalized = firstCandidate.replace(",", ".").match(/[\d.]+/)?.[0];
    const parsed = normalized ? Number(normalized) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const priceMatch = html.match(/(?:price|amount)["']?\s*[:=]\s*["']?([\d.,]+)["']?/i);
  const candidate =
    priceMatch?.[1] ??
    html.match(/([\d\s.,]{2,})\s?(?:₽|RUB|руб\.?)/i)?.[1]?.replace(/\s/g, "");

  if (candidate) {
    const normalized = candidate.replace(",", ".").match(/[\d.]+/)?.[0];
    const parsed = normalized ? Number(normalized) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function looksLikeBlockedPage(html: string): boolean {
  const lower = html.toLowerCase();
  if (html.length < 500) return true;
  if (
    lower.includes("captcha") ||
    lower.includes("робот") ||
    lower.includes("access denied") ||
    lower.includes("попробуйте еще раз позже")
  ) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  let url: string | undefined;

  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Field 'url' is required" },
      { status: 400 }
    );
  }

  try {
    console.log("[fetch-meta] fetching url:", url);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    console.log("[fetch-meta] response status:", response.status, "ok:", response.ok);

    if (!response.ok) {
      const data: MetaResponse = {
        name: null,
        imageUrl: null,
        price: null,
        message: "Не удалось автоматически получить данные, заполните вручную.",
      };
      return NextResponse.json(data, { status: 200 });
    }

    const html = await response.text();

    console.log(
      "[fetch-meta] html snippet:",
      html.slice(0, 800).replace(/\s+/g, " ")
    );

    if (looksLikeBlockedPage(html)) {
      console.log("[fetch-meta] looks like blocked / captcha page");
      const data: MetaResponse = {
        name: null,
        imageUrl: null,
        price: null,
        message: "Не удалось автоматически получить данные, заполните вручную.",
      };
      return NextResponse.json(data, { status: 200 });
    }

    const name = extractTitle(html);
    const imageUrl = extractImage(html);
    const price = extractPrice(html);

    const nothingFound = !name && !imageUrl && price == null;

    const data: MetaResponse = {
      name: name ?? null,
      imageUrl: imageUrl ?? null,
      price,
      message: nothingFound
        ? "Не удалось автоматически получить данные, заполните вручную."
        : undefined,
    };

    console.log("[fetch-meta] parsed:", data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[fetch-meta] error:", error);
    const data: MetaResponse = {
      name: null,
      imageUrl: null,
      price: null,
      message: "Во время запроса произошла ошибка. Попробуйте ещё раз.",
    };
    return NextResponse.json(data, { status: 200 });
  }
}



