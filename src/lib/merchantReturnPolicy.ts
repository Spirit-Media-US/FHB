// ONE schema.org return policy for every print-edition Offer the site emits
// (edition pages incl. workExample bindings, /print, GroupBible).
// Kevin D130, 2026-10-28: the merchant return policy is the wording on the metadata sheets,
// "Returnable? | Yes and destroy" ("Yes, return and destroy"). "Destroy" = the buyer keeps the
// book (KeepProduct), nothing is shipped back.
// NO RETURN WINDOW IS STATED anywhere on the site, in the repo or in Kevin's rulings (the /print
// FAQ says only "reach out and we'll make it right"; Amazon/others follow THEIR policy), so the
// category is Unspecified with NO merchantReturnDays. Do not invent a number: when Kevin rules
// a window, switch to MerchantReturnFiniteReturnWindow + merchantReturnDays here, once.
export const merchantReturnPolicy = {
	'@type': 'MerchantReturnPolicy',
	applicableCountry: 'US',
	returnPolicyCategory: 'https://schema.org/MerchantReturnUnspecified',
	returnMethod: 'https://schema.org/KeepProduct',
	returnFees: 'https://schema.org/FreeReturn',
	refundType: 'https://schema.org/FullRefund',
};
