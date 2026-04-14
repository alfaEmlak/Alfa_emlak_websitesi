import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['tr', 'en', 'ru', 'de', 'fa'],
 
  // Used when no locale matches
  defaultLocale: 'tr',
  
  // Custom pathnames if you want to localize paths
  // pathnames: { ... }
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
