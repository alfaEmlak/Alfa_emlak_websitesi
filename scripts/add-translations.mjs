// Tek seferde Career + HeroSearch namespace'lerini 5 dil dosyasına ekler.
// Ayrıca Common.career zaten yoksa ekler.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const additions = {
  tr: {
    Common: { career: "Kariyer" },
    Career: {
      title: "Alfa Emlak'ta Kariyer",
      subtitle: "Bize başvurun, ekibimize katılın.",
      firstName: "Ad",
      lastName: "Soyad",
      email: "E-posta",
      phone: "Telefon",
      message: "Kısa Mesaj",
      messagePlaceholder: "Kendinizden kısaca bahsedin (opsiyonel)",
      cv: "Özgeçmiş (CV)",
      cvHint: "PDF, DOC veya DOCX • max 5 MB",
      uploadCv: "CV Yükle",
      changeCv: "CV'yi Değiştir",
      uploading: "Yükleniyor...",
      submit: "Başvuruyu Gönder",
      submitting: "Gönderiliyor...",
      cancel: "Vazgeç",
      close: "Kapat",
      success: "Başvurunuz alındı. En kısa sürede size dönüş yapacağız.",
      errors: {
        invalidFile: "Sadece PDF veya Word (DOC/DOCX) dosyası yükleyebilirsiniz.",
        fileTooLarge: "Dosya 5 MB'dan büyük olamaz.",
        uploadFailed: "Yükleme başarısız.",
        submitFailed: "Gönderim başarısız."
      }
    },
    HeroSearch: {
      tabs: {
        sale: "Satılık",
        project: "Projeler",
        rent: "Kiralık",
        daily: "Günlük"
      },
      propertyType: "Konut Tipi",
      city: "Şehir",
      region: "Bölge",
      allTypes: "Tüm Tipler",
      typeHousing: "Konut / Daire",
      typeCommercial: "Ticari",
      typeLand: "Arsa / Arazi",
      selectCity: "Şehir seçin",
      allRegions: "Tüm Bölgeler",
      submit: "İlanları Gör",
      advancedShow: "Gelişmiş Filtreler",
      advancedHide: "Gelişmiş Filtreleri Gizle",
      priceRange: "Fiyat Aralığı",
      min: "Min",
      max: "Max",
      roomCount: "Oda Sayısı",
      heatingFurniture: "Isınma & Eşya",
      heatingSelect: "Isıtma Seç",
      heating: { ac: "Klima", central: "Merkezi", floor: "Yerden Isıtma", stove: "Soba", combi: "Kombi" },
      furnished: "Eşyalı",
      featuresLabel: "Özellikler",
      features: { balcony: "Balkon", parking: "Otopark", elevator: "Asansör", security: "Güvenlik", pool: "Havuz" },
      areaRange: "Metrekare Aralığı",
      ariaListingType: "İlan türü"
    }
  },
  en: {
    Common: { career: "Careers" },
    Career: {
      title: "Careers at Alfa Emlak",
      subtitle: "Apply to join our team.",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      message: "Short Message",
      messagePlaceholder: "Tell us briefly about yourself (optional)",
      cv: "Resume (CV)",
      cvHint: "PDF, DOC or DOCX • max 5 MB",
      uploadCv: "Upload CV",
      changeCv: "Change CV",
      uploading: "Uploading...",
      submit: "Submit Application",
      submitting: "Submitting...",
      cancel: "Cancel",
      close: "Close",
      success: "Application received. We will get back to you soon.",
      errors: {
        invalidFile: "Only PDF or Word (DOC/DOCX) files are accepted.",
        fileTooLarge: "File must be smaller than 5 MB.",
        uploadFailed: "Upload failed.",
        submitFailed: "Submission failed."
      }
    },
    HeroSearch: {
      tabs: { sale: "For Sale", project: "Projects", rent: "For Rent", daily: "Daily" },
      propertyType: "Property Type",
      city: "City",
      region: "Region",
      allTypes: "All Types",
      typeHousing: "Residential",
      typeCommercial: "Commercial",
      typeLand: "Land / Plot",
      selectCity: "Select city",
      allRegions: "All Regions",
      submit: "View Listings",
      advancedShow: "Advanced Filters",
      advancedHide: "Hide Advanced Filters",
      priceRange: "Price Range",
      min: "Min",
      max: "Max",
      roomCount: "Bedrooms",
      heatingFurniture: "Heating & Furniture",
      heatingSelect: "Select heating",
      heating: { ac: "AC", central: "Central", floor: "Underfloor", stove: "Stove", combi: "Combi" },
      furnished: "Furnished",
      featuresLabel: "Features",
      features: { balcony: "Balcony", parking: "Parking", elevator: "Elevator", security: "Security", pool: "Pool" },
      areaRange: "Area Range (m²)",
      ariaListingType: "Listing type"
    }
  },
  ru: {
    Common: { career: "Карьера" },
    Career: {
      title: "Карьера в Alfa Emlak",
      subtitle: "Подайте заявку, чтобы присоединиться к нашей команде.",
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Эл. почта",
      phone: "Телефон",
      message: "Сообщение",
      messagePlaceholder: "Кратко расскажите о себе (по желанию)",
      cv: "Резюме (CV)",
      cvHint: "PDF, DOC или DOCX • максимум 5 МБ",
      uploadCv: "Загрузить CV",
      changeCv: "Заменить CV",
      uploading: "Загрузка...",
      submit: "Отправить заявку",
      submitting: "Отправка...",
      cancel: "Отмена",
      close: "Закрыть",
      success: "Заявка получена. Мы скоро свяжемся с вами.",
      errors: {
        invalidFile: "Принимаются только файлы PDF или Word (DOC/DOCX).",
        fileTooLarge: "Файл должен быть меньше 5 МБ.",
        uploadFailed: "Не удалось загрузить.",
        submitFailed: "Не удалось отправить."
      }
    },
    HeroSearch: {
      tabs: { sale: "Продажа", project: "Проекты", rent: "Аренда", daily: "Посуточно" },
      propertyType: "Тип недвижимости",
      city: "Город",
      region: "Район",
      allTypes: "Все типы",
      typeHousing: "Жилая",
      typeCommercial: "Коммерческая",
      typeLand: "Земля / Участок",
      selectCity: "Выберите город",
      allRegions: "Все районы",
      submit: "Смотреть объявления",
      advancedShow: "Расширенные фильтры",
      advancedHide: "Скрыть фильтры",
      priceRange: "Диапазон цен",
      min: "Мин",
      max: "Макс",
      roomCount: "Комнат",
      heatingFurniture: "Отопление и мебель",
      heatingSelect: "Выбрать отопление",
      heating: { ac: "Кондиционер", central: "Центральное", floor: "Тёплый пол", stove: "Печь", combi: "Газовый котёл" },
      furnished: "С мебелью",
      featuresLabel: "Особенности",
      features: { balcony: "Балкон", parking: "Парковка", elevator: "Лифт", security: "Охрана", pool: "Бассейн" },
      areaRange: "Диапазон площади (м²)",
      ariaListingType: "Тип объявления"
    }
  },
  de: {
    Common: { career: "Karriere" },
    Career: {
      title: "Karriere bei Alfa Emlak",
      subtitle: "Bewerben Sie sich und werden Sie Teil unseres Teams.",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      message: "Kurze Nachricht",
      messagePlaceholder: "Erzählen Sie kurz von sich (optional)",
      cv: "Lebenslauf (CV)",
      cvHint: "PDF, DOC oder DOCX • max. 5 MB",
      uploadCv: "CV hochladen",
      changeCv: "CV ändern",
      uploading: "Wird hochgeladen...",
      submit: "Bewerbung senden",
      submitting: "Wird gesendet...",
      cancel: "Abbrechen",
      close: "Schließen",
      success: "Bewerbung erhalten. Wir melden uns in Kürze.",
      errors: {
        invalidFile: "Nur PDF- oder Word-Dateien (DOC/DOCX) erlaubt.",
        fileTooLarge: "Datei darf max. 5 MB groß sein.",
        uploadFailed: "Upload fehlgeschlagen.",
        submitFailed: "Senden fehlgeschlagen."
      }
    },
    HeroSearch: {
      tabs: { sale: "Verkauf", project: "Projekte", rent: "Miete", daily: "Tagesmiete" },
      propertyType: "Immobilientyp",
      city: "Stadt",
      region: "Region",
      allTypes: "Alle Typen",
      typeHousing: "Wohnen",
      typeCommercial: "Gewerbe",
      typeLand: "Grundstück",
      selectCity: "Stadt wählen",
      allRegions: "Alle Regionen",
      submit: "Anzeigen ansehen",
      advancedShow: "Erweiterte Filter",
      advancedHide: "Filter ausblenden",
      priceRange: "Preisspanne",
      min: "Min",
      max: "Max",
      roomCount: "Zimmer",
      heatingFurniture: "Heizung & Möbel",
      heatingSelect: "Heizung wählen",
      heating: { ac: "Klima", central: "Zentral", floor: "Fußboden", stove: "Ofen", combi: "Kombi" },
      furnished: "Möbliert",
      featuresLabel: "Ausstattung",
      features: { balcony: "Balkon", parking: "Parkplatz", elevator: "Aufzug", security: "Sicherheit", pool: "Pool" },
      areaRange: "Flächenbereich (m²)",
      ariaListingType: "Anzeigentyp"
    }
  },
  fa: {
    Common: { career: "فرصت‌های شغلی" },
    Career: {
      title: "فرصت‌های شغلی در آلفا املاک",
      subtitle: "برای پیوستن به تیم ما درخواست دهید.",
      firstName: "نام",
      lastName: "نام خانوادگی",
      email: "ایمیل",
      phone: "تلفن",
      message: "پیام کوتاه",
      messagePlaceholder: "به‌طور خلاصه درباره خود بگویید (اختیاری)",
      cv: "رزومه (CV)",
      cvHint: "PDF، DOC یا DOCX • حداکثر ۵ مگابایت",
      uploadCv: "بارگذاری رزومه",
      changeCv: "تغییر رزومه",
      uploading: "در حال بارگذاری...",
      submit: "ارسال درخواست",
      submitting: "در حال ارسال...",
      cancel: "انصراف",
      close: "بستن",
      success: "درخواست شما دریافت شد. به‌زودی با شما تماس می‌گیریم.",
      errors: {
        invalidFile: "فقط فایل PDF یا Word (DOC/DOCX) پذیرفته می‌شود.",
        fileTooLarge: "حجم فایل نباید بیشتر از ۵ مگابایت باشد.",
        uploadFailed: "بارگذاری ناموفق بود.",
        submitFailed: "ارسال ناموفق بود."
      }
    },
    HeroSearch: {
      tabs: { sale: "فروش", project: "پروژه‌ها", rent: "اجاره", daily: "روزانه" },
      propertyType: "نوع ملک",
      city: "شهر",
      region: "منطقه",
      allTypes: "همه انواع",
      typeHousing: "مسکونی",
      typeCommercial: "تجاری",
      typeLand: "زمین",
      selectCity: "شهر را انتخاب کنید",
      allRegions: "همه مناطق",
      submit: "مشاهده آگهی‌ها",
      advancedShow: "فیلترهای پیشرفته",
      advancedHide: "پنهان کردن فیلترها",
      priceRange: "بازه قیمت",
      min: "حداقل",
      max: "حداکثر",
      roomCount: "تعداد اتاق",
      heatingFurniture: "گرمایش و مبلمان",
      heatingSelect: "گرمایش را انتخاب کنید",
      heating: { ac: "کولر", central: "مرکزی", floor: "از کف", stove: "بخاری", combi: "پکیج" },
      furnished: "مبله",
      featuresLabel: "امکانات",
      features: { balcony: "بالکن", parking: "پارکینگ", elevator: "آسانسور", security: "نگهبانی", pool: "استخر" },
      areaRange: "بازه متراژ",
      ariaListingType: "نوع آگهی"
    }
  }
};

for (const [lang, add] of Object.entries(additions)) {
  const path = resolve(root, "messages", `${lang}.json`);
  const data = JSON.parse(readFileSync(path, "utf8"));

  if (!data.Common) data.Common = {};
  Object.assign(data.Common, add.Common);

  data.Career = add.Career;
  data.HeroSearch = add.HeroSearch;

  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✓ ${lang}.json updated`);
}
