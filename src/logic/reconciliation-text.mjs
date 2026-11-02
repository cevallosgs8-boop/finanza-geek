const CONTROL=/[\u0000-\u001f\u007f-\u009f]/g;
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_TEST=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LONG_DIGITS=/(?:\d[ -]?){7,19}/g;
// Shared with the movement snapshot guard; sanitize first, then compare up to 120 chars.
export function normalizeReconciliationText(value){
 const clean=String(value??'').replace(CONTROL,' ').replace(EMAIL,'').replace(LONG_DIGITS,'').replace(/\b\d{7,}\b/g,'').replace(/\s+/g,' ').trim().slice(0,120);
 return clean.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function sanitizeReceiptMerchant(value){
 const clean=String(value??'').replace(CONTROL,' ').replace(EMAIL,'').replace(LONG_DIGITS,'').replace(/https?:\/\/\S+/gi,'').replace(/\s+/g,' ').trim().slice(0,120);
 if(isSensitiveReceiptLine(clean))return '';
 return clean;
}
export function isSensitiveReceiptLine(value){
 const s=String(value??'').trim();
 return !s||EMAIL_TEST.test(s)||/(?:https?:\/\/|www\.)/i.test(s)||
  /\b(?:ruc|nit|rfc|tax\s*id|identificaci[oó]n\s*tributaria|tel(?:e\u0301fono|éfono)?|celular|m[oó]vil|phone|contacto|email|correo|direcci[oó]n|domicilio|factura|c[oó]digo\s*(?:de\s*)?(?:cliente|establecimiento|caja)|terminal|autorizaci[oó]n|secuencial)\b/i.test(s)||
  /\b(?:av(?:enida)?|calle|carrera|cra\.?|street|road|suite|piso|local|sector|cdla\.?|ciudadela|km)\b[^\n]{0,80}\d/i.test(s)||
  /\b(?:no\.?|n[uú]mero|#)\s*\d{1,6}\b/i.test(s)||
  /(?:\d[ -]?){7,19}/.test(s);
}
