// 단지분석 포스팅 생성기 — Anthropic API 중계 함수
// 환경변수: ANTHROPIC_API_KEY(필수), APP_PASSWORD(필수), MODEL(선택)
import { createHash, timingSafeEqual } from "node:crypto";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_IMAGES = 20;
const MAX_PROMPT_CHARS = 200_000;

function sameSecret(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function fail(res, status, code, message) {
  res.status(status).json({ code, message });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return fail(res, 405, "method", "POST만 받습니다.");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const password = process.env.APP_PASSWORD;
  const model = process.env.MODEL || DEFAULT_MODEL;
  if (!apiKey || !password) {
    return fail(res, 500, "server_config", "ANTHROPIC_API_KEY 또는 APP_PASSWORD 환경변수가 없습니다.");
  }
  if (!sameSecret(req.headers["x-app-key"] || "", password)) {
    return fail(res, 401, "auth", "비밀번호가 맞지 않습니다.");
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") return fail(res, 400, "invalid_request", "요청 형식이 잘못됐습니다.");
  if (body.ping) return res.status(200).json({ ok: true, model });

  const { prompt, images = [], maxTokens = 8000 } = body;
  if (typeof prompt !== "string" || !prompt.trim()) return fail(res, 400, "invalid_request", "프롬프트가 비었습니다.");
  if (prompt.length > MAX_PROMPT_CHARS) return fail(res, 413, "prompt_too_large", "자료가 너무 깁니다.");
  if (!Array.isArray(images) || images.length > MAX_IMAGES) return fail(res, 413, "prompt_too_large", "이미지가 너무 많습니다.");

  const content = [];
  for (const im of images) {
    if (!im || typeof im.data !== "string" || !im.data) continue;
    const mediaType = /^image\/(jpeg|png|gif|webp)$/.test(im.type) ? im.type : "image/jpeg";
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: im.data } });
  }
  content.push({ type: "text", text: prompt });

  let upstream;
  try {
    upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.max(256, Math.min(16000, Number(maxTokens) || 8000)),
        messages: [{ role: "user", content }],
      }),
    });
  } catch (e) {
    return fail(res, 502, "upstream_error", "AI 서버에 연결하지 못했습니다.");
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const s = upstream.status;
    const msg = (data && data.error && data.error.message) || "";
    if (s === 429 || s === 529) return fail(res, 429, "rate_limited", msg);
    if (s === 401 || s === 403) return fail(res, 502, "api_key", msg);
    if (s === 413) return fail(res, 413, "prompt_too_large", msg);
    if (s === 400 && /credit|billing|balance/i.test(msg)) return fail(res, 502, "api_key", msg);
    return fail(res, 502, "upstream_error", msg);
  }

  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return res.status(200).json({ text, stop_reason: data.stop_reason, model: data.model });
}
