import type { Listing } from "@prisma/client";
import type { ConsultantDefault } from "@/lib/site-settings";

export type ConsultantView = {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  office: string;
  photo?: string;
  logo?: string;
};

export function resolveConsultant(
  listing: Listing,
  fallback: ConsultantDefault,
): ConsultantView {
  return {
    name: listing.consultantName || fallback.name || "ALFA EMLAK Danışmanı",
    phone: listing.consultantPhone || fallback.phone,
    whatsapp: listing.consultantWhatsapp || fallback.whatsapp,
    email: listing.consultantEmail || fallback.email,
    office: listing.consultantOffice || fallback.office || "ALFA EMLAK",
    photo: listing.consultantPhoto || fallback.photo,
    logo: listing.consultantOfficeLogo || fallback.logo,
  };
}
