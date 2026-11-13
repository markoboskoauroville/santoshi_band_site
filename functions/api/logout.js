import { json, cookieFor } from "../_lib.js";
export const onRequest = () => json({ ok: true }, 200, { "set-cookie": cookieFor("", 0) });
