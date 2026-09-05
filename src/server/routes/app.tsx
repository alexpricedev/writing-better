import {
  home,
  llmsTxt,
  robotsTxt,
  securityTxt,
  sitemap,
  webmanifest,
} from "../controllers/app";

export const appRoutes = {
  "/": home.index,
  "/robots.txt": robotsTxt.index,
  "/site.webmanifest": webmanifest.index,
  "/sitemap.xml": sitemap.index,
  "/llms.txt": llmsTxt.index,
  "/.well-known/security.txt": securityTxt.index,
};
