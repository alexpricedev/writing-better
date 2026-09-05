import { init as initNavMenu } from "@client/components/nav-menu";
import { initializePage, registerPage } from "@client/page-lifecycle";
import { init as initWrite } from "@client/pages/write";

registerPage("write", { init: initWrite });

// The nav is on every page, so it runs outside the per-data-page registry.
initNavMenu();

initializePage(document.body.dataset.page);
