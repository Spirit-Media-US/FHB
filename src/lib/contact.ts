// The ONE public phone number for the FHB marketing site.
// Kevin 2026-10-21 (memory feedback-public-address-and-phone): "use only 1-888-800-3744". Kevin 2026-11-27
// (kevin-decisions L3174): the number + a contact-us email link go in the footer and the contact/order spots.
// Change it HERE; the footer (shared chrome, `phone` prop), /returns/ and the ContactPoint read it.
// Email is never printed: it stays a MailtoLink (words only), and never goes in schema.
export const SMP_PHONE = '1-888-800-3744';
/** tel: href for SMP_PHONE ("tel:+18888003744"). */
export const SMP_PHONE_TEL = `tel:+${SMP_PHONE.replace(/\D/g, '')}`;
/** schema.org telephone form ("+1-888-800-3744"). */
export const SMP_PHONE_SCHEMA = `+${SMP_PHONE}`;
