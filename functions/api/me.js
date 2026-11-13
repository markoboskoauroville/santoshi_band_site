import { json } from "../_lib.js";
export const onRequest = ({ data }) => json({ email: data.who.email });
