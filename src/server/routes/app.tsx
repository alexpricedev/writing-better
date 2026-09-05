import {
  llmsTxt,
  robotsTxt,
  securityTxt,
  sitemap,
  webmanifest,
  write,
} from "../controllers/app";

export const appRoutes = {
  "/": write.index,
  "/robots.txt": robotsTxt.index,
  "/site.webmanifest": webmanifest.index,
  "/sitemap.xml": sitemap.index,
  "/llms.txt": llmsTxt.index,
  "/.well-known/security.txt": securityTxt.index,
};
