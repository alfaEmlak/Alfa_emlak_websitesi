import { z } from "zod";

export const menuLinkSchema = z.object({
  label: z.string().trim().min(1, "Link etiketi gerekli"),
  href: z.string().trim().min(1, "Link adresi gerekli"),
});

export const menuColumnSchema = z.object({
  title: z.string().trim().min(1, "Kolon başlığı gerekli"),
  links: z.array(menuLinkSchema).min(1, "Kolonda en az bir link olmalı"),
});

export const menuTopItemSchema = z.object({
  id: z.string().trim().min(1, "Menü id gerekli"),
  label: z.string().trim().min(1, "Menü etiketi gerekli"),
  columns: z.array(menuColumnSchema).min(1, "En az bir kolon gerekli"),
});

export const menuTopItemsSchema = z
  .array(menuTopItemSchema)
  .min(1, "Menü boş olamaz")
  .superRefine((items, ctx) => {
    const ids = new Set<string>();
    items.forEach((item, index) => {
      if (ids.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "id"],
          message: "Menü id tekrar ediyor",
        });
      }
      ids.add(item.id);
      if (item.columns.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "columns"],
          message: "En fazla 5 kolon önerilir",
        });
      }
    });
  });

export type MenuLink = z.infer<typeof menuLinkSchema>;
export type MenuColumn = z.infer<typeof menuColumnSchema>;
export type MenuTopItem = z.infer<typeof menuTopItemSchema>;