import { init as initNavMenu } from "@client/components/nav-menu";
import { initializePage } from "@client/page-lifecycle";

// The nav is on every page, so it runs outside the per-data-page registry.
initNavMenu();

initializePage(document.body.dataset.page);
