/** Cookie name shared by session logic and the proxy (src/proxy.ts). No crypto
 *  imports here so this stays safe to import from the Edge proxy runtime. */
export const SESSION_COOKIE = "ltg_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
